# ChatGPT modern DOM: confirmed-turn transport repair

Package kind: `review-fix`
Review stream: `compatibility`
Effective round: `3`
Target kind: `commit`
Target ID: `review-chatgpt-modern-dom`
Review scope: extension DOM adapter and read-only popup diagnostics; corresponding regression tests; bilingual Check page documentation

## First acceptance item: full-verdict transport failure

The preceding round-2 evidence-amendment job `5f7c67b0-af99-4042-993e-1b57937926db` did not return assistant_output or its hash. The page displayed a complete PASS, but browser readback is not transport acceptance. Read-only persisted diagnostics showed 1264 TURN_BOUNDARY_UNHYDRATED monitor errors despite 1854 characters collected for the target assistant. The tracker retained an additional empty shell boundary after that response. Live Elements inspection found five actual data-turn-key shells; the sixth text-search result was script text, not another live shell. No database record or verdict has been reconstructed from the browser.

## Finding -> fix mapping

- R3 (ACCEPTED, transport blocker): bb13cfc changes modern response tracking to resolve only the assistant record paired with the confirmed stable user key. It no longer scans unrelated subsequent shells, including cached empty boundaries. It retains cached virtualized records, does not rely on a live shell attribute that React may reuse, and keeps the legacy unknown-boundary error unchanged.
- R1 remains fixed: full fragment remount establishes current document order; partial remounts retain missing fragments. The c -> a/b -> a/b/c -> b-only regression still passes.
- R2 remains fixed: the confirmed modern turn may wait for its own assistant to hydrate; it never adopts another turn's response.

## Evidence and request

Review the actual remote diff 6e787a9..bb13cfc at the exact reviewed head in the envelope. Three focused suites (legacy DOM, modern DOM, content integration) passed 71/71. Regressions cover a removed trailing empty shell retained in the tracker, pending own assistant versus a foreign completed turn, and reuse of the shell DOM element for another turn key. The real content.js integration reaches USER_TURN_ACKED, ASSISTANT_STARTED and TURN_IDLE with full output. These cases failed before the fix. git diff --check passed. Native host, protocol, deadlines, persistence and public documentation are unchanged by this repair.

Verify the prior R1/R2 repairs and this focused R3 repair against committed source; reuse prior analysis where still applicable. Return a concise complete verdict beginning RELAY_REVIEW_BEGIN and ending RELAY_REVIEW_END, including Verdict, exact Reviewed head, Review scope, and findings. Do not publish a GitHub comment. The repo agent must separately verify full MCP output, anchors and matching UTF-8 SHA-256 after the extension reload and target-page refresh; do not declare that live transport gate passed on our behalf.
