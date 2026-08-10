# 人物列表页设计

## 作用

本指南用于实现人物模块列表页，对应 `src/views/Characters.vue`。

当前人物页采用左侧搜索列表 + 右侧 Inspector。新建和编辑使用弹框，数据通过 Electron IPC 写入本地 JSON 文件。

## 设计规则

- 人物页显示在主工作台右侧页面容器内，不改顶部项目栏和左侧导航。
- 页面主体使用左侧人物列表、右侧 Inspector。
- 左侧列表展示人物名称、年龄、性格摘要，并支持搜索。
- 点击列表项时在右侧 Inspector 展示详情。
- Inspector 提供编辑、复制、删除入口。
- 删除不需要二次确认。
- 新建使用弹框，不跳转页面。
- 弹框必须复用 `src/components/common/AppModal.vue`，不要在人物模块内重复实现公共弹框。
- 编辑入口可先使用弹框或预留弹框逻辑，不新增独立页面。

## 数据规则

人物结构参考 `src/types/character.ts` 的 `CharacterFile`：

```ts
{
  id: string;
  name: string;
  age: number | string | null;
  traits: string[];
  appearance: string;
  customFields: Record<string, JsonValue>;
  schemaVersion: 1;
}
```

人物数据通过 `src/api/characterApi.ts` 调用 preload IPC，最终由主进程写入 `data/characters/*.json`。

## 开发指示

- `Characters.vue` 文件顶部添加中文文件功能注释。
- 新建人物时使用 `createEmptyCharacter` 或保持同等默认结构。
- 新建和编辑表单需要包含：姓名、年龄、性格、外貌、自定义属性。
- 性格输入可按逗号、空格或换行拆分成 `traits` 数组。
- 年龄为空时保存为 `null`；数字文本可转为 number，其他文本保留 string。
- 详情弹框只读展示：名称、年龄、性格、外貌、`customFields`。
- 编辑时必须保留原对象的 `id`、未知字段和 `schemaVersion`，并用动态 key/value 行更新 `customFields`。
- 不要在 Vue 组件中直接访问文件系统。
- 不要新增数据库或改变现有 JSON 格式。

## 验证

完成后运行：

```bash
npm run typecheck
npm run build
```
