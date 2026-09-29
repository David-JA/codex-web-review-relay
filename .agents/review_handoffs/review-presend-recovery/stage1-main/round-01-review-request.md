# Commit Review Request

Package kind: `review-request`
Review stream: `stage1-main`
Effective round: `1`
Target kind: `commit`
Target ID: `review-presend-recovery`
Review scope: pre-send DOM stabilization, structural diagnostics, and operator-confirmed empty-composer recovery

## Findings to review

Review the implementation delta from `3ff0880ec241b91b4d885410ec8cd82f24e5a585` to implementation commit `5d16d760587395764cf64da3d7f34c3c17c9b63e`, using the envelope's reviewed head to read this handoff and the files. This is a commit-only review: return the complete verdict here, without publishing a GitHub comment.

The consumer's failed dispatch returned MESSAGE_IDENTITY_AMBIGUOUS almost immediately, with a missing initialization tracker and zero diagnostic counts. A later Check page succeeded, but recovery found neither a matching sent message nor an exact composer draft. The actual failing page DOM has not been captured, so transient duplicates are a reproduced possibility, not a proven live root cause.

Check the bounded baseline preparation in extension/dom-adapter.js, preserved partial evidence and failure stage, and the recovery permission propagated from src/native-protocol.ts through extension/background.js and extension/content.js. In particular: automatic reconciliation must not refill an empty composer; explicit one-shot manual recovery may do so only while send budget remains, without overwriting an unrelated draft, duplicating an existing message, or clicking after the deadline. Persistent identity ambiguity must still stop dispatch. Review schema compatibility and the README/convention statements as needed.

Relevant tests: test/dom-adapter-modern.test.ts, test/extension-content.test.ts, test/extension-background.test.ts, test/review-transport.test.ts, test/native-protocol.test.ts, and test/native-messaging-schema.test.ts. Local evidence: 136 related regressions passed, then final DOM/background changes passed 38 tests; script syntax and git diff --check passed. Native host was updated in place to this implementation, preserving configuration, credentials, and persisted jobs; extension reload and manual Arm were reported by the user. This request is the first real-page end-to-end check of this repair, not proof that the consumer's original failing DOM or empty-composer recovery has been exercised live.

Keep the review scoped and concise. Distinguish blocking findings from optional improvements. Report unreadable evidence as UNVERIFIED rather than inferring PASS from this summary.

Response first line: `Reviewed head: <full SHA from envelope>`
Then include `RELAY_REVIEW_BEGIN`, the exact Review scope above, `Verdict: PASS | REQUEST CHANGES | HUMAN DECISION REQUIRED`, actionable findings (or None), and verification limits.
End with `RELAY_REVIEW_END` followed by `[END OF REVIEW]` as the final line.
