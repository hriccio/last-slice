# 003 — Flutter Web PWA customer client

**Status:** Approved for implementation
**Depends on:** [000 — Product foundation](../000-foundation/spec.md), [001 — Web demo ordering journey](../001-web-demo-ordering/spec.md), [002 — Flutter cross-platform demo ordering](../002-mobile-demo-ordering/spec.md)

## Outcome

The Last Slice demonstrates two distinct customer clients: the React website in `apps/web/` and a Flutter app in `apps/mobile/`. This spec defines the Flutter app's browser target as an installable Progressive Web App (PWA). The same Dart ordering flow must be buildable for Android and iOS later; the PWA is not a wrapper around the React website.

## Scope

### Included

- A Flutter Web target in `apps/mobile/` that builds and runs the customer journey defined in spec 002.
- A web app shell and manifest that identify The Last Slice, use the established near-black/orange visual direction, and launch in standalone display mode when installed.
- 192px and 512px app icons, including a maskable 512px icon.
- Responsive layouts usable in desktop browsers and narrow phone viewports.
- Browser-compatible HTTP access to the existing TypeScript API, using its established menu, quote, order, and tracking operations.
- Local development in Chromium, with a browser-independent `web-server` option when Flutter does not discover a Chromium binary as Chrome.

### Excluded

- Replacing or merging the React website with Flutter.
- New menu, ordering, pricing, checkout, or tracking behavior beyond spec 002.
- Offline menu browsing, queued checkout, cached order submission, custom service-worker caching, or push notifications.
- Native Android/iOS packaging, signing, store submission, and platform-specific native features. The Dart app should remain portable to those targets, but their release setup is a later implementation step.
- AI chat, real payments, real fulfillment, and customer accounts.

## Product behavior

The Flutter web target uses the exact customer flow and business boundaries in spec 002. It starts at the localized menu, then supports customization, cart, checkout, demo confirmation, and status lookup. The browser client must not create a separate implementation of menu options, price rules, or order validation.

The experience must remain clear in both `pt-BR` and `en-US`. API failures preserve the customer's in-progress cart and form values and show localized recovery guidance. Order submission remains demo-only and requires an explicit customer action.

## PWA requirements

- Provide a valid web app manifest with the app name, short name, start URL, scope, standalone display mode, theme/background colors, and the required icons.
- Provide page metadata for viewport sizing, theme color, and Apple home-screen installation.
- Serve production builds from HTTPS. Localhost is acceptable for development.
- Installation must launch the same Flutter ordering experience as the browser version, without redirecting to the React site.
- The app requires network access to the API for menu loading, quotes, order submission, and tracking. Offline ordering is explicitly unsupported; do not imply that an order was submitted while offline.
- A service worker or offline asset cache is not required in this slice. If offline support is requested later, define its caching and order-retry semantics in a separate spec.

## API and platform configuration

- The Flutter Web build must not depend on `dart:io` in code reachable by the web compiler. Use a browser-compatible HTTP client for the API.
- The API origin is provided through the build-time `API_BASE_URL` value.
- The local browser default is `http://localhost:3001`. A deployed PWA build must point to the deployed API over HTTPS, and the API must permit the PWA origin through CORS.
- Do not embed Supabase URLs, service-role credentials, or other privileged backend credentials in the Flutter app.
- Menu, quote, order, and tracking request/response behavior is defined by specs 001 and 002; this spec adds no new business endpoints.

## Local developer flow

1. Start the TypeScript API using the monorepo's local development instructions.
2. Resolve Flutter's browser target using the installed Chrome-compatible browser. If Flutter does not detect Chromium, configure `CHROME_EXECUTABLE` to point to its executable, or run the app with Flutter's `web-server` device and open the reported local URL in Chromium.
3. Run the Flutter app against the local API with `API_BASE_URL=http://localhost:3001`.
4. Build a release web bundle with `flutter build web --release` and a production `API_BASE_URL`.
5. Serve the release bundle over HTTPS and confirm the manifest-based install flow in a supported browser.

The expected development command shape is:

```sh
cd apps/mobile
flutter pub get
CHROME_EXECUTABLE=/path/to/chromium flutter run -d chrome \
  --dart-define=API_BASE_URL=http://localhost:3001
```

If browser discovery remains unavailable, use:

```sh
flutter run -d web-server --dart-define=API_BASE_URL=http://localhost:3001
```

Flutter's `web-server` debugging mode may have reduced debugger support; it is a browser-launch fallback, not a different app target.

## Acceptance criteria

- [x] `flutter build web --release` compiles the same Flutter ordering source used by native targets.
- [x] The app launches in Chromium and loads the localized API menu.
- [ ] The app can complete the spec 002 ordering journey in both locales, including a demo order and status lookup.
- [x] Browser quote totals agree with the API, and no order can be presented as real payment or fulfillment.
- [x] The web manifest parses and contains the required app metadata, standalone mode, and 192px/512px icons.
- [ ] A compatible browser offers installation when the app is served over HTTPS; the installed app opens directly into the Flutter ordering experience.
- [ ] The layout remains usable at desktop and narrow phone viewport sizes.
- [ ] When the API is unavailable, the app shows localized errors and does not fabricate menu data, prices, or successful orders.
- [x] No privileged Supabase credentials are present in the web build or Flutter source.

## Decisions fixed by this spec

- React remains the separate website client; Flutter Web is the browser/PWA target of the distinct Flutter customer app.
- The Flutter ordering flow is authored once in Dart for web and future Android/iOS targets.
- The PWA is network-dependent. Offline ordering and service-worker caching are not part of this slice.
- The API remains authoritative; the PWA introduces no new business logic or endpoints.
