import 'dart:convert';
import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'models.dart';

class OrderState extends ChangeNotifier {
  OrderState(this.api);

  final ApiClient api;
  String locale = 'pt-BR';
  String fulfillment = 'pickup';
  bool publicDemo = true;
  Json checkoutFixtures = {};
  Json get checkoutFixture =>
      (checkoutFixtures['demo-$fulfillment'] as Json?) ?? {};
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
  Json? assistantTicket;
  String? assistantResetsAt;
  String assistantDraft = '';
  bool assistantStale = false;
  int _selectionRevision = 0;
  String? _assistantCapability;
  Json? _assistantSubmission;
  Timer? _assistantPolling;
  bool _assistantVisible = false;
  bool _assistantForeground = true;
  bool _assistantPollingBusy = false;
  int _assistantRevision = 0;
  String _assistantContextKey = '';

  Json? assistantProposal;
  Json? assistantProposalDraft;
  bool assistantApplying = false;
  bool assistantApplied = false;
  int _cartRevision = 0;
  final Map<String, String> _cartLineIds = {};
  final Set<String> _appliedProposals = {};
  String _proposalBase = '';
  Json get cartSnapshot => {
        'revision': _cartRevision,
        'fulfillment': fulfillment,
        'lines': cart
            .map((line) => {
                  ...line.toJson(),
                  'lineId': line.lineId ??
                      _cartLineIds.putIfAbsent(
                          line.key, () => _newIdempotencyKey()),
                })
            .toList(),
      };
  Json currentAssistantContext(Json context) => {
        ...context,
        'cartSnapshot': cartSnapshot,
        if (assistantProposalDraft != null)
          'draftProposal': assistantProposalDraft,
        'cartLines': cart.map((line) => line.toJson()).toList(),
        'fulfillment': fulfillment,
      };
  bool get proposalStale =>
      assistantProposal != null &&
      (_proposalBase != jsonEncode(cartSnapshot) ||
          DateTime.tryParse('${assistantProposal!['expiresAt']}')
                  ?.isAfter(DateTime.now()) !=
              true);
  void dismissAssistantProposal({bool keepDraft = false}) {
    if (!keepDraft) assistantProposalDraft = null;
    final proposal = assistantProposal;
    if (proposal != null && _assistantCapability != null) {
      unawaited(api
          .assistantRequest('DELETE', '/assistant/proposals/${proposal['id']}',
              capability: _capability())
          .catchError((_) => <String, dynamic>{}));
    }
    assistantProposal = null;
    assistantApplied = false;
    notifyListeners();
  }

  Future<bool> applyAssistantProposal() async {
    final proposal = assistantProposal;
    if (proposal == null ||
        assistantApplying ||
        _appliedProposals.contains(proposal['id'])) return false;
    if (proposalStale) {
      assistantError = 'proposal_stale';
      notifyListeners();
      return false;
    }
    final snapshot = cartSnapshot, revision = _assistantRevision;
    assistantApplying = true;
    assistantError = null;
    notifyListeners();
    try {
      final response = await api.assistantRequest(
          'POST', '/assistant/proposals/${proposal['id']}/confirm',
          capability: _capability(), payload: {'cartSnapshot': snapshot});
      if (revision != _assistantRevision) return false;
      if (jsonEncode(snapshot) != jsonEncode(cartSnapshot))
        throw const ApiException('proposal_stale', 409);
      final result = response['proposal'] as Json;
      final newLines = (result['lines'] as List).map((raw) {
        final l = raw as Json;
        return CartLine(
            lineId: l['lineId'] as String,
            flavorId: l['flavorId'] as String,
            sizeId: l['sizeId'] as String,
            crustId: l['crustId'] as String,
            removedIngredientIds: List<String>.from(l['removedIngredientIds']),
            extraToppingIds: List<String>.from(l['extraToppingIds']),
            quantity: l['quantity'] as int);
      }).toList();
      final quote = PriceQuote.fromJson(result['quote'] as Json);
      if (!_appliedProposals.add(proposal['id'] as String)) return false;
      _quoteRevision++;
      _cartRevision++;
      cart
        ..clear()
        ..addAll(newLines);
      cartQuote = newLines.isEmpty ? null : quote;
      quoteLoading = false;
      quoteError = null;
      _idempotencyKey = null;
      _idempotencyFingerprint = null;
      assistantApplied = true;
      assistantProposalDraft = null;
      assistantProposal = result;
      return true;
    } catch (_) {
      if (revision == _assistantRevision) assistantError = 'proposal_stale';
      return false;
    } finally {
      assistantApplying = false;
      if (revision == _assistantRevision) notifyListeners();
    }
  }

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
      final data = await api.get('/menu?locale=$locale');
      publicDemo = data['publicDemo'] == true;
      checkoutFixtures = (data['checkoutFixtures'] as Json?) ?? {};
      if (publicDemo) checkoutFields.clear();
      menu = MenuCatalog.fromJson(data);
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
    _cartRevision++;
    notifyListeners();
    await refreshQuote();
  }

  Future<PriceQuote?> quoteLines(List<CartLine> lines) async {
    _selectionRevision++;
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
    _selectionRevision++;
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
    _cartRevision++;
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
    _cartRevision++;
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
      if (publicDemo) 'fixtureId': 'demo-$fulfillment',
      if (!publicDemo) 'customer': {'name': name, 'phone': phone},
      if (!publicDemo && fulfillment == 'delivery') 'address': address,
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
      _cartRevision++;
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

  String _capability() => _assistantCapability ??=
      List.generate(32, (_) => Random.secure().nextInt(256))
          .map((b) => b.toRadixString(16).padLeft(2, '0'))
          .join();

  void assistantSetVisible(bool visible) {
    _assistantVisible = visible;
    if (visible)
      _scheduleAssistantPoll(immediate: true);
    else {
      _assistantPolling?.cancel();
      if (assistantTicket?['state'] == 'queued') unawaited(cancelAssistant());
    }
  }

  void assistantSetForeground(bool foreground) {
    _assistantForeground = foreground;
    _assistantPolling?.cancel();
    if (foreground) _scheduleAssistantPoll(immediate: true);
  }

  void assistantContextChanged(Json context) {
    _assistantContextKey = jsonEncode(context);
  }

  Future<bool> sendAssistantMessage(String message, Json context) async {
    final text = message.trim();
    if (text.isEmpty || assistantLoading || assistantApplying) return false;
    if (utf8.encode(text).length > 1200) {
      assistantError = 'assistant_input_too_large';
      notifyListeners();
      return false;
    }
    context = currentAssistantContext(context);
    dismissAssistantProposal(keepDraft: true);
    assistantContextChanged(context);
    final signature =
        jsonEncode({'message': text, 'context': context, 'locale': locale});
    if (_assistantSubmission?['signature'] != signature) {
      final bytes = List<int>.generate(16, (_) => Random.secure().nextInt(256));
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
      _assistantSubmission = {
        'signature': signature,
        'selectionRevision': _selectionRevision,
        'contextKey': _assistantContextKey,
        'payload': {
          'requestId':
              '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}',
          'locale': locale,
          'message': text,
          'context': context,
          'history': assistantMessages
              .skip(max(0, assistantMessages.length - 10))
              .map((m) => {'role': m['role'], 'content': m['content']})
              .toList()
        }
      };
    }
    final revision = _assistantRevision;
    assistantLoading = true;
    assistantError = null;
    assistantDraft = text;
    assistantStale = false;
    notifyListeners();
    try {
      final response = await api.assistantRequest('POST', '/assistant/messages',
          capability: _capability(),
          payload: _assistantSubmission!['payload'] as Json);
      if (revision != _assistantRevision) return false;
      assistantMessages.add({'role': 'user', 'content': text});
      if (assistantMessages.length > 20) assistantMessages.removeAt(0);
      if (response['state'] != null) {
        assistantTicket = response;
        _applyAssistantState(response);
        if (!_assistantVisible && response['state'] == 'queued') {
          unawaited(cancelAssistant());
        } else {
          _scheduleAssistantPoll();
        }
      } else {
        _completeAssistant(response);
      }
      notifyListeners();
      return true;
    } catch (error) {
      if (revision == _assistantRevision) {
        assistantError =
            error is ApiException ? error.messageKey : 'assistant_unavailable';
        assistantResetsAt = error is ApiException ? error.resetsAt : null;
        assistantLoading = false;
        notifyListeners();
      }
      return false;
    }
  }

  void _completeAssistant(Json response) {
    assistantMessages
        .add({'role': 'assistant', 'content': '${response['reply'] ?? ''}'});
    if (assistantMessages.length > 20) assistantMessages.removeAt(0);
    assistantMode = '${response['mode'] ?? 'provider'}';
    assistantStale =
        _assistantSubmission?['contextKey'] != _assistantContextKey ||
            _assistantSubmission?['selectionRevision'] != _selectionRevision;
    assistantProposal = response['proposal'] as Json?;
    assistantProposalDraft = assistantProposal?['candidate'] as Json?;
    assistantApplied = false;
    _proposalBase = jsonEncode((_assistantSubmission?['payload']
        as Json?)?['context']?['cartSnapshot']);
    if (response['proposalError'] != null) assistantError = 'proposal_invalid';
    assistantTicket = null;
    assistantLoading = false;
    assistantDraft = '';
    _assistantSubmission = null;
  }

  void _applyAssistantState(Json response) {
    final status = response['state'];
    if (status == 'completed')
      _completeAssistant(response);
    else if (['cancelled', 'expired', 'failed'].contains(status)) {
      assistantError = status == 'cancelled'
          ? null
          : '${response['error'] ?? 'assistant_request_expired'}';
      assistantResetsAt = response['resetsAt'] as String?;
      assistantLoading = false;
      assistantTicket = null;
      if (assistantMessages.isNotEmpty &&
          assistantMessages.last['role'] == 'user')
        assistantMessages.removeLast();
      _assistantSubmission = null;
    } else {
      assistantTicket = response;
    }
  }

  void _scheduleAssistantPoll({bool immediate = false}) {
    _assistantPolling?.cancel();
    if (!_assistantVisible || !_assistantForeground || assistantTicket == null)
      return;
    final seconds =
        max(3, (assistantTicket!['pollAfterSeconds'] as num? ?? 3).toInt());
    _assistantPolling = Timer(Duration(seconds: immediate ? 0 : seconds),
        () => unawaited(_pollAssistant()));
  }

  Future<void> _pollAssistant() async {
    if (_assistantPollingBusy ||
        !_assistantVisible ||
        !_assistantForeground ||
        assistantTicket == null) return;
    _assistantPollingBusy = true;
    final revision = _assistantRevision;
    final id = assistantTicket!['requestId'];
    try {
      final response = await api.assistantRequest(
          'GET', '/assistant/requests/$id',
          capability: _capability());
      if (revision != _assistantRevision) return;
      assistantError = null;
      _applyAssistantState(response);
      notifyListeners();
    } catch (error) {
      if (revision == _assistantRevision) {
        assistantError =
            error is ApiException ? error.messageKey : 'assistant_unavailable';
        if (error is ApiException && error.statusCode == 410) {
          _applyAssistantState(
              {'state': 'expired', 'error': 'assistant_request_expired'});
        }
        notifyListeners();
      }
    } finally {
      _assistantPollingBusy = false;
      if (revision == _assistantRevision) _scheduleAssistantPoll();
    }
  }

  Future<void> cancelAssistant() async {
    final revision = _assistantRevision;
    final ticket = assistantTicket;
    if (ticket == null) return;
    try {
      final response = await api.assistantRequest(
          'DELETE', '/assistant/requests/${ticket['requestId']}',
          capability: _capability());
      if (revision == _assistantRevision &&
          assistantTicket?['requestId'] == ticket['requestId']) {
        _applyAssistantState(response);
        notifyListeners();
      }
    } catch (_) {
      if (revision != _assistantRevision) return;
      assistantError = 'assistant_unavailable';
      notifyListeners();
    }
  }

  void clearAssistantConversation() {
    dismissAssistantProposal();
    if (assistantTicket != null) {
      unawaited(api
          .assistantRequest(
              'DELETE', '/assistant/requests/${assistantTicket!['requestId']}',
              capability: _capability())
          .catchError((_) => <String, dynamic>{}));
    }
    _assistantRevision++;
    _assistantPolling?.cancel();
    assistantMessages.clear();
    assistantError = null;
    assistantMode = 'provider';
    assistantTicket = null;
    assistantLoading = false;
    assistantDraft = '';
    _assistantSubmission = null;
    _assistantCapability = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _assistantRevision++;
    _assistantPolling?.cancel();
    super.dispose();
  }

  String _newIdempotencyKey() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    return bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join();
  }
}
