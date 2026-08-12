# 时间线设计原则

## 模块目的

时间线模块用于帮助作者维护小说世界中“某个时间发生了什么”。它关注时间、事件和事件之间的先后排列关系，用来支撑长篇小说的连续性检查和 AI 写作上下文导出。

时间线不是章节正文编辑器，也不是普通事件表格。它应帮助作者快速回答：

- 在这个时间之前发生了什么。
- 当前时间内发生了哪些事件。
- 当前时间下事件按什么顺序发生或被作者编排。
- 某个世界状态为什么会变成现在这样。

## 命名规则

时间线模块统一使用 `Timeline` 命名。

- 页面文件：`src/views/Timeline.vue`
- 路由路径：`/timeline`
- 路由名称：`timeline`
- 模块文案：时间线

后续实现时不要新建 `Timelines.vue`、`Events.vue` 或其他容易混淆的入口页面。`Timeline.vue` 是时间线模块的页面占位和组合入口。

## 设计原则

- 以“时间块”为主轴，事件必须归属于某一个时间块。
- 支持多条时间线，但第一版只通过下拉框切换当前时间线。
- 页面功能保持清晰简单，不堆复杂筛选、统计、图谱、AI 操作和章节管理入口。
- 时间块只保留时间名和别名列表，不设计备注或说明字段。
- 时间块展示顺序统一使用 `list-order` 元数据保存，不在时间块自身写 `order` 字段，避免形成第二套排序服务。
- 时间块默认按“新时间在上、旧时间在下”展示，最底下是更早的时间。
- 事件固定字段只保留时间块引用、具体时间、事件标题、事件内容和自定义字段。
- 人物、地点、物品、剧情线等关联信息不做固定字段，作者需要时放入事件自定义 `key/value`。
- 事件卡片只展示事件名、时间块和具体时间，长内容必须进入事件详情弹框查看和编辑。
- 点击事件卡片本体不打开详情，只通过卡片上的“详情”按钮打开详情弹框。
- 点击事件卡片本体只选中事件并高亮。此时点击“新建事件”，新事件插入到该事件之前。
- 事件区不分多列，按单一顺序平铺展示。展示顺序从左到右、从上到下都是新事件在前、旧事件在后。
- 时间块和事件都支持拖动。拖动表达作者手动编排，不自动推算真实日期。
- 数据以本地 JSON 文件保存，必须可阅读、可版本管理、可手动恢复。
- 引用关系使用稳定 `id`，显示名称可以修改。
- AI 后续只能生成建议变更，写入 JSON 前必须展示差异或确认步骤。

## 不做什么

第一阶段不做：

- 自动日历换算。
- 公历、农历、架空历法之间的自动转换。
- 章节正文编辑。
- AI 自动生成或自动写入事件。
- 事件对人物、地点、物品、世界状态的自动同步。
- 复杂关系图、统计看板或多维筛选。
- 时间块备注字段。
- 事件固定关联人物、地点、物品、剧情线字段。
- 操作成功后的顶部提示条。创建、更新、删除后页面可直接反映结果，只有错误需要占用消息区。

## 代码组织原则

`Timeline.vue` 只负责组合时间线页面布局和连接页面级状态，不应承载所有业务代码。

后续实现时建议至少拆分：

```text
src/views/Timeline.vue
src/views/timeline/useTimelineWorkbench.ts
src/views/timeline/TimelineSelector.vue
src/views/timeline/TimelineAxis.vue
src/views/timeline/TimelineTimeBlock.vue
src/views/timeline/TimelineEventBoard.vue
src/views/timeline/TimelineEventCard.vue
src/views/timeline/TimelineTimeBlockDialog.vue
src/views/timeline/TimelineEventDetailDialog.vue
```

职责边界：

- `Timeline.vue`：页面组合入口，负责布局，不直接写复杂拖拽和保存逻辑。
- `useTimelineWorkbench.ts`：加载数据、选择时间线、选择时间块、增删改、拖拽排序和保存状态。
- `TimelineSelector.vue`：多时间线下拉选择和轻量管理入口。
- `TimelineAxis.vue`：左侧时间轴列表和时间块上下拖拽。
- `TimelineTimeBlock.vue`：单个时间块展示、选中态和快捷操作。
- `TimelineEventBoard.vue`：选中时间块下的事件布局区域。
- `TimelineEventCard.vue`：事件卡片，只展示事件名和时间。
- `TimelineTimeBlockDialog.vue`：时间块新建和编辑弹框。
- `TimelineEventDetailDialog.vue`：事件详情、新建和编辑弹框，承载长事件内容和自定义字段。

如果第一版需要小步实现，可以先保留较少组件，但逻辑命名和状态边界要按上述结构组织，避免后续继续把代码堆进 `Timeline.vue`。
