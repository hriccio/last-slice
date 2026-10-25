import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:last_slice_mobile/api_client.dart';
import 'package:last_slice_mobile/main.dart';
import 'package:last_slice_mobile/models.dart';
import 'package:last_slice_mobile/order_state.dart';
import 'order_tracking_test.dart' show menu;

class ProposalApi extends ApiClient {
  int messages = 0, confirmations = 0;
  Json? lastPayload;
  Json? proposal;
  @override
  Future<Json> get(String path) async => {
        ...menu,
        'flavors': [
          ...(menu['flavors'] as List),
          {
            'id': 'calabresa',
            'name': 'Calabresa',
            'description': 'Demo pizza',
            'ingredients': [],
            'prices': {'grande': 6400}
          }
        ],
        'sizes': [
          ...(menu['sizes'] as List),
          {
            'id': 'grande',
            'diameterCm': 35,
            'slices': 8,
            'label': {'pt-BR': 'Grande', 'en-US': 'Large'}
          }
        ]
      };
  @override
  Future<Json> post(String path, Json payload) async =>
      proposal!['quote'] as Json;
  @override
  Future<Json> assistantRequest(String method, String path,
      {required String capability, Json? payload}) async {
    if (path.endsWith('/confirm')) {
      confirmations++;
      return {'proposal': proposal};
    }
    if (method == 'DELETE') return {};
    messages++;
    lastPayload = payload;
    proposal = {
      'candidate': {
        'operation': 'add',
        'targetLineId': null,
        'line': {
          'flavorId': 'calabresa',
          'sizeId': 'grande',
          'crustId': 'traditional',
          'removedIngredientIds': <String>[],
          'extraToppingIds': <String>[],
          'quantity': 1
        }
      },
      'id': 'proposal-one',
      'requestId': payload!['requestId'],
      'operation': 'add',
      'baseRevision': payload['context']['cartSnapshot']['revision'],
      'expiresAt':
          DateTime.now().add(const Duration(minutes: 5)).toIso8601String(),
      'fulfillment': 'pickup',
      'summary': '1 × Calabresa · Grande · Tradicional',
      'lines': [
        {
          'lineId': 'line-one',
          'flavorId': 'calabresa',
          'sizeId': 'grande',
          'crustId': 'traditional',
          'removedIngredientIds': <String>[],
          'extraToppingIds': <String>[],
          'quantity': 1
        }
      ],
      'quote': {'lines': [], 'subtotal': 6400, 'deliveryFee': 0, 'total': 6400},
    };
    return {
      'reply': 'Review this proposal',
      'proposal': proposal,
      'mode': 'provider'
    };
  }
}

void main() {
  for (final locale in ['pt-BR', 'en-US']) {
    testWidgets(
        'proposal needs review, applies once and survives clearing chat ($locale)',
        (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final api = ProposalApi();
      final order = OrderState(api)..locale = locale;
      await tester.pumpWidget(PizzeriaApp(state: order));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip(
          locale == 'pt-BR' ? 'Perguntar à pizzaria' : 'Ask the pizzeria'));
      await tester.pumpAndSettle();
      await order.sendAssistantMessage('Calabresa grande', {'screen': 'menu'});
      await tester.pumpAndSettle();
      expect(order.cart, isEmpty);
      expect(order.assistantProposal, isNotNull);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await tester.pumpAndSettle();
      final apply =
          find.text(locale == 'pt-BR' ? 'Aplicar à sacola' : 'Apply to cart');
      await tester.ensureVisible(apply);
      await tester.pumpAndSettle();
      await tester.tap(apply);
      await tester.pumpAndSettle();
      expect(order.cart.length, 1);
      expect(order.cart.first.lineId, 'line-one');
      expect(order.cartQuote?.total, 6400);
      expect(api.messages, 1);
      expect(api.confirmations, 1);
      await order.applyAssistantProposal();
      expect(api.confirmations, 1);
      final review = find.text(locale == 'pt-BR'
          ? 'Revisar pedido demonstrativo'
          : 'Review demo order');
      await tester.ensureVisible(review);
      await tester.pumpAndSettle();
      await tester.tap(review);
      await tester.pumpAndSettle();
      expect(find.byType(CartScreen), findsOneWidget);
      order.clearAssistantConversation();
      expect(order.cart.length, 1);
      expect(order.assistantProposal, isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      order.dispose();
      api.close();
    });
  }
  test('adjust retains the unapplied configuration in the next request',
      () async {
    final api = ProposalApi();
    final order = OrderState(api);
    await order.sendAssistantMessage('pizza', {'screen': 'menu'});
    order.dismissAssistantProposal(keepDraft: true);
    await order.sendAssistantMessage('thin crust', {'screen': 'menu'});
    expect(api.lastPayload?['context']['draftProposal']['operation'], 'add');
    expect(order.cart, isEmpty);
    order.dispose();
    api.close();
  });
  test('cart edits and expired proposals prevent confirmation', () async {
    final api = ProposalApi();
    final order = OrderState(api);
    await order.sendAssistantMessage('pizza', {'screen': 'menu'});
    await order.setFulfillment('delivery');
    expect(order.proposalStale, isTrue);
    expect(await order.applyAssistantProposal(), isFalse);
    expect(api.confirmations, 0);
    order.dispose();
    api.close();
  });
}
