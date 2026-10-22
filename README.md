# The Last Slice

The Last Slice is a fictional pizzeria ordering demo. The web app supports Brazilian Portuguese (`pt-BR`) and US English (`en-US`), with structured customization and checkout as the primary flow. Orders, payments, and fulfillment are simulated.

## Run locally

Requirements: Node.js 20+ and npm. From the repository root:

```sh
npm install
npm run dev
```

This starts the API at `http://localhost:3001` and web app at `http://localhost:5173`. Without Supabase credentials, the API keeps demo orders in memory for local preview. For persisted demo orders, create a Supabase project, apply `supabase/migrations/202610220001_demo_ordering.sql`, then start the API with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in the environment. Keep the service role key private. The API may be pointed at a different URL with `VITE_API_URL` when building the web client.

## Build

```sh
npm run build
```

## Flutter app and PWA

`apps/mobile/` is a separate Flutter client alongside the React website in `apps/web/`. The Flutter client targets the browser as an installable PWA and shares its Dart UI/API client with future Android and iOS builds. It needs Flutter with Dart 3.4 or newer. The web app shell and manifest are in `apps/mobile/web/`; a debug Android runner is checked in; an iOS runner is not part of this slice.

Start Flutter from the repository root after starting the API with your usual `npm run dev` command:

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

Install Flutter, Android Studio or the Android command-line tools, an Android SDK, and an emulator. Accept the SDK licenses, then start the API:

```sh
npm run dev
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
