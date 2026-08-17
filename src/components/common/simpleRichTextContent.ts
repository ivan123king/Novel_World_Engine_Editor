/**
 * 精简富文本内容工具。
 * 用于标题/正文型大段内容，负责旧纯文本兼容、纯文本摘要和展示前 HTML 清理。
 */

/** 精简富文本编辑器的空内容。 */
export const EMPTY_SIMPLE_RICH_TEXT_HTML = '<p></p>';

/**
 * 转义旧纯文本中的 HTML 特殊字符。
 * @param text 需要转义的原始纯文本
 */
function escapeSimpleRichTextHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 判断内容是否已经是 HTML 字符串。
 * @param content 业务内容字符串
 */
function isSimpleRichTextHtmlContent(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

/**
 * 将旧纯文本转换为 Tiptap 可编辑的段落 HTML。
 * @param content 旧纯文本内容
 */
export function convertPlainTextToSimpleRichTextHtml(content: string): string {
  const lines = content.split(/\r?\n/);

  if (lines.length === 0 || lines.every((line) => line.trim().length === 0)) {
    return EMPTY_SIMPLE_RICH_TEXT_HTML;
  }

  return lines
    .map((line) => {
      const escapedLine = escapeSimpleRichTextHtml(line);
      return escapedLine.trim().length > 0 ? `<p>${escapedLine}</p>` : '<p></p>';
    })
    .join('');
}

/**
 * 获取精简富文本编辑器使用的 HTML 内容，兼容旧纯文本。
 * @param content 业务内容字符串
 */
export function getSimpleRichTextEditorHtml(content: string): string {
  if (!content.trim()) {
    return EMPTY_SIMPLE_RICH_TEXT_HTML;
  }

  return isSimpleRichTextHtmlContent(content)
    ? content
    : convertPlainTextToSimpleRichTextHtml(content);
}

/**
 * 提取精简富文本纯文本，用于列表摘要和空内容判断。
 * @param content 业务内容字符串
 */
export function createSimpleRichTextPlainText(content: string): string {
  const template = document.createElement('template');

  template.innerHTML = getSimpleRichTextEditorHtml(content);
  return (template.content.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * 判断精简富文本内容是否为空。
 * @param content 业务内容字符串
 */
export function isSimpleRichTextEmpty(content: string): boolean {
  return createSimpleRichTextPlainText(content).length === 0;
}

/**
 * 创建精简富文本纯文本摘要。
 * @param content 业务内容字符串
 * @param fallback 空内容时展示的文案
 */
export function createSimpleRichTextExcerpt(content: string, fallback: string): string {
  const plainText = createSimpleRichTextPlainText(content);

  if (!plainText) {
    return fallback;
  }

  return plainText.length > 52 ? `${plainText.slice(0, 52)}...` : plainText;
}

/**
 * 安全渲染精简富文本，只允许正文和二、三级标题。
 * @param content 业务内容字符串
 */
export function sanitizeSimpleRichTextHtml(content: string): string {
  const template = document.createElement('template');
  const allowedTags = new Set(['P', 'BR', 'H2', 'H3']);

  template.innerHTML = getSimpleRichTextEditorHtml(content);

  template.content.querySelectorAll('*').forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent ?? ''));
      return;
    }

    [...element.attributes].forEach((attribute) => {
      element.removeAttribute(attribute.name);
    });
  });

  return template.innerHTML;
}
