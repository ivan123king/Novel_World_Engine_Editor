import { Menu, type BrowserWindow } from 'electron';
import { createNovelMenu } from './novel-menu';
import { createSystemMenu } from './system-menu';
import { createWindowMenu } from './window-menu';

/**
 * Electron 顶部菜单装配模块。
 * 后续新增一级菜单时在这里组合，具体菜单逻辑保留在独立菜单文件中。
 */

/**
 * 安装应用菜单。
 * @param getMainWindow 获取当前主窗口的函数
 */
export function installAppMenu(getMainWindow: () => BrowserWindow | null): void {
  const menu = Menu.buildFromTemplate([
    createNovelMenu(getMainWindow),
    createSystemMenu(getMainWindow),
    createWindowMenu(getMainWindow),
  ]);

  Menu.setApplicationMenu(menu);
}
