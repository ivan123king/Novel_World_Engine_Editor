import { LocalCharacterRepository } from '@/repositories/local/localCharacterRepository';
import { LocalItemRepository } from '@/repositories/local/localItemRepository';
import type { CharacterRepository } from '@/repositories/contracts/characterRepository';
import type { ItemRepository } from '@/repositories/contracts/itemRepository';

/**
 * Repository 工厂。
 * 现阶段默认返回本地 JSON 实现，后续会在这里根据项目存储模式切换本地或云端 Repository。
 */

/** 应用当前可用的 Repository 集合。 */
export interface RepositorySet {
  /** 人物数据访问 Repository。 */
  characterRepository: CharacterRepository;
  /** 物品数据访问 Repository。 */
  itemRepository: ItemRepository;
}

/** 默认本地 Repository 单例，保持现有模块读写行为不变。 */
const localRepositories: RepositorySet = {
  characterRepository: new LocalCharacterRepository(),
  itemRepository: new LocalItemRepository(),
};

/** 获取当前 Repository 集合。 */
export function useRepositories(): RepositorySet {
  return localRepositories;
}
