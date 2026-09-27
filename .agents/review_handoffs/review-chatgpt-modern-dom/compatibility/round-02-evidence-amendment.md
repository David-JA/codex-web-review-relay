# ChatGPT compatibility review: transport evidence amendment

Package kind: `evidence-amendment`
Review stream: `compatibility`
Effective round: `2`
Target kind: `commit`
Target ID: `review-chatgpt-modern-dom`
Review scope: extension DOM adapter and read-only popup diagnostics; corresponding regression tests; bilingual Check page documentation

## First acceptance item: failed full-verdict transport

The preceding round-2 job `9219d972-cf0f-493c-a4e6-95c5c4bc5f9d` ended in TIMEOUT / TURN_DEADLINE_EXCEEDED with null assistant_output and null hash. It is terminal and must not be dispatched again. Diagnostics were retrieved: the older loaded adapter reported TURN_BOUNDARY_UNHYDRATED while the target assistant slot was unhydrated; this is not proof of the complete cause of the later timeout. Browser control was unavailable, so whether the page finished was not independently established. No browser readback was accepted as a formal verdict.

The user has now reloaded the extension and manually armed the same target conversation again. Native /health confirms session `cdccb8bc-c7ae-4b31-a447-cd163ae5e168`, no active job, and working localhost transport. This amendment preserves effective round 2 because there are no new code changes and this is a transport revalidation. A successful result must deliver the complete verdict through MCP, with both anchors and matching UTF-8 SHA-256. The repo agent will verify this; do not declare transport acceptance yourself.

## Review request and finding -> fix mapping

Read this handoff and the actual remote fix diff `34618e9..eebf954` at the exact reviewed head in the envelope. Implementation remains unchanged from round-02-review-fix.md. You may reuse earlier analysis after verifying it against the committed source. Return a concise but complete independent verdict, resolving R1 and R2, exact Reviewed head and scope. Start with RELAY_REVIEW_BEGIN, end with RELAY_REVIEW_END, and state Verdict: PASS, REQUEST CHANGES, or HUMAN DECISION REQUIRED. No GitHub comment or external write is requested.

- R1 (ACCEPTED): a full fragment remount replaces cached order with current DOM order; partial remounts retain detached fragments. Regression: c -> a/b -> a/b/c -> b-only update.
- R2 (ACCEPTED): the confirmed user's own reserved assistant slot may remain pending; traversal stops there instead of crossing later turns. Unknown boundaries still fail closed. Reconcile tests cover later hydration and real content.js monitoring with the actual adapter through USER_TURN_ACKED, ASSISTANT_STARTED, and TURN_IDLE.

## Existing evidence and boundaries

The regressions failed before repair and passed afterwards. DOM legacy + modern + content suites: 68 passed, 0 failed. Background, popup, bilingual docs, native host, protocol, timing and installer are unchanged. No need to rerun unrelated suites or expand scope. Round 1 full REQUEST CHANGES verdict was received and its anchors/hash verified; round 2 is still unverified. Source verification and final loaded-browser verification remain distinct; only successful current transport can establish the latter's request/response path.
