import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'models.dart';

class OrderState extends ChangeNotifier {
  OrderState(this.api);

  final ApiClient api;
  String locale = 'pt-BR';
  String fulfillment = 'pickup';
  MenuCatalog? menu;
  PriceQuote? cartQuote;
  final List<CartLine> cart = [];
  final Map<String, String> checkoutFields = {};
  bool menuLoading = true;
  bool quoteLoading = false;
  bool submitting = false;
  bool assistantLoading = false;
  String? assistantError;
  String assistantMode = 'provider';
  final List<Json> assistantMessages = [];
  String? menuError;
  String? quoteError;
  String? _idempotencyKey;
  String? _idempotencyFingerprint;
  int _quoteRevision = 0;

  int get itemCount => cart.fold(0, (total, line) => total + line.quantity);

  void saveCheckoutField(String field, String value) {
    checkoutFields[field] = value;
  }

  Future<void> loadMenu() async {
    menuLoading = true;
    menuError = null;
    menu = null;
    notifyListeners();
    try {
      menu = MenuCatalog.fromJson(await api.get('/menu?locale=$locale'));
    } catch (_) {
      menuError = 'connection';
    } finally {
      menuLoading = false;
      notifyListeners();
    }
  }

  Future<void> setLocale(String value) async {
    if (locale == value) return;
    locale = value;
    await loadMenu();
  }

  Future<void> setFulfillment(String value) async {
    if (fulfillment == value) return;
    fulfillment = value;
    notifyListeners();
    await refreshQuote();
  }

  Future<PriceQuote?> quoteLines(List<CartLine> lines) async {
    try {
      final json = await api.post('/quotes', {
        'fulfillment': fulfillment,
        'lines': lines.map((line) => line.toJson()).toList(),
      });
      return PriceQuote.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  Future<void> refreshQuote() async {
    final revision = ++_quoteRevision;
    if (cart.isEmpty) {
      cartQuote = null;
      quoteError = null;
      quoteLoading = false;
      notifyListeners();
      return;
    }
    quoteLoading = true;
    quoteError = null;
    cartQuote = null;
    notifyListeners();
    try {
      final response = await api.post('/quotes', {
        'fulfillment': fulfillment,
        'lines': cart.map((line) => line.toJson()).toList(),
      });
      if (revision == _quoteRevision) {
        cartQuote = PriceQuote.fromJson(response);
      }
    } catch (_) {
      if (revision == _quoteRevision) quoteError = 'quote';
    } finally {
      if (revision == _quoteRevision) {
        quoteLoading = false;
        notifyListeners();
      }
    }
  }

  Future<bool> addLine(CartLine line) async {
    final proposed = List<CartLine>.from(cart);
    final index = proposed.indexWhere((item) => item.key == line.key);
    if (index == -1) {
      proposed.add(line);
    } else {
      proposed[index] = proposed[index].copyWith(
        quantity: min(10, proposed[index].quantity + line.quantity),
      );
    }
    final quote = await quoteLines(proposed);
    if (quote == null) return false;
    cart
      ..clear()
      ..addAll(proposed);
    cartQuote = quote;
    quoteError = null;
    _idempotencyKey = null;
    _idempotencyFingerprint = null;
    notifyListeners();
    return true;
  }

  Future<void> updateQuantity(String key, int quantity) async {
    final index = cart.indexWhere((item) => item.key == key);
    if (index == -1) return;
    if (quantity < 1) {
      cart.removeAt(index);
    } else {
      cart[index] = cart[index].copyWith(quantity: min(10, quantity));
    }
    _idempotencyKey = null;
    _idempotencyFingerprint = null;
    notifyListeners();
    await refreshQuote();
  }

  Future<Json> submitOrder({
    required String name,
    required String phone,
    Json? address,
  }) async {
    submitting = true;
    notifyListeners();
    final payload = {
      'locale': locale,
      'fulfillment': fulfillment,
      'customer': {'name': name, 'phone': phone},
      if (fulfillment == 'delivery') 'address': address,
      'lines': cart.map((line) => line.toJson()).toList(),
    };
    final fingerprint = jsonEncode(payload);
    if (_idempotencyKey == null || _idempotencyFingerprint != fingerprint) {
      _idempotencyKey = _newIdempotencyKey();
      _idempotencyFingerprint = fingerprint;
    }
    try {
      final order = await api.post('/orders', {
        ...payload,
        'idempotencyKey': _idempotencyKey,
      });
      cart.clear();
      cartQuote = null;
      _idempotencyKey = null;
      _idempotencyFingerprint = null;
      return order;
    } finally {
      submitting = false;
      notifyListeners();
    }
  }

  Future<Json> track(String orderCode) =>
      api.get('/orders/${Uri.encodeComponent(orderCode.trim().toUpperCase())}');

  Future<bool> sendAssistantMessage(String message, Json context) async {
    final text = message.trim();
    if (text.isEmpty || assistantLoading) return false;
    final history = assistantMessages
        .skip(assistantMessages.length > 10 ? assistantMessages.length - 10 : 0)
        .map((item) => {'role': item['role'], 'content': item['content']})
        .toList();
    assistantMessages.add({'role': 'user', 'content': text});
    if (assistantMessages.length > 20) assistantMessages.removeAt(0);
    assistantLoading = true;
    assistantError = null;
    notifyListeners();
    try {
      final response = await api.post('/assistant/messages', {
        'locale': locale,
        'message': text,
        'history': history,
        'context': context,
      });
      assistantMessages
          .add({'role': 'assistant', 'content': '${response['reply'] ?? ''}'});
      assistantMode = '${response['mode'] ?? 'provider'}';
      if (assistantMessages.length > 20) assistantMessages.removeAt(0);
      return true;
    } catch (_) {
      assistantError = 'assistant_unavailable';
      return false;
    } finally {
      assistantLoading = false;
      notifyListeners();
    }
  }

  void clearAssistantConversation() {
    assistantMessages.clear();
    assistantError = null;
    assistantMode = 'provider';
    notifyListeners();
  }

  String _newIdempotencyKey() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    return bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
  }
}
