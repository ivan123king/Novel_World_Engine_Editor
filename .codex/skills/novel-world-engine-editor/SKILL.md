---
name: novel-world-engine-editor
description: 构建、扩展或审查 Novel World Engine Editor：一个本地 Electron + Vue3 + TypeScript 桌面工具，用于管理长篇小说世界状态。Codex 在本工作区处理产品架构、JSON 项目存储、人物/物品/地点/事件/时间线模块、人物关系图、AI 写作上下文导出、章节分析导入或任何实现任务时，都应使用此 skill。
---

# Novel World Engine Editor

## 概览

把这个项目当作本地小说世界引擎编辑器：它结合了 Unity 风格的结构化世界状态工具、Obsidian 风格的本地文件所有权，以及 AI 写作上下文导出能力。不要把它降级理解成普通 CRUD 后台页面。

## 第一步

1. 做设计或代码决策前，先阅读仓库根目录的 `AGENTS.md`。
2. 做具体功能时，只阅读 `docs/ai-guides/` 中与任务相关的文档。
3. 保持本地优先约束：Windows 桌面应用、Electron 外壳、Vue3 renderer、TypeScript、用户选择目录中的 JSON 文件、默认不使用数据库。
4. 围绕长篇小说连续性设计功能：当前状态、历史变化、人物关系、时间线、事件、AI 上下文导出。

## 产品边界

- 要构建维护“故事世界真实状态”的编辑器，而不是以正文写作为主界面的小说编辑器。
- 优先使用引擎/编辑器式交互：项目资源管理器、Inspector、关系图画布、时间线、差异确认弹窗。
- 保持数据可检查、可携带。每类领域对象使用小 JSON 文件保存，不要集中到一个巨大的 `data.json`。
- 除非用户明确改变架构，否则不要引入后端服务器假设。
- AI 功能必须可审查：AI 可以提出 JSON patch，但必须由用户确认后才能写入项目文件。

## 参考文档索引

- 开始任何新任务时，阅读 `docs/ai-guides/00-ai-entry.md`。
- 需要确认范围、产品心智模型和非目标时，阅读 `docs/ai-guides/01-product-vision.md`。
- 创建或修改 Electron/Vue/Node 结构前，阅读 `docs/ai-guides/02-architecture.md`。
- 修改存储、schema、导入导出或迁移前，阅读 `docs/ai-guides/03-json-project-format.md`。
- 实现 UI 模块前，阅读 `docs/ai-guides/04-feature-modules.md`。
- 实现 prompt/context 生成或章节分析前，阅读 `docs/ai-guides/05-ai-context-export.md`。
- 做阶段规划前，阅读 `docs/ai-guides/06-roadmap.md`。

## 实现指导

- 先完成项目打开/创建、JSON 读写和 schema 校验，再做高级 UI。
- 清晰区分 renderer 状态和已持久化 JSON 数据。
- 分开建模当前状态和历史事件。当前状态回答“现在什么是真的”；事件解释“为什么变成这样”。
- 人物、物品、地点等实体只能固定系统必需字段；作者设定字段必须开放，支持 `customFields` 或等价的动态属性模型。
- 人物关系图数据必须在脱离图库后仍然可用。
- 上下文导出应具备确定性、可配置性，并输出可复制的 Markdown。
- 增加 AI 章节分析时，必须返回结构化建议变更，并在保存前展示确认差异。

## UI 方向

- 构建信息密度高的桌面编辑器，不要做营销网站。
- 使用左侧导航/项目树，中间列表/画布/时间线，右侧 Inspector 面板。
- 人物编辑应接近 Unity Inspector：基础字段、动态自定义属性、状态、关系、历史。不要把人物表单写死成固定字段。
- 人物关系图可以使用 Vue Flow、Cytoscape.js 或 AntV G6；底层 JSON 不能依赖具体图库。
- 优先使用实用控件，不要堆装饰性卡片。

