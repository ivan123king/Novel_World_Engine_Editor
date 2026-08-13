import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import {
  createProjectFromMenu,
  notifyCurrentProjectChanged,
  openProjectFromMenu,
} from '../projects/project-service';

/**
 * 小说项目菜单模块。
 * 只负责“小说”一级菜单下的新建、打开等项目目录入口。
 */

/**
 * 创建小说项目菜单。
 * @param getMainWindow 获取当前主窗口的函数
 */
export function createNovelMenu(
  getMainWindow: () => BrowserWindow | null,
): MenuItemConstructorOptions {
  return {
    label: '小说',
    submenu: [
      {
        label: '新建',
        click: async () => {
          const mainWindow = getMainWindow();

          if (!mainWindow) {
            return;
          }

          const project = await createProjectFromMenu(mainWindow);

          if (project) {
            notifyCurrentProjectChanged(mainWindow);
          }
        },
      },
      {
        label: '打开',
        click: async () => {
          const mainWindow = getMainWindow();

          if (!mainWindow) {
            return;
          }

          const project = await openProjectFromMenu(mainWindow);

          if (project) {
            notifyCurrentProjectChanged(mainWindow);
          }
        },
      },
      {
        label: '小说目录',
        click: () => {
          const mainWindow = getMainWindow();

          if (!mainWindow) {
            return;
          }

          mainWindow.webContents.send('novel-directories:open-list');
        },
      },
    ],
  };
}
