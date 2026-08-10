import { readdir, rm } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  ensureBaseDirectory,
  ensureDirectory,
  resolvePathInBaseDirectory,
} from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import { applyListOrder, loadListOrder, saveListOrder } from '../list-order/list-order-service';
import { isCharacterFile, type CharacterFile } from '../../../src/types/character';

/**
 * 人物 JSON 文件服务。
 * 负责在 Electron 主进程中管理 `characters/*.json`，避免 renderer 直接访问文件系统。
 */

/** 人物文件目录名称。 */
const CHARACTER_DIRECTORY_NAME = 'characters';

/** 人物 ID 同时作为文件名使用，只允许稳定且安全的字符。 */
const CHARACTER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 人物列表读取结果，包含可展示数据和非致命文件错误。 */
export interface CharacterListResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取并通过校验的人物列表。 */
  characters: CharacterFile[];
  /** 单个人物文件读取失败时的错误信息，不阻断其他文件加载。 */
  errors: string[];
}

/**
 * 校验人物 ID 是否可以安全用于文件名。
 * @param characterId 人物稳定 ID
 */
function assertSafeCharacterId(characterId: string): void {
  if (!CHARACTER_ID_PATTERN.test(characterId)) {
    throw new Error(`人物 ID 只能包含字母、数字、下划线和短横线：${characterId}`);
  }
}

/**
 * 获取人物目录的绝对路径，并确保目录存在。
 * @param baseDirPath 可选的数据基础目录
 * @returns 人物目录绝对路径和基础目录绝对路径
 */
async function resolveCharacterDirectory(baseDirPath?: string): Promise<{
  baseDir: string;
  characterDirectory: string;
}> {
  const baseDir = await ensureBaseDirectory(baseDirPath);
  const characterDirectory = resolvePathInBaseDirectory(baseDir, CHARACTER_DIRECTORY_NAME);

  await ensureDirectory(characterDirectory);

  return {
    baseDir,
    characterDirectory,
  };
}

/**
 * 根据人物 ID 解析人物文件路径。
 * @param characterId 人物稳定 ID
 * @param baseDirPath 可选的数据基础目录
 * @returns 人物 JSON 文件绝对路径
 */
function resolveCharacterFilePath(characterId: string, baseDirPath?: string): string {
  assertSafeCharacterId(characterId);
  return resolvePathInBaseDirectory(baseDirPath, CHARACTER_DIRECTORY_NAME, `${characterId}.json`);
}

/**
 * 读取全部人物 JSON 文件。
 * 单个文件损坏时记录错误并继续读取其他人物，避免一个坏文件拖垮整个页面。
 * @param baseDirPath 可选的数据基础目录
 */
export async function listCharacters(baseDirPath?: string): Promise<CharacterListResult> {
  const { baseDir, characterDirectory } = await resolveCharacterDirectory(baseDirPath);
  const entries = await readdir(characterDirectory, { withFileTypes: true });
  const characters: CharacterFile[] = [];
  const errors: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.json') {
      continue;
    }

    const filePath = resolvePathInBaseDirectory(baseDir, CHARACTER_DIRECTORY_NAME, entry.name);

    try {
      characters.push(await loadJsonFileAs(filePath, isCharacterFile));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const orderResult = await loadListOrder('characters', baseDir);

  if (orderResult.error) {
    errors.push(orderResult.error);
  }

  return {
    baseDir,
    characters: applyListOrder(characters, orderResult.ids),
    errors,
  };
}

/**
 * 保存单个人物 JSON 文件。
 * @param character 待保存的人物数据
 * @param baseDirPath 可选的数据基础目录
 */
export async function saveCharacter(
  character: CharacterFile,
  baseDirPath?: string,
): Promise<CharacterFile> {
  if (!isCharacterFile(character)) {
    throw new Error('人物数据结构校验失败，未写入 JSON 文件');
  }

  await resolveCharacterDirectory(baseDirPath);
  const filePath = resolveCharacterFilePath(character.id, baseDirPath);
  await saveJsonFile(filePath, character);

  return character;
}

/**
 * 删除单个人物 JSON 文件。
 * @param characterId 待删除人物 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function deleteCharacterFile(
  characterId: string,
  baseDirPath?: string,
): Promise<void> {
  await resolveCharacterDirectory(baseDirPath);
  const filePath = resolveCharacterFilePath(characterId, baseDirPath);

  await rm(filePath, { force: true });
}

/**
 * 保存人物列表的用户自定义顺序。
 * @param characterIds 当前人物 ID 展示顺序
 * @param baseDirPath 可选的数据基础目录
 */
export async function saveCharacterOrder(
  characterIds: string[],
  baseDirPath?: string,
): Promise<void> {
  await saveListOrder('characters', characterIds, baseDirPath);
}
