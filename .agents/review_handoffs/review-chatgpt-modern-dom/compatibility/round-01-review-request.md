# ChatGPT redesigned DOM compatibility review

Package kind: `review-request`
Review stream: `compatibility`
Effective round: `1`
Target kind: `commit`
Target ID: `review-chatgpt-modern-dom`
Review scope: extension DOM adapter and read-only popup diagnostics; corresponding regression tests; bilingual Check page documentation

## Review request

Review implementation commit `fb82820` against parent `4f96824`, using the exact reviewed head from the envelope to read this handoff and repository files. This is commit-only review: return the complete verdict in this conversation, without posting a GitHub comment or performing external writes. Do not rely on this summary instead of reading the committed diff.

Focus on incorrect user/assistant attribution, stale or truncated output, completion evidence from another turn or code block, virtualized message order, backward compatibility, and read-only diagnostics side effects. Report concrete actionable defects with file/line and reproduction; avoid unrelated refactoring. Return `Verdict: PASS`, `REQUEST CHANGES`, or `HUMAN DECISION REQUIRED`, the full Reviewed head and scope. Start with `RELAY_REVIEW_BEGIN` and end with `RELAY_REVIEW_END` so full transport capture can be checked.

## Implementation and evidence

- Live redesigned ChatGPT uses a shared `data-turn-key` shell, role-bearing search units and UUID message wrappers. The old prompt ID and role nodes are absent. Modern records split the shell by role and preserve unknown boundaries until hydrated.
- Composer/send/stop selectors were read from the actual Chinese page. Modern stop support is currently verified for Chinese `停止`; other locales require fresh DOM evidence.
- Message extraction excludes action controls and thinking UI. Completion requires the shell's assistant action bar after its last assistant unit. UUID fragment order survives partial unmounting.
- Popup Check page returns counts, character lengths and state only, without sending, Arm, native connection or conversation text. Public docs explain mounted-DOM counts and limits.
- Targeted tests: DOM legacy + modern 46/46; background + content 35/35. Real IAB Check page found 2 user / 2 assistant records, 0 unresolved, lengths [5,12], last assistant complete. The visible last reply was RELAY_DOM_OK. IAB Native Messaging successfully reported connected/ARMED.
- Full request-to-verdict transport is the remaining live gate; do not treat the Check page result as proof of end-to-end capture. Any transport failure must remain distinct from this code review verdict.

## Scope boundaries

No native-host, server, protocol, timing, installer, release version or GitHub lifecycle changes. No release publication or merge requested.
