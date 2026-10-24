# 007 — Customer order tracking

**Status:** Fulfilled — acceptance validated on 2026-10-24; see [validation record](validation.md)
**Depends on:** [000 — Product foundation](../000-foundation/spec.md), [001 — Web demo ordering journey](../001-web-demo-ordering/spec.md), [002 — Flutter cross-platform demo ordering](../002-mobile-demo-ordering/spec.md), [003 — Flutter Web PWA customer client](../003-flutter-web-pwa/spec.md), [006 — Demo kitchen order board](../006-demo-kitchen-order-board/spec.md)

## Outcome

Customers can keep an order tracking page open and see status changes made from the demo kitchen board without repeatedly entering the order code. The page explains the current place in the demo lifecycle, refreshes safely while visible, and remains clear that no real preparation or delivery is occurring.

This is a customer-facing web and Flutter slice. It uses the existing order lookup contract and requires no iOS, Apple hardware, or Xcode work.

**Later kitchen revision:** The 2026-10-24 revision of [Spec 006](../006-demo-kitchen-order-board/spec.md) specifies a public read-only board and server-side fake staff with randomized progress. That revision is now implemented and covered by the [integrated release validation](../release-validation.md). Its integration keeps the API authoritative and preserve this tracking response, polling, privacy, and terminal behavior; the separate staff feed does not add historical per-step timestamps to customer tracking.

## Scope

### Included

- A consistent tracking experience in the React website and Flutter customer app, including Flutter Web/PWA and Android.
- A lifecycle timeline for the server-reported order status, localized in `pt-BR` and `en-US`.
- Automatic refresh while a tracking view is visible, plus a clear manual refresh action and last-checked feedback.
- A safe tracking response field for the time the current status was last updated.
- Reuse of the current order code after confirmation and support for entering a code to resume tracking.
- Recoverable loading, network, invalid-code, and refresh states that preserve the entered order code and last successfully loaded order.

### Excluded

- Push notifications, SMS, email, background refresh after leaving the tracking view, or a promise of immediate updates.
- Customer accounts, order history, or access to orders without a valid demo order code.
- Real preparation, pickup, dispatch, delivery, payment, refunds, or fulfillment guarantees.
- A historical event log or per-step timestamps. The API stores only current status and its latest update time.
- New kitchen operations or status transitions beyond Spec 006.
- iOS-specific setup, signing, or Apple service integration.

## Customer flow

1. After placing a demo order, the confirmation screen keeps its status preview current while it remains visible. The customer can choose **Track this order** from confirmation; the order code is carried into the tracking view without requiring re-entry.
2. The customer can also open tracking later and enter a demo order code. A valid lookup displays the order summary, current status, lifecycle timeline, and last checked time.
3. While the tracking view remains visible, the client refreshes the lookup periodically. A status change from the kitchen board updates the displayed status and timeline without clearing the order code or summary.
4. The customer can request an immediate refresh. The interface shows when the last successful check occurred and gives a recoverable message if a check fails.
5. When the customer leaves the tracking view or the app enters the background, automatic refresh pauses. It resumes when tracking becomes visible again and performs a fresh lookup.
6. A terminal status (`completed` or `cancelled`) remains visible but is not described as a real-world fulfillment event. Automatic refresh may stop after a terminal status is returned.

## Status timeline

The timeline uses the current status returned by the API and the lifecycle order already defined by Specs 001 and 006:

`received` → `confirmed` → `preparing` → (`ready_for_pickup` | `out_for_delivery`) → `completed`

- For pickup orders, the timeline follows `ready_for_pickup`; for delivery orders, it follows `out_for_delivery`.
- The current step is visually and accessibly identified. Earlier applicable steps may be marked as preceding the current step; later steps remain upcoming.
- `cancelled` is shown as a terminal demo status with an explanatory label. It is not rendered as successful completion.
- If a status is not recognized, show a localized unknown-status recovery message and retain the order code; do not infer or advance state.
- The timeline communicates workflow state only. It does not display estimated completion times or assert that an action happened in a real pizzeria.
- The API does not provide a historical event log. The interface must not invent a timestamp for each timeline step. It may display the current status's last update time when available.

## Refresh behavior

- Use the existing `GET /orders/{orderCode}` endpoint. Do not add an unauthenticated order list or a subscription channel in this slice.
- Return the existing privacy-limited response plus `updatedAt`, an ISO-8601 timestamp for the current persisted status. For an order that has not advanced, use its creation time. In memory mode, use the order's current update time or creation time.
- Poll no more frequently than once every 15 seconds while the confirmation status preview or tracking view is visible. Pause while the screen/tab/app is hidden, backgrounded, or covered by another route, and avoid overlapping lookups.
- Refresh immediately on initial lookup, on a manual refresh request, and when a hidden/backgrounded tracking view becomes visible again.
- After a failed refresh, retain the last successfully loaded status and show a localized stale-data or connection message with a retry action. Do not replace a known status with an error or a fabricated state.
- Stop polling on terminal `completed` or `cancelled` status. Manual refresh remains available.
- Use the API's persisted status as authoritative in Supabase mode and the API process memory status in local demo mode. Do not cache order details beyond the current client session.

## API and privacy requirements

- `GET /orders/{orderCode}` keeps its existing response fields and privacy boundary, adding only `updatedAt`.
- Do not return customer name, phone, delivery street, number, neighborhood, complement, reference, payment details, idempotency key, or raw checkout payload.
- Use the status column as canonical when Supabase is configured, consistent with Spec 006. Keep `order_data.status` compatibility intact.
- Unknown order codes continue to return the existing `404 order_not_found` error shape.
- The response continues to indicate demo-only status and returns only the existing order summary fields.

## Localization and accessibility

- Timeline labels, order status explanations, last-checked text, refresh control, loading/error/stale states, and demo-only notice are available in `pt-BR` and `en-US`.
- Keep the order code and last successfully loaded order visible when a refresh fails.
- Announce status changes and refresh outcomes to assistive technology without moving keyboard focus.
- Do not rely on color alone to distinguish completed, current, upcoming, or cancelled states.
- The manual refresh action is keyboard reachable and exposes its loading state accessibly.
- The timeline stacks cleanly on narrow screens and supports browser zoom and larger text.

## Acceptance criteria

- [x] Confirmation can open tracking with the order code already populated in the React and Flutter clients.
- [x] The confirmation status preview reflects a newer server status while confirmation remains visible, without requiring the customer to reopen the order.
- [x] A customer can enter an order code and load the latest server status in both locales.
- [x] The timeline follows the correct pickup or delivery lifecycle branch and distinguishes current, upcoming, completed, and cancelled demo states.
- [x] A kitchen status change appears during periodic refresh without requiring code re-entry; polling is at least 15 seconds apart and pauses when hidden/backgrounded.
- [x] Manual refresh is available and the interface reports the last successful check.
- [x] A refresh failure preserves the last known order and status and offers a retry without inventing progress.
- [x] Polling stops after a terminal status, while manual refresh remains available.
- [x] The lookup response adds `updatedAt` and continues to omit all customer contact, address, payment, and idempotency data.
- [x] Customer-visible copy consistently describes this as a demo and makes no real preparation, payment, pickup, or delivery guarantee.
- [x] Tracking is usable with keyboard and screen readers, and the timeline remains usable at narrow widths and larger text sizes.
- [x] The React website, Flutter Web/PWA, and Android customer app use the same server-reported status behavior without requiring iOS-specific work.

## Decisions fixed by this spec

- Order status remains authoritative in the API and is never advanced by a customer client.
- Tracking uses bounded foreground polling rather than push or a persistent connection.
- Only the current status and its latest update time are available; the product does not imply historical per-step timestamps.
- The order code is the only customer lookup credential in this fictional demo. No account or real operational promise is introduced.

## Acceptance validation

- Exercise React tracking in Chromium with Playwright and Flutter tracking with SDK widget tests, covering confirmation handoff, both locales and fulfillment branches, foreground refresh, failures, terminal statuses, and accessible step labels.
- Run the real API in memory mode to check kitchen-to-customer updates, timestamps, and the exact privacy-limited lookup response. Check the Supabase lookup path against a controlled PostgREST fixture without real credentials.
- Build the React website, Flutter Web/PWA, and Android debug app. Smoke-check Flutter Web in Chromium and the Android app on an emulator against the same local API.
- Record validation results and any environment limitations alongside this spec. Passing builds alone do not complete acceptance.
