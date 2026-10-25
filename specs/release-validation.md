# Integrated local release validation

Recorded on 2026-10-24 for the sequence 005 → revised 006 → integrated demo acceptance. Implementation commits: `1afc83b` (assistant) and `02b375e` (public kitchen). This is local implementation acceptance, not a public deployment record.

## Current acceptance reconciliation (2026-10-25)

Later validation supersedes the historical open-item statements below for HTTPS installation and human accessibility: Spec 003/008 record successful iPhone PWA installation and standalone launch, and Spec 005/006 record user-confirmed screen-reader and larger-text checks. Specs 001/002 now reflect the current public fictional-checkout contract and their recorded ordering evidence.

The agreed deliverables are the React website, Flutter PWA on iOS and Android, and native Android. Native iOS is excluded. A direct Android browser installation/standalone check remains open in Spec 002. Hosted Supabase, cleanup/log retention, production capacity, and paid-assistant controls remain deployment gates; temporary staging uses an in-memory public-demo API and deterministic fake assistant.

## Automated evidence

- `npm run build`: shared contracts, API TypeScript, and React production build pass.
- `npm run test:api`: 15 passing API/SQL tests. Actual PostgreSQL migrations run through PGlite; an HTTP PostgREST fixture exercises the API adapter. Coverage includes authoritative prices, source isolation, privacy rejection, read-only public routes, idempotency, bounded simulations, terminal states, expiry, compare-and-set transitions, and duplicate-event prevention. Queue tests cover FIFO, cancellation, token bounds, actual/unknown charges, durable restart/midnight accounting, pacing, ownership, and budget exhaustion.
- `CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test`: 13 passing browser tests across assistant, public kitchen/checkout, and customer tracking. Includes both locales, retained failures, visibility-aware polling, focus, staff-feed scrolling, narrow layout, and local assets.
- `flutter analyze`: no issues. `flutter test`: 18 passing widget tests across tracking, assistant, and fictional public checkout.
- Flutter release web build and Android debug APK build succeed. Android installed and launched on a headless Pixel API 34 emulator with the local API forwarded through ADB.
- Two final live GPT-5 nano requests, one per locale, completed through the real queue/adapter using transient vault injection. Combined settled token charge: US$0.00011715. Global 45-second pacing held. See [assistant validation](005-contextual-ai-assistant/validation.md).

## Built-client integration

The React production preview and Flutter release web build use the running public-demo API. The installed Android app completed browse → customization → cart → fictional checkout → confirmation with no identity fields; server fake staff advanced its status and the confirmation refreshed automatically. Android confirmation was visually inspected. React release checkout and shared board were exercised in both locales. Flutter Web release completed browse → customization → cart → fictional checkout → confirmation and automatic status refresh in both locales. Customer tracking retains its existing API response and lifecycle behavior; a poll can legitimately observe a later stage when more than one transition occurs between polls.

These smoke journeys use local in-memory persistence and the deterministic local assistant. Durable SQL behavior is separately exercised by the migration/integration tests. They do not establish hosted Supabase readiness or load capacity.

## Release gates and limits at the original 2026-10-24 checkpoint

- Apply both migrations to the intended Supabase project, configure server-only service credentials and vault-backed OpenAI access, and run the API in production public-demo mode. Paid calls fail closed without the durable ledger. Initial hosting uses one API process for volatile chat payload/result retrieval.
- Verify hosted cleanup scheduling, platform request/access-log retention, secrets, and provider settings against the documented data-use notice. The repository supplies pg_cron scheduling when available plus API cleanup; no hosted schedule or infrastructure logs were inspected here.
- Publish over HTTPS and verify browser installation and installed PWA startup. Local builds/manifest checks do not fulfill that deployment criterion. No public deployment, signing/store submission, or iOS validation occurred.
- Automated accessibility checks inspect keyboard/focus and accessible semantics. Human screen-reader audio testing, including live staff announcements, remains open; those acceptance boxes stay unchecked.
- Fictional checkout avoids collecting visitor identity, but free text and infrastructure/provider handling still require the stated data-use controls. No claim of exemption from privacy law or provider Zero Data Retention is made.

The foundation checklist has a fresh local acceptance review in [Spec 000 validation](000-foundation/validation.md). Older detailed Spec 001 ordering criteria remain historical for legacy contact-field checkout combinations, which public Spec 006 supersedes. Status headers distinguish implemented clients from outstanding installation/platform acceptance.
