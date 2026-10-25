import 'dart:async';

import 'package:flutter/material.dart';

import 'api_client.dart';
import 'models.dart';
import 'order_state.dart';

const _background = Color(0xFF101010);
const _surface = Color(0xFF1C1C1C);
const _surfaceLight = Color(0xFF292929);
const _orange = Color(0xFFFF7A2F);
const _text = Color(0xFFF5F1EC);
const _muted = Color(0xFFAAA39D);
final RouteObserver<PageRoute<dynamic>> _routeObserver =
    RouteObserver<PageRoute<dynamic>>();

void main() => runApp(PizzeriaApp(state: OrderState(ApiClient())));

class PizzeriaApp extends StatelessWidget {
  const PizzeriaApp({super.key, required this.state});

  final OrderState state;

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: state,
        builder: (context, _) => MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'The Last Slice',
          theme: ThemeData(
            brightness: Brightness.dark,
            colorScheme: const ColorScheme.dark(
              primary: _orange,
              secondary: _orange,
              surface: _surface,
              onSurface: _text,
            ),
            scaffoldBackgroundColor: _background,
            appBarTheme: const AppBarTheme(
              backgroundColor: _background,
              foregroundColor: _text,
              elevation: 0,
              centerTitle: false,
            ),
            inputDecorationTheme: InputDecorationTheme(
              filled: true,
              fillColor: _surface,
              labelStyle: const TextStyle(color: _muted),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: _orange),
              ),
            ),
            elevatedButtonTheme: ElevatedButtonThemeData(
              style: ElevatedButton.styleFrom(
                backgroundColor: _orange,
                foregroundColor: const Color(0xFF1A100A),
                minimumSize: const Size.fromHeight(54),
                textStyle: const TextStyle(fontWeight: FontWeight.w700),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
            chipTheme: const ChipThemeData(
              backgroundColor: _surfaceLight,
              selectedColor: _orange,
              labelStyle: TextStyle(color: _text),
              side: BorderSide(color: Colors.transparent),
            ),
          ),
          home: BrowseScreen(state: state),
          navigatorObservers: <NavigatorObserver>[_routeObserver],
        ),
      );
}

String _copy(String locale, String key) {
  const copy = <String, Map<String, String>>{
    'pt-BR': {
      'brand': 'PIZZARIA ARTESANAL',
      'hero': 'Uma boa noite\ncomeça com pizza.',
      'intro':
          'Receitas de verdade, ingredientes generosos e aquele último pedaço que todo mundo quer.',
      'menu': 'O cardápio',
      'popular': 'AS FAVORITAS DA CASA',
      'search': 'Buscar sabor ou ingrediente',
      'cart': 'Sua sacola',
      'emptyCart': 'Sua sacola está vazia.',
      'customize': 'Monte sua pizza',
      'size': 'Tamanho',
      'crust': 'Massa',
      'traditional': 'Tradicional',
      'thin': 'Fina',
      'stuffed': 'Recheada com Catupiry',
      'included': 'Inclusa',
      'ingredients': 'Ingredientes',
      'removeHint': 'Desmarque para retirar',
      'extras': 'Adicionais',
      'maxExtras': 'Escolha até três adicionais.',
      'add': 'Adicionar à sacola',
      'total': 'Total',
      'quote': 'Calculando valor…',
      'quoteError': 'Não foi possível calcular agora. Tente novamente.',
      'cartError':
          'Não foi possível atualizar o valor. Seus itens foram mantidos.',
      'checkout': 'Continuar para o checkout',
      'pickup': 'Retirada',
      'delivery': 'Entrega',
      'subtotal': 'Subtotal',
      'deliveryFee': 'Taxa de entrega',
      'name': 'Seu nome',
      'phone': 'Celular com DDD',
      'street': 'Rua',
      'number': 'Número',
      'neighborhood': 'Bairro',
      'city': 'Cidade',
      'state': 'UF',
      'complement': 'Complemento (opcional)',
      'reference': 'Ponto de referência (opcional)',
      'demo': 'DEMONSTRAÇÃO · SEM PAGAMENTO OU ENTREGA REAL',
      'place': 'Confirmar pedido demonstrativo',
      'sending': 'Enviando…',
      'received': 'Pedido demonstrativo recebido!',
      'orderCode': 'Código do pedido',
      'status': 'Status atual',
      'track': 'Acompanhar pedido',
      'trackHelp': 'Informe o código para consultar o status atual.',
      'find': 'Buscar pedido',
      'notFound': 'Pedido não encontrado. Confira o código e tente novamente.',
      'lookupConnection':
          'Não foi possível consultar o pedido. Confira a conexão e tente novamente.',
      'trackingConnection':
          'Não foi possível atualizar. Exibindo o último status carregado.',
      'refresh': 'Atualizar status',
      'refreshing': 'Atualizando…',
      'lastChecked': 'Última consulta',
      'statusUpdated': 'Status atualizado',
      'timeline': 'Etapas demonstrativas',
      'upcoming': 'Próxima etapa',
      'preceding': 'Etapa anterior',
      'unknownStatus': 'Status desconhecido. Tente atualizar novamente.',
      'connection':
          'Não foi possível conectar ao cardápio. Confira a conexão e tente novamente.',
      'retry': 'Tentar novamente',
      'validationName': 'Informe seu nome.',
      'validationPhone': 'Informe um celular válido com DDD.',
      'validationAddress': 'Preencha este campo.',
      'validationState': 'Informe a sigla de dois letras do estado.',
      'without': 'Sem',
      'extrasLabel': 'Adicionais',
      'back': 'Voltar',
      'continueShopping': 'Escolher uma pizza',
      'finish': 'Pronto',
      'orderDetails': 'Resumo do pedido',
      'networkError':
          'Não foi possível concluir. Seus dados foram mantidos para tentar novamente.',
      'assistantOpen': 'Perguntar à pizzaria',
      'assistantTitle': 'Ajuda da pizzaria',
      'assistantIntro':
          'Ajuda opcional para o cardápio demonstrativo. Não envie dados pessoais; suas escolhas continuam nos controles do app.',
      'assistantHint': 'Pergunte sobre sabores ou ingredientes',
      'assistantSend': 'Enviar mensagem',
      'assistantEmpty': 'Como posso ajudar com o cardápio?',
      'assistantQueued': 'Aguardando disponibilidade da IA',
      'assistantPosition': 'Posição na fila',
      'assistantEstimate': 'Resposta estimada em cerca de',
      'assistantAverage': 'Tempo médio recente para responder',
      'assistantNoAverage': 'Estimativa inicial · Ainda sem média recente',
      'assistantCancel': 'Sair da fila',
      'assistantStale':
          'Resposta referente à seleção anterior. Confira o orçamento atual.',
      'assistantBusy': 'Pensando…',
      'assistantError':
          'A ajuda está indisponível agora. Seu pedido continua como estava.',
      'assistantDisclaimer':
          'Informações demonstrativas. Confira opções e valores nos controles do pedido.',
      'assistantFake': 'Prévia local de desenvolvimento',
      'assistantNew': 'Nova conversa',
    },
    'en-US': {
      'brand': 'ARTISAN PIZZERIA',
      'hero': 'A good evening\nstarts with pizza.',
      'intro':
          'Honest recipes, generous ingredients, and that last slice everyone wants.',
      'menu': 'The menu',
      'popular': 'HOUSE FAVORITES',
      'search': 'Search flavors or ingredients',
      'cart': 'Your bag',
      'emptyCart': 'Your bag is empty.',
      'customize': 'Build your pizza',
      'size': 'Size',
      'crust': 'Crust',
      'traditional': 'Traditional crust',
      'thin': 'Thin crust',
      'stuffed': 'Catupiry-stuffed crust',
      'included': 'Included',
      'ingredients': 'Ingredients',
      'removeHint': 'Uncheck to remove',
      'extras': 'Extras',
      'maxExtras': 'Choose up to three extras.',
      'add': 'Add to bag',
      'total': 'Total',
      'quote': 'Calculating total…',
      'quoteError': 'Could not calculate right now. Please try again.',
      'cartError': 'Could not update the total. Your items were kept.',
      'checkout': 'Continue to checkout',
      'pickup': 'Pickup',
      'delivery': 'Delivery',
      'subtotal': 'Subtotal',
      'deliveryFee': 'Delivery fee',
      'name': 'Your name',
      'phone': 'Phone with area code',
      'street': 'Street',
      'number': 'Number',
      'neighborhood': 'Neighborhood',
      'city': 'City',
      'state': 'State',
      'complement': 'Apt / suite (optional)',
      'reference': 'Delivery note (optional)',
      'demo': 'DEMO ONLY · NO REAL PAYMENT OR DELIVERY',
      'place': 'Place demo order',
      'sending': 'Sending…',
      'received': 'Demo order received!',
      'orderCode': 'Order code',
      'status': 'Current status',
      'track': 'Track an order',
      'trackHelp': 'Enter your code to see the latest status.',
      'find': 'Look up order',
      'notFound': 'Order not found. Check the code and try again.',
      'lookupConnection':
          'Could not look up the order. Check your connection and try again.',
      'trackingConnection':
          'Could not refresh. Showing the last status we loaded.',
      'refresh': 'Refresh status',
      'refreshing': 'Refreshing…',
      'lastChecked': 'Last checked',
      'statusUpdated': 'Status updated',
      'timeline': 'Demo order steps',
      'upcoming': 'Upcoming step',
      'preceding': 'Earlier step',
      'unknownStatus': 'Unknown status. Try refreshing again.',
      'connection':
          'Could not connect to the menu. Check your connection and try again.',
      'retry': 'Retry',
      'validationName': 'Enter your name.',
      'validationPhone': 'Enter a valid phone with area code.',
      'validationAddress': 'This field is required.',
      'validationState': 'Enter a two-letter state abbreviation.',
      'without': 'Without',
      'extrasLabel': 'Extras',
      'back': 'Back',
      'continueShopping': 'Choose a pizza',
      'finish': 'Done',
      'orderDetails': 'Order summary',
      'networkError':
          'Could not place the order. Your details were kept so you can try again.',
      'assistantOpen': 'Ask the pizzeria',
      'assistantTitle': 'Pizzeria help',
      'assistantIntro':
          'Optional help for the demo menu. Do not share personal details; your selections stay in the app controls.',
      'assistantHint': 'Ask about flavors or ingredients',
      'assistantSend': 'Send message',
      'assistantEmpty': 'How can I help with the menu?',
      'assistantQueued': 'Waiting for AI availability',
      'assistantPosition': 'Queue position',
      'assistantEstimate': 'Estimated reply in about',
      'assistantAverage': 'Recent average time to answer',
      'assistantNoAverage': 'Initial estimate · No recent average yet',
      'assistantCancel': 'Leave queue',
      'assistantStale':
          'Answer for the earlier selection. Check the current quote.',
      'assistantBusy': 'Thinking…',
      'assistantError':
          'Help is unavailable right now. Your order is unchanged.',
      'assistantDisclaimer':
          'Demo information. Confirm options and prices in the ordering controls.',
      'assistantFake': 'Local development preview',
      'assistantNew': 'New conversation',
    },
  };
  return copy[locale]?[key] ?? copy['pt-BR']![key] ?? key;
}

String _money(int cents, String locale) {
  final digits = (cents ~/ 100).toString();
  final separator = locale == 'pt-BR' ? '.' : ',';
  final grouped = digits.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => separator,
  );
  final decimal = locale == 'pt-BR' ? ',' : '.';
  final remainder = (cents % 100).toString().padLeft(2, '0');
  return 'R\$ $grouped$decimal$remainder';
}

String _statusLabel(String locale, String status) {
  const labels = {
    'pt-BR': {
      'received': 'Recebido',
      'confirmed': 'Confirmado',
      'preparing': 'Em preparo',
      'ready_for_pickup': 'Pronto para retirada',
      'out_for_delivery': 'Saiu para entrega',
      'completed': 'Concluído',
      'cancelled': 'Cancelado',
    },
    'en-US': {
      'received': 'Received',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'ready_for_pickup': 'Ready for pickup',
      'out_for_delivery': 'Out for delivery',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    },
  };
  return labels[locale]?[status] ?? _copy(locale, 'unknownStatus');
}

String _statusExplanation(String locale, String status) {
  const explanations = {
    'pt-BR': {
      'received': 'O pedido demonstrativo consta como recebido.',
      'confirmed': 'O pedido demonstrativo consta como confirmado.',
      'preparing': 'O status demonstrativo indica preparo.',
      'ready_for_pickup': 'O status demonstrativo indica pronto para retirada.',
      'out_for_delivery': 'O status demonstrativo indica saiu para entrega.',
      'completed': 'O pedido demonstrativo consta como concluído.',
      'cancelled': 'O pedido demonstrativo consta como cancelado.',
    },
    'en-US': {
      'received': 'The demo order is marked as received.',
      'confirmed': 'The demo order is marked as confirmed.',
      'preparing': 'The demo status indicates preparation.',
      'ready_for_pickup': 'The demo status indicates ready for pickup.',
      'out_for_delivery': 'The demo status indicates out for delivery.',
      'completed': 'The demo order is marked as complete.',
      'cancelled': 'The demo order is marked as cancelled.',
    },
  };
  return explanations[locale]?[status] ?? '';
}

T? _firstWhereOrNull<T>(Iterable<T> items, bool Function(T) test) {
  for (final item in items) {
    if (test(item)) return item;
  }
  return null;
}

String _ingredientName(MenuCatalog menu, String flavorId, String id) =>
    _firstWhereOrNull(
        menu.flavor(flavorId).ingredients, (item) => item.id == id)?.name ??
    '';

String _extraName(MenuCatalog menu, String id) =>
    _firstWhereOrNull(menu.extras, (item) => item.id == id)?.name ?? '';

List<String> _sortedIds(Object? value) =>
    (value is List ? value.map((item) => '$item').toList() : <String>[])
      ..sort();

bool _sameIds(Object? left, List<String> right) =>
    _sortedIds(left).join(',') == (List<String>.from(right)..sort()).join(',');

String _lineHeading(MenuCatalog menu, CartLine line, String locale) {
  final flavor = menu.flavor(line.flavorId);
  return '${flavor.name} · ${menu.size(line.sizeId).label(locale)}';
}

String _lineDetail(MenuCatalog menu, CartLine line, String locale) {
  final crust = switch (line.crustId) {
    'thin' => _copy(locale, 'thin'),
    'stuffed' => _copy(locale, 'stuffed'),
    _ => _copy(locale, 'traditional'),
  };
  final removed = line.removedIngredientIds
      .map((id) => _ingredientName(menu, line.flavorId, id))
      .where((name) => name.isNotEmpty)
      .toList();
  final extras = line.extraToppingIds
      .map((id) => _extraName(menu, id))
      .where((name) => name.isNotEmpty)
      .toList();
  final details = <String>[crust];
  if (removed.isNotEmpty) {
    details.add('${_copy(locale, 'without')} ${removed.join(', ')}');
  }
  if (extras.isNotEmpty) {
    details.add('${_copy(locale, 'extrasLabel')}: ${extras.join(', ')}');
  }
  return details.join(' · ');
}

class BrowseScreen extends StatefulWidget {
  const BrowseScreen({super.key, required this.state});

  final OrderState state;

  @override
  State<BrowseScreen> createState() => _BrowseScreenState();
}

class _BrowseScreenState extends State<BrowseScreen> {
  String filter = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.state.loadMenu();
    });
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: widget.state,
        builder: (context, _) {
          final state = widget.state;
          final locale = state.locale;
          final menu = state.menu;
          return Scaffold(
            appBar: AppBar(
              title: const FittedBox(fit: BoxFit.scaleDown, child: _Brand()),
              actions: [
                TextButton(
                  onPressed: () => state.setLocale(
                    locale == 'pt-BR' ? 'en-US' : 'pt-BR',
                  ),
                  child: Text(locale == 'pt-BR' ? 'PT / EN' : 'EN / PT'),
                ),
                IconButton(
                  tooltip: _copy(locale, 'cart'),
                  onPressed: () => _openCart(context, state),
                  icon: Badge(
                    label: Text('${state.itemCount}'),
                    isLabelVisible: state.itemCount > 0,
                    child: const Icon(Icons.shopping_bag_outlined),
                  ),
                ),
                _AssistantButton(
                    state: state,
                    contextData: _assistantContext('menu', state)),
              ],
            ),
            body: state.menuLoading && menu == null
                ? const Center(child: CircularProgressIndicator(color: _orange))
                : menu == null
                    ? _LoadError(
                        message: _copy(locale, 'connection'),
                        retryLabel: _copy(locale, 'retry'),
                        retry: state.loadMenu,
                      )
                    : _browseBody(context, state, menu, locale),
            bottomNavigationBar: menu == null
                ? null
                : _BottomAction(
                    icon: Icons.shopping_bag_outlined,
                    label: _copy(locale, 'cart'),
                    value: state.cartQuote == null
                        ? _money(0, locale)
                        : _money(state.cartQuote!.total, locale),
                    onPressed: () => _openCart(context, state),
                  ),
          );
        },
      );

  Widget _browseBody(
    BuildContext context,
    OrderState state,
    MenuCatalog menu,
    String locale,
  ) {
    final search = filter.trim().toLowerCase();
    final visible = menu.flavors.where((flavor) {
      if (search.isEmpty) return true;
      return flavor.name.toLowerCase().contains(search) ||
          flavor.description.toLowerCase().contains(search) ||
          flavor.ingredients
              .any((item) => item.name.toLowerCase().contains(search));
    }).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 24),
      children: [
        Text(_copy(locale, 'brand'),
            style: const TextStyle(
                color: _orange, letterSpacing: 2, fontSize: 11)),
        const SizedBox(height: 12),
        Text(
          _copy(locale, 'hero'),
          style: const TextStyle(
              fontSize: 38, height: 1.08, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        Text(_copy(locale, 'intro'),
            style: const TextStyle(color: _muted, height: 1.5)),
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(
              builder: (_) => TrackingScreen(state: state),
            )),
            icon: const Icon(Icons.route_outlined),
            label: Text(_copy(locale, 'track')),
          ),
        ),
        if (state.publicDemo)
          Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                  locale == 'pt-BR'
                      ? 'Sem cadastro. O checkout usa dados fictícios. Não envie dados pessoais no chat; o provedor de IA pode manter registros por até 30 dias.'
                      : 'No registration. Checkout uses fictional data. Do not share personal details in chat; the AI provider may retain logs for up to 30 days.',
                  style: const TextStyle(color: _muted, fontSize: 11))),
        const SizedBox(height: 22),
        TextField(
          onChanged: (value) => setState(() => filter = value),
          decoration: InputDecoration(
            hintText: _copy(locale, 'search'),
            prefixIcon: const Icon(Icons.search),
          ),
        ),
        const SizedBox(height: 28),
        Row(
          children: [
            Expanded(
              child: Text(_copy(locale, 'popular'),
                  style: const TextStyle(
                      color: _orange, letterSpacing: 1.7, fontSize: 11)),
            ),
            Text('${visible.length.toString().padLeft(2, '0')} / 05',
                style: const TextStyle(color: _muted, fontSize: 11)),
          ],
        ),
        const SizedBox(height: 14),
        if (visible.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 36),
            child: Text(_copy(locale, 'menu'), textAlign: TextAlign.center),
          ),
        for (final flavor in visible)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: _FlavorCard(
              flavor: flavor,
              menu: menu,
              locale: locale,
              onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(
                builder: (_) => CustomizeScreen(
                  state: state,
                  flavor: flavor,
                ),
              )),
            ),
          ),
      ],
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 38,
            height: 38,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              border: Border.all(color: _orange),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Text('LS',
                style: TextStyle(
                    color: _orange, fontWeight: FontWeight.w800, fontSize: 13)),
          ),
          const SizedBox(width: 10),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('THE LAST SLICE',
                  style: TextStyle(fontSize: 12, letterSpacing: 1.2)),
              SizedBox(height: 2),
              Text('ARTISAN PIZZERIA',
                  style: TextStyle(
                      fontSize: 8, color: _muted, letterSpacing: 1.4)),
            ],
          ),
        ],
      );
}

class _FlavorCard extends StatelessWidget {
  const _FlavorCard({
    required this.flavor,
    required this.menu,
    required this.locale,
    required this.onTap,
  });

  final MenuFlavor flavor;
  final MenuCatalog menu;
  final String locale;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        color: _surface,
        clipBehavior: Clip.antiAlias,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _PizzaImage(flavorId: flavor.id, height: 190),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 14, 16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(flavor.name,
                              style: const TextStyle(
                                  fontSize: 19, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          Text(flavor.description,
                              style:
                                  const TextStyle(color: _muted, height: 1.4)),
                          const SizedBox(height: 12),
                          Text(
                            '${menu.size('media').label(locale).toUpperCase()}  ·  ${_money(flavor.prices['media'] ?? 0, locale)}',
                            style: const TextStyle(
                                color: _orange,
                                fontSize: 12,
                                letterSpacing: .6),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Icon(Icons.arrow_forward, color: _orange),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}

class _PizzaImage extends StatelessWidget {
  const _PizzaImage({required this.flavorId, required this.height});

  final String flavorId;
  final double height;

  static const _photos = <String, String>{
    'mussarela': 'photo-1579751626657-72bc17010498',
    'calabresa': 'photo-1571407970349-bc81e7e96d47',
    'portuguesa': 'photo-1604068549290-dea0e4a305ca',
    'frango_catupiry': 'photo-1579751626657-72bc17010498',
    'quatro_queijos': 'photo-1571407970349-bc81e7e96d47',
  };

  @override
  Widget build(BuildContext context) {
    final photo = _photos[flavorId] ?? _photos.values.first;
    return SizedBox(
      height: height,
      width: double.infinity,
      child: Image.asset(
        'assets/images/$photo.jpg',
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          color: _surfaceLight,
          alignment: Alignment.center,
          child: const Icon(Icons.local_pizza, size: 54, color: _orange),
        ),
      ),
    );
  }
}

class CustomizeScreen extends StatefulWidget {
  const CustomizeScreen({super.key, required this.state, required this.flavor});

  final OrderState state;
  final MenuFlavor flavor;

  @override
  State<CustomizeScreen> createState() => _CustomizeScreenState();
}

class _CustomizeScreenState extends State<CustomizeScreen> {
  String sizeId = 'media';
  String crustId = 'traditional';
  final Set<String> removed = {};
  final Set<String> selectedExtras = {};
  Timer? quoteTimer;
  PriceQuote? quote;
  bool quoteLoading = true;
  bool adding = false;
  int quoteRevision = 0;

  CartLine get _draft => CartLine(
        flavorId: widget.flavor.id,
        sizeId: sizeId,
        crustId: crustId,
        removedIngredientIds: removed.toList(),
        extraToppingIds: selectedExtras.toList(),
        quantity: 1,
      );

  @override
  void initState() {
    super.initState();
    _refreshQuote();
  }

  @override
  void dispose() {
    quoteTimer?.cancel();
    super.dispose();
  }

  void _changed(VoidCallback update) {
    quoteRevision++;
    setState(update);
    quoteTimer?.cancel();
    setState(() {
      quoteLoading = true;
      quote = null;
    });
    quoteTimer = Timer(const Duration(milliseconds: 250), _refreshQuote);
  }

  Future<void> _refreshQuote() async {
    final revision = quoteRevision;
    final result = await widget.state.quoteLines([_draft]);
    if (!mounted) return;
    if (revision != quoteRevision) return;
    setState(() {
      quote = result;
      quoteLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final locale = widget.state.locale;
    final menu = widget.state.menu!;
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: Text(_copy(locale, 'customize')),
        actions: [
          _AssistantButton(
              state: widget.state,
              contextData: _assistantContext('customization', widget.state,
                  selection: _draft.toJson())),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 4, 18, 20),
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: _PizzaImage(flavorId: widget.flavor.id, height: 220),
          ),
          const SizedBox(height: 18),
          Text(widget.flavor.name,
              style:
                  const TextStyle(fontSize: 27, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text(widget.flavor.description,
              style: const TextStyle(color: _muted, height: 1.45)),
          const SizedBox(height: 24),
          _SectionTitle(_copy(locale, 'size')),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: menu.sizes
                .map((size) => ChoiceChip(
                      label: Text(
                          '${size.label(locale)}\n${size.slices} ${locale == 'pt-BR' ? 'pedaços' : 'slices'}'),
                      selected: sizeId == size.id,
                      onSelected: (_) => _changed(() => sizeId = size.id),
                    ))
                .toList(),
          ),
          const SizedBox(height: 22),
          _SectionTitle(_copy(locale, 'crust')),
          const SizedBox(height: 10),
          RadioGroup<String>(
            groupValue: crustId,
            onChanged: (value) => _changed(() => crustId = value!),
            child: Column(
              children: [
                for (final crust in menu.crusts)
                  RadioListTile<String>(
                    value: crust.id,
                    contentPadding: EdgeInsets.zero,
                    activeColor: _orange,
                    title: Text(_copy(locale, crust.id)),
                    subtitle: Text(crust.id == 'stuffed'
                        ? '+ ${_money(crust.surcharge(sizeId), locale)}'
                        : _copy(locale, 'included')),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          _SectionTitle(_copy(locale, 'ingredients')),
          Text(_copy(locale, 'removeHint'),
              style: const TextStyle(color: _muted, fontSize: 12)),
          const SizedBox(height: 8),
          for (final ingredient in widget.flavor.ingredients)
            CheckboxListTile(
              value: !removed.contains(ingredient.id),
              onChanged: (checked) => _changed(() {
                if (checked == false) {
                  removed.add(ingredient.id);
                } else {
                  removed.remove(ingredient.id);
                }
              }),
              title: Text(ingredient.name),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              activeColor: _orange,
            ),
          const SizedBox(height: 14),
          _SectionTitle(_copy(locale, 'extras')),
          Text(_copy(locale, 'maxExtras'),
              style: const TextStyle(color: _muted, fontSize: 12)),
          const SizedBox(height: 8),
          for (final extra in menu.extras)
            CheckboxListTile(
              value: selectedExtras.contains(extra.id),
              onChanged: !selectedExtras.contains(extra.id) &&
                      selectedExtras.length >= 3
                  ? null
                  : (checked) => _changed(() {
                        if (checked == true) {
                          selectedExtras.add(extra.id);
                        } else {
                          selectedExtras.remove(extra.id);
                        }
                      }),
              title: Text(extra.name),
              subtitle: Text('+ ${_money(extra.price, locale)}'),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              activeColor: _orange,
            ),
        ],
      ),
      bottomNavigationBar: _BottomAction(
        icon: Icons.add,
        label: _copy(locale, 'add'),
        value: quote == null
            ? (quoteLoading
                ? _copy(locale, 'quote')
                : _copy(locale, 'quoteError'))
            : _money(quote!.total, locale),
        busy: adding || quoteLoading,
        onPressed: quote == null ? null : _add,
      ),
    );
  }

  Future<void> _add() async {
    setState(() => adding = true);
    final added = await widget.state.addLine(_draft);
    if (!mounted) return;
    setState(() => adding = false);
    if (!added) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_copy(widget.state.locale, 'cartError'))),
      );
      return;
    }
    Navigator.pop(context);
  }
}

class CartScreen extends StatefulWidget {
  const CartScreen({super.key, required this.state});

  final OrderState state;

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.state.refreshQuote();
    });
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: widget.state,
        builder: (context, _) {
          final state = widget.state;
          final menu = state.menu!;
          final locale = state.locale;
          final quote = state.cartQuote;
          return Scaffold(
            appBar: AppBar(
              title: Text(_copy(locale, 'cart')),
              actions: [
                _AssistantButton(
                    state: state, contextData: _assistantContext('cart', state))
              ],
            ),
            body: state.cart.isEmpty
                ? Center(child: Text(_copy(locale, 'emptyCart')))
                : ListView(
                    padding: const EdgeInsets.fromLTRB(18, 10, 18, 22),
                    children: [
                      for (final line in List<CartLine>.from(state.cart))
                        _CartLineCard(
                          state: state,
                          menu: menu,
                          line: line,
                        ),
                      const SizedBox(height: 16),
                      _SectionTitle(locale == 'pt-BR'
                          ? 'Como vai receber?'
                          : 'How will you receive it?'),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                              child: _FulfillmentChoice(
                            label: _copy(locale, 'pickup'),
                            selected: state.fulfillment == 'pickup',
                            onTap: () => state.setFulfillment('pickup'),
                          )),
                          const SizedBox(width: 10),
                          Expanded(
                              child: _FulfillmentChoice(
                            label: _copy(locale, 'delivery'),
                            selected: state.fulfillment == 'delivery',
                            onTap: () => state.setFulfillment('delivery'),
                          )),
                        ],
                      ),
                      const SizedBox(height: 22),
                      if (state.quoteError != null)
                        Text(_copy(locale, 'quoteError'),
                            style: const TextStyle(color: _orange)),
                      if (quote != null) ...[
                        _TotalRow(
                            label: _copy(locale, 'subtotal'),
                            value: _money(quote.subtotal, locale)),
                        _TotalRow(
                            label: _copy(locale, 'deliveryFee'),
                            value: _money(quote.deliveryFee, locale)),
                        const Divider(height: 28),
                        _TotalRow(
                            label: _copy(locale, 'total'),
                            value: _money(quote.total, locale),
                            strong: true),
                      ],
                    ],
                  ),
            bottomNavigationBar: state.cart.isEmpty
                ? null
                : _BottomAction(
                    icon: Icons.arrow_forward,
                    label: _copy(locale, 'checkout'),
                    value: quote == null
                        ? _copy(locale, 'quote')
                        : _money(quote.total, locale),
                    busy: state.quoteLoading,
                    onPressed: quote == null
                        ? null
                        : () =>
                            Navigator.of(context).push(MaterialPageRoute<void>(
                              builder: (_) => CheckoutScreen(state: state),
                            )),
                  ),
          );
        },
      );
}

class _CartLineCard extends StatelessWidget {
  const _CartLineCard(
      {required this.state, required this.menu, required this.line});

  final OrderState state;
  final MenuCatalog menu;
  final CartLine line;

  @override
  Widget build(BuildContext context) {
    final locale = state.locale;
    final quoteLine = _firstWhereOrNull(
        state.cartQuote?.lines ?? const [],
        (item) =>
            item['flavorId'] == line.flavorId &&
            item['sizeId'] == line.sizeId &&
            item['crustId'] == line.crustId &&
            _sameIds(item['removedIngredientIds'], line.removedIngredientIds) &&
            _sameIds(item['extraToppingIds'], line.extraToppingIds));
    final lineTotal = quoteLine?['lineTotal'] as int?;
    return Card(
      color: _surface,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_lineHeading(menu, line, locale),
                style:
                    const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
            const SizedBox(height: 5),
            Text(_lineDetail(menu, line, locale),
                style: const TextStyle(color: _muted, height: 1.45)),
            if (lineTotal != null) ...[
              const SizedBox(height: 8),
              Text(_money(lineTotal, locale),
                  style: const TextStyle(color: _orange)),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () =>
                      state.updateQuantity(line.key, line.quantity - 1),
                  icon: const Icon(Icons.remove_circle_outline),
                ),
                Text('${line.quantity}',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                IconButton(
                  visualDensity: VisualDensity.compact,
                  onPressed: () =>
                      state.updateQuantity(line.key, line.quantity + 1),
                  icon: const Icon(Icons.add_circle_outline, color: _orange),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () => state.updateQuantity(line.key, 0),
                  child: Text(locale == 'pt-BR' ? 'Remover' : 'Remove'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FulfillmentChoice extends StatelessWidget {
  const _FulfillmentChoice(
      {required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 17, horizontal: 12),
          decoration: BoxDecoration(
            color: selected ? _orange.withValues(alpha: .16) : _surface,
            border: Border.all(color: selected ? _orange : _surfaceLight),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                  selected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_off,
                  size: 18,
                  color: selected ? _orange : _muted),
              const SizedBox(width: 8),
              Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
            ],
          ),
        ),
      );
}

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, required this.state});

  final OrderState state;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController();
  final phone = TextEditingController();
  final street = TextEditingController();
  final number = TextEditingController();
  final neighborhood = TextEditingController();
  final city = TextEditingController();
  final region = TextEditingController();
  final complement = TextEditingController();
  final reference = TextEditingController();
  String? error;

  @override
  void initState() {
    super.initState();
    final fields = <String, TextEditingController>{
      'name': name,
      'phone': phone,
      'street': street,
      'number': number,
      'neighborhood': neighborhood,
      'city': city,
      'state': region,
      'complement': complement,
      'reference': reference,
    };
    for (final entry in fields.entries) {
      entry.value.text = widget.state.checkoutFields[entry.key] ?? '';
      entry.value.addListener(() {
        widget.state.saveCheckoutField(entry.key, entry.value.text);
      });
    }
  }

  @override
  void dispose() {
    for (final controller in [
      name,
      phone,
      street,
      number,
      neighborhood,
      city,
      region,
      complement,
      reference
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: widget.state,
        builder: (context, _) {
          final state = widget.state;
          final locale = state.locale;
          final menu = state.menu!;
          return Scaffold(
            appBar: AppBar(
              title: Text(_copy(locale, 'checkout')),
              actions: [
                _AssistantButton(
                    state: state,
                    contextData: _assistantContext('checkout', state))
              ],
            ),
            body: Form(
              key: formKey,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 8, 18, 24),
                children: [
                  _DemoNotice(locale: locale),
                  const SizedBox(height: 22),
                  if (state.publicDemo)
                    Card(
                        child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                      locale == 'pt-BR'
                                          ? 'Dados fictícios da demonstração'
                                          : 'Fictional demo details',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 18)),
                                  const SizedBox(height: 10),
                                  for (final key in [
                                    'name',
                                    'phone',
                                    'address'
                                  ])
                                    Padding(
                                        padding: const EdgeInsets.symmetric(
                                            vertical: 4),
                                        child: Text(
                                            '${(state.checkoutFixture[key] as Map?)?[locale] ?? (locale == 'pt-BR' ? 'Demonstração fictícia' : 'Fictional demo')}')),
                                  const SizedBox(height: 10),
                                  Text(locale == 'pt-BR'
                                      ? 'Não informe nome, telefone ou endereço reais. Este pedido aparece no quadro público compartilhado da cozinha.'
                                      : 'Do not provide a real name, phone number or address. This order appears on the shared public kitchen board.'),
                                ])))
                  else ...[
                    _SectionTitle(_copy(locale, 'name')),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: name,
                      textCapitalization: TextCapitalization.words,
                      maxLength: 80,
                      decoration:
                          InputDecoration(labelText: _copy(locale, 'name')),
                      validator: (value) => (value?.trim().length ?? 0) >= 2
                          ? null
                          : _copy(locale, 'validationName'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: phone,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                          labelText: _copy(locale, 'phone'),
                          hintText: '(11) 99999-9999'),
                      validator: (value) {
                        final digits =
                            (value ?? '').replaceAll(RegExp(r'\D'), '');
                        return digits.length == 10 || digits.length == 11
                            ? null
                            : _copy(locale, 'validationPhone');
                      },
                    ),
                    if (state.fulfillment == 'delivery') ...[
                      const SizedBox(height: 24),
                      _SectionTitle(_copy(locale, 'delivery')),
                      const SizedBox(height: 10),
                      _requiredField(street, 'street', locale),
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(
                            child: _requiredField(number, 'number', locale)),
                        const SizedBox(width: 12),
                        Expanded(
                            child: _requiredField(
                                neighborhood, 'neighborhood', locale)),
                      ]),
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(child: _requiredField(city, 'city', locale)),
                        const SizedBox(width: 12),
                        Expanded(
                            child: _requiredField(region, 'state', locale,
                                maxLength: 2)),
                      ]),
                      const SizedBox(height: 12),
                      TextFormField(
                          controller: complement,
                          decoration: InputDecoration(
                              labelText: _copy(locale, 'complement'))),
                      const SizedBox(height: 12),
                      TextFormField(
                          controller: reference,
                          decoration: InputDecoration(
                              labelText: _copy(locale, 'reference'))),
                    ],
                  ],
                  const SizedBox(height: 24),
                  _SectionTitle(_copy(locale, 'orderDetails')),
                  const SizedBox(height: 10),
                  for (final line in state.cart)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 7),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                              '${line.quantity} × ${_lineHeading(menu, line, locale)}'),
                          const SizedBox(height: 3),
                          Text(_lineDetail(menu, line, locale),
                              style:
                                  const TextStyle(color: _muted, fontSize: 12)),
                        ],
                      ),
                    ),
                  if (state.cartQuote case final quote?) ...[
                    const Divider(height: 24),
                    _TotalRow(
                        label: _copy(locale, 'subtotal'),
                        value: _money(quote.subtotal, locale)),
                    _TotalRow(
                        label: _copy(locale, 'deliveryFee'),
                        value: _money(quote.deliveryFee, locale)),
                    _TotalRow(
                        label: _copy(locale, 'total'),
                        value: _money(quote.total, locale),
                        strong: true),
                  ],
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(error!, style: const TextStyle(color: _orange)),
                  ],
                ],
              ),
            ),
            bottomNavigationBar: _BottomAction(
              icon: Icons.arrow_forward,
              label: state.submitting
                  ? _copy(locale, 'sending')
                  : _copy(locale, 'place'),
              value: state.cartQuote == null
                  ? _copy(locale, 'quote')
                  : _money(state.cartQuote!.total, locale),
              busy: state.submitting || state.quoteLoading,
              onPressed:
                  state.cartQuote == null || state.submitting ? null : _submit,
            ),
          );
        },
      );

  Widget _requiredField(
          TextEditingController controller, String key, String locale,
          {int? maxLength}) =>
      TextFormField(
        controller: controller,
        textCapitalization: key == 'state'
            ? TextCapitalization.characters
            : TextCapitalization.words,
        maxLength: maxLength,
        decoration:
            InputDecoration(labelText: _copy(locale, key), counterText: ''),
        validator: (value) {
          if ((value ?? '').trim().isEmpty)
            return _copy(locale, 'validationAddress');
          if (key == 'state' &&
              !RegExp(r'^[A-Za-z]{2}$').hasMatch(value!.trim())) {
            return _copy(locale, 'validationState');
          }
          return null;
        },
      );

  Future<void> _submit() async {
    if (!formKey.currentState!.validate()) return;
    setState(() => error = null);
    try {
      final order = await widget.state.submitOrder(
        name: name.text.trim(),
        phone: phone.text,
        address: {
          'street': street.text.trim(),
          'number': number.text.trim(),
          'neighborhood': neighborhood.text.trim(),
          'city': city.text.trim(),
          'state': region.text.trim().toUpperCase(),
          'complement': complement.text.trim(),
          'reference': reference.text.trim(),
        },
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(
        builder: (_) => ConfirmationScreen(state: widget.state, order: order),
      ));
    } catch (_) {
      if (mounted)
        setState(() => error = _copy(widget.state.locale, 'networkError'));
    }
  }
}

class ConfirmationScreen extends StatefulWidget {
  const ConfirmationScreen(
      {super.key, required this.state, required this.order});

  final OrderState state;
  final Json order;

  @override
  State<ConfirmationScreen> createState() => _ConfirmationScreenState();
}

class _ConfirmationScreenState extends State<ConfirmationScreen>
    with WidgetsBindingObserver, RouteAware {
  late String status;
  late String updatedAt;
  DateTime? lastChecked;
  String? refreshError;
  Timer? polling;
  PageRoute<dynamic>? route;
  bool routeVisible = true;
  bool inFlight = false;

  @override
  void initState() {
    super.initState();
    status = widget.order['status'] as String;
    updatedAt =
        (widget.order['updatedAt'] ?? widget.order['createdAt']) as String;
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _refresh(automatic: true));
    _startPolling();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final currentRoute = ModalRoute.of(context);
    if (currentRoute is PageRoute<dynamic> && currentRoute != route) {
      if (route != null) _routeObserver.unsubscribe(this);
      route = currentRoute;
      _routeObserver.subscribe(this, currentRoute);
    }
  }

  @override
  void didPushNext() {
    routeVisible = false;
    _stopPolling();
  }

  @override
  void didPopNext() {
    routeVisible = true;
    _refresh(automatic: true);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState lifecycle) {
    if (lifecycle == AppLifecycleState.resumed) {
      if (routeVisible) _refresh(automatic: true);
    } else {
      _stopPolling();
    }
  }

  void _stopPolling() {
    polling?.cancel();
    polling = null;
  }

  bool get _foreground {
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    return routeVisible &&
        (lifecycle == null || lifecycle == AppLifecycleState.resumed);
  }

  bool get _terminal => status == 'completed' || status == 'cancelled';

  void _startPolling() {
    _stopPolling();
    if (!_foreground || _terminal) return;
    polling =
        Timer(const Duration(seconds: 15), () => _refresh(automatic: true));
  }

  Future<void> _refresh({bool automatic = false}) async {
    if (!_foreground || inFlight || (automatic && _terminal)) return;
    _stopPolling();
    setState(() => inFlight = true);
    try {
      final result =
          await widget.state.track(widget.order['orderCode'] as String);
      if (!mounted) return;
      setState(() {
        status = result['status'] as String;
        updatedAt = (result['updatedAt'] ?? result['createdAt']) as String;
        lastChecked = DateTime.now();
        refreshError = null;
      });
    } catch (_) {
      if (mounted) {
        setState(() =>
            refreshError = _copy(widget.state.locale, 'trackingConnection'));
      }
    } finally {
      if (mounted) {
        setState(() => inFlight = false);
        _startPolling();
      }
    }
  }

  @override
  void dispose() {
    _stopPolling();
    WidgetsBinding.instance.removeObserver(this);
    _routeObserver.unsubscribe(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final order = widget.order;
    final locale = state.locale;
    final menu = state.menu!;
    final lines = (order['lines'] as List)
        .map((item) => _cartLineFromJson(item as Map))
        .toList();
    return Scaffold(
      appBar: AppBar(title: const _Brand()),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(22, 22, 22, 24),
        children: [
          const Icon(Icons.check_circle, color: _orange, size: 52),
          const SizedBox(height: 16),
          Text(_copy(locale, 'received'),
              style:
                  const TextStyle(fontSize: 27, fontWeight: FontWeight.w700)),
          const SizedBox(height: 18),
          _DemoNotice(locale: locale),
          const SizedBox(height: 18),
          _ResultCard(
            state: state,
            orderCode: order['orderCode'] as String,
            status: status,
            lines: lines,
            total: order['total'] as int,
            menu: menu,
            updatedAt: updatedAt,
            fulfillment: order['fulfillment'] as String?,
            tracking: true,
            lastChecked: lastChecked,
            refreshError: refreshError,
            refreshing: inFlight,
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => _refresh(),
            icon: inFlight
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh),
            label: Text(_copy(locale, inFlight ? 'refreshing' : 'refresh')),
          ),
          const SizedBox(height: 18),
          ElevatedButton.icon(
            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(
              builder: (_) => TrackingScreen(
                  state: state, initialCode: order['orderCode'] as String),
            )),
            icon: const Icon(Icons.route_outlined),
            label: Text(_copy(locale, 'track')),
          ),
          TextButton(
            onPressed: () =>
                Navigator.of(context).popUntil((route) => route.isFirst),
            child: Text(_copy(locale, 'continueShopping')),
          ),
        ],
      ),
    );
  }
}

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key, required this.state, this.initialCode = ''});

  final OrderState state;
  final String initialCode;

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen>
    with WidgetsBindingObserver, RouteAware {
  late final TextEditingController code;
  Json? order;
  bool loading = false;
  bool _inFlight = false;
  int _lookupRevision = 0;
  String? error;
  DateTime? lastChecked;
  Timer? _polling;
  PageRoute<dynamic>? _route;
  bool _routeVisible = true;

  @override
  void initState() {
    super.initState();
    code = TextEditingController(text: widget.initialCode);
    WidgetsBinding.instance.addObserver(this);
    if (widget.initialCode.trim().isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _lookup());
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route is PageRoute<dynamic> && route != _route) {
      if (_route != null) _routeObserver.unsubscribe(this);
      _route = route;
      _routeObserver.subscribe(this, route);
    }
  }

  @override
  void didPushNext() {
    _routeVisible = false;
    _stopPolling();
  }

  @override
  void didPopNext() {
    _routeVisible = true;
    if (order != null) _lookup();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_routeVisible && order != null) _lookup();
    } else {
      _stopPolling();
    }
  }

  void _stopPolling() {
    _polling?.cancel();
    _polling = null;
  }

  bool get _foreground {
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    return _routeVisible &&
        (lifecycle == null || lifecycle == AppLifecycleState.resumed);
  }

  void _startPolling() {
    _stopPolling();
    if (!_foreground ||
        order == null ||
        order!['status'] == 'completed' ||
        order!['status'] == 'cancelled') return;
    _polling = Timer(const Duration(seconds: 15), () => _lookup());
  }

  @override
  void dispose() {
    _stopPolling();
    WidgetsBinding.instance.removeObserver(this);
    _routeObserver.unsubscribe(this);
    code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final locale = state.locale;
    final menu = state.menu!;
    return Scaffold(
      appBar: AppBar(title: Text(_copy(locale, 'track'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 24),
        children: [
          Text(_copy(locale, 'trackHelp'),
              style: const TextStyle(color: _muted)),
          const SizedBox(height: 14),
          TextField(
            controller: code,
            textCapitalization: TextCapitalization.characters,
            onChanged: (value) {
              _lookupRevision++;
              if (order != null &&
                  value.trim().toUpperCase() != order!['orderCode']) {
                _stopPolling();
                setState(() {
                  order = null;
                  lastChecked = null;
                  error = null;
                });
              } else if (error != null) {
                setState(() => error = null);
              }
            },
            decoration: InputDecoration(labelText: _copy(locale, 'orderCode')),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: () => _lookup(),
            icon: const Icon(Icons.search),
            label: Text(_copy(locale, 'find')),
          ),
          if (error != null && order == null) ...[
            const SizedBox(height: 12),
            Text(error!, style: const TextStyle(color: _orange)),
          ],
          if (order != null) ...[
            const SizedBox(height: 20),
            OutlinedButton.icon(
              onPressed: () => _lookup(),
              icon: loading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.refresh),
              label: Text(_copy(locale, loading ? 'refreshing' : 'refresh')),
            ),
            if (lastChecked != null)
              Semantics(
                liveRegion: true,
                child: Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    '${_copy(locale, 'lastChecked')}: ${_formatTrackingTime(lastChecked!.toIso8601String(), locale)}${loading ? ' · ${_copy(locale, 'refreshing')}' : ''}',
                    style: const TextStyle(color: _muted, fontSize: 12),
                  ),
                ),
              ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Semantics(
                    liveRegion: true,
                    child:
                        Text(error!, style: const TextStyle(color: _orange))),
              ),
            const SizedBox(height: 12),
            _ResultCard(
              state: state,
              orderCode: order!['orderCode'] as String,
              status: order!['status'] as String,
              lines: (order!['lines'] as List)
                  .map((item) => _cartLineFromJson(item as Map))
                  .toList(),
              total: order!['total'] as int,
              menu: menu,
              updatedAt: order!['updatedAt'] as String?,
              fulfillment: order!['fulfillment'] as String?,
              tracking: true,
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _lookup() async {
    if (!_foreground || _inFlight || code.text.trim().isEmpty) return;
    _stopPolling();
    _inFlight = true;
    final revision = ++_lookupRevision;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final result = await widget.state.track(code.text);
      if (mounted && revision == _lookupRevision) {
        setState(() {
          order = result;
          lastChecked = DateTime.now();
          error = null;
        });
      }
    } catch (exception) {
      if (mounted && revision == _lookupRevision) {
        setState(() {
          if (order == null &&
              exception is ApiException &&
              exception.statusCode == 404) {
            error = _copy(widget.state.locale, 'notFound');
          } else {
            error = _copy(widget.state.locale,
                order == null ? 'lookupConnection' : 'trackingConnection');
          }
        });
      }
    } finally {
      _inFlight = false;
      if (mounted) {
        setState(() => loading = false);
        _startPolling();
      }
    }
  }
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({
    required this.state,
    required this.orderCode,
    required this.status,
    required this.lines,
    required this.total,
    required this.menu,
    this.updatedAt,
    this.fulfillment,
    this.tracking = false,
    this.lastChecked,
    this.refreshError,
    this.refreshing = false,
  });

  final OrderState state;
  final String orderCode;
  final String status;
  final List<CartLine> lines;
  final int total;
  final MenuCatalog menu;
  final String? updatedAt;
  final String? fulfillment;
  final bool tracking;
  final DateTime? lastChecked;
  final String? refreshError;
  final bool refreshing;

  @override
  Widget build(BuildContext context) {
    final locale = state.locale;
    return Card(
      color: _surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_copy(locale, 'orderCode'),
                style: const TextStyle(color: _muted)),
            const SizedBox(height: 5),
            SelectableText(orderCode,
                style: const TextStyle(
                    color: _orange, fontSize: 21, fontWeight: FontWeight.w800)),
            const SizedBox(height: 18),
            Text(_copy(locale, 'status'),
                style: const TextStyle(color: _muted)),
            const SizedBox(height: 5),
            Semantics(
              liveRegion: tracking,
              child: Text(_statusLabel(locale, status),
                  style: const TextStyle(
                      fontSize: 19, fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 5),
            Text(_statusExplanation(locale, status),
                style: const TextStyle(color: _muted, height: 1.4)),
            if (tracking) ...[
              if (lastChecked != null) ...[
                const SizedBox(height: 8),
                Semantics(
                  liveRegion: true,
                  child: Text(
                    '${_copy(locale, 'lastChecked')}: ${_formatTrackingTime(lastChecked!.toIso8601String(), locale)}${refreshing ? ' · ${_copy(locale, 'refreshing')}' : ''}',
                    style: const TextStyle(color: _muted, fontSize: 11),
                  ),
                ),
              ],
              if (refreshError != null) ...[
                const SizedBox(height: 8),
                Semantics(
                  liveRegion: true,
                  child: Text(refreshError!,
                      style: const TextStyle(color: _orange, fontSize: 11)),
                ),
              ],
              const SizedBox(height: 14),
              _StatusTimeline(
                locale: locale,
                status: status,
                fulfillment: fulfillment ?? 'pickup',
              ),
              if (updatedAt != null) ...[
                const SizedBox(height: 10),
                Text(
                  '${_copy(locale, 'statusUpdated')}: ${_formatTrackingTime(updatedAt!, locale)}',
                  style: const TextStyle(color: _muted, fontSize: 11),
                ),
              ],
            ],
            const Divider(height: 28),
            for (final line in lines)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                        '${line.quantity} × ${_lineHeading(menu, line, locale)}'),
                    const SizedBox(height: 3),
                    Text(_lineDetail(menu, line, locale),
                        style: const TextStyle(color: _muted, fontSize: 12)),
                  ],
                ),
              ),
            const Divider(height: 18),
            _TotalRow(
                label: _copy(locale, 'total'),
                value: _money(total, locale),
                strong: true),
            const SizedBox(height: 16),
            _DemoNotice(locale: locale),
          ],
        ),
      ),
    );
  }
}

String _formatTrackingTime(String value, String locale) {
  final date = DateTime.tryParse(value)?.toLocal();
  if (date == null) return value;
  const ptMonths = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez'
  ];
  const enMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ];
  final dateText = locale == 'pt-BR'
      ? '${date.day} de ${ptMonths[date.month - 1]} de ${date.year}'
      : '${enMonths[date.month - 1]} ${date.day}, ${date.year}';
  if (locale == 'pt-BR') {
    final time =
        '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    return '$dateText às $time';
  }
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  final time =
      '$hour:${date.minute.toString().padLeft(2, '0')} ${date.hour < 12 ? 'AM' : 'PM'}';
  return '$dateText at $time';
}

class _StatusTimeline extends StatelessWidget {
  const _StatusTimeline({
    required this.locale,
    required this.status,
    required this.fulfillment,
  });

  final String locale;
  final String status;
  final String fulfillment;

  @override
  Widget build(BuildContext context) {
    final isPortuguese = locale == 'pt-BR';
    if (status == 'cancelled') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: _orange.withValues(alpha: .45)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          '${_statusLabel(locale, status)} · ${isPortuguese ? 'status terminal demonstrativo' : 'terminal demo status'}',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      );
    }
    const common = ['received', 'confirmed', 'preparing'];
    final path = [
      ...common,
      fulfillment == 'delivery' ? 'out_for_delivery' : 'ready_for_pickup',
      'completed',
    ];
    final current = path.indexOf(status);
    if (current < 0) {
      return Text(_copy(locale, 'unknownStatus'),
          style: const TextStyle(color: _orange));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(_copy(locale, 'timeline'),
            style: const TextStyle(color: _muted, fontSize: 12)),
        const SizedBox(height: 10),
        for (var index = 0; index < path.length; index++)
          Semantics(
            container: true,
            excludeSemantics: true,
            label:
                '${_statusLabel(locale, path[index])}, ${_copy(locale, index < current ? 'preceding' : index == current ? 'status' : 'upcoming')}',
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                children: [
                  Icon(
                    index < current
                        ? Icons.check_circle
                        : index == current
                            ? Icons.radio_button_checked
                            : Icons.radio_button_unchecked,
                    size: 17,
                    color: index <= current ? _orange : _muted,
                  ),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      '${_statusLabel(locale, path[index])} · ${_copy(locale, index < current ? 'preceding' : index == current ? 'status' : 'upcoming')}',
                      style: TextStyle(
                        color: index == current ? _text : _muted,
                        fontWeight: index == current
                            ? FontWeight.w700
                            : FontWeight.w400,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

class _DemoNotice extends StatelessWidget {
  const _DemoNotice({required this.locale});

  final String locale;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: _orange.withValues(alpha: .12),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _orange.withValues(alpha: .4)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.info_outline, color: _orange, size: 18),
            const SizedBox(width: 9),
            Expanded(
                child: Text(_copy(locale, 'demo'),
                    style: const TextStyle(fontSize: 11, letterSpacing: .5))),
          ],
        ),
      );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) => Text(title,
      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700));
}

class _TotalRow extends StatelessWidget {
  const _TotalRow(
      {required this.label, required this.value, this.strong = false});

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          children: [
            Expanded(
                child: Text(label,
                    style: TextStyle(
                        color: strong ? _text : _muted,
                        fontWeight:
                            strong ? FontWeight.w700 : FontWeight.normal))),
            Text(value,
                style: TextStyle(
                    color: strong ? _orange : _text,
                    fontWeight: FontWeight.w700)),
          ],
        ),
      );
}

class _BottomAction extends StatelessWidget {
  const _BottomAction({
    required this.icon,
    required this.label,
    required this.value,
    required this.onPressed,
    this.busy = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          decoration: const BoxDecoration(
            color: _surface,
            border: Border(top: BorderSide(color: _surfaceLight)),
          ),
          child: ElevatedButton(
            onPressed: busy ? null : onPressed,
            child: Row(
              children: [
                Icon(icon, size: 18),
                const SizedBox(width: 9),
                Expanded(
                    child: Text(label,
                        maxLines: 1, overflow: TextOverflow.ellipsis)),
                const SizedBox(width: 8),
                Flexible(
                    child: Text(value,
                        softWrap: true,
                        style: const TextStyle(fontWeight: FontWeight.w800))),
              ],
            ),
          ),
        ),
      );
}

Json _assistantContext(String screen, OrderState state, {Json? selection}) => {
      'screen': screen,
      'cartSnapshot': state.cartSnapshot,
      'fulfillment': state.fulfillment,
      'cartLines': state.cart.map((line) => line.toJson()).toList(),
      if (selection != null) 'selection': selection,
    };

class _AssistantButton extends StatelessWidget {
  const _AssistantButton({required this.state, required this.contextData});
  final OrderState state;
  final Json contextData;

  @override
  Widget build(BuildContext context) => IconButton(
        tooltip: _copy(state.locale, 'assistantOpen'),
        icon: const Icon(Icons.chat_bubble_outline),
        onPressed: () => showBottomSheet(
          context: context,
          backgroundColor: _surface,
          builder: (_) => SizedBox(
              height: MediaQuery.sizeOf(context).height * .60,
              child: _AssistantSheet(state: state, contextData: contextData)),
        ),
      );
}

String _assistantDuration(int seconds) => seconds < 60
    ? '${((seconds + 4) ~/ 5) * 5} s'
    : '${(seconds + 59) ~/ 60} min';
String _assistantErrorText(OrderState state, String locale) {
  final pt = locale == 'pt-BR';
  switch (state.assistantError) {
    case 'proposal_stale':
    case 'proposal_expired':
    case 'proposal_invalid':
      return pt
          ? 'A sacola ou o cardápio mudou, ou a proposta expirou. Peça uma nova proposta.'
          : 'The cart or menu changed, or the proposal expired. Ask for a new proposal.';
    case 'assistant_queue_full':
      return pt
          ? 'A fila está cheia. Tente novamente em instantes.'
          : 'The queue is full. Try again shortly.';
    case 'assistant_budget_exhausted':
      return '${pt ? 'Limite diário da IA atingido. Disponível novamente em' : 'Daily AI limit reached. Available again at'} ${state.assistantResetsAt == null ? 'UTC' : _formatTrackingTime(state.assistantResetsAt!, locale)}';
    case 'assistant_request_expired':
      return pt
          ? 'Sua espera expirou. Envie novamente quando quiser.'
          : 'Your wait expired. Send again whenever you like.';
    case 'assistant_already_pending':
      return pt
          ? 'Sua conversa já tem uma mensagem aguardando.'
          : 'Your conversation already has a message waiting.';
    case 'assistant_input_too_large':
      return pt ? 'Tente uma pergunta mais curta.' : 'Try a shorter question.';
    default:
      return _copy(locale, 'assistantError');
  }
}

class _AssistantSheet extends StatefulWidget {
  const _AssistantSheet({required this.state, required this.contextData});
  final OrderState state;
  final Json contextData;

  @override
  State<_AssistantSheet> createState() => _AssistantSheetState();
}

class _AssistantSheetState extends State<_AssistantSheet>
    with WidgetsBindingObserver, RouteAware {
  PageRoute<dynamic>? assistantRoute;
  final controller = TextEditingController();
  final scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.state.assistantContextChanged(widget.contextData);
    widget.state.assistantSetVisible(true);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    widget.state.assistantSetForeground(state == AppLifecycleState.resumed);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final current = ModalRoute.of(context);
    if (current is PageRoute<dynamic> && current != assistantRoute) {
      _routeObserver.unsubscribe(this);
      assistantRoute = current;
      _routeObserver.subscribe(this, current);
    }
  }

  @override
  void didPushNext() => widget.state.assistantSetForeground(false);
  @override
  void didPopNext() => widget.state.assistantSetForeground(true);

  @override
  void dispose() {
    _routeObserver.unsubscribe(this);
    WidgetsBinding.instance.removeObserver(this);
    widget.state.assistantSetVisible(false);
    controller.dispose();
    scrollController.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = controller.text.trim();
    if (text.isEmpty || widget.state.assistantLoading) return;
    final sent =
        await widget.state.sendAssistantMessage(text, widget.contextData);
    if (sent && mounted) controller.clear();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (scrollController.hasClients) {
        scrollController.animateTo(scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 180), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: widget.state,
        builder: (context, _) {
          final state = widget.state, locale = state.locale;
          if (!state.assistantLoading &&
              controller.text.isEmpty &&
              state.assistantDraft.isNotEmpty) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && controller.text.isEmpty)
                controller.text = state.assistantDraft;
            });
          }
          return Column(children: [
            Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
                child: Row(children: [
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text(_copy(locale, 'assistantTitle'),
                            style: const TextStyle(
                                fontWeight: FontWeight.w700, fontSize: 16)),
                        Text(
                            locale == 'pt-BR'
                                ? 'Não envie dados pessoais.'
                                : 'Do not share personal details.',
                            style:
                                const TextStyle(color: _muted, fontSize: 11)),
                      ])),
                  IconButton(
                      tooltip: _copy(locale, 'assistantNew'),
                      onPressed: state.clearAssistantConversation,
                      icon: const Icon(Icons.refresh)),
                  IconButton(
                      tooltip: locale == 'pt-BR' ? 'Fechar' : 'Close',
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close)),
                ])),
            const Divider(height: 1, color: _surfaceLight),
            Expanded(
                child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(12),
                    children: [
                  if (state.assistantMessages.isEmpty)
                    Text(_copy(locale, 'assistantEmpty'),
                        style: const TextStyle(color: _muted)),
                  for (final message in state.assistantMessages)
                    _assistantBubble('${message['content'] ?? ''}',
                        message['role'] == 'user'),
                  if (state.assistantProposal != null)
                    _proposalCard(state, locale),
                  if (state.assistantLoading)
                    Semantics(
                        liveRegion: true,
                        child: Text(_copy(
                            locale,
                            state.assistantTicket?['state'] == 'queued'
                                ? 'assistantQueued'
                                : 'assistantBusy'))),
                  if (state.assistantTicket case final ticket?) ...[
                    Text(
                        '${_copy(locale, 'assistantPosition')}: ${ticket['position'] ?? '—'} · ${_copy(locale, 'assistantEstimate')}: ${_assistantDuration((ticket['estimatedReplySeconds'] as num? ?? 8).toInt())}',
                        style: const TextStyle(fontSize: 11)),
                    Text(
                        ticket['recentAverageReplySeconds'] != null
                            ? '${_copy(locale, 'assistantAverage')}: ${_assistantDuration((ticket['recentAverageReplySeconds'] as num).toInt())}'
                            : _copy(locale, 'assistantNoAverage'),
                        style: const TextStyle(fontSize: 11)),
                    if (ticket['state'] == 'queued')
                      Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton(
                              onPressed: () => state.cancelAssistant(),
                              child: Text(_copy(locale, 'assistantCancel')))),
                  ],
                  if (state.assistantMode == 'development_fake')
                    Text(_copy(locale, 'assistantFake'),
                        style: const TextStyle(color: _orange, fontSize: 11)),
                  if (state.assistantStale)
                    Text(_copy(locale, 'assistantStale'),
                        style: const TextStyle(fontSize: 11)),
                  if (state.assistantError != null)
                    Semantics(
                        liveRegion: true,
                        child: Text(_assistantErrorText(state, locale),
                            style: const TextStyle(
                                color: Color(0xFFFF9C80), fontSize: 11))),
                ])),
            Padding(
                padding: const EdgeInsets.fromLTRB(12, 5, 12, 10),
                child: Column(children: [
                  Text(_copy(locale, 'assistantDisclaimer'),
                      style: const TextStyle(color: _muted, fontSize: 10)),
                  const SizedBox(height: 6),
                  Row(children: [
                    Expanded(
                        child: TextField(
                            controller: controller,
                            readOnly: state.assistantLoading,
                            maxLength: 1200,
                            minLines: 1,
                            maxLines: 2,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => _send(),
                            decoration: InputDecoration(
                                labelText: _copy(locale, 'assistantHint'),
                                counterText: ''))),
                    const SizedBox(width: 6),
                    IconButton.filled(
                        tooltip: _copy(locale, 'assistantSend'),
                        onPressed: _send,
                        icon: Icon(state.assistantLoading
                            ? Icons.hourglass_empty
                            : Icons.send)),
                  ]),
                ])),
          ]);
        },
      );

  Widget _proposalCard(OrderState state, String locale) {
    final p = state.assistantProposal!, pt = locale == 'pt-BR';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          border: Border.all(color: _orange),
          borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Semantics(
            liveRegion: true,
            child: Text(state.assistantApplied
                ? (pt ? 'Sacola atualizada' : 'Cart updated')
                : (pt
                    ? 'Proposta — a sacola ainda não mudou'
                    : 'Proposal — your cart has not changed yet'))),
        if (!state.assistantApplied) ...[
          Text(
              '${p['operation'] == 'remove' ? (pt ? 'Remover' : 'Remove') : (pt ? 'Proposta' : 'Proposed')}: ${p['summary']}'),
          if (p['beforeSummary'] != null && p['operation'] == 'update')
            Text('${pt ? 'Antes' : 'Before'}: ${p['beforeSummary']}'),
          Text(
              '${p['fulfillment'] == 'pickup' ? (pt ? 'Retirada' : 'Pickup') : (pt ? 'Entrega' : 'Delivery')} · ${pt ? 'Total da sacola' : 'Cart total'}: ${_money((p['quote']['total'] as num).toInt(), locale)}'),
          if (state.proposalStale)
            Text(pt
                ? 'A sacola mudou ou a proposta expirou. Peça uma nova proposta.'
                : 'The cart changed or the proposal expired. Ask for a new proposal.'),
          Wrap(spacing: 8, children: [
            FilledButton(
                onPressed: state.assistantApplying || state.proposalStale
                    ? null
                    : () => state.applyAssistantProposal(),
                child: Text(pt ? 'Aplicar à sacola' : 'Apply to cart')),
            TextButton(
                onPressed: state.assistantApplying
                    ? null
                    : () {
                        state.dismissAssistantProposal(keepDraft: true);
                      },
                child: Text(pt ? 'Ajustar' : 'Adjust')),
            TextButton(
                onPressed: state.assistantApplying
                    ? null
                    : state.dismissAssistantProposal,
                child: Text(pt ? 'Descartar' : 'Dismiss')),
          ]),
        ],
        if (state.assistantApplied)
          TextButton(
              onPressed: () {
                final navigator = Navigator.of(context);
                navigator.pop();
                navigator.push(MaterialPageRoute(
                    builder: (_) => CartScreen(state: state)));
              },
              child: Text(
                  pt ? 'Revisar pedido demonstrativo' : 'Review demo order')),
      ]),
    );
  }

  Widget _assistantBubble(String text, bool user) => Align(
        alignment: user ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 340),
          margin: const EdgeInsets.only(bottom: 9),
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
          decoration: BoxDecoration(
              color: user ? const Color(0xFF623B25) : _surfaceLight,
              borderRadius: BorderRadius.circular(14)),
          child: Semantics(
              liveRegion: !user,
              child: Text(text,
                  style: const TextStyle(fontSize: 12, height: 1.45))),
        ),
      );
}

class _LoadError extends StatelessWidget {
  const _LoadError({
    required this.message,
    required this.retryLabel,
    required this.retry,
  });

  final String message;
  final String retryLabel;
  final VoidCallback retry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off, color: _orange, size: 34),
              const SizedBox(height: 14),
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 14),
              OutlinedButton(onPressed: retry, child: Text(retryLabel)),
            ],
          ),
        ),
      );
}

void _openCart(BuildContext context, OrderState state) {
  Navigator.of(context).push(MaterialPageRoute<void>(
    builder: (_) => CartScreen(state: state),
  ));
}

CartLine _cartLineFromJson(Map json) => CartLine(
      flavorId: json['flavorId'] as String,
      sizeId: json['sizeId'] as String,
      crustId: json['crustId'] as String,
      removedIngredientIds:
          List<String>.from(json['removedIngredientIds'] as List),
      extraToppingIds: List<String>.from(json['extraToppingIds'] as List),
      quantity: json['quantity'] as int,
    );
