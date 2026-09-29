# Upgrade to v0.3.2

## Existing v0.3.0 / v0.3.1 user-scoped installations

The MCP request shape, protocol version and formal-verdict modes are unchanged. Consumer repositories do not need to rewrite handoffs or install a repository-owned helper.

Download both v0.3.2 ZIP assets and verify SHA256SUMS.txt. To use operator-confirmed empty-composer recovery, update **both the native host and the extension**; an extension-only update does not supply the native-host recovery permission. Older components retain conservative behavior.

Finish any active review before upgrading. Install the v0.3.2 native-host asset into the existing InstallRoot. Reinstallation rebuilds configuration and rotates the Bearer token: preserve intentional configuration overrides, update saved MCP Authorization headers and restart affected clients. Updating a source checkout does not update an installed runtime.

Replace the files in the extension directory actually loaded by the browser (or select the new directory), reload the extension, then refresh the target ChatGPT conversation. If the binding is lost, manually Arm the intended conversation again. Re-Arming alone does not load new code. Check page is optional and read-only; success does not prove sending or complete result capture. Do not run a native smoke against an active host or armed session.

Manual recovery still requires confirmation that the original request was never sent and remains a one-shot operation. Do not reset persisted jobs or manufacture a new round to bypass an exhausted recovery allowance. The update does not prove the root cause of an earlier page failure or retroactively recover an old job.

Consumer conventions do not need new API arguments or rewritten handoffs. When adopting v0.3.2, update the supported-version pointer and route shared usage to the [v0.3.2 consumer guide](https://github.com/David-JA/codex-web-review-relay/blob/v0.3.2/docs/consumer-guide.md); keep project authorization and formal-verdict rules local.

## Older repository-bound installations

Older installations may contain `repositoryRoot`, `helperPath`, a producer-owned helper, or a launcher bound to a previous clone path. They are not migrated in place automatically.

1. Download and extract the v0.3.2 native-host Windows asset.
2. Run the installer again with the existing `<InstallRoot>`.
3. Confirm that `<InstallRoot>\runtime\src\cli.ts`, `<InstallRoot>\runtime\contracts`, and `<InstallRoot>\relay_export_helper.py` exist.
4. Confirm that the new `relay.config.json` contains no `repositoryRoot` or `helperPath` and that the native-host manifest points to `<InstallRoot>\codex-web-review-relay.exe`.
5. Update the MCP client to pass an absolute `handoff_file`.
6. Reload the Chrome extension and restart the MCP client, terminal, IDE, or agent session.

Reinstalling rotates `CODEX_WEB_REVIEW_RELAY_TOKEN` and rebuilds the installation configuration. Replace any old Authorization header or token saved manually in Codex TOML or another MCP client. Existing jobs remain in the installation state database when it is preserved, but the client must use the new token for authenticated status lookup.

Producer repositories no longer install or register a helper. They only create a canonical tracked handoff, commit it at the reviewed `HEAD`, and pass its absolute path to the relay. The relay-owned exporter is installed at `<InstallRoot>\relay_export_helper.py`.
