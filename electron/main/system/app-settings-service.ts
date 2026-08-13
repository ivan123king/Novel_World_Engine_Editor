import { dirname, join } from 'node:path';
import { getDefaultBaseDirectory, ensureDirectory } from '../file-system/directory';
import { loadJsonFile, saveJsonFile } from '../file-system/json-file-store';
import {
  createEmptyAiAssistantSettings,
  isAiAssistantSettings,
  type AiAssistantSettings,
} from '../../../src/types/ai-assistant';
import type { JsonValue } from '../../../src/types/json-value';

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
  /** AI小助手设置，包含远程AI小助手服务地址和远程项目 ID。 */
  aiAssistant: AiAssistantSettings;
  /** 系统配置更新时间，ISO 字符串。 */
  updatedAt: string;
  /** 系统配置结构版本。 */
  schemaVersion: number;
  /** 保留未来版本或其他模块写入的系统设置字段。 */
  [key: string]: JsonValue;
}

/** 获取系统配置文件绝对路径。 */
export function resolveAppSettingsFilePath(): string {
  return join(getDefaultBaseDirectory(), ...APP_SETTINGS_FILE_PATH_SEGMENTS);
}

/** 判断 unknown 是否为系统配置文件。 */
function isJsonRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return true;
}

/** 判断 unknown 是否为系统配置文件。 */
function isAppSettingsFile(value: unknown): value is AppSettingsFile {
  if (!isJsonRecord(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.lastOpenedProjectPath === 'string' &&
    (record.aiAssistant === undefined || isAiAssistantSettings(record.aiAssistant)) &&
    typeof record.updatedAt === 'string' &&
    typeof record.schemaVersion === 'number'
  );
}

/**
 * 创建默认系统配置。
 * @param rawSettings 原始系统配置对象
 */
function createAppSettingsFromRaw(rawSettings: Record<string, unknown> = {}): AppSettingsFile {
  const rawAiAssistant = rawSettings.aiAssistant;
  const aiAssistant = isAiAssistantSettings(rawAiAssistant)
    ? rawAiAssistant
    : createEmptyAiAssistantSettings();

  return {
    ...rawSettings,
    lastOpenedProjectPath:
      typeof rawSettings.lastOpenedProjectPath === 'string' ? rawSettings.lastOpenedProjectPath : '',
    aiAssistant,
    updatedAt: typeof rawSettings.updatedAt === 'string' ? rawSettings.updatedAt : '',
    schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
  } as AppSettingsFile;
}

/**
 * 读取原始系统配置对象。
 * 文件缺失或损坏时返回空对象，避免启动阶段因为系统配置损坏直接崩溃。
 */
async function loadRawAppSettings(): Promise<Record<string, unknown>> {
  try {
    const value = await loadJsonFile(resolveAppSettingsFilePath());
    return isJsonRecord(value) ? value : {};
  } catch {
    return {};
  }
}

/**
 * 读取系统配置。
 * 文件缺失或结构异常时返回 null，避免启动阶段因为系统配置损坏直接崩溃。
 */
export async function loadAppSettings(): Promise<AppSettingsFile | null> {
  const rawSettings = await loadRawAppSettings();
  return isAppSettingsFile(rawSettings) ? createAppSettingsFromRaw(rawSettings) : null;
}

/** 读取系统设置中的 AI小助手设置。 */
export async function loadAiAssistantSettings(): Promise<AiAssistantSettings> {
  const rawSettings = await loadRawAppSettings();
  return createAppSettingsFromRaw(rawSettings).aiAssistant;
}

/**
 * 保存完整系统配置。
 * @param settingsFile 待保存的系统配置
 */
async function saveAppSettings(settingsFile: AppSettingsFile): Promise<AppSettingsFile> {
  const settingsFilePath = resolveAppSettingsFilePath();
  await ensureDirectory(dirname(settingsFilePath));
  await saveJsonFile<AppSettingsFile>(settingsFilePath, settingsFile);
  return settingsFile;
}

/**
 * 保存上一次打开的小说项目目录。
 * @param projectPath 已成功打开或创建的小说项目目录
 */
export async function saveLastOpenedProjectPath(projectPath: string): Promise<void> {
  const rawSettings = await loadRawAppSettings();
  await saveAppSettings({
    ...createAppSettingsFromRaw(rawSettings),
    lastOpenedProjectPath: projectPath,
    updatedAt: new Date().toISOString(),
    schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
  });
}

/**
 * 保存远程AI小助手服务基础地址。
 * @param baseUrl 用户输入的远程AI小助手服务地址
 */
export async function saveRemoteAiAssistantServiceBaseUrl(baseUrl: string): Promise<AiAssistantSettings> {
  const rawSettings = await loadRawAppSettings();
  const settings = createAppSettingsFromRaw(rawSettings);
  const nextSettings = await saveAppSettings({
    ...settings,
    aiAssistant: {
      ...settings.aiAssistant,
      remoteServiceBaseUrl: baseUrl.trim(),
    },
    updatedAt: new Date().toISOString(),
    schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
  });

  return nextSettings.aiAssistant;
}

/**
 * 保存当前项目在远程AI小助手服务中的项目 ID。
 * @param remoteProjectId 远程AI小助手服务返回的项目 ID
 */
export async function saveRemoteAiAssistantProjectId(remoteProjectId: string): Promise<AiAssistantSettings> {
  const rawSettings = await loadRawAppSettings();
  const settings = createAppSettingsFromRaw(rawSettings);
  const nextSettings = await saveAppSettings({
    ...settings,
    aiAssistant: {
      ...settings.aiAssistant,
      remoteProjectId: remoteProjectId.trim(),
    },
    updatedAt: new Date().toISOString(),
    schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
  });

  return nextSettings.aiAssistant;
}
