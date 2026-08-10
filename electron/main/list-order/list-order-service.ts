import { stat } from 'node:fs/promises';
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
 * 在 Electron 主进程中管理 `list-orders/*.json`，用于保存人物、物品等资源列表的用户自定义展示顺序。
 */

/** 排序元数据目录名称。 */
const LIST_ORDER_DIRECTORY_NAME = 'list-orders';

/** 排序文件名映射，文件内容仍会校验 entityType。 */
const LIST_ORDER_FILE_NAMES: Record<ListOrderEntityType, string> = {
  characters: 'characters.json',
  items: 'items.json',
};

/** 排序 ID 仍然遵循实体文件名安全字符规则。 */
const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 排序读取结果；坏排序文件不阻断实体列表加载。 */
export interface ListOrderReadResult {
  /** 已读取的实体 ID 顺序。 */
  ids: string[];
  /** 排序文件损坏或类型不匹配时的可展示错误。 */
  error?: string;
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
  const baseDir = await ensureBaseDirectory(baseDirPath);
  const orderDirectory = resolvePathInBaseDirectory(baseDir, LIST_ORDER_DIRECTORY_NAME);

  await ensureDirectory(orderDirectory);

  return resolvePathInBaseDirectory(
    baseDir,
    LIST_ORDER_DIRECTORY_NAME,
    LIST_ORDER_FILE_NAMES[entityType],
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
