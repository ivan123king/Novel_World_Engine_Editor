/** 当前设定文件结构版本。 */
export const SETTING_SCHEMA_VERSION = 1;

/**
 * 设定 JSON 文件结构。
 * 固定字段只保留标题和内容，内容可按纯文本或富文本 HTML 保存。
 */
export interface SettingFile {
  /** 系统稳定 ID，用于未来引用、AI 建议变更和文件名生成。 */
  id: string;

  /** 设定标题，例如：修炼境界体系、王朝制度、魔法规则。 */
  title: string;

  /** 设定正文；富文本阶段保存为 Tiptap 生成的 HTML 字符串。 */
  content: string;

  /** 内容格式；旧文件缺失时按 plain-text 兼容读取。 */
  contentFormat?: 'plain-text' | 'html';

  /** 设定文件结构版本，用于后续迁移。 */
  schemaVersion: typeof SETTING_SCHEMA_VERSION;
}

/**
 * 创建一个空设定对象。
 * 用于新增设定时提供稳定、可直接写入 JSON 的默认结构。
 */
export function createEmptySetting(id: string, title = ''): SettingFile {
  return {
    id,
    title,
    content: '',
    contentFormat: 'html',
    schemaVersion: SETTING_SCHEMA_VERSION,
  };
}

/**
 * 判断未知数据是否满足设定文件的最小结构。
 * 这里只校验第一阶段必须字段，未知扩展字段由后续版本继续保留。
 */
export function isSettingFile(value: unknown): value is SettingFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<SettingFile>;
  const contentFormatIsValid =
    data.contentFormat === undefined ||
    data.contentFormat === 'plain-text' ||
    data.contentFormat === 'html';

  return (
    typeof data.id === 'string' &&
    typeof data.title === 'string' &&
    typeof data.content === 'string' &&
    contentFormatIsValid &&
    data.schemaVersion === SETTING_SCHEMA_VERSION
  );
}
