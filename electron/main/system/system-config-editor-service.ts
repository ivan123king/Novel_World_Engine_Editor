import type { SystemConfigEditorFile } from '../../../src/types';
import {
  loadAppSettings,
  resolveAppSettingsFilePath,
  saveCompleteAppSettings,
  type AppSettingsFile,
} from './app-settings-service';

/**
 * 系统配置编辑服务。
 * 负责为 renderer 系统配置弹框提供配置读取、默认值恢复和完整配置保存能力。
 */

/** 判断 unknown 是否为普通 JSON 对象。 */
function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 创建默认系统配置对象，用于配置文件缺失或损坏时展示。 */
function createDefaultAppSettings(): AppSettingsFile {
  return {
    lastOpenedProjectPath: '',
    aiAssistant: {
      remoteServiceBaseUrl: '',
      remoteProjectId: '',
    },
    updatedAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}

/** 创建系统配置编辑器返回结果。 */
function createSystemConfigEditorFile(settings: AppSettingsFile): SystemConfigEditorFile {
  return {
    filePath: resolveAppSettingsFilePath(),
    text: JSON.stringify(settings, null, 2),
  };
}

/** 读取可编辑的系统配置 JSON 文本和配置文件路径。 */
export async function loadSystemConfigText(): Promise<SystemConfigEditorFile> {
  const settings = (await loadAppSettings()) ?? createDefaultAppSettings();
  return createSystemConfigEditorFile(settings);
}

/**
 * 保存用户编辑后的系统配置 JSON 文本。
 * @param configText renderer 弹框提交的 JSON 文本
 */
export async function saveSystemConfigText(configText: string): Promise<SystemConfigEditorFile> {
  let parsedConfig: unknown;

  try {
    parsedConfig = JSON.parse(configText) as unknown;
  } catch (error) {
    throw new Error('系统配置不是有效的 JSON，请检查格式。', { cause: error });
  }

  if (!isJsonRecord(parsedConfig)) {
    throw new Error('系统配置根节点必须是 JSON 对象。');
  }

  const savedConfig = await saveCompleteAppSettings(parsedConfig);
  return createSystemConfigEditorFile(savedConfig);
}
