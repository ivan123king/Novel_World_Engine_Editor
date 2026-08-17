import type { SettingFile } from '@/types';

/**
 * renderer 侧设定数据 API。
 * 统一封装 preload 暴露的安全 IPC 方法，Vue 页面只依赖这里，不直接访问文件系统。
 */

/** 设定列表读取结果。 */
export interface SettingListResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取的设定列表。 */
  settings: SettingFile[];
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
 * 将 Vue 响应式设定对象转成可通过 Electron IPC 传输的纯 JSON 对象。
 * Electron 的结构化克隆不能处理 Proxy，因此保存前必须清理响应式包装。
 */
function cloneSettingForIpc(setting: SettingFile): SettingFile {
  return JSON.parse(JSON.stringify(setting)) as SettingFile;
}

/** 读取设定列表。 */
export function listSettings(baseDirPath?: string): Promise<SettingListResult> {
  return getNovelEngineApi().listSettings(baseDirPath);
}

/** 保存设定文件。 */
export function saveSetting(setting: SettingFile, baseDirPath?: string): Promise<SettingFile> {
  return getNovelEngineApi().saveSetting(cloneSettingForIpc(setting), baseDirPath);
}

/** 删除设定文件。 */
export function deleteSetting(settingId: string, baseDirPath?: string): Promise<void> {
  return getNovelEngineApi().deleteSetting(settingId, baseDirPath);
}
