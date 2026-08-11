import type { BrowserWindow } from 'electron';
import { dialog } from 'electron';
import { mkdir, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import {
  createNovelProjectFile,
  isNovelProjectFile,
  type CurrentProject,
  type NovelProjectFile,
} from '../../../src/types/project';
import { ensureDirectory } from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import { loadAppSettings, saveLastOpenedProjectPath } from '../system/app-settings-service';

/**
 * 小说项目服务。
 * 负责创建、打开、恢复小说项目目录，并维护 Electron main process 内的当前项目状态。
 */

/** 小说项目入口文件名。 */
const NOVEL_FILE_NAME = 'novel.json';

/** 新建项目时可预创建的小说数据目录。 */
const PROJECT_DATA_DIRECTORIES = [
  'list-orders',
  'characters',
  'items',
  'locations',
  'maps',
  'relations',
  'events',
  'timeline',
  'world',
  'chapters',
];

/** 当前已打开的小说项目。 */
let currentProject: CurrentProject | null = null;

/** 获取当前项目状态。 */
export function getCurrentProject(): CurrentProject | null {
  return currentProject;
}

/**
 * 获取当前小说项目目录。
 * 模块 IPC 未显式传入 baseDirPath 时使用，避免继续写入系统 data 目录。
 */
export function resolveCurrentProjectDirectory(baseDirPath?: string): string {
  const normalizedBaseDirPath = baseDirPath?.trim();

  if (normalizedBaseDirPath) {
    return resolve(normalizedBaseDirPath);
  }

  if (!currentProject) {
    throw new Error('尚未打开小说项目，请先通过“小说 > 新建”或“小说 > 打开”选择项目目录');
  }

  return currentProject.baseDir;
}

/**
 * 通知 renderer 当前项目已变化。
 * @param browserWindow 需要通知的窗口
 */
export function notifyCurrentProjectChanged(browserWindow: BrowserWindow): void {
  browserWindow.webContents.send('projects:current-changed', currentProject);
}

/** 判断指定路径是否存在。 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

/** 根据项目目录解析 novel.json 路径。 */
function resolveNovelFilePath(projectDirectory: string): string {
  return join(projectDirectory, NOVEL_FILE_NAME);
}

/**
 * 读取并校验小说项目入口文件。
 * @param projectDirectory 小说项目目录
 */
async function loadProjectFromDirectory(projectDirectory: string): Promise<CurrentProject> {
  const baseDir = resolve(projectDirectory);
  const novelFilePath = resolveNovelFilePath(baseDir);

  if (!(await pathExists(novelFilePath))) {
    throw new Error('这是一个无效的小说项目目录，未找到 novel.json。请选择通过“小说 > 新建”创建过的目录。');
  }

  const novel = await loadJsonFileAs<NovelProjectFile>(novelFilePath, isNovelProjectFile);

  return {
    baseDir,
    novel,
  };
}

/**
 * 将项目设置为当前项目，并按需写入上一次打开目录。
 * @param project 已通过校验的项目
 * @param persistLastOpened 是否保存为上一次打开目录
 */
async function setCurrentProject(project: CurrentProject, persistLastOpened: boolean): Promise<CurrentProject> {
  currentProject = project;

  if (persistLastOpened) {
    await saveLastOpenedProjectPath(project.baseDir);
  }

  return currentProject;
}

/**
 * 显示目录选择框。
 * @param browserWindow 当前窗口
 */
async function selectProjectDirectory(browserWindow: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(browserWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return resolve(result.filePaths[0]);
}

/**
 * 创建一个新的小说项目目录。
 * @param browserWindow 当前窗口
 */
export async function createProjectFromMenu(browserWindow: BrowserWindow): Promise<CurrentProject | null> {
  const selectedDirectory = await selectProjectDirectory(browserWindow);

  if (!selectedDirectory) {
    return null;
  }

  const novelFilePath = resolveNovelFilePath(selectedDirectory);

  if (await pathExists(novelFilePath)) {
    await dialog.showMessageBox(browserWindow, {
      type: 'warning',
      title: '目录已包含小说项目',
      message: '该目录已经包含 novel.json，请使用“小说 > 打开”。',
    });
    return null;
  }

  try {
    await ensureDirectory(selectedDirectory);

    for (const directoryName of PROJECT_DATA_DIRECTORIES) {
      await mkdir(join(selectedDirectory, directoryName), { recursive: true });
    }

    const projectFile = createNovelProjectFile(basename(selectedDirectory), selectedDirectory);
    await saveJsonFile(novelFilePath, projectFile);

    return setCurrentProject(
      {
        baseDir: selectedDirectory,
        novel: projectFile,
      },
      true,
    );
  } catch (error) {
    await dialog.showMessageBox(browserWindow, {
      type: 'error',
      title: '创建小说项目失败',
      message: '无法在所选目录创建 novel.json，请检查目录权限。',
      detail: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * 从菜单打开已有小说项目目录。
 * @param browserWindow 当前窗口
 */
export async function openProjectFromMenu(browserWindow: BrowserWindow): Promise<CurrentProject | null> {
  const selectedDirectory = await selectProjectDirectory(browserWindow);

  if (!selectedDirectory) {
    return null;
  }

  try {
    return await openProjectDirectory(selectedDirectory, true);
  } catch (error) {
    await dialog.showMessageBox(browserWindow, {
      type: 'error',
      title: '打开小说项目失败',
      message: error instanceof Error ? error.message : 'novel.json 文件结构无效，无法打开该小说项目。',
    });
    return null;
  }
}

/**
 * 打开指定小说项目目录。
 * @param projectDirectory 小说项目目录
 * @param persistLastOpened 是否保存为上一次打开目录
 */
export async function openProjectDirectory(
  projectDirectory: string,
  persistLastOpened: boolean,
): Promise<CurrentProject> {
  const project = await loadProjectFromDirectory(projectDirectory);
  return setCurrentProject(project, persistLastOpened);
}

/**
 * 启动时恢复上一次打开的小说项目。
 * 恢复失败只提示，不清空系统配置。
 */
export async function restoreLastOpenedProject(browserWindow?: BrowserWindow): Promise<CurrentProject | null> {
  const appSettings = await loadAppSettings();
  const lastOpenedProjectPath = appSettings?.lastOpenedProjectPath.trim();

  if (!lastOpenedProjectPath) {
    currentProject = null;
    return null;
  }

  try {
    return await openProjectDirectory(lastOpenedProjectPath, false);
  } catch {
    currentProject = null;

    if (browserWindow) {
      await dialog.showMessageBox(browserWindow, {
        type: 'warning',
        title: '上一次项目不可用',
        message: '上一次打开的小说项目目录不可用，请重新选择项目目录。',
      });
    }

    return null;
  }
}
