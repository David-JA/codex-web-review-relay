# v0.3.2

Patch release for pre-send failures and operator-confirmed recovery. MCP call signatures, protocol versions and formal-verdict modes remain unchanged.

## Changes / 更新内容

- Retry transient DOM identity ambiguity only before composer writes, for at most 2.5 seconds within the job deadline; persistent ambiguity still fails closed.
- Preserve partial turn evidence and distinguish failures before write, before click and after click.
- Permit empty-composer recovery only after explicit confirmation that the original request was never sent and while the one-shot recovery send allowance remains. Preserve unrelated drafts, monitor existing matching messages without resending, and check the deadline and composer again before clicking.
- Add a centralized consumer guide and a documentation ownership rule: internal fixes normally stay in the plugin repository; consumer conventions change when caller interfaces, compatibility or their own workflow changes.

发送前短暂身份歧义会有限等待；失败诊断保留结构与阶段。确认原消息未发送后，可在一次性额度内恢复空输入框，继续保护其他草稿并防止重复发送。消费者通用使用、升级和排障说明集中到插件仓库，项目自身的授权和正式结论规则仍由消费者维护。

## Upgrade / 升级

Update **both the native host and extension** for the new recovery path. Finish any active review first. Native-host reinstallation rebuilds configuration and rotates the Bearer token; preserve intentional overrides, update MCP credentials and restart affected clients. Reload the updated extension, refresh ChatGPT and manually Arm if the binding is lost. See [MIGRATION.md](https://github.com/David-JA/codex-web-review-relay/blob/v0.3.2/MIGRATION.md).

新的恢复能力需要同时升级 native host 和扩展。先结束 active job，注意重装会重建配置并旋转 token；更新客户端凭据后，重载扩展、刷新页面，必要时重新 Arm。仅修改源码、刷新页面或重新 Arm 不能代替组件升级。

Consumer calls and existing handoffs need no rewrite. Repositories adopting this version can update their version pointer and use the [consumer guide](https://github.com/David-JA/codex-web-review-relay/blob/v0.3.2/docs/consumer-guide.md), keeping project-specific governance local. This release does not automatically update consumer repositories or installed runtimes.

## Assets

- `codex-web-review-relay-extension-v0.3.2.zip`
- `codex-web-review-relay-native-host-windows-v0.3.2.zip`
- `SHA256SUMS.txt`

Verify checksums before extraction. GitHub-generated source archives are not installation assets.

## Validation boundary

Release validation: 141/141 targeted tests passed under Node 24.17. Product versions, installer syntax, ZIP inventories, source-byte parity and SHA-256 checks passed.

Implementation commit `5d16d760587395764cf64da3d7f34c3c17c9b63e` and consumer documentation were reviewed locally and by the Web Agent. The final Web-reviewed head is `38e0ce3a80068d90a70c4d78fd2ead2dff668157`; both review rounds returned complete MCP verdicts with independently verified UTF-8 SHA-256. The subsequent release/archival delta does not change runtime behavior beyond the reported version.

The original consumer failure's specific DOM root cause and live empty-composer recovery remain unverified. Normal request/response transport passed in the specified ChatGPT/IAB session; simulated recovery tests do not replace a live recovery test. No new installation smoke is claimed against the existing armed host. Exact review and release validation records are in the [archive](https://github.com/David-JA/codex-web-review-relay/blob/v0.3.2/docs/archive/20260929_presend_recovery.md).
