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
  listPlotRoots,
  listPlots,
  loadPlotLayer,
  savePlotOrder,
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
import {
  deleteTimelineFile,
  listTimelineModule,
  saveTimeline,
  saveTimelineIndex,
  saveTimelineTimeBlockOrder,
} from './timeline/timeline-service';
import {
  loadAiAssistantSettings,
  saveRemoteAiAssistantProjectId,
  saveRemoteAiAssistantServiceBaseUrl,
} from './system/app-settings-service';
import { loadSystemConfigText, saveSystemConfigText } from './system/system-config-editor-service';
import { installAppMenu } from './menu/app-menu';
import {
  createProjectFromMenu,
  getCurrentProject,
  notifyCurrentProjectChanged,
  openProjectFromDirectoryRecord,
  openProjectFromMenu,
  resolveCurrentProjectDirectory,
  restoreLastOpenedProject,
  saveProjectOverview,
} from './projects/project-service';
import {
  deleteNovelDirectoryRecord,
  loadNovelDirectoryRecords,
} from './projects/novel-directory-records-service';

/** Electron 主进程入口，负责窗口创建和安全 IPC 注册。 */

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL);

/** 应用窗口图标路径，开发版读取 build 目录，打包版读取 resources 目录。 */
function resolveAppWindowIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'icon.png');
  }

  return join(process.cwd(), 'build/icon.png');
}

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
    title: '佳依创式',
    icon: resolveAppWindowIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
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

  // 注册窗口级调试快捷键，让 Electron 窗口获得焦点时也能像网页一样打开开发者工具。
  currentWindow.webContents.on('before-input-event', (event, input) => {
    const isFunctionKeyDebug = input.key === 'F12';
    const isBrowserDebugShortcut =
      input.shift && input.key.toLowerCase() === 'i' && (input.control || input.meta);

    if (isFunctionKeyDebug || isBrowserDebugShortcut) {
      event.preventDefault();
      currentWindow.webContents.toggleDevTools();
    }
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
  name: '佳依创式',
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

ipcMain.handle('projects:save-overview', async (_event, title: string, description: string) => {
  const project = await saveProjectOverview(title, description);

  if (mainWindow) {
    notifyCurrentProjectChanged(mainWindow);
  }

  return project;
});

ipcMain.handle('ai-assistant:settings-load', () => loadAiAssistantSettings());

ipcMain.handle('ai-assistant:service-url-save', (_event, baseUrl: string) =>
  saveRemoteAiAssistantServiceBaseUrl(baseUrl),
);

ipcMain.handle('ai-assistant:remote-project-id-save', (_event, remoteProjectId: string) =>
  saveRemoteAiAssistantProjectId(remoteProjectId),
);

ipcMain.handle('system-config:load', () => loadSystemConfigText());

ipcMain.handle('system-config:save', async (_event, configText: string) => {
  const savedConfigText = await saveSystemConfigText(configText);

  await restoreLastOpenedProject(mainWindow ?? undefined);

  if (mainWindow) {
    notifyCurrentProjectChanged(mainWindow);
  }

  return savedConfigText;
});

ipcMain.handle('novel-directories:list', () => loadNovelDirectoryRecords());

ipcMain.handle('novel-directories:delete', (_event, folderPath: string) =>
  deleteNovelDirectoryRecord(folderPath),
);

ipcMain.handle('novel-directories:open', async (_event, folderPath: string) => {
  const project = await openProjectFromDirectoryRecord(folderPath);

  if (mainWindow) {
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

ipcMain.handle('plots:list-roots', (_event, baseDirPath?: string) =>
  listPlotRoots(resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('plots:load-layer', (_event, plotId: string, baseDirPath?: string) =>
  loadPlotLayer(plotId, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('plots:save', (_event, plot, baseDirPath?: string) =>
  savePlot(plot, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle(
  'plots:save-order',
  (_event, parentId: string | null, orderedPlotIds: string[], baseDirPath?: string) =>
    savePlotOrder(parentId, orderedPlotIds, resolveCurrentProjectDirectory(baseDirPath)),
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

ipcMain.handle('timelines:list-module', (_event, baseDirPath?: string) =>
  listTimelineModule(resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('timelines:save-index', (_event, index, baseDirPath?: string) =>
  saveTimelineIndex(index, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('timelines:save', (_event, timeline, baseDirPath?: string) =>
  saveTimeline(timeline, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle('timelines:delete', (_event, timelineId: string, baseDirPath?: string) =>
  deleteTimelineFile(timelineId, resolveCurrentProjectDirectory(baseDirPath)),
);

ipcMain.handle(
  'timelines:save-time-block-order',
  (_event, timelineId: string, timeBlockIds: string[], baseDirPath?: string) =>
    saveTimelineTimeBlockOrder(timelineId, timeBlockIds, resolveCurrentProjectDirectory(baseDirPath)),
);

app.whenReady().then(() => {
  installAppMenu(() => mainWindow);
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
