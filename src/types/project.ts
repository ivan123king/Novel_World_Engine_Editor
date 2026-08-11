/**
 * 小说项目入口文件类型。
 * 对应用户选择的小说项目目录下的 novel.json，用于标识和加载一部小说。
 */

/** 小说项目入口文件 schema 版本。 */
export const NOVEL_PROJECT_SCHEMA_VERSION = 1;

/** 小说项目入口文件。 */
export interface NovelProjectFile {
  /** 小说名，新建时默认使用目录名。 */
  title: string;
  /** 小说项目文件夹绝对路径，用于展示和诊断。 */
  folderPath: string;
  /** 小说简介。 */
  description: string;
  /** 项目创建时间，ISO 字符串。 */
  createdAt: string;
  /** 项目信息最近更新时间，ISO 字符串。 */
  updatedAt: string;
  /** 项目入口文件结构版本。 */
  schemaVersion: number;
  /** 保留未来版本或用户手写扩展字段。 */
  [key: string]: unknown;
}

/** 当前项目状态，renderer 用于更新顶部项目栏和模块数据来源。 */
export interface CurrentProject {
  /** 小说项目目录绝对路径。 */
  baseDir: string;
  /** 已通过校验的 novel.json 内容。 */
  novel: NovelProjectFile;
}

/** 判断 unknown 是否为普通对象。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 校验 novel.json 是否满足第一版项目入口结构。
 * @param value 待校验的 JSON 值
 */
export function isNovelProjectFile(value: unknown): value is NovelProjectFile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === 'string' &&
    typeof value.folderPath === 'string' &&
    typeof value.description === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.schemaVersion === 'number'
  );
}

/**
 * 创建新的小说项目入口文件。
 * @param title 默认小说名
 * @param folderPath 小说项目目录绝对路径
 */
export function createNovelProjectFile(title: string, folderPath: string): NovelProjectFile {
  const now = new Date().toISOString();

  return {
    title,
    folderPath,
    description: '',
    createdAt: now,
    updatedAt: now,
    schemaVersion: NOVEL_PROJECT_SCHEMA_VERSION,
  };
}
