# 000 — Product foundation

**Status:** Implemented foundation; release evidence and remaining gates recorded
**Scope:** Product behavior and monorepo boundaries for the fictional MVP

## Problem and intent

The Last Slice needs a clear product contract before the web, mobile, and backend implementations begin. The MVP demonstrates a pizzeria ordering journey that is easy to complete with structured controls, with contextual AI assistance available when customers encounter friction.

## Product goals

1. Let a customer discover the menu, customize an item, and submit a simulated order through a short, understandable flow.
2. Make the structured browse-and-checkout path the primary interaction on both web and mobile.
3. Offer optional contextual AI chat that can help explain the menu or recover from friction without taking over the default flow.
4. Keep menu, availability, pricing, and order business rules consistent across clients by owning them in the API and shared contracts.
5. Demonstrate the same core experience in `pt-BR` and `en-US`.

## Users and primary journey

The primary user is a customer exploring a fictional pizzeria menu. The expected journey is:

1. **Browse:** view menu categories and items, descriptions, prices, and availability.
2. **Customize:** choose an item and any supported options (for example size, crust, or toppings); see the resulting order line and price clearly.
3. **Review and checkout:** review items, quantities, totals, and demo delivery/pickup details; submit the order.
4. **Confirmation:** receive an unambiguous demo confirmation with a simulated order reference and status.

The mobile experience should make this feel like “next, next, finish.” Web users should also complete the journey through direct clicks and structured controls. Both remain usable without opening chat.

## Contextual AI assistance

- Chat is optional and reachable from relevant points in browsing, customization, and checkout.
- When opened, it should receive the relevant context the customer is working with, such as the selected menu item or current cart, subject to the eventual privacy and data contract.
- It may answer menu questions and guide the customer back to the structured flow.
- It must not silently change cart contents, invent menu facts, claim a transaction succeeded, or bypass explicit customer review and confirmation.
- Customers can dismiss chat and continue the same journey without losing their structured-flow state.
- The AI integration and its provider are implementation decisions for a later spec; this foundation does not prescribe a vendor.

## Shared business operations

The API is the authoritative boundary for shared business behavior. At minimum, later feature specs should assign ownership for:

- localized menu content and menu availability;
- supported customization options and validation;
- price calculation and order totals;
- cart/order submission and simulated order status;
- locale-aware response content or stable locale-neutral data with client translation rules.

Clients may render and locally stage selections, but must not independently define authoritative prices, allowed options, availability, or order state. `packages/contracts/` holds the shared shapes and validation boundaries used across API and clients. Supabase is the intended persistence platform, with schema evolution recorded in `supabase/migrations/`.

## Localization

- Required locales: Brazilian Portuguese (`pt-BR`) and US English (`en-US`).
- Menu content, validation feedback, checkout, confirmation, and AI assistance surfaces must support both locales.
- Locale selection and fallback behavior are to be specified before implementation; do not silently mix languages in one flow.
- Store machine-readable values (for example, currency amounts) separately from localized display strings.

## Public demo privacy direction

The public demo must work without identifying a visitor. The revised [Spec 006](../006-demo-kitchen-order-board/spec.md) defines one shared read-only kitchen, server-simulated staff and conversation, and generated fictional checkout details. In public mode, those fixture-based requirements supersede the earlier name/phone/address entry flow; update client/API contracts together before launch. The optional customer assistant remains free-form natural conversation under [Spec 005](../005-contextual-ai-assistant/spec.md), with minimized provider context, transient conversation, redaction, and actual retention settings disclosed. Do not describe random tokens or a lack of login as a guarantee of legal anonymity.

## Demo-only transaction constraints

- No real payment gateway, charge, card capture, or fulfillment integration is in scope.
- Checkout and confirmation must clearly identify the order as simulated/demo-only.
- Demo order references and statuses are fictional. UI copy and API responses must not imply a real purchase, payment, or delivery commitment.
- Do not collect or persist real payment credentials.

## Acceptance criteria for the foundation

- [ ] A customer can complete browse → customize → review/checkout → demo confirmation using structured controls, without chat.
- [ ] The mobile flow supports a short forward progression and preserves selections when navigating between steps.
- [ ] Optional contextual chat can assist without silently changing the cart or blocking structured checkout.
- [ ] Web and mobile consume the same authoritative menu, customization, pricing, and order rules through the API/contracts boundary.
- [ ] All customer-facing flows are available in `pt-BR` and `en-US` without mixed-language screens.
- [ ] Every submitted order is simulated and clearly labeled as demo-only; no real payment credentials or real transaction processing are used.

These criteria define the target behavior. Individual implementation specs must refine them into testable, bounded delivery slices.

## Explicit non-goals

- Production pizzeria operations, real inventory, staff tools, or dispatch.
- Real payments, refunds, delivery integrations, or guarantees of fulfillment.
- A chat-first or voice-first ordering experience.
- A specific AI provider, deployment topology, self-hosted Supabase setup, or production hosting choice.
- Authentication, analytics, loyalty, or other features without a follow-up spec.

## Initial monorepo boundaries

- `apps/web/` — React + TypeScript customer web client.
- `apps/mobile/` — Flutter customer mobile client.
- `apps/api/` — TypeScript API and authoritative business operations.
- `packages/contracts/` — shared domain/API contracts and reusable validation.
- `supabase/migrations/` — ordered SQL migrations for Supabase.
- `specs/` — this foundation and future focused feature specifications.

The foundation creates these boundaries only. It intentionally does not choose a monorepo tool, package manager, Flutter architecture, API framework, Supabase hosting mode, or AI provider.

## Open decisions for follow-up specs

- Menu catalog, supported pizza options, and whether the demo supports pickup, delivery, or both.
- Checkout fields and the minimum customer data needed for a simulated order.
- API shape, authentication posture, and exact Supabase data model.
- Locale selection, persistence, and fallback behavior.
- Context data and guardrails for the optional AI assistant.
- Whether simulated orders persist between sessions and how demo data is reset.
