# Spec 007 acceptance record

Validated on 2026-10-24 using Node.js 25.9.0, Flutter 3.47.7 / Dart 3.13.5, Chromium, and an Android emulator.

## Regression checks

| Check | Result | Evidence |
| --- | --- | --- |
| `CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:tracking` | Passed: 2 API tests and 8 browser tests | `tests/order-tracking.api.test.ts`, `tests/order-tracking.web.spec.ts` |
| `npm run build` | Passed | Contracts, API TypeScript, React TypeScript and Vite release bundle |
| `flutter test` in `apps/mobile` | Passed: 13 widget tests | `apps/mobile/test/order_tracking_test.dart` |
| `flutter analyze` in `apps/mobile` | Passed with no issues | Flutter application and widget tests |
| `flutter build web --release --dart-define=API_BASE_URL=http://127.0.0.1:3301` | Passed | Flutter Web/PWA release bundle |
| `flutter build apk --debug --dart-define=API_BASE_URL=http://127.0.0.1:3301` | Passed | Installed Android debug APK; local API reached through `adb reverse` |

The browser and widget tests cover both locales, confirmation preview polling and code handoff, entering a code from the menu, pickup/delivery timelines, cancelled/unknown statuses, stale-data recovery, last-checked feedback, terminal polling, and manual refresh. They advance controlled clocks across the 15-second interval, hide/background or cover views, hold requests open to check overlap protection, and change codes before responses arrive to check stale-response protection.

Accessibility checks cover keyboard activation and retained refresh-button focus, live status/refresh feedback, explicit current/earlier/upcoming step semantics, and layouts at 320 pixels with enlarged text. Flutter steps expose individual semantics nodes without duplicate child labels. Cancellation has its own terminal explanation and is not displayed as completion.

API tests create demo pickup and delivery orders, advance each through the real kitchen status endpoint, and verify lookup status, timestamps, no-store caching, the unchanged 404 envelope, and the exact allowed response and line fields. Extra contact/payment fields nested in submitted or stored lines are omitted from lookup responses. A controlled PostgREST fixture verifies that canonical Supabase columns override stale `order_data` status/timestamps, with creation time as the missing-update fallback.

## Live application checks

- **React + local API:** completed a demo checkout in Chromium, observed a kitchen update arrive on confirmation through foreground polling, then opened tracking with the code carried across and the correct current timeline step.
- **Flutter Web/PWA + local API:** in both `pt-BR` and `en-US`, opened tracking from the menu, entered a code, observed a kitchen update through real foreground polling, and manually refreshed a subsequent update. Checked the pickup and delivery branches, demo notice, and exposed current-step semantics in Chromium.
- **Android + the same API:** installed the debug APK on `emulator-5580`, looked up an order in Portuguese, and observed a kitchen update through foreground polling. A local request-recording proxy confirmed no lookup during 17 seconds in the background; returning to the app loaded the newer status immediately. Switched to English, looked up the same code, manually refreshed the pickup branch and completion, confirmed no polling for another 17 seconds, and successfully refreshed the terminal order manually.

The emulator had no network route, so the Android check used `API_BASE_URL=http://127.0.0.1:3301` with an ADB reverse tunnel to the local API/proxy. This uses the existing configurable API origin. No device connectivity settings were changed.

## Validation boundaries

Supabase behavior was checked with a controlled PostgREST fixture and the existing additive status migration; no live Supabase project or real credentials were used. Cancelled and unknown statuses were exercised with fixtures because this slice adds no kitchen cancellation operation. Accessibility validation used browser keyboard checks and browser/Flutter/Android semantics, without a separate human screen-reader audio session. No iOS setup or execution was needed.
