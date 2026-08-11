# JSON 文件工具设计

## 目标

提供一套通用的本地 JSON 文件读写工具，供人物、物品、地点、事件等模块复用。

第一版只解决基础问题：

- 创建目录
- 保存对象为 JSON 文件
- 读取 JSON 文件
- 读取后用校验函数恢复成指定数据结构

## 放置位置

建议放在 Electron 主进程：

```text
electron/main/file-system/
  directory.ts
  json-file-store.ts
```

原因：本地文件访问属于 Electron main process 职责，Vue renderer 不应直接访问文件系统。

## API 设计

第一版只需要这些函数：

```ts
getDefaultBaseDirectory(): string

resolveBaseDirectory(baseDirPath?: string): string

ensureBaseDirectory(baseDirPath?: string): Promise<string>

resolvePathInBaseDirectory(
  baseDirPath: string | undefined,
  ...segments: string[]
): string

ensureDirectory(dirPath: string): Promise<void>

saveJsonFile<T>(filePath: string, data: T): Promise<void>

loadJsonFile(filePath: string): Promise<unknown>

loadJsonFileAs<T>(
  filePath: string,
  validator: (value: unknown) => value is T
): Promise<T>
```

## 基础目录路径

JSON 文件工具必须围绕一个基础目录路径工作。调用方可以传入用户指定的基础目录路径，后续人物、物品、地点、事件等文件都必须创建在这个基础目录下。

正式小说项目功能接入后，人物、物品、地点、事件等领域数据不允许在调用方缺少基础目录路径时继续写入系统 `data` 目录。`data` 目录只保存应用系统文件，例如上一次打开的项目目录和后续全局设置。

因此，业务模块保存或读取小说数据时必须传入当前小说项目目录。未打开项目时，业务模块应返回明确错误或让 renderer 进入空项目状态，而不是静默创建 `data/characters`、`data/items` 等目录。

基础目录相关规则：

- `resolveBaseDirectory(baseDirPath)` 负责解析最终使用的基础目录。
- `ensureBaseDirectory(baseDirPath)` 负责创建基础目录，并返回最终使用的绝对路径。
- `resolvePathInBaseDirectory(baseDirPath, ...segments)` 负责把后续相对路径拼到基础目录下。
- 后续模块只传入相对路径片段，例如 `characters/char_linchen.json`，不要自行绕过基础目录写入任意位置。
- 第一版只处理路径解析和目录创建，不做复杂项目注册或多项目管理；上一次打开的项目目录由 `project/project-directory-menu.md` 中定义的系统配置负责。
## 职责边界

JSON 文件工具只负责通用文件能力：

- 创建目录
- 读文件
- 写文件
- JSON parse
- JSON stringify
- 调用外部传入的 validator

JSON 文件工具不负责：

- 人物业务逻辑
- 物品业务逻辑
- 关系业务逻辑
- AI 分析逻辑
- UI 状态管理

例如人物校验应由 `src/types/character.ts` 中的 `isCharacterFile` 负责。

## 保存规则

`saveJsonFile` 应满足：

- 自动创建父目录
- 使用 UTF-8 保存
- 使用 2 空格缩进
- 默认覆盖写入
- 不修改传入对象

第一版暂时不做自动备份、文件锁、并发写入队列。

## 读取规则

`loadJsonFile` 应满足：

- 文件不存在时抛出明确错误
- JSON 格式错误时抛出明确错误
- 返回 `unknown`，不要直接断言成业务类型

`loadJsonFileAs` 应满足：

- 先调用 `loadJsonFile`
- 再调用传入的 validator
- validator 不通过时抛出明确错误
- 通过后返回目标类型

## 目录分类示例

小说项目中的数据应按类型分目录保存。这里的 `base-directory` 必须是用户选择并通过 `novel.json` 校验的小说项目目录：

```text
base-directory/
  characters/
    char_linchen.json
  items/
    item_qingyun_sword.json
  locations/
    location_capital.json
```

保存人物示例流程：

```text
baseDir = await ensureBaseDirectory(userSelectedBaseDir)
filePath = resolvePathInBaseDirectory(baseDir, "characters", "char_linchen.json")
saveJsonFile(filePath, character)
```

读取人物示例流程：

```text
filePath = resolvePathInBaseDirectory(userSelectedBaseDir, "characters", "char_linchen.json")
loadJsonFileAs(filePath, isCharacterFile)
```

## 第一版不要做

暂时不要加入：

- 数据库
- 复杂 Repository 抽象
- 自动迁移系统
- 文件监听
- 增量 patch
- 多版本备份
- 并发锁
- schema 框架

这些能力等真实需求出现后再扩展。
