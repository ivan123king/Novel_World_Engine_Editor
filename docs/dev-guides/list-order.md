# 列表排序元数据设计

## 作用

本指南用于人物、物品等资源列表的用户自定义排序。排序表达的是作者当前写作阶段的工作台关注顺序，不属于人物或物品本身的题材设定。

## 文件位置

列表顺序保存为独立 JSON 文件：

```text
data/
  list-orders/
    characters.json
    items.json
```

不要把列表顺序写入 `customFields`，也不要为了排序给人物或物品增加题材固定字段。

## 文件结构

```json
{
  "entityType": "characters",
  "ids": ["char_main", "char_supporting"],
  "schemaVersion": 1
}
```

- `entityType`：当前支持 `characters` 和 `items`。
- `ids`：实体 ID 的展示顺序。
- `schemaVersion`：排序元数据结构版本。

## 行为规则

- 页面加载时先读取实体小 JSON 文件，再按对应排序文件中的 `ids` 调整展示顺序。
- 排序文件缺失时，不报错，保留实体服务的当前读取顺序。
- 排序文件损坏时，不阻断实体加载，把错误追加到页面错误区。
- 排序文件中不存在的实体 ID 会被忽略。
- 新增、复制的实体追加到当前列表末尾，并同步保存排序文件。
- 删除实体后从排序文件中移除对应 ID。
- 用户拖动列表项后立即保存排序文件。
- 拖动保存失败时，界面应回滚到拖动前顺序并展示错误。

## 调用链

```text
Characters.vue / Items.vue
  -> useCharacterList.ts / useItemList.ts
  -> characterApi.ts / itemApi.ts
  -> electron/preload/index.ts
  -> electron/main/* service
  -> electron/main/list-order/list-order-service.ts
  -> electron/main/file-system/json-file-store.ts
```

## 维护规则

- Vue 组件不能直接访问文件系统。
- 排序元数据必须可读、可版本管理、可手动恢复。
- 排序不应改变人物、物品文件自身的 `schemaVersion`。
- 后续地点、事件等模块需要排序时，应复用同一排序元数据服务，而不是为每个模块重复实现一套文件格式。
