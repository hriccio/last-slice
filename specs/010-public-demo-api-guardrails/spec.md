# 010 — Public demo API guardrails

**Status:** Implemented and deployed; live accepted-challenge walkthrough pending browser access to Cloudflare Turnstile
**Depends on:** [000 — Foundation](../000-foundation/spec.md), [008 — Free Cloudflare staging](../008-free-cloudflare-staging/spec.md), [009 — Assistant cart configuration](../009-assistant-cart-configuration/spec.md)

## Goal

Reduce casual cross-site abuse and automated submission volume against the public demo API used by the React website and Flutter PWA, without treating public client code as a secret or adding paid infrastructure.

## User flow

1. Customers can still browse the menu and kitchen snapshot from the published website/PWA.
2. Before submitting a demo order, sending a new assistant request, or confirming an assistant cart proposal, the browser client obtains a Cloudflare Turnstile token and sends it with the API request.
3. The API validates the token server-side before performing the protected operation. If validation is unavailable or fails, the operation is rejected with a localized recoverable error; no order, assistant job, or proposal application is performed.
4. Customers can retry the challenge and operation. Existing idempotency behavior remains in force.

## Requirements

- Configure CORS with an explicit comma-separated origin allowlist for the React website and Flutter PWA. Reject disallowed browser origins and never reflect arbitrary origins. Requests without an `Origin` header remain available for native clients and operational probes; this is not authentication.
- Apply per-client fixed-window rate limits to public demo reads, order submission, and assistant endpoints. Return HTTP 429 with `Retry-After`; bound and periodically prune limiter state.
- Require Turnstile server-side verification for browser-originated `POST /orders`, `POST /assistant/messages`, and `POST /assistant/proposals/:id/confirm` when public-demo guardrails are enabled. Requests with no `Origin` header remain available for native clients and operational probes; this is a compatibility exception, not authentication. Never trust a client-only challenge result.
- Keep Turnstile secret configuration server-only. The public site key may be supplied at build time. Fail closed when guardrails are enabled but required verification configuration is missing.
- Keep demo order and assistant budgets, validation, proposal capabilities, Supabase permissions, and fictional transaction behavior unchanged.
- Do not claim that CORS or a public site key makes the API callable only by these clients. Direct HTTP clients can imitate browser headers; rate limits and challenge verification are abuse controls, not user authentication.
- Keep customer-facing challenge/error text available in `pt-BR` and `en-US`.
- Development mode without guardrails remains usable without a Turnstile account. Public staging enables guardrails explicitly.

## Non-goals

- User accounts, private APIs, device identity, or preventing all direct HTTP access.
- Real payment processing, real fulfillment, paid Cloudflare plans, or new Supabase resources.
- Protecting native Android requests with a browser challenge.
- Replacing the existing Node API runtime with a Worker.

## Acceptance criteria

- [x] Allowed website/PWA origins receive exact-origin CORS headers; disallowed origins are rejected.
- [x] Public route and per-client request limits return 429 and do not grow limiter memory without bound.
- [x] Browser-originated protected operations require a token validated by Cloudflare Siteverify when staging guardrails are enabled; no-Origin native requests retain compatibility.
- [x] React and Flutter Web request a fresh challenge token for protected operations and show retryable localized failures.
- [x] Missing server verification configuration prevents guardrail-enabled staging startup.
- [ ] Staging walkthrough confirms menu browse, demo order, assistant response, and proposal confirmation; failed challenge attempts create no operation. Current staging API and both locales are reachable, and missing-token browser requests receive 403. The available Brave profiles block the Turnstile script, preventing accepted-challenge flows; see [validation](validation.md).

## Validation

Run the API and web builds, API tests, Flutter analysis/build, and focused browser checks for both locales and rejected/accepted challenge cases. Record deployment secrets only in the runtime secret store, never in repository files or frontend output. See the [staging validation record](validation.md).
