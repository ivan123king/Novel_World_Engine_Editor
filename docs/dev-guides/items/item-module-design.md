# 物品模块设计

## 目标

物品模块用于记录小说世界中“当前真实存在或曾经重要”的物品信息，例如屠龙刀、密信、药瓶、法宝、令牌。

物品不是固定表单。除系统 ID 和名称外，其他题材相关设定全部由作者通过自定义属性输入。

## 数据结构

物品文件对应 `src/types/item.ts` 的 `ItemFile`：

```ts
{
  id: string;
  name: string;
  customFields: Record<string, JsonValue>;
  schemaVersion: 1;
}
```

固定字段只保留：

- `id`：系统稳定 ID，用于事件、时间线、关系或归属引用。
- `name`：物品显示名称。
- `customFields`：作者自定义属性。
- `schemaVersion`：结构版本。

## 自定义属性

自定义属性和人物一致，使用动态 `key = value` 行：

- key 由作者输入，可以是中文。
- 空 key 不保存。
- 重复 key 时，提醒一下用户，不要保存数据。
- value 优先按 JSON 解析，失败时按普通字符串保存。

可输入示例：

```json
{
  "类型": "武器",
  "当前持有人": "char_zhangwuji",
  "所在地点": "location_guangmingding",
  "状态": "完好",
  "能力": ["号令群雄", "削铁如泥"],
  "来历": {
    "首次出现章节": 3,
    "来源": "王府宝库"
  }
}
```

## UI 方向

- 左侧列表展示物品名称，支持搜索名称和 `customFields`。
- 右侧 Inspector 展示名称和自定义属性。
- 新建和编辑弹框包含：名称、自定义属性。
- 支持新增、编辑、删除、复制。
- 自定义属性出现重复 key 时，在表单内展示提醒，并阻止保存。
- 不要把“类型”“持有人”“地点”“状态”等写死成固定字段；这些都先作为自定义属性。

## 文件规则

后续接入持久化时，每个物品保存为独立 JSON 文件：

```text
data/
  items/
    item_xxx.json
```

Vue 页面不得直接访问文件系统，必须通过 renderer API、preload IPC 和 Electron main process 服务写入 JSON。

## 维护规则

- 不引入数据库。
- 不把物品字段集中保存到单个大 JSON。
- 加载后再保存时必须保留未知顶层字段。
- AI 章节分析只能提出物品变更建议，写入前必须让用户确认差异。
