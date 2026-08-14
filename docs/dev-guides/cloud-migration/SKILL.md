---
name: cloud-migration
description: Novel World Engine Editor 云改造入口。涉及 Repository、Web 版、Node.js 服务、远程项目、云同步或本地/云端存储模式拆分时，先读本文件，再按任务读取索引中的指定文档。
---

# 云改造 Skill

## 使用规则

- 只要任务涉及云端、Web、Node.js 服务、远程项目、Repository、同步或本地/云端存储切换，先阅读本文件。
- 禁止一次性读取 `docs/dev-guides/cloud-migration/` 下全部文档。
- 按“文件索引”和“任务路由”只读取当前任务需要的文档。
- 外部文档只引用本 `SKILL.md`，不要直接引用本目录下的其他设计文档。
- 新增、删除或重命名本目录文档后，必须同步更新本文件的“文件索引”。
- 云改造不能破坏本地优先：Electron 本地 JSON 项目必须继续可用。

## 文件索引

- `principles-and-goals.md`：云改造设计原则、目标、边界和核心架构模型。
- `implementation-plan.md`：实施动作、分阶段改造任务、每阶段验收标准。

## 任务路由

- 讨论云改造方向、边界、架构原则：读取 `principles-and-goals.md`。
- 规划 Repository 改造、模块迁移顺序、验收步骤：读取 `implementation-plan.md`。
- 实现某个模块的云改造：先读 `implementation-plan.md`，再按模块读取原有 dev-guide，例如人物模块读取 `character/character-data-flow.md`。
- 设计云同步、远程项目或 Web 运行方式：先读 `principles-and-goals.md`，再读 `implementation-plan.md`。

## 简化约束

- 第一阶段只抽象数据访问，不改变现有本地 JSON 行为。
- 不要把 `Electron = 本地`、`Web = 云端` 绑定死；运行环境和项目存储模式要分开。
- 不要在 Vue 页面里散落 `if (electron) ... else ...`。
- 不要第一版就做自动双向同步、离线冲突合并、权限系统或数据库迁移。
- AI 写入仍必须是建议变更，保存前必须展示差异或确认步骤。
