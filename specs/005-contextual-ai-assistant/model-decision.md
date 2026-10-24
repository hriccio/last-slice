# Assistant model and credential decision

Recorded on 2026-10-24. This is a provider selection probe, not completed Spec 005 acceptance.

## Decision

Start with `gpt-5-nano-2025-08-07`, available with the existing `OPENAI_API_KEY` vault entry. The key was read transiently through KeePassXC; no decrypted credential was persisted. Keep the model behind the API adapter and configurable at runtime.

Current standard prices per million tokens are $0.05 input / $0.40 output for GPT-5 nano, compared with $0.10 / $0.40 for GPT-4.1 nano and $0.20 / $1.25 for GPT-5.4 nano. Reasoning tokens count toward generated-token cost, so compare observed cost and answer quality as well as headline input prices. Sources: [official pricing](https://developers.openai.com/api/docs/pricing), [GPT-5 nano model](https://developers.openai.com/api/docs/models/gpt-5-nano), [GPT-4.1 nano model](https://developers.openai.com/api/docs/models/gpt-4.1-nano).

## Live probe

Eight synthetic requests covered ingredients, an unsupported flavor, a quoted BRL total, a requested cart/order change, instruction injection, real delivery timing, locale selection, and a price without a current quote. All eight GPT-5 nano calls returned content, with observed latency of 1.21–2.45 seconds. Estimated standard token cost for the eight calls was $0.00028930. These small-context results do not establish production latency or cost.

The responses used supplied ingredients and the supplied quote, declined real fulfillment/secret requests, and redirected changes to the structured flow. Some wording was awkward or could imply the assistant would help perform a change. Natural phrasing, readable BRL formatting, and clear advice-versus-action language therefore remain explicit acceptance checks. The full application adapter and client flows were not tested by this probe.

The GPT-4.1 nano snapshot returned `404 model_not_found` with this key, so its suitability was not established. No automatic fallback or model upgrade is authorized by that result.

Probe settings for GPT-5 nano were `reasoning_effort: minimal`, `verbosity: low`, `max_completion_tokens: 800`, and `store: false`. The current application adapter still sends a custom temperature and legacy `max_tokens`; it must use the supported parameters before the app can use this selection. The customer-facing API contract remains independent of these provider details.

## Privacy and spending

Only synthetic menu questions and fictional selection context were sent during the probe. The model never received the key, customer identity, order codes, or addresses. Free-form public chat still needs data minimization, bounded history, redaction, and global spending limits.

OpenAI API content is not used for training by default. Standard abuse-monitoring content may be retained for up to 30 days; disabling request storage is not the same as approved Zero Data Retention. Check and document the actual project's settings before public launch. Source: [official data controls](https://developers.openai.com/api/docs/guides/your-data).
