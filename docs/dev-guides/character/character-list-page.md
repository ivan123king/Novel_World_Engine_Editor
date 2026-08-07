# 人物列表页设计

## 作用

本指南用于实现人物模块第一版列表页，对应 `src/views/Characters.vue`。

当前只设计人物列表、新建弹框、详情弹框和编辑入口。人物详情页、完整编辑页和真实 JSON 持久化后续单独设计。

## 设计规则

- 人物页显示在主工作台右侧页面容器内，不改顶部项目栏和左侧导航。
- 页面主体参考线框图：左上方放“新建”按钮，下方使用人物卡片网格展示人物。
- 人物卡片展示基础摘要：人物名称、年龄、性格标签。
- 点击卡片主体打开详情弹框；详情弹框暂时代替详情页面。
- 卡片内提供“删除”“编辑”按钮；按钮点击不能触发卡片详情弹框。
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

mock 数据放在 `mock_data/characters.json`，不要把人物数组写死在 Vue 组件里。

当前阶段新建、编辑、删除只修改 renderer 内部状态，不写回文件。

## 开发指示

- `Characters.vue` 文件顶部添加中文文件功能注释。
- 新建人物时使用 `createEmptyCharacter` 或保持同等默认结构。
- 新建表单第一版只需要：姓名、年龄、性格、外貌。
- 性格输入可按逗号、空格或换行拆分成 `traits` 数组。
- 年龄为空时保存为 `null`；数字文本可转为 number，其他文本保留 string。
- 详情弹框只读展示：名称、年龄、性格、外貌、`customFields`。
- 编辑时必须保留原对象的 `id`、`customFields`、未知字段和 `schemaVersion`。
- 不要在 Vue 组件中直接访问文件系统。
- 不要新增数据库或改变现有 JSON 格式。

## 验证

完成后运行：

```bash
npm run typecheck
npm run build
```
