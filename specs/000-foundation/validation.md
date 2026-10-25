# Foundation local validation

Recorded on 2026-10-25. This validates the foundation against the current public-demo experience and the focused feature specs that refine it.

## Checks run

- `npm run build` — shared contracts, API TypeScript, and React production build passed.
- `npm run test:api` — all 15 API and SQL integration tests passed, including canonical pricing, public-demo privacy boundaries, fictional checkout fixtures, idempotency, and safe assistant behavior.
- `CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test` — all 13 browser tests passed across `pt-BR` and `en-US`, including structured checkout without chat, demo confirmation, read-only kitchen, assistant behavior, and order tracking.
- `flutter analyze` — no issues found.
- `cd apps/mobile && flutter test` — all 20 Flutter widget tests passed.
- `cd apps/mobile && flutter build web --release` — release web build passed.
- `cd apps/mobile && flutter build apk --debug` — Android debug APK build passed.

## Acceptance review

- Structured browse/customize/checkout/confirmation without chat is covered by the public checkout browser tests in both locales. The browser flow starts from the menu, adds a configured pizza, reviews fictional checkout details, and confirms a demo order.
- Mobile forward progression and state retention have integrated local evidence in the [release validation record](../release-validation.md), which documents browse → customization → cart → checkout → confirmation in Flutter Web and Android. This run also rebuilt both Flutter targets and passed the Flutter suite.
- Assistant behavior is covered by the Spec 005 API/browser/Flutter checks and its [validation record](../005-contextual-ai-assistant/validation.md); the assistant remains optional and does not perform order mutations.
- API and contract tests enforce canonical quote/order rules; web and Flutter clients use the API for menu, quote, checkout, and order behavior. Public checkout tests assert that visitor identity/address data is absent.
- Browser and Flutter checks exercise both required locales. Public checkout and API tests verify demo fixtures, simulation labels, and the absence of real payment fields or payment processing.

This is local implementation evidence. It does not validate hosted Supabase configuration, public deployment, HTTPS installation of the PWA, or iOS Safari behavior; those remain platform/deployment gates in the relevant focused specs.
