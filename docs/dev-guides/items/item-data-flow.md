# 物品数据读写流程

## 文件位置

物品数据保存为独立 JSON 文件：

```text
data/
  items/
    item_xxx.json
```

当前没有项目选择器时，默认使用仓库运行目录下的 `data` 目录。

## 调用链

```text
Items.vue
  -> src/views/items/useItemList.ts
  -> src/api/itemApi.ts
  -> electron/preload/index.ts
  -> electron/main/items/item-service.ts
  -> electron/main/file-system/json-file-store.ts
```

## 行为

- 页面加载时读取 `items/*.json`。
- 新建和编辑物品会覆盖写入对应 `item_xxx.json`。
- 删除物品会删除对应 JSON 文件。
- 复制物品会生成新的稳定 ID 并写入新 JSON 文件。
- 单个坏文件不会阻断列表加载，会在页面错误区展示。
- 物品 ID 同时作为文件名，只允许字母、数字、下划线和短横线。

## 维护规则

- Vue 组件不能直接访问 Node 文件系统。
- 物品固定字段仍只保留 `name`，加上系统字段 `id`、`customFields`、`schemaVersion`。
- 题材设定继续写入 `customFields`。
- 自定义属性重复 key 时必须提醒并阻止保存。
- 保存前必须通过 `isItemFile` 校验。
