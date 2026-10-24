import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:last_slice_mobile/api_client.dart';
import 'package:last_slice_mobile/main.dart';
import 'package:last_slice_mobile/models.dart';
import 'package:last_slice_mobile/order_state.dart';
import 'order_tracking_test.dart' show menu;

class AssistantApi extends ApiClient {
  int posts = 0, gets = 0, deletes = 0;
  String status = 'queued';
  String? failure;
  @override
  Future<Json> get(String path) async => menu;
  @override
  Future<Json> assistantRequest(String method, String path,
      {required String capability, Json? payload}) async {
    expectSync(capability.length, 64);
    if (method == 'POST') {
      posts++;
      if (failure != null)
        throw ApiException(failure!, 429, resetsAt: '2026-10-25T00:00:00Z');
    }
    if (method == 'GET') gets++;
    if (method == 'DELETE') {
      deletes++;
      status = 'cancelled';
    }
    return {
      'requestId': '11111111-1111-4111-8111-111111111111',
      'state': status,
      'position': 2,
      'pollAfterSeconds': 3,
      'estimatedReplySeconds': 50,
      if (gets > 0) 'recentAverageReplySeconds': 40,
      if (status == 'completed')
        'reply': 'Use the crust controls to select thin crust.'
    };
  }
}

void main() {
  for (final locale in ['pt-BR', 'en-US']) {
    testWidgets(
        'natural chat queues, polls, cancels and preserves state ($locale)',
        (tester) async {
      final api = AssistantApi();
      final state = OrderState(api)..locale = locale;
      await tester.pumpWidget(PizzeriaApp(state: state));
      await tester.pumpAndSettle();
      final original = state.cart.length;
      await tester.tap(find.byTooltip(
          locale == 'pt-BR' ? 'Perguntar à pizzaria' : 'Ask the pizzeria'));
      await tester.pumpAndSettle();
      final input = find.widgetWithText(
          TextField,
          locale == 'pt-BR'
              ? 'Pergunte sobre sabores ou ingredientes'
              : 'Ask about flavors or ingredients');
      await tester.enterText(input, 'pizza grande sem cebola');
      await tester.tap(find
          .byTooltip(locale == 'pt-BR' ? 'Enviar mensagem' : 'Send message'));
      await tester.pumpAndSettle();
      expect(api.posts, 1);
      expect(state.assistantTicket?['state'], 'queued');
      expect(state.cart.length, original);
      expect(
          find.textContaining(
              locale == 'pt-BR' ? 'Ainda sem média' : 'No recent average'),
          findsOneWidget);
      await tester.pump(const Duration(seconds: 3));
      await tester.pump();
      expect(api.gets, 1);
      await tester.ensureVisible(
          find.text(locale == 'pt-BR' ? 'Sair da fila' : 'Leave queue'));
      await tester
          .tap(find.text(locale == 'pt-BR' ? 'Sair da fila' : 'Leave queue'));
      await tester.pumpAndSettle();
      expect(api.deletes, 1);
      expect(state.assistantLoading, isFalse);
      expect(tester.widget<TextField>(input).controller!.text,
          'pizza grande sem cebola');
      api.status = 'queued';
      await tester.tap(find
          .byTooltip(locale == 'pt-BR' ? 'Enviar mensagem' : 'Send message'));
      await tester.pumpAndSettle();
      api.status = 'completed';
      await tester.pump(const Duration(seconds: 3));
      await tester.pump();
      expect(state.assistantMessages.last['role'], 'assistant');
      expect(state.assistantLoading, isFalse);
      api.failure = 'assistant_budget_exhausted';
      await tester.enterText(input, 'pizza');
      await tester.tap(find
          .byTooltip(locale == 'pt-BR' ? 'Enviar mensagem' : 'Send message'));
      await tester.pumpAndSettle();
      expect(state.assistantError, 'assistant_budget_exhausted');
      expect(tester.widget<TextField>(input).controller!.text, 'pizza');
      await tester.pumpWidget(const SizedBox.shrink());
      state.dispose();
      api.close();
    });
  }
  testWidgets(
      'hidden assistant pauses polling and old responses cannot enter a new conversation',
      (tester) async {
    final api = AssistantApi();
    final state = OrderState(api);
    state.assistantSetVisible(true);
    await state.sendAssistantMessage('pizza', {'screen': 'menu'});
    expect(state.assistantTicket, isNotNull, reason: state.assistantError);
    state.assistantSetForeground(false);
    await tester.pump(const Duration(seconds: 30));
    expect(api.gets, 0);
    state.assistantSetForeground(true);
    await tester.pump(const Duration(milliseconds: 1));
    await tester.pump();
    expect(api.gets, 1);
    state.clearAssistantConversation();
    await tester.pump(const Duration(seconds: 30));
    expect(state.assistantMessages, isEmpty);
    state.dispose();
    api.close();
  });
}
