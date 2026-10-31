# 009 — Assistant-guided cart configuration

**Status:** Implemented; automated and real-provider staging validation recorded; new-card human screen-reader review pending
**Depends on:** [000 — Foundation](../000-foundation/spec.md), [001 — Web ordering](../001-web-demo-ordering/spec.md), [002 — Flutter ordering](../002-mobile-demo-ordering/spec.md), [005 — Contextual assistant](../005-contextual-ai-assistant/spec.md), [006 — Public demo](../006-demo-kitchen-order-board/spec.md)

## Goal

Let the assistant move naturally from answering menu questions to helping configure a pizza and prepare the cart. Customers can describe their choices in conversation, review an API-validated proposal, and apply it without reconstructing those choices in the customization form.

This remains a fictional ordering demo. Cart configuration does not place an order, collect payment, or promise real fulfillment.

## Scope

- React website, Flutter PWA on iOS/Android, and native Flutter Android.
- Natural conversation and all proposal controls in `pt-BR` and `en-US`.
- Propose adding a configured pizza, updating a specific existing cart line, changing its quantity, or removing that line.
- Explain ingredients/options first when asked; when relevant, offer to help configure the choice and continue toward cart review.
- Retain direct ordering controls and the ability to complete checkout without chat.

## Non-goals

- Editing submitted orders, changing kitchen status, or creating an order from chat.
- Automatic application of a model response without customer confirmation.
- Real sales, payments, discounts, invented promotions, delivery estimates, or personal-detail collection.
- Changing the selected provider/model, paid tool usage, budget, queue pacing, or persistence architecture.
- Clearing the entire cart or replacing unrelated lines as a side effect of a requested edit.

## Customer flow

1. A customer asks about ingredients or choices. The assistant answers from authoritative menu data, then may offer one relevant next step, such as configuring that pizza. It does not repeatedly pressure a customer who declines.
2. The customer says, for example, “Quero uma Calabresa grande, sem cebola e com bacon.” The assistant resolves the flavor, size, removal, and extra from supported menu identifiers. Missing choices are clarified one useful question at a time. Existing selection context may supply a choice; any default must be visible in the review before application.
3. The API validates the candidate against the current menu and obtains the canonical quote using the existing pricing operations. It returns a structured cart proposal alongside the conversational response. The model does not determine authoritative prices.
4. Chat displays a review card showing the operation, flavor, size, crust, removed ingredients, extras, quantity, fulfillment context, and resulting API cart total. Updates show what changes; removal identifies the affected line. The card clearly states that the cart has not changed yet.
5. The customer selects **Aplicar à sacola** / **Apply to cart**, **Ajustar** / **Adjust**, or **Descartar** / **Dismiss**. Only Apply changes the cart. Adjust continues the conversation; Dismiss leaves the cart unchanged. The assistant must distinguish a proposed configuration from an applied change in its wording.
6. After application, the client displays the updated cart and offers **Revisar pedido demonstrativo** / **Review demo order**. The customer reviews the normal fictional checkout and explicitly submits through the existing checkout action.

For “sem cebola” or “remove that pizza,” use the selected line only when its identity is unambiguous. If multiple lines could match, ask which one. Never silently choose a line or remove another pizza.

## Product and contract rules

- Preserve the foundation's explicit-review requirement. This accepted spec supersedes Spec 005's advice-only/cart-edit exclusion only for reviewed, customer-confirmed cart proposals.
- Use structured, bounded model output with an allowlist of cart proposal operations and supported identifiers. Never execute arbitrary tool names, URLs, code, SQL, or instructions from model text. Informational replies can omit a proposal.
- The API validates every proposed flavor, size, crust, removal, extra, quantity, and target line. Apply the same availability and validation rules used by direct ordering; reject unsupported or unavailable choices without changing the cart.
- Cart state remains client-owned. The API validates a submitted cart snapshot, constructs a proposed resulting cart, and quotes it through existing authoritative pricing code. Do not introduce persistent server carts or duplicate business rules in clients.
- Shared TypeScript contracts define proposal operations, canonical lines, quote, identifiers, and errors; Dart mirrors the wire contract. Client adapters apply the validated result to their existing cart state.
- Each proposal includes an opaque identifier, its source request, a server-verified base-cart revision/fingerprint, any target line identifier, and an expiry of at most five minutes. Bind it to the existing transient conversation capability. Keep proposals in bounded process memory alongside ticket results; no cart/chat persistence or new database tables are required.
- Distinguish cart revision from content identity: stable session line identifiers identify edit targets even when selections change. Clients include the relevant line identity and current configuration when requesting a proposal. The server validates both; no cross-conversation proposal is usable.
- Confirm through a deterministic API operation that rechecks ownership, expiry, base cart, and current menu/quote, then returns the canonical resulting lines and totals. Confirmation must not call the provider, enqueue paid work, or create an order. Use `POST /assistant/proposals/{id}/confirm` with `{cartSnapshot}` and the conversation bearer capability; return `{proposal}` with canonical lines/quote. `DELETE /assistant/proposals/{id}` dismisses a proposal. Shared `CartSnapshot`, `ProposalCandidate`, and `CartProposal` types define the wire fields; completed assistant tickets include an optional `proposal`. `proposal_invalid`, `proposal_stale`, and `proposal_expired` are localized recoverable errors.
- If the customer edits the cart while a reply is queued or a proposal is pending, invalidate the proposal. Explain that the cart changed and offer a fresh proposal from current state; never overwrite intervening edits. A changed price/availability requires a refreshed review and another explicit confirmation.
- Treat confirmation as idempotent: repeated clicks, client/network retries, and repeated completed-ticket retrieval apply the same proposal at most once. Disable Apply while confirmation is pending and record applied proposal identifiers in client session memory. An expired/lost proposal requires a new review rather than reconstruction from free text.
- Use the existing duplicate-line and quantity rules. Adding the same configuration merges according to the normal cart behavior; an update must preserve unrelated lines. Removing the last line leaves the normal empty-cart state.
- Keep model context minimized: menu choices, cart configuration/line identities, and canonical quote only. No real contact/address details, order lookup codes, vault secrets, or privileged credentials are supplied to the model or proposal UI.
- Preserve bounded input/output, durable US$1 per UTC day accounting, the global 45-second slot, and no automatic paid retries. Structured output must fit within existing token limits, including reasoning and framing. Validation/quote/confirmation work adds no model request; a new conversational adjustment uses the existing queue. If reliable structured replies cannot fit, revise the spec/budget explicitly before changing limits.

## Accessibility and recovery

- Proposal cards and controls are keyboard reachable and screen-reader labeled. Announce proposal readiness and successful application without moving focus unexpectedly or reading repeated polling updates.
- Preserve the active order total and next action on narrow screens and at larger text sizes.
- Closing chat preserves the cart; reopening may show an unexpired pending proposal. Clearing the conversation discards pending proposals and capabilities without undoing applied customer-confirmed cart changes.
- On provider, validation, quote, confirmation, or network failure, retain the existing cart and show localized retry/recovery guidance. Never claim a change was applied if confirmation did not succeed.
- The assistant's final reply must match the API-validated proposal. If proposal validation or presentation fails, replace any model claim that a proposal was prepared with a localized explanation that the cart is unchanged and how to recover. Do not label proposal validation errors as expiry.

## Acceptance criteria

- [x] Both clients can answer a question, clarify a configuration, and show a grounded proposal in both locales.
- [x] Reviewed add/update/quantity/remove proposals apply only after explicit confirmation and preserve unrelated cart state.
- [x] Every shown/applicable option and resulting total is validated by the API; unsupported identifiers and client/model prices are rejected.
- [x] Ambiguous targets cause clarification; stable line identity prevents editing the wrong configuration.
- [x] Stale carts, changed prices/availability, expiry, process restart, and conversation ownership prevent unsafe application.
- [x] Double confirmation, response replay, and retries never add a second pizza or repeat a removal; confirmation sends no paid request.
- [x] The structured checkout remains required to create a fictional order; chat cannot submit or modify an existing order.
- [x] Failures and closing/clearing chat preserve customer-confirmed cart state; direct ordering remains usable.
- [ ] Proposal UI works with keyboard, screen readers, narrow layouts, and larger text. Keyboard, semantic labels/live regions, narrow layouts, and larger text are covered by automated checks; a human screen-reader audio review of the new card remains open.
- [x] Provider limits, privacy, durable daily cap, and 45-second global pacing remain enforced with the revised prompt/output.

## Validation plan

Use deterministic model responses to test API validation and cart operations without paid calls. Cover both locales in React and Flutter, including stale responses during queued work, ambiguous line targets, price changes, duplicate application, and preservation of unrelated lines. After acceptance and implementation, run a small explicitly bounded real-provider staging journey and verify the final cart/quote before ordinary demo checkout. Record actual paid usage without storing raw conversation content.


## Implementation evidence

See the [validation record](validation.md) for automated checks, live staging requests, costs, deployment versions, and remaining human/device checks.

### Proposal response consistency update

The API now replaces model-written proposal claims with a localized summary derived from the validated cart proposal. If validation or proposal recovery fails, it returns a localized message that the cart is unchanged; clients no longer mislabel validation failures as expiry. The structured prompt also requires exact ingredient choices and prohibits claiming a proposal was prepared when its candidate does not match. Automated API regression coverage includes valid canonical replies and invalid-candidate recovery.


## Cloudflare staging execution amendment (2026-10-27)

For Cloudflare-hosted staging, the process-memory proposal store belongs to the single assistant coordinator in [Spec 008 execution design](../008-free-cloudflare-staging/worker-design.md). All presentation/confirmation/discard calls route to that owner; eviction loses proposals safely, and no proposal content is persisted.
