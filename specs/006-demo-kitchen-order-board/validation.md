# Public kitchen validation

See the [integrated release record](../release-validation.md) for commands, built-client evidence, and deployment/accessibility gates.

The implementation provides a shared read-only kitchen, transactional randomized staff progression, localized template-based side conversations, fictional checkout fixtures, retention, and bounded public traffic. Five kitchen tests execute memory behavior, real SQL, HTTP privacy/read-write boundaries, authoritative quotes, and API-to-Supabase fixtures. Three browser tests cover public checkout, board/feed behavior, and failure/polling accessibility semantics. Two Flutter public-checkout tests verify fixture-only requests.

Production deployment, hosted cleanup/log settings, and human screen-reader validation remain explicit release gates. No public hosting was changed during this task.

## Local regression recheck

Rechecked on 2026-10-25:

- `npm run test:api` — all 15 API/SQL tests passed, including actual migration execution, memory and Supabase fixtures, source isolation, compare-and-set progression, terminal/expiry handling, public read/write separation, privacy, and capacity limits.
- `CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test tests/public-demo.web.spec.ts` — all 3 browser tests passed across both locales and board polling, stale-data retention, staff-feed scroll, and keyboard focus.
- `flutter analyze` — no issues; `flutter test test/public_checkout_test.dart` — both locale tests passed for fixture-only public checkout.
- `npm run build` — shared contracts, API, and React production build passed.

This recheck was local. It did not inspect a hosted Supabase project's cleanup schedule, infrastructure logs, real public capacity, or perform human screen-reader audio testing; the corresponding launch gates remain open.
