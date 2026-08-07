import { mkdir } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

/** 默认数据目录名称；未指定基础目录时，文件会写入项目根目录下的 data 目录。 */
export const DEFAULT_DATA_DIRECTORY_NAME = 'data';

/**
 * 获取默认基础目录路径。
 * 当前第一版使用运行目录下的 data 目录，便于开发期直接查看和版本管理样例数据。
 */
export function getDefaultBaseDirectory(): string {
  return resolve(process.cwd(), DEFAULT_DATA_DIRECTORY_NAME);
}

/**
 * 解析用户指定的基础目录路径。
 * 如果调用方没有指定路径，则回退到项目默认 data 目录。
 */
export function resolveBaseDirectory(baseDirPath?: string): string {
  const normalizedBaseDirPath = baseDirPath?.trim();

  if (!normalizedBaseDirPath) {
    return getDefaultBaseDirectory();
  }

  return resolve(normalizedBaseDirPath);
}

/**
 * 确保目录存在。
 * 适用于小说项目基础目录，以及 characters/items/locations 等分类目录。
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * 确保基础目录存在，并返回最终使用的绝对路径。
 * 调用方可传入用户选择的目录；未传入时自动创建默认 data 目录。
 */
export async function ensureBaseDirectory(baseDirPath?: string): Promise<string> {
  const resolvedBaseDirectory = resolveBaseDirectory(baseDirPath);
  await ensureDirectory(resolvedBaseDirectory);
  return resolvedBaseDirectory;
}

/**
 * 在基础目录内解析后续文件或子目录路径。
 * 防止传入的相对路径跳出基础目录，确保 JSON 文件都落在同一个小说项目目录下。
 */
export function resolvePathInBaseDirectory(baseDirPath: string | undefined, ...segments: string[]): string {
  const baseDirectory = resolveBaseDirectory(baseDirPath);
  const targetPath = resolve(baseDirectory, ...segments);
  const pathFromBase = relative(baseDirectory, targetPath);

  if (pathFromBase.startsWith('..') || isAbsolute(pathFromBase)) {
    throw new Error(`目标路径必须位于基础目录内：${targetPath}`);
  }

  return targetPath;
}
