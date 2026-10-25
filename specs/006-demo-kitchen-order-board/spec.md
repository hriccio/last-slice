# 006 — Public demo kitchen and simulated staff

**Status:** Implemented and locally validated; deployment gates recorded
**Depends on:** [000 — Product foundation](../000-foundation/spec.md), [001 — Web demo ordering journey](../001-web-demo-ordering/spec.md), [002 — Flutter customer client](../002-mobile-demo-ordering/spec.md)
**Integrates with:** [005 — Contextual assistant](../005-contextual-ai-assistant/spec.md), [007 — Customer tracking](../007-customer-order-tracking/spec.md)

## Outcome

Public visitors can watch one shared fictional kitchen at `/kitchen`, including demo orders and a side conversation between simulated staff. The board is read-only. A server-side simulation advances orders through valid preparation states with randomized timing; visitors cannot perform staff actions.

Customers can create fictional pizza orders through the customer clients and watch those same orders progress on the shared kitchen board and their tracking view. No visitor account or identity is needed. Public checkout uses generated fictional details instead of collecting names, phone numbers, or addresses.

This revision replaces the earlier public-facing operator-token and manual-transition direction. The earlier manual board is retained only as a private development mode; production requires public-demo mode and Supabase. Existing private/manual mode may remain available for development, but public mode must expose no status-writing route, even to a browser holding the old shared token.

## Scope

### Included

- One shared, responsive React board; no per-visitor workspace or customer/staff accounts.
- Public read access to sanitized fictional orders and a read-only simulated staff conversation.
- A server-owned fake-staff simulation with randomized waiting times, the existing lifecycle, and authoritative persisted status/update time.
- Natural, localized staff messages from fictional roles such as counter staff, pizza cook, oven staff, and demo delivery staff.
- Existing customer tracking reflecting the same authoritative simulated status through Spec 007 polling.
- Public demo checkout using server-owned fictional fixtures in React and Flutter, with no visitor identity/contact fields.
- Bounded data retention, board size, public request volume, and paid assistant use.
- Supabase persistence and process-memory local preview, with additive reviewable migrations for simulation scheduling and staff events where needed.
- `pt-BR` and `en-US`, keyboard access, screen-reader announcements, and narrow-screen layouts.

### Excluded

- Real staff, real inventory, real preparation, real dispatch, real delivery, payments, or operational guarantees.
- Public status buttons, visitor chat messages in the staff feed, user profiles, logins, social identity, or fingerprinting.
- AI-generated staff dialogue or paid model calls for the kitchen simulation. Customer AI help remains a separate Spec 005 feature.
- Staff events competing for customer AI queue slots. The Spec 005 US$1/day chat queue applies only to customer model requests; local staff templates and preparation progress continue independently.
- Editing order contents/totals, cancelling orders, or exposing personal details, raw checkout payloads, credentials, or idempotency keys.
- New customer order states, skipping/reversing stages, historical per-step timestamps in the customer tracking contract, or estimated real delivery times.
- iOS setup, public deployment, or a claim that anonymous-looking access automatically exempts the service from privacy law.

## Visitor flow

1. A visitor opens `/kitchen` directly, without a token entry screen or registration. The page explains that all orders, staff, messages, preparation, and delivery are simulated and that visitors can only watch.
2. The shared board shows recent fictional orders, active stages first, with status and fulfillment filters. It never displays a visitor identity, contact detail, or address.
3. Simulated staff advance orders on the server. New statuses appear on the public board and in existing customer tracking without a visitor taking a staff action.
4. A side panel shows staff-to-staff conversation about those fictional orders. It has no message input or send button. Customers use the separate assistant for their own natural-language conversation.
5. A visitor may enter the customer ordering flow and submit a demo order. Public checkout offers visibly fictional generated contact/delivery fixtures, so the visitor does not need to provide personal details. The resulting order appears on the same shared board.
6. Completed orders remain visible in a bounded recent list, then expire with the demo data. Empty, disconnected, and capacity-limited states explain recovery in the selected locale.

## Public access and data minimization

- Public board reads require no identity or authentication. An anonymous session credential, if needed elsewhere for resource controls, is only a short-lived capability: it must not grant kitchen write access, identify a person, or be correlated across sessions/devices.
- In public mode, client calls to kitchen mutation routes fail with `403 kitchen_read_only`, including requests carrying the old operator token. Never publish a shared staff credential or put a privileged credential in browser code, a URL, or storage.
- Any retained private/manual development mode must be explicitly separated from public mode. A public-mode configuration error must not open a write path.
- Public-mode order creation accepts the supported order choices, an opaque UUID/hex idempotency token, and fixture identifiers only. The API stores a digest of that token, not free-form visitor input. The API resolves fictional checkout fields itself; it rejects unexpected personal/contact/address fields rather than persisting arbitrary input or echoing it in an error. Update request validation/contracts and both clients together.
- Public reads include only orders whose fictional-fixture origin was established by the server. Do not expose legacy/private-mode records merely because they share the same table.
- Fixtures must be unmistakably fictional, with no usable personal phone number, real recipient, or deliverable street address. Public UI must not invite visitors to replace them with their own details.
- Minimize public application logs to content-free outcomes/timing and aggregate capacity metrics. Do not log request bodies, conversation content, supplied credentials, or stable visitor profiles. Avoid analytics/fingerprinting and unnecessary third-party asset requests.
- Keep demo orders and staff events for at most 24 hours. Expired records are not returned, and cleanup must remove expired rows on a documented bounded schedule in Supabase as well as memory mode. Do not retain separate raw personal checkout payloads.
- Publish a concise localized data-use notice explaining the shared fictional board, transient customer chat, actual provider retention, and relevant hosting logs. A random access token or the absence of a login is not a guarantee that no personal data is processed; free chat and infrastructure logs require separate minimization.

## Fake staff and preparation timing

The API owns transitions. Customer clients and the public board never calculate a new authoritative order status or send a command to advance one.

| Current state | Fulfillment | Next state | Proposed randomized wait |
| --- | --- | --- | --- |
| `received` | Either | `confirmed` | 5–15 seconds |
| `confirmed` | Either | `preparing` | 5–15 seconds |
| `preparing` | Pickup | `ready_for_pickup` | 30–90 seconds |
| `preparing` | Delivery | `out_for_delivery` | 30–90 seconds |
| `ready_for_pickup` | Pickup | `completed` | 15–45 seconds |
| `out_for_delivery` | Delivery | `completed` | 30–60 seconds |

- Select a random bounded delay when each stage begins and persist its next-due time in Supabase mode. This supplies probabilistic variation without an unbounded chance that an order never progresses.
- Treat these ranges as implementation defaults for a short public demonstration, configurable only on the server. They describe simulated elapsed time and must not be presented as real preparation estimates.
- Use a bounded server tick (default 5 seconds) to process due orders. Progress continues without an open browser. Do not make status progress dependent on customer polling or board refreshes.
- Advance at most one state per order per processing pass. On restart, resume due work from persisted state without inventing earlier events or fast-forwarding through multiple stages at once.
- Use compare-and-set semantics on the current state and scheduled transition so overlapping ticks or multiple API processes cannot apply a transition twice. A losing worker reloads the persisted state rather than overwriting it.
- `completed` and fixture-only `cancelled` are terminal. The simulation does not cancel, skip, reverse, change fulfillment, reprice, or modify order contents.
- Atomically keep canonical `status`, `updated_at`, compatible `order_data.status`, next-due scheduling, and the corresponding staff event consistent. State is visible as advanced only after a successful authoritative write.
- In local memory mode, use the same behavior for the API process lifetime and explicitly describe its temporary storage. Keep fake time/randomness injectable for deterministic tests.

## Staff side conversation

- Show a dedicated panel headed “Conversa da equipe simulada” / “Simulated staff conversation”. Every participant is a fictional role; the panel offers no way for visitors to post or reply.
- Generate natural role-to-role exchanges from bounded, reviewed localized templates and safe authoritative order facts. No LLM/provider calls, personal data, raw customer chat, or free-form visitor-supplied strings enter this feed.
- Examples after a successful matching state transition:
  - Counter: “Pedido demonstrativo LS-… confirmado. Cozinha, pode começar.” / “Demo order LS-… confirmed. Kitchen, you can start.”
  - Cook: “Vou preparar a Calabresa do pedido demonstrativo LS-…, sem cebola.” / “I’m preparing the Calabresa for demo order LS-…, without onion.” This variation is permitted only when those are the actual supported flavor/options on that order.
  - Oven staff: “A pizza demonstrativa LS-… está pronta para retirada.” / “Demo pizza LS-… is ready for pickup.”
- Messages must agree with the persisted lifecycle and fulfillment branch. Do not say an order is ready, dispatched, or completed before the corresponding authoritative transition succeeds. Never promise a real pickup/delivery or an unsupported ETA.
- Store stable template keys and whitelisted arguments so the same shared events render in either board locale. Include event ID, fictional speaker role, demo timestamp, and optional order code. Do not store invented historical messages on restart.
- Publish a bounded recent feed (maximum 200 messages) in chronological order and deduplicate messages by committed transition/event ID. Messages may be grouped into short two-role exchanges for a natural staff conversation.
- Announce new messages politely without moving focus, reading the entire feed again, or forcing a reader who scrolled upward back to the bottom. A localized “new messages” action can return to the newest events.
- On narrow screens, place the staff panel below the orders or behind an accessible tab; it must not prevent reading order state.

## API and persistence contract

- In public mode, `GET /kitchen/orders?status={status}` returns the same sanitized summary fields as the prior board: `orderCode`, `createdAt`, `locale`, `fulfillment`, `status`, canonical priced lines, `subtotal`, `deliveryFee`, and `total`, with an explicit demo/simulation mode indicator. Return at most the 100 most recent unexpired orders, active first, then newest first.
- Unknown filters return the existing `400 validation_error` envelope. Public responses contain no identity, address, payload, idempotency, scheduling secret, or service credential.
- A board response may include the same atomic staff-event snapshot so displayed messages do not race a separately fetched order snapshot. Add a public read-only staff-event lookup, `GET /kitchen/messages`, returning the bounded safe event/template contract described above and no customer conversation.
- `PATCH /kitchen/orders/{orderCode}/status` is unavailable to clients in public mode (`403 kitchen_read_only`). The simulation calls an internal authoritative transition operation; it does not authenticate through a publicly exposed staff endpoint.
- `GET /orders/{orderCode}` retains Spec 007's privacy-limited response, `updatedAt`, demo-only flag, and unknown/expired-code `404 order_not_found` envelope. The simulation changes the source of server transitions, not client authority or the tracking response shape.
- Both public board views use bounded foreground polling no more often than every 15 seconds, with immediate initial/manual/resume refresh, no overlapping lookups, and last-successful snapshot retention on failures.
- Evolve Supabase through additive migrations, with service-role-only writes and no direct client access. Preserve the existing status constraint, timestamp, compatibility data, and index contract while adding server-owned schedule/event/expiry data.
- Public order/assistant operations need server-enforced global capacity limits and safe localized `429`/budget errors. Limits must not depend on identifying a visitor, and must not be bypassable merely by requesting a new anonymous token.

## Acceptance criteria

- [x] `/kitchen` opens publicly with no registration or shared token entry and clearly describes the read-only simulated experience in both locales.
- [x] All visitors see one shared fictional board; no visitor can mutate kitchen state through UI or API, including with an old operator token in public mode.
- [x] Fake staff advance orders through the correct pickup/delivery branches with bounded randomized timing and no open browser.
- [x] Restart/concurrency tests prove persistent scheduling, compare-and-set transitions, correct update times, no skipped stages, and no duplicate staff events.
- [x] Terminal orders remain terminal and expired demo data is excluded and cleaned up according to the retention rule.
- [x] The side chat shows natural, localized fictional staff exchanges consistent with committed order state, with no paid model calls and no visitor input.
- [x] Board and chat polling pause while hidden, avoid overlaps, recover from failure with retained data, and support manual refresh.
- [x] React and Flutter public checkout require no real identity/contact/address details; their request contracts accept only server-owned fictional fixtures and order choices.
- [x] Public orders, messages, logs, and provider context expose no collected checkout identity, raw payload, customer chat, idempotency information, or secrets.
- [x] Customer tracking reflects simulated status updates and retains Spec 007's privacy, locale, terminal, and failure behavior.
- [x] Keyboard/screen-reader checks cover filters, refresh, new staff messages, focus retention, narrow layouts, and larger text.
- [ ] Public read/write separation, anonymous/global capacity controls, paid-assistant limits, and actual data-use/retention settings are verified before public launch.

## Decisions fixed by this revision

- One shared board, publicly readable and never publicly writable.
- Server-side fictional staff use randomized bounded timing; visitors do not act as operators.
- The staff side chat is a simulated read-only feed. Natural free-form customer conversation belongs only in the separate assistant.
- Checkout uses generated fictional data; visitors are not asked to identify themselves.
- Privacy work minimizes collection and retention rather than claiming an automatic LGPD/GDPR exemption.

## Implementation checkpoint

The runtime uses `KITCHEN_MODE=public-demo` (automatic in production), private service-role SQL functions, and the API's five-second worker. `202610240002_public_demo_simulation.sql` preserves private legacy rows, atomically writes stages/events, and installs cleanup with Supabase pg_cron when available. The initial runtime remains a single API process as specified for volatile assistant payloads. Deterministic SQL tests execute the actual migration and exercise source isolation, competing ticks, overdue stages after restart, terminal handling, and expiry. React/Flutter public checkout contains no editable contact/address fields. Full built-client evidence is recorded during final release acceptance.
