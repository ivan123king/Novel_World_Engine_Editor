import type { ItemFile } from '@/types';

/**
 * 物品 Repository 契约。
 * 用于隔离物品页面和具体存储位置，后续可由本地 JSON 或云端 HTTP 实现同一组物品操作。
 */

/** 物品列表读取结果，保持和现有物品数据 API 的页面语义一致。 */
export interface ItemRepositoryListResult {
  /** 当前数据来源标识；本地模式下是项目目录，云端模式下后续可映射为项目标识。 */
  baseDir: string;
  /** 成功读取的物品列表。 */
  items: ItemFile[];
  /** 单个文件或远程记录读取失败时的非致命错误。 */
  errors: string[];
}

/** 物品数据访问接口，页面只依赖该接口，不关心底层是 IPC 还是 HTTP。 */
export interface ItemRepository {
  /** 读取物品列表。 */
  list(): Promise<ItemRepositoryListResult>;

  /** 保存物品。 */
  save(item: ItemFile): Promise<ItemFile>;

  /** 删除物品。 */
  delete(itemId: string): Promise<void>;

  /** 保存物品展示顺序。 */
  saveOrder(itemIds: string[]): Promise<void>;
}
