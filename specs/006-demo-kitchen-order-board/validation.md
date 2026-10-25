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

## Keyboard accessibility review

On 2026-10-25, manually navigated the React public board with the keyboard at desktop width. Tab reached both filters and refresh; arrow keys changed the status and fulfillment filters; Enter refreshed the board. When the local staff simulation added two messages, the board exposed a localized “2 new messages” status announcement and keyboard focus remained on refresh. The event feed is exposed as a read-only log, with no visitor message input or order-mutation control.

At 390×844, the order board and staff conversation stack vertically, and the document has no horizontal overflow. The feed remains scrollable below the order cards. The screen-reader audio and larger-text checks are not complete: Orca did not receive a stable native focus/audio session through the CUA-controlled browser, and browser zoom could not be changed through that remote tab. Keep the combined accessibility acceptance item unchecked pending a direct assistive-technology and large-text review.
