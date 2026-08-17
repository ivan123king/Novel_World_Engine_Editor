import { readdir, rm } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  ensureBaseDirectory,
  ensureDirectory,
  resolvePathInBaseDirectory,
} from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import { isSettingFile, type SettingFile } from '../../../src/types/setting';

/**
 * 设定 JSON 文件服务。
 * 负责在 Electron 主进程中管理 `settings/*.json`，避免 renderer 直接访问文件系统。
 */

/** 设定文件目录名称。 */
const SETTING_DIRECTORY_NAME = 'settings';

/** 设定 ID 同时作为文件名使用，只允许稳定且安全的字符。 */
const SETTING_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 设定列表读取结果，包含可展示数据和非致命文件错误。 */
export interface SettingListResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取并通过校验的设定列表。 */
  settings: SettingFile[];
  /** 单个设定文件读取失败时的错误信息，不阻断其他文件加载。 */
  errors: string[];
}

/**
 * 校验设定 ID 是否可以安全用于文件名。
 * @param settingId 设定稳定 ID
 */
function assertSafeSettingId(settingId: string): void {
  if (!SETTING_ID_PATTERN.test(settingId)) {
    throw new Error(`设定 ID 只能包含字母、数字、下划线和短横线：${settingId}`);
  }
}

/**
 * 获取设定目录的绝对路径，并确保目录存在。
 * @param baseDirPath 可选的数据基础目录
 * @returns 设定目录绝对路径和基础目录绝对路径
 */
async function resolveSettingDirectory(baseDirPath?: string): Promise<{
  baseDir: string;
  settingDirectory: string;
}> {
  const baseDir = await ensureBaseDirectory(baseDirPath);
  const settingDirectory = resolvePathInBaseDirectory(baseDir, SETTING_DIRECTORY_NAME);

  await ensureDirectory(settingDirectory);

  return {
    baseDir,
    settingDirectory,
  };
}

/**
 * 根据设定 ID 解析设定文件路径。
 * @param settingId 设定稳定 ID
 * @param baseDirPath 可选的数据基础目录
 * @returns 设定 JSON 文件绝对路径
 */
function resolveSettingFilePath(settingId: string, baseDirPath?: string): string {
  assertSafeSettingId(settingId);
  return resolvePathInBaseDirectory(baseDirPath, SETTING_DIRECTORY_NAME, `${settingId}.json`);
}

/**
 * 读取全部设定 JSON 文件。
 * 单个文件损坏时记录错误并继续读取其他设定，避免一个坏文件拖垮整个页面。
 * @param baseDirPath 可选的数据基础目录
 */
export async function listSettings(baseDirPath?: string): Promise<SettingListResult> {
  const { baseDir, settingDirectory } = await resolveSettingDirectory(baseDirPath);
  const entries = await readdir(settingDirectory, { withFileTypes: true });
  const settings: SettingFile[] = [];
  const errors: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.json') {
      continue;
    }

    const filePath = resolvePathInBaseDirectory(baseDir, SETTING_DIRECTORY_NAME, entry.name);

    try {
      settings.push(await loadJsonFileAs(filePath, isSettingFile));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    baseDir,
    settings,
    errors,
  };
}

/**
 * 保存单个设定 JSON 文件。
 * @param setting 待保存的设定数据
 * @param baseDirPath 可选的数据基础目录
 */
export async function saveSetting(
  setting: SettingFile,
  baseDirPath?: string,
): Promise<SettingFile> {
  if (!isSettingFile(setting)) {
    throw new Error('设定数据结构校验失败，未写入 JSON 文件');
  }

  await resolveSettingDirectory(baseDirPath);
  const filePath = resolveSettingFilePath(setting.id, baseDirPath);
  await saveJsonFile(filePath, setting);

  return setting;
}

/**
 * 删除单个设定 JSON 文件。
 * @param settingId 待删除设定 ID
 * @param baseDirPath 可选的数据基础目录
 */
export async function deleteSettingFile(
  settingId: string,
  baseDirPath?: string,
): Promise<void> {
  await resolveSettingDirectory(baseDirPath);
  const filePath = resolveSettingFilePath(settingId, baseDirPath);

  await rm(filePath, { force: true });
}
