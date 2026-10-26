# Spec 010 validation

## Staging setup (2026-10-26)

- Created a Cloudflare Turnstile widget restricted to `last-slice-pwa-staging.hriccio.workers.dev` and `last-slice-web-staging.hriccio.workers.dev`. Its site key is supplied to frontend builds; its secret is stored in the local KeePassXC vault entry `last_slice_turnstile_staging` and injected only into the API process.
- Restarted the public-demo Node API on port 3002 with Supabase persistence and guardrails enabled, then exposed it through the temporary Quick Tunnel `https://minimum-sharp-records-brought.trycloudflare.com`.
- Published Flutter PWA Worker version `c8375801-1abf-4ed9-aa6a-cc8ec3105282` and React Worker version `97c32794-a817-469a-92bf-86c0c8eda7a3` with the same API origin and public Turnstile site key. Neither bundle contains the verification secret.

## Checks completed

- `npm run build`, `flutter analyze`, and `flutter build web --release` passed. Both Cloudflare staging builds passed before deployment. The deployed builds include a 45-second challenge timeout so an unrendered widget returns a recoverable error.
- The PWA and React staging URLs return HTTP 200. The Portuguese and English menus return all five flavors and the exact expected `Access-Control-Allow-Origin` header.
- A request with an unlisted browser origin is rejected with HTTP 403. A browser-originated `POST /orders` without a Turnstile token receives HTTP 403 `challenge_failed` before order validation or persistence.
- The React menu was checked in Portuguese and English. The Flutter PWA menu was checked in Portuguese and English.

## Remaining live check

The available Brave profiles did not load `https://challenges.cloudflare.com/turnstile/v0/api.js`; no Turnstile frame appeared, and the order action stayed pending. The client now has a 45-second timeout, but the accepted-challenge path could not be completed in this browser environment. No demo order was created and no assistant/model request was sent during this walkthrough. Recheck order submission, assistant response, proposal confirmation, and missing-token recovery from a browser that permits the Cloudflare challenge script.

The Quick Tunnel and local API are temporary runtime processes. The staging API will be unavailable if either process stops, and a replacement tunnel URL requires rebuilding and redeploying both clients.
