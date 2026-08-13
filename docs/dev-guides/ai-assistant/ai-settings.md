# AI小助手设置设计

## 目的

AI小助手设置用于保存小说工具 A 连接远程AI小助手服务所需的全局配置。

当前阶段保存远程服务地址和远程项目 ID，后续设置弹框可以继续扩展更多 AI 配置项。

## 文件位置

AI 设置统一保存在已有应用系统设置文件中：

```text
data/
  system/
    app-settings.json
```

该文件属于工具运行设置，不属于任何一部小说的世界状态，也不应放入用户小说项目目录。

## 当前结构

```json
{
  "lastOpenedProjectPath": "D:/Novels/我的小说",
  "aiAssistant": {
    "remoteServiceBaseUrl": "http://127.0.0.1:7860",
    "remoteProjectId": "project-001"
  },
  "updatedAt": "2026-08-13T00:00:00.000Z",
  "schemaVersion": 1
}
```

## A 工程职责

- 在 AI小助手页面展示设置按钮。
- 点击设置按钮后打开设置弹框。
- 允许用户输入远程AI小助手服务地址，地址必须是 `http://ip:port`、`http://域名` 或 `https://域名` 这类完整 HTTP 地址。
- 设置弹框内提供检测按钮，点击后调用用户当前输入地址的 `GET /api/v1/health`。
- 检测结果必须显示在设置弹框内容区，不显示到页面外层提示区。
- 如果健康检查失败、超时或地址格式错误，提示用户服务暂不可用或地址格式错误。
- 保存按钮只校验地址格式；即使健康检查失败，用户也可以保存该地址。
- 保存地址到 `data/system/app-settings.json` 的 `aiAssistant.remoteServiceBaseUrl`。
- 保存远程项目 ID 到 `data/system/app-settings.json` 的 `aiAssistant.remoteProjectId`。
- 聊天发送前检查远程服务地址是否已设置，并检查远程服务是否可用。
- 如果未设置地址，聊天区返回提示：当前 AI 服务暂未接入，请设置好 AI 服务地址。
- 页面外层提供注册、同步按钮，分别对应 `/projects/register`、`/projects/{projectId}/sync`。
- 所有远程 HTTP 调用暂定 5 秒超时。

## 实现边界

- 当前只接入远程AI小助手服务的基础控制接口，不接入真实 `/chat`。
- 当前不保存 LLM API Key。
- 当前不写入小说项目 JSON。
- 保存 AI 设置时应保留文件中已有的其他字段，方便后续扩展设置弹框。

## 调用链路

```text
AiAssistant.vue
  -> src/api/aiAssistantSettingsApi.ts
  -> electron/preload/index.ts
  -> electron/main/system/app-settings-service.ts
  -> data/system/app-settings.json
```
