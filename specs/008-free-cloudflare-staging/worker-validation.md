# Cloudflare-hosted API validation — 2026-10-27

## Deployment outcome

The API and both clients are deployed on the existing Workers Free account. The API no longer depends on the developer workstation or a Quick Tunnel. Supabase project `tityohurziwhqmlybvye` is unchanged; no schema migration, new database, paid Cloudflare plan, container, or paid add-on was provisioned.

| Surface | Stable URL | Deployed version |
| --- | --- | --- |
| API | https://last-slice-api-staging.hriccio.workers.dev/ | `3d4d044e-e310-4df5-bc72-34e0ff853e5e` |
| React | https://last-slice-web-staging.hriccio.workers.dev/ | `aeacb83a-9e21-4708-8ab7-0572ba3d17ce` |
| Flutter PWA | https://last-slice-pwa-staging.hriccio.workers.dev/ | `026437bd-54e3-4bf7-b191-6cd188a162df` |

Initial API version `422bf07f-0edf-481c-96d0-9959b1168a23` established the hosted integration. The final version disables Supabase browser-session persistence/refresh and reuses the stateless API/client per deployment environment to reduce ordinary-request CPU overhead. Request-owned RPC stubs are created per call, never cached across request contexts. The workerd integration test caught that ownership constraint before the optimized version was deployed.

The authenticated Cloudflare dashboard showed **Free / $0 / Current plan** before deployment; account usage showed 0/100,000 dynamic requests at that point. API settings confirm compatibility date `2026-10-27`, a Durable Object binding, and three `secret_text` bindings. Secret upload used an anonymous Linux RAM descriptor, not a decrypted disk file. Cloudflare OAuth cannot read billing subscriptions; the dashboard supplied the plan evidence instead.

## Automated checks

- `npm run build`: contracts, Node API, React TypeScript/Vite passed.
- `npm run check:cf:api:staging`: generated binding/runtime types and Worker TypeScript check passed.
- `npm run test:api`: **24 passed**. Covers existing SQL/business contracts plus Web transport, bounded UTF-8 input, hosted configuration rejection, coordinated rate limits, and window expiry.
- `npm run test:cf:api:staging`: **1 workerd integration test passed**, using the built production Worker and SQLite-backed Durable Object against controlled Supabase/PostgreSQL, Siteverify, and provider fixtures. It covers both localized menus, origin rejection, challenge rejection before writes, accepted challenge checkout/replay, tracking, read-only kitchen, alarm-driven assistant dispatch, duplicate sends, proposal confirmation/replay, cross-conversation denial, owner replacement, retained orders/accounting, lost volatile tickets/proposals, and missing-secret failure. All external destinations are intercepted; this test makes no paid calls.
- `CHROMIUM_EXECUTABLE=/usr/bin/chromium npx playwright test`: **16 passed**, including both locales, reviewed proposals, structured checkout, tracking, and foreground lifecycle behavior. The first attempt lacked Playwright's downloaded browser; rerunning with the installed Chromium passed.
- `flutter analyze`: passed; `flutter test`: **24 passed**. Flutter release build and both static deployment dry runs passed. Existing Flutter font/bootstrap warnings did not prevent the builds.
- API deployment dry run passed: **2,608,381 bytes uncompressed; approximately 1,216,733 bytes / 1,188.22 KiB gzip**, below the 3 MiB compressed free limit. Cloudflare reported **11 ms startup**, below the separate 1-second startup limit. A local startup profile of the preceding build recorded approximately 23.4 ms active CPU; local profiling is not a prediction of hosted request CPU.
- A byte-for-byte scan of **67 generated API/web/PWA files** found none of the actual Supabase, OpenAI, or Turnstile server secret values. Runtime settings confirm those credentials are secrets rather than public text variables. No raw chat content or bearer capability is recorded here.
- The deployment package pins the existing beta toolchain and overrides workerd to `1.20261027.1` so local validation supports the deployed compatibility date. Generated runtime types, assets, profiles, runtime state, caches, and installed dependencies remain ignored. npm reports 11 audit findings in the deployment development toolchain; no automatic major-version audit rewrite was performed, and these CLI/test packages are not deployed in the API bundle.

## Live API and persistence evidence

- `/health` returns 200. `/config` returns `publicDemo: true`, `mode: "public-demo"`, `persistence: "supabase"`, and `demoOnly: true`. Both `/menu` locales return all five flavors.
- Unlisted browser origins receive 403. Browser-originated protected requests without a challenge receive 403 `challenge_failed`. Public kitchen mutation receives 403. Operational probes without an Origin retain the existing native-client exception; these are not proof of browser challenge acceptance.
- Initial fictional pickup order `LS-FEEC40EC95005D` returned 201 at R$49.00; replay returned 200 and reused its reference. The order advanced through hosted kitchen scheduling and was later `completed` after API deployment replacement. Three subsequent tracking reads on the final version returned the same persisted completed order. No local API/tunnel process was running.
- Final-version fictional pickup order `LS-BDC8CCCFC78B2D` returned 201 and replay returned 200. Fifteen additional bounded menu/quote/kitchen/tracking probes on the final version returned 200.
- The service credential reads the existing hosted menu and accounting tables. `assistant_control` retains the unchanged policy, is not blocked, and has a durable next-slot timestamp. `demo_simulation_control.last_cleanup_at` advanced under hosted execution (observed `2026-10-27T11:22:35.357637+00:00`). Existing pg_cron setup was retained without schema/history changes; its scheduler metadata was not independently re-audited in this session.

## Real assistant and proposal evidence

Two bounded English operational probes, one on each API version, returned real `mode: provider` replies with valid cart proposals. Confirmation and duplicate confirmation both returned 200; duplicate message submission returned the completed ticket through the existing 202 response without another provider attempt. Structured checkout remained a separate action.

| Request ID | Version | Evidence |
| --- | --- | --- |
| `ab0e7066-b502-4f1d-94a8-ac1510856e67` | Initial hosted API | Exactly one settled ledger row, `charge_nano: 107500` (**US$0.00010750**), despite submission/confirmation replay. |
| `e1d1d836-217d-4e94-8148-0dbf2eb03ac1` | Final hosted API | Exactly one settled ledger row, `charge_nano: 105900` (**US$0.00010590**), despite submission/confirmation replay. |

The two probes cost **US$0.00021340** combined. The existing global US$1/day ledger, 45-second minimum dispatch spacing, token bounds, conservative unknown-charge handling, and no automatic paid retries remain in force. These probes are not a paid load test or a change to the budget.

## Client and browser evidence

- Both client uploads include `https://last-slice-api-staging.hriccio.workers.dev`; the PWA bundle contains no temporary tunnel hostname. React HTML, referenced JavaScript/CSS, and Open Graph metadata still load. The existing public Turnstile site key was preserved.
- The deployed React menu/customization/cart rendered the real Portuguese menu and API quote. Locale switching rendered the English checkout. The automated browser's real Turnstile attempt returned client error `300030` and left the cart recoverable; no protection was disabled to bypass it.
- **The user independently confirmed “Checkout succeeded” in their usual browser on 2026-10-27**, after both clients were deployed. This validates the real React challenge/checkout path in addition to controlled accepted/rejected challenge tests.
- The deployed Flutter PWA loaded the five-flavor Portuguese menu and switched to English successfully against the stable API origin. Its rebuilt API configuration and existing widget tests passed. A new physical iOS/Android installation and full PWA browser checkout were not repeated during this migration; the prior device-installation evidence remains in the original Spec 008 record.

## Resource measurements and limits

The [execution design](worker-design.md) budgets approximately 17,280 alarm invocations/writes per day, one coordinator RPC per dynamic API request, and a conservative 20,000-request/day demo workload. Polling consumes this budget. A continuously active single 128 MiB object is approximately 10,800 GiB-seconds/day; account-wide usage and retries consume additional headroom.

A short sanitized live tail on the final version observed ordinary config/menu/quote/kitchen/tracking invocations at **1–3 ms CPU**, all with outcome `ok`. Only numeric CPU/wall time, sanitized route names, and outcomes were emitted; headers/content were discarded, and the temporary tail sessions were removed. Earlier final-version GraphQL aggregates reported **37 requests, zero errors, P50 2.238 ms, P99 19.330 ms**, and P99 memory approximately **10.7 MiB**. These samples are small and include occasional CPU spikes; they do not prove every request remains below 10 ms. Cloudflare documents [infrequent CPU-limit flexibility](https://developers.cloudflare.com/workers/platform/limits/#cpu-time), but sustained over-limit work can be terminated. No `exceededCpu`, memory-limit, or other invocation errors were observed in these probes.

Durable Object invocation aggregates had not populated when queried; there is no fabricated DO CPU/memory measurement. Successful live tokenization/provider/proposal flows establish functional compatibility, not long-term resource headroom. Outgoing calls remain bounded by the existing finite route/RPC/provider flow; ordinary calls make roughly 1–3 service calls, below the 50-subrequest free limit. Tokenization stays on the coordinator, whose documented CPU allowance is 30 seconds, rather than the 10 ms ordinary Worker.

## Remaining validation and recovery limits

- Repeat a full PWA device checkout/installation if device-specific release certification is required; it was not repeated here.
- Monitor longer-term Worker CPU spikes and account-wide Worker/DO quotas, including DO resource metrics when available. If sustained CPU limits or free quotas prevent the agreed behavior, fail visibly and revise the design/scope; do not silently upgrade or drop the assistant. This short validation does not certify an SLA or unlimited free usage.
- Eviction/deployment can expire volatile chat/replies/proposals and reset short-lived rate counters. Supabase orders, reserved costs, dispatch spacing, and duplicate-attempt protection survive replacement. Owner replacement and unknown-charge/budget/day-rollover failure semantics are covered by controlled runtime/API/SQL tests, not destructive live provider experiments.
- Old client/API versions remain available through Cloudflare deployment history. Restoring a tunnel-based client version also requires restoring its matching local API/tunnel. The working hosted deployment is left active; no local runtime was started as a hosting dependency.
