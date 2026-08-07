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

- `electron/main/`：Electron 主进程，放项目打开、JSON 读写等本地能力。
- `electron/main/file-system/`：本地基础目录解析、目录创建和通用 JSON 文件读写工具。
- `electron/preload/`：安全 IPC 桥接，renderer 只能通过这里调用本地能力。
- `src/`：Vue3 前端界面。
- `src/types/`：共享 TypeScript 数据结构；当前包含人物 JSON 类型。
- `docs/ai-guides/`：给后续 AI 使用的产品方向和架构说明。
- `docs/dev-guides/`：给后续开发使用的具体实现设计说明。
- `.codex/skills/`：Codex 本地 skill。

## 维护规则

后续扩展或调整项目结构时，同步更新本文件。说明保持简洁，只记录启动方式、项目类型和关键目录职责。