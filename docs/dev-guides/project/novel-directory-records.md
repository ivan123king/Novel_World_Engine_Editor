# 小说目录记录弹框设计

## 目标

本文档用于指导“小说目录记录”功能。

用户通过本软件成功新建或打开的小说项目目录，都应被记录到应用自身的 `data/` 目录下。这里记录的是“曾经由本软件识别过的小说项目入口”，用于后续快速打开，不保存人物、物品、地点、剧情、时间线等小说领域数据。

第一版只做简单清晰的记录、展示、删除和快捷打开，不做复杂的最近打开排序、多项目工作区、云同步或自动迁移。

## 菜单结构

Electron 顶部菜单在 `小说` 一级菜单下新增入口：

```text
小说
├─ 新建
├─ 打开
└─ 小说目录
```

菜单行为：

- `小说 > 小说目录`：打开小说目录记录弹框。
- 该弹框展示已经记录过的小说项目目录。
- 弹框中的“打开”按钮复用现有 `小说 > 打开` 成功后的项目加载逻辑，但不再弹出系统目录选择框，而是直接打开对应记录路径。

## 数据保存位置

小说目录记录属于应用自身数据，保存到仓库运行数据目录：

```text
data/
  system/
    novel-directory-records.json
```

不要把这个记录文件放到用户的小说项目目录中。它记录的是软件知道哪些小说目录，不属于某一部小说的世界状态。

## 数据结构

第一版 JSON 结构保持简单：

```json
{
  "schemaVersion": 1,
  "records": [
    {
      "title": "大乾风云",
      "folderPath": "D:/Novels/大乾风云",
      "recordedAt": "2026-08-13T00:00:00.000Z",
      "lastOpenedAt": "2026-08-13T00:00:00.000Z"
    }
  ],
  "updatedAt": "2026-08-13T00:00:00.000Z"
}
```

字段说明：

- `schemaVersion`：记录文件结构版本，第一版为 `1`。
- `records`：小说目录记录列表。
- `title`：小说名，优先使用对应目录下 `novel.json` 的 `title` 字段。
- `folderPath`：小说项目目录绝对路径，该目录下必须存在 `novel.json` 才算有效项目。
- `recordedAt`：该目录第一次被记录的时间。
- `lastOpenedAt`：该目录最近一次通过新建、打开或快捷打开成功加载的时间。
- `updatedAt`：记录文件最近更新时间。

## 记录规则

当用户通过以下方式成功得到一个有效小说项目后，必须记录或更新目录记录：

- `小说 > 新建`
- `小说 > 打开`
- `小说目录` 弹框中的“打开”

记录逻辑：

1. 以规范化后的 `folderPath` 作为唯一标识。
2. 如果记录不存在，新增一条记录。
3. 如果记录已存在，更新 `title` 和 `lastOpenedAt`，保留原 `recordedAt`。
4. 如果小说名为空，界面显示目录名作为兜底名称，但不要强行改写用户项目的 `novel.json`。
5. 记录文件写入失败时，不应阻止项目本身打开成功，但应给出轻量错误提示。

## 弹框展示

用户点击 `小说 > 小说目录` 后打开弹框。

弹框标题：

```text
小说目录
```

列表项格式：

```text
小说名
小说目录路径
                         打开  删除记录
```

展示要求：

- 小说名在上方，字号和权重高于路径。
- 小说目录路径在小说名下方，字号更小，颜色更弱。
- 每条记录右侧放两个按钮：`打开`、`删除记录`。
- 列表为空时展示空状态文案：`还没有记录小说目录。通过“小说 > 新建”或“小说 > 打开”添加。`
- 弹框宽度建议 `680px` 到 `760px`，列表内容过多时内部滚动。

## 快捷打开

用户点击某条记录右侧的 `打开` 后：

1. main process 根据记录中的 `folderPath` 读取该目录。
2. 校验目录下存在 `novel.json`。
3. 校验 `novel.json` 结构有效。
4. 校验通过后，将该目录设置为当前小说项目。
5. 更新 `data/system/app-settings.json` 中的 `lastOpenedProjectPath`。
6. 更新 `data/system/novel-directory-records.json` 中对应记录的 `title` 和 `lastOpenedAt`。
7. 通知 renderer 当前项目已变化。
8. 关闭小说目录弹框，或保持弹框打开但明确显示当前项目已切换；第一版建议关闭弹框。

如果快捷打开失败：

- 目录不存在：提示 `该小说目录不存在，可能已被移动或删除。`
- 缺少 `novel.json`：提示 `该目录不是有效的小说项目，未找到 novel.json。`
- `novel.json` 无效：提示 `novel.json 文件结构无效，无法打开该小说项目。`
- 失败时不自动删除记录，由用户决定是否点击删除。

## 删除记录

用户点击某条记录右侧的 `删除记录` 后：

1. 只从 `data/system/novel-directory-records.json` 删除该条记录。
2. 不删除用户本地小说项目目录。
3. 不删除该目录下的 `novel.json` 或任何小说数据。
4. 如果删除的是当前已打开项目的记录，不关闭当前项目，只是不再在记录列表里展示。

第一版删除可以直接执行，也可以使用轻量确认提示。不要实现回收站、撤销或批量删除。

## 建议模块拆分

实现时保持菜单、文件服务和 renderer UI 分离：

```text
electron/main/
  menu/
    novel-menu.ts
  projects/
    project-service.ts
    novel-directory-records-service.ts
electron/preload/
  index.ts
src/
  api/
    novelDirectoryRecordsApi.ts
  components/
    project/
      NovelDirectoryRecordsModal.vue
```

职责说明：

- `novel-menu.ts`：在 `小说` 菜单下增加 `小说目录`，点击后通知 renderer 打开弹框。
- `project-service.ts`：继续负责新建、打开、按路径打开项目和当前项目状态通知。
- `novel-directory-records-service.ts`：负责读取、写入、新增或更新、删除目录记录。
- `novelDirectoryRecordsApi.ts`：renderer 侧封装 IPC，不直接访问文件系统。
- `NovelDirectoryRecordsModal.vue`：展示目录记录列表，并触发打开或删除操作。

## IPC 与事件设计

建议新增 IPC：

```text
novel-directories:open-list
novel-directories:list
novel-directories:open
novel-directories:delete
```

说明：

- `novel-directories:open-list`：main process 菜单点击后通知 renderer 打开小说目录弹框。
- `novel-directories:list`：renderer 打开弹框时读取记录列表。
- `novel-directories:open`：根据记录路径快捷打开小说项目。
- `novel-directories:delete`：删除单条目录记录。

新建和普通打开项目成功后，不需要 renderer 额外调用记录接口；main process 在项目服务成功后直接更新记录文件。

## 与现有项目打开逻辑的关系

快捷打开必须复用已有项目校验逻辑，不能另写一套宽松校验。

三种成功路径应保持一致结果：

- `小说 > 新建`
- `小说 > 打开`
- `小说目录 > 打开`

成功后都应：

- 设置当前项目。
- 更新顶部项目栏。
- 更新 `lastOpenedProjectPath`。
- 写入或更新小说目录记录。

## 非目标

第一版不实现：

- 多项目同时打开。
- 最近打开排序配置。
- 收藏、置顶、分组。
- 搜索和筛选。
- 自动扫描磁盘寻找小说目录。
- 自动删除失效记录。
- 自动迁移目录路径。
- 将记录同步到云端。
- 把记录写入用户小说项目目录。

## 验证建议

实现完成后至少验证：

1. 通过 `小说 > 新建` 成功创建项目后，记录文件新增该目录。
2. 通过 `小说 > 打开` 成功打开项目后，记录文件新增或更新该目录。
3. 点击 `小说 > 小说目录` 可以打开弹框。
4. 弹框按“小说名在上、目录路径在下、右侧打开和删除按钮”的格式展示。
5. 点击某条记录的 `打开` 后，当前项目切换到该目录。
6. 点击某条记录的 `删除` 后，只删除记录，不删除真实小说目录和 `novel.json`。
7. 记录目录不存在时，快捷打开失败并提示用户，但记录仍保留。
8. 记录文件缺失或损坏时，弹框显示空列表，不导致应用崩溃。
