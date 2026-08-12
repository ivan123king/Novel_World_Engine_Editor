# 时间线数据结构设计

## 存储原则

时间线数据必须保存在用户小说项目目录中的 JSON 文件里。数据应可阅读、可版本管理、可手动恢复。

不要把全部时间线、时间块和事件塞进一个巨大的项目文件。第一版可以按时间线拆分为索引文件和单条时间线文件。

推荐目录：

```text
novel-project/
  timeline/
    timelines.json
    timeline_main.json
    timeline_war.json
  list-orders/
    timeline_main_time_blocks.json
    timeline_war_time_blocks.json
```

## 时间线索引文件

`timeline/timelines.json` 用于保存多条时间线的轻量索引和当前选中时间线。

```json
{
  "activeTimelineId": "timeline_main",
  "timelines": [
    {
      "id": "timeline_main",
      "name": "主线时间线"
    },
    {
      "id": "timeline_war",
      "name": "战争线"
    }
  ],
  "schemaVersion": 1
}
```

字段说明：

- `activeTimelineId`：上次选中的时间线 ID，用于恢复页面状态。
- `timelines`：时间线列表，只保存 ID 和显示名称。
- `schemaVersion`：索引文件结构版本。

## 单条时间线文件

单条时间线文件保存时间块和事件。

```json
{
  "id": "timeline_main",
  "name": "主线时间线",
  "timeBlocks": [
    {
      "id": "time_yuan_001",
      "name": "元年",
      "aliases": []
    },
    {
      "id": "time_202",
      "name": "公元202年",
      "aliases": ["大周历46年"]
    }
  ],
  "events": [
    {
      "id": "event_border_mutiny",
      "timeBlockId": "time_202",
      "specificTime": "3月",
      "title": "边境军变",
      "content": "北境守军发生哗变，主角第一次介入朝堂斗争。",
      "layout": {
        "row": 1,
        "column": 1
      },
      "customFields": {
        "人物": "林辰、苏琴",
        "地点": "北境军营",
        "影响": "朝堂开始注意边境问题"
      },
      "schemaVersion": 1
    }
  ],
  "schemaVersion": 1
}
```

## 时间块结构

```ts
interface TimelineTimeBlock {
  id: string;
  name: string;
  aliases: string[];
}
```

字段说明：

- `id`：稳定 ID，用于事件引用。
- `name`：时间名，例如“元年”“公元202年”“公元202年2月”。
- `aliases`：别名列表，可为空，例如“大周历46年”。

时间块不包含备注或说明字段。
时间块不包含 `order` 字段。时间块展示顺序使用统一 `list-order` 元数据保存，避免时间线模块形成第二套排序服务。

## 时间块排序文件

时间块顺序保存到 `list-orders/`，格式复用 `docs/dev-guides/list-order.md`。

示例：

```json
{
  "entityType": "timeline-time-blocks",
  "ids": ["time_202", "time_yuan_001"],
  "schemaVersion": 1
}
```

建议文件名：

```text
list-orders/timeline_main_time_blocks.json
```

排序规则：

- `ids` 按页面展示顺序保存。
- 页面默认按“新时间在上、旧时间在下”展示，因此 `ids[0]` 是较新的时间块，最后一个 ID 是更早的时间块。
- 时间块拖动后只更新该排序文件，不修改时间块自身 JSON。
- 排序文件缺失时，按时间线文件中 `timeBlocks` 的读取顺序展示。

## 事件结构

```ts
interface TimelineEvent {
  id: string;
  timeBlockId: string;
  specificTime: string;
  title: string;
  content: string;
  layout: TimelineEventLayout;
  customFields: Record<string, unknown>;
  schemaVersion: number;
}
```

字段说明：

- `id`：稳定事件 ID。
- `timeBlockId`：所属时间块 ID。新建事件时固定为当前选中时间块，不在事件弹框中修改。
- `specificTime`：时间块内的具体时间，由用户输入，例如“3月”“初七”“午后”。
- `title`：事件标题，事件卡片展示此字段。
- `content`：事件完整内容，只在详情弹框中展示和编辑。
- `layout`：事件在当前时间块事件区中的布局位置。
- `customFields`：作者自定义字段。
- `schemaVersion`：事件结构版本。

事件不设置固定的关联人物、地点、物品、剧情线字段。需要记录这些信息时，统一写入 `customFields`。

## 事件布局结构

```ts
interface TimelineEventLayout {
  row: number;
  column: number;
}
```

字段说明：

- `row`：事件在当前时间块下的单一平铺顺序，数值越小越靠前。
- `column`：保留字段，第一版固定为 `1`，用于兼容旧 mock 数据和后续迁移，不用于界面分列。

布局规则：

- 同一个 `timeBlockId` 下，事件按 `row` 从小到大展示。
- 页面平铺展示事件，从左到右、从上到下都是 `row` 递增。
- 新建事件时，如果当前有选中事件，则插入到选中事件之前；否则插入当前时间块事件列表最前面。
- 拖动事件时只修改当前时间块下事件的单一顺序。
- 保存前应重新归一化当前时间块下的 `row`。
- 拖动布局属于页面编排元数据，不代表真实时间自动变化。

## 自定义字段规则

`customFields` 的 key 由作者输入，可以是中文。

value 允许：

- 字符串。
- 数字。
- 布尔值。
- `null`。
- 对象。
- 数组。

示例：

```json
{
  "人物": ["林辰", "苏琴"],
  "地点": "北境军营",
  "剧情线": "边境军权",
  "影响": {
    "朝堂": "开始关注北境",
    "林辰": "获得第一次军方声望"
  }
}
```

UI 第一版可以先提供简单 `key/value` 编辑能力。即使当前 UI 不认识复杂对象或数组，读取后保存也不能丢失未知结构。

## ID 规则

- 时间线、时间块、事件都使用稳定 ID。
- 显示名称可以修改，不能影响引用关系。
- 新建对象时生成可读 ID 或 UUID 均可，但同一项目内必须唯一。
- 事件归属时间通过 `timeBlockId` 表达，不通过时间名表达。

## 排序和拖拽保存

时间块排序必须保存到统一 `list-order` 元数据中，不允许写入单条时间线文件的 `timeBlocks[].order`。

事件布局保存在 `events[].layout` 中。

保存规则：

- 新建时间块时，根据插入位置更新对应时间线的时间块排序文件。
- 时间块拖动后，重新保存当前时间线的时间块 `ids` 顺序。
- 新建事件时，默认插入当前时间块最前面；如果有选中事件，则插入到选中事件之前。
- 事件拖动后，重新归一化当前时间块下事件的 `layout.row`，`layout.column` 保持为 `1`。
- 保存失败时，renderer 状态应回滚到拖动前数据。

## 与现有事件模块的关系

当前文档描述的是时间线页面内部的事件结构。后续如果项目存在独立 `events/*.json` 剧情事件库，可以再设计引用关系。

第一版不强制拆出独立事件文件，避免过早增加跨文件同步复杂度。

如果未来要让时间线事件引用独立事件文件，应使用：

```ts
eventRefId?: string;
```

并保持时间线布局数据仍然独立于事件正文数据。

## 迁移规则

任何时间线 JSON schema 变更都必须包含：

- 更新后的 `schemaVersion`。
- 迁移说明。
- 向后兼容加载器或明确迁移函数。
- 保留未知字段，不能因为 TypeScript 类型暂未声明就删除用户数据。

## Mock 数据规则

开发期可以保留 `mock_data/timeline.json` 作为结构参考，但真实页面数据不应再从 mock 文件读取。

真实持久化接入后，`Timeline.vue` 不应直接读取 mock 文件，也不应直接访问文件系统。调用链应类似：

```text
Timeline.vue
  -> src/views/timeline/useTimelineWorkbench.ts
  -> src/api/timelineApi.ts
  -> electron/preload/index.ts
  -> electron/main/timeline/timeline-service.ts
  -> electron/main/list-order/list-order-service.ts
  -> electron/main/file-system/json-file-store.ts
```

当前实现要求：

- `src/api/timelineApi.ts` 只调用 `window.novelEngine`，不维护内存 mock 状态。
- 时间线实体写入 `timeline/timelines.json` 和 `timeline/{timelineId}.json`。
- 时间块排序写入 `list-orders/{timelineId}_time_blocks.json`，并复用统一 `list-order` 元数据结构。
- 事件拖拽排序保存在 `events[].layout.row`，同一时间块内可拖到目标事件前面或后面。
- 已选中事件再次点击会取消选中；未选中事件时新建事件插入当前时间块事件列表最前面。
