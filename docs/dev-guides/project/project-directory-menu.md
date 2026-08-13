# 小说项目目录与 Electron 菜单设计

## 目标

本文档用于指导后续实现 Electron 菜单中的小说项目创建和打开流程。

本能力要解决当前小说数据默认写入仓库根目录 `data/` 的问题。正式功能中，小说项目数据必须保存在用户选择的本地目录中；该目录通过 `novel.json` 标识为一个有效小说项目。

第一版设计项目入口、目录校验和启动时默认加载上一次打开的项目目录。不实现最近打开列表、多项目并行、自动迁移或云同步。

## 菜单结构

Electron 顶部菜单新增一级菜单：

```text
小说
├─ 新建
└─ 打开
```

菜单由 Electron main process 创建，因为目录选择、文件校验和项目初始化都属于本地能力，不能直接暴露给 renderer。

菜单行为：

- `小说 > 新建`：选择一个目录，将该目录初始化为小说项目目录。
- `小说 > 打开`：选择一个目录，校验目录下是否存在有效的 `novel.json`。

## 新建小说项目流程

用户点击 `小说 > 新建` 后：

1. main process 调用系统目录选择弹窗，只允许选择文件夹。
2. 用户取消选择时，不做任何写入，也不改变当前项目。
3. 用户选择目录后，读取目录名作为默认小说名。
4. 如果目录下不存在 `novel.json`，创建新的 `novel.json`。
5. 如果目录下已经存在 `novel.json`，不直接覆盖，应提示用户该目录已经是小说项目，可以改用打开流程。
6. 初始化成功后，将当前项目目录写入应用系统配置。
7. 将当前项目信息发送给 renderer，由 renderer 更新顶部项目栏和后续模块数据来源。

目录选择应使用 Electron `dialog.showOpenDialog`，建议配置：

```ts
{
  properties: ["openDirectory", "createDirectory"]
}
```

实现时新增或修改的 TypeScript 文件必须保留中文文件功能注释、函数注释和必要的流程注释。

## 打开小说项目流程

用户点击 `小说 > 打开` 后：

1. main process 调用系统目录选择弹窗，只允许选择文件夹。
2. 用户取消选择时，不改变当前项目。
3. 用户选择目录后，检查目录下是否存在 `novel.json`。
4. 如果不存在，弹出错误提示：`这是一个无效的小说项目目录，未找到 novel.json。`
5. 如果存在，读取并校验 `novel.json` 结构。
6. 校验通过后，将当前项目目录写入应用系统配置。
7. 将当前项目信息发送给 renderer。
8. 校验失败时，弹出错误提示：`novel.json 文件结构无效，无法打开该小说项目。`

打开流程只校验项目入口文件，不要求第一版同时校验所有人物、物品、地点等子目录数据。各模块进入页面或加载列表时再校验对应 JSON 文件。

## `novel.json` 第一版结构

第一版 `novel.json` 以用户要求的三个字段为核心：

```json
{
  "title": "默认使用目录名",
  "folderPath": "D:/Novels/默认使用目录名",
  "description": "",
  "schemaVersion": 1,
  "createdAt": "2026-08-10T00:00:00.000Z",
  "updatedAt": "2026-08-10T00:00:00.000Z"
}
```

字段说明：

- `title`：小说名。新建时默认使用目录名，后续必须允许用户在项目信息页或 Inspector 中修改。
- `folderPath`：小说项目文件夹地址。创建时写入用户选择目录的绝对路径，用于界面展示和诊断，不作为项目唯一身份。
- `description`：小说简介。新建时为空字符串，后续由用户编辑。
- `schemaVersion`：项目入口文件结构版本。后续修改 `novel.json` 结构时必须递增或提供迁移说明。
- `createdAt`：项目创建时间，使用 ISO 字符串。
- `updatedAt`：项目入口信息最近更新时间，使用 ISO 字符串。

关于可携带性：

- 项目有效性以“当前选择目录下存在且通过校验的 `novel.json`”为准。
- 如果用户移动了整个小说项目目录，`folderPath` 可能与当前实际路径不同。打开时不应因此判定无效。
- 后续保存项目信息时，可以将 `folderPath` 更新为当前实际目录。

## 项目目录结构

新建项目时，第一版至少创建 `novel.json`。可以同步创建空的分类目录，便于用户直接查看项目结构：

```text
selected-folder/
  novel.json
  list-orders/
  characters/
  items/
  locations/
  maps/
  relations/
  events/
  timeline/
  world/
  chapters/
```

如果为了最小实现只创建 `novel.json`，后续人物、物品、地点等模块保存第一条数据时必须自动创建自己的分类目录。

地图模块当前已有 `maps/` 数据目录，第一版项目结构应继续保留该目录，避免后续地图数据无处迁移。

## 应用系统 userData 目录

正式功能实现后，仓库根目录 `data/` 不再保存小说领域数据。人物、物品、地点、地图、事件、时间线等内容必须全部保存在用户选择的小说项目目录下。

Electron `app.getPath('userData')` 对应的目录用于保存应用自身的系统文件，例如上一次打开的小说项目目录、后续全局设置、窗口偏好等。这类文件属于工具运行状态，不属于任何一部小说的世界状态。

建议第一版系统文件结构：

```text
Electron userData/
  system/
    app-settings.json
```

`app-settings.json` 第一版结构：

```json
{
  "lastOpenedProjectPath": "D:/Novels/大乾风云",
  "schemaVersion": 1,
  "updatedAt": "2026-08-10T00:00:00.000Z"
}
```

字段说明：

- `lastOpenedProjectPath`：上一次成功新建或打开的小说项目目录。应用启动时优先尝试加载该目录。
- `schemaVersion`：系统配置文件结构版本。
- `updatedAt`：系统配置最近更新时间。

实现原则：

- Electron userData 可以保存系统文件，但不能继续保存小说项目领域数据。
- userData 下的 `system/app-settings.json` 只记录项目目录路径，不复制 `novel.json` 内容，不保存人物、物品、地点等小说数据。
- 新建和打开小说项目成功后，必须更新 `lastOpenedProjectPath`。
- 如果用户移动或删除了上一次打开的目录，启动时应进入未打开项目状态，并提示用户重新新建或打开项目。
- 读取系统配置失败不应导致应用崩溃，可以按未打开项目处理。

## 启动默认加载流程

应用启动时，main process 应在窗口创建后或 renderer 准备完成后尝试恢复上一次打开的项目。

推荐流程：

1. 读取 userData 下的 `system/app-settings.json`。
2. 如果文件不存在，进入未打开项目状态。
3. 如果 `lastOpenedProjectPath` 为空，进入未打开项目状态。
4. 如果路径存在，检查该目录下是否存在 `novel.json`。
5. 如果 `novel.json` 存在并通过校验，将该目录设置为当前小说项目目录。
6. 将当前项目信息发送给 renderer。
7. 如果目录不存在、`novel.json` 缺失或结构无效，不自动清空配置；只提示用户上一次打开的项目不可用，并进入未打开项目状态。

启动恢复不应自动创建 `novel.json`。自动创建只发生在用户明确点击 `小说 > 新建` 后。

## 现有数据搬迁约定

当前仓库 `data/` 下已有的人物、物品、地点、地图、排序等目录和文件，可视为第一个小说项目的待搬迁数据。

本功能实现后，用户会手动新建一个小说项目目录，并把当前 `data/` 中的小说领域目录和文件复制到该新目录中。应用本身第一版不负责自动迁移，也不在启动时把系统 `data/` 当成小说项目目录。

如果旧开发数据里的 `data/system/` 已经存在，搬迁第一个小说项目时不要复制 `data/system/`。系统配置应保存在 Electron userData 目录，不属于小说项目结构。

搬迁后的第一个小说项目目录示例：

```text
first-novel-folder/
  novel.json
  list-orders/
  characters/
  items/
  locations/
  maps/
```

复制完成后，用户通过 `小说 > 打开` 选择 `first-novel-folder/`，应用校验 `novel.json` 后把该目录写入 userData 下的 `system/app-settings.json`。

## 职责拆分

建议新增项目服务，避免把菜单逻辑、文件读写和业务校验都堆在 `electron/main/index.ts`：

```text
electron/main/
  menu/
    novel-menu.ts
  projects/
    project-service.ts
    project-schema.ts
  system/
    app-settings-service.ts
```

职责说明：

- `menu/novel-menu.ts`：创建 Electron 菜单，绑定“小说 / 新建 / 打开”动作。
- `projects/project-service.ts`：负责选择目录、创建项目、打开项目、读取和保存 `novel.json`。
- `projects/project-schema.ts`：定义 `NovelProjectFile` 类型和 `isNovelProjectFile` 校验函数。
- `system/app-settings-service.ts`：负责读取和写入 userData 下的 `system/app-settings.json`，记录上一次打开的小说项目目录。
- `electron/main/index.ts`：只负责窗口创建、IPC 注册和菜单安装。

preload 和 renderer 建议补充：

```text
electron/preload/index.ts
src/api/projectApi.ts
src/stores/projectStore.ts
```

renderer 不直接访问文件系统，只接收 main process 返回的项目信息并驱动页面状态。

## IPC 与事件设计

菜单动作发生在 main process，但项目状态需要同步给 renderer。建议使用两类通道：

```text
projects:create
projects:open
projects:get-current
projects:current-changed
projects:restore-last-opened
```

设计说明：

- `projects:create`：可供 renderer 后续按钮复用；第一版菜单也可直接调用同一个 main service。
- `projects:open`：可供 renderer 后续按钮复用；第一版菜单也可直接调用同一个 main service。
- `projects:get-current`：renderer 初始化时获取当前项目。
- `projects:current-changed`：main process 在新建或打开成功后主动通知当前窗口。
- `projects:restore-last-opened`：应用启动或 renderer 初始化时恢复 userData 下的 `system/app-settings.json` 中记录的上一次项目。

如果第一版只做菜单触发，也仍应把项目创建和打开能力抽成 service，避免未来 renderer 项目首页按钮重复实现一套逻辑。

## 校验规则

`novel.json` 第一版校验必须满足：

- JSON 可解析。
- 根节点是普通对象。
- `title` 是字符串，允许为空但 UI 应提示补充。
- `folderPath` 是字符串。
- `description` 是字符串。
- `schemaVersion` 是数字。
- `createdAt` 和 `updatedAt` 是字符串。

打开项目时：

- 缺少 `novel.json`：目录无效。
- JSON 解析失败：入口文件损坏。
- schema 校验失败：入口文件结构无效。

保存项目标题或简介时必须重新写入 `updatedAt`。保存前后不应删除未知字段，以便未来版本或用户手写扩展字段能够保留。

## Renderer 状态要求

打开或新建项目成功后，renderer 应至少保存：

```ts
{
  title: string;
  folderPath: string;
  description: string;
  schemaVersion: number;
}
```

顶部项目栏显示小说名和当前目录。未打开项目时，页面应进入明确的空项目状态，提示通过菜单新建或打开小说项目。

各模块加载数据时必须从当前项目目录读取：

```text
当前项目目录 -> characters/items/locations/maps/list-orders 等子目录
```

如果当前没有项目，模块页面不应继续静默读取系统 `data/`，否则用户会误以为数据已经保存在自己选择的小说项目目录。

## 错误提示

第一版错误提示应直接说明用户能采取的动作：

- 目录缺少 `novel.json`：`这是一个无效的小说项目目录，未找到 novel.json。请选择通过“小说 > 新建”创建过的目录。`
- 目录已存在 `novel.json` 且用户执行新建：`该目录已经包含 novel.json，请使用“小说 > 打开”。`
- `novel.json` 解析失败：`novel.json 不是有效的 JSON 文件，请检查文件内容。`
- `novel.json` 结构失败：`novel.json 文件结构无效，无法打开该小说项目。`
- 写入失败：`无法在所选目录创建 novel.json，请检查目录权限。`
- 上一次项目不可用：`上一次打开的小说项目目录不可用，请重新选择项目目录。`

## 分阶段实现建议

第一阶段：

1. 新增 `NovelProjectFile` 类型和校验函数。
2. 新增 project service，完成创建、打开和 `novel.json` 读写。
3. 新增 app settings service，使用 userData 下的 `system/app-settings.json` 保存上一次打开的项目目录。
4. 新增 Electron 菜单 `小说 / 新建 / 打开`。
5. 新建和打开成功后更新 `lastOpenedProjectPath` 并通知 renderer 当前项目。

第二阶段：

1. 应用启动时恢复上一次打开的项目目录。
2. renderer 增加项目状态 store。
3. 顶部项目栏显示当前小说名和目录。
4. 各模块 API 改为读取当前项目目录。
5. 未打开项目时不再静默读取系统 `data/`。

第三阶段：

1. 增加项目首页或 Inspector，用于编辑小说名和简介。
2. 保存项目信息前展示变更或确认，尤其是未来接入 AI 建议时。
3. 按需要设计从旧小说数据导入到用户项目目录的迁移流程。

## 非目标

第一版不要实现：

- 数据库。
- 云同步。
- 最近打开项目列表。
- 多项目同时打开。
- 自动迁移旧小说数据。
- 文件监听和外部编辑自动刷新。
- AI 自动写入 `novel.json` 或其他项目数据。
