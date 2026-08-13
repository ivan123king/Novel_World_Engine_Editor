# AI小助手文档索引

## 强制阅读规则

后续 AI 处理 AI小助手、Novel AI 服务、A/B 工程协作、AI 搜索、RAG、LLM、AI 修改建议等任务时，必须先阅读本文件。

禁止未阅读本索引就直接阅读本目录下其他文档。

禁止一次性读取 `docs/dev-guides/ai-assistant/` 目录下全部文档。必须先根据本索引判断任务范围，再按需读取对应文档。

## 一句话结论

当前仓库是小说工具 A：负责小说编辑、小说 JSON 数据管理、AI小助手界面、AI 服务配置和调用入口。

后续要新增的 Novel AI 服务 B 是独立本地服务：负责小说数据读取、索引、搜索、RAG、Prompt 组织、LLM 调用和 AI 对话能力。

## 文档列表

- `system-design.md`：整体系统设计。确认 A/B 分离、最终形态、数据流和模块关系时阅读。
- `principles.md`：核心原则。处理架构边界、数据源优先级、AI 写入安全、隐私和版权问题时阅读。
- `project-a-responsibilities.md`：小说工具 A 职责。修改当前 Electron + Vue 工程、AI小助手页面、AI 服务配置或 A 调 B 的入口时阅读。
- `project-b-responsibilities.md`：Novel AI 服务 B 职责。创建或设计独立 AI 服务、搜索、索引、RAG、知识库、LLM 调用时阅读。
- `integration-api.md`：A/B 通信和 API 草案。设计 HTTP API、健康检查、项目注册、同步、聊天、搜索或 SSE 流式返回时阅读。
- `roadmap-status.md`：阶段计划和当前状态。开始实现 AI小助手或 Novel AI 服务功能前阅读，避免重复实现已经完成的功能。

## 推荐阅读路径

- 只改当前 A 工程的 AI小助手假页面：阅读 `project-a-responsibilities.md`。
- 设计 A 与 B 的通信：阅读 `system-design.md` 和 `integration-api.md`。
- 创建 Novel AI 服务 B：阅读 `project-b-responsibilities.md`、`integration-api.md` 和 `roadmap-status.md`。
- 做 AI 搜索、索引、RAG 或知识库：阅读 `principles.md`、`project-b-responsibilities.md` 和 `roadmap-status.md`。
- 做 AI 修改小说数据：阅读 `principles.md`、`project-a-responsibilities.md`、`project-b-responsibilities.md` 和 `roadmap-status.md`。

## 当前边界

当前阶段不要提前实现完整 AI 系统。

第一目标是让小说工具 A 能稳定连接 Novel AI 服务 B。完成基础连接和测试回复后，再进入项目注册、数据读取、索引、RAG 和真实 AI 对话。
