import { app } from 'electron';
import { mkdir } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

/**
 * 获取应用系统数据目录路径。
 * 使用 Electron userData 目录保存工具自身配置，避免安装版写入工作目录或安装目录。
 */
export function getDefaultBaseDirectory(): string {
  return resolve(app.getPath('userData'));
}

/**
 * 解析用户指定的小说项目基础目录路径。
 * 业务数据必须传入已打开的小说项目目录，不允许静默回退到应用系统配置目录。
 */
export function resolveBaseDirectory(baseDirPath?: string): string {
  const normalizedBaseDirPath = baseDirPath?.trim();

  if (!normalizedBaseDirPath) {
    throw new Error('尚未打开小说项目，无法读取或保存小说数据');
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
 * 确保小说项目基础目录存在，并返回最终使用的绝对路径。
 * 调用方必须传入用户选择并通过 novel.json 校验的目录。
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
