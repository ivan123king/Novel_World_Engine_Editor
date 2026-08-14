# 云改造实施动作与分步任务

## 实施规则

- 每次只改一个明确阶段。
- 每个阶段都要保持应用可运行、可类型检查。
- 优先复用现有 `src/api/*Api.ts`、`electron/preload/`、`electron/main/*` 能力。
- 新增代码文件必须有中文文件功能注释，新增函数或类必须有中文注释。
- 修改云改造文档后，同步更新 `docs/dev-guides/cloud-migration/SKILL.md` 的文件索引。

## 阶段 1：建立 Repository 外壳

目标：只抽象，不改变行为。

动作：

- 新增 `src/repositories/contracts/`，定义人物、物品、剧情、关系图、时间线等 Repository 接口。
- 新增 `src/repositories/local/`，本地实现内部继续调用现有 `src/api/*Api.ts`。
- 新增 `src/repositories/repositoryFactory.ts`，默认返回本地 Repository。
- 先选择人物模块试点，不一次性改所有模块。

验收：

- 人物模块功能和当前一致。
- `useCharacterList` 不再直接依赖 `@/api/characterApi`。
- `npm run typecheck` 通过。

## 阶段 2：扩展到现有核心模块

目标：让现有模块统一走 Repository。

建议顺序：

1. 人物。
2. 物品。
3. 剧情库。
4. 关系图谱。
5. 时间线。
6. 地图和地点。

动作：

- 每次只迁移一个模块。
- 每个模块迁移前读取对应 dev-guide。
- 保持原有 IPC 和 JSON 文件服务不动，Repository 只做 renderer 侧隔离。

验收：

- 页面不直接 import 对应 `src/api/*Api.ts`。
- 本地 JSON 读写路径、文件格式、排序文件行为不变。
- 类型检查通过。

## 阶段 3：拆分项目存储模式

目标：让当前项目状态能表达本地项目和云端项目。

动作：

- 在类型层新增 `ProjectStorage` 概念。
- 本地项目保存 `baseDir`。
- 云端项目保存 `projectId`。
- Electron 菜单仍负责本地项目创建和打开。
- 云端项目入口先只做结构预留，不急着做完整登录和项目列表。

验收：

- 现有本地项目打开、恢复、首页展示不退化。
- Repository 工厂可以根据项目存储模式选择实现。

## 阶段 4：增加 RemoteRepository 原型

目标：验证 Web/云端路径可行。

动作：

- 新增 `src/repositories/remote/`。
- RemoteRepository 使用 HTTP 客户端访问 Node.js 服务。
- 先做人物模块远程原型。
- 后端第一版可以继续使用 JSON 文件存储，不引入数据库。

验收：

- 人物页面在远程项目模式下不需要改页面逻辑。
- 本地项目仍走 LocalRepository。
- HTTP 错误能在页面现有错误区域展示。

## 阶段 5：Web 运行支持

目标：让同一套 Vue 页面可以在 Web 环境运行云端项目。

动作：

- 梳理 renderer 中对 Electron preload 的直接依赖。
- Web 环境禁止调用本地目录选择和本地 IPC。
- Web 只允许进入云端项目。

验收：

- Web 构建不会因为缺少 `window.novelEngine` 崩溃。
- 业务页面仍只依赖 Repository。

## 阶段 6：手动云同步

目标：先做可控同步，不做自动冲突合并。

动作：

- 从 LocalRepository 读取完整项目数据。
- 与 RemoteRepository 的项目数据生成差异。
- 向用户展示差异。
- 用户确认后再写入云端。

验收：

- 没有用户确认，不写入云端。
- 同步失败不会破坏本地 JSON。
- 冲突先提示用户处理，不自动合并。

## 禁止事项

- 禁止在页面中散落环境判断。
- 禁止第一阶段引入数据库。
- 禁止为了云端改造重写所有本地 JSON 服务。
- 禁止未确认差异就让 AI 或同步逻辑写入项目。
- 禁止一次性实现离线编辑、自动同步、冲突合并。
