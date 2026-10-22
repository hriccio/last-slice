# Repository guidance

## Purpose

The Last Slice is a fictional pizzeria MVP and an SDD (specification-driven development) monorepo. Keep the repository spec-first: agree on behavior in `specs/` before adding implementation. Avoid framework scaffolding, generated projects, and dependencies until a spec requires them.

## Repository map

- `specs/`: product and feature specifications; `specs/000-foundation/spec.md` is the initial product contract.
- `apps/web/`: React + TypeScript customer website.
- `apps/mobile/`: Flutter customer application.
- `apps/api/`: TypeScript API and server-side business operations.
- `packages/contracts/`: shared API, domain, and validation contracts consumed by the apps.
- `supabase/migrations/`: ordered SQL migrations for the Supabase schema.

Keep customer experiences in their clients, business rules and privileged operations on the API, and shared types/contracts in `packages/contracts/`. Do not duplicate business rules in clients. Keep migrations additive and reviewable. Add nested `AGENTS.md` only when a directory needs guidance that differs from this file.

## SDD workflow

1. Read the relevant foundation and feature specs before implementation.
2. For new behavior, write or update a focused spec with goals, user flows, requirements, acceptance criteria, and explicit non-goals.
3. Review the spec for consistency with the shared business model, both locales, demo-only transaction constraints, and existing contracts.
4. Implement only the behavior covered by the accepted spec; update contracts, migrations, and docs alongside affected code.
5. Validate using the checks appropriate to the changed artifacts and report what was and was not run.

Specs describe intended behavior; they are not a reason to add speculative infrastructure. Do not store real payment credentials, process real payments, or represent demo transactions as completed real orders.

## General working rules

- Preserve the fictional demo scope and keep customer-facing text available in Brazilian Portuguese (`pt-BR`) and US English (`en-US`).
- Treat Supabase as the intended backend platform; do not introduce self-hosting or deployment assumptions without a spec decision.
- Keep secrets out of source control. Use environment examples with placeholders if configuration is later needed.
- Do not commit build output, dependency caches, local environment files, or generated platform files unless a spec requires them.
