# Assistant implementation validation

Recorded on 2026-10-24. Local integrated acceptance is recorded with revised Spec 006 in the [release record](../release-validation.md); deployment and human accessibility gates remain explicit.

- Eight assistant/API tests cover bounded token construction/history trimming, redaction and wording guards; FIFO/idempotency/cancellation; unknown charges; UTC rollover and restart-safe slots; exact actual-cost settlement; private RPC permissions; budget exhaustion; and average reply times including queue waits. PostgreSQL migration tests execute the actual PL/pgSQL with PGlite, not a reimplementation of the ledger. The API-to-PostgREST/provider integration fixture checks the actual request parameters and sanitized context.
- Two Chromium tests cover queue/cancellation, cold-start versus observed averages, duplicate sends, completed replies, and exhausted-budget recovery in both locales.
- Three Flutter tests cover natural input, queue polling and cancellation, preserved draft/cart state, budget errors, background/resume, and clearing a conversation. The assistant uses a persistent panel so the underlying ordering actions remain available.
- Existing API tracking, React tracking, and 13 Flutter tracking checks remain in the regression suite. TypeScript/React builds and Flutter analysis pass at this implementation checkpoint.
- Two final live calls through the real queue/adapter and transient vault injection completed in Portuguese and English using the accepted GPT-5 nano snapshot. The actual durable SQL ledger was exposed through a local PostgREST test fixture. Their settled token charges were 63,300 and 53,850 nanodollars (US$0.00011715 combined); the second request respected the global 45-second slot. No real contact, address, or order-code data was sent.

Use `make dev-ai` (API plus React) or `make api-ai` after configuring `CODEX_KC_VAULT`, `CODEX_KC_SECRET`, and the Supabase runtime variables and applying `202610240001_assistant_budget_queue.sql`. Only the API child receives the decrypted OpenAI key; the launcher removes the vault password from its child environment. Paid calls fail closed without the durable ledger. Ordinary `make dev` retains the clearly labeled local fake.

The provider-input budget uses `o200k_base` encoding for the fixed GPT-5 snapshot, per-message framing, and a conservative 128-token protocol allowance. Old history is removed before essential context/system rules. Reported usage is checked against the policy bounds, with any mismatch quarantining further paid work. The output cap includes reasoning; timeout/missing-usage attempts retain the full WCS reservation.

The initial demo runs one API process because payloads/results are volatile. The database coordinates overlapping dispatchers and preserves accounting across crashes, but this repository does not configure multi-replica request affinity. PostgreSQL tests do not validate a deployed Supabase project, a hosted cleanup schedule, or hosting logs. Standard provider abuse-monitoring retention remains as documented in the model decision; no Zero Data Retention approval is claimed.

## Local regression recheck

Rechecked on 2026-10-25:

- `npm run test:api` — all 15 API/SQL tests passed, including queue reservations and settlement, budget exhaustion, context redaction, and deterministic provider fixtures.
- `CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/assistant.web.spec.ts` — both locale scenarios passed for queue timing, cancellation, duplicate-send protection, completed replies, and budget recovery.
- `flutter analyze` — no issues; `flutter test` — all 20 widget tests passed, including the assistant queue, state preservation, cancellation, localized budget errors, and background/resume behavior.
- `npm run build` — shared contracts, API TypeScript, and React production build passed.

No paid provider request was repeated during this regression run; the live adapter probe remains the 2026-10-24 evidence above. Human screen-reader testing remains open, so the accessibility acceptance item is still unchecked.
