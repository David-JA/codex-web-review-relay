# v0.3.1

Compatibility patch release for the redesigned ChatGPT page. MCP call signatures, protocol version, single-active-job behavior and formal-verdict modes remain unchanged.

## Changes / 更新内容

- Adapt composer, send/stop controls and message extraction to the redesigned ChatGPT DOM; preserve legacy DOM support.
- Bind the response to the confirmed stable turn key, preserve ordered fragments across virtualization, and prevent unrelated empty shells from blocking complete output.
- Add read-only **Check page** diagnostics without sending messages, arming a session or returning conversation text.
- Include fixes merged since v0.3.0: `.agent/` and `.agents/` handoff-root compatibility, configured remote fallbacks, clearer popup session status, and native-smoke precondition reporting.

适配新版 ChatGPT 输入框、消息与完成标记，修复虚拟化分片顺序及空容器阻断全文回传的问题；新增只读 Check page。包含 v0.3.0 之后已合并的 handoff 路径兼容、remote fallback、会话状态显示与 smoke 前置条件修复。

## Upgrade / 升级

Download both ZIPs and verify SHA256SUMS.txt. GitHub-generated source archives are not installation assets. See [MIGRATION.md](https://github.com/David-JA/codex-web-review-relay/blob/v0.3.1/MIGRATION.md).

For the DOM fix alone, replace the files in the loaded extension directory, reload the extension, refresh ChatGPT and manually Arm again if needed. Native-host reinstallation is not needed for that extension-only update. For all native-host fixes, install the new Windows asset after the active review ends; reinstallation rebuilds configuration and rotates the Bearer token, so update saved MCP credentials and restart clients.

只更新扩展即可获得本次 DOM 修复；请更新实际加载的目录，再重载扩展、刷新 ChatGPT，必要时重新 Arm。若同时升级 native host，先结束正在进行的评审，并注意重装会重建配置、旋转 token，需更新 MCP 客户端凭据。Check page 通过不等于端到端传输验收通过。

## Assets

- `codex-web-review-relay-extension-v0.3.1.zip`
- `codex-web-review-relay-native-host-windows-v0.3.1.zip`
- `SHA256SUMS.txt`

## Validation boundary

The DOM implementation has passed an actual request/response in the specified ChatGPT/IAB conversation and a commit-only Web review with complete MCP output and independently verified SHA-256. That review covers implementation commit bb13cfcea8b6a4dc4d2a37d68aa03c760c2376aa, not this version-only packaging update. Future ChatGPT rollouts may require further adaptation.

Release validation: 111/111 targeted tests passed (server version/auth/protocol, legacy/modern DOM, content/background lifecycle, relay contract, exporter/schema and remote resolution). Version consistency, PowerShell installer syntax, ZIP inventories, source-byte parity and SHA-256 checks passed. A new native-host installation smoke was not run against the existing armed live host; this release does not claim a fresh-install test.
