import {
  deleteCharacter,
  listCharacters,
  saveCharacter,
  saveCharacterOrder,
} from '@/api/characterApi';
import type {
  CharacterRepository,
  CharacterRepositoryListResult,
} from '@/repositories/contracts/characterRepository';
import type { CharacterFile } from '@/types';

/**
 * 本地人物 Repository。
 * 当前仍复用 renderer 侧人物 API，经 preload IPC 进入 Electron main process 写入本地 JSON。
 */
export class LocalCharacterRepository implements CharacterRepository {
  /** 本地小说项目目录；为空时由 Electron main process 使用当前打开项目。 */
  private readonly baseDirPath?: string;

  /**
   * 创建本地人物 Repository。
   * @param baseDirPath 可选小说项目目录，通常由当前项目状态或 main process 解析。
   */
  constructor(baseDirPath?: string) {
    this.baseDirPath = baseDirPath;
  }

  /** 读取本地人物 JSON 列表。 */
  list(): Promise<CharacterRepositoryListResult> {
    return listCharacters(this.baseDirPath);
  }

  /** 保存人物 JSON 文件。 */
  save(character: CharacterFile): Promise<CharacterFile> {
    return saveCharacter(character, this.baseDirPath);
  }

  /** 删除人物 JSON 文件。 */
  delete(characterId: string): Promise<void> {
    return deleteCharacter(characterId, this.baseDirPath);
  }

  /** 保存人物列表排序元数据。 */
  saveOrder(characterIds: string[]): Promise<void> {
    return saveCharacterOrder(characterIds, this.baseDirPath);
  }
}
