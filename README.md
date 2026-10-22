# The Last Slice

The Last Slice is a fictional pizzeria MVP used to demonstrate a bilingual, multi-client ordering experience. This repository is a spec-first monorepo for a React + TypeScript website, a Flutter mobile app, a TypeScript API, shared contracts, and Supabase migrations.

## Product direction

Customers primarily browse a structured menu, customize a pizza, and move through a short checkout. On mobile, the intended path is browse → customize → checkout (“next, next, finish”). An optional contextual AI chat is available as help when a customer gets stuck; chat is a fallback, not the default way to place an order. Web customers also use direct, structured controls.

Both clients support Brazilian Portuguese (`pt-BR`) and US English (`en-US`). The MVP is a demo: transactions and order outcomes are simulated and must never be presented as real payment processing or fulfillment.

## SDD and repository map

Start with [`specs/000-foundation/spec.md`](specs/000-foundation/spec.md). New behavior should be specified and reviewed before implementation. See [`AGENTS.md`](AGENTS.md) for the repository workflow and boundaries.

| Path | Responsibility |
| --- | --- |
| `specs/` | Product and feature specifications |
| `apps/web/` | React + TypeScript web customer experience |
| `apps/mobile/` | Flutter mobile customer experience |
| `apps/api/` | TypeScript API and shared business operations |
| `packages/contracts/` | Shared domain, request/response, and validation contracts |
| `supabase/migrations/` | Ordered SQL schema migrations |

These directories are intentionally empty until an accepted spec calls for implementation. No app scaffolding or package dependencies are part of the foundation setup.

## Current status

Foundation documentation and repository boundaries are established. No runnable application exists yet, so there are no build or test commands at this stage. Add the appropriate checks when the first implementation spec introduces runnable code.
