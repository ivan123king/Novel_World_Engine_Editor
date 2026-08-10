import { readdir, rm } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  ensureBaseDirectory,
  ensureDirectory,
  resolvePathInBaseDirectory,
} from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import { applyListOrder, loadListOrder, saveListOrder } from '../list-order/list-order-service';
import { isItemFile, type ItemFile } from '../../../src/types/item';

/**
 * 物品 JSON 文件服务。
 * 负责在 Electron 主进程中管理 `items/*.json`，避免 renderer 直接访问文件系统。
 */

/** 物品文件目录名称。 */
const ITEM_DIRECTORY_NAME = 'items';

/** 物品 ID 同时作为文件名使用，只允许稳定且安全的字符。 */
const ITEM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 物品列表读取结果，包含可展示数据和非致命文件错误。 */
export interface ItemListResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取并通过校验的物品列表。 */
  items: ItemFile[];
  /** 单个物品文件读取失败时的错误信息，不阻断其他文件加载。 */
  errors: string[];
}

/**
 * 校验物品 ID 是否可以安全用于文件名。
 * @param itemId 物品稳定 ID
 */
function assertSafeItemId(itemId: string): void {
  if (!ITEM_ID_PATTERN.test(itemId)) {
    throw new Error(`物品 ID 只能包含字母、数字、下划线和短横线：${itemId}`);
  }
}

/**
 * 获取物品目录的绝对路径，并确保目录存在。
 * @param baseDirPath 可选的数据基础目录
 * @returns 物品目录绝对路径和基础目录绝对路径
 */
async function resolveItemDirectory(baseDirPath?: string): Promise<{
  baseDir: string;
  itemDirectory: string;
}> {
  const baseDir = await ensureBaseDirectory(baseDirPath);
  const itemDirectory = resolvePathInBaseDirectory(baseDir, ITEM_DIRECTORY_NAME);

  await ensureDirectory(itemDirectory);

  return {
    baseDir,
    itemDirectory,
  };
}

/**
 * 根据物品 ID 解析物品文件路径。
 * @param itemId 物品稳定 ID
 * @param baseDirPath 可选的数据基础目录
 * @returns 物品 JSON 文件绝对路径
 */
function resolveItemFilePath(itemId: string, baseDirPath?: string): string {
  assertSafeItemId(itemId);
  return resolvePathInBaseDirectory(baseDirPath, ITEM_DIRECTORY_NAME, `${itemId}.json`);
}

/**
 * 读取全部物品 JSON 文件。
 * 单个文件损坏时记录错误并继续读取其他物品，避免一个坏文件拖垮整个页面。
 * @param baseDirPath 可选的数据基础目录
 */
export async function listItems(baseDirPath?: string): Promise<ItemListResult> {
  const { baseDir, itemDirectory } = await resolveItemDirectory(baseDirPath);
  const entries = await readdir(itemDirectory, { withFileTypes: true });
  const items: ItemFile[] = [];
  const errors: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.json') {
      continue;
    }

    const filePath = resolvePathInBaseDirectory(baseDir, ITEM_DIRECTORY_NAME, entry.name);

    try {
      items.push(await loadJsonFileAs(filePath, isItemFile));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const orderResult = await loadListOrder('items', baseDir);

  if (orderResult.error) {
    errors.push(orderResult.error);
  }

  return {
    baseDir,
    items: applyListOrder(items, orderResult.ids),
    errors,
  };
}

/**
 * 保存单个物品 JSON 文件。
 * @param item 待保存的物品数据
 * @param baseDirPath 可选的数据基础目录
 */
export async function saveItem(item: ItemFile, baseDirPath?: string): Promise<ItemFile> {
  if (!isItemFile(item)) {
    throw new Error('物品数据结构校验失败，未写入 JSON 文件');
  }

  await resolveItemDirectory(baseDirPath);
  const filePath = resolveItemFilePath(item.id, baseDirPath);
  await saveJsonFile(filePath, item);

  return item;
}

/**
 * 删除单个物品 JSON 文件。
 * @param itemId 待删除物品 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function deleteItemFile(itemId: string, baseDirPath?: string): Promise<void> {
  await resolveItemDirectory(baseDirPath);
  const filePath = resolveItemFilePath(itemId, baseDirPath);

  await rm(filePath, { force: true });
}

/**
 * 保存物品列表的用户自定义顺序。
 * @param itemIds 当前物品 ID 展示顺序
 * @param baseDirPath 可选的数据基础目录
 */
export async function saveItemOrder(itemIds: string[], baseDirPath?: string): Promise<void> {
  await saveListOrder('items', itemIds, baseDirPath);
}
