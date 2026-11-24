# Vapi platform capabilities: research notes

Checked 2026-11-24 against docs.vapi.ai, the Vapi OpenAPI spec (https://api.vapi.ai/api-json), the @vapi-ai/web README and vapi.ai/pricing.
**VERIFIED** means it was read in official docs or the spec. **UNVERIFIED** means it is inferred or not stated in the docs.

## 1. Server (function) tools: webhook request and response
- When the model calls a `function` tool that has a `server.url`, Vapi POSTs `{ message: { type: "tool-calls", toolCallList, toolWithToolCallList, call, assistant, artifact } }`. **VERIFIED**: https://docs.vapi.ai/server-url/events, https://docs.vapi.ai/tools/custom-tools
- Respond with **HTTP 200** and `{ "results": [ { "toolCallId", "result" | "error" } ] }`. Return one entry per call, in any order. `result` and `error` are flat **strings**, so serialize objects first. Vapi ignores a non-200 response and the assistant says "no result returned". The presence of `error` triggers the tool's request-failed message. **VERIFIED**: https://docs.vapi.ai/tools/custom-tools
- Is the result spoken? The docs say "the assistant receives the result and can speak it" (https://docs.vapi.ai/tools.md). The result goes back to the model as tool output, and the model writes the reply. That matches the docs, but no page says outright that the text is not spoken verbatim. **UNVERIFIED**. A fixed phrase can be spoken with the tool's `request-start`, `request-complete` or `request-failed` messages. **VERIFIED**: custom-tools page
- Timeout: the Server URL default is **20 s**, configurable from 1 to 300 s with `server.timeoutSeconds`, and capped at 10 s when Static IPs are enabled. There are no retries unless you set `backoffPlan`. **VERIFIED**: https://docs.vapi.ai/server-url/events, and the spec's `Server.timeoutSeconds @default 20`
- `apiRequest` tools call your HTTP endpoint directly, with no tool-calls envelope. Use `function` tools to get the webhook envelope and async or client-side behaviour. **VERIFIED**: https://docs.vapi.ai/tools/api-request-vs-function.md

```json
// Request (abridged)
{ "message": {
    "type": "tool-calls",
    "call": { "id": "call_...", "monitor": { "controlUrl": "https://..." } },
    "toolCallList": [
      { "id": "abc123", "type": "function",
        "function": { "name": "lookupDebt", "arguments": { "customerId": "42" } } } ],
    "toolWithToolCallList": [ /* tool definition + toolCall */ ] } }
```
```json
// Response (HTTP 200)
{ "results": [ { "toolCallId": "abc123", "result": "{\"balance\":1250,\"currency\":\"NOK\"}" } ] }
// or, on failure:
{ "results": [ { "toolCallId": "abc123", "error": "Customer not found" } ] }
```

## 2. Transient assistant from the Web SDK
- `vapi.start(assistantObject)` accepts a full inline assistant (`model`, `voice`, `tools`, ...). You can also call `vapi.start(assistantId, assistantOverrides)`. **VERIFIED**: https://github.com/VapiAI/client-sdk-web (README). The docs.vapi.ai web pages show only the assistantId form.
- Restrictions: a public key, or a short-lived public JWT signed by your server, can restrict `allowedOrigins` and `allowedAssistantIds`. `allowTransientAssistant: false` blocks inline assistants, and setting `allowedAssistantIds` rejects transient assistants. Violations return a 403. The docs list no field-level restrictions on what a transient config may contain. **VERIFIED**: https://docs.vapi.ai/customization/jwt-authentication
- Risk: anyone holding the public key can start calls with any inline config, including our system prompt and server URL. For production, prefer a saved assistant with `allowedAssistantIds` plus `assistantOverrides.variableValues`. (Our recommendation.)

## 3. Events and live transcript
- Server events: `status-update`, `transcript` (and `transcript[transcriptType="final"]`), `conversation-update`, `end-of-call-report`, `tool-calls`, `speech-update`, `hang`, `model-output`, `transfer-update`, `user-interrupted` and others. Only `tool-calls`, `assistant-request`, `transfer-destination-request`, `knowledge-base-request` and `handoff-destination-request` need a response. **VERIFIED**: https://docs.vapi.ai/server-url/events
- Default `serverMessages`: conversation-update, end-of-call-report, function-call, hang, speech-update, status-update, tool-calls, transfer-destination-request, handoff-destination-request, user-interrupted, assistant.started. **`transcript` is not in the server default list**, so add it if the server needs it. **VERIFIED**: https://docs.vapi.ai/api-reference/assistants/create
- Default `clientMessages` include `transcript`, `conversation-update`, `tool-calls`, `status-update`, `speech-update` and `model-output`. **VERIFIED**: same page.
- **Both channels work.** For our UI, the simplest option is `vapi.on("message", m => m.type === "transcript" ...)` in the browser, which carries `role`, `transcript` and `transcriptType` (partial or final). Use server webhooks for persistence and the `end-of-call-report`. **VERIFIED**: https://docs.vapi.ai/quickstart/web, SDK README

## 4. Public URL for tool calls
- Yes. Vapi must reach the server URL "via the open Internet", and localhost doesn't work. Use ngrok (or another tunnel). `vapi listen` is only a local forwarder and doesn't create a public URL. **VERIFIED**: https://docs.vapi.ai/server-url/developing-locally.md
- Alternatives:
  - (a) **Client-side tools.** Define a `function` tool without a server URL, add `clientMessages: ["tool-calls"]`, and handle it in `vapi.on("message")`. These are **fire-and-forget**: "Client-side tools cannot send a tool result back to the model." **VERIFIED**: https://docs.vapi.ai/tools/client-side-websdk.md
  - (b) `vapi.send({ type: "add-message", message: { role: "system", content } })` injects context, such as data the browser fetched from localhost. By default it triggers a response. This works as a workaround, but it isn't a real tool result. **VERIFIED**: same page
  - Neither option replaces a synchronous server tool. For something like a debt lookup, plan on a tunnel during development.

## 5. Custom LLM
The provider `custom-llm` exists. Set `model.url` as an OpenAI-style base URL, and Vapi POSTs to `{url}/chat/completions` with an OpenAI-compatible body (`model`, `messages`, `temperature`, `tools`, plus call metadata). The official examples answer with **SSE streaming** of OpenAI chunk objects (`data: {...}\n\n` … `data: [DONE]`) and handle `delta.tool_calls` / `finish_reason: "tool_calls"`. Tool calls can run inside your LLM server, or Vapi can call separate `server.url` tools as usual. The URL must be a public https URL. The OpenAI-compatible shape and the `/chat/completions` path are **VERIFIED** (https://docs.vapi.ai/customization/custom-llm/using-your-server.md, https://docs.vapi.ai/customization/tool-calling-integration.md). The docs never say streaming is *required*, so that part is **UNVERIFIED**, though every example streams. This route would let us run any Claude model through our own Hono endpoint.

## 6. Anthropic models
- The docs list claude-opus-4-6, claude-opus-4-5-20251101, claude-sonnet-5, claude-sonnet-4-6, claude-sonnet-4-5-20250929, claude-haiku-5-5 and claude-haiku-4-5-20251001. **VERIFIED**: https://docs.vapi.ai/providers/model/anthropic
- In the API spec, `AnthropicModel.model` is a **closed enum** that also holds older 3.x and 4.0 ids, and it has no Sonnet 5.5. An id outside the enum will almost certainly fail validation. That outcome is inferred and **UNVERIFIED** (not tested). The spec itself is **VERIFIED**: https://api.vapi.ai/api-json
- To use an unlisted model such as Claude Sonnet 5.5, use `custom-llm` with our own proxy (section 5). (Inference.)

## 7. Pricing and concurrency
- Vapi hosting fee: **$0.05/min**. Provider costs (STT, LLM, TTS) are passed through at cost. The pricing calculator's example estimates about **$82–129 per 1,000 min (≈ $0.08–0.13/min all-in)** for Deepgram + OpenAI + ElevenLabs. **VERIFIED**: https://vapi.ai/pricing
- Plans and included concurrent calls: no package (pay as you go, $5 free credit) **4**; Core $29/mo **10**; Pro (10% of hosting fee, $999/mo minimum) **30**; Premier custom. Extra lines cost **$10/line/month**. **VERIFIED**: https://vapi.ai/pricing. Legacy accounts have 10. **VERIFIED**: https://docs.vapi.ai/calls/call-concurrency.md
- Whether web calls count toward concurrency is not stated. They probably do ("each call occupies one slot"). **UNVERIFIED**.

## 8. Ending and transferring calls
- The assistant ends the call with the built-in tool `{ "type": "endCall" }`, which can carry a `request-start` goodbye message. The ended reason is `assistant-ended-call`. Other options are `endCallPhrases`, `endCallAfterSpokenEnabled` on a function tool, silence timeout and max duration. **VERIFIED**: https://docs.vapi.ai/tools/hang-up
- The backend uses **Live Call Control**: POST to `call.monitor.controlUrl`, which is included in `tool-calls` and `status-update` payloads. Commands are `{"type":"end-call"}`, `{"type":"say", "content", "endCallAfterSpoken"}`, `add-message`, `control` (mute or unmute), and `transfer`/`handoff` to a number, SIP URI, assistant or squad. **VERIFIED**: https://docs.vapi.ai/calls/call-features, https://docs.vapi.ai/calls/call-dynamic-transfers
- The docs don't confirm that controlUrl works for **web** calls. **UNVERIFIED**. A transfer to a phone number from a browser call is also untested. For a browser demo, an "escalation" can be shown as `say` plus `end-call`, or as a handoff to another assistant. From the browser itself you can also use `vapi.say(text, endCallAfterSpoken)` and `vapi.stop()`. **VERIFIED**: SDK README
