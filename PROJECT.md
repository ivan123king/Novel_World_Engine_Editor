# 项目说明

## 项目定位

这是一个前端桌面应用工程：Electron 负责桌面窗口和本地文件能力，Vue3 负责界面，TypeScript 贯穿 main、preload、renderer。

## 启动方式

```bash
npm install
npm run dev
```

常用命令：

- `npm run dev`：启动开发版桌面应用
- `npm run build`：构建应用代码
- `npm run typecheck`：执行 TypeScript 类型检查

## 文件分类

- `electron/main/`：Electron 主进程，放项目打开、菜单、JSON 读写等本地能力。
- `electron/main/menu/`：Electron 顶部菜单配置，按 `app-menu` 总装配和 `novel-menu`、`system-menu`、`window-menu` 等一级菜单拆分。
- `electron/main/projects/`：小说项目创建、打开、恢复和 `novel.json` 校验服务。
- `electron/main/system/`：应用系统配置服务，管理 Electron userData 目录中的 `system/app-settings.json` 等工具自身设置，并提供菜单触发的系统配置 JSON 弹框编辑能力。
- `electron/main/characters/`：人物 JSON 文件读写服务，管理当前小说项目目录下的 `characters/*.json`。
- `electron/main/items/`：物品 JSON 文件读写服务，管理当前小说项目目录下的 `items/*.json`。
- `electron/main/plots/`：剧情库 JSON 文件读写服务，管理当前小说项目目录下的 `plots/*.json`。
- `electron/main/relations/`：关系图谱 JSON 文件读写服务，管理当前小说项目目录下的 `relation-graphs/*.json` 和关系图谱排序元数据。
- `electron/main/timeline/`：时间线 JSON 文件读写服务，管理当前小说项目目录下的 `timeline/*.json` 和时间块排序元数据。
- `electron/main/list-order/`：列表排序元数据服务，管理当前小说项目目录下的 `list-orders/*.json`，用于人物、物品等资源的用户自定义展示顺序。
- `electron/main/file-system/`：本地基础目录解析、目录创建和通用 JSON 文件读写工具。
- `electron/preload/`：安全 IPC 桥接，renderer 只能通过这里调用本地能力。
- `src/`：Vue3 前端界面。
- `src/api/`：renderer 侧类型化 API 封装，负责调用 preload 暴露的安全接口。
- `src/components/common/`：跨模块复用的 Vue 公共组件。
- `src/components/workbench/`：主工作台外壳组件，例如顶部项目栏和左侧导航。
- `src/components/system/`：系统级前端组件，例如菜单触发的系统配置 JSON 编辑弹框。
- `src/router/`：renderer 页面路由配置，用于主工作台模块切换。
- `src/views/`：主工作台右侧承载的模块页面。
- `src/views/ProjectHome.vue`：项目首页，只展示当前小说目录 `novel.json` 中的小说名和简介，并支持双击编辑保存。
- `src/views/AiAssistant.vue`：AI小助手预留聊天室页面，当前只展示假消息，不接入真实 AI 或 JSON 写入。
- `src/views/character/`：人物模块页面组件和本地状态逻辑。
- `src/views/plot/`：剧情库模块的前端状态逻辑，当前阶段使用内存数据维护剧情树与 Inspector 交互。
- `src/views/timeline/`：时间线模块拆分组件和工作台状态逻辑，`Timeline.vue` 只作为页面组装入口。
- `src/stores/`：renderer 侧轻量状态 store，当前保存已打开的小说项目信息。
- `src/types/`：共享 TypeScript 数据结构；当前包含小说项目、人物、物品、地点、地图、关系图谱、剧情节点等 JSON 类型。
- `mock_data/`：开发期 mock 数据，真实 JSON 项目读写接入前用于页面展示。
- Electron userData 目录中的 `system/`：应用系统文件目录，只保存上一次打开的项目目录等工具配置，不保存小说领域数据；系统配置弹框会展示实际文件路径。
- `docs/ai-guides/`：给后续 AI 使用的产品方向和架构说明。
- `docs/dev-guides/`：给后续开发使用的具体实现设计说明，包含人物、物品、地图、关系图谱、时间线等模块指南。
- `docs/dev-guides/ai-assistant/`：AI小助手与 Novel AI 服务设计说明；后续 AI 必须先读该目录的 `index.md`，再按需读取其他文档。
- `.codex/skills/`：Codex 本地 skill。

## 维护规则

后续扩展或调整项目结构时，同步更新本文件。说明保持简洁，只记录启动方式、项目类型和关键目录职责。
