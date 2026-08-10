# 地图页面设计

## 目的

本页面用于提供地图模块第一阶段的真实功能。页面保留原型阶段认可的视觉风格，并已经接入 Electron IPC 与本地 JSON 文件读写。

当前目标是让作者可以：

- 左侧地图层级树。
- 中间地图画布和地点圆点。
- 点击地点后右侧 Inspector 展示介绍和自定义信息。
- 带子地图的地点可以进入下一层地图。
- 地点圆点可以拖拽，并保存到地图 JSON。
- 空白画布可以按住拖动，并保存 viewport。
- 鼠标滚轮可以围绕指针位置缩放地图，并保存 viewport。
- 新增、编辑、删除地点。
- 创建子地图并进入子地图。

## 技术选型

当前页面使用 `vue-konva + konva`。

选择原因：

- 适合 Vue3 页面中绘制可拖拽地图标记。
- 后续可以继续扩展缩放、平移、背景图、区域和路线。
- Konva 只负责画布表现，不承载地点业务数据。

## 页面结构

```text
地点页面
├─ 左侧面板
│  ├─ 地图层级
│  ├─ 新增地点、导入底图按钮
│  └─ 当前地图地点列表
├─ 中间画布
│  ├─ 面包屑
│  ├─ 当前地图说明
│  ├─ Konva 地图画布
│  └─ 选中地点浮动工具条
└─ 右侧 Inspector
   ├─ 地点名称
   ├─ 地点类型
   ├─ 地点介绍
   ├─ 自定义字段
   └─ 子地图入口
```

## 数据规则

页面不再使用组件内假数据。当前数据从项目默认 `data/` 目录读取：

```text
data/
  locations/
    location_xxx.json
  maps/
    map_xxx.json
```

第一次打开地图模块时，如果没有任何地点或地图文件，主进程会自动创建：

- `location_world.json`
- `map_world.json`

Vue 页面不得直接访问文件系统，调用链为：

```text
Locations.vue
  -> src/views/map/useMapWorkbench.ts
  -> src/views/map/MapSidebar.vue
  -> src/views/map/MapCanvas.vue
  -> src/views/map/MapInspector.vue
  -> src/api/mapApi.ts
  -> electron/preload/index.ts
  -> electron/main/maps/map-service.ts
  -> electron/main/file-system/json-file-store.ts
```

## 交互规则

- 点击地图圆点：选中地点，右侧 Inspector 展示详情。
- 双击带子地图的圆点：进入子地图。
- 点击左侧地图树：切换当前地图。
- 点击“新增地点”：进入放置模式，再点击画布创建地点和 pin。
- 按住空白画布拖动：平移地图视图，并在停止操作 5 秒后保存 `viewport`。
- 鼠标滚轮：缩放当前地图视图，并在停止操作 5 秒后保存 `viewport.scale`。
- 拖拽圆点：更新当前地图文件中对应 pin 的坐标。
- 点击“编辑地点”：在右侧 Inspector 编辑名称、类型、介绍和自定义字段。
- 点击“保存”：写入对应地点 JSON 文件。
- 点击“创建子地图”：创建新的地图 JSON 文件，并进入该子地图。
- 点击“删除”：删除地点文件，并从地图文件中移除引用它的 pin。
- 地图画布使用大范围近透明 hit rect 承接空白区域点击和拖拽，不显示默认网格线和装饰线。

## 当前不做

- 不做真实 GIS 地图。
- 不做复杂区域、多边形和路线编辑。
- 不做 AI 自动生成地图。
- 不做背景图文件导入。
- 不做地图删除入口。
- 不做项目目录选择器，当前沿用默认 `data/` 目录。
- 不展示未实现的适配视图、缩小、放大按钮。

## 代码组织

`Locations.vue` 只作为页面组合入口。地图模块页面代码拆分为：

- `src/views/map/useMapWorkbench.ts`：地图数据加载、保存、选择、拖拽、表单状态。
- `src/views/map/MapSidebar.vue`：左侧地图树和地点列表。
- `src/views/map/MapCanvas.vue`：中间 Konva 画布和浮动工具条。
- `src/views/map/MapInspector.vue`：右侧地点详情和编辑表单。
