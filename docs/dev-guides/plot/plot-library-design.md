# 剧情库模块设计

## 模块定位

剧情库用于记录和细化作者早期的剧情想法，不等同于章节管理，也不等同于剧情事件时间线。

第一版目标是让作者从“一个剧情块”逐层进入子剧情，并在当前剧情块内快速编排说明卡片。页面应更像剧情素材面板，而不是传统树表单或章节大纲。

## 命名规则

剧情模块统一使用 `Plot` / `Plots`：

- 页面文件：`src/views/Plots.vue`
- 路由路径：`/plots`
- 路由名称：`plots`
- 模块文案：剧情库

不要再用 `Events.vue` 表示剧情库。`Event` 后续只保留给剧情事件或时间线事件。

## 不做什么

- 不做卷、章、节结构。
- 不做自动生成章节。
- 不做流程图或思维导图。
- 不做 AI 自动规划剧情。
- 不做复杂关系分析。
- 使用 Electron JSON 持久化；第一版不引入数据库、AI 自动规划或复杂关系分析。

## 页面结构

剧情库页面采用“块列表 + 面包屑 + 当前层内容区”的结构：

```text
剧情库页面
├─ 顶部面包屑导航
│  └─ 剧情块A / A-1 / A-1-1
├─ 左侧一级剧情块列表
│  ├─ 剧情块A
│  ├─ 剧情块B
└─ 当前剧情层工作区
   ├─ 直接子节点区域
   │  ├─ 子剧情A-1
   │  ├─ 子剧情A-2
   │  └─ 新建子剧情
   └─ 当前剧情内容区
      ├─ 剧情简介
      ├─ 自定义说明卡片
      ├─ 自定义说明卡片
      └─ 自定义说明卡片
```

布局建议：

```text
grid-template-columns: 220px minmax(0, 1fr)
```

当前剧情层工作区内部：

```text
grid-template-columns: 180px minmax(0, 1fr)
```

## 核心交互

### 进入剧情层级

1. 点击左侧一级剧情块，进入该剧情块。
2. 顶部面包屑显示当前位置。
3. 中间“直接子节点区域”展示当前剧情块的直接子剧情。
4. 点击直接子剧情后，页面进入下一层，继续加载该节点的直接子剧情。
5. 点击面包屑中的任意层级，可以返回对应剧情层。

### 新建剧情块

- 页面顶部“新建剧情块”只创建根剧情。
- 当前层“新建子剧情”只创建当前剧情块的直接子剧情。
- 新建后自动进入编辑状态，默认名称为“未命名剧情”。

### 编辑剧情块

剧情块本身只保留轻量信息：

- 名称
- 简介

第一版可以用弹框或右侧内联编辑完成，不需要复杂详情页。

### 自定义说明卡片

每个剧情节点内部有一个自定义说明列表。

说明卡片结构：

```text
名称
内容
```

使用场景：

- 场景想法
- 冲突设计
- 伏笔说明
- 人物转折
- 待补充段落

交互要求：

- 支持新增说明卡片。
- 支持编辑说明卡片名称和内容。
- 支持删除说明卡片。
- 支持上下拖拽调整说明卡片顺序。

说明卡片不是子剧情。子剧情表达层级拆分，说明卡片表达当前剧情块内部的补充说明。

## 右键菜单

Electron 支持原生右键菜单，剧情库设计应考虑上下文菜单。

第一版先用 Naive UI 的 `NDropdown` 或自定义浮层模拟右键菜单。后续如需要系统级一致体验，再切换为 main process 原生菜单。

### 一级剧情块右键菜单

触发区域：左侧一级剧情块。

菜单项：

- 新建同级剧情
- 新建子剧情
- 重命名
- 删除

### 直接子节点右键菜单

触发区域：当前层左侧的直接子节点。

菜单项：

- 进入剧情
- 新建同级剧情
- 新建子剧情
- 重命名
- 删除

### 自定义说明卡片右键菜单

触发区域：说明卡片。

菜单项：

- 编辑说明
- 上移
- 下移
- 删除

### 空白区域右键菜单

触发区域：当前剧情层工作区空白处。

菜单项：

- 新建子剧情
- 新建说明卡片

## Electron 菜单接入设计

后续接入 Electron 原生菜单时，不让 Vue 直接使用 Node API。

调用方向：

```text
Vue contextmenu event
  -> preload.showPlotContextMenu(payload)
  -> ipcMain.handle('plots:show-context-menu')
  -> Electron Menu.buildFromTemplate()
  -> 返回用户选择的 action
  -> renderer 执行对应业务动作
```

建议 payload：

```ts
interface PlotContextMenuPayload {
  targetType: 'rootPlot' | 'childPlot' | 'descriptionCard' | 'workspace';
  plotId?: string;
  descriptionId?: string;
}
```

建议 action：

```ts
type PlotContextMenuAction =
  | 'createSiblingPlot'
  | 'createChildPlot'
  | 'renamePlot'
  | 'deletePlot'
  | 'openPlot'
  | 'createDescription'
  | 'editDescription'
  | 'moveDescriptionUp'
  | 'moveDescriptionDown'
  | 'deleteDescription';
```

## 数据模型

剧情库数据结构见 `docs/dev-guides/plot/plot-data-structure.md`。

核心结构是：

- `PlotFile` 表示剧情块。
- `parentId` 表达剧情块层级。
- `descriptionBlocks` 表达当前剧情块内部的自定义说明卡片。

暂不把人物、地点、章节关联放入第一版界面。后续需要时再扩展，不要提前塞入复杂选择器。

## 前端组件拆分

第一版建议拆分：

```text
src/views/Plots.vue
src/views/plot/PlotRootBlockList.vue
src/views/plot/PlotBreadcrumb.vue
src/views/plot/PlotChildNodePanel.vue
src/views/plot/PlotContentPanel.vue
src/views/plot/PlotDescriptionCard.vue
src/views/plot/usePlotLibrary.ts
```

职责：

- `Plots.vue`：组合页面布局。
- `PlotRootBlockList.vue`：左侧一级剧情块列表和根剧情右键菜单。
- `PlotBreadcrumb.vue`：当前位置导航。
- `PlotChildNodePanel.vue`：当前剧情块的直接子剧情。
- `PlotContentPanel.vue`：剧情简介和说明卡片列表。
- `PlotDescriptionCard.vue`：单张说明卡片编辑与拖拽。
- `usePlotLibrary.ts`：维护当前剧情、层级导航、增删改、拖拽排序和菜单动作。

如果先小步实现，可以先保留 `Plots.vue + usePlotLibrary.ts` 两个文件，但逻辑命名要按上述组件边界组织，方便后续拆分。

## 第一阶段功能

必须实现：

- 展示一级剧情块列表。
- 点击一级剧情块进入当前剧情层。
- 展示面包屑。
- 展示当前剧情块的直接子剧情。
- 点击子剧情继续进入下一层。
- 创建根剧情。
- 创建当前剧情的子剧情。
- 编辑剧情名称和简介。
- 删除剧情及其后代。
- 展示剧情简介。
- 展示自定义说明卡片列表。
- 新增、编辑、删除说明卡片。
- 拖拽调整说明卡片顺序。
- 右键菜单入口设计到位，第一阶段可用前端菜单模拟。

暂缓实现：

- 原生 Electron 右键菜单。
- 人物、地点、章节关联。
- AI 生成、AI 改写。
- 剧情图谱、流程图、思维导图。

## 验证重点

实现后至少验证：

- 点击一级剧情块后，当前层只展示它的直接子剧情。
- 点击子剧情后，面包屑正确追加层级。
- 点击面包屑可以回到对应层级。
- 新建子剧情只出现在当前剧情块下。
- 删除父剧情会删除全部后代剧情。
- 说明卡片可以新增、编辑、删除。
- 说明卡片拖拽后顺序稳定。
- 右键不同区域时菜单项符合上下文。
