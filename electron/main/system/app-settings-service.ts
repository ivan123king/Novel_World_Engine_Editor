import { dirname, join } from 'node:path';
import { getDefaultBaseDirectory, ensureDirectory } from '../file-system/directory';
import { loadJsonFile, saveJsonFile } from '../file-system/json-file-store';

/**
 * 应用系统配置服务。
 * 负责读写 data/system/app-settings.json，只保存工具自身设置，不保存小说领域数据。
 */

/** 应用系统配置文件 schema 版本。 */
const APP_SETTINGS_SCHEMA_VERSION = 1;

/** 系统配置文件相对路径片段。 */
const APP_SETTINGS_FILE_PATH_SEGMENTS = ['system', 'app-settings.json'];

/** 应用系统配置文件结构。 */
export interface AppSettingsFile {
  /** 上一次成功新建或打开的小说项目目录。 */
  lastOpenedProjectPath: string;
  /** 系统配置更新时间，ISO 字符串。 */
  updatedAt: string;
  /** 系统配置结构版本。 */
  schemaVersion: number;
}

/** 获取系统配置文件绝对路径。 */
export function resolveAppSettingsFilePath(): string {
  return join(getDefaultBaseDirectory(), ...APP_SETTINGS_FILE_PATH_SEGMENTS);
}

/** 判断 unknown 是否为系统配置文件。 */
function isAppSettingsFile(value: unknown): value is AppSettingsFile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.lastOpenedProjectPath === 'string' &&
    typeof record.updatedAt === 'string' &&
    typeof record.schemaVersion === 'number'
  );
}

/**
 * 读取系统配置。
 * 文件缺失或结构异常时返回 null，避免启动阶段因为系统配置损坏直接崩溃。
 */
export async function loadAppSettings(): Promise<AppSettingsFile | null> {
  try {
    const value = await loadJsonFile(resolveAppSettingsFilePath());

    if (!isAppSettingsFile(value)) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

/**
 * 保存上一次打开的小说项目目录。
 * @param projectPath 已成功打开或创建的小说项目目录
 */
export async function saveLastOpenedProjectPath(projectPath: string): Promise<void> {
  const settingsFilePath = resolveAppSettingsFilePath();
  await ensureDirectory(dirname(settingsFilePath));
  await saveJsonFile<AppSettingsFile>(settingsFilePath, {
    lastOpenedProjectPath: projectPath,
    updatedAt: new Date().toISOString(),
    schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
  });
}
