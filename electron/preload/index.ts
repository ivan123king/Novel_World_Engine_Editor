import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type {
  CharacterFile,
  CurrentProject,
  AiAssistantSettings,
  ItemFile,
  LocationFile,
  MapFile,
  NovelDirectoryRecordsFile,
  PlotFile,
  RelationGraphFile,
  TimelineFile,
  TimelineIndexFile,
} from '../../src/types';

/**
 * Electron preload 安全桥接。
 * 只暴露应用需要的类型化 IPC 方法，不把 Node.js 能力直接交给 renderer。
 */
contextBridge.exposeInMainWorld('novelEngine', {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),

  //项目模块
  getCurrentProject: () => ipcRenderer.invoke('projects:get-current'),
  restoreLastOpenedProject: () => ipcRenderer.invoke('projects:restore-last-opened'),
  createProject: () => ipcRenderer.invoke('projects:create'),
  openProject: () => ipcRenderer.invoke('projects:open'),
  saveProjectOverview: (title: string, description: string) =>
    ipcRenderer.invoke('projects:save-overview', title, description) as Promise<CurrentProject>,
  listNovelDirectoryRecords: () =>
    ipcRenderer.invoke('novel-directories:list') as Promise<NovelDirectoryRecordsFile>,
  openNovelDirectoryRecord: (folderPath: string) =>
    ipcRenderer.invoke('novel-directories:open', folderPath) as Promise<CurrentProject>,
  deleteNovelDirectoryRecord: (folderPath: string) =>
    ipcRenderer.invoke('novel-directories:delete', folderPath) as Promise<NovelDirectoryRecordsFile>,
  onOpenNovelDirectoryRecordsModal: (listener: () => void) => {
    const channelListener = () => {
      listener();
    };

    ipcRenderer.on('novel-directories:open-list', channelListener);

    return () => {
      ipcRenderer.removeListener('novel-directories:open-list', channelListener);
    };
  },
  loadAiAssistantSettings: () =>
    ipcRenderer.invoke('ai-assistant:settings-load') as Promise<AiAssistantSettings>,
  saveRemoteAiAssistantServiceBaseUrl: (baseUrl: string) =>
    ipcRenderer.invoke('ai-assistant:service-url-save', baseUrl) as Promise<AiAssistantSettings>,
  saveRemoteAiAssistantProjectId: (remoteProjectId: string) =>
    ipcRenderer.invoke('ai-assistant:remote-project-id-save', remoteProjectId) as Promise<AiAssistantSettings>,
  loadSystemConfigText: () => ipcRenderer.invoke('system-config:load') as Promise<string>,
  saveSystemConfigText: (configText: string) =>
    ipcRenderer.invoke('system-config:save', configText) as Promise<string>,
  onOpenSystemConfigEditor: (listener: () => void) => {
    const channelListener = () => {
      listener();
    };

    ipcRenderer.on('system-config:open-editor', channelListener);

    return () => {
      ipcRenderer.removeListener('system-config:open-editor', channelListener);
    };
  },
  onOpenAboutDialog: (listener: () => void) => {
    const channelListener = () => {
      listener();
    };

    ipcRenderer.on('about:open', channelListener);

    return () => {
      ipcRenderer.removeListener('about:open', channelListener);
    };
  },
  onCurrentProjectChanged: (listener: (project: CurrentProject | null) => void) => {
    const channelListener = (_event: IpcRendererEvent, project: CurrentProject | null) => {
      listener(project);
    };

    ipcRenderer.on('projects:current-changed', channelListener);

    return () => {
      ipcRenderer.removeListener('projects:current-changed', channelListener);
    };
  },

  //人物模块
  listCharacters: (baseDirPath?: string) => ipcRenderer.invoke('characters:list', baseDirPath),
  saveCharacter: (character: CharacterFile, baseDirPath?: string) =>
    ipcRenderer.invoke('characters:save', character, baseDirPath),
  deleteCharacter: (characterId: string, baseDirPath?: string) =>
    ipcRenderer.invoke('characters:delete', characterId, baseDirPath),
  saveCharacterOrder: (characterIds: string[], baseDirPath?: string) =>
    ipcRenderer.invoke('characters:save-order', characterIds, baseDirPath),

  //物品模块
  listItems: (baseDirPath?: string) => ipcRenderer.invoke('items:list', baseDirPath),
  saveItem: (item: ItemFile, baseDirPath?: string) =>
    ipcRenderer.invoke('items:save', item, baseDirPath),
  deleteItem: (itemId: string, baseDirPath?: string) =>
    ipcRenderer.invoke('items:delete', itemId, baseDirPath),
  saveItemOrder: (itemIds: string[], baseDirPath?: string) =>
    ipcRenderer.invoke('items:save-order', itemIds, baseDirPath),

  //剧情库模块
  listPlots: (baseDirPath?: string) => ipcRenderer.invoke('plots:list', baseDirPath),
  savePlot: (plot: PlotFile, baseDirPath?: string) =>
    ipcRenderer.invoke('plots:save', plot, baseDirPath),
  deletePlot: (plotId: string, baseDirPath?: string) =>
    ipcRenderer.invoke('plots:delete', plotId, baseDirPath),

  //地图模块
  listMapModule: (baseDirPath?: string) => ipcRenderer.invoke('maps:list-module', baseDirPath),
  saveLocation: (location: LocationFile, baseDirPath?: string) =>
    ipcRenderer.invoke('locations:save', location, baseDirPath),
  deleteLocation: (locationId: string, baseDirPath?: string) =>
    ipcRenderer.invoke('locations:delete', locationId, baseDirPath),
  saveMap: (map: MapFile, baseDirPath?: string) =>
    ipcRenderer.invoke('maps:save', map, baseDirPath),
  deleteMap: (mapId: string, baseDirPath?: string) =>
    ipcRenderer.invoke('maps:delete', mapId, baseDirPath),

  //关系图谱模块
  listRelationGraphs: (baseDirPath?: string) => ipcRenderer.invoke('relations:list', baseDirPath),
  saveRelationGraph: (graph: RelationGraphFile, baseDirPath?: string) =>
    ipcRenderer.invoke('relations:save-graph', graph, baseDirPath),
  deleteRelationGraph: (graphId: string, baseDirPath?: string) =>
    ipcRenderer.invoke('relations:delete-graph', graphId, baseDirPath),
  saveRelationGraphOrder: (graphIds: string[], baseDirPath?: string) =>
    ipcRenderer.invoke('relations:save-graph-order', graphIds, baseDirPath),
  saveRelationGraphBlockOrder: (graphId: string, nodeIds: string[], baseDirPath?: string) =>
    ipcRenderer.invoke('relations:save-block-order', graphId, nodeIds, baseDirPath),

  //时间线模块
  listTimelineModule: (baseDirPath?: string) => ipcRenderer.invoke('timelines:list-module', baseDirPath),
  saveTimelineIndex: (index: TimelineIndexFile, baseDirPath?: string) =>
    ipcRenderer.invoke('timelines:save-index', index, baseDirPath),
  saveTimeline: (timeline: TimelineFile, baseDirPath?: string) =>
    ipcRenderer.invoke('timelines:save', timeline, baseDirPath),
  deleteTimeline: (timelineId: string, baseDirPath?: string) =>
    ipcRenderer.invoke('timelines:delete', timelineId, baseDirPath),
  saveTimelineTimeBlockOrder: (
    timelineId: string,
    timeBlockIds: string[],
    baseDirPath?: string,
  ) => ipcRenderer.invoke('timelines:save-time-block-order', timelineId, timeBlockIds, baseDirPath),
});
