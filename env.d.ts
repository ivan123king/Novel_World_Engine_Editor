/// <reference types="vite/client" />

import type {
  AiAssistantSettings,
  CharacterFile,
  CurrentProject,
  ItemFile,
  ListOrderFile,
  LocationFile,
  MapFile,
  PlotFile,
  RelationGraphFile,
  TimelineFile,
  TimelineIndexFile,
} from './src/types';

declare global {
  /** 人物列表读取结果，和 preload 暴露的数据结构保持一致。 */
  interface CharacterListResult {
    /** 当前使用的数据基础目录。 */
    baseDir: string;
    /** 已成功读取的人物列表。 */
    characters: CharacterFile[];
    /** 单个文件读取失败时的非致命错误。 */
    errors: string[];
  }

  /** 物品列表读取结果，和 preload 暴露的数据结构保持一致。 */
  interface ItemListResult {
    /** 当前使用的数据基础目录。 */
    baseDir: string;
    /** 已成功读取的物品列表。 */
    items: ItemFile[];
    /** 单个文件读取失败时的非致命错误。 */
    errors: string[];
  }

  /** 剧情库读取结果，和 preload 暴露的数据结构保持一致。 */
  interface PlotListResult {
    /** 当前使用的数据基础目录。 */
    baseDir: string;
    /** 已成功读取的剧情块列表。 */
    plots: PlotFile[];
    /** 单个文件读取失败时的非致命错误。 */
    errors: string[];
  }

  /** 地图模块读取结果，和 preload 暴露的数据结构保持一致。 */
  interface MapModuleResult {
    /** 当前使用的数据基础目录。 */
    baseDir: string;
    /** 已成功读取的地点列表。 */
    locations: LocationFile[];
    /** 已成功读取的地图列表。 */
    maps: MapFile[];
    /** 单个文件读取失败时的非致命错误。 */
    errors: string[];
  }

  /** 关系图谱模块读取结果，和 preload 暴露的数据结构保持一致。 */
  interface RelationGraphModuleResult {
    /** 当前使用的数据基础目录。 */
    baseDir: string;
    /** 已成功读取的关系图谱列表。 */
    graphs: RelationGraphFile[];
    /** 单个文件或排序元数据读取失败时的非致命错误。 */
    errors: string[];
  }

  /** 时间线模块读取结果，和 preload 暴露的数据结构保持一致。 */
  interface TimelineModuleResult {
    /** 当前使用的数据基础目录。 */
    baseDir: string;
    /** 时间线索引文件。 */
    index: TimelineIndexFile;
    /** 已成功读取的时间线列表。 */
    timelines: TimelineFile[];
    /** 每条时间线的时间块排序元数据，key 为时间线 ID。 */
    timeBlockOrders: Record<string, ListOrderFile>;
    /** 单个文件或排序元数据读取失败时的非致命错误。 */
    errors: string[];
  }

  interface Window {
    novelEngine: {
      getAppInfo: () => Promise<{
        name: string;
        version: string;
        storage: string;
      }>;
      getCurrentProject: () => Promise<CurrentProject | null>;
      restoreLastOpenedProject: () => Promise<CurrentProject | null>;
      createProject: () => Promise<CurrentProject | null>;
      openProject: () => Promise<CurrentProject | null>;
      saveProjectOverview: (title: string, description: string) => Promise<CurrentProject>;
      loadAiAssistantSettings: () => Promise<AiAssistantSettings>;
      saveRemoteAiAssistantServiceBaseUrl: (baseUrl: string) => Promise<AiAssistantSettings>;
      saveRemoteAiAssistantProjectId: (remoteProjectId: string) => Promise<AiAssistantSettings>;
      onCurrentProjectChanged: (
        listener: (project: CurrentProject | null) => void,
      ) => () => void;
      listCharacters: (baseDirPath?: string) => Promise<CharacterListResult>;
      saveCharacter: (character: CharacterFile, baseDirPath?: string) => Promise<CharacterFile>;
      deleteCharacter: (characterId: string, baseDirPath?: string) => Promise<void>;
      saveCharacterOrder: (characterIds: string[], baseDirPath?: string) => Promise<void>;
      listItems: (baseDirPath?: string) => Promise<ItemListResult>;
      saveItem: (item: ItemFile, baseDirPath?: string) => Promise<ItemFile>;
      deleteItem: (itemId: string, baseDirPath?: string) => Promise<void>;
      saveItemOrder: (itemIds: string[], baseDirPath?: string) => Promise<void>;
      listPlots: (baseDirPath?: string) => Promise<PlotListResult>;
      savePlot: (plot: PlotFile, baseDirPath?: string) => Promise<PlotFile>;
      deletePlot: (plotId: string, baseDirPath?: string) => Promise<void>;
      listMapModule: (baseDirPath?: string) => Promise<MapModuleResult>;
      saveLocation: (location: LocationFile, baseDirPath?: string) => Promise<LocationFile>;
      deleteLocation: (locationId: string, baseDirPath?: string) => Promise<void>;
      saveMap: (map: MapFile, baseDirPath?: string) => Promise<MapFile>;
      deleteMap: (mapId: string, baseDirPath?: string) => Promise<void>;
      listRelationGraphs: (baseDirPath?: string) => Promise<RelationGraphModuleResult>;
      saveRelationGraph: (
        graph: RelationGraphFile,
        baseDirPath?: string,
      ) => Promise<RelationGraphFile>;
      deleteRelationGraph: (graphId: string, baseDirPath?: string) => Promise<void>;
      saveRelationGraphOrder: (graphIds: string[], baseDirPath?: string) => Promise<void>;
      saveRelationGraphBlockOrder: (
        graphId: string,
        nodeIds: string[],
        baseDirPath?: string,
      ) => Promise<void>;
      listTimelineModule: (baseDirPath?: string) => Promise<TimelineModuleResult>;
      saveTimelineIndex: (
        index: TimelineIndexFile,
        baseDirPath?: string,
      ) => Promise<TimelineIndexFile>;
      saveTimeline: (timeline: TimelineFile, baseDirPath?: string) => Promise<TimelineFile>;
      deleteTimeline: (timelineId: string, baseDirPath?: string) => Promise<void>;
      saveTimelineTimeBlockOrder: (
        timelineId: string,
        timeBlockIds: string[],
        baseDirPath?: string,
      ) => Promise<ListOrderFile>;
    };
  }
}

export {};
