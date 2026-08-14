import { deleteItem, listItems, saveItem, saveItemOrder } from '@/api/itemApi';
import type {
  ItemRepository,
  ItemRepositoryListResult,
} from '@/repositories/contracts/itemRepository';
import type { ItemFile } from '@/types';

/**
 * 本地物品 Repository。
 * 当前仍复用 renderer 侧物品 API，经 preload IPC 进入 Electron main process 写入本地 JSON。
 */
export class LocalItemRepository implements ItemRepository {
  /** 本地小说项目目录；为空时由 Electron main process 使用当前打开项目。 */
  private readonly baseDirPath?: string;

  /**
   * 创建本地物品 Repository。
   * @param baseDirPath 可选小说项目目录，通常由当前项目状态或 main process 解析。
   */
  constructor(baseDirPath?: string) {
    this.baseDirPath = baseDirPath;
  }

  /** 读取本地物品 JSON 列表。 */
  list(): Promise<ItemRepositoryListResult> {
    return listItems(this.baseDirPath);
  }

  /** 保存物品 JSON 文件。 */
  save(item: ItemFile): Promise<ItemFile> {
    return saveItem(item, this.baseDirPath);
  }

  /** 删除物品 JSON 文件。 */
  delete(itemId: string): Promise<void> {
    return deleteItem(itemId, this.baseDirPath);
  }

  /** 保存物品列表排序元数据。 */
  saveOrder(itemIds: string[]): Promise<void> {
    return saveItemOrder(itemIds, this.baseDirPath);
  }
}
