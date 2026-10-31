# Spec 009 validation

Recorded on 2026-10-25.

## Implementation

- `CartSnapshot`, `ProposalCandidate`, and `CartProposal` define stable line identities, monotonic cart revisions, operations, expiry, canonical lines, and API quotes.
- New clients supply a cart snapshot. Following the [official Structured Outputs contract](https://developers.openai.com/api/docs/guides/structured-outputs), the provider uses a strict JSON schema for an informational reply and optional allowlisted candidate. The prompt understands unresolved draft proposals and requires clarification for missing choices or ambiguous targets. Legacy clients retain the advice-only response path.
- The API validates every candidate through the existing pricing contract and current Supabase availability. It builds localized review summaries, binds proposals to the original conversation and cart, and keeps them in bounded process memory. No database migration or persistent cart/chat storage was added.
- Confirmation is deterministic, validates ownership, expiry, base cart, and current menu signature, and returns canonical resulting lines and totals. Duplicate confirmation returns the same result. Both clients track application and never repeat a cart change. Confirmation creates neither a provider attempt nor an order.
- React and Flutter render review/apply/adjust/dismiss actions and explicit checkout handoff. Adjust carries the unapplied draft into the next request. Direct edits invalidate pending proposals. Failed confirmation preserves the current cart. Clearing conversation discards pending proposals without undoing applied cart changes.
- Flutter's phone-layout test exposed a constrained logo when chat opens; the brand now scales within the app bar. The assistant's scrollable area accommodates review cards. The checkout handoff exposed synchronous cart refresh during route construction; it now runs after the frame. Long bottom-action values wrap at larger text sizes.

## Automated checks

- `npm run build`: contracts, API, and React production build passed.
- `npm run test:api`: 21 API/SQL tests passed. New checks cover both locales, add/merge/update/quantity/remove, preservation of unrelated lines, removal of the last line, invalid fields/prices/identifiers/targets, quantity bounds, conversation isolation, stale carts and menu signatures, expiry, restart, dismissal, duplicate confirmation, structured token accounting, and real-adapter integration against controlled provider/PostgreSQL fixtures. The SQL ledger still verifies the US$1/day cap and 45-second pacing.
- All 16 Chromium browser tests passed. Browser checks cover both localized review cards, keyboard Apply, phone-width bounds, unchanged cart before confirmation, exactly-once application, separate explicit checkout, follow-up draft context, and rejection after direct fulfillment edits. Existing assistant, checkout/kitchen, and tracking regressions are included in the final browser suite.
- All 24 Flutter widget tests passed. Widget checks cover both localized cards at 390×844 and 1.5× text, explicit application, retained cart state after clearing chat, duplicate application, draft adjustments, stale carts, and proposal-to-cart navigation. Existing tracking/assistant/checkout regressions are included in the final Flutter suite.
- Flutter analysis, Android debug APK build, Flutter release Web build, and both Cloudflare deployment dry runs passed. The final Android debug APK was built with `--dart-define=API_BASE_URL=https://have-variation-lit-exhibitions.trycloudflare.com` for the same staging API. Native Android shares the tested Dart implementation; no Android emulator/device was connected for a new interactive smoke journey.

## Live staging checks

The existing Supabase-backed staging API on local port 3002 was restarted with the new build and vault-injected credentials. The existing HTTPS Quick Tunnel is unchanged.

- Real Portuguese add: request `fbe8b4cc-d2be-4a2f-bc12-ad0cb3e36e23` proposed one large Calabresa, traditional crust, no onion, extra bacon; API total R$69.00. Confirming twice returned the same proposal result.
- Real English update: request `575a2bec-7ea5-458b-93c3-cd50cfb658bf` targeted that exact line, switched to thin crust and quantity two, retained removals/extras, and returned R$138.00. Repeated confirmation was identical.
- The deployed React UI made a third real request (`7e042cba-3c29-4037-80a3-1668343a3884`). It displayed a pending review card with the requested pizza and R$69.00 total while the cart count stayed zero. Apply updated the count to one; Review demo order showed the canonical configuration in ordinary checkout. The separate Place demo order button created fictional order `LS-2272E111AECE63`, with the correct configuration/total and simulation notice.
- The three real attempts settled at 113150, 126600, and 108950 nanodollars, respectively: **US$0.00034870 total**. Proposal confirmation/replay produced no additional attempts. Strict JSON output stayed within the existing 4,000-input/800-output limits; schema tokens and conservative protocol overhead are included in preflight input counting. The selected model, token limits, durable US$1/UTC-day cap, and global 45-second pacing were not changed.
- React staging was deployed as Worker version `a680f4c9-be7d-4424-928b-8f62513f088a`. The final Flutter PWA version is `c4c7bd30-e592-466b-9056-78180b2ef2fb`, rebuilt/deployed with the same API origin. Neither frontend asset bundle contained either runtime key. No paid infrastructure or new database resources were provisioned.

## Remaining human checks and operating limits

The new card has keyboard controls, localized labels, live-region status, and automated narrow/larger-text coverage. A human screen-reader audio review of this new card has not been performed; the earlier human check for Spec 005 predates these controls. Native Android was built but not reinstalled on a device in this task. Staging still depends on the local API and Quick Tunnel processes. Existing production hosting/provider-retention gates remain separate.

## Proposal-response consistency repair (2026-10-31)

- The API now builds proposal-ready chat replies from the canonical, API-validated proposal summary. Invalid candidates and lost/expired proposal state replace the model's claim with a localized cart-unchanged recovery message. Flutter and React no longer add a duplicate stale/expiry warning below that reply.
- The structured prompt now requires the exact ingredient configuration requested and forbids saying a proposal is ready unless the candidate matches it. Regression coverage checks canonical proposal wording and invalid-candidate recovery without a live model call.
- `npm run build`, `npm run test:api` (27 passing), `npm run test:cf:api:staging` (1 passing), Flutter PWA build, `flutter test` (24 passing), and Cloudflare API/PWA/React dry runs passed. All three public staging endpoints returned HTTP 200 after deployment. No live provider call was made.
- Current staging versions: API `accc2205-54fe-47ab-9420-560c1e65d5b1`; Flutter PWA `bb2d7b48-cb02-4c62-9468-49b320d1cd6c`; React `d1847258-6722-4d93-879c-adb2850567d4`.

## Explicit three-cheese follow-up repair (2026-10-31)

- For an unambiguous Quatro Queijos request naming exactly three included cheeses and a size, the API now derives the omitted ingredient as a removal and stores that candidate with the conversation's proposal state. This deterministic candidate takes precedence over a missing or contradictory model candidate; the normal API proposal validation and customer Apply confirmation still apply. Requests that do not identify exactly three cheeses and a size continue through normal clarification.
- Regression coverage reproduces “Opção A, com provolone, parmesão e gorgonzola. Média. Qualquer borda.” with a controlled model response that has no candidate, and verifies a medium Quatro Queijos proposal removing mozzarella.
- `npm run build`, `npm run test:api` (29 passing), `npm run test:cf:api:staging` (1 passing), and the API Cloudflare dry run passed. The staging API returned HTTP 200 at `/config` after deployment. No live model request was made.
- Current API Worker version: `9dff5ce9-fa8d-4e04-8928-67e934d61b34`; the existing Flutter PWA and React versions are unchanged.
