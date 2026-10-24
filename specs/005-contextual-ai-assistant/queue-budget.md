# Chat queue, worst-case cost, and response-time feedback

**Status:** Implemented and validated on 2026-10-24; see [release evidence](../release-validation.md)
**Parent:** [Spec 005](spec.md)

## Goal and boundaries

Keep natural customer chat available in a public demo while limiting this application's model-token spend. When capacity is occupied, a customer sees an honest wait estimate and may wait or cancel. Structured ordering remains usable throughout. The separate simulated kitchen staff feed makes no paid model calls and does not share this queue.

The accepted cap is **US$1.00 per UTC calendar day**. It covers requests dispatched by this application's ledger at the configured model's standard USD token rates. It is not a claim to cap taxes, currency conversion, infrastructure charges, or other applications using the same OpenAI account/key. No additional paid tools, images, audio, premium service tier, or silent provider/model fallback are permitted by this cost model.

## WCS calculation

WCS means the maximum allowed token charge of one provider attempt, not its observed average cost. The accepted model is `gpt-5-nano-2025-08-07`.

| Quantity | Bound / configured rate |
| --- | ---: |
| Complete provider input, including framing | 4,000 tokens |
| Generated output, including reasoning | 800 tokens |
| Standard input rate | US$0.05 / million tokens |
| Standard output rate | US$0.40 / million tokens |
| Input WCS | US$0.00020 |
| Output WCS | US$0.00032 |
| Total WCS per attempt | **US$0.00052** |

`WCS = (4000 × 0.05 + 800 × 0.40) / 1,000,000 = US$0.00052`

`minimum slot interval = ceil(86400 × WCS / daily budget) = ceil(44.928) = 45 seconds`

At full utilization, 1,920 dispatch slots per 24 hours reserve at most **US$0.99840**. The independent hard budget check remains mandatory; a queue or concurrency limit alone would allow spend to grow over time. Observed usage below WCS releases unused reservations but does not accelerate the 45-second pacing policy.

Rates were verified against [official OpenAI standard pricing](https://developers.openai.com/api/docs/pricing) on 2026-10-24. Ignore caching discounts when reserving. Record the model/rate policy version for each reservation; pause paid admission if rates/configuration cannot be validated, and recompute WCS/pacing before changing models, token bounds, or known provider prices. The budget is enforced at these configured rates, not by an assurance that external prices can never change.

Use exact token accounting appropriate to the configured model, including message framing, before dispatch. Preserve system rules and authoritative menu/quote context; remove oldest history turns first to fit. If the essential input plus the current message still cannot fit, reject it recoverably without a paid call. Byte/character limits alone are not token accounting. The provider request must enforce `max_completion_tokens: 800`.

## Admission and scheduling

- One logical global FIFO queue serves all public customer conversations, with at most **12 waiting messages** and **one running request**. Each transient conversation may have only one queued/running message. There is no queue per account, IP address, or browser fingerprint.
- The same opaque conversation capability and `requestId` identify retries. Duplicate submissions return the existing ticket/state, never another position or paid call. A newly created capability cannot bypass global pacing, capacity, or spending limits; it is not proof of a distinct human.
- Dispatch only when the previous logical request has finished/failed, the next 45-second slot is due, and the daily ledger can reserve a full WCS amount. Preserve the next-slot timestamp across restarts and the UTC day boundary, so restarting or crossing midnight does not grant an extra immediate burst.
- Queue admission does not call the provider. Reserve atomically immediately before dispatch; queue cancellation/expiry before dispatch therefore incurs no provider charge. When there is not enough daily budget for another full reservation, stop new admission rather than keeping people waiting until tomorrow.
- Recheck budget and eligibility at dispatch. If earlier unknown costs or another committed reservation exhaust the budget, terminate remaining waiting tickets with a localized budget error; do not silently keep them beyond the advertised limits.
- Bound waiting lifetime to **10 minutes** and reject admission when the current estimate already exceeds that bound. Enforce both the count and wait bounds rather than presenting an unbounded queue.
- Keep a waiting ticket active only while its client renews an anonymous presence lease through foreground polling. A **60-second** lease expiry cancels an undispatched ticket; closing the panel explicitly cancels it immediately when possible. Background clients pause polling and may lose their place, with a localized explanation and their unsent text retained for explicit retry.
- Do not turn client/network retries, timeouts, provider errors, or a poll into automatic additional paid attempts. A new paid attempt requires a new explicit user submission and another reservation/slot. Duplicate retrieval remains free of model calls.
- Limit control-plane requests as well as paid work. Poll waiting/running tickets no more often than every **3 seconds**, honor a longer server retry interval, pause while the panel/app is hidden, and avoid overlapping polls. Repeated sends must not create additional work.

## Budget ledger and failures

- Store monetary amounts in integer nanodollars: one input token costs 50 nanodollars, one generated token costs 400 nanodollars, one WCS reservation is **520,000 nanodollars**, and the daily limit is 1,000,000,000 nanodollars. Do not use floating-point currency arithmetic or truncate fractional microdollars.
- Before a dispatch, atomically check `settled actual cost + outstanding WCS reservations + conservative unknown charges + this WCS <= daily cap`. Reserve and acquire the dispatch lease in the same coordinated operation; concurrent API processes must not each believe the slot/budget is available.
- Settle an attempt idempotently using the provider's reported input and generated token usage. Duplicate settlement/retrieval must not release funds twice. Do not add reasoning twice: it is included in generated-token accounting. Release only the unused part of a known WCS reservation. If usage exceeds configured bounds/rates, stop further paid calls and report an operational policy mismatch without leaking content or credentials.
- On a timeout, disconnect, malformed response, or missing usage, retain the full reservation as a conservative charge unless there is reliable confirmation that no provider attempt occurred. An abort does not prove the provider did no work.
- The daily accounting/slot ledger must survive process restarts and coordinate all running API instances in Supabase mode. It contains dates, amounts, policy versions, opaque attempt IDs, and lease/accounting states, with no chat text, menu snapshot, IP, identity, or bearer credentials.
- Chat payloads/results remain bounded volatile data. Restarting may expire their tickets and lose their replies; it must not erase reserved costs or replay paid work. Do not add Redis, a third-party queue service, or a new deployment platform just to implement this contract without a further need/decision.
- A process-memory ledger can support deterministic local fake mode, but is insufficient to advertise a restart-safe public spending cap. If durable coordination is unavailable in public mode, fail closed for paid admission while the ordinary ordering flow remains usable.
- Reset the daily admission allowance by UTC day, not by process lifetime. Outstanding attempts keep their original reservation's accounting day. Return `resetsAt` for budget exhaustion without exposing account billing details.

## Client and API states

The shared contracts must represent `queued`, `running`, `completed`, `cancelled`, `expired`, and `failed`. The client never calls the provider directly.

- `POST /assistant/messages`: validate/minimize input and deduplicate, then return `202` with `requestId`, state, an opaque access capability supplied privately, `pollAfterSeconds`, and optional timing fields. No reply is fabricated while queued. A local deterministic fake may still return its clearly marked immediate `200` response.
- `GET /assistant/requests/{requestId}`: require the conversation capability in a header. Return only that ticket's state, timing information, or completed `reply`/`disclaimer`. It may renew the waiting lease but must not enqueue, dispatch, or retry paid work as a side effect of polling.
- `DELETE /assistant/requests/{requestId}`: cancel a waiting ticket and remove its volatile payload idempotently. For a running attempt, explain that it already started; best-effort abort/discard may be offered, but do not promise a cost refund or undo the reservation solely because the browser closes.
- Queue estimates may include `position` (among waiting messages), `estimatedWaitSeconds` (until start), `estimatedReplySeconds` (until answer), `recentAverageReplySeconds`, and `estimateUpdatedAt`. Never return other visitors' messages, tickets, capabilities, or identities.
- Safe error keys include `assistant_queue_full`, `assistant_budget_exhausted`, `assistant_request_expired`, `assistant_already_pending`, `assistant_input_too_large`, `assistant_unavailable`, and `assistant_timeout`. Use the existing error envelope and suitable `429`, `410`, or `503` statuses. Full/budget responses include retry/reset information when known; unknown or unauthorized tickets must not reveal that another conversation exists.
- Keep completed replies in process memory for at most **5 minutes** for idempotent retrieval, then expire them. Clear cancelled/expired waiting content immediately. Keep capabilities only in client session memory and redact them from access logs; never put them in URLs, persistent browser storage, or shared kitchen data.
- Changing the underlying cart while waiting must not let an old reply imply it describes a new quote. Retain the submitted selection/context association and identify stale quote advice or invite a fresh explicit question when necessary.

## Honest response-time feedback

Show the estimate for **this request** prominently. Derive it from the current slot, waiting messages ahead, one-request concurrency, and a bounded recent provider-service-time estimate. Recalculate when positions, capacity, or provider availability change. Queue position alone is not a time estimate.

Also show the recent observed **average time to answer**, measured from accepted submission to completed reply, so it includes queue waiting and provider latency. Use the latest 100 completed requests from the last 15 minutes, across both clients, and show an average only with at least five samples. These are aggregate elapsed-time measurements, not message/visitor records. Failed/cancelled requests are not counted as successful response times, but recent provider failures must make availability estimates more cautious or unavailable.

At cold start, do not label a configured fallback as a measured average. An 8-second configured provider allowance may inform an initial estimate; display “Estimativa inicial” / “Initial estimate” and “Ainda sem média recente” / “No recent average yet”. The earlier eight-call model-selection probe is not the public queue's observed average.

Example labels (values are illustrative and must come from actual queue state):

- `pt-BR`: “Você está na posição 3. Resposta estimada em cerca de 2 min.” / “Tempo médio recente para responder: 1 min 20 s.”
- `en-US`: “You’re number 3 in the queue. Estimated reply in about 2 min.” / “Recent average time to answer: 1 min 20 sec.”

Use rounded approximate durations; do not promise an exact countdown or imply the provider is guaranteed to reply. If an outage prevents a useful estimate, show “AI temporarily unavailable” with the localized recovery path. At the daily cap, show the reset time instead of an invented short wait. Queueing must never claim a human staff member is personally serving the visitor.

Announce queued/running/completed/cancelled/expired/error changes politely, preserve keyboard focus, and avoid announcing every countdown/poll update. Waiting must not disable cart, customization, checkout, or the chat's cancel control. Preserve the customer's draft when queue admission fails.

## Acceptance evidence required

- Deterministic token/cost arithmetic proves the WCS, 45-second pacing, and daily cap, including the maximum-input/output case and generated reasoning usage.
- Concurrent reservations, UTC midnight, restarts, expired dispatch leases, unknown charges, and ledger outages cannot create budget/slot bypasses.
- Duplicate submissions/polls, repeated sends, new anonymous capabilities, full capacity, cancellation, presence expiry, and explicit retry do not create extra paid attempts or leak another conversation.
- Input construction/trimming never drops the system rules or trusts client prices, and rejects essential prompts over the input bound before making a provider call.
- React and Flutter cover both locales, queue estimates versus recent averages, cold start, outages, reset times, focus retention, foreground polling, stale quote context, and continuing the ordering flow while waiting.
- Application logs/durable accounting contain no messages, responses, bearer secrets, or visitor identity. No live paid load test is needed to prove budget boundaries; use controlled usage and clocks.
