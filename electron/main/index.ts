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
  deletePlotFile,
  listPlots,
  savePlot,
} from './plots/plot-service';
import {
  deleteLocationFile,
  deleteMapFile,
  listMapModule,
  saveLocation,
  saveMap,
} from './maps/map-service';
import {
  deleteRelationGraphFile,
  listRelationGraphs,
  saveRelationGraph,
  saveRelationGraphBlockOrder,
  saveRelationGraphOrder,
} from './relations/relation-graph-service';
import { installNovelMenu } from './menu/novel-menu';
import {
  createProjectFromMenu,
  getCurrentProject,
  notifyCurrentProjectChanged,
  openProjectFromMenu,
  resolveCurrentProjectDirectory,
  restoreLastOpenedProject,
} from './projects/project-service';

/** Electron 主进程入口，负责窗口创建和安全 IPC 注册。 */

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

/** 当前主窗口引用，用于菜单动作和项目状态通知。 */
let mainWindow: BrowserWindow | null = null;

/** 创建主窗口并加载 renderer 页面。 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
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

  const currentWindow = mainWindow;

  currentWindow.once('ready-to-show', () => {
    currentWindow.show();
  });

  currentWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  currentWindow.webContents.once('did-finish-load', async () => {
    await restoreLastOpenedProject(currentWindow);
    notifyCurrentProjectChanged(currentWindow);
  });

  currentWindow.on('closed', () => {
    if (mainWindow === currentWindow) {
      mainWindow = null;
    }
  });

  if (isDev) {
    currentWindow.loadURL(process.env.ELECTRON_RENDERER_URL!);
  } else {
    currentWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

ipcMain.handle('app:get-info', () => ({
  name: 'Novel World Engine Editor',
  version: app.getVersion(),
  storage: '本地 JSON 文件',
}));

ipcMain.handle('projects:get-current', () => getCurrentProject());

ipcMain.handle('projects:restore-last-opened', async () => {
  const project = await restoreLastOpenedProject(mainWindow ?? undefined);

  if (mainWindow) {
    notifyCurrentProjectChanged(mainWindow);
  }

  return project;
});

ipcMain.handle('projects:create', async () => {
  if (!mainWindow) {
    return null;
  }

  const project = await createProjectFromMenu(mainWindow);

  if (project) {
    notifyCurrentProjectChanged(mainWindow);
  }

  return project;
});

ipcMain.handle('projects:open', async () => {
  if (!mainWindow) {
    return null;
  }

  const project = await openProjectFromMenu(mainWindow);

  if (project) {
    notifyCurrentProjectChanged(mainWindow);
  }

  return project;
});

ipcMain.handle('characters:list', (_event, baseDirPath?: string) =>
  listCharacters(resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('characters:save', (_event, character, baseDirPath?: string) =>
  saveCharacter(character, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('characters:delete', (_event, characterId: string, baseDirPath?: string) =>
  deleteCharacterFile(characterId, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('characters:save-order', (_event, characterIds: string[], baseDirPath?: string) =>
  saveCharacterOrder(characterIds, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('items:list', (_event, baseDirPath?: string) =>
  listItems(resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('items:save', (_event, item, baseDirPath?: string) =>
  saveItem(item, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('items:delete', (_event, itemId: string, baseDirPath?: string) =>
  deleteItemFile(itemId, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('items:save-order', (_event, itemIds: string[], baseDirPath?: string) =>
  saveItemOrder(itemIds, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('plots:list', (_event, baseDirPath?: string) =>
  listPlots(resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('plots:save', (_event, plot, baseDirPath?: string) =>
  savePlot(plot, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('plots:delete', (_event, plotId: string, baseDirPath?: string) =>
  deletePlotFile(plotId, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('maps:list-module', (_event, baseDirPath?: string) =>
  listMapModule(resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('locations:save', (_event, location, baseDirPath?: string) =>
  saveLocation(location, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('locations:delete', (_event, locationId: string, baseDirPath?: string) =>
  deleteLocationFile(locationId, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('maps:save', (_event, map, baseDirPath?: string) =>
  saveMap(map, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('maps:delete', (_event, mapId: string, baseDirPath?: string) =>
  deleteMapFile(mapId, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('relations:list', (_event, baseDirPath?: string) =>
  listRelationGraphs(resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('relations:save-graph', (_event, graph, baseDirPath?: string) =>
  saveRelationGraph(graph, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('relations:delete-graph', (_event, graphId: string, baseDirPath?: string) =>
  deleteRelationGraphFile(graphId, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('relations:save-graph-order', (_event, graphIds: string[], baseDirPath?: string) =>
  saveRelationGraphOrder(graphIds, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle(
  'relations:save-block-order',
  (_event, graphId: string, nodeIds: string[], baseDirPath?: string) =>
    saveRelationGraphBlockOrder(graphId, nodeIds, resolveCurrentProjectDirectory(baseDirPath)),
);

app.whenReady().then(() => {
  installNovelMenu(() => mainWindow);
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
