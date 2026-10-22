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

## Flutter mobile app

The Flutter app source lives in `apps/mobile/` and uses the same API as the web demo. It needs a Flutter SDK with Dart 3.4 or newer and Android or iOS platform tooling. Native platform runner files are not checked in yet; generate the Android and iOS runners with Flutter before launching the app.

Set `API_BASE_URL` at build time when running on a physical device, using the development computer's LAN address. The app defaults to `http://10.0.2.2:3001` on Android emulators and `http://localhost:3001` on iOS simulators. Use HTTPS for production origins. The mobile app never connects directly to Supabase.

## Structure

- `apps/web/`: responsive React + TypeScript customer ordering site
- `apps/mobile/`: Flutter customer ordering app source
- `apps/api/`: HTTP API for menu, authoritative pricing, order creation, and tracking
- `packages/contracts/`: shared domain and API types, menu fixtures, and pricing validation
- `supabase/migrations/`: demo menu schema and seed data, plus private demo order storage
- `specs/`: product contracts and feature specifications

The API does not return customer contact or address data from order tracking. No payment credentials are collected.
