import type { ItemFile } from '@/types';

/**
 * renderer 侧物品数据 API。
 * 统一封装 preload 暴露的安全 IPC 方法，Vue 页面只依赖这里，不直接访问文件系统。
 */

/** 物品列表读取结果。 */
export interface ItemListResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取的物品列表。 */
  items: ItemFile[];
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
 * 将 Vue 响应式物品对象转成可通过 Electron IPC 传输的纯 JSON 对象。
 * Electron 的结构化克隆不能处理 Proxy，因此保存前必须清理响应式包装。
 */
function cloneItemForIpc(item: ItemFile): ItemFile {
  return JSON.parse(JSON.stringify(item)) as ItemFile;
}

/** 读取物品列表。 */
export function listItems(baseDirPath?: string): Promise<ItemListResult> {
  return getNovelEngineApi().listItems(baseDirPath);
}

/** 保存物品文件。 */
export function saveItem(item: ItemFile, baseDirPath?: string): Promise<ItemFile> {
  return getNovelEngineApi().saveItem(cloneItemForIpc(item), baseDirPath);
}

/** 删除物品文件。 */
export function deleteItem(itemId: string, baseDirPath?: string): Promise<void> {
  return getNovelEngineApi().deleteItem(itemId, baseDirPath);
}
