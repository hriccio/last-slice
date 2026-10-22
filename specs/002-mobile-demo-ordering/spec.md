# 002 — Flutter cross-platform demo ordering

**Status:** Approved for implementation
**Depends on:** [000 — Product foundation](../000-foundation/spec.md), [001 — Web demo ordering journey](../001-web-demo-ordering/spec.md)

## Outcome

Deliver a second customer client in Flutter, separate from the React website, for browser/PWA, Android, and iOS targets. Customers start by browsing and complete a short guided flow: browse → customize → checkout → confirmation. The same Flutter/Dart UI and API client should build for web and native mobile. The app uses the existing API for menu, authoritative price quotes, order submission, and status lookup; it does not reimplement pricing rules.

## Scope

### Included

- Flutter customer app in `apps/mobile/` for web, Android, and iOS.
- An installable Flutter Web PWA with app name, theme colors, standalone display mode, and 192px/512px icons. Offline ordering is not required; the menu and order operations depend on the API.
- Browse the five flavors from the API, view product details, and configure one pizza at a time.
- Size, crust, ingredient removal, and up to three extra toppings using the choices returned by the API.
- Cart with editable quantity, fulfillment selection, price quote, and clear line-item customization summaries.
- Pickup/delivery checkout, simulated order confirmation, and lookup by demo order code.
- `pt-BR` and `en-US`; default to `pt-BR`. Keep the selected locale for the running session and preserve it while moving between steps.
- Mobile visual style based on the customer app references in spec 001.

### Excluded

- AI chat, voice ordering, account creation, push notifications, real payment, actual delivery, staff tools, and order status updates.
- Any duplicated menu, pricing, validation, or order-state business rules in the Flutter client.

Contextual AI chat remains a later feature spec. The structured mobile journey must be complete without chat. A future assistant can enter at points of friction without replacing the browse/customize/checkout path.

## Visual direction

Use [customer mobile catalog and customization](../001-web-demo-ordering/references/customer-mobile-catalog-and-customization.png) and [customer mobile browse and cart](../001-web-demo-ordering/references/customer-mobile-browse-and-cart.png) as the primary visual references. Carry forward the near-black/charcoal surfaces, warm orange primary actions and selected states, white text, restrained secondary gray, rounded cards, and warm pizza photography. Adapt the layouts and copy to the Last Slice menu, BRL, and both locales. Do not copy other visible brand names, prices, promotions, or unrelated content.

Keep browsing as the first screen. Use a clear forward progression with persistent cart visibility and a prominent bottom action on detail, cart, and checkout steps. Use platform navigation conventions and ensure controls remain reachable on small screens and with the on-screen keyboard open.

## Customer flow

1. **Browse:** fetch the localized menu from `GET /menu`. Show all five flavors, descriptions, and starting prices. A visible language control switches between `pt-BR` and `en-US`.
2. **Customize:** choose one flavor, size, crust, removals, and optional extras. Request an authoritative quote and display the updated total before adding to cart.
3. **Cart:** list each line with flavor, size, crust, removed ingredients, extras, quantity, and quoted line total. Let the customer change quantities, remove lines, choose pickup/delivery, and review the total.
4. **Checkout:** collect the same fields as spec 001. Re-quote when fulfillment changes. Label the entire flow as demo-only before the explicit submit action.
5. **Confirmation:** show a demo order code, localized `received` status, order line details, BRL total, and an explicit statement that payment and fulfillment are simulated.
6. **Tracking:** let a customer enter or reuse an order code. Show the current localized status, status explanation, line summary, and total. Do not invent status progress.

Preserve cart and form state while moving between steps. On request errors, keep the user's work and show localized recovery guidance. The app must not request or collect payment credentials.

## Shared API addition

The existing shared TypeScript contract package is not directly consumable from Dart. The API remains the only source of truth for menu options, calculations, and order validation. Add a side-effect-free quote operation:

### `POST /quotes`

Request:

```json
{
  "fulfillment": "pickup",
  "lines": [
    {
      "flavorId": "mussarela",
      "sizeId": "media",
      "crustId": "traditional",
      "removedIngredientIds": [],
      "extraToppingIds": [],
      "quantity": 1
    }
  ]
}
```

Response contains canonical quoted lines with `unitPrice` and `lineTotal`, plus `subtotal`, `deliveryFee`, and `total`, all as integer BRL cents. It does not create or persist an order. Invalid options return the same stable `validation_error` shape as order submission. `POST /orders` continues to recalculate prices authoritatively when accepting an order.

The mobile app calls `/quotes` after cart or fulfillment changes, debouncing only rapid repeated changes. Do not put prices from the phone into an order request.

## Platform and configuration

The browser/PWA target's installability, web shell, Chromium workflow, and deployment requirements are further specified in [003 — Flutter Web PWA customer client](../003-flutter-web-pwa/spec.md).

- Use one browser-compatible HTTP client for web and native targets; do not import `dart:io` into code compiled for web.
- Configure the API origin with a build-time `API_BASE_URL` value. Default to `http://localhost:3001` in a local browser and iOS simulator, and `http://10.0.2.2:3001` on Android emulator. A physical device needs the development computer's LAN address. Production URLs must use HTTPS and allow the deployed web origin through API CORS.
- Serve the PWA over HTTPS in production (localhost is acceptable for local development). Keep the API origin configurable at build time.
- Do not include service-role credentials or Supabase access in the app. It talks only to the TypeScript API.
- Use Flutter SDK and Dart SDK versions selected by the implementation environment. Avoid additional packages unless needed for a requirement in this spec.

## Acceptance criteria

- [ ] Flutter Web launches into a localized menu fetched from the API and can be installed from a compatible browser using its manifest and icons.
- [ ] Android and iOS Flutter targets launch into the same localized customer flow.
- [ ] The customer can complete browse → customize → cart → checkout → confirmation without chat or an account.
- [ ] Every configurable option comes from the API; totals update through `POST /quotes` and match API order totals.
- [ ] Cart and confirmation show size, crust, removed ingredients, extras, and quantity correctly.
- [ ] Pickup and delivery fields, fixed fee, demo labels, and no-payment behavior match spec 001.
- [ ] Order submission uses the existing API and idempotency behavior; status lookup shows persisted state without exposing contact/address data.
- [ ] All customer-facing menu, validation, checkout, confirmation, and status text is available in `pt-BR` and `en-US`.
- [ ] The interface follows the supplied customer mobile visual references, adapts to narrow screens, and keeps the next action and total visible.
- [ ] The app remains usable when API calls fail and preserves cart/form state for retry.

## Decisions fixed by this spec

- Flutter reuses the existing API, adding `POST /quotes` for server-authoritative cart previews, and targets web/PWA and native mobile from one Dart codebase. React remains a separate web customer client.
- The customer flow is structured and chat-free in this slice; contextual AI help gets a separate spec.
- Locale defaults to `pt-BR` and persists only for the running app session.
- The mobile UI does not advance order statuses; it displays the server's latest status.
