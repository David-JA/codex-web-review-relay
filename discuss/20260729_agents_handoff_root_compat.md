# `.agent/` / `.agents/` handoff root compatibility

Status: Done
Created: 2026-07-29
Mode: Basic / lightweight

## Goal

把当前用户级 `remote-fallback-v2` 安装中已经验证可用的兼容行为正式回填到
relay 仓库：handoff path 同时接受 legacy `.agent/review_handoffs/**` 与
producer 当前使用的 `.agents/review_handoffs/**`，使普通重装不会覆盖该能力。

## Current evidence

- Chrome unpacked extension 的旧 checkout path
  `C:\coding_projet\single-crystal-review-relay\extension` 已失效；新路径为
  `C:\coding_project\single-crystal-review-relay\extension`。
- Native Messaging 当前实际注册到 user-local
  `codex-web-review-relay-remote-fallback-v2`，不依赖 checkout 父目录。
- active install 相对当前仓库只有两处有意兼容 delta：
  `src/relay-contract.ts` 与 `scripts/tools/relay_export_helper.py` 均将
  `.agent/` 放宽为 `.agents?/`。
- 当前仓库的 JSON Schema、tests、README 与 conventions 仍只声明
  `.agent/`，直接从仓库重装会丢失 `.agents/` 支持。

## Scope

In scope:

- `scripts/tools/relay_export_helper.py`
- `src/relay-contract.ts`
- `contracts/relay-export.schema.json`
- targeted helper / contract / schema tests
- `docs/agent_conventions.md`
- `README.md` 与 `README.zh-CN.md`
- release/install smoke coverage 中与 handoff root contract 直接相关的断言

Out of scope:

- 不改变 envelope 字段、fingerprint、job lifecycle 或 transport phase。
- 不改变 `.agent/` 的既有行为；`.agents/` 是新增兼容 alias。
- 不修改 producer 仓库或 Issue #51。
- 不删除 user-local install、SQLite state 或旧安装目录。
- 不在验证前重装 native host；不自动执行 Chrome UI 的 unpacked extension
  reload。

## Decisions

### Accept both roots without normalization

- Selected: path validator 接受 `.agent/` 与 `.agents/`，并保留输入中的实际
  repo-relative path。
- Rationale: handoff identity、Git object lookup 与 fingerprint 必须继续对应
  producer commit 中真实 tracked path；不能把 `.agents/` 静默改写成
  `.agent/`。

### Keep schema version unchanged

- Selected: 这是 path pattern 的向后兼容扩展，不增加或改变 relay-export
  fields，因此不提升 schema version。
- Stop condition: 若 targeted tests 证明 persisted identity、schema
  discrimination 或 v1.0/v1.1 compatibility 被改变，则停止并重新评估版本。

## Tasks

- [x] 同步 Python exporter、TypeScript validator 与 JSON Schema。
- [x] 增加 `.agents/` PR mode 与 commit-only mode positive coverage。
- [x] 保留 malformed roots、nested aliases 与非 ASCII round 的 negative coverage。
- [x] 同步 conventions 与中英 README。
- [x] 运行 targeted tests 与 release contract/package checks；clean-install smoke
  留到 formal review 后的受控重装阶段。
- [x] 比较当前 source 与 active install：剩余差异只有 line ending；两处
  `remote-fallback-v2` 语义 hotfix 已完整回填。
- [x] 回填 Outcome、limitations 与安装/Chrome reload 顺序。
- [x] 原位重装 active native host，并运行安装后 `.agents/` clean-install smoke。
- [x] 在实际承载 relay 的 Chromium browser 中从新 checkout path reload unpacked
  extension，并重启 Codex 读取旋转后的 token。

## Validation

- `python -m unittest` / repository-defined Python helper tests
- `node --test` targeted relay contract、schema、exporter 与 repo-adapter suites
- `npm test`（若已知 open-handle limitation 复现，则记录 targeted suite 结果）
- `python scripts/check-release-version.py`
- release package / clean-install smoke commands from `package.json`
- `git diff --check`
- tracked scan 确认公开合同没有继续把 `.agent/` 描述为唯一合法 root

## Stop conditions

- 工作区出现与本任务无关的修改。
- active install 的两处 delta 不止 handoff-root compatibility。
- `.agents/` 支持需要改变 envelope、fingerprint、schema fields 或 persisted job
  migration。
- release/install smoke 产生任务范围外的 payload drift。
- 重装将覆盖仍未回填的 user-local hotfix。

## Outcome

Implementation and native-host installation complete; Chrome/Codex reload pending.

- Targeted contract/exporter/schema/repo-adapter suites：23/23 PASS。
- Full `npm test`：151/151 PASS；本次未复现 README 记录的 open-handle
  limitation。
- `check:release-version`、`package:release`、`check:release-assets`：PASS。
- Release install smoke 已切换到 `.agents/` commit-only handoff，从安装 payload
  验证当前 producer root。
- 保持 schema version、envelope、fingerprint、job lifecycle 与 extension
  transport 不变。
- Commit-only formal review 在 reviewed head
  `77cc0ae530c0c77f93c06273d6908d3d5d8a34bd` 返回 terminal `PASS`，
  findings 为 None；tracked handoff 已由 direct-successor cleanup-only commit
  清理。
- Active user-local root
  `C:\Users\fanmo\AppData\Local\codex-web-review-relay-remote-fallback-v2`
  已从 reviewed source 原位重装；`state.sqlite` 保留，注册 manifest 正确，
  installed `relay-contract.ts` / exporter 与 source SHA-256 完全一致。
- 安装后 clean-install smoke：health、MCP initialize、tools list 与 `.agents/`
  commit-only exporter E2E 全部 PASS。
- Installer 已旋转 Bearer token；当前 Codex 进程必须重启后才能重新连接。
- Chrome Secure Preferences 仍记录已不存在的
  `C:\coding_projet\single-crystal-review-relay\extension`，但 active relay
  session 的实际父进程是 `Tabbit Browser.exe`，不是 Google Chrome；该记录是
  无关残留。Tabbit Browser `Default/Secure Preferences` 已持久登记
  `C:\coding_project\single-crystal-review-relay\extension`，路径存在且
  reload 后的 native host 能以新 token 完整 readback terminal job。未直接
  编辑任何 browser profile 文件。
