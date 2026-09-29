# Presend recovery and consumer guidance: acceptance record

Archived on 2026-09-29 Asia/Shanghai with user authorization. Status: implementation, consumer guidance and scoped Web review complete; v0.3.2 release/closeout record. Publication status is authoritative at the [release](https://github.com/David-JA/codex-web-review-relay/releases/tag/v0.3.2); final branch integration is recorded by the merge PR, not inferred from review PASS.

## Accepted scope

- Implementation: `5d16d760587395764cf64da3d7f34c3c17c9b63e` — bounded pre-write DOM stabilization, partial structural diagnostics and explicit one-shot empty-composer recovery with draft, duplicate-send and deadline protection.
- Documentation: `f6ddeb210d9b6efcafcb6b6ced7ed9cdfc22097b` — shared consumer guide, bilingual README entry points and consumer synchronization policy. Consumer repositories were not modified.
- GPT-6 Sol xhigh local review of base `3ff0880ec241b91b4d885410ec8cd82f24e5a585` through `f6ddeb210d9b6efcafcb6b6ced7ed9cdfc22097b`: PASS, no actionable findings; 39 targeted tests passed under Node 24.17. Guide links/anchors and diff checks passed.

## Formal Web review and transport evidence

Both commit-only rounds returned PASS through MCP, with `TURN_IDLE / completed`, no error, matching head/scope and verified first/last anchors. Repo Agent independently recomputed each UTF-8 output hash. `PENDING_REPO_VERIFICATION` in the immutable reviewer text reflects the time of authorship; the subsequent MCP verification below closes normal transport acceptance for those jobs.

| Round | Reviewed head | Job | Output SHA-256 |
|---|---|---|---|
| stage1-main / 1 | `3b7c36b3db76129d90dd2c9e45dc985a3495dec1` | `3199f7b0-ef19-4923-98e7-bd3cf1015273` | `40c68bfe1ebbb825eaaf7ae67dc0a6ee5e26a9f775f8aeacdb9a653b6af587b3` |
| stage1-main / 2 | `38e0ce3a80068d90a70c4d78fd2ead2dff668157` | `ab7d7f28-8210-4bcd-8ca3-2e303f13855e` | `32e6dc26f97a051a571aad912bb2a935ba5aee3b40c7b9948c09398cb6e6b83b` |

Complete results: [round 01](20260929_presend_recovery/round-01-result.json), [round 02](20260929_presend_recovery/round-02-result.json). These contain formal review evidence, not credentials or unrelated chat history. Round 01 independently ran 23 modern DOM tests and 6 supplemental integration tests under Node 22.16; round 02 reviewed the documentation delta and reused the unchanged implementation review without rerunning tests.

## Archival disposition

The two completed handoffs are removed from the current tree and retained unchanged in [Git history at the final reviewed head](https://github.com/David-JA/codex-web-review-relay/tree/38e0ce3a80068d90a70c4d78fd2ead2dff668157/.agents/review_handoffs/review-presend-recovery/stage1-main). No active Spec was created. The consumer guide now points here. Unrelated handoffs, older archives, installed runtime/configuration, persisted jobs and the armed browser conversation remain outside temporary-file cleanup.

The release delta updates product version locations, installation/migration guidance and release assets; protocol versions are unchanged. Versioned asset hashes are published in `SHA256SUMS.txt`. The user's final gate is a GPT-6 Luna xhigh local review of changed file placement, status and archival consistency before merge. Its result is recorded on the merge PR; it is not part of the earlier Web verdict.

## Validation limits

Release validation under Node 24.17: 141/141 tests passed across legacy/modern DOM, content/background, review transport, native protocol/schema and server. Version consistency, installer PowerShell syntax, ZIP allowlists, source-byte parity, SHA-256 and diff checks passed. Assets: extension `590966939658983e485ce11f6f55727a53228eacec90cf03007c0410ca3d264c`; native host `0b7c12b9b760129a56c1d39ead65970bba606279dc7770737be3c7f3538eddc9`.

Normal send and complete MCP response capture succeeded in the specified ChatGPT/IAB session. The original consumer failure's exact DOM cause and real-page empty-composer recovery remain UNVERIFIED. The version update does not imply installed components were upgraded; consumers must update both components for the recovery path. No fresh native-host installation smoke was run against the existing armed live host.
