import type { CharacterFile } from '@/types';

/**
 * 人物 Repository 契约。
 * 用于隔离页面和具体存储位置，后续可由本地 JSON 或云端 HTTP 实现同一组人物操作。
 */

/** 人物列表读取结果，保持和现有人物数据 API 的页面语义一致。 */
export interface CharacterRepositoryListResult {
  /** 当前数据来源标识；本地模式下是项目目录，云端模式下后续可映射为项目标识。 */
  baseDir: string;
  /** 成功读取的人物列表。 */
  characters: CharacterFile[];
  /** 单个文件或远程记录读取失败时的非致命错误。 */
  errors: string[];
}

/** 人物数据访问接口，页面只依赖该接口，不关心底层是 IPC 还是 HTTP。 */
export interface CharacterRepository {
  /** 读取人物列表。 */
  list(): Promise<CharacterRepositoryListResult>;

  /** 保存人物。 */
  save(character: CharacterFile): Promise<CharacterFile>;

  /** 删除人物。 */
  delete(characterId: string): Promise<void>;

  /** 保存人物展示顺序。 */
  saveOrder(characterIds: string[]): Promise<void>;
}
