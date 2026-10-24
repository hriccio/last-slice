# The Last Slice

The Last Slice is a fictional pizzeria ordering demo. The web app supports Brazilian Portuguese (`pt-BR`) and US English (`en-US`), with structured customization and checkout as the primary flow. Orders, payments, and fulfillment are simulated.

## Run locally

Requirements: Node.js 20+ and npm. From the repository root:

```sh
npm install
make dev
```

This starts the API at `http://localhost:3001` and web app at `http://localhost:5173`. Without Supabase credentials, the API keeps demo orders in memory for local preview. For persisted demo orders, create a Supabase project, apply `supabase/migrations/202610220001_demo_ordering.sql` and then `supabase/migrations/202610220002_kitchen_order_status.sql`, then start the API with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in the environment. Keep the service role key private. The API may be pointed at a different URL with `VITE_API_URL` when building the web client.

## Build

```sh
npm run build
```

## Flutter app and PWA

`apps/mobile/` is a separate Flutter client alongside the React website in `apps/web/`. The Flutter client targets the browser as an installable PWA and shares its Dart UI/API client with future Android and iOS builds. It needs Flutter with Dart 3.4 or newer. The web app shell and manifest are in `apps/mobile/web/`; a debug Android runner is checked in; an iOS runner is not part of this slice.

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

### Demo kitchen board

The operator board is available at `http://localhost:5173/kitchen`. It requires a server-side demo token; start the dev stack with a token of your choice:

```sh
KITCHEN_BOARD_TOKEN=choose-a-local-demo-token make dev
```

Enter the same token in the board. It is held in browser memory only and is cleared when the page reloads or the operator signs out. Do not expose a publicly reachable demo board with a shared token or use this access method for real restaurant operations. With Supabase configured, status changes persist across API restarts; without it, orders and status changes exist only for the API process lifetime.

## Contextual assistant

The optional assistant is available from menu browsing, customization, cart, and checkout in the React and Flutter clients. It only provides information; customers make and review all selections in the ordering controls. Assistant conversation text is not persisted or written to order records.

Local API development uses a deterministic fake assistant by default. The interface identifies these responses as a development preview and does not need provider credentials. To connect a server-side provider adapter, configure the API process with an OpenAI-compatible chat completions endpoint and runtime secrets:

```sh
ASSISTANT_PROVIDER=openai-compatible \
ASSISTANT_API_URL=https://provider.example/v1/chat/completions \
ASSISTANT_API_KEY=replace-with-server-only-key \
ASSISTANT_MODEL=replace-with-model-id \
npm run dev:api
```

Never place these settings in the web or Flutter client configuration. The endpoint accepts at most 24 KB per request, 1,200 UTF-8 bytes per message, and 10 history messages; provider calls time out after 8 seconds and replies are limited to 4 KB. It excludes checkout contact and delivery fields from provider context and scrubs common personal-detail patterns from message history. Before enabling an external provider, review its data processing and retention settings. In production, configure a supported provider explicitly; the API returns a recoverable unavailable response if no provider is configured.
