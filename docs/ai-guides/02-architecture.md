# 架构指南

## 技术栈

- Electron：桌面外壳和本地文件访问
- Vue3：renderer UI
- TypeScript：main、preload、renderer 全部使用
- Node.js 文件 API：只在 Electron main process 中使用
- JSON 文件：作为默认存储格式

## 建议目录结构

```text
novel-engine/
  electron/
    main/
      file-manager.ts
      json-store.ts
      project-service.ts
    preload/
      index.ts
  src/
    api/
      projectApi.ts
      characterApi.ts
      relationApi.ts
    stores/
      projectStore.ts
      characterStore.ts
      relationStore.ts
    views/
      ProjectHome.vue
      Characters.vue
      RelationGraph.vue
      Plots.vue
      ContextExport.vue
    components/
      inspector/
      graph/
      timeline/
```

等真实工程脚手架建立后，可以根据实际结构调整，但要保持职责边界清晰。

## 进程边界

Electron main process 负责：

- 打开或创建小说项目目录
- 读取和写入 JSON 文件
- 校验文件路径必须位于已选择的项目目录内
- 在高风险写入前创建备份
- 通过 preload 暴露安全 API

Preload 负责：

- 提供带类型的 IPC 桥接
- 避免把原始 Node.js API 暴露给 renderer

Renderer 负责：

- Vue 页面和组件
- UI 状态
- 表单、关系图、时间线、Inspector
- 调用类型化的项目 API

## 存储边界

不要让 UI 组件直接写文件。使用服务层隔离：

```text
Vue component -> store/api client -> preload IPC -> main project service -> JSON store
```

## 校验

当 schema 建立后，加载 JSON 和保存 JSON 前都要校验。持久化结构发生变化时，要提供明确的迁移逻辑。

## 推荐图库

人物关系图可以考虑：

- Vue Flow：适合 Vue 原生节点和边编辑
- Cytoscape.js：适合图分析和较大规模关系图
- AntV G6：适合更丰富的图可视化

只有在 UI 需求明确后再选择其中一个。
