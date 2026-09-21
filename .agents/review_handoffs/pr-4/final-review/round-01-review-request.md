# Web Review Gate Package

Package kind: `review-request`
Review stream: `final-review`
Effective round: `1`
Target PR: `#4`
Review scope: PR #4 current head; popup semantic status, renewable lease documentation, correlated native-smoke failures, focused regression tests, and scope minimization.

## Request

Please review the exact current head of PR #4 as a small, transport-focused final review.

Check that:

1. The popup exposes current semantic state without presenting the renewable `leaseExpiresAt` snapshot as a durable session deadline; the protocol field itself remains compatible.
2. Tests and bilingual documentation correctly distinguish the UTC heartbeat-lease snapshot from manual Arm binding lifetime and a review job hard deadline.
3. `smoke:native` correlates native `ERROR` frames to its requests, reports `EADDRINUSE` as `SMOKE_BLOCKED:NATIVE_HOST_ALREADY_RUNNING`, and does not suggest disturbing an existing host or armed conversation.
4. English and Chinese guidance remain aligned, including the conjunctive smoke precondition: neither a relay host nor an armed conversation is active.
5. The patch does not change transport timing, fingerprint ownership, production session arbitration, or other unrelated behavior.

Publish the formal verdict on GitHub PR #4 as a review or PR conversation comment. Include `[Web-agent]`, the full `Reviewed head`, exact `Review scope`, `Verdict: PASS / REQUEST CHANGES / HUMAN DECISION REQUIRED`, and actionable findings. The chat response is transport evidence only and does not replace the GitHub formal source.
