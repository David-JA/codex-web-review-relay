# ChatGPT modern DOM adaptation: acceptance record

Accepted on 2026-09-27 UTC (2026-09-28 Asia/Shanghai). Archived on 2026-09-28 Asia/Shanghai with user authorization. Status: implementation and transport acceptance complete.

## Result

The updated unpacked extension was reloaded in Codex IAB, the specified ChatGPT conversation was refreshed, and the session was armed again. The read-only Check page reported composerReady=true, 5 user turns, 5 assistant turns, unresolvedTurns=0, generating=false and lastAssistantComplete=true before the final request.

The round-03 review completed through the actual localhost MCP transport. This closes the real-page request/response acceptance gate; the earlier browser-only PASS responses did not close it.

- Implementation commit: bb13cfcea8b6a4dc4d2a37d68aa03c760c2376aa
- Reviewed head: 70a76988373dbb94c503b4ba91dac4117a315525
- Branch: codex/chatgpt-modern-dom
- Handoff: [round-03-review-fix.md](https://github.com/David-JA/codex-web-review-relay/blob/70a76988373dbb94c503b4ba91dac4117a315525/.agents/review_handoffs/review-chatgpt-modern-dom/compatibility/round-03-review-fix.md)
- Handoff SHA-256: 58420cb316bd9c046971be7bd6161ed372bd2f8442c2fc5c99618b41e504193a
- Job: b36a0209-c51b-4854-adab-f6d12e50c89b
- Phase/result: TURN_IDLE / completed
- Error: null
- Formal verdict: PASS; R1, R2 and R3 RESOLVED; no new blocking findings
- Review scope: extension DOM adapter and read-only popup diagnostics; corresponding regression tests; bilingual Check page documentation
- Complete assistant_output received via get_review_transport_status: 3424 UTF-8 bytes
- assistant_output_sha256: 61499880bf6174db90c1e97eebaefe94604e23e1f5a28b06fef33cfc4c94c7d0
- Independently recomputed UTF-8 SHA-256: matched
- Exact reviewed head and scope in verdict: matched
- RELAY_REVIEW_BEGIN / RELAY_REVIEW_END: both verified

## Validation and boundaries

Repo Agent: 71/71 focused legacy DOM, modern DOM and content tests passed using Node v24.17.0; git diff --check passed. Web Agent independently ran 19/19 checks using Node v22.16.0, verified source blobs, and reproduced two failures with the old adapter. The shell-element reuse test also passed with the old adapter and is a protective regression, not independent red/green evidence; this clarifies the broader wording in the immutable round-03 handoff.

The final fix selects the assistant paired with the confirmed stable modern turn key; unrelated cached empty shells no longer prevent complete output. Virtualized records remain cached and the legacy unknown-boundary guard remains in place. The previous fragment-order and pending-assistant fixes remain accepted.

The previous round-02 evidence-amendment job 5f7c67b0-af99-4042-993e-1b57937926db was confirmed TIMEOUT / TURN_DEADLINE_EXCEEDED with null output and hash. Its diagnostic records were preserved and retrieved; it was not redispatched or reconstructed from browser text.

This acceptance covers the specified current ChatGPT/IAB conversation and the exercised tests. It does not establish compatibility with every future ChatGPT rollout. At initial acceptance, no merge, release, tag or PR comment had been performed. This record adds evidence only and makes no implementation change after the reviewed head.

## Closeout disposition (2026-09-28)

The completed review stream is archived here; its four handoffs are removed from the current tree and remain immutable in [Git history at the reviewed head](https://github.com/David-JA/codex-web-review-relay/tree/70a76988373dbb94c503b4ba91dac4117a315525/.agents/review_handoffs/review-chatgpt-modern-dom/compatibility). No active Spec was created for this bounded compatibility fix. The unrelated PR #4 handoff and existing archives are outside this closeout scope.

The complete persisted MCP verdict was read back again during closeout: TURN_IDLE / completed, PASS, matching reviewed head, both anchors and the independently recomputed SHA-256 above. Implementation and test files have not changed since that review. Therefore another Web review is unnecessary; the closeout delta consists only of documentation clarification and archival disposition. The merge PR is the authority for final merge status.

Both READMEs describe the modern paired-turn behavior and retain the reload/refresh and read-only Check page instructions. The turn-parser convention now explicitly records the confirmed stable-key rule; transport contracts, review policy and release version are unchanged. These are source-checkout changes; existing v0.3.0 release ZIPs are not rebuilt or republished by this closeout.

Closeout regression: `node --experimental-strip-types --test test/dom-adapter.test.ts test/dom-adapter-modern.test.ts test/extension-content.test.ts test/extension-background.test.ts` passed 86/86 tests (0 failed/skipped). This covers both DOM layouts, fragment ordering and hydration, content lifecycle/ACK recovery, background binding and read-only page diagnostics. `git diff --check` passed. A full native-host smoke was not run because the live host/session is armed and this closeout does not change native-host code.
