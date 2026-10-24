import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:last_slice_mobile/api_client.dart';
import 'package:last_slice_mobile/main.dart';
import 'package:last_slice_mobile/models.dart';
import 'package:last_slice_mobile/order_state.dart';

const menu = <String, dynamic>{
  'flavors': [
    {
      'id': 'mussarela',
      'name': 'Mussarela',
      'description': 'Demo pizza',
      'ingredients': [],
      'prices': {'media': 4600}
    },
  ],
  'sizes': [
    {
      'id': 'media',
      'diameterCm': 30,
      'slices': 6,
      'label': {'pt-BR': 'Média', 'en-US': 'Medium'}
    },
  ],
  'crusts': [
    {'id': 'traditional', 'surcharge': 0}
  ],
  'extras': [],
  'deliveryFee': 800,
};

Json demoOrder({String status = 'received', String fulfillment = 'pickup'}) => {
      'orderCode': 'LS-123456789ABCDE',
      'createdAt': '2026-10-24T12:00:00.000Z',
      'updatedAt': '2026-10-24T12:00:00.000Z',
      'status': status,
      'statusKey': 'status.$status',
      'fulfillment': fulfillment,
      'demoOnly': true,
      'lines': [
        {
          'flavorId': 'mussarela',
          'sizeId': 'media',
          'crustId': 'traditional',
          'removedIngredientIds': <String>[],
          'extraToppingIds': <String>[],
          'quantity': 1,
          'unitPrice': 4600,
          'lineTotal': 4600
        },
      ],
      'subtotal': 4600,
      'deliveryFee': fulfillment == 'delivery' ? 800 : 0,
      'total': fulfillment == 'delivery' ? 5400 : 4600,
    };

class TrackingApi extends ApiClient {
  Json order = demoOrder();
  int lookups = 0;
  String? lastPath;
  ApiException? failure;
  Completer<Json>? pending;

  @override
  Future<Json> get(String path) async {
    if (path.startsWith('/menu')) return menu;
    lookups++;
    lastPath = path;
    if (pending != null) return pending!.future;
    if (failure != null) throw failure!;
    return {...order};
  }
}

void foreground(WidgetTester tester, bool visible) {
  final binding = tester.binding;
  if (visible) {
    if (binding.lifecycleState == AppLifecycleState.paused) {
      binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    }
    if (binding.lifecycleState == AppLifecycleState.hidden) {
      binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    }
    binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
  } else {
    binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
  }
}

Future<NavigatorState> openScreen(WidgetTester tester, TrackingApi api,
    {String locale = 'en-US',
    bool confirmation = false,
    String initialCode = 'ls-123456789abcde',
    bool narrow = false}) async {
  foreground(tester, true);
  addTearDown(() {
    foreground(tester, true);
    api.close();
  });
  {
    tester.view.physicalSize =
        narrow ? const Size(320, 800) : const Size(1000, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }
  final state = OrderState(api)..locale = locale;
  await tester.pumpWidget(PizzeriaApp(state: state));
  await tester.pumpAndSettle();
  final navigator = tester.state<NavigatorState>(find.byType(Navigator));
  unawaited(navigator.push(MaterialPageRoute<void>(
      builder: (_) => confirmation
          ? ConfirmationScreen(state: state, order: demoOrder())
          : TrackingScreen(state: state, initialCode: initialCode))));
  await tester.pumpAndSettle();
  return navigator;
}

Future<void> refresh(WidgetTester tester,
    [String label = 'Refresh status']) async {
  final button = find.widgetWithText(OutlinedButton, label);
  await tester.ensureVisible(button);
  await tester.tap(button);
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 100));
}

Future<void> closeScreen(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox.shrink());
  foreground(tester, true);
  await tester.pump();
}

void main() {
  for (final locale in ['pt-BR', 'en-US']) {
    testWidgets('can resume from the menu by entering a code ($locale)',
        (tester) async {
      final api = TrackingApi();
      final state = OrderState(api)..locale = locale;
      await tester.pumpWidget(PizzeriaApp(state: state));
      await tester.pumpAndSettle();
      final track = find.widgetWithText(TextButton,
          locale == 'pt-BR' ? 'Acompanhar pedido' : 'Track an order');
      await tester.tap(track);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'ls-123456789abcde');
      await tester.tap(find.widgetWithText(ElevatedButton,
          locale == 'pt-BR' ? 'Buscar pedido' : 'Look up order'));
      await tester.pumpAndSettle();
      expect(api.lookups, 1);
      expect(find.text('LS-123456789ABCDE'), findsOneWidget);
      await closeScreen(tester);
      api.close();
    });

    testWidgets(
        'lookup, accessible timeline and failed refresh preserve the order ($locale)',
        (tester) async {
      final api = TrackingApi();
      final semantics = tester.ensureSemantics();

      await openScreen(tester, api, locale: locale);
      expect(api.lastPath, '/orders/LS-123456789ABCDE');
      expect(api.lookups, 1);
      expect(find.text('LS-123456789ABCDE'), findsOneWidget);
      expect(
          find.textContaining(
              locale == 'pt-BR' ? 'Última consulta:' : 'Last checked:'),
          findsOneWidget);
      expect(
          find.bySemanticsLabel(locale == 'pt-BR'
              ? 'Recebido, Status atual'
              : 'Received, Current status'),
          findsOneWidget);
      api.order = demoOrder(status: 'confirmed');
      await tester.pump(const Duration(seconds: 14));
      expect(api.lookups, 1);
      await tester.pump(const Duration(seconds: 1));
      await tester.pump();
      expect(api.lookups, 2);
      expect(
          find.bySemanticsLabel(locale == 'pt-BR'
              ? 'Recebido, Etapa anterior'
              : 'Received, Earlier step'),
          findsOneWidget);
      api.failure = const ApiException('order_lookup_failed', 503);
      await refresh(
          tester, locale == 'pt-BR' ? 'Atualizar status' : 'Refresh status');
      expect(find.text(locale == 'pt-BR' ? 'Confirmado' : 'Confirmed'),
          findsOneWidget);
      expect(
          find.textContaining(locale == 'pt-BR'
              ? 'Exibindo o último status'
              : 'Showing the last status'),
          findsOneWidget);
      expect(find.text('LS-123456789ABCDE'), findsOneWidget);
      api.failure = null;
      await refresh(
          tester, locale == 'pt-BR' ? 'Atualizar status' : 'Refresh status');
      expect(
          find.textContaining(locale == 'pt-BR'
              ? 'Exibindo o último status'
              : 'Showing the last status'),
          findsNothing);

      semantics.dispose();
      await closeScreen(tester);
    });

    testWidgets(
        'confirmation polls, retries, keeps terminal manual refresh and carries code ($locale)',
        (tester) async {
      final api = TrackingApi();
      await openScreen(tester, api, locale: locale, confirmation: true);
      final refreshLabel =
          locale == 'pt-BR' ? 'Atualizar status' : 'Refresh status';
      api.order = demoOrder(status: 'confirmed');
      await tester.pump(const Duration(seconds: 15));
      await tester.pump();
      expect(find.text(locale == 'pt-BR' ? 'Confirmado' : 'Confirmed'),
          findsOneWidget);
      api.failure = const ApiException('offline', 503);
      await refresh(tester, refreshLabel);
      expect(
          find.textContaining(locale == 'pt-BR'
              ? 'Exibindo o último status'
              : 'Showing the last status'),
          findsOneWidget);
      api.failure = null;
      api.order = demoOrder(status: 'completed');
      await refresh(tester, refreshLabel);
      final count = api.lookups;
      await tester.pump(const Duration(seconds: 45));
      expect(api.lookups, count);
      await refresh(tester, refreshLabel);
      expect(api.lookups, count + 1);
      final track = find.widgetWithText(ElevatedButton,
          locale == 'pt-BR' ? 'Acompanhar pedido' : 'Track an order');
      await tester.ensureVisible(track);
      await tester.tap(track);
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
          'LS-123456789ABCDE');
      expect(find.text(locale == 'pt-BR' ? 'Concluído' : 'Completed'),
          findsOneWidget);
      await closeScreen(tester);
    });
  }

  for (final confirmation in [false, true]) {
    testWidgets(
        'pauses while backgrounded/covered and refreshes on resume (confirmation=$confirmation)',
        (tester) async {
      final api = TrackingApi();
      final navigator =
          await openScreen(tester, api, confirmation: confirmation);
      foreground(tester, false);
      await tester.pump(const Duration(seconds: 45));
      expect(api.lookups, 1);
      foreground(tester, true);
      await tester.pump();
      expect(api.lookups, 2);
      unawaited(navigator.push(MaterialPageRoute<void>(
          builder: (_) => const Scaffold(body: Text('Covered')))));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 45));
      expect(api.lookups, 2);
      navigator.pop();
      await tester.pumpAndSettle();
      expect(api.lookups, 3);
      await closeScreen(tester);
    });

    testWidgets(
        'pending requests do not overlap or restart background polling (confirmation=$confirmation)',
        (tester) async {
      final api = TrackingApi();
      await openScreen(tester, api, confirmation: confirmation);
      api.pending = Completer<Json>();
      final button = find.widgetWithText(OutlinedButton, 'Refresh status');
      final focus = Focus.of(tester.element(find
          .descendant(of: button, matching: find.text('Refresh status'))
          .first));
      focus.requestFocus();
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pump();
      expect(api.lookups, 2);
      expect(focus.hasFocus, isTrue);
      await tester.pump(const Duration(seconds: 45));
      expect(api.lookups, 2);
      expect(
          find.widgetWithText(OutlinedButton, 'Refreshing…'), findsOneWidget);
      foreground(tester, false);
      api.pending!.complete(demoOrder(status: 'preparing'));
      api.pending = null;
      await tester.pump();
      await tester.pump(const Duration(seconds: 45));
      expect(api.lookups, 2);
      foreground(tester, true);
      await tester.pump();
      expect(api.lookups, 3);
      expect(focus.hasFocus, isTrue);
      await closeScreen(tester);
    });
  }

  testWidgets(
      'delivery, cancelled, completed and unknown states never invent progress',
      (tester) async {
    final api = TrackingApi()
      ..order = demoOrder(status: 'out_for_delivery', fulfillment: 'delivery');
    final semantics = tester.ensureSemantics();

    await openScreen(tester, api);
    expect(find.textContaining('Ready for pickup'), findsNothing);
    expect(find.bySemanticsLabel('Out for delivery, Current status'),
        findsOneWidget);
    for (final status in ['completed', 'cancelled']) {
      api.order = demoOrder(status: status, fulfillment: 'delivery');
      await refresh(tester);
      final count = api.lookups;
      await tester.pump(const Duration(seconds: 45));
      expect(api.lookups, count);
    }
    expect(find.textContaining('terminal demo status'), findsOneWidget);
    expect(find.textContaining('Upcoming step'), findsNothing);
    api.order = demoOrder(status: 'future_status');
    await refresh(tester);
    expect(find.textContaining('Unknown status.'), findsWidgets);
    expect(find.text('LS-123456789ABCDE'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp(r', Current status$')), findsNothing);

    semantics.dispose();
    await closeScreen(tester);
  });

  testWidgets(
      'failed initial lookup and changed code retain input and ignore stale responses',
      (tester) async {
    final api = TrackingApi()
      ..failure = const ApiException('order_not_found', 404);
    await openScreen(tester, api);
    expect(find.text('Order not found. Check the code and try again.'),
        findsOneWidget);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'ls-123456789abcde');
    api.failure = null;
    api.pending = Completer<Json>();
    await tester.tap(find.widgetWithText(ElevatedButton, 'Look up order'));
    await tester.pump();
    await tester.enterText(find.byType(TextField), 'LS-ANOTHER');
    api.pending!.complete(demoOrder());
    api.pending = null;
    await tester.pump();
    expect(find.text('LS-123456789ABCDE'), findsNothing);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'LS-ANOTHER');
    await closeScreen(tester);
  });

  testWidgets('timeline wraps at 320 logical pixels and twice the text size',
      (tester) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final api = TrackingApi()
      ..order = demoOrder(status: 'out_for_delivery', fulfillment: 'delivery');
    await openScreen(tester, api, narrow: true);
    await tester.scrollUntilVisible(
        find.textContaining('Out for delivery ·'), 150,
        scrollable: find
            .descendant(
                of: find.byType(TrackingScreen),
                matching: find.byType(Scrollable))
            .first);
    expect(tester.takeException(), isNull);
    await closeScreen(tester);
  });
}
