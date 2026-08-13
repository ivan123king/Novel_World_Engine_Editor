/**
 * renderer 侧系统配置 API。
 * 统一封装 preload 暴露的系统配置 IPC 方法，Vue 组件不直接访问 Electron 或文件系统。
 */
import type { SystemConfigEditorFile } from '@/types';

/** 确保当前运行环境已经注入 Electron preload API。 */
function getNovelEngineApi(): Window['novelEngine'] {
  if (!window.novelEngine) {
    throw new Error('当前环境没有可用的 Electron 系统配置接口');
  }

  return window.novelEngine;
}

/** 读取系统配置 JSON 文本。 */
export function loadSystemConfigText(): Promise<SystemConfigEditorFile> {
  return getNovelEngineApi().loadSystemConfigText();
}

/**
 * 保存系统配置 JSON 文本。
 * @param configText 用户在系统配置弹框中编辑的 JSON 文本
 */
export function saveSystemConfigText(configText: string): Promise<SystemConfigEditorFile> {
  return getNovelEngineApi().saveSystemConfigText(configText);
}

/**
 * 监听系统配置弹框打开事件。
 * @param listener 菜单点击后的回调
 */
export function onOpenSystemConfigEditor(listener: () => void): () => void {
  return getNovelEngineApi().onOpenSystemConfigEditor(listener);
}
