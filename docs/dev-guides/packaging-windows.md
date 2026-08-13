# Windows 打包发布指南

## 目标

本文档说明如何把当前 Electron + Vue3 + TypeScript 桌面应用打包成 Windows 用户可运行的发布包。

当前推荐两种发布形态：

- `zip`：绿色版压缩包，适合内测或小范围试用。
- `nsis`：Windows `.exe` 安装包，适合普通用户正式分发。

这两种形态都不会改变小说项目数据的保存方式。用户的小说项目仍然保存在用户自己选择的本地目录中；应用自身设置保存在 Electron userData 目录下。

## 发布前确认

发布前先确认本机能正常完成基础构建：

```bash
npm install
npm run typecheck
npm run build
```

当前 `npm run build` 只负责把 Electron main、preload 和 Vue renderer 编译到 `out/` 目录。它不会生成用户可直接分发的安装包或 zip 包。

## 安装打包工具

本项目建议使用 `electron-builder` 做 Windows 发布包。

```bash
npm install -D electron-builder
```

安装完成后，`package-lock.json` 会记录依赖版本。后续团队成员只需要执行 `npm install` 即可恢复相同依赖。

## package.json 配置

如果要长期保留打包命令，建议在 `package.json` 中增加脚本和 `build` 配置。

示例：

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "typecheck": "vue-tsc --noEmit",
    "dist:zip": "npm run typecheck && npm run build && electron-builder --win zip",
    "dist:exe": "npm run typecheck && npm run build && electron-builder --win nsis"
  },
  "build": {
    "appId": "com.jiayi.novel-world-engine-editor",
    "productName": "佳依创式",
    "directories": {
      "buildResources": "build",
      "output": "dist"
    },
    "extraResources": [
      {
        "from": "build/icon.png",
        "to": "icon.png"
      }
    ],
    "files": [
      "out/**/*",
      "package.json"
    ],
    "win": {
      "icon": "build/icon.ico",
      "target": [
        {
          "target": "zip",
          "arch": ["x64"]
        },
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ]
    },
    "nsis": {
      "installerIcon": "build/icon.ico",
      "uninstallerIcon": "build/icon.ico",
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

说明：

- `appId`：应用唯一标识，后续正式发布后不要随意修改。
- `productName`：用户看到的软件名称，也会影响 Windows userData 目录名。
- `directories.output`：发布产物输出目录。
- `directories.buildResources`：打包资源目录，当前用于保存 Windows 图标。
- `extraResources`：把运行时窗口图标复制到打包后的 `resources/` 目录。
- `files`：只打包编译后的 `out/` 和必要的 `package.json`，不要把源码目录直接塞进发布包。
- `zip`：生成绿色版压缩包。
- `nsis`：生成 Windows 安装包 `.exe`。

## 应用图标

Windows 发布建议同时准备两个图标文件：

```text
build/
  icon.ico
  icon.png
```

用途：

- `build/icon.ico`：用于打包后的 exe 文件图标、nsis 安装包图标和卸载程序图标。
- `build/icon.png`：用于 Electron `BrowserWindow` 运行时窗口图标，并通过 `extraResources` 复制到打包后的 `resources/icon.png`。

如果只有 PNG，可以先把 PNG 转成 ICO。Windows exe 图标优先使用 `.ico`，不要只依赖 `.png`。

主进程窗口需要显式配置图标：

```ts
const appIconPath = app.isPackaged
  ? join(process.resourcesPath, 'icon.png')
  : join(process.cwd(), 'build/icon.png');

mainWindow = new BrowserWindow({
  icon: appIconPath,
});
```

重新打包后如果资源管理器仍显示旧图标，通常是 Windows 图标缓存。可删除旧 `dist/`，解压到新目录，或重启资源管理器后再看。

## 打包 zip 绿色版

执行：

```bash
npm run dist:zip
```

产物位置：

```text
dist/
  佳依创式-0.1.0-win.zip
```

实际文件名可能会随 `productName`、`version`、架构和 electron-builder 版本略有差异，以 `dist/` 目录中的实际结果为准。

zip 版用户使用方式：

1. 下载 zip。
2. 解压到任意目录。
3. 双击解压目录中的 `佳依创式.exe`。

不要让用户直接在压缩包预览窗口里运行 exe。直接在压缩包里运行可能导致资源路径或写入行为异常。

## 打包 exe 安装包

执行：

```bash
npm run dist:exe
```

产物位置：

```text
dist/
  佳依创式 Setup 0.1.0.exe
```

实际文件名可能会随 `productName`、`version` 和 electron-builder 版本略有差异，以 `dist/` 目录中的实际结果为准。

安装包用户使用方式：

1. 下载安装包 exe。
2. 双击安装。
3. 按安装向导选择安装目录。
4. 从桌面快捷方式、开始菜单或安装目录启动应用。

## 临时不改 package.json 的打包方式

如果只是本机临时试一次，也可以先不写入 `package.json` 脚本，直接执行：

```bash
npm run typecheck
npm run build
npx electron-builder --win zip
npx electron-builder --win nsis
```

长期建议固化为 `dist:zip` 和 `dist:exe` 脚本，减少每次手输命令导致的差异。

## 系统配置目录

无论是开发版、zip 绿色版，还是 nsis 安装包，应用自身设置都应读取 Electron userData 目录：

```text
Electron userData/
  system/
    app-settings.json
    novel-directory-records.json
```

在 Windows 上通常类似：

```text
C:\Users\用户名\AppData\Roaming\佳依创式\system\app-settings.json
```

系统配置目录只保存工具自身设置，例如上一次打开的小说项目目录、AI 服务地址、小说目录记录等。它不保存人物、物品、地点、剧情、时间线等小说领域数据。

小说项目数据仍保存在用户选择的小说项目目录：

```text
用户选择的小说目录/
  novel.json
  characters/
  items/
  maps/
  relation-graphs/
  timeline/
```

## 发布检查项

每次发布前至少检查：

1. `npm run typecheck` 通过。
2. `npm run build` 通过。
3. 打开的应用能进入主界面。
4. `小说 > 新建` 能创建包含 `novel.json` 的小说项目目录。
5. `小说 > 打开` 能打开已有小说项目目录。
6. `系统 > 系统配置` 能打开弹框，并显示 userData 下的配置文件路径。
7. 修改系统配置后保存，顶部当前项目状态能按配置刷新。
8. zip 版必须先解压后运行。
9. 安装包版能正常安装、启动和卸载。

## 分发注意

未做代码签名时，Windows SmartScreen 可能提示未知发布者或风险。zip 和 exe 安装包都可能遇到这个提示。

内测阶段可以先使用 zip 或未签名 nsis 安装包。正式公开分发时，建议补充代码签名、版本号管理和更新策略。
