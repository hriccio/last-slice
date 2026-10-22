# 004 — Flutter Android emulator proof

**Status:** Proposed for review  
**Depends on:** [000 — Product foundation](../000-foundation/spec.md), [002 — Flutter cross-platform demo ordering](../002-mobile-demo-ordering/spec.md), [003 — Flutter Web PWA customer client](../003-flutter-web-pwa/spec.md)

## Outcome

Run The Last Slice's existing Flutter ordering app as a native Android app on an Android emulator. The same Dart customer flow used by the PWA must load the API menu, support customization and checkout, and display the resulting demo order without a separate Android implementation of product or business rules.

This slice proves the Flutter cross-platform path with a locally installable debug build. It does not prepare an app-store release.

## Scope

### Included

- A checked-in Android runner for `apps/mobile/`, generated and maintained through Flutter's supported Android project structure.
- A recognizable app name and launcher icon for The Last Slice.
- Android internet access for API requests.
- A debug build that installs and launches on a supported Android emulator.
- Runtime/build configuration for the API origin, using `http://10.0.2.2:3001` as the Android emulator's default route to the development host API.
- A complete smoke journey on Android: browse the API menu, customize a pizza, review a quoted cart, submit an explicitly simulated order, and show its confirmation.
- `pt-BR` and `en-US` behavior consistent with the existing Flutter client.

### Excluded

- Changes to the customer journey, menu, pricing, API contracts, database, or order lifecycle already defined in specs 001 and 002.
- Android-specific UI or a second implementation of ordering behavior.
- iOS runner creation or iOS device validation.
- Release signing, Play Store metadata/submission, production distribution, push notifications, deep links, or native platform features.
- Offline menu access or offline order submission.
- Resolving general workstation Android SDK setup. The developer must have a compatible Android SDK, emulator, and accepted SDK licenses available to build and run this slice.

## Customer and developer behavior

1. A developer starts the TypeScript API using the repository's local development flow.
2. The developer builds and launches the Flutter app on an Android emulator with the configured API origin.
3. The app opens to the same localized menu experience as the PWA.
4. The developer completes the structured ordering smoke journey. The Android app uses the existing quote and order API operations; the API remains authoritative for allowed options and totals.
5. Confirmation clearly identifies the order as a demo. No payment details are requested and no real payment or fulfillment is represented.

An API failure must show the existing localized recovery state and preserve the in-progress cart and checkout fields. Retrying must follow the existing idempotent order submission behavior.

## Android and API requirements

- Android-specific code is limited to the runner, platform configuration, and any narrowly required platform adapter. Customer flow and business rules remain in the shared Dart source under `apps/mobile/lib/`.
- The app requests only the Android internet permission needed for API access.
- The emulator's default API address is `http://10.0.2.2:3001`. Developers may override it for another emulator, a physical device, or a deployed API using the existing `API_BASE_URL` configuration.
- Local HTTP access, if required by Android's cleartext policy, is enabled only for debug builds and scoped to the development setup. Release builds must use HTTPS; do not enable unrestricted cleartext traffic in a release configuration.
- No Supabase URL, service-role key, or other privileged credential is placed in the Android app. All business API access continues through the TypeScript API.
- The app id/application identifier is stable and scoped to this demo. It is not presented as a production publisher identity.

## Acceptance criteria

- [ ] Flutter's Android runner is checked in with no generated build output or machine-specific SDK paths.
- [ ] A debug APK builds with the repository's documented Flutter setup.
- [ ] The debug app installs and launches on an Android emulator.
- [ ] The Android app fetches the menu from the local API using the emulator-reachable API origin.
- [ ] A developer can complete browse → customize → quote → checkout → demo confirmation on the emulator.
- [ ] The Android client displays API-calculated prices and does not duplicate menu or pricing rules.
- [ ] The customer flow supports both `pt-BR` and `en-US` and retains locale and in-progress cart/form state while moving through the journey.
- [ ] The demo-only notice appears before submission and on confirmation; the app does not collect payment credentials or imply real fulfillment.
- [ ] API failures preserve work and show localized recovery guidance.
- [ ] Debug-only local HTTP configuration does not permit cleartext API traffic in release builds; production configuration uses HTTPS.
- [ ] README instructions explain how to start the API, select an emulator, run the app, and build the debug APK.

## Decisions fixed by this spec

- The next native proof target is Android; iOS is a separate follow-up.
- The Flutter Web PWA and Android app use the same Dart ordering flow and API client.
- This is an emulator-focused debug build, not a production or store release.
- Existing API, pricing, order validation, and demo transaction behavior remain authoritative and unchanged.
