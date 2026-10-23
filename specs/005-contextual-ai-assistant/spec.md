# 005 — Contextual AI ordering assistant

**Status:** Implemented; build-validated, interactive acceptance pending
**Depends on:** [000 — Product foundation](../000-foundation/spec.md), [001 — Web demo ordering journey](../001-web-demo-ordering/spec.md), [002 — Flutter cross-platform demo ordering](../002-mobile-demo-ordering/spec.md), [003 — Flutter Web PWA customer client](../003-flutter-web-pwa/spec.md)

## Outcome

Customers can open optional, contextual AI help while browsing or ordering through the React website or Flutter client. The assistant answers questions about the current demo menu and guides customers back to the structured flow. The API mediates all model access. The assistant cannot change a cart, submit an order, claim an order succeeded, or replace authoritative API data.

This slice advances the product without requiring an iOS runner, Apple hardware, or Xcode. It applies to the existing web, PWA, and Android clients; the same API capability can be used by a future iOS client.

## Scope

### Included

- An optional assistant entry point from menu browsing, pizza customization, cart, and checkout.
- A conversation panel in React and Flutter that works at desktop and narrow mobile widths and preserves the underlying ordering state when opened or closed.
- A server-side assistant endpoint that receives the selected locale, a bounded recent conversation, and a minimized snapshot of relevant menu/cart context.
- Answers about menu ingredients, supported options, pickup/delivery, and how to use the ordering flow.
- Clear guidance to use the structured UI for selections, current quotes, checkout, and order tracking.
- Localized assistant controls, loading/error states, and demo notices in `pt-BR` and `en-US`.
- A server-only model-provider adapter configurable through environment settings. Provider credentials remain on the API and are never sent to either client.

### Excluded

- Voice, speech recognition, image input, account history, or persistent chat history.
- Autonomous cart edits, option selection, quote/order submission, checkout-field entry, payment, or fulfillment actions.
- Answers about real restaurant operations, live inventory, delivery timing, or guaranteed fulfillment.
- Exposing customer name, phone, street address, delivery reference, order code, or other personal/order lookup data to the model.
- A specific AI vendor, model, deployment platform, or paid service commitment. The implementation must use a provider adapter and select/configure a compatible provider without changing the client contract.
- iOS project setup, Apple signing, or App Store work.

## Customer behavior

1. The customer may open **Ask the pizzeria** from menu browsing, customization, cart, or checkout. The control is optional and does not block the structured ordering path.
2. The assistant opens in the current locale and receives only the context needed for that screen: locale, current menu/options, and—when relevant—pizza selections and a current API quote summary.
3. The customer can ask a question in natural language. The assistant responds in the selected locale, answers only within the supported demo scope, and can point to the relevant structured control.
4. If a customer expresses a desired change (for example, a size or topping), the assistant explains how to make it in the UI. The customer performs and reviews the change through the existing controls.
5. The customer closes the assistant and continues at the same ordering step with the same cart and checkout fields.

If the assistant is unavailable, the app explains that help is temporarily unavailable and leaves the structured ordering journey usable. A failed or timed-out answer never clears or modifies customer state.

## Assistant behavior and grounding

- The API constructs or validates the context from authoritative menu and quote data. Client-supplied prices or claims are not treated as authoritative.
- The assistant may explain listed menu ingredients, supported sizes/crusts/extras, the fictional demo fee, and the steps in the existing flow.
- It must not invent ingredients, options, prices, availability, order status, preparation time, delivery time, or business policies absent from the supplied context.
- Price questions are answered from the current API quote when one is available. Otherwise, the assistant asks the customer to configure the pizza or use the quote shown in the structured flow; it does not calculate or present a competing total.
- If the question falls outside the supplied menu/demo context, the assistant says it cannot confirm and directs the customer to the structured app or a human-owned channel only if one is actually configured. It must not invent a contact channel.
- Treat customer messages as untrusted content. They cannot replace system rules, alter the assistant's role, request hidden prompts/secrets, or authorize business actions.
- Assistant text is advisory. The customer remains in control, and only existing API operations can produce authoritative quotes, orders, and tracking data.
- Responses must not describe simulated orders, payments, or fulfillment as real.

## API contract

Add `POST /assistant/messages` to the TypeScript API. It does not create or update an order.

Request fields:

- `locale`: `pt-BR` or `en-US`.
- `message`: non-empty text with a documented maximum length.
- `history`: bounded recent user/assistant turns, with a documented maximum count and per-message length. The server may trim older turns to enforce the context limit.
- `context`: current screen and stable menu/selection identifiers needed to resolve context. The API must ignore or recompute monetary values and other authoritative facts from its own data.

Successful response:

- `reply`: localized assistant text.
- `disclaimer`: a stable key or boolean indicating the response is informational and the structured UI/API remains authoritative.

Errors use the existing stable API error envelope. Include recoverable codes for invalid input, unavailable provider, and provider timeout. Do not return provider prompts, credentials, raw request payloads, or internal stack traces.

The API uses a provider adapter selected through server configuration. Provider secrets are read from environment configuration; no secret is checked in or exposed to the web/PWA/Android bundles. Local development can use a deterministic fake adapter so the UI and contract work without credentials. A fake response must be clearly identified as development behavior and must not imply model-backed advice.

## Privacy and retention

- Do not persist assistant messages or use them to update customer/order records in this slice.
- Do not send customer name, phone, delivery address, reference, order code, or order status to the provider.
- Do not log full message text, conversation history, or context snapshots. Operational logs may record request outcome, duration, and a request correlation identifier without content.
- Bound message size, history length, provider response size, and request duration. Return a localized recoverable error when a limit is exceeded.
- The client clears the in-memory conversation when the customer explicitly starts a new conversation or closes the app session. Navigating between ordering steps within the session may retain the bounded conversation.
- Before any provider sends customer data outside the API, the implementation documentation must state the provider's processing/retention configuration. This slice sends only the minimized, non-identifying menu/order-selection context described above.

## Localization and accessibility

- Assistant controls, example prompts, errors, and notices are available in `pt-BR` and `en-US`.
- The answer follows the selected locale. If a customer writes in another language, the assistant still responds in the selected app locale.
- Opening and closing the panel must preserve keyboard focus sensibly; messages are readable by screen readers and new replies are announced without stealing focus from the order form.
- The assistant panel must not obscure the active total or the next structured action on narrow screens.

## Acceptance criteria

- [ ] A customer can open and close the assistant from menu, customization, cart, and checkout in the React and Flutter clients.
- [ ] Opening, using, or closing the assistant preserves the selected step, cart, quote, and checkout fields.
- [ ] The assistant can explain supported menu ingredients and options in `pt-BR` and `en-US` using API-provided context.
- [ ] Price answers use the current API quote or direct customers to the structured quote; client-provided price values are not trusted.
- [ ] The assistant cannot change cart/order state or invoke quote, order, or tracking mutations on the customer's behalf.
- [ ] Out-of-scope questions, invalid requests, provider failures, and timeouts receive safe localized responses while ordering remains usable.
- [ ] Responses do not invent menu, price, availability, order status, timing, or fulfillment claims and consistently preserve the demo-only boundary.
- [ ] Provider credentials exist only in API runtime configuration; no secrets or provider calls are present in client bundles.
- [ ] Personal contact/address details and order lookup data are excluded from provider context; conversation content is not persisted or logged.
- [ ] A deterministic local fake adapter supports UI/API development without external credentials and is distinguishable from a real provider response.
- [ ] The assistant is usable with keyboard and screen reader on desktop and narrow mobile layouts.
- [ ] The endpoint enforces documented request, context, history, response, and timeout limits and returns the existing stable API error envelope.

## Decisions fixed by this spec

- The assistant is optional support layered onto the structured ordering flow; it is not a second ordering interface.
- The TypeScript API is the only boundary that may call an AI provider. Clients never hold provider credentials or call a provider directly.
- Assistant messages are transient and informational. The assistant cannot mutate orders or customer-entered selections.
- The assistant receives minimized menu and selection context only, with no direct identifiers or fulfillment address data.
- Provider choice and deployment are runtime implementation decisions behind the specified adapter; the client and API response contract remain provider-neutral.
- This feature is implemented and validated on existing web/PWA/Android targets and does not depend on iOS or Apple tooling.
