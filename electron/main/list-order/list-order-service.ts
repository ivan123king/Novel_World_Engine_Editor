import { rm, stat } from 'node:fs/promises';
import {
  ensureBaseDirectory,
  ensureDirectory,
  resolvePathInBaseDirectory,
} from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import {
  createListOrderFile,
  isListOrderFile,
  type ListOrderEntityType,
} from '../../../src/types/list-order';

/**
 * 列表排序元数据服务。
 * 在 Electron 主进程中管理 `list-orders/*.json`，用于保存人物、物品、时间线时间块等资源列表的用户自定义展示顺序。
 */

/** 排序元数据目录名称。 */
const LIST_ORDER_DIRECTORY_NAME = 'list-orders';

/** 排序文件名映射，文件内容仍会校验 entityType。 */
const LIST_ORDER_FILE_NAMES: Record<ListOrderEntityType, string> = {
  characters: 'characters.json',
  items: 'items.json',
  'timeline-time-blocks': 'timeline-time-blocks.json',
};

/** 排序 ID 仍然遵循实体文件名安全字符规则。 */
const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 带作用域排序文件名只允许安全字符，避免文件名穿越项目目录。 */
const ORDER_FILE_NAME_PATTERN = /^[a-zA-Z0-9_-]+\.json$/;

/** 排序读取结果；坏排序文件不阻断实体列表加载。 */
export interface ListOrderReadResult {
  /** 已读取的实体 ID 顺序。 */
  ids: string[];
  /** 排序文件损坏或类型不匹配时的可展示错误。 */
  error?: string;
}

/**
 * 校验作用域排序文件名是否安全。
 * @param fileName 排序文件名，例如 timeline_main_time_blocks.json
 */
function assertSafeOrderFileName(fileName: string): void {
  if (!ORDER_FILE_NAME_PATTERN.test(fileName)) {
    throw new Error(`排序文件名只能包含字母、数字、下划线、短横线并以 .json 结尾：${fileName}`);
  }
}

/**
 * 判断文件是否存在。
 * @param filePath 待检查文件路径
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

/**
 * 获取排序文件路径，并确保排序目录存在。
 * @param entityType 实体类型
 * @param baseDirPath 可选的数据基础目录
 */
async function resolveListOrderFilePath(
  entityType: ListOrderEntityType,
  baseDirPath?: string,
): Promise<string> {
  return resolveNamedListOrderFilePath(LIST_ORDER_FILE_NAMES[entityType], baseDirPath);
}

/**
 * 获取指定排序文件路径，并确保排序目录存在。
 * @param fileName 排序文件名
 * @param baseDirPath 可选的数据基础目录
 */
async function resolveNamedListOrderFilePath(
  fileName: string,
  baseDirPath?: string,
): Promise<string> {
  assertSafeOrderFileName(fileName);

  const baseDir = await ensureBaseDirectory(baseDirPath);
  const orderDirectory = resolvePathInBaseDirectory(baseDir, LIST_ORDER_DIRECTORY_NAME);

  await ensureDirectory(orderDirectory);

  return resolvePathInBaseDirectory(
    baseDir,
    LIST_ORDER_DIRECTORY_NAME,
    fileName,
  );
}

/**
 * 清理排序 ID 列表。
 * 去掉空值、重复值和不安全 ID，避免用户手改排序文件后影响路径安全。
 */
function normalizeOrderIds(ids: string[]): string[] {
  const seenIds = new Set<string>();
  const safeIds: string[] = [];

  ids.forEach((id) => {
    const normalizedId = id.trim();

    if (!normalizedId || seenIds.has(normalizedId) || !ORDER_ID_PATTERN.test(normalizedId)) {
      return;
    }

    seenIds.add(normalizedId);
    safeIds.push(normalizedId);
  });

  return safeIds;
}

/**
 * 读取某类实体的列表顺序。
 * 排序文件不存在时返回空顺序，由调用方保留当前文件读取顺序。
 */
export async function loadListOrder(
  entityType: ListOrderEntityType,
  baseDirPath?: string,
): Promise<ListOrderReadResult> {
  const orderFilePath = await resolveListOrderFilePath(entityType, baseDirPath);

  if (!(await fileExists(orderFilePath))) {
    return {
      ids: [],
    };
  }

  try {
    const orderFile = await loadJsonFileAs(orderFilePath, isListOrderFile);

    if (orderFile.entityType !== entityType) {
      return {
        ids: [],
        error: `列表排序文件类型不匹配：${orderFilePath}`,
      };
    }

    return {
      ids: normalizeOrderIds(orderFile.ids),
    };
  } catch (error) {
    return {
      ids: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 读取指定文件名的排序元数据。
 * 用于时间线时间块这类同一实体类型按父对象拆分保存的排序文件。
 * @param entityType 实体类型
 * @param fileName 排序文件名
 * @param baseDirPath 可选的数据基础目录
 */
export async function loadNamedListOrder(
  entityType: ListOrderEntityType,
  fileName: string,
  baseDirPath?: string,
): Promise<ListOrderReadResult> {
  const orderFilePath = await resolveNamedListOrderFilePath(fileName, baseDirPath);

  if (!(await fileExists(orderFilePath))) {
    return {
      ids: [],
    };
  }

  try {
    const orderFile = await loadJsonFileAs(orderFilePath, isListOrderFile);

    if (orderFile.entityType !== entityType) {
      return {
        ids: [],
        error: `列表排序文件类型不匹配：${orderFilePath}`,
      };
    }

    return {
      ids: normalizeOrderIds(orderFile.ids),
    };
  } catch (error) {
    return {
      ids: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 保存某类实体的列表顺序。
 * @param entityType 实体类型
 * @param ids 当前列表 ID 顺序
 * @param baseDirPath 可选的数据基础目录
 */
export async function saveListOrder(
  entityType: ListOrderEntityType,
  ids: string[],
  baseDirPath?: string,
): Promise<void> {
  const orderFilePath = await resolveListOrderFilePath(entityType, baseDirPath);
  const orderFile = createListOrderFile(entityType, normalizeOrderIds(ids));

  await saveJsonFile(orderFilePath, orderFile);
}

/**
 * 保存指定文件名的排序元数据。
 * @param entityType 实体类型
 * @param fileName 排序文件名
 * @param ids 当前列表 ID 顺序
 * @param baseDirPath 可选的数据基础目录
 */
export async function saveNamedListOrder(
  entityType: ListOrderEntityType,
  fileName: string,
  ids: string[],
  baseDirPath?: string,
): Promise<ReturnType<typeof createListOrderFile>> {
  const orderFilePath = await resolveNamedListOrderFilePath(fileName, baseDirPath);
  const orderFile = createListOrderFile(entityType, normalizeOrderIds(ids));

  await saveJsonFile(orderFilePath, orderFile);

  return orderFile;
}

/**
 * 删除指定文件名的排序元数据。
 * @param fileName 排序文件名
 * @param baseDirPath 可选的数据基础目录
 */
export async function deleteNamedListOrder(
  fileName: string,
  baseDirPath?: string,
): Promise<void> {
  const orderFilePath = await resolveNamedListOrderFilePath(fileName, baseDirPath);

  await rm(orderFilePath, { force: true });
}

/**
 * 创建某条时间线的时间块排序文件名。
 * @param timelineId 时间线 ID
 */
function createTimelineTimeBlockOrderFileName(timelineId: string): string {
  if (!ORDER_ID_PATTERN.test(timelineId)) {
    throw new Error(`时间线 ID 只能包含字母、数字、下划线和短横线：${timelineId}`);
  }

  return `${timelineId}_time_blocks.json`;
}

/**
 * 读取某条时间线的时间块排序。
 * @param timelineId 时间线 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function loadTimelineTimeBlockOrder(
  timelineId: string,
  baseDirPath?: string,
): Promise<ListOrderReadResult> {
  return loadNamedListOrder(
    'timeline-time-blocks',
    createTimelineTimeBlockOrderFileName(timelineId),
    baseDirPath,
  );
}

/**
 * 保存某条时间线的时间块排序。
 * @param timelineId 时间线 ID
 * @param timeBlockIds 时间块 ID 顺序
 * @param baseDirPath 可选的数据基础目录
 */
export async function saveTimelineTimeBlockListOrder(
  timelineId: string,
  timeBlockIds: string[],
  baseDirPath?: string,
): Promise<ReturnType<typeof createListOrderFile>> {
  return saveNamedListOrder(
    'timeline-time-blocks',
    createTimelineTimeBlockOrderFileName(timelineId),
    timeBlockIds,
    baseDirPath,
  );
}

/**
 * 删除某条时间线的时间块排序文件。
 * @param timelineId 时间线 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function deleteTimelineTimeBlockListOrder(
  timelineId: string,
  baseDirPath?: string,
): Promise<void> {
  await deleteNamedListOrder(createTimelineTimeBlockOrderFileName(timelineId), baseDirPath);
}

/**
 * 按用户保存的 ID 顺序排列实体；排序文件缺少的新实体会保留当前读取顺序并追加在后面。
 * @param entities 已读取的实体列表
 * @param orderedIds 用户保存的实体 ID 顺序
 */
export function applyListOrder<T extends { id: string }>(
  entities: T[],
  orderedIds: string[],
): T[] {
  if (orderedIds.length === 0) {
    return entities;
  }

  const idToOrderIndex = new Map(orderedIds.map((id, index) => [id, index]));

  return [...entities].sort((left, right) => {
    const leftIndex = idToOrderIndex.get(left.id);
    const rightIndex = idToOrderIndex.get(right.id);

    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex;
    }

    if (leftIndex !== undefined) {
      return -1;
    }

    if (rightIndex !== undefined) {
      return 1;
    }

    return 0;
  });
}
