# A/B 通信与 API 草案

## 通信方式

小说工具 A 与远程AI小助手服务第一阶段通过 HTTP REST API 通信。

AI 对话后续建议使用 SSE 返回流式结果。

第一阶段不使用 Electron IPC 作为 A/B 的主要通信方式。

Electron IPC 只用于 A 工程内部能力，例如 renderer 读取和保存 `data/system/app-settings.json` 中的 AI 设置。

## API 前缀

建议使用：

```text
/api/v1
```

远程服务地址必须由用户配置为完整 HTTP 地址，例如：

```text
http://127.0.0.1:7860
https://ai.example.com
```

A 工程拼接接口地址时必须基于该绝对地址构造 URL，不能把用户输入当成当前 renderer 页面的相对路径。

所有远程 HTTP 调用暂定 5 秒超时。

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

## A 工程当前需要调用的接口

当前 A 工程的 AI小助手页面至少需要调用：

- `GET /health`：设置弹框内检测远程服务是否可用；注册、同步、聊天前也可用于确认服务状态。
- `POST /projects/register`：将当前打开的小说项目注册到远程AI小助手服务。
- `POST /projects/{projectId}/sync`：同步当前小说项目，让远程AI小助手服务更新索引。

`POST /chat` 和 `POST /search` 后续再接入真实 AI 聊天和搜索。

## 项目注册

A 打开小说项目后，可以向远程AI小助手服务注册当前项目。

注册信息至少包含：

```json
{
  "name": "我的修仙小说",
  "projectPath": "D:/NovelProjects/我的修仙小说"
}
```

远程AI小助手服务返回：

```json
{
  "projectId": "project-001",
  "status": "registered"
}
```

## Chat API

A 向远程AI小助手服务发送：

```json
{
  "projectId": "project-001",
  "conversationId": "conversation-001",
  "message": "林凡现在是什么修为？"
}
```

远程AI小助手服务内部流程：

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

远程AI小助手服务返回结果建议包含回答内容和引用来源：

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

远程AI小助手服务负责保存和处理 LLM API Key。

A 不保存 LLM API Key，也不直接调用 OpenAI、Claude、Gemini、DeepSeek、Qwen 或本地模型。
