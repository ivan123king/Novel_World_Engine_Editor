import type { AiAssistantSettings } from '@/types';

/**
 * renderer 侧 AI小助手设置 API。
 * 统一封装 preload 暴露的安全 IPC 方法，Vue 页面不直接访问本地文件系统。
 */

/** 确保当前运行环境已经注入 Electron preload API。 */
function getNovelEngineApi(): Window['novelEngine'] {
  if (!window.novelEngine) {
    throw new Error('当前环境没有可用的 Electron AI 设置接口');
  }

  return window.novelEngine;
}

/** 读取 AI小助手设置。 */
export function loadAiAssistantSettings(): Promise<AiAssistantSettings> {
  return getNovelEngineApi().loadAiAssistantSettings();
}

/**
 * 保存远程AI小助手服务基础地址。
 * @param baseUrl 用户输入的服务地址
 */
export function saveRemoteAiAssistantServiceBaseUrl(baseUrl: string): Promise<AiAssistantSettings> {
  return getNovelEngineApi().saveRemoteAiAssistantServiceBaseUrl(baseUrl);
}

/**
 * 保存当前项目在远程AI小助手服务中的项目 ID。
 * @param remoteProjectId 远程AI小助手服务返回的项目 ID
 */
export function saveRemoteAiAssistantProjectId(remoteProjectId: string): Promise<AiAssistantSettings> {
  return getNovelEngineApi().saveRemoteAiAssistantProjectId(remoteProjectId);
}
