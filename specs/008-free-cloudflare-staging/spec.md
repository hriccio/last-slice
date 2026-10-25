# 008 — Free Cloudflare staging for web and Flutter PWA validation

**Status:** React website, PWA, Supabase persistence, and real-assistant staging integration validated
**Depends on:** [002 — Flutter cross-platform demo ordering](../002-mobile-demo-ordering/spec.md), [003 — Flutter Web PWA customer client](../003-flutter-web-pwa/spec.md), [006 — Demo kitchen order board](../006-demo-kitchen-order-board/spec.md)

## Goal

Publish the React website and Flutter Web/PWA client at separate public Cloudflare URLs for staging validation, while keeping Cloudflare usage at $0 and preserving the existing API and Supabase architecture.

## Staging behavior

- Build the existing Flutter Web app and publish its generated static files as an assets-only Cloudflare Worker on the account's Workers Free plan, using its `workers.dev` hostname. Do not add a custom domain, paid plan, paid add-on, container, or paid inference service.
- Point the Flutter app to the existing single-process Node API through a Cloudflare Quick Tunnel. Run it in production public-demo mode with the existing Supabase project `tityohurziwhqmlybvye` for menu, fictional demo orders, simulated kitchen events, and durable assistant coordination/accounting. Apply the repository migrations in order; retain RLS and service-role-only writes/RPC execution. Explicitly grant the API service role SELECT on the menu and SELECT/INSERT/UPDATE on orders; revoke public table privileges, including inherited TRUNCATE privileges. No payment or real fulfillment requests are permitted.
- Use the real OpenAI assistant defined by Spec 005, with server-only credentials, transient/redacted chat context, no automatic paid retries, global 45-second pacing, and the existing atomic US$1 per UTC day model-token cap. The user explicitly authorized this OpenAI spending on 2026-10-25; Cloudflare and Supabase infrastructure must remain on free tiers. No deterministic fake assistant is allowed in this staging runtime.
- Load runtime secrets from environment, an ignored local staging environment file, or transient vault injection. Never embed keys in the PWA, deployment assets, configuration committed to Git, or logs. Refuse to start staging when Supabase or real-assistant configuration is incomplete; do not fall back to memory/fake mode.
- The public Quick Tunnel URL is temporary and accessible to anyone who has it. It only exposes the public-demo API; keep the tunnel and local API running while staging is in use, and stop them when staging is no longer needed. The PWA's API calls will fail while the tunnel or local API is stopped.
- Keep all Cloudflare environment configuration, build scripts, and output scoped to this staging deployment. Do not change production configuration or deploy the Node API as a Worker.

- Publish the React website as a separate assets-only Worker named `last-slice-web-staging`, including the `/kitchen` SPA route. Build `apps/web/` with `VITE_API_URL` set to the same HTTPS staging API used by the PWA. Keep its generated files and Cloudflare configuration under `deploy/cloudflare-web/`; never include database/provider secrets.

## Acceptance criteria

- [x] The Flutter Web release build and Cloudflare assets-only dry run succeed with a caller-supplied HTTPS API origin.
- [x] The published PWA is served from a `workers.dev` URL without adding a custom domain or paid Cloudflare resource.
- [x] The PWA loads its menu and completes a fictional public-demo checkout through the HTTPS Quick Tunnel while the local public API is running.
- [x] Both locales, manifest, icons, service worker, and standalone startup shell are present at the staging URL.
- [x] Initial static/PWA validation used Workers Free with no paid services.
- [x] The staging API loads the hosted Supabase menu, persists a fictional order across restart, and exposes only the privacy-limited public snapshot.
- [x] Hosted cleanup scheduling and RLS/RPC restrictions are verified.
- [x] A real assistant request completes through the staging HTTPS API and records its token charge in the durable ledger; replaying the request does not create another paid attempt.
- [x] Runtime credentials remain server-only; missing configuration fails closed. Cloudflare/Supabase stay on free tiers; only the authorized OpenAI model calls incur costs within the existing US$1/day cap.

- [x] The React website is published on Workers Free at its own staging URL; menu and `/kitchen` load through the shared staging API, and SPA navigation/assets work over HTTPS.

## Non-goals

- A persistent, highly available staging API or a permanent public tunnel.
- Changing the API runtime, replacing Supabase, creating a new Supabase project, or storing credentials in Cloudflare.
- Testing multiple iOS devices/versions; validation used an iPhone 16 on iOS 26.5.
- Production deployment, custom domain, real payment, identity collection, or real fulfillment.

## Device validation

- TestKase Device Farm opened the staging PWA in an iPhone 16 session (iOS 26.5). The menu loaded through the HTTPS Quick Tunnel, the locale toggle displayed both languages, a Calabresa medium pizza was added to the bag, and the fictional checkout returned a demo order confirmation. The screen identified the checkout as demo-only with no real payment or delivery.
- A repeat TestKase session on 2026-10-25 (`45798ffb-bc04-401c-a67f-1054da3ccf51`) revealed Add to Home Screen by scrolling the collapsed Safari Share sheet. Open as Web App was enabled. Installation created the Last Slice Home Screen icon, and launching it loaded the Portuguese Flutter menu in standalone mode without Safari browser controls. The session was ended after validation.

## Integration validation

The device checks above used the initial in-memory/fake-assistant stage. They do not establish the hosted database or real-assistant acceptance criteria added on 2026-10-25. Record those results separately after integration.

### Hosted database setup (2026-10-25)

Applied to `tityohurziwhqmlybvye` via the project-scoped Supabase MCP:

| Repository migration | Hosted version |
| --- | --- |
| `202610220001_demo_ordering.sql` | `20261025215343` |
| `202610220002_kitchen_order_status.sql` | `20261025215347` |
| `202610240001_assistant_budget_queue.sql` | `20261025215351` |
| `202610240002_public_demo_simulation.sql` | `20261025215354` |
| `20261025215700_staging_server_grants.sql` | `20261025215724` |

The MCP generated its own history versions. These files are already applied; reconcile migration history before running a CLI push/pull rather than replaying them under their repository timestamps.

- Five menu rows and all seven RLS-enabled tables are present. The public snapshot RPC reports Supabase persistence.
- Hosted service-role execution initially exposed missing direct SQL privileges on the original menu/orders tables. The additive grant migration explicitly grants menu SELECT and order SELECT/INSERT/UPDATE, revokes public privileges (including default TRUNCATE), and leaves RLS enabled. The new regression test exercises service-role reads and denies public SELECT/TRUNCATE.
- Hosted service-role menu reads, order creation, lookup, and idempotent replay passed in a transaction that was rolled back. No probe order remains.
- All six assistant/kitchen RPCs deny execution to `anon` and `authenticated` and allow `service_role`. Security advisors report only seven informational RLS-without-policy findings, consistent with server-only table access; no warning/error findings were returned.
- `last-slice-demo-cleanup` is active on `*/5 * * * *`; its 2026-10-25 21:55 UTC run succeeded and updated `last_cleanup_at`.
- `npm run build` passed; all 16 API/SQL tests passed after the grant migration. JavaScript/Python launcher syntax checks passed, and missing-configuration startup was rejected.

### Runtime activation

`npm run start:api:staging` is prepared to load server credentials from environment or ignored `.env.staging`, enforce the agreed Supabase project and real OpenAI model/provider, and start the production public-demo API. The vault launcher supports the supplied `OPENAI_API_KEY` and `SUPABASE_KEY` entry names through `SUPABASE_VAULT_ENTRY=SUPABASE_KEY`.

The WNT vault workflow resolved access through its documented user-space runtime configuration (`~/.wnt/runtime/codex-env.yaml`). The dedicated Supabase server key named `last_slice_staging` was created in the dashboard and saved into the `SUPABASE_KEY` KeePassXC entry. A direct hosted menu read and vault read-back verified the credential. The OpenAI credential uses the existing `OPENAI_API_KEY` entry. Neither raw key was emitted or saved in repository/runtime environment files; the browser-to-vault transfer used temporary encryption, whose private transfer key was removed afterward.

### Active staging verification (2026-10-25)

- The production public-demo API runs on local port 3002 with Supabase persistence and the real OpenAI provider. This is separate from the local development API on port 3001. Both credentials were injected from KeePassXC into process memory.
- HTTPS API origin: `https://have-variation-lit-exhibitions.trycloudflare.com`. `/config` reports `publicDemo: true`, `persistence: "supabase"`; both localized menus return all five flavors.
- A configured Calabresa Grande delivery order returned R$ 87,00. A repeat submission reused the order code. The order appeared in the privacy-limited public kitchen snapshot; public PATCH returned 403. Stopping/restarting the staging API retained the order and its later server-simulated status through HTTPS lookup.
- One real English menu question completed through `/assistant/messages` and ticket polling with `mode: provider`. The repeated submission reused the completed request. The hosted ledger contains exactly one settled attempt for request `d7a694cf-ec88-43f9-a566-2ba2dfc5ae84`, with `charge_nano: 46750` (US$0.00004675); no duplicate paid attempt was created. Chat content was not written into the ledger. The existing model, global 45-second pacing, and US$1 per UTC day cap were retained. The documented GPT-5 nano input/output rates were rechecked against official OpenAI documentation before the live probe.
- Flutter release build and Cloudflare deployment dry run passed. Deployed Worker version `e6510b60-e011-425f-868c-94dc32e9e0c5` serves `https://last-slice-pwa-staging.hriccio.workers.dev/` with the new HTTPS API origin. Reloading the deployed PWA showed the hosted Portuguese menu. A scan of both Flutter and deployed assets found neither runtime credential.
- Supabase's dashboard identifies the organization as Free. Cloudflare remains the same assets-only Workers Free deployment; no plan upgrades or paid infrastructure were provisioned. Only the explicitly authorized OpenAI call incurred model-token charges.
- The staging API and Quick Tunnel are intentionally left running for use. They depend on this workstation and these local processes; this is not persistent API hosting. Orders expire under the existing 24-hour cleanup policy, and assistant payload/results remain transient as specified.

This validates the staging integrations. It does not certify production hosting availability or complete the separate infrastructure/provider log-retention and public-launch review in Specs 005/006.


### React website staging (2026-10-25)

- Published `https://last-slice-web-staging.hriccio.workers.dev/` as a separate assets-only Worker on the same account, version `d01b8523-a2dd-4c3e-afc8-27ab5f6894f4`. The Flutter PWA remains at its existing URL.
- The React build uses the same HTTPS API origin (`https://have-variation-lit-exhibitions.trycloudflare.com`), Supabase database, and real-assistant queue/accounting policy as the PWA. No new API, database, paid plan, or infrastructure binding was added.
- Built the shared contracts and React production bundle and passed the Cloudflare deployment dry run. The homepage, `/kitchen` SPA fallback, all referenced JavaScript/CSS, a local font stylesheet, and a local image returned HTTP 200 with appropriate content types.
- Completed browse → customize → cart → fictional pickup checkout in the deployed Portuguese React app. Confirmation returned order `LS-E4ACBCABC12ABA`, R$ 49,00, demo-only notices, and status Received. Supabase confirmed the persisted order. Switching to English rendered the confirmation in English and observed server status Confirmed. The deployed `/kitchen` page showed that shared order and simulated staff messages without visitor mutation controls.
- The deployed static assets contain neither Supabase nor OpenAI runtime credential. No additional paid assistant call was needed for this website deployment; it uses the already-validated shared staging endpoint.
- Repeat using `STAGING_API_BASE_URL=<current HTTPS tunnel origin> npm run deploy:cf:web:staging:dry-run`, then `npm --prefix deploy/cloudflare-web run deploy:staging -- --prebuilt` after inspecting the dry run. The deployment package has the same pinned Cloudflare toolchain as the PWA package. Generated assets remain ignored.
