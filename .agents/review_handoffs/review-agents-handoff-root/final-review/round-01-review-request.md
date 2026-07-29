# Review Request

Package kind: `review-request`
Review stream: `final-review`
Effective round: `1`
Target kind: `commit`
Target ID: `review-agents-handoff-root`
Review scope: full review of implementation commit `77e7e8678b6a36e32ce6451c837add08bdabf97c` for `.agent/` and `.agents/` handoff-root compatibility, plus this transport-only handoff

## Context

The producer repository now tracks review handoffs under `.agents/`, while this
relay repository and release source still accepted only legacy `.agent/`.
The active user-local `remote-fallback-v2` installation carried two uncommitted
compatibility changes (`.agents?`) in the Python exporter and TypeScript
consumer. A normal reinstall from repository source would therefore regress the
working producer integration.

## Review focus

1. Confirm Python exporter, TypeScript validator, and all three published JSON
   Schema branches accept exactly `.agent/` and `.agents/`, without accepting
   `.agentss/`, nested aliases, or roots without the leading dot.
2. Confirm the actual tracked root is preserved in `handoff_path` and therefore
   in Git lookup, envelope, and fingerprint identity; no hidden normalization is
   introduced.
3. Confirm schema version, envelope fields/order, PR fingerprint compatibility,
   target identity, job lifecycle, and transport behavior remain unchanged.
4. Confirm tests cover PR and commit-only mode across runtime, exporter,
   published schema, and release clean-install smoke.
5. Confirm README.md / README.zh-CN.md / conventions remain synchronized and
   installation ordering does not overwrite an unreviewed hotfix.

## Validation evidence

- Targeted contract/exporter/schema/repo-adapter suites: 23/23 PASS.
- Full `npm test`: 151/151 PASS.
- `npm run check:release-version`: PASS.
- `npm run package:release`: PASS.
- `npm run check:release-assets`: PASS.
- Source vs active `remote-fallback-v2`: no semantic diff remains in
  `src/relay-contract.ts` or `relay_export_helper.py`; only line endings differ.

## Required verdict

Return a complete formal verdict in the assistant response with:

- Review scope
- Full reviewed head
- Actionable findings, or `None`
- `Verdict: PASS / REQUEST CHANGES / HUMAN DECISION REQUIRED`

Do not publish a GitHub PR comment. A PASS does not authorize merge, tag,
branch deletion, native-host reinstall, token rotation, or deletion of existing
user-local state.
