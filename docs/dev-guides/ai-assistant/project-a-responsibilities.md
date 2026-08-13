# 小说工具 A 职责

## 定位

小说工具 A 是当前仓库：Novel World Engine Editor。

A 是本地优先的 Electron + Vue3 + TypeScript 小说世界引擎编辑器，负责维护当前小说项目的真实数据和作者操作界面。

## A 负责

- 小说项目创建、打开和当前项目状态管理。
- 小说 JSON 数据编辑和保存。
- 人物、物品、地点、地图、剧情、时间线、人物关系等模块。
- 小说正文和章节元数据管理。
- AI小助手界面。
- 远程AI小助手服务地址配置和连接状态展示。
- 调用远程AI小助手服务的 HTTP API。
- 展示 B 返回的 AI 回复、搜索结果和引用来源。
- 展示 AI 建议变更 Diff，并在用户确认后执行 JSON 修改。

## A 不负责

- 文本向量化。
- Elasticsearch 或其他搜索引擎实现。
- 向量数据库。
- RAG。
- Embedding。
- Prompt 组装。
- LLM API Key 保存和 LLM 调用。
- AI 知识库检索。

## 当前 AI小助手页面

当前 A 已有 AI小助手假页面，包含：

- AI小助手聊天室入口。
- 后续会挂载的数据范围展示。
- AI 设置按钮和远程AI小助手服务地址设置弹框。
- 远程服务地址保存到 `data/system/app-settings.json` 的 `aiAssistant.remoteServiceBaseUrl`。
- 远程项目 ID 保存到 `data/system/app-settings.json` 的 `aiAssistant.remoteProjectId`。
- 检测按钮调用 `/health`。
- 注册按钮调用 `/projects/register`。
- 同步按钮调用 `/projects/{projectId}/sync`。
- 用户发送消息后的固定占位回复。
- 未设置远程服务地址或远程服务不可用时，聊天区提示用户先设置 AI 服务地址。
- 不调用真实 AI。
- 不修改小说 JSON。

后续接入 B 时，A 应保持页面职责简单：收集用户输入、携带当前项目身份、调用 B、展示回复和来源。

## A 调用 B 的基本流程

```text
用户打开小说项目
    ↓
A 保存当前项目状态
    ↓
A 检测远程AI小助手服务是否在线
    ↓
A 注册或同步当前项目到远程AI小助手服务
    ↓
用户在 AI小助手输入消息
    ↓
A 调用远程AI小助手服务的 Chat API
    ↓
A 展示 AI 回复和引用来源
```

## 修改数据流程

A 是唯一可以写入小说项目 JSON 的工程。

如果远程AI小助手服务返回 AI 修改建议，A 必须先展示 Diff，由用户确认后再写入。禁止因为 AI 返回内容就自动修改 JSON。
