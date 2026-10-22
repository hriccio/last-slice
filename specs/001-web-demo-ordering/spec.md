# 001 — Web demo ordering journey

**Status:** Ready for implementation
**Depends on:** [000 — Product foundation](../000-foundation/spec.md)

## Outcome

A customer can place and track a clearly simulated pizzeria order on the responsive website, using the menu and checkout directly without AI chat. The API owns menu data, price calculation, order creation, and order status. The first slice establishes contracts that a later Flutter client can reuse.

## Scope

### Included

- Responsive React + TypeScript website for menu browsing, pizza customization, cart review, checkout, confirmation, and order status.
- TypeScript API and shared contracts for the menu, price calculation, order submission, and order lookup.
- Supabase schema migrations and local development data for the demo menu and orders.
- `pt-BR` and `en-US` customer-facing copy. Brazilian menu names remain recognizable in both locales; descriptions, controls, validation, checkout, and status explanations are localized.
- Direct structured controls are the primary path. This slice does not require chat.

### Excluded

- Flutter mobile client, AI chat, accounts, staff/admin tooling, real payment, messaging, real delivery, coupon codes, split pizzas, or half-and-half flavors.
- Production menu management or real restaurant operations.

## Visual direction

Treat the attached images as visual references, not as literal screens or copy instructions:

- [Customer mobile catalog and customization](references/customer-mobile-catalog-and-customization.png) and [customer mobile browse and cart](references/customer-mobile-browse-and-cart.png) show the intended customer-app direction.
- [Customer web ordering and customization](references/customer-web-ordering-and-customization.png) is the primary layout reference for the first web slice.
- [Pizzeria food photography](references/pizzeria-food-photography.png) shows the warm, close-up food imagery and rustic serving context.
- [Kitchen order board](references/kitchen-order-board-future-reference.png) is a reference for a later restaurant operations view. It is outside this customer-ordering slice.

Carry these visual traits into a responsive website:

- Near-black and charcoal backgrounds, layered dark-gray cards, white primary text, and muted gray secondary text.
- A vivid warm orange accent for primary actions, selected options, prices, and small highlights. Keep status colors semantic and restrained.
- Large appetizing pizza photography with warm natural light and close crops. Use image-led menu cards and a prominent product image on customization; avoid generic clip art.
- Rounded cards and controls, clear spacing, and concise typography. Keep the menu scannable and customization choices visibly grouped.
- Use direct category/search and menu browsing, a clear customization panel, a cart summary, and a prominent add-to-cart/checkout action. On narrow screens, keep the next action and current total easy to find without obscuring content.

Adapt the references to The Last Slice's Brazilian menu, BRL prices, and `pt-BR`/`en-US` copy. Do not copy the Dodo Pizza identity, other visible brand names, prices, promotional claims, ratings, profile/location details, or unrelated categories from the images. The kitchen order board may inform a later operations spec but does not add staff tools to this slice.

## Customer journey

1. The customer lands on the menu in their selected locale. The page presents categories and pizza cards with name, short description, available sizes, and starting price.
2. Selecting a pizza opens a structured customization step. The customer picks one size, one crust, and optional extra toppings, then adds it to the cart.
3. The customer can adjust quantities or remove lines. Prices and the order total are recalculated by the API and shown before checkout.
4. Checkout asks whether the order is for pickup or delivery and collects the relevant customer details. The customer reviews the final total and explicitly submits the demo order.
5. Confirmation shows a human-readable demo order code, the initial status, item summary, total, fulfillment choice, and a persistent explanation that the order, payment, and fulfillment are simulated.
6. The customer can reopen a status page using the order code. It displays the latest status and a localized explanation.

The cart and current step must survive ordinary navigation within the ordering flow. If submission fails, preserve the cart and entered form values and show a recoverable localized error. Disable repeat submission while a request is in flight; the API must also make retries with the same idempotency key return the same order.

## Demo menu and prices

All prices are fixed fictional demo values in Brazilian reais (BRL). They are not market research and do not vary with locale. The `en-US` interface displays the same BRL values with an appropriate localized currency format; it does not convert to USD.

Sizes apply to every flavor:

| Size | Approximate diameter | Slices | Mussarela | Calabresa | Portuguesa | Frango com Catupiry | Quatro Queijos |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Broto | 25 cm | 4 | R$ 32,00 | R$ 35,00 | R$ 38,00 | R$ 38,00 | R$ 40,00 |
| Média | 30 cm | 6 | R$ 46,00 | R$ 49,00 | R$ 53,00 | R$ 53,00 | R$ 56,00 |
| Grande | 35 cm | 8 | R$ 59,00 | R$ 64,00 | R$ 69,00 | R$ 69,00 | R$ 73,00 |

Menu descriptions and default ingredients:

- **Mussarela:** mozzarella, tomato sauce, and oregano.
- **Calabresa:** sliced calabresa sausage, mozzarella, onion, and oregano.
- **Portuguesa:** ham, mozzarella, egg, onion, peas, and olives.
- **Frango com Catupiry:** shredded chicken, Catupiry-style cream cheese, and mozzarella.
- **Quatro Queijos:** mozzarella, provolone, parmesan, and gorgonzola.

These five flavors are the complete menu for this slice. Ingredients are descriptive and removable where listed; no unlisted ingredients are implied.

## Customization and pricing rules

- A pizza line contains exactly one flavor and one size. Half-and-half is not supported.
- Crust choices: **traditional** or **thin**, included in the listed flavor/size price; **Catupiry-stuffed crust**, with a size-based surcharge of R$ 6,00 (Broto), R$ 8,00 (Média), or R$ 10,00 (Grande).
- The customer can remove any ingredient in that flavor’s default list at no charge. Removed ingredients are shown in the cart and order summary.
- Extra toppings: mozzarella, calabresa, bacon, onion, olives, or Catupiry-style cream cheese. Each extra costs R$ 5,00 per pizza, regardless of size. Up to three extras may be selected per pizza; the same extra can be selected only once per pizza.
- Quantity is 1–10 per cart line. Identical flavor, size, crust, removed ingredients, and extras combine into one line.
- Line total = (base price + crust surcharge + (R$ 5,00 × extra topping count)) × quantity.
- Subtotal is the sum of line totals. Delivery adds a fixed demo delivery fee of R$ 8,00; pickup adds no fee. No taxes, tip, discounts, or other fees are added in this demo.
- The API is authoritative for all calculations. The web may preview a total, but it must reconcile with the API response before submission and confirmation.

## Checkout details

Required in both fulfillment modes:

- Customer name, 2–80 characters after trimming.
- Brazilian contact phone with area code, accepted as 10 or 11 digits after punctuation is removed. It is used only as demo order data; the system sends no message or call.

Pickup requires no address and adds no fee. Delivery requires:

- Street, number, and neighborhood.
- City and state (two-letter Brazilian state abbreviation).
- Complement and delivery reference are optional.

Use ordinary Brazilian address terminology in `pt-BR` and clear equivalents in `en-US`. Label the checkout and final confirmation as a simulation before the customer submits. No payment method or payment credentials are collected.

## Order lifecycle

Persist and return one of these statuses:

`received` → `confirmed` → `preparing` → (`ready_for_pickup` for pickup | `out_for_delivery` for delivery) → `completed`

`cancelled` is a terminal status reachable from `received` or `confirmed` in demo fixtures only. Customer submission creates an order in `received`. This slice has no staff interface to advance statuses; the status page must accurately show the persisted current status and not invent progress. Seeded demo examples may illustrate later states. Status updates are outside this customer ordering slice.

## API and shared contract behavior

Use JSON over HTTP. Exact framework and deployment remain implementation choices. All money values in contracts are integer minor units (`BRL` cents); localized currency formatting is a client responsibility. Responses include a stable machine-readable error code and a localized-safe message key; clients own translated strings.

### `GET /menu?locale={pt-BR|en-US}`

- Returns the five available flavors, descriptions, ingredients, size/price matrix, crust options and surcharges, extra topping choices and prices, and delivery fee.
- Prices are authoritative integer BRL cents. Menu content includes locale-specific display names/descriptions where useful, while stable identifiers remain locale-neutral.
- Unsupported locale returns `400 unsupported_locale`.

### `POST /orders`

Request contains an idempotency key, locale, fulfillment type, customer name and phone, required delivery address only when delivery is selected, and cart lines with flavor/size/crust IDs, removed ingredient IDs, extra topping IDs, and quantity. The request does not contain an authoritative price.

- Validate every identifier, option combination, quantity, and required field against the menu contract.
- Recalculate all prices and return the created order with a demo order code, status `received`, canonical line items, item subtotal, delivery fee, and total in BRL cents.
- Reusing an idempotency key with the same payload returns the original order. Reusing it with a different payload returns `409 idempotency_conflict`.
- Invalid input returns `400 validation_error` with field-level error keys. Do not create partial orders.

### `GET /orders/{orderCode}`

- Returns the demo order code, created time, status, fulfillment type, localized-safe status key, line summary, and total.
- Unknown codes return `404 order_not_found`.
- The code must be unguessable enough for a demo tracking link and must not expose contact or address fields.

Shared contracts in `packages/contracts/` define request/response shapes, stable identifiers, enums, and validation constraints. Supabase persistence stores demo menu and order data. Store no payment data. Do not expose name, phone, or address from the order lookup response.

## Acceptance criteria

- [ ] The website matches the selected visual reference and works at mobile and desktop widths.
- [ ] A customer can complete the full structured journey without chat or account creation.
- [ ] All five flavors, three sizes, crust choices, ingredient removals, extras, quantities, and price rules match this spec.
- [ ] API totals match the displayed totals, including the delivery fee, and invalid options cannot be submitted.
- [ ] Pickup and delivery collect the required fields and no payment credentials.
- [ ] The order is persisted as a demo order, receives a unique tracking code, starts as `received`, and can be looked up without revealing personal contact/address data.
- [ ] Failed submission preserves the customer's work; retrying with the same idempotency key does not create a duplicate.
- [ ] All menu, validation, checkout, confirmation, and status surfaces are available in `pt-BR` and `en-US`, with BRL amounts in both.
- [ ] Demo-only labels are visible before submission and on confirmation/status pages; no claim of real payment or fulfillment is made.

## Decisions fixed by this spec

- The first implementation is a web-first vertical slice with API, shared contracts, and Supabase persistence; Flutter and chat follow later.
- Catalog and prices are fictional fixtures as listed above, used consistently in both locales.
- Checkout supports pickup and delivery, with the fixed demo delivery fee and required fields above.
- Customer order status starts at `received`; no customer-visible simulated status progression is fabricated.
