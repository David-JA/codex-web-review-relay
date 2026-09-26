# ChatGPT redesigned DOM compatibility review fix

Package kind: `review-fix`
Review stream: `compatibility`
Effective round: `2`
Target kind: `commit`
Target ID: `review-chatgpt-modern-dom`
Review scope: extension DOM adapter and read-only popup diagnostics; corresponding regression tests; bilingual Check page documentation

## Review request

Review fix commit `eebf954` against `34618e9`, then resolve R1 and R2 from your previous review. Read the actual remote diff and source at the exact reviewed head from the envelope. Keep the original compatibility scope; report only actionable defects and distinguish optional suggestions. This is commit-only review: return the full verdict here without GitHub comments or other external writes. Start with `RELAY_REVIEW_BEGIN`, end with `RELAY_REVIEW_END`, and state the exact Reviewed head, scope, and `Verdict: PASS`, `REQUEST CHANGES`, or `HUMAN DECISION REQUIRED`.

## Finding -> fix mapping

- R1 (ACCEPTED): a pass that mounts every cached fragment now replaces fragmentOrder with current DOM order. A partial pass still merges order and retains cached detached fragments. The regression starts with c alone, then a/b, then a/b/c, checks correct text and completion, and finally checks a partial b update preserves corrected order.
- R2 (ACCEPTED): trackedAssistantTurnsAfter returns no assistant yet at the reserved assistant slot of the confirmed modern user. It stops at that slot without traversing any later turn. Other unknown boundaries still throw TURN_BOUNDARY_UNHYDRATED, including in reconcile. Tests cover pending reconcile, later hydration, unknown boundary rejection, and actual content.js monitoring with the real adapter: USER_TURN_ACKED -> ASSISTANT_STARTED -> TURN_IDLE after later mounting, with complete output.

## Evidence and transport boundary

- Before fixes, the new/updated regression tests reproduced wrong fragment order and failed monitor startup.
- After fixes, `node --experimental-strip-types --test test/dom-adapter.test.ts test/dom-adapter-modern.test.ts test/extension-content.test.ts`: 68 passed, 0 failed. `git diff --check` passed. Background/popup/docs are unchanged since round 1.
- Round 1 job `064bc1bb-2433-48a3-9ecd-371b4387fd61` returned TURN_IDLE/completed with the full REQUEST CHANGES verdict for `34618e956c43f2589a38b46989843933f7ec5461`. Both anchors and UTF-8 SHA-256 were independently verified: `5efa9d1d313324507c7716d42d08649849fab1fa9eb71757dc6d82a36a9042dc`.
- The currently armed browser still uses the round-1 adapter; it successfully transports reviews. This round reviews the committed fixes remotely. Final browser reload of the fixed adapter remains a separate live installation step; do not claim that these two edge cases were reproduced live.

## Scope boundaries

No content lifecycle, native host, server, protocol, timing, installer, locale, release, merge or GitHub lifecycle changes. The fixes are limited to the adapter and regression tests.
