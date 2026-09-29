# Review Relay 消费者使用指南

本文件是消费者 Agent 的按需入口：集中查找插件能做什么、如何调用、遇到问题先查什么，以及哪些版本包含修复。项目自身的授权、评审流程和合并规则仍由消费者维护。本文不授予发送评审、恢复、merge 或 release 的权限。

## 先确定使用的版本

消费者应记录采用的 release tag，并读取该 tag 下的文档；开发验证则固定完整 commit SHA，明确标注未发布。不要把 `main` 的说明当作已安装能力，也不要仅凭扩展弹窗或 package version 判断开发修复已经加载。

| 能力或修复 | 可用范围 | 消费者需要做什么 |
|---|---|---|
| 新版 ChatGPT turn 解析、只读 `Check page`，以及 `.agents/` handoff 与配置 remote fallback 修复 | 已发布 `v0.3.1` | 按 [v0.3.1 MIGRATION.md](https://github.com/David-JA/codex-web-review-relay/blob/v0.3.1/MIGRATION.md) 更新所需组件；调用接口和现有 handoff 无需改写 |
| 发送前短暂身份歧义的有限重试、失败阶段与部分结构诊断、人工确认后的空输入框恢复 | `v0.3.2`；实现 commit `5d16d760587395764cf64da3d7f34c3c17c9b63e`，不包含在 `v0.3.1` 安装包中 | 同时更新 native host 和扩展，步骤见 [MIGRATION.md](../MIGRATION.md) |

此指南从 `v0.3.2` 起提供，`v0.3.1` tag 中没有本文件。仍采用 `v0.3.1` 的消费者继续使用该 tag 的 README、MIGRATION 与 conventions；不要构造不存在的 `v0.3.1/docs/consumer-guide.md` 链接。采用 `v0.3.2` 或后续包含指南的 release 时再切换入口。

该修复已通过范围内代码评审，指定测试会话已完成正常发送与完整 MCP 回传。原消费者失败页面的具体 DOM 根因、真实页面上的空输入框恢复仍未验证；模拟测试不能代替这些验证。范围与请求见[归档验收记录](archive/20260929_presend_recovery.md)。发布时维护本节的版本归属与验证边界，历史细节留在 release notes、Git 历史或归档中。

## 插件负责什么

Relay 通过本机 MCP server、native host 和浏览器扩展，把已提交 handoff 的远端定位信息送入用户手动 Arm 的 ChatGPT 对话，再返回该轮回复和 SHA-256。插件不替消费者决定何时发起 review，不自动选择对话，也不替项目批准合并。

| 要做的事 | 按需读取 |
|---|---|
| 安装、连接 MCP、加载扩展与 Arm | [中文 README](../README.zh-CN.md#快速开始) / [English README](../README.md#quick-start) |
| 从已有安装升级 | 对应 release 的 [MIGRATION.md](../MIGRATION.md) 和 release notes |
| 编写 handoff、确认 headers 与路径 | [handoff 与 helper 合同](agent_conventions.md#handoff-与-helper-合同) |
| 判断 phase、等待、幂等重试与手动恢复 | [job 生命周期](agent_conventions.md#job-生命周期) |
| 查阅 review-fix 流程范例 | [review-fix workflow](workflows/review_fix_workflow.md)，项目已有流程优先 |

行为权威是 `src/*` 与 `contracts/*`；Agent 合同由 [agent_conventions.md](agent_conventions.md) 维护。消费者无需复制 DOM selector、解析规则、exporter 或 transport 状态机。

## 一次评审的调用与验收

1. 按消费者的授权规则选择 PR 或 commit-only 模式，确认用户已在目标对话 Arm，且没有其他 active job。
2. 准备规范的 tracked handoff，提交并推送 reviewed head 与 handoff，保证 Web reviewer 能在远端读取。新 handoff 使用 `.agents/review_handoffs/`；既有 `.agent/` 路径兼容但不需要改写。Exporter 由 relay 安装维护，不在消费者仓库另装 helper。
3. 调用 `request_review(handoff_file=<本机绝对路径>)`。工具根据文件解析 repository、head 和 scope；不要把 handoff 正文塞进工具参数或 trigger envelope。
4. 保存返回的 `job_id`，通过 `get_review_transport_status(job_id=...)` 读取状态。等待切片返回进行中状态不等于失败；沿用同一 handoff/fingerprint，不因等待而新建 round。观察节奏与 hard deadline 见 job 生命周期及实际配置。
5. 按本项目的 formal verdict 来源验收，不能只看网页出现了 PASS：

| 模式 | 正式结论来源 | 必须核对 |
|---|---|---|
| PR-comment | 目标 PR 的 comment readback；MCP 回复只作 transport evidence | 项目规定的 actor、reviewed head、scope 和 verdict |
| Commit-only relay-only | MCP 返回的完整 `assistant_output` | `TURN_IDLE`、非空完整正文、重新计算的 SHA-256、handoff 约定的首尾标记、reviewed head 与 scope |

Web PASS 只覆盖被评审版本和范围，不自动批准 merge、release 或清理。项目的 review round 预算与停止条件仍由调用侧执行。

## 更新后怎样生效

更新浏览器**实际加载目录**的扩展后，在扩展管理器重新加载，再刷新目标 ChatGPT 页面；绑定失效后由用户重新 Arm。只刷新页面或只重新 Arm 不能代替重载已更新的扩展，通常不需要卸载重装扩展。

Native host 是独立组件，修改插件 checkout 或重载扩展不会自动更新已安装 runtime。所需组件与步骤以目标 release 的迁移说明为准。扩展单独更新不旋转 token；重新运行 native-host installer 会重建配置并旋转 Bearer token，应先结束 active job，保留需要的配置覆盖并更新 MCP 客户端。不要在使用中的 host 或 armed session 上运行 `smoke:native`。

## 遇到问题先做什么

先保留 `job_id`、reviewed head、组件版本或开发 commit 和失败时间，再调用 `get_review_diagnostics(job_id=...)`。工具不可用时说明缺失；必要时读取已配置的 `diagnosticLogPath`，不把日志读取或网页观察冒充正式 MCP 结果，不输出 token、cookie 或完整聊天内容。

| 现象 | 判断与下一步 |
|---|---|
| Arm / connected 正常，但请求失败 | 它们只证明绑定和连接状态；按 job 诊断定位 exporter、native delivery、DOM receipt 或 ACK，不由一个状态猜测根因 |
| `Check page` 通过 | 只证明检查时挂载 DOM 的快照可解析；不证明故障发生时页面正常，也不证明发送或完整回传成功 |
| `MESSAGE_IDENTITY_AMBIGUOUS` | 查看失败阶段和结构诊断；v0.3.2 仅对短暂歧义有限重试，持续歧义仍停止，不任意选择重复节点继续发送 |
| `SESSION_LOST` / `SEND_UNCERTAIN` | 核对当前 binding 与诊断；满足恢复条件后，同一 handoff 的 `request_review` 可进入 reconciliation，不创建新 fingerprint 绕过旧 job |
| terminal `MISMATCH` 且确认原消息未发送 | 经人工确认后才可调用一次性 `recover_review(handoff_file=..., confirm_unsent=true)`；不能从空输入框或 Check page 单独推断未发送。空输入框重填还受上方版本限制约束 |
| 网页已有完整回复，MCP 没有完整结果 | Commit-only transport 尚未验收；保留诊断并报告，不能用网页复制替代成功回传 |
| 旧 Arm JSON 的 `leaseExpiresAt` 已过 | 它是可续期 heartbeat 的瞬时快照；检查当前 popup 状态、实时 health 或 job 结果，不据此强制重新 Arm |

没有新证据时停止重复尝试；不要通过删除 job 数据、重置恢复额度、更换 round 或重发请求掩盖传输失败。`TIMEOUT` / `BLOCKED` 等终态按诊断处理，不能无限重试。

## 消费者 convention 保留哪些内容

消费者只需保留采用版本及对应文档入口、触发授权、评审模式、handoff 的项目要求、正式结论来源和本地治理规则。例如 PWA 可保留 PR-comment 与 Stage Gate，Obsidian 可保留其 commit-only 流程；插件范例不会覆盖这些差异。

维护与同步条件统一见 [文档同步](agent_conventions.md#文档同步)。接入新版本时判断调用或兼容性是否变化，按需更新版本指针；通用功能、已修复问题和排障说明在插件仓库维护，不在每个消费者追加副本。共享入口不可访问时报告缺失，不凭旧摘要猜测版本能力或执行权限。
