# 人物自定义属性设计

## 目标

人物固定字段只保留 `name`、`age`、`traits`、`appearance`。题材相关设定统一进入 `customFields`，例如身份秘密、武学、官职履历、身体状态。

## UI

- 人物新建和编辑弹框展示“自定义属性”区域。
- 自定义属性使用动态 `key = value` 行。
- 点击“添加属性”新增一行；点击行尾删除按钮移除该行。
- 空 key 不保存；重复 key 以后出现的行为准。
- 详情弹框按 key 逐项展示自定义属性。

## 数据转换

- 表单行结构只用于 renderer：`{ id, key, value }`。
- 保存人物时转换为 `customFields: Record<string, JsonValue>`。
- value 输入优先按 JSON 解析；解析失败时按普通字符串保存。
- 因此可输入普通文本，也可输入 `123`、`true`、`null`、`{"境界":"小成"}`、`[{"章节":1}]`。

## 维护规则

- 不要把题材字段新增为 `CharacterFile` 固定字段。
- 编辑人物时必须保留 `id`、`schemaVersion` 和未触碰的顶层未知字段。
- Vue 组件不直接读写文件，保存动作通过 `src/api/characterApi.ts` 进入 Electron 主进程。
