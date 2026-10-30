# 011 — Weekly pizza recommendations in customer chat

**Status:** Published to Cloudflare staging (2026-10-30); live recommendation awaits completed demo orders
**Depends on:** [000 — Product foundation](../000-foundation/spec.md), [005 — Contextual AI assistant](../005-contextual-ai-assistant/spec.md), [006 — Public demo kitchen](../006-demo-kitchen-order-board/spec.md), [009 — Assistant-guided cart configuration](../009-assistant-cart-configuration/spec.md)

## Goal

Show customers who use the optional assistant a relevant pizza recommendation informed by recent demo sales. Rank pizzas by completed demo-order quantity over the current and previous six UTC calendar days, then use a deterministic nearest-neighbor match between the customer's current, transiently expressed preferences and the pizza catalog to choose a relevant recommendation.

This remains a fictional ordering demo. Recommendations are informational; they do not change the cart, create a promotion, or imply real sales or availability.

## User flow

1. A customer opens chat and asks for help choosing, or expresses a pizza preference.
2. The API uses the current message and selected pizza to derive preference features for this request. It does not persist chat text or a customer profile.
3. The API reads aggregate flavor quantities from completed demo orders created during the current and previous six UTC calendar days. It selects an eligible best-selling pizza, resolving ties deterministically.
4. From the three top-selling available flavors, a nearest-neighbor calculation compares the expressed preference features to catalog features and selects the closest.
5. The assistant may offer that pizza in a localized, low-pressure response and explain that it is popular in the fictional demo. The customer can ask to configure it; any cart change follows Spec 009 review and explicit confirmation.

## Requirements

- Sales ranking counts quantities from successfully submitted, completed public demo orders only. Exclude cancelled, expired, private/manual, and non-public records. Do not call simulated in-progress orders sales.
- The measurement window is the current and previous six UTC calendar days. Persist only daily aggregate counts by flavor ID and date; do not extend retention of order rows, order contents, customer data, or chat transcripts for this feature.
- Aggregate updates are recorded on the authoritative transition into `completed`; the source order row update serializes concurrent transitions, and repeated updates after completion do not count twice. Cancelled, private, and in-progress orders do not count. Daily aggregates expire after the seven-date window, independently of 24-hour source-order cleanup.
- Catalog feature vectors are server-owned and versioned. The current implementation tokenizes localized flavor and ingredient names. The user preference vector uses only the current message and selected pizza; do not infer sensitive traits.
- Use a documented distance metric and deterministic tie-breaking. Do not introduce an ML dependency, embedding provider, paid model request, or arbitrary model-generated score. Nearest-neighbor matching is recommendation ranking over the supported catalog, not a claim of trained customer segmentation.
- Candidate pizzas must be available according to the authoritative menu. If sales aggregates are empty, stale, or unavailable, omit the popularity claim and use the existing assistant behavior. Do not fabricate counts or sales.
- Add the server-ranked flavor name and a localized, non-sensitive popularity reason to the ephemeral assistant prompt context. The existing assistant reply and ticket contracts deliver the optional suggestion to both clients. The model may phrase it but cannot alter its identity, ranking, availability, or popularity claim. Do not return raw counts or persist recommendation context.
- Recommendation must not be forced into unrelated answers. It is appropriate when the customer asks what to choose, requests suggestions, or expresses a preference relevant to the catalog.
- No discounts, scarcity claims, guarantees, automatic cart edits, or order submission. A recommendation is not a proposal; adding it to cart still requires a Spec 009 proposal review and explicit apply action.
- Keep the feature available in `pt-BR` and `en-US`, retain the structured ordering flow without chat, and preserve Spec 005 provider queue, budget, privacy, and context limits.

## Acceptance criteria

- [ ] A deterministic seven-calendar-day ranking counts eligible completed demo-order quantities and excludes ineligible records.
- [ ] Aggregate updates are idempotent and safe under retries/concurrency; expiry/reconciliation cannot leave stale popularity presented as current.
- [ ] The nearest-neighbor calculation produces the documented deterministic match for preference fixtures, including no-preference, tie, unavailable, and no-data cases.
- [x] The API prompt context carries a localized recommendation through the existing web/mobile reply contracts without exposing raw chat or customer identifiers.
- [ ] Recommendation appears only when context makes it relevant and never changes the cart without the existing explicit proposal/apply flow.
- [ ] Both locales have grounded copy, and empty/stale/unavailable aggregates fall back without a popularity claim.
- [ ] No additional provider call, persistent conversation/profile data, or real transaction/promotion behavior is introduced.

## Non-goals

- Real restaurant sales analytics, production inventory, staff dashboards, or operational forecasting.
- Cross-session customer profiles, durable chat history, demographic inference, or tracking visitors across devices.
- Training a machine-learning model, customer clustering, embeddings, or new paid AI usage.
- Discounts, paid promotions, paid advertising, or changing authoritative menu prices.
- Guaranteeing that a recommended item will remain available through checkout.

## Accepted decisions (2026-10-30)

- A demo sale for this recommendation means an order reaching the simulated `completed` status. It is explicitly a fictional demo metric, never a real sales claim.
- Keep only daily flavor counts for the current and previous six UTC calendar days, allowing the source demo orders to expire after 24 hours. The status transition itself provides one-time aggregate recording; retain no order payload, separate idempotency key, or chat content for this feature.
- Represent each flavor by its available ingredient IDs. Take the three highest selling available flavors (or fewer when needed), then compare the current message and selected pizza with localized flavor and ingredient names using Jaccard distance. Recommend the nearest of those three, breaking ties by seven-day quantity then stable flavor ID. With no detectable preference, recommend the weekly top seller. No distance threshold suppresses recommendations.
- Use a database trigger on the authoritative transition to `completed`; memory mode records at the same transition. Duplicate completion updates are ignored, and old daily aggregates are cleaned after their dates leave the seven-date window.

## Implementation checkpoint

The API stores daily per-flavor counts only when public demo orders reach `completed`; memory mode maintains the same aggregate for the API process lifetime. The assistant receives a recommendation only for a pizza-choice question or detectable pizza preference, and generic suggestion requests use the weekly top seller. Existing assistant prompts can mention the supplied localized pizza name and fictional-demo popularity; no extra model request or cart action is added. The migration is recorded in the hosted history as `202610300001` and the aggregate survives 24-hour source-order cleanup. Cloudflare API version `309f5c19-c583-401d-b1a3-5c741a018a85`, Flutter PWA version `f1bd56e5-3cb3-483d-8e68-bfaa5484bfcd`, and React site version `80a88f36-0bc2-41e3-a90f-b04adbe4f96e` are deployed. Live `/config` and both localized menus return successfully; the clients point to the stable API Worker. There are no completed public demo orders in the current seven-calendar-day window, so live popularity copy correctly remains suppressed until the first completed demo order.
