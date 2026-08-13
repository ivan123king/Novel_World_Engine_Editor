import type { JsonValue } from './json-value';

/**
 * AI小助手设置类型。
 * 该文件描述保存在系统设置 `system/app-settings.json` 中的 AI小助手设置结构。
 */

/** 远程AI小助手服务健康状态。 */
export type RemoteAiAssistantHealthStatus = 'unknown' | 'checking' | 'available' | 'unavailable';

/** AI小助手设置结构，作为系统设置文件中的 `aiAssistant` 字段保存。 */
export interface AiAssistantSettings {
  /** 远程AI小助手服务基础地址，例如 http://127.0.0.1:7860。 */
  remoteServiceBaseUrl: string;
  /** 当前小说项目在远程AI小助手服务中的项目 ID。 */
  remoteProjectId: string;
  /** 预留给后续 AI 设置弹框扩展的字段。 */
  [key: string]: JsonValue;
}

/** 创建空 AI小助手设置。 */
export function createEmptyAiAssistantSettings(): AiAssistantSettings {
  return {
    remoteServiceBaseUrl: '',
    remoteProjectId: '',
  };
}

/** 判断 unknown 是否为 AI小助手设置结构。 */
export function isAiAssistantSettings(value: unknown): value is AiAssistantSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.remoteServiceBaseUrl === 'string' &&
    typeof record.remoteProjectId === 'string'
  );
}
