import { app, Menu, type BrowserWindow } from 'electron';
import {
  createProjectFromMenu,
  notifyCurrentProjectChanged,
  openProjectFromMenu,
} from '../projects/project-service';

/**
 * 小说菜单安装模块。
 * 负责创建 Electron 顶部菜单中的“小说 / 新建 / 打开”入口。
 */

/**
 * 安装应用菜单。
 * @param getMainWindow 获取当前主窗口的函数
 */
export function installNovelMenu(getMainWindow: () => BrowserWindow | null): void {
  const menu = Menu.buildFromTemplate([
    {
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
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'reload', label: '重新加载' },
        { type: 'separator' },
        { role: 'quit', label: process.platform === 'darwin' ? `退出 ${app.name}` : '退出' },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);
}
