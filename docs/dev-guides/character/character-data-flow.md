# 人物数据读写流程

## 文件位置

人物数据保存为独立 JSON 文件：

```text
data/
  characters/
    char_xxx.json
```

当前没有项目选择器时，默认使用仓库运行目录下的 `data` 目录。

## 调用链

```text
Characters.vue
  -> src/views/character/useCharacterList.ts
  -> src/api/characterApi.ts
  -> electron/preload/index.ts
  -> electron/main/characters/character-service.ts
  -> electron/main/file-system/json-file-store.ts
```

## 行为

- 页面加载时读取 `characters/*.json`。
- 新建和编辑人物会覆盖写入对应 `char_xxx.json`。
- 删除人物会删除对应 JSON 文件。
- 单个坏文件不会阻断列表加载，会在页面错误区展示。
- 人物 ID 同时作为文件名，只允许字母、数字、下划线和短横线。
- 读取、保存、复制后不主动按名称排序，页面尽量保留用户当前编辑和追加顺序。
- 保存人物时会写入可选 `customFieldOrder`，用于稳定保留自定义属性展示顺序。

## 维护规则

- Vue 组件不能直接访问 Node 文件系统。
- 人物固定字段仍只保留 `name`、`age`、`traits`、`appearance`。
- 题材设定继续写入 `customFields`。
- 自定义属性重复 key 时必须提醒并阻止保存。
- 自定义属性顺序按用户编辑顺序保留，不要主动排序。
- 展示自定义属性时优先读取 `customFieldOrder`，旧文件没有该字段时回退到 `customFields` 自身顺序。
- 保存前必须通过 `isCharacterFile` 校验。
