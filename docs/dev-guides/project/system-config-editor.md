# 系统配置编辑器设计

## 目标

本文档用于指导 Electron 菜单栏中的系统配置编辑功能。

系统配置不再做独立导入导出。用户点击菜单后，应用直接弹出系统配置编辑窗口，展示内部系统配置文件内容：

```text
Electron userData/
  system/
    app-settings.json
```

用户可以在弹框中编辑 JSON 文本，点击保存后写回 Electron userData 目录中的 `system/app-settings.json`。这比导入/导出单独文件更直接，也能减少用户理解成本。

该功能只编辑应用自身的系统设置，不编辑当前打开的小说项目目录，不修改 `novel.json`、人物、物品、地图、关系图谱、剧情或时间线等小说领域数据。

## 菜单结构

Electron 顶部菜单栏保留独立一级菜单：

```text
系统
└─ 系统配置
```

系统配置属于应用运行状态，例如上一次打开的项目目录、AI 小助手服务地址和远程项目 ID，不属于任何一部小说项目，因此不放进“小说”菜单。

## 数据边界

当前系统配置文件由 Electron userData 目录中的 `system/app-settings.json` 承载。

编辑边界是单个 JSON 文件：

- 打开：读取当前应用 userData 下的 `system/app-settings.json`，格式化后展示在弹框中。
- 保存：校验弹框中的 JSON 文本，确认是普通对象后覆盖 userData 下的 `system/app-settings.json`。

如果当前配置文件不存在或损坏，弹框应展示默认系统配置对象，而不是让应用崩溃。

第一版不导入或导出外部文件，不复制整个 userData 目录，也不复制 userData 下的 `system/` 目录。

## 弹框交互

用户点击 `系统 > 系统配置` 后：

1. main process 通过菜单事件通知 renderer 打开系统配置弹框。
2. renderer 调用 IPC 读取当前系统配置 JSON 和配置文件绝对路径。
3. 弹框展示配置文件路径、复制路径按钮和一个多行 JSON 编辑框。
4. 用户点击取消时，不写入文件。
5. 用户点击保存时，先在 renderer 校验 JSON 是否可解析。
6. 解析成功后通过 IPC 发送给 main process。
7. main process 再次校验 JSON 根节点是普通对象。
8. main process 覆盖写入 userData 下的 `system/app-settings.json`。
9. 保存成功后刷新当前项目状态，并通知 renderer。

弹框不需要做字段级表单。第一版直接编辑 JSON 文本，适合当前系统配置字段少、结构变化可能较快的阶段。

## 覆盖语义

保存系统配置时，以弹框 JSON 为准：

- JSON 有 `lastOpenedProjectPath`：保存后恢复逻辑使用该路径。
- JSON 缺少某些当前版本字段：后续读取设置时按现有默认值恢复。
- JSON 包含未来版本新增字段：应原样保留，避免破坏未来扩展字段。

保存后如果 `lastOpenedProjectPath` 指向不存在的小说项目目录，应用不应自动创建小说项目，也不应清空用户保存的路径。恢复逻辑应按既有规则提示“上一次打开的小说项目目录不可用”。

## 文件操作安全

实现时建议对保存使用临时文件，减少半写入状态：

```text
app-settings.editing-{timestamp}.json
```

推荐保存步骤：

1. renderer 校验 JSON 文本可解析。
2. main process 校验值是普通对象。
3. 将内容写入 userData 下的 `system/` 目录中的临时文件。
4. 将临时文件重命名为 userData 下的 `system/app-settings.json`。
5. 失败时尽量保留原有 `app-settings.json`，并显示错误。

## 建议模块拆分

系统配置编辑逻辑应放在 service 中，避免把文件读写堆到菜单或 Vue 组件：

```text
electron/main/
  menu/
    app-menu.ts
    novel-menu.ts
    system-menu.ts
    window-menu.ts
  system/
    app-settings-service.ts
    system-config-editor-service.ts
src/
  api/
    systemConfigApi.ts
  components/
    system/
      SystemConfigEditorModal.vue
```

职责说明：

- `menu/app-menu.ts`：安装 Electron 顶部菜单，只负责组合各一级菜单。
- `menu/novel-menu.ts`：提供“小说 / 新建 / 打开”等小说项目入口。
- `menu/system-menu.ts`：提供“系统 / 系统配置”入口，并向 renderer 发送打开弹框事件。
- `menu/window-menu.ts`：提供最小化、重载、开发者工具和退出等窗口操作。
- `system-config-editor-service.ts`：负责读取、默认配置恢复、保存校验和配置文件写入。
- `app-settings-service.ts`：继续负责其他模块使用的系统配置读写能力。
- `project-service.ts`：保存成功后复用 `restoreLastOpenedProject` 刷新当前项目状态。
- `systemConfigApi.ts`：renderer 侧系统配置 IPC 封装，Vue 组件不直接接触 Electron。
- `SystemConfigEditorModal.vue`：承载全局系统配置弹框状态和保存交互，因为该弹框由顶部菜单触发，不属于某个业务页面。
- `App.vue`：只装配全局弹框组件，不包含系统配置读写状态。

## IPC 与 renderer 状态

建议新增 IPC：

```text
system-config:load
system-config:save
system-config:open-editor
```

说明：

- `system-config:load`：renderer 打开弹框时读取当前配置和配置文件绝对路径。
- `system-config:save`：renderer 保存 JSON 后写回配置文件，并返回格式化后的配置文本和配置文件绝对路径。
- `system-config:open-editor`：main process 菜单点击后通知 renderer 打开弹框。

保存成功后，main process 应执行一次当前项目状态刷新：

```text
保存 app-settings.json
-> 尝试恢复 lastOpenedProjectPath
-> 通知 renderer projects:current-changed
```

如果恢复失败，renderer 应进入未打开项目状态或保留既有失败提示，不应继续使用保存前的当前项目状态误导用户。

## 错误提示

错误提示应直接说明用户能采取的动作：

- JSON 无法解析：`系统配置不是有效的 JSON，请检查格式。`
- JSON 不是普通对象：`系统配置根节点必须是 JSON 对象。`
- 保存写入失败：`系统配置保存失败，请检查系统配置目录权限。`
- 读取失败：`系统配置读取失败，将使用默认配置。`

## 非目标

第一版不实现：

- 导入外部配置文件。
- 导出配置文件。
- 压缩包格式导入导出。
- 云同步。
- 多版本配置快照管理。
- 字段级可视化表单。
- 小说项目数据备份。
- 自动修复损坏的 `app-settings.json`。
- 整目录 `data/` 导入导出。

## 验证建议

实现完成后至少验证：

1. 点击 `系统 > 系统配置` 可以打开弹框。
2. 弹框能展示当前 userData 下的 `system/app-settings.json` 内容和配置文件路径。
3. 当前配置文件缺失时，弹框展示默认配置。
4. 输入非法 JSON 时保存失败并提示格式错误。
5. 输入数组、字符串等非对象 JSON 时保存失败。
6. 输入合法对象后可以保存到 userData 下的 `system/app-settings.json`。
7. 保存后 `lastOpenedProjectPath` 变化时，顶部项目栏能跟随刷新。
8. 点击取消不会改动系统配置文件。
