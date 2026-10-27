# 005 — Contextual AI ordering assistant

**Status:** Implemented and locally validated; deployment gates recorded
**Depends on:** [000 — Product foundation](../000-foundation/spec.md), [001 — Web demo ordering journey](../001-web-demo-ordering/spec.md), [002 — Flutter cross-platform demo ordering](../002-mobile-demo-ordering/spec.md), [003 — Flutter Web PWA customer client](../003-flutter-web-pwa/spec.md)

**Accepted extension:** [009 — Assistant-guided cart configuration](../009-assistant-cart-configuration/spec.md) adds reviewed, customer-confirmed cart proposals. Its rules supersede advice-only restrictions below for clients supplying a cart snapshot; submitted orders remain outside assistant authority.

## Outcome

Customers can open optional, contextual AI help while browsing or ordering through the React website or Flutter client. The assistant answers questions about the current demo menu and guides customers back to the structured flow. The API mediates all model access. Under Spec 009, the assistant may propose cart configurations for explicit customer confirmation. It cannot silently change a cart, submit an order, claim an order succeeded, or replace authoritative API data.

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
- A bounded, shared chat queue with a hard daily model-spending cap, worst-case cost reservation, and localized wait/average-response feedback.

### Excluded

- Voice, speech recognition, image input, account history, or persistent chat history.
- Autonomous cart edits, option selection, quote/order submission, checkout-field entry, payment, or fulfillment actions.
- Answers about real restaurant operations, live inventory, delivery timing, or guaranteed fulfillment.
- Exposing customer name, phone, street address, delivery reference, order code, or other personal/order lookup data to the model.
- Provider-specific behavior in clients. OpenAI is the selected server-side provider; the adapter keeps the client contract independent of the model.
- iOS project setup, Apple signing, or App Store work.

## Customer behavior

1. The customer may open **Ask the pizzeria** from menu browsing, customization, cart, or checkout. The control is optional and does not block the structured ordering path.
2. The assistant opens in the current locale and receives only the context needed for that screen: locale, current menu/options, and—when relevant—pizza selections and a current API quote summary.
3. The customer can ask a question in natural language. The assistant responds in the selected locale, answers only within the supported demo scope, and can point to the relevant structured control.
4. If a customer expresses a desired change, clients implementing Spec 009 may show an API-validated cart proposal with an explicit Apply action. Older clients receive advice pointing to the existing controls. Final checkout always remains a separate explicit customer action.
5. The customer closes the assistant and continues at the same ordering step with the same cart and checkout fields.
6. When AI capacity is occupied or the next budget-backed answer slot is not available yet, the message waits in the chat queue. The panel shows its queue position and estimated reply time, plus a recent observed average when enough samples exist. The customer can cancel a waiting message or continue using the structured ordering controls.

If the assistant is unavailable, the app explains that help is temporarily unavailable and leaves the structured ordering journey usable. A failed or timed-out answer never clears or modifies customer state.

### Natural conversation

- Public customers can type freely in natural language. Preset questions may be optional shortcuts; they must not replace or restrict free chat.
- Understand informal phrasing, abbreviations, ordinary spelling mistakes, and requests such as “quero uma grande com bacon”, “sem cebola”, or “what would you suggest for two people?” within the actual menu and supported options.
- Use the current selection and bounded conversation context to understand follow-ups. Ask one useful clarification at a time when size, flavor, quantity, or a preference is unclear, rather than requiring a command format or repeating a questionnaire.
- Replies should sound natural in Brazilian Portuguese or US English. Explain menu facts and help the customer decide without dumping the whole menu, repeating fixed disclaimers every turn, or displaying raw identifiers and amounts in cents. Persistent UI copy carries the demo notice; clarify simulated transactions whenever a request could imply real payment or fulfillment.
- Customer chat is separate from the read-only fictional staff feed in Spec 006. Visitor messages never appear on the shared kitchen board or staff feed.
- This slice keeps the existing advisory boundary: a conversational summary is a proposed choice, not a changed cart or submitted order. The customer applies selections using the structured controls and explicitly confirms checkout. Enabling chat to apply a reviewed draft to the cart would require a separate contract decision.

## Selected provider, secret access, and cost

- Use the existing local KeePassXC entry `OPENAI_API_KEY`. Read it only at runtime using `CODEX_KC_VAULT` and `CODEX_KC_SECRET`; inject the resulting API key into the API process environment. Never copy the vault password or API key into a repository file, client, URL, log, evaluation record, or commit.
- Accepted model: `gpt-5-nano-2025-08-07`. The user accepted the model selection; bilingual natural-conversation, grounding, and integration acceptance still apply. Keep the model configurable on the server, with no silent model upgrade or paid tool use.
- The live vault-backed probe and current official price comparison are recorded in [model decision](model-decision.md). A successful probe is not full feature acceptance.
- Call OpenAI's server-side Chat Completions endpoint with `store: false`. For GPT-5 nano, use supported parameters: minimal reasoning, low verbosity, a bounded `max_completion_tokens` budget, and no unsupported custom temperature or legacy `max_tokens` field. The existing generic adapter must be updated before selecting this model in the app.
- Bound input, history, output, and request duration. The public demo must also enforce a global request/token spending ceiling and a localized exhausted-budget response; anonymous callers must not have unlimited paid access. Keep local fake mode for deterministic development.
- API content is not used for training by default, but standard OpenAI abuse-monitoring logs may retain content for up to 30 days. `store: false` does not itself grant Zero Data Retention. Document the actual project's data controls; do not claim zero provider retention without verifying eligibility and configuration.

## Budget-backed chat queue

The user selected a **US$1.00 per UTC day** application model-token budget. Use a bounded shared FIFO queue and one logical provider request at a time, with a global dispatch slot no more often than once every **45 seconds**. The first request may start immediately when a slot and budget are available; a 45-second slot is a throughput limit, not a mandatory delay for every visitor.

The worst-case scenario (WCS) reserves **US$0.00052 per provider attempt**: at most 4,000 input tokens at US$0.05 per million and 800 generated tokens at US$0.40 per million. Count all system instructions, menu/quote context, history, current message, and provider message framing against the input limit; generated-token accounting includes reasoning. Do not base admission on the much smaller average cost of the live probe.

The detailed [queue and budget contract](queue-budget.md) fixes admission/cancellation, idempotency, reservation/settlement, truthful timing feedback, privacy, errors, and deterministic validation. The API and both clients must implement it together. Pacing alone is insufficient: a shared atomic budget ledger must refuse dispatch when another WCS reservation would exceed the daily cap, including after a restart or with concurrent API processes.

Implementation evidence is recorded in [validation](validation.md). Queue content is volatile and belongs to the API process that accepted it; the initial demo uses one API process. The durable Supabase ledger still serializes budget/slot claims from overlapping API processes. Multiple replicas would additionally require request affinity for volatile ticket/reply retrieval; lost content expires safely and is never replayed as paid work.

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

Use `POST /assistant/messages` to submit an assistant request. It does not create or update an order. The existing immediate-response implementation must evolve to support the queue contract without making clients hold an HTTP connection open while waiting.

Request fields:

- `locale`: `pt-BR` or `en-US`.
- `message`: non-empty text with a documented maximum length.
- `history`: bounded recent user/assistant turns, with a documented maximum count and per-message length. The server may trim older turns to enforce the context limit.
- `context`: current screen and stable menu/selection identifiers needed to resolve context. The API must ignore or recompute monetary values and other authoritative facts from its own data.
- `requestId`: a client-generated idempotency identifier for this message, scoped to an opaque transient conversation capability. Retrying submission must not create another queue entry or paid attempt.

When an immediate local fake response is available, or a completed request is retrieved, the successful response includes:

- `reply`: localized assistant text.
- `disclaimer`: a stable key or boolean indicating the response is informational and the structured UI/API remains authoritative.

Public model-backed submission returns `202` with a protected request ticket, state, polling interval, and available queue/wait estimates. `GET /assistant/requests/{requestId}` retrieves only that conversation's request status or reply; `DELETE /assistant/requests/{requestId}` cancels a waiting request. These reads/cancellations must not call the provider. Ticket/capability credentials go in headers, not URLs or persistent client storage. The exact shared shapes and safe errors are defined in [queue and budget contract](queue-budget.md).

Errors use the existing stable API error envelope. Include recoverable codes for invalid input, unavailable provider, and provider timeout. Do not return provider prompts, credentials, raw request payloads, or internal stack traces.

The API uses a provider adapter selected through server configuration. Provider secrets are read from environment configuration; no secret is checked in or exposed to the web/PWA/Android bundles. Local development can use a deterministic fake adapter so the UI and contract work without credentials. A fake response must be clearly identified as development behavior and must not imply model-backed advice.

## Privacy and retention

- Do not persist assistant messages or use them to update customer/order records in this slice. Waiting payloads and completed replies may be held briefly in bounded process memory as defined by the queue contract; a durable budget ledger contains only accounting/coordination metadata, never chat content.
- Do not send customer name, phone, delivery address, reference, order code, or order status to the provider.
- Do not log full message text, conversation history, or context snapshots. Operational logs may record request outcome, duration, and a request correlation identifier without content.
- Bound message size, history length, provider response size, and request duration. Return a localized recoverable error when a limit is exceeded.
- The client clears the in-memory conversation when the customer explicitly starts a new conversation or closes the app session. Navigating between ordering steps within the session may retain the bounded conversation.
- Before any provider sends customer data outside the API, the implementation documentation must state the provider's processing/retention configuration. This slice sends only the minimized, non-identifying menu/order-selection context described above.
- Free text can contain personal information volunteered by a visitor. Do not request identity or contact details in chat. Minimize and redact recognizable personal/contact data before provider calls, keep messages out of shared feeds and application logs, and give a concise localized instruction not to submit personal details. Redaction is a reduction measure, not proof that all free text is anonymous.

## Localization and accessibility

- Assistant controls, example prompts, errors, and notices are available in `pt-BR` and `en-US`.
- The answer follows the selected locale. If a customer writes in another language, the assistant still responds in the selected app locale.
- Opening and closing the panel must preserve keyboard focus sensibly; messages are readable by screen readers and new replies are announced without stealing focus from the order form.
- The assistant panel must not obscure the active total or the next structured action on narrow screens.
- Queue position, estimated reply time, recent average response time, cancellation, full-queue, expired-ticket, and daily-budget states are localized and accessible. Announce meaningful state changes without moving focus or reading an updating countdown repeatedly.

## Acceptance criteria

- [x] A customer can open and close the assistant from menu, customization, cart, and checkout in the React and Flutter clients.
- [x] Opening, using, or closing the assistant preserves the selected step, cart, quote, and checkout fields.
- [x] The assistant can explain supported menu ingredients and options in `pt-BR` and `en-US` using API-provided context.
- [x] Price answers use the current API quote or direct customers to the structured quote; client-provided price values are not trusted.
- [x] The assistant cannot silently change cart/order state or create orders. Spec 009 permits server-validated quotes and customer-confirmed cart proposals; confirmation makes no model call.
- [x] Out-of-scope questions, invalid requests, provider failures, and timeouts receive safe localized responses while ordering remains usable.
- [x] Responses do not invent menu, price, availability, order status, timing, or fulfillment claims and consistently preserve the demo-only boundary.
- [x] Provider credentials exist only in API runtime configuration; no secrets or provider calls are present in client bundles.
- [x] Personal contact/address details and order lookup data are excluded from provider context; conversation content is not persisted or logged.
- [x] A deterministic local fake adapter supports UI/API development without external credentials and is distinguishable from a real provider response.
- [x] The assistant is usable with keyboard and screen reader on desktop and narrow mobile layouts.
- [x] The endpoint enforces documented request, context, history, response, and timeout limits and returns the existing stable API error envelope.
- [x] Free-form, multi-turn conversation handles informal requests and clarification naturally in both locales, without requiring preset prompts or implying that advice changed/submitted an order.
- [x] The selected model works through the actual adapter with runtime vault injection; no credential reaches clients or committed artifacts.
- [x] Public assistant usage has enforced global spending limits and recoverable localized budget errors.
- [x] A bounded FIFO queue allows one outstanding message per conversation, deduplicates retries, supports cancellation before dispatch, and leaves the ordering controls usable.
- [x] Atomic WCS reservations, actual usage settlement, conservative handling of unknown/timeout charges, and a durable daily ledger enforce the US$1 cap across restarts and concurrent dispatch attempts.
- [x] Global 45-second pacing, input/output token limits, full/expired queue behavior, and daily-budget reset are verified with deterministic clocks and fake usage.
- [x] React and Flutter display this request's estimated reply time and an honestly calculated recent average, including cold-start and unavailable-estimate states, in both locales.

## Decisions fixed by this spec

- The assistant is optional support layered onto the structured ordering flow; it is not a second ordering interface.
- The TypeScript API is the only boundary that may call an AI provider. Clients never hold provider credentials or call a provider directly.
- Assistant messages are transient and informational. The assistant cannot mutate orders or customer-entered selections.
- The assistant receives minimized menu and selection context only, with no direct identifiers or fulfillment address data.
- Provider choice and deployment are runtime implementation decisions behind the specified adapter; the client and API response contract remain provider-neutral.
- The vault-backed GPT-5 nano model is accepted. Initial public capacity is US$1/day, WCS US$0.00052 per attempt, a bounded FIFO queue, and one global dispatch slot every 45 seconds; changing model, prices, or token limits requires recalculating that policy.
- This feature targets existing web/PWA/Android clients and does not depend on iOS or Apple tooling. Model acceptance does not mark the revised feature implementation complete.


## Cloudflare staging execution amendment (2026-10-27)

Hosted staging uses the single assistant coordinator defined in [Spec 008 execution design](../008-free-cloudflare-staging/worker-design.md) instead of a local Node process. It retains volatile content and routes every assistant operation to the same owner; eviction/deployment follows the existing restart failure semantics. Server credentials may be injected into Cloudflare secret bindings for this deployment, with no vault password uploaded.
