typedef Json = Map<String, dynamic>;

class MenuIngredient {
  const MenuIngredient({required this.id, required this.name});

  final String id;
  final String name;

  factory MenuIngredient.fromJson(Json json) => MenuIngredient(
        id: json['id'] as String,
        name: json['name'] as String,
      );
}

class MenuFlavor {
  const MenuFlavor({
    required this.id,
    required this.name,
    required this.description,
    required this.ingredients,
    required this.prices,
  });

  final String id;
  final String name;
  final String description;
  final List<MenuIngredient> ingredients;
  final Map<String, int> prices;

  factory MenuFlavor.fromJson(Json json) => MenuFlavor(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String,
        ingredients: (json['ingredients'] as List)
            .map((item) => MenuIngredient.fromJson(item as Json))
            .toList(),
        prices: (json['prices'] as Json).map(
          (key, value) => MapEntry(key, value as int),
        ),
      );
}

class MenuSize {
  const MenuSize({
    required this.id,
    required this.diameterCm,
    required this.slices,
    required this.labels,
  });

  final String id;
  final int diameterCm;
  final int slices;
  final Map<String, String> labels;

  String label(String locale) => labels[locale] ?? labels['pt-BR'] ?? id;

  factory MenuSize.fromJson(Json json) => MenuSize(
        id: json['id'] as String,
        diameterCm: json['diameterCm'] as int,
        slices: json['slices'] as int,
        labels: (json['label'] as Json).map(
          (key, value) => MapEntry(key, value as String),
        ),
      );
}

class MenuExtra {
  const MenuExtra({required this.id, required this.name, required this.price});

  final String id;
  final String name;
  final int price;

  factory MenuExtra.fromJson(Json json) => MenuExtra(
        id: json['id'] as String,
        name: json['name'] as String,
        price: json['price'] as int,
      );
}

class MenuCrust {
  const MenuCrust({required this.id, required this.surcharges});

  final String id;
  final Map<String, int> surcharges;

  int surcharge(String sizeId) => surcharges[sizeId] ?? 0;

  factory MenuCrust.fromJson(Json json) {
    final raw = json['surcharge'];
    if (raw is int) {
      return MenuCrust(id: json['id'] as String, surcharges: {});
    }
    return MenuCrust(
      id: json['id'] as String,
      surcharges: (raw as Json).map(
        (key, value) => MapEntry(key, value as int),
      ),
    );
  }
}

class MenuCatalog {
  const MenuCatalog({
    required this.flavors,
    required this.sizes,
    required this.crusts,
    required this.extras,
    required this.deliveryFee,
  });

  final List<MenuFlavor> flavors;
  final List<MenuSize> sizes;
  final List<MenuCrust> crusts;
  final List<MenuExtra> extras;
  final int deliveryFee;

  MenuFlavor flavor(String id) => flavors.firstWhere((item) => item.id == id);
  MenuSize size(String id) => sizes.firstWhere((item) => item.id == id);
  MenuCrust crust(String id) => crusts.firstWhere((item) => item.id == id);
  MenuExtra extra(String id) => extras.firstWhere((item) => item.id == id);

  factory MenuCatalog.fromJson(Json json) => MenuCatalog(
        flavors: (json['flavors'] as List)
            .map((item) => MenuFlavor.fromJson(item as Json))
            .toList(),
        sizes: (json['sizes'] as List)
            .map((item) => MenuSize.fromJson(item as Json))
            .toList(),
        crusts: (json['crusts'] as List)
            .map((item) => MenuCrust.fromJson(item as Json))
            .toList(),
        extras: (json['extras'] as List)
            .map((item) => MenuExtra.fromJson(item as Json))
            .toList(),
        deliveryFee: json['deliveryFee'] as int,
      );
}

class CartLine {
  const CartLine({
    required this.flavorId,
    required this.sizeId,
    required this.crustId,
    required this.removedIngredientIds,
    required this.extraToppingIds,
    required this.quantity,
  });

  final String flavorId;
  final String sizeId;
  final String crustId;
  final List<String> removedIngredientIds;
  final List<String> extraToppingIds;
  final int quantity;

  CartLine copyWith({int? quantity}) => CartLine(
        flavorId: flavorId,
        sizeId: sizeId,
        crustId: crustId,
        removedIngredientIds: removedIngredientIds,
        extraToppingIds: extraToppingIds,
        quantity: quantity ?? this.quantity,
      );

  String get key => [
        flavorId,
        sizeId,
        crustId,
        (List<String>.from(removedIngredientIds)..sort()).join(','),
        (List<String>.from(extraToppingIds)..sort()).join(','),
      ].join('|');

  Json toJson() => {
        'flavorId': flavorId,
        'sizeId': sizeId,
        'crustId': crustId,
        'removedIngredientIds': removedIngredientIds,
        'extraToppingIds': extraToppingIds,
        'quantity': quantity,
      };
}

class PriceQuote {
  const PriceQuote({
    required this.lines,
    required this.subtotal,
    required this.deliveryFee,
    required this.total,
  });

  final List<Json> lines;
  final int subtotal;
  final int deliveryFee;
  final int total;

  factory PriceQuote.fromJson(Json json) => PriceQuote(
        lines: (json['lines'] as List)
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList(),
        subtotal: json['subtotal'] as int,
        deliveryFee: json['deliveryFee'] as int,
        total: json['total'] as int,
      );
}
