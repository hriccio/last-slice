# 008 — Free Cloudflare staging for web and Flutter PWA validation

**Status:** Cloudflare-hosted API and both clients deployed; validation evidence and remaining device/resource checks recorded
**Depends on:** [002 — Flutter cross-platform demo ordering](../002-mobile-demo-ordering/spec.md), [003 — Flutter Web PWA customer client](../003-flutter-web-pwa/spec.md), [006 — Demo kitchen order board](../006-demo-kitchen-order-board/spec.md)

## Goal

Publish the React website and Flutter Web/PWA client at separate public Cloudflare URLs for staging validation, while keeping Cloudflare usage at $0 and preserving the existing API and Supabase architecture.

## Original staging behavior (historical baseline)

The Cloudflare-hosted API revision below defines the proposed replacement. Earlier deployment records and checked acceptance criteria describe the tunnel deployment only; they do not establish Worker compatibility or completion of the revision.

## Original requirements

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
| `202610300001_weekly_pizza_sales.sql` | `202610300001` |

The MCP generated its own history versions. These files are already applied; reconcile migration history before running a CLI push/pull rather than replaying them under their repository timestamps.

### Weekly pizza recommendations (2026-10-30)

- Applied `202610300001_weekly_pizza_sales.sql` to `tityohurziwhqmlybvye` through the SQL Editor in the `wastingnotime` Brave profile. Verified the aggregate table, completed-order trigger, service-role read access, and denied `anon` read access. Recorded version `202610300001` in `supabase_migrations.schema_migrations`.
- Deployed API Worker version `309f5c19-c583-401d-b1a3-5c741a018a85` at `https://last-slice-api-staging.hriccio.workers.dev`, Flutter PWA version `f1bd56e5-3cb3-483d-8e68-bfaa5484bfcd`, and React Worker version `80a88f36-0bc2-41e3-a90f-b04adbe4f96e`. Both client bundles use the stable API Worker origin.
- Verified the live API's public-demo/Supabase configuration and `pt-BR` and `en-US` menu reads. The live database has no completed public demo orders in the current seven-day window yet, so no popularity claim is shown until a demo order completes.
- Local checks: `npm run build`, `npm run test:api` (26 passing), both client/API deployment dry runs, and `npm run test:cf:api:staging` passed. A live malformed recommendation request reached ordinary request validation after aggregate lookup and created no paid model attempt.

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


### Spec 009 staging update (2026-10-25)

Both frontend staging builds and the Supabase-backed Node API now support [reviewed assistant cart proposals](../009-assistant-cart-configuration/spec.md). The deployed React journey applied a real model proposal and then completed the separate explicit fictional checkout. Real Portuguese add and English update probes passed with duplicate confirmation returning the same result. Three model attempts cost US$0.00034870 total; no paid model calls occur during confirmation. The existing global budget/pacing and infrastructure tiers are retained. See [Spec 009 validation](../009-assistant-cart-configuration/validation.md) for full evidence.

## Website link previews

When a visitor shares the React staging homepage, crawlers must receive Open Graph title, description, canonical staging URL, locale, and an absolute HTTPS image URL in the initial HTML without JavaScript or API access. The static preview uses bilingual Portuguese/English demo wording because link crawlers do not have the visitor’s locale preference. The image reuses the licensed illustrative pizza photography, served locally as a 1200 × 630 JPEG below 5 MB.

Acceptance: a LinkedInBot request returns HTTP 200 with these tags, and its image returns HTTP 200 with image/jpeg and the declared dimensions. Redeployment must preserve the current API origin and public Turnstile site key. Refresh the URL in LinkedIn Post Inspector after deployment when an authenticated LinkedIn session is available.

Non-goals: per-order previews, crawler-specific rendering, new image services, or changes to ordering and PWA behavior.

### Link preview validation (2026-10-26)

- React TypeScript/Vite build and Cloudflare deployment dry run passed. Deployed web Worker version `94cd3897-1301-494f-bbfa-9165c4b5d5aa`; retained the existing API origin and public Turnstile key.
- Live requests using `LinkedInBot/1.0` receive the Open Graph tags in initial HTML and the declared JPEG (HTTP 200, 1200 × 630, 110305 bytes).
- Requested a fresh scrape in the authenticated LinkedIn Post Inspector. LinkedIn still reports “Unable to connect to server. Bad DNS, bad gateway, or invalid server address.” Its redirect trail shows `0 undefined`, so no successful LinkedIn fetch or thumbnail is established. Missing metadata is fixed, but a separate LinkedIn-to-staging connectivity issue remains; the inspector does not identify its precise cause. No hosting/domain changes were made.


## Cloudflare-hosted API revision (2026-10-27)

**Status:** Implemented and deployed on Workers Free. See [hosted validation](worker-validation.md) for evidence and remaining device/resource checks.

### Goal and scope decision

Host the shared public-demo API on Cloudflare Workers so the React website and Flutter PWA remain usable when the developer workstation, local Node process, or Quick Tunnel is stopped. Retain the existing Supabase project and API-owned business rules. Target Cloudflare Workers Free without activating a paid plan or paid add-ons.

For this revision, Worker hosting supersedes the original requirements to use a local single-process API and Quick Tunnel and the prohibition on deploying the API as a Worker. It also supersedes Spec 010's Worker-runtime non-goal for this migration only. Existing validation records remain historical evidence. All product, privacy, localization, demo-only transaction, and abuse-control requirements continue to apply.

The implementation design is recorded in [Hosted API execution design](worker-design.md), including transient ownership, scheduling, limiter scope, contract amendments, and capacity estimates.

### User flows

1. A customer opens either existing staging client and browses the localized menu through a stable HTTPS API origin on `workers.dev`.
2. The customer customizes a cart, receives an authoritative quote, passes the existing browser challenge, and explicitly submits a fictional order. Confirmation and tracking survive Worker replacement because order state remains in Supabase.
3. The shared kitchen shows server-simulated progress without depending on an open browser or workstation.
4. The customer optionally sends an assistant message, waits or cancels, retrieves the response, and reviews/applies a cart proposal before separately submitting checkout. Existing localized capacity, expiry, and unavailable states remain recoverable.
5. Closing the developer's terminal or shutting down the workstation has no effect on these deployed flows.

### Requirements

- Deploy API code from `apps/api/`, retaining shared contracts in `packages/contracts/`. Adapt server entrypoints and execution lifecycle to Workers; do not deploy a local tunnel, always-running Node server, container, or substitute database. Preserve local development support.
- Use a stable API Worker hostname. Rebuild and redeploy both clients with that origin and the existing public Turnstile key. Preserve the two client URLs, locales (`pt-BR`, `en-US`), kitchen route, link previews, and fictional checkout notices.
- Keep the agreed Supabase project, server-only data access, RLS, restricted RPC grants, order idempotency, privacy-limited snapshots, cleanup/expiry policy, and authoritative pricing/validation. Any required SQL changes must be additive and reviewed; reconcile existing hosted migration history before applying them.
- Put Supabase, OpenAI, and Turnstile server secrets in the deployed runtime secret store through secure runtime injection. This narrowly extends Spec 005's local vault-to-process injection rule to the Worker secret store; never copy secrets or vault credentials into source, build artifacts, frontend configuration, logs, or validation evidence. Missing/invalid configuration fails closed without fake-assistant or memory-database fallback.
- Preserve Spec 010's origin allowlist, server-side Turnstile verification, no-Origin native-client compatibility, localized failures, and bounded rate limits. Do not rely on an isolate-local counter for a claimed global limit. Document each limiter's scope and validate its behavior across concurrent isolates; Supabase remains authoritative for global assistant budget and dispatch coordination.
- Replace process timers with a supported hosted execution mechanism for simulated kitchen progress and cleanup. Preserve the existing status timing contract, atomic transitions, expiry, and catch-up after idle periods; scheduled execution must not depend on client traffic. Do not claim five-second scheduling from a minute-granularity trigger. Verify any retained Supabase cleanup schedule rather than duplicating it blindly.
- Preserve the full Spec 005 queue/budget contract and Spec 009 proposal contract: global FIFO/capacity, presence leases, cancellation, token bounds, one logical running request, 45-second pacing, atomic US$1 per UTC day accounting, idempotent settlement, no automatic paid retries, proposal ownership/expiry, and explicit customer confirmation. OpenAI costs remain separately authorized within that existing cap.
- Worker memory and timers are not durable or shared. Before implementation proceeds beyond a compatibility prototype, record a concrete execution/coordination design for queued messages, in-flight calls, ticket/reply retrieval, and proposal confirmation across isolates. State how transient content reaches its owner and how eviction, deployment, cancellation, and ambiguous provider outcomes fail safely. Never introduce chat/proposal persistence, provider replay, or relaxed privacy/queue semantics implicitly; a design requiring those changes must revise the affected specs first. Losing transient content may produce the existing recoverable expiry/unavailable state, but ordinary requests reaching different isolates must not routinely break the assistant flow.
- Inspect request CPU usage, bundle size, memory, subrequests, provider request duration, background execution lifetime, scheduling, and all selected binding quotas against current official documentation. Exact token accounting is mandatory; do not remove it merely to fit the free CPU limit. Measure representative assistant and checkout paths before declaring free-tier suitability.
- Remain on Workers Free. Free quotas are capacity limits, not an authorization to upgrade or incur overage charges. If any required behavior cannot fit the free tier, record the failed gate and proposed alternatives for a separate scope decision; do not ship a reduced assistant or silently activate paid infrastructure. Account for polling and scheduled work in the capacity estimate. This revision does not promise unlimited availability or an SLA.

### Acceptance criteria

- [x] A compatibility/design record identifies the hosted request handler, scheduling mechanism, transient-content ownership/routing, limiter scope, failure handling, and free-tier eligibility of every required Cloudflare resource. Any needed changes to Specs 005/006/009/010 are explicit before implementation.
- [x] API/contracts builds and relevant API tests pass for the Worker adapter; local development still works. Deployment dry run confirms compatible dependencies and bundle limits.
- [ ] Representative menu, quote, checkout, tracking, kitchen, assistant, and proposal requests fit measured free-tier execution limits. Record current quota sources, observed usage, and an estimated daily request budget including polling/scheduled work. No paid resource or plan is enabled.
- [ ] With local API and tunnel stopped, both deployed clients complete browse → customize → fictional checkout → tracking in both locales against the stable API origin; kitchen progression and expiry continue without visitors or workstation processes.
- [x] Allowed/disallowed origins, challenge success/failure, missing-secret failure, read/write separation, native no-Origin compatibility, rate-limit responses, and concurrent-isolate behavior pass focused checks. Invalid challenges create no protected operation.
- [x] Deterministic tests cover queue ordering, concurrent dispatch, duplicate sends/polls, cancellation, lease expiry, isolate eviction/replacement, UTC rollover, unknown provider outcome, proposal ownership/expiry, and duplicate confirmation. No case creates an automatic extra paid attempt or bypasses global budget/pacing.
- [x] A bounded live assistant probe retrieves a real response and confirms a reviewed proposal through the deployed API; duplicate requests add no paid attempt. Record sanitized ledger evidence and actual token charges within the existing cap.
- [x] Deployment replacement preserves stored orders and safely handles transient assistant state. Frontend artifacts and logs contain no server secrets or raw chat content.
- [x] Record Worker versions, stable origin, quota measurements, checks run/not run, and remaining limitations in a new validation section. Update README startup/deployment guidance to distinguish hosted staging from local development. Mark this revision implemented only after these gates pass.

### Cutover and recovery

Validate the API Worker before rebuilding either client. Deploy both clients against the verified origin, then check complete journeys before retiring temporary tunnel processes. Retain the previous client/API versions for rollback. A rollback to tunnel staging requires explicitly restoring both local processes and the matching client API origin; it does not restore independent hosting. Do not report a temporary tunnel fallback as completion of this revision.

### Explicit non-goals

- Paid Cloudflare plans, Containers, new paid infrastructure, or new Supabase projects.
- Changing assistant provider/model, increasing its budget, or weakening privacy to simplify hosting.
- New customer features, authentication, real payments, real fulfillment, custom domains, or production availability guarantees.

### Pricing reference

Cloudflare's [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) and [platform limits](https://developers.cloudflare.com/workers/platform/limits/) were consulted on 2026-10-27: Free currently allows 100,000 Worker requests per day and 10 ms CPU per invocation; network waiting is distinct from CPU time. These are planning constraints, not evidence that this API fits. Recheck documentation and account configuration during implementation. No migration, deployment, or live paid probe was performed for this specification revision.


Hosted migration evidence: [2026-10-27 validation](worker-validation.md). Unchecked hosted acceptance items remain open where full PWA device journeys or broader resource measurements have not been established; original tunnel checks are historical only.
