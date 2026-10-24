import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:last_slice_mobile/api_client.dart';
import 'package:last_slice_mobile/main.dart';
import 'package:last_slice_mobile/models.dart';
import 'package:last_slice_mobile/order_state.dart';
import 'order_tracking_test.dart' show menu, demoOrder;

class PublicApi extends ApiClient {
  Json? submitted;
  @override
  Future<Json> get(String path) async => path.startsWith('/menu')
      ? {
          ...menu,
          'publicDemo': true,
          'checkoutFixtures': {
            'demo-pickup': {
              'name': {
                'pt-BR': 'Cliente fictício',
                'en-US': 'Fictional customer'
              },
              'phone': {'pt-BR': 'Sem telefone', 'en-US': 'No phone'},
              'address': {
                'pt-BR': 'Retirada fictícia',
                'en-US': 'Fictional pickup'
              }
            }
          }
        }
      : demoOrder();
  @override
  Future<Json> post(String path, Json payload) async {
    submitted = payload;
    return demoOrder();
  }
}

void main() {
  for (final locale in ['pt-BR', 'en-US']) {
    testWidgets(
        'public checkout accepts only fictional fixture and never renders contact fields ($locale)',
        (tester) async {
      final api = PublicApi();
      // Use the same API instance for creation and tracking.
      final current = OrderState(api)..locale = locale;
      await current.loadMenu();
      current.cart.add(CartLine(
          flavorId: 'mussarela',
          sizeId: 'media',
          crustId: 'traditional',
          removedIngredientIds: [],
          extraToppingIds: [],
          quantity: 1));
      await tester
          .pumpWidget(MaterialApp(home: CheckoutScreen(state: current)));
      await tester.pumpAndSettle();
      expect(find.byType(TextFormField), findsNothing);
      expect(
          find.text(locale == 'pt-BR'
              ? 'Dados fictícios da demonstração'
              : 'Fictional demo details'),
          findsOneWidget);
      await current.submitOrder(
          name: 'PRIVATE_NAME',
          phone: 'PRIVATE_PHONE',
          address: {'street': 'PRIVATE_STREET'});
      expect(api.submitted?['fixtureId'], 'demo-pickup');
      expect(api.submitted?.containsKey('customer'), isFalse);
      expect(api.submitted?.containsKey('address'), isFalse);
      await tester.pumpWidget(const SizedBox.shrink());
      current.dispose();
      api.close();
    });
  }
}
