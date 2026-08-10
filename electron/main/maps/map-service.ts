import { readdir, rm } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  ensureBaseDirectory,
  ensureDirectory,
  resolvePathInBaseDirectory,
} from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import {
  LOCATION_SCHEMA_VERSION,
  MAP_SCHEMA_VERSION,
  isLocationFile,
  isMapFile,
  type LocationFile,
  type MapFile,
} from '../../../src/types';

/**
 * 地图模块 JSON 文件服务。
 * 负责管理 `locations/*.json` 与 `maps/*.json`，renderer 不直接访问文件系统。
 */

/** 地点文件目录名称。 */
const LOCATION_DIRECTORY_NAME = 'locations';

/** 地图文件目录名称。 */
const MAP_DIRECTORY_NAME = 'maps';

/** 地点和地图 ID 同时作为文件名使用，只允许稳定且安全的字符。 */
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 地图模块读取结果，包含地点、地图和非致命文件错误。 */
export interface MapModuleResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取并通过校验的地点列表。 */
  locations: LocationFile[];
  /** 成功读取并通过校验的地图列表。 */
  maps: MapFile[];
  /** 单个 JSON 文件读取失败时的错误信息，不阻断其他文件加载。 */
  errors: string[];
}

/**
 * 校验 ID 是否可以安全用于文件名。
 * @param id 地点或地图稳定 ID
 * @param label 错误提示中的实体名称
 */
function assertSafeId(id: string, label: string): void {
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error(`${label} ID 只能包含字母、数字、下划线和短横线：${id}`);
  }
}

/**
 * 获取地图模块目录，并确保目录存在。
 * @param baseDirPath 可选的数据基础目录
 */
async function resolveMapModuleDirectories(baseDirPath?: string): Promise<{
  baseDir: string;
  locationDirectory: string;
  mapDirectory: string;
}> {
  const baseDir = await ensureBaseDirectory(baseDirPath);
  const locationDirectory = resolvePathInBaseDirectory(baseDir, LOCATION_DIRECTORY_NAME);
  const mapDirectory = resolvePathInBaseDirectory(baseDir, MAP_DIRECTORY_NAME);

  await ensureDirectory(locationDirectory);
  await ensureDirectory(mapDirectory);

  return {
    baseDir,
    locationDirectory,
    mapDirectory,
  };
}

/**
 * 根据地点 ID 解析地点文件路径。
 * @param locationId 地点稳定 ID
 * @param baseDirPath 可选的数据基础目录
 */
function resolveLocationFilePath(locationId: string, baseDirPath?: string): string {
  assertSafeId(locationId, '地点');
  return resolvePathInBaseDirectory(baseDirPath, LOCATION_DIRECTORY_NAME, `${locationId}.json`);
}

/**
 * 根据地图 ID 解析地图文件路径。
 * @param mapId 地图稳定 ID
 * @param baseDirPath 可选的数据基础目录
 */
function resolveMapFilePath(mapId: string, baseDirPath?: string): string {
  assertSafeId(mapId, '地图');
  return resolvePathInBaseDirectory(baseDirPath, MAP_DIRECTORY_NAME, `${mapId}.json`);
}

/** 创建第一次打开地图模块时使用的根地点。 */
function createDefaultRootLocation(): LocationFile {
  return {
    id: 'location_world',
    name: '世界地图',
    type: '世界',
    parentLocationId: null,
    description: '小说世界的顶层地图。可以从这里新增地区、城市或其他重要地点。',
    customFields: {
      用途: '用于承载小说世界中的顶层地点标记。',
    },
    schemaVersion: LOCATION_SCHEMA_VERSION,
  };
}

/** 创建第一次打开地图模块时使用的根地图。 */
function createDefaultRootMap(): MapFile {
  return {
    id: 'map_world',
    name: '世界地图',
    rootLocationId: 'location_world',
    parentMapId: null,
    parentLocationId: null,
    background: null,
    viewport: {
      x: 0,
      y: 0,
      scale: 1,
    },
    pins: [],
    schemaVersion: MAP_SCHEMA_VERSION,
  };
}

/**
 * 读取某个目录下的全部 JSON 文件。
 * 单个文件损坏时记录错误并继续读取其他文件。
 */
async function readDirectoryFiles<T>(
  baseDir: string,
  directoryName: string,
  validator: (value: unknown) => value is T,
): Promise<{
  files: T[];
  errors: string[];
}> {
  const entries = await readdir(resolvePathInBaseDirectory(baseDir, directoryName), {
    withFileTypes: true,
  });
  const files: T[] = [];
  const errors: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.json') {
      continue;
    }

    const filePath = resolvePathInBaseDirectory(baseDir, directoryName, entry.name);

    try {
      files.push(await loadJsonFileAs(filePath, validator));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    files,
    errors,
  };
}

/**
 * 确保地图模块至少有一张根地图和一个根地点。
 * @param baseDirPath 可选的数据基础目录
 */
async function ensureInitialMapData(baseDirPath?: string): Promise<void> {
  const { baseDir, locationDirectory, mapDirectory } = await resolveMapModuleDirectories(baseDirPath);
  const locationEntries = await readdir(locationDirectory, { withFileTypes: true });
  const mapEntries = await readdir(mapDirectory, { withFileTypes: true });
  const hasLocationFile = locationEntries.some(
    (entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.json',
  );
  const hasMapFile = mapEntries.some(
    (entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.json',
  );

  if (!hasLocationFile) {
    const defaultLocation = createDefaultRootLocation();
    await saveJsonFile(
      resolvePathInBaseDirectory(baseDir, LOCATION_DIRECTORY_NAME, `${defaultLocation.id}.json`),
      defaultLocation,
    );
  }

  if (!hasMapFile) {
    const defaultMap = createDefaultRootMap();
    await saveJsonFile(
      resolvePathInBaseDirectory(baseDir, MAP_DIRECTORY_NAME, `${defaultMap.id}.json`),
      defaultMap,
    );
  }
}

/**
 * 读取地图模块全部地点和地图。
 * @param baseDirPath 可选的数据基础目录
 */
export async function listMapModule(baseDirPath?: string): Promise<MapModuleResult> {
  await ensureInitialMapData(baseDirPath);

  const { baseDir } = await resolveMapModuleDirectories(baseDirPath);
  const locationResult = await readDirectoryFiles(baseDir, LOCATION_DIRECTORY_NAME, isLocationFile);
  const mapResult = await readDirectoryFiles(baseDir, MAP_DIRECTORY_NAME, isMapFile);

  const locations = locationResult.files.sort((left, right) =>
    left.name.localeCompare(right.name, 'zh-Hans-CN'),
  );
  const maps = mapResult.files.sort((left, right) =>
    left.name.localeCompare(right.name, 'zh-Hans-CN'),
  );

  return {
    baseDir,
    locations,
    maps,
    errors: [...locationResult.errors, ...mapResult.errors],
  };
}

/**
 * 保存单个地点 JSON 文件。
 * @param location 待保存的地点数据
 * @param baseDirPath 可选的数据基础目录
 */
export async function saveLocation(
  location: LocationFile,
  baseDirPath?: string,
): Promise<LocationFile> {
  if (!isLocationFile(location)) {
    throw new Error('地点数据结构校验失败，未写入 JSON 文件');
  }

  await resolveMapModuleDirectories(baseDirPath);
  await saveJsonFile(resolveLocationFilePath(location.id, baseDirPath), location);

  return location;
}

/**
 * 保存单个地图 JSON 文件。
 * @param map 待保存的地图数据
 * @param baseDirPath 可选的数据基础目录
 */
export async function saveMap(map: MapFile, baseDirPath?: string): Promise<MapFile> {
  if (!isMapFile(map)) {
    throw new Error('地图数据结构校验失败，未写入 JSON 文件');
  }

  await resolveMapModuleDirectories(baseDirPath);
  await saveJsonFile(resolveMapFilePath(map.id, baseDirPath), map);

  return map;
}

/**
 * 删除单个地点 JSON 文件。
 * @param locationId 待删除地点 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function deleteLocationFile(
  locationId: string,
  baseDirPath?: string,
): Promise<void> {
  await resolveMapModuleDirectories(baseDirPath);
  await rm(resolveLocationFilePath(locationId, baseDirPath), { force: true });
}

/**
 * 删除单个地图 JSON 文件。
 * @param mapId 待删除地图 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function deleteMapFile(mapId: string, baseDirPath?: string): Promise<void> {
  await resolveMapModuleDirectories(baseDirPath);
  await rm(resolveMapFilePath(mapId, baseDirPath), { force: true });
}
