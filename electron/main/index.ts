import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import {
  deleteCharacterFile,
  listCharacters,
  saveCharacterOrder,
  saveCharacter,
} from './characters/character-service';
import {
  deleteItemFile,
  listItems,
  saveItemOrder,
  saveItem,
} from './items/item-service';
import {
  deleteLocationFile,
  deleteMapFile,
  listMapModule,
  saveLocation,
  saveMap,
} from './maps/map-service';

/** Electron 主进程入口，负责窗口创建和安全 IPC 注册。 */

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

/** 创建主窗口并加载 renderer 页面。 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Novel World Engine Editor',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL!);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

ipcMain.handle('app:get-info', () => ({
  name: 'Novel World Engine Editor',
  version: app.getVersion(),
  storage: '本地 JSON 文件',
}));

ipcMain.handle('characters:list', (_event, baseDirPath?: string) => listCharacters(baseDirPath));

ipcMain.handle('characters:save', (_event, character, baseDirPath?: string) =>
  saveCharacter(character, baseDirPath),
);

ipcMain.handle('characters:delete', (_event, characterId: string, baseDirPath?: string) =>
  deleteCharacterFile(characterId, baseDirPath),
);

ipcMain.handle('characters:save-order', (_event, characterIds: string[], baseDirPath?: string) =>
  saveCharacterOrder(characterIds, baseDirPath),
);

ipcMain.handle('items:list', (_event, baseDirPath?: string) => listItems(baseDirPath));

ipcMain.handle('items:save', (_event, item, baseDirPath?: string) =>
  saveItem(item, baseDirPath),
);

ipcMain.handle('items:delete', (_event, itemId: string, baseDirPath?: string) =>
  deleteItemFile(itemId, baseDirPath),
);

ipcMain.handle('items:save-order', (_event, itemIds: string[], baseDirPath?: string) =>
  saveItemOrder(itemIds, baseDirPath),
);

ipcMain.handle('maps:list-module', (_event, baseDirPath?: string) => listMapModule(baseDirPath));

ipcMain.handle('locations:save', (_event, location, baseDirPath?: string) =>
  saveLocation(location, baseDirPath),
);

ipcMain.handle('locations:delete', (_event, locationId: string, baseDirPath?: string) =>
  deleteLocationFile(locationId, baseDirPath),
);

ipcMain.handle('maps:save', (_event, map, baseDirPath?: string) => saveMap(map, baseDirPath));

ipcMain.handle('maps:delete', (_event, mapId: string, baseDirPath?: string) =>
  deleteMapFile(mapId, baseDirPath),
);

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
