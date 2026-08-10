import type { CharacterFile } from '@/types';

/**
 * renderer 侧人物数据 API。
 * 统一封装 preload 暴露的安全 IPC 方法，Vue 页面只依赖这里，不直接访问文件系统。
 */

/** 人物列表读取结果。 */
export interface CharacterListResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取的人物列表。 */
  characters: CharacterFile[];
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
 * 将 Vue 响应式人物对象转成可通过 Electron IPC 传输的纯 JSON 对象。
 * Electron 的结构化克隆不能处理 Proxy，因此保存前必须清理响应式包装。
 */
function cloneCharacterForIpc(character: CharacterFile): CharacterFile {
  return JSON.parse(JSON.stringify(character)) as CharacterFile;
}

/** 读取人物列表。 */
export function listCharacters(baseDirPath?: string): Promise<CharacterListResult> {
  return getNovelEngineApi().listCharacters(baseDirPath);
}

/** 保存人物文件。 */
export function saveCharacter(
  character: CharacterFile,
  baseDirPath?: string,
): Promise<CharacterFile> {
  return getNovelEngineApi().saveCharacter(cloneCharacterForIpc(character), baseDirPath);
}

/** 删除人物文件。 */
export function deleteCharacter(
  characterId: string,
  baseDirPath?: string,
): Promise<void> {
  return getNovelEngineApi().deleteCharacter(characterId, baseDirPath);
}

/** 保存人物列表的用户自定义顺序。 */
export function saveCharacterOrder(
  characterIds: string[],
  baseDirPath?: string,
): Promise<void> {
  return getNovelEngineApi().saveCharacterOrder([...characterIds], baseDirPath);
}
