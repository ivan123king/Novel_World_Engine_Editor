# 物品列表页设计

## 作用

本指南用于实现物品模块页面，对应 `src/views/Items.vue`。

当前页面已经接入本地 JSON 文件读写，数据流参考 `items/item-data-flow.md`。

## 布局

- 页面显示在主工作台右侧页面容器内，不改顶部项目栏和左侧导航。
- 主体采用左侧列表 + 右侧 Inspector，样式参考人物页面。
- 左侧列表展示物品名称和自定义属性数量。
- 搜索框匹配物品名称、ID 和 `customFields` 内容。
- 右侧 Inspector 展示物品 ID、名称、自定义属性，并提供编辑、复制、删除入口。

## 表单

- 新建和编辑都使用弹框，不新增独立页面。
- 弹框必须复用 `src/components/common/AppModal.vue`。
- 表单固定字段只包含“名称”。
- 自定义属性使用动态 `key = value` 行。
- 点击“添加属性”新增一行；点击行尾删除按钮移除该行。
- 空 key 不保存。
- 出现重复 key 时必须展示提醒，并禁止保存。
- value 优先按 JSON 解析，解析失败时按普通字符串保存。

## 数据规则

物品结构参考 `src/types/item.ts` 的 `ItemFile`：

```ts
{
  id: string;
  name: string;
  customFields: Record<string, JsonValue>;
  schemaVersion: 1;
}
```

不要把“类型”“当前持有人”“所在地点”“状态”“能力”等题材字段写死到类型或表单里，这些都应放入 `customFields`。

## 持久化

- 物品文件保存到 `data/items/*.json`。
- 保存前必须通过 `isItemFile` 校验。
- Vue 页面不得直接访问文件系统。
