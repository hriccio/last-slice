# 006 — Demo kitchen order board

**Status:** Implemented; build-validated, interactive acceptance pending
**Depends on:** [000 — Product foundation](../000-foundation/spec.md), [001 — Web demo ordering journey](../001-web-demo-ordering/spec.md)

## Outcome

A demo operator can view recent customer demo orders in a separate kitchen board, move an order through the defined preparation lifecycle, and have customer tracking display the operator-set status. The API remains authoritative for permitted transitions and persisted order state.

The board is an operator tool for the fictional MVP. It does not represent real restaurant fulfillment and does not expose customer contact or delivery address data.

## Scope

### Included

- A separate React web route at `/kitchen`, apart from the customer ordering screens.
- A server-protected, localized operator entry flow in `pt-BR` and `en-US`.
- A board of the 100 most recent demo orders, with active orders first and status filters.
- Order cards with code, submission time, locale, fulfillment mode, pizza line summaries, quoted total, and current status.
- Explicit operator actions to advance an order through valid lifecycle transitions.
- Persisted status changes when Supabase is configured and process-lifetime status changes in local memory demo mode.
- Customer order tracking that reflects the current persisted status after an operator update.
- Additive database changes for indexed status and update time, backfilled from existing order records.

### Excluded

- Customer or staff accounts, roles, identity providers, and multi-restaurant tenancy.
- Real restaurant operations, inventory, printing, dispatch, delivery integrations, payments, or customer messaging.
- Editing order contents, totals, fulfillment type, or customer-entered checkout data.
- Showing customer name, phone, street address, complement, delivery reference, or other personal data on the board.
- Creating orders from the kitchen board or changing statuses automatically on a timer.
- iOS or Android-specific work. The board is a web operator surface.
- Deleting orders, resetting demo data, or cancelling submitted orders. `cancelled` remains unavailable as a board action in this slice.

## Operator access and privacy

- The operator enters a demo board token in the `/kitchen` interface. The browser holds it in memory only for the current page session and sends it in an `Authorization: Bearer` header to protected kitchen endpoints.
- The API reads the expected token from the server-only `KITCHEN_BOARD_TOKEN` environment variable. Never embed it in a React bundle, URL, source control, or browser storage.
- If no token is configured, kitchen endpoints return a stable `503 kitchen_unavailable` response and the board explains that operator access is not configured. Do not expose an unauthenticated read or write path.
- Missing or incorrect tokens return `401 kitchen_unauthorized`. Do not log supplied tokens.
- This shared token is a limited demo gate, not a production staff identity system. Do not present the board as safe for real restaurant use or publicly expose it with a shared demo token.
- Kitchen responses contain only the order details required for preparation. They must never include customer contact or address fields, raw checkout payloads, or idempotency keys.
- When the operator leaves the page or reloads it, the token is discarded and must be entered again.

## Board behavior

1. The operator opens `/kitchen` and enters the configured demo token. The interface provides localized instructions and never places the token in a URL or persistent browser storage.
2. The board loads recent active orders and groups them by current status: received, confirmed, preparing, ready for pickup, or out for delivery. Completed orders can be shown with a separate filter.
3. Each order card shows its demo code, received time, fulfillment mode, line quantities and customization summaries, total in BRL, and status. It does not show customer identity or address.
4. The operator advances an order using the single next action allowed for its current status and fulfillment mode. The board asks for an explicit confirmation before submitting a status change.
5. On success, the card moves to the new status and the operator sees the updated state. On a stale update or network error, the board reloads the order state and explains the recoverable error without fabricating progress.
6. A customer who looks up the order code sees the latest status and localized explanation returned by the API. No update is represented as a real fulfillment guarantee.

The valid operator transitions are:

| Current status | Fulfillment | Next status |
| --- | --- | --- |
| `received` | Either | `confirmed` |
| `confirmed` | Either | `preparing` |
| `preparing` | Pickup | `ready_for_pickup` |
| `preparing` | Delivery | `out_for_delivery` |
| `ready_for_pickup` | Pickup | `completed` |
| `out_for_delivery` | Delivery | `completed` |

`completed` is terminal. The board cannot skip a state, reverse a transition, or set `cancelled`. Status changes are explicit demo operator actions, not simulated automatic progress.

## API contract

All `/kitchen/*` operations require the configured bearer token. They use the existing stable JSON error envelope and do not add public customer endpoints beyond the existing tracking response's updated status.

### `GET /kitchen/orders?status={status}`

- Returns at most the 100 most recent orders, active orders first, then by creation time descending. An optional status filter must use a known lifecycle status.
- Each result includes only `orderCode`, `createdAt`, `locale`, `fulfillment`, `status`, `lines` with canonical item/options and quantity, and `subtotal`, `deliveryFee`, and `total` as integer BRL cents.
- Unknown status filters return `400 validation_error`. No personal fields, raw payload, or idempotency data are returned.

### `PATCH /kitchen/orders/{orderCode}/status`

Request:

```json
{
  "expectedStatus": "preparing",
  "status": "ready_for_pickup"
}
```

- The API checks the supplied expected status against the current stored value and validates the next transition against the state table and order fulfillment.
- A valid update stores the new status and update timestamp, and returns the sanitized current order summary.
- Stale expected state returns `409 order_status_conflict`; invalid, skipped, reversed, terminal, or fulfillment-incompatible transitions return `400 invalid_status_transition`.
- Unknown order codes return `404 order_not_found`.
- Concurrent operators cannot silently overwrite one another; a compare-and-set update must affect only an order whose current status equals `expectedStatus`.

### Customer tracking

`GET /orders/{orderCode}` continues to return its existing privacy-limited response, but its `status` and `statusKey` must reflect the latest status from storage. It still returns no name, phone, or address.

## Persistence requirements

- Add an additive migration that adds a constrained `status` column and `updated_at` timestamp to `demo_orders`, backfills status from `order_data`, and adds an index suitable for recent status-filtered board queries.
- The API writes the status column and serialized `order_data.status` consistently so existing stored order shape remains compatible. Customer tracking uses the canonical status column for persisted orders.
- Supabase writes use the existing server-side service role only. The browser never connects directly to Supabase.
- Without Supabase, the existing in-memory demo mode may serve and update orders for the lifetime of the API process. The UI must identify that this mode is temporary and that restarting the API clears its orders.
- Do not add personal data to new board columns or migration logs.

## Localization and accessibility

- The board labels, filters, status names, fulfillment labels, action confirmations, empty/error states, and setup guidance are available in `pt-BR` and `en-US`.
- Order line names and option summaries follow the locale stored on the order; the operator's board language is selected independently.
- Keyboard users can reach token entry, filters, refresh, and status actions. Status changes are announced accessibly and are not conveyed by color alone.
- Customer tracking remains localized using the order locale as defined by the customer ordering flow.

## Acceptance criteria

- [ ] `/kitchen` is a separate responsive operator view and does not alter customer ordering routes.
- [ ] The board requires a server-configured token; no token is embedded in client code, URLs, or persistent browser storage.
- [ ] Missing/incorrect credentials return the specified safe errors, and credentials are not logged.
- [ ] The API returns only the minimal board data and never exposes contact, address, raw checkout, or idempotency fields.
- [ ] The board lists and filters recent orders in the expected ordering and both locales.
- [ ] Operators can perform each allowed transition, while skipped, reversed, stale, cancelled, terminal, and fulfillment-incompatible transitions are rejected by the API.
- [ ] Concurrent status updates use compare-and-set semantics and cannot silently overwrite current state.
- [ ] Supabase migration backfills existing orders, adds a status constraint/index, and keeps status and order JSON consistent.
- [ ] In-memory mode works for the current API process and clearly identifies its temporary persistence behavior.
- [ ] Customer tracking reflects a board update and continues to omit customer contact and address details.
- [ ] No status advances automatically, and the UI labels all orders and actions as demo-only without implying real preparation or fulfillment.
- [ ] The board is usable with keyboard and screen reader, including confirmation and recoverable error states.

## Decisions fixed by this spec

- The kitchen board is a separate web operator route, not a customer ordering step.
- A server-configured shared demo token gates the board until a separate staff identity spec exists; it is not production authentication.
- The API owns status transitions and Supabase persistence. The client can request only the next allowed transition.
- Customer tracking reads the same current status the operator sees while preserving its existing privacy boundary.
- This board advances fictional demo state only; it does not claim real payment, preparation, pickup, or delivery.
