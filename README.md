# The Last Slice

The Last Slice is a fictional pizzeria ordering demo. The web app supports Brazilian Portuguese (`pt-BR`) and US English (`en-US`), with structured customization and checkout as the primary flow. Orders, payments, and fulfillment are simulated.

## Run locally

Requirements: Node.js 20+ and npm. From the repository root:

```sh
npm install
make dev
```

This starts the API at `http://localhost:3001` and React at `http://localhost:5173`, using the legacy private/manual kitchen and labeled fake assistant for ordinary local development.

For the new public demo, use:

```sh
make dev-public
# With the real vault-backed assistant and configured Supabase:
make dev-public-ai
```

Public mode uses fictional checkout details, a shared read-only `/kitchen`, randomized server-side preparation, and a simulated staff conversation. No visitor registration, contact details, or staff token are needed. The local memory preview is temporary; restarting the API clears its orders.

For durable demo data and paid AI, configure a Supabase project and apply every file in `supabase/migrations/` in filename order. Supply `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only to the API runtime. `202610240001_assistant_budget_queue.sql` installs the private budget/queue coordinator; `202610240002_public_demo_simulation.sql` adds source isolation, preparation scheduling, staff events, expiry, and a five-minute cleanup job when Supabase's `pg_cron` extension is available. The API also cleans expired demo rows every minute while running. Verify the named `last-slice-demo-cleanup` job before public launch.

`NODE_ENV=production` requires Supabase and public-demo mode; it cannot open the manual operator path. Public mutations of kitchen state return `403 kitchen_read_only`, even with an old operator token. Paid AI additionally requires the accepted OpenAI configuration and durable accounting. All secrets belong in the runtime secret store, not a client bundle or committed `.env`. See `.env.example` for placeholders. Set `VITE_API_URL` for the React build and `API_BASE_URL` for Flutter; use HTTPS for published clients/API.

## Build

```sh
npm run build
```

## Flutter app and PWA

`apps/mobile/` is a separate Flutter client alongside the React website in `apps/web/`. The Flutter client delivers an installable PWA for iOS and Android browsers and shares its Dart UI/API client with the native Android app. Native iOS builds are outside delivery scope. It needs Flutter with Dart 3.4 or newer. The web app shell and manifest are in `apps/mobile/web/`; a debug Android runner is checked in; an iOS runner is outside delivery scope.

Start Flutter from the repository root after starting the API with `make dev`:

```sh
make flutter
```

`make flutter-local` is an alias. These targets run only Flutter, so they do not start a duplicate API process. If Flutter is not on your `PATH`, load your local Flutter setup first (for example, `source ~/scripts/mybashrc`). The target fetches dependencies, enables Flutter web support in its local configuration, and launches Chrome. Chromium is the default browser executable; override it or the API URL as needed:

```sh
make flutter CHROME_EXECUTABLE=/path/to/chromium API_BASE_URL=http://localhost:3001
```

Use `make flutter-web-server` when Chrome cannot be launched directly, or `make flutter-build-web` to create a release build.

Serve the generated `apps/mobile/build/web/` over HTTPS for installation outside localhost. Ordering still requires a connection to the API; offline ordering is not part of this demo.

### Android emulator

Install Flutter, Android Studio, an Android SDK, and an emulator. In Android Studio, open **Tools → SDK Manager → SDK Tools**, select **Android SDK Command-line Tools (latest)**, and apply the change. This installs `sdkmanager`, which Flutter needs to manage SDK licenses and packages. Then accept the SDK licenses interactively with Flutter:

```sh
flutter doctor --android-licenses
```

Review and accept the requested licenses, including the NDK license, then start the API:

```sh
make dev
```

List available emulators with `flutter emulators`, start one with `flutter emulators --launch <emulator-id>`, and run the app from the repository root:

```sh
make android
```

The emulator uses `http://10.0.2.2:3001` to reach the development API on the host. Override this for another target with `make android ANDROID_API_BASE_URL=http://<host-address>:3001`. To build a locally installable debug APK:

```sh
make android-build
```

The APK is written to `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`. Android internet access is enabled for the app; local HTTP traffic is allowed in debug builds only. Production builds must use an HTTPS API URL. Android's application id is `com.lastslice.demo`; this slice does not configure release signing or store distribution. The Flutter client never connects directly to Supabase.

## Structure

- `apps/web/`: responsive React + TypeScript customer ordering site
- `apps/mobile/`: Flutter customer ordering app and PWA source
- `apps/api/`: HTTP API for menu, authoritative pricing, order creation, and tracking
- `packages/contracts/`: shared domain and API types, menu fixtures, and pricing validation
- `supabase/migrations/`: demo menu schema and seed data, plus private demo order storage
- `specs/`: product contracts and feature specifications

The API does not return customer contact or address data from order tracking. No payment credentials are collected.

### Public kitchen board

Open `http://localhost:5173/kitchen` after `make dev-public`. Everyone sees the same fictional orders and read-only staff feed. Fake staff advance statuses in the API, using randomized bounded stage delays, independently of open browsers. Board and tracking refresh while visible. Both the board and staff feed retain their last successful snapshot on connection failures; scrolling up in the staff conversation is preserved when new messages arrive.

Public orders expire after 24 hours; queries exclude expired data immediately, and the scheduled/API cleanup removes it. Older manual-mode records are excluded from all public reads. Staff messages use reviewed localized templates and never consume paid AI requests. Images and fonts are served locally; [asset provenance and licenses](apps/web/public/ASSET-CREDITS.md) are included.

For private local development only, `make dev` plus `KITCHEN_BOARD_TOKEN` retains the earlier manual board. That token is held in browser memory and cannot authorize writes in public mode.

## Customer order tracking

Choose **Track an order** from the React website or Flutter menu, or continue directly from confirmation with the order code already populated. Confirmation and tracking check the API every 15 seconds after the previous check finishes while visible. Checks pause when the view is hidden or covered, and resume with a fresh lookup. Completed and cancelled demo orders stop polling; manual refresh remains available. Failed refreshes keep the last loaded order and offer a retry.

The timeline follows pickup or delivery and shows the current server status, rather than a historical event log. Its update time describes only the current status. Preparation, payment, pickup, and delivery remain simulated.

Run the tracking regression checks from the repository root:

```sh
npx playwright install chromium
npm run test:tracking
cd apps/mobile
flutter test
flutter analyze
```

To use an installed Chromium instead of downloading the test browser, run `CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:tracking`. The browser tests start their own web server on port 5179 and use controlled API responses; the API tests start isolated processes and a Supabase response fixture without real credentials. See the [spec 007 acceptance record](specs/007-customer-order-tracking/validation.md) for build and device validation.

## Contextual assistant

The optional assistant is available from menu browsing, customization, cart, and checkout in the React and Flutter clients. It answers menu questions and can propose configured pizzas or cart-line updates/removals. Customers review the API-validated proposal and select Apply to cart; the assistant never submits checkout. Direct ordering controls remain available. Assistant conversation text is not persisted or written to order records.

Local API development uses a deterministic fake assistant by default. The interface identifies these responses as a development preview and does not need provider credentials. For paid public use, use the vault-backed OpenAI launcher described below. An OpenAI-compatible endpoint is available only for controlled local tests.

Never place these settings in the web or Flutter client configuration. The endpoint accepts at most 24 KB per request, 1,200 UTF-8 bytes per message, and 10 history messages; provider calls time out after 8 seconds and replies are limited to 4 KB. It excludes checkout contact and delivery fields from provider context and scrubs common personal-detail patterns from message history. Before enabling an external provider, review its data processing and retention settings. In production, configure a supported provider explicitly; the API returns a recoverable unavailable response if no provider is configured.

The customer assistant uses the accepted GPT-5 nano snapshot with the existing `OPENAI_API_KEY` vault entry. Apply `supabase/migrations/202610240001_assistant_budget_queue.sql`, configure the Supabase API environment and your existing `CODEX_KC_VAULT` / `CODEX_KC_SECRET` vault session, then use `make dev-ai` for API plus React or `make api-ai` for API only. The launcher injects the provider credential into the API child at runtime and removes the vault password from that child's environment. The client never receives it. Paid work is unavailable without durable Supabase accounting; `make dev` keeps the clearly labeled local fake.

The [public chat queue](specs/005-contextual-ai-assistant/queue-budget.md) caps application model-token spending at US$1/day, reserves US$0.00052 per worst-case attempt, and offers one global answer slot every 45 seconds. Chat shows queue position, estimated reply time, and a recent measured average after five completed samples. The first request may start immediately. Cancellation before dispatch is free of provider calls; timeout or unknown usage retains the full reservation. Customer messages and replies stay in bounded process memory; the database holds only accounting/coordination metadata. The initial demo requires one API process for volatile request/reply retrieval; overlapping processes still share the same atomic spending/slot ledger. See [assistant validation](specs/005-contextual-ai-assistant/validation.md).

Run API/SQL regression checks with `npm run test:api`, browser checks with `CHROMIUM_EXECUTABLE=/path/to/chromium npx playwright test`, and Flutter widget checks with `flutter test` from `apps/mobile`. These use controlled clocks/provider usage for budget boundaries instead of paid load tests.

See the [integrated release validation](specs/release-validation.md) for acceptance evidence and remaining deployment checks.

## Supabase and real-assistant staging

Staging uses the existing Supabase project `tityohurziwhqmlybvye`, the production-mode Node API, and the real OpenAI assistant with the durable US$1 per UTC day model-token cap. Cloudflare/Supabase infrastructure stays on free tiers. The API remains a single local process exposed through a temporary Cloudflare Quick Tunnel; staging is available only while both processes run.

Apply all `supabase/migrations/` files in order before starting, including the staging service-role grant migration. They seed the menu, enable RLS, restrict privileged RPC execution to the server, and schedule public-demo cleanup every five minutes when pg_cron is available. The initial MCP application on 2026-10-25 recorded server-generated migration versions; see Spec 008 for the mapping before using CLI migration push/pull against this project.

Provide `SUPABASE_URL=https://tityohurziwhqmlybvye.supabase.co`, `SUPABASE_SERVICE_ROLE_KEY`, and `ASSISTANT_API_KEY` through the environment or an ignored root `.env.staging` file. The staging launcher also accepts `SUPABASE_KEY` and `OPENAI_API_KEY` aliases. The database key must be a server secret or this project's service-role key; public/anon keys are rejected. Never supply either secret to customer builds. Then run:

```sh
npm run build
npm run start:api:staging
```

The launcher requires the agreed project and real OpenAI provider/model, forces production public-demo mode, and rejects missing configuration. It reads `.env.staging` without replacing existing environment values. For vault-backed injection from `OPENAI_API_KEY` and `SUPABASE_KEY`, configure `CODEX_KC_VAULT` / `CODEX_KC_SECRET` and run:

```sh
SUPABASE_URL=https://tityohurziwhqmlybvye.supabase.co \
SUPABASE_VAULT_ENTRY=SUPABASE_KEY \
python3 scripts/run-api-with-vault.py npm run start:api:staging
```

Expose port 3001 through the existing Cloudflare Quick Tunnel workflow, then redeploy the PWA with `STAGING_API_BASE_URL` set to that tunnel's HTTPS origin. A new tunnel origin requires rebuilding/redeploying the PWA. Verify `/config` reports `publicDemo: true` and `persistence: "supabase"`, complete a fictional order, restart the API and retrieve the order, and verify one real assistant request plus its durable accounting. Keep kitchen write routes inaccessible publicly. No keys or raw chat text belong in validation records.


Staging integration was validated on 2026-10-25: hosted menu/order persistence, restart lookup, public kitchen read/write separation, and one real OpenAI response with durable cost settlement. The active staging API uses port 3002 and a temporary Quick Tunnel; the PWA remains at https://last-slice-pwa-staging.hriccio.workers.dev/. See [Spec 008](specs/008-free-cloudflare-staging/spec.md) for the current tunnel origin and validation record. The dedicated server credential is stored in the `SUPABASE_KEY` KeePassXC entry.


### React website staging

- Website: https://last-slice-web-staging.hriccio.workers.dev/
- Shared read-only kitchen: https://last-slice-web-staging.hriccio.workers.dev/kitchen
- Flutter PWA: https://last-slice-pwa-staging.hriccio.workers.dev/

Both clients use the same staging API, Supabase database, and real assistant with its existing shared US$1/day model-token cap. The local API and Quick Tunnel must stay running.

Install the separate static deployment toolchain once, then build and preview the upload:

```sh
npm --prefix deploy/cloudflare-web ci
STAGING_API_BASE_URL=https://your-current-api-tunnel.trycloudflare.com \
  npm run deploy:cf:web:staging:dry-run
npm --prefix deploy/cloudflare-web run deploy:staging -- --prebuilt
```

`npm run deploy:cf:web:staging` builds and publishes in one command when `STAGING_API_BASE_URL` is set. The React build receives only the public API origin through `VITE_API_URL`. Redeploy both clients whenever the temporary API tunnel origin changes.


### Assistant cart proposals (Spec 009)

Ask naturally, for example “Quero uma Calabresa grande, sem cebola e com bacon.” The assistant clarifies missing choices and shows a proposal with configuration and API-calculated cart total. Apply changes the cart; Adjust continues from the unapplied draft; Dismiss leaves the cart unchanged. Review demo order opens the ordinary checkout. Cart/menu changes, expiry, conversation ownership, and duplicate application are checked before confirmation.

This flow is shared by React, Flutter PWA, and native Android. Proposal confirmation uses the API without another model call or database cart table. All model requests still share the existing US$1/day ledger and 45-second dispatch pacing.
