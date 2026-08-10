import type { LocationFile, MapFile } from '@/types';

/**
 * renderer 侧地图模块 API。
 * 统一封装 preload 暴露的安全 IPC 方法，Vue 页面只依赖这里，不直接访问文件系统。
 */

/** 地图模块读取结果。 */
export interface MapModuleResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取的地点列表。 */
  locations: LocationFile[];
  /** 成功读取的地图列表。 */
  maps: MapFile[];
  /** 单个 JSON 文件读取失败时的错误信息。 */
  errors: string[];
}

/** 确保当前运行环境已经注入 Electron preload API。 */
function getNovelEngineApi(): Window['novelEngine'] {
  if (!window.novelEngine) {
    throw new Error('当前环境没有可用的 Electron 数据接口');
  }

  return window.novelEngine;
}

/**
 * 深拷贝可通过 Electron IPC 传输的 JSON 数据。
 * Vue 响应式对象带有 Proxy，保存前必须清理响应式包装。
 */
function cloneForIpc<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 读取地图模块地点和地图。 */
export function listMapModule(baseDirPath?: string): Promise<MapModuleResult> {
  return getNovelEngineApi().listMapModule(baseDirPath);
}

/** 保存地点文件。 */
export function saveLocation(
  location: LocationFile,
  baseDirPath?: string,
): Promise<LocationFile> {
  return getNovelEngineApi().saveLocation(cloneForIpc(location), baseDirPath);
}

/** 删除地点文件。 */
export function deleteLocation(locationId: string, baseDirPath?: string): Promise<void> {
  return getNovelEngineApi().deleteLocation(locationId, baseDirPath);
}

/** 保存地图文件。 */
export function saveMap(map: MapFile, baseDirPath?: string): Promise<MapFile> {
  return getNovelEngineApi().saveMap(cloneForIpc(map), baseDirPath);
}

/** 删除地图文件。 */
export function deleteMap(mapId: string, baseDirPath?: string): Promise<void> {
  return getNovelEngineApi().deleteMap(mapId, baseDirPath);
}
