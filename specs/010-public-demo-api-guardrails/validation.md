# Spec 010 validation

## Staging setup (2026-10-26)

- Created a Cloudflare Turnstile widget restricted to `last-slice-pwa-staging.hriccio.workers.dev` and `last-slice-web-staging.hriccio.workers.dev`. Its site key is supplied to frontend builds; its secret is stored in the local KeePassXC vault entry `last_slice_turnstile_staging` and injected only into the API process.
- Restarted the public-demo Node API on port 3002 with Supabase persistence and guardrails enabled, then exposed it through the temporary Quick Tunnel `https://minimum-sharp-records-brought.trycloudflare.com`.
- Published Flutter PWA Worker version `c8375801-1abf-4ed9-aa6a-cc8ec3105282` and React Worker version `97c32794-a817-469a-92bf-86c0c8eda7a3` with the same API origin and public Turnstile site key. Neither bundle contains the verification secret.

## Checks completed

- `npm run build`, `flutter analyze`, and `flutter build web --release` passed. Both Cloudflare staging builds passed before deployment. The deployed builds include a 45-second challenge timeout so an unrendered widget returns a recoverable error.
- The PWA and React staging URLs return HTTP 200. The Portuguese and English menus return all five flavors and the exact expected `Access-Control-Allow-Origin` header.
- A request with an unlisted browser origin is rejected with HTTP 403. A browser-originated `POST /orders` without a Turnstile token receives HTTP 403 `challenge_failed` before order validation or persistence, so no operation is created.
- The React menu was checked in Portuguese and English. The Flutter PWA menu was checked in Portuguese and English.
- The user completed the accepted-challenge staging flow successfully: menu browse, demo order, assistant response, and proposal confirmation.

## Outcome

The Spec 010 staging walkthrough passed, including both successful protected operations and rejection of a protected request without a challenge token.

The Quick Tunnel and local API are temporary runtime processes. The staging API will be unavailable if either process stops, and a replacement tunnel URL requires rebuilding and redeploying both clients.

## Staging availability recovery (2026-10-26)

- Investigated the reported Portuguese checkout error. Neither the staging Node API nor cloudflared was running, and the API hostname embedded in the deployed clients (`minimum-sharp-records-brought.trycloudflare.com`) no longer resolved. The static website remained available independently of the API.
- Restarted the existing production public-demo API on port 3002, injecting Supabase, OpenAI, and Turnstile credentials transiently from the local vault. `/config` confirms Supabase persistence and public-demo mode. No database, business-rule, guardrail, or hosting-plan changes were made.
- Started a replacement Quick Tunnel at `https://intervals-tops-whatever-generating.trycloudflare.com`. Rebuilt both clients with this origin and the existing public Turnstile site key; both deployment dry runs passed. Published React Worker version `3849d0d7-66ae-4f0a-9b4c-cee4f6c7f2b7` and Flutter PWA Worker version `f050eb90-258b-4658-a7e2-543528242c0d`.
- Both localized menus return five flavors with exact-origin CORS headers. A no-Origin operational probe created fictional pickup order `LS-B7C521EE29CF6D` for R$ 46,00 (HTTP 201); replay returned the same order (HTTP 200). Lookup and public kitchen snapshot return HTTP 200. A browser-originated order request without a challenge token still receives HTTP 403 `challenge_failed`.
- In an isolated browser session, the deployed React menu, customization, and fictional checkout loaded. Submission reached the real Turnstile widget, which requested human verification; this recovery did not complete an accepted-challenge browser checkout. No assistant/model call was made. Application logic was unchanged, so API unit tests were not rerun.
- The API and replacement tunnel are left running as detached local processes. This restores the existing temporary staging architecture; it does not make it resilient to process termination or workstation restart. Reload already-open website tabs to load the replacement API origin.
