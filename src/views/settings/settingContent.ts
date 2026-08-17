import type { SettingFile } from '@/types';

/**
 * 设定内容格式工具。
 * 负责在旧纯文本设定和当前富文本 HTML 之间做兼容转换，避免页面组件散落格式判断。
 */

/** 富文本编辑器的空内容。 */
export const EMPTY_SETTING_HTML = '<p></p>';

/** 转义纯文本中的 HTML 特殊字符，避免旧纯文本被当作标签解析。 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 将旧版纯文本内容转换为 Tiptap 可编辑的段落 HTML。 */
export function convertPlainTextToSettingHtml(content: string): string {
  const lines = content.split(/\r?\n/);

  if (lines.length === 0 || lines.every((line) => line.trim().length === 0)) {
    return EMPTY_SETTING_HTML;
  }

  return lines
    .map((line) => {
      const escapedLine = escapeHtml(line);
      return escapedLine.trim().length > 0 ? `<p>${escapedLine}</p>` : '<p></p>';
    })
    .join('');
}

/** 获取设定用于编辑和展示的 HTML 内容。 */
export function getSettingContentHtml(setting: SettingFile | null): string {
  if (!setting || !setting.content.trim()) {
    return EMPTY_SETTING_HTML;
  }

  return setting.contentFormat === 'html'
    ? setting.content
    : convertPlainTextToSettingHtml(setting.content);
}

/** 判断 Tiptap HTML 是否是业务上的空内容。 */
export function isSettingHtmlEmpty(content: string): boolean {
  const textContent = content
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

  return textContent.length === 0;
}

/** 将设定 HTML 转成列表摘要用的纯文本。 */
export function createSettingTextExcerpt(content: string, contentFormat?: SettingFile['contentFormat']): string {
  const sourceText =
    contentFormat === 'html'
      ? content.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
      : content;
  const normalizedContent = sourceText.replace(/\s+/g, ' ').trim();

  if (!normalizedContent) {
    return '未填写内容';
  }

  return normalizedContent.length > 44 ? `${normalizedContent.slice(0, 44)}...` : normalizedContent;
}
