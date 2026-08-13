# A/B 通信与 API 草案

## 通信方式

小说工具 A 与 Novel AI 服务 B 第一阶段通过 HTTP REST API 通信。

AI 对话后续建议使用 SSE 返回流式结果。

第一阶段不使用 Electron IPC 作为 A/B 的主要通信方式。

## API 前缀

建议使用：

```text
/api/v1
```

## 基础接口

```text
GET  /health
GET  /projects
POST /projects/register
POST /projects/{projectId}/sync
GET  /projects/{projectId}/status
POST /chat
POST /search
```

## 项目注册

A 打开小说项目后，可以向 B 注册当前项目。

注册信息至少包含：

```json
{
  "name": "我的修仙小说",
  "projectPath": "D:/NovelProjects/我的修仙小说"
}
```

B 返回：

```json
{
  "projectId": "project-001",
  "status": "registered"
}
```

## Chat API

A 向 B 发送：

```json
{
  "projectId": "project-001",
  "conversationId": "conversation-001",
  "message": "林凡现在是什么修为？"
}
```

B 内部流程：

```text
用户问题
    ↓
识别问题
    ↓
查询当前项目
    ↓
搜索相关资料
    ↓
组装 Context
    ↓
调用 LLM
    ↓
返回结果
```

B 返回结果建议包含回答内容和引用来源：

```json
{
  "message": "根据当前项目设定，林凡目前是金丹初期。",
  "sources": [
    {
      "type": "character",
      "id": "character-001",
      "name": "林凡"
    }
  ]
}
```

后续 A 可以根据 `sources` 跳转到对应小说数据。

## Search API

Search API 用于让 A 查询当前项目中的设定、正文片段或知识库参考。

返回结果必须带来源信息，至少包含：

```text
projectId
sourceType
sourceId
title
snippet
```

## LLM Key 边界

B 负责保存和处理 LLM API Key。

A 不保存 LLM API Key，也不直接调用 OpenAI、Claude、Gemini、DeepSeek、Qwen 或本地模型。
