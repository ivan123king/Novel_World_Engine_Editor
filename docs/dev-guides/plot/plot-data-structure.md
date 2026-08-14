# 剧情库数据结构设计

## 作用

本文档定义剧情库第一版的数据结构。它服务于“剧情块逐层展开 + 当前块内说明卡片”的页面模型，不服务于章节规划或剧情事件时间线。

剧情库读取和保存当前小说项目目录下的 `plots/*.json`。`mock_data/plots.json` 只保留为开发期示例数据，不作为真实运行时数据源。

## 存储原则

- 剧情块是树形节点，通过 `parentId` 形成层级。
- 根剧情块的 `parentId` 为 `null`。
- 说明卡片属于某一个剧情块内部，不是子剧情。
- 子剧情用于继续拆分剧情层级；说明卡片用于补充当前剧情块的内容。
- 同级剧情块使用 `order` 排序。
- 同一剧情块内的说明卡片使用 `order` 排序。
- 不把所有剧情集中到一个大 JSON 文件。

## 后续持久化目录

```text
novel-project/
  plots/
    index.json
    plot_qixuanmen.json
    plot_molao.json
```

## `plots/index.json`

剧情库进入页面时只读取 `plots/index.json`，不要一次性读取全部 `plots/*.json` 详情文件。
索引只保存分层列表和导航需要的轻量字段：

```json
{
  "entries": [
    {
      "id": "plot_qixuanmen",
      "title": "七玄门",
      "summary": "主角进入七玄门后的早期剧情。",
      "parentId": null,
      "order": 0,
      "childCount": 2
    }
  ],
  "schemaVersion": 1
}
```

运行规则：

- 进入剧情页只读取根节点索引。
- 点击剧情块时读取该剧情块详情 JSON 和它的直接子剧情索引。
- 保存剧情块时同步更新对应索引条目的 `title`、`summary`、`parentId`、`order` 和 `childCount`。
- 删除剧情块时由 Electron main process 根据索引计算并删除整棵子树。
- 旧项目缺少索引时，main process 可以扫描一次 `plots/*.json` 自动补建索引；后续正常加载不再全量读取详情。

## 调用链

```text
Plots.vue
  -> src/views/plot/usePlotLibrary.ts
  -> src/api/plotApi.ts
  -> electron/preload/index.ts
  -> electron/main/plots/plot-service.ts
  -> electron/main/file-system/json-file-store.ts
```

## TypeScript 结构

```ts
export const PLOT_SCHEMA_VERSION = 1;

export interface PlotDescriptionBlock {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface PlotFile {
  id: string;
  title: string;
  summary: string;
  parentId: string | null;
  order: number;
  descriptionBlocks: PlotDescriptionBlock[];
  schemaVersion: typeof PLOT_SCHEMA_VERSION;
}
```

## 字段说明

### PlotFile

- `id`：稳定 ID，用于文件名、树引用和后续跨模块引用。标题修改时不能变。
- `title`：剧情块名称，例如“七玄门”“墨老失踪”。
- `summary`：当前剧情块简介，显示在内容区顶部。
- `parentId`：父剧情块 ID。根剧情块为 `null`。
- `order`：同一父剧情块下的展示顺序。
- `descriptionBlocks`：当前剧情块内部的说明卡片列表。
- `schemaVersion`：数据结构版本。

### PlotDescriptionBlock

- `id`：说明卡片稳定 ID，只在所属剧情块内部使用。
- `title`：说明卡片名称，例如“药园异常”“墨老隐藏目的”。
- `content`：说明卡片正文。
- `order`：同一剧情块内的展示顺序。

## 示例

```json
{
  "id": "plot_molao",
  "title": "墨老",
  "summary": "墨老收主角为徒，并逐步显露出异常目的。",
  "parentId": "plot_qixuanmen",
  "order": 1,
  "descriptionBlocks": [
    {
      "id": "desc_molao_goal",
      "title": "墨老隐藏目的",
      "content": "墨老表面授功，实际在观察长春功进展。",
      "order": 0
    }
  ],
  "schemaVersion": 1
}
```

## 校验规则

- `id`、`title`、`summary` 必须是字符串。
- `parentId` 必须是字符串或 `null`。
- `order` 必须是有限数字。
- `descriptionBlocks` 必须是数组。
- 每个说明卡片的 `id`、`title`、`content` 必须是字符串。
- 每个说明卡片的 `order` 必须是有限数字。
- `schemaVersion` 必须等于当前 `PLOT_SCHEMA_VERSION`。

## 排序规则

- 根剧情块按 `order` 升序展示。
- 当前剧情块的直接子剧情按 `order` 升序展示。
- 说明卡片按 `order` 升序展示。
- 页面拖拽调整顺序后，必须重新写入连续的 `order`：`0, 1, 2...`。

## 暂不进入第一版的数据

以下内容暂不写入第一版结构：

- 章节引用。
- 人物 ID 列表。
- 地点 ID 列表。
- AI 建议变更。
- 复杂关系边。

这些字段等对应模块交互明确后再扩展，避免第一版数据结构过早复杂化。
