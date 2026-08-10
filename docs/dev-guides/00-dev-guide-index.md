# 开发指南索引

## 作用

本文件是 `docs/dev-guides/` 的入口索引。AI 开发前先阅读本文件，再根据任务类型只打开必要的具体指南，避免一次性加载过多上下文。

## 阅读规则

- 先判断当前任务属于哪个模块或基础能力。
- 只阅读与当前任务直接相关的 dev-guide。
- 不要为了普通页面或小修复加载全部 dev-guide。
- 如果任务跨多个模块，按影响范围逐个阅读对应文档。
- 如果没有匹配的 dev-guide，先按现有代码和 `docs/ai-guides/` 工作，不要臆造不存在的规则。

## 代码引用规则

- `src` 下模块互相 import 时，必须使用 `@/` 路径别名，不允许使用相对路径引入。
## 当前文档

- `common/common-components.md`：公共组件指南。新增或修改弹框、按钮、通用输入、空状态等跨模块组件前阅读。
- `json-file-store.md`：本地 JSON 文件工具设计。修改 Electron main process 文件读写、目录解析、JSON 保存/读取、路径边界校验时阅读。
- `list-order.md`：列表排序元数据设计。为人物、物品或后续资源列表新增拖动排序、保存展示顺序或恢复排序文件时阅读。
- `main-workbench-layout.md`：主工作台整体页面结构。修改顶部项目栏、左侧模块导航、右侧页面容器、路由入口或 `mock_data/` 规则时阅读。
- `character/character-list-page.md`：人物列表页设计。修改人物卡片列表、新建弹框、详情弹框、编辑入口或人物 mock 数据展示时阅读。
- `character/character-custom-fields.md`：人物自定义属性设计。修改人物新建/编辑弹框中的动态 key/value 属性、`customFields` 转换或详情展示时阅读。
- `character/character-data-flow.md`：人物 JSON 文件读写流程。修改人物持久化、IPC、preload 或 renderer API 时阅读。
- `items/item-module-design.md`：物品模块设计。修改物品类型、物品页面、自定义属性或后续物品 JSON 持久化时阅读。
- `items/item-list-page.md`：物品列表页设计。修改物品页面布局、表单弹框、Inspector 或重复 key 提示时阅读。
- `items/item-data-flow.md`：物品 JSON 文件读写流程。修改物品持久化、IPC、preload 或 renderer API 时阅读。
- `map/map-module-design.md`：地图模块设计。实现地点地图画布、地点标记、子地图层级、地图 JSON 格式或地图 Inspector 前阅读。
- `map/map-page-prototype.md`：地图页面设计。修改当前地图页、vue-konva 画布交互、地图读写或页面样式前阅读。

## 编写新指南

当用户明确设计某个模块页面或基础能力时，可以在本目录新增独立指南。

新指南应保持模块单一职责，例如：

- 人物模块设计
- 物品模块设计
- 关系图模块设计
- 时间线模块设计

新增指南后，同步更新本索引的“当前文档”列表。
