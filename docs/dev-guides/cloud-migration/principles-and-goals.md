# 云改造设计原则与目标

## 目标

云改造的目标是让同一套 Vue 业务界面可以服务两类项目：

- 本地项目：Electron 通过 IPC 写入用户选择目录中的 JSON 文件。
- 云端项目：Vue 通过 HTTP 调用 Node.js 服务，由服务端保存 JSON 或后续数据库。

页面不应该知道数据最终写到哪里。页面只调用 Repository。

```text
Vue 页面
  ↓
Repository 接口
  ├─ LocalRepository -> Electron IPC -> 本地 JSON
  └─ RemoteRepository -> HTTP -> Node.js -> 云端存储
```

## 核心原则

- 本地优先不变：现有 Electron + 本地 JSON 是基础能力，云端只能扩展，不能替代。
- 页面不判断环境：业务页面不写 `if (electron)`，只依赖 Repository。
- 运行环境和存储模式分开：Electron 可以打开本地项目，也可以打开云端项目；Web 只打开云端项目。
- JSON 格式优先保持稳定：除非有明确迁移文档，不改现有项目 JSON 格式。
- 远程第一版也可以保存 JSON：数据库不是云改造第一步。
- 写入必须可审查：AI 生成或同步产生的变更，写入前必须展示差异或确认。
- 小步迁移：先改一个模块试点，再扩展到其他模块。

## 概念边界

运行环境：

```ts
type RuntimeKind = 'electron' | 'web';
```

项目存储模式：

```ts
type ProjectStorage =
  | { kind: 'local'; baseDir: string }
  | { kind: 'remote'; projectId: string };
```

两者不要混在一起。正确模型是：

| 运行环境 | 项目类型 | 数据位置 |
| --- | --- | --- |
| Electron | 本地项目 | 本地 JSON |
| Electron | 云端项目 | Node.js 服务 |
| Web | 云端项目 | Node.js 服务 |

## 当前阶段不做

- 不做自动双向同步。
- 不做离线冲突合并。
- 不做账号、计费、团队权限等完整 SaaS 能力。
- 不强制引入数据库。
- 不重写现有 Electron main process。
- 不一次性改造所有模块。

## 第一版成功标准

- 人物等试点模块页面只依赖 Repository，不直接依赖 Electron IPC API。
- 本地项目读写行为和现有功能一致。
- 后续加入 RemoteRepository 时，页面不需要再改一遍。
- 文档索引清晰，后续 AI 能按任务读取少量文件。
