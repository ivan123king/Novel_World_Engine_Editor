/**
 * 系统配置编辑器数据类型。
 * 用于 renderer 展示可编辑 JSON 文本和主进程实际使用的配置文件路径。
 */

/** 系统配置编辑器读取或保存后的返回结果。 */
export interface SystemConfigEditorFile {
  /** 当前系统配置文件的绝对路径，方便用户复制后在外部编辑器中打开。 */
  filePath: string;
  /** 格式化后的系统配置 JSON 文本。 */
  text: string;
}
