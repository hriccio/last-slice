import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:last_slice_mobile/api_client.dart';
import 'package:last_slice_mobile/main.dart';
import 'package:last_slice_mobile/models.dart';
import 'package:last_slice_mobile/order_state.dart';

class UnavailableApi extends ApiClient {
  @override
  Future<Json> get(String path) async =>
      throw const ApiException('offline', 503);
}

void main() {
  for (final locale in ['pt-BR', 'en-US']) {
    testWidgets('API outage shows localized retry without fake menu ($locale)',
        (tester) async {
      final api = UnavailableApi();
      final state = OrderState(api)..locale = locale;
      await tester.pumpWidget(PizzeriaApp(state: state));
      await tester.pumpAndSettle();

      expect(
        find.text(locale == 'pt-BR'
            ? 'Não foi possível conectar ao cardápio. Confira a conexão e tente novamente.'
            : 'Could not connect to the menu. Check your connection and try again.'),
        findsOneWidget,
      );
      expect(find.text(locale == 'pt-BR' ? 'Tentar novamente' : 'Retry'),
          findsOneWidget);
      expect(find.text('Mussarela'), findsNothing);
      expect(state.menu, isNull);

      await tester.pumpWidget(const SizedBox.shrink());
      state.dispose();
      api.close();
    });
  }
}
