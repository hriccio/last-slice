# 012 — Localized landing feature highlights

**Status:** Implemented and locally validated (2026-11-03)
**Depends on:** [000 — Foundation](../000-foundation/spec.md), [001 — Web ordering](../001-web-demo-ordering/spec.md), [006 — Public kitchen](../006-demo-kitchen-order-board/spec.md), [007 — Tracking](../007-customer-order-tracking/spec.md), [009 — Cart proposals](../009-assistant-cart-configuration/spec.md), [011 — Recommendations](../011-weekly-pizza-recommendations/spec.md)

## Goal

Update the React landing page to explain the existing customer features, with a complete Brazilian Portuguese experience by default and an English translation available through the existing locale selector.

## User flow

1. A new visitor sees the pt-BR hero, a clear simulation notice, and the primary menu action.
2. A feature section introduces assistant-guided customization, weekly suggestions, order tracking, and the shared simulated kitchen.
3. Feature actions open the existing assistant or tracking screen, or navigate to the kitchen. Opening chat sends no message and changes no cart contents.
4. The visitor can still browse and customize pizzas directly. Switching locale translates all landing copy and preserves the selected locale on reload.

## Requirements

- Keep pt-BR as the initial locale when no saved preference exists; honor an explicitly saved en-US preference.
- Translate the brand subtitle, image labels, footer, feature descriptions/actions, and page metadata. Keep The Last Slice as the brand name.
- Keep menu browsing as the primary hero action. Features use the existing dark, warm-orange design and local assets, with readable responsive cards and keyboard-accessible controls.
- Explain that assistant cart changes require customer review and application.
- Describe weekly suggestions as based on preferences and completed fictional orders from the last seven calendar days. If no history exists, the assistant helps from the menu without claiming popularity; the landing must not show invented rankings, counts, or real sales claims.
- Tracking and kitchen copy must describe simulated activity, with no real preparation or delivery guarantees.
- Put the no-real-payment-or-delivery notice in the hero as well as retaining checkout notices.
- Default HTML metadata is pt-BR; update document title and description with the selected locale.

## Acceptance criteria

- A fresh visit displays Portuguese landing text, including image annotations and footer, with no English slogan left in the pt-BR layout.
- All four feature highlights appear in both locales and their actions reach existing surfaces without submitting a chat request or an order.
- Locale switching and reload preserve language consistency, including the document language and metadata.
- The landing works at 320px mobile and desktop widths without horizontal scrolling; cards and controls remain usable with enlarged text.
- Existing structured ordering and assistant flows continue to pass browser checks.

## Non-goals

New API, recommendation logic, migrations, dependencies, mobile-client changes, deployments, or new ordering behavior. No real payments, delivery, promotional claims, or staff controls.


## Local validation — 2026-11-03

- `npm run build` passed for contracts, API, and the React client; the final React build was rerun after adding the feature-section anchor and localized image metadata.
- `CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test` passed all 16 existing browser tests, covering both locales, structured demo checkout, assistant proposals/queue, tracking, and the public kitchen.
- Additional headless Chromium checks confirmed pt-BR on a fresh visit, four localized feature cards, the hero demo notice, translated brand/image labels, localized document title/description, and persisted en-US selection after reload.
- Both assistant feature actions opened the existing dialog without a POST request; tracking opened the lookup screen. The feature anchor scrolled to the section and the kitchen action reached the Portuguese public kitchen using mocked API responses.
- Both locales fit at 320, 390, 768, 1024, and 1440px without horizontal scrolling. Enlarged feature text (200%) also fit at 320px. Desktop and 390px full-page screenshots were visually inspected.
- Browser checks used local API fixtures; no live provider calls, hosted deployment, database changes, or manual screen-reader review were performed.
