import { readdir, rm, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  ensureBaseDirectory,
  ensureDirectory,
  resolvePathInBaseDirectory,
} from '../file-system/directory';
import { loadJsonFileAs, saveJsonFile } from '../file-system/json-file-store';
import { listCharacters } from '../characters/character-service';
import {
  RELATION_GRAPH_SCHEMA_VERSION,
  createRelationGraphBlockOrderFile,
  createRelationGraphOrderFile,
  isRelationGraphBlockOrderFile,
  isRelationGraphFile,
  isRelationGraphOrderFile,
  type CharacterFile,
  type RelationGraphFile,
  type RelationGraphNode,
} from '../../../src/types';

/**
 * 关系图谱 JSON 文件服务。
 * 负责管理 `relation-graphs/*.json` 和关系图谱相关排序元数据，renderer 不直接访问文件系统。
 */

/** 关系图谱文件目录名称。 */
const RELATION_GRAPH_DIRECTORY_NAME = 'relation-graphs';

/** 列表排序元数据目录名称。 */
const LIST_ORDER_DIRECTORY_NAME = 'list-orders';

/** 关系图谱块排序目录名称。 */
const RELATION_GRAPH_BLOCK_ORDER_DIRECTORY_NAME = 'relation-graph-blocks';

/** 自定义图谱顺序文件名。 */
const RELATION_GRAPH_ORDER_FILE_NAME = 'relation-graphs.json';

/** 系统默认人物图谱 ID。 */
const DEFAULT_CHARACTER_GRAPH_ID = 'graph_default_characters';

/** 文件安全 ID 规则。 */
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 关系图谱模块读取结果，包含图谱和非致命文件错误。 */
export interface RelationGraphModuleResult {
  /** 当前使用的数据基础目录。 */
  baseDir: string;
  /** 成功读取并通过校验的关系图谱列表。 */
  graphs: RelationGraphFile[];
  /** 单个 JSON 文件或排序文件读取失败时的错误信息。 */
  errors: string[];
}

/** 排序读取结果。 */
interface RelationOrderReadResult {
  /** 已读取的 ID 顺序。 */
  ids: string[];
  /** 排序文件损坏时的可展示错误。 */
  error?: string;
}

/**
 * 校验 ID 是否可以安全用于文件名。
 * @param id 图谱、节点或关系稳定 ID
 * @param label 错误提示中的实体名称
 */
function assertSafeId(id: string, label: string): void {
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new Error(`${label} ID 只能包含字母、数字、下划线和短横线：${id}`);
  }
}

/**
 * 判断文件是否存在。
 * @param filePath 待检查路径
 */
async function fileExists(filePath: string): Promise<boolean> {
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

/**
 * 获取关系模块目录，并确保目录存在。
 * @param baseDirPath 小说项目目录
 */
async function resolveRelationDirectories(baseDirPath?: string): Promise<{
  baseDir: string;
  graphDirectory: string;
  listOrderDirectory: string;
  blockOrderDirectory: string;
}> {
  const baseDir = await ensureBaseDirectory(baseDirPath);
  const graphDirectory = resolvePathInBaseDirectory(baseDir, RELATION_GRAPH_DIRECTORY_NAME);
  const listOrderDirectory = resolvePathInBaseDirectory(baseDir, LIST_ORDER_DIRECTORY_NAME);
  const blockOrderDirectory = resolvePathInBaseDirectory(
    baseDir,
    LIST_ORDER_DIRECTORY_NAME,
    RELATION_GRAPH_BLOCK_ORDER_DIRECTORY_NAME,
  );

  await ensureDirectory(graphDirectory);
  await ensureDirectory(listOrderDirectory);
  await ensureDirectory(blockOrderDirectory);

  return {
    baseDir,
    graphDirectory,
    listOrderDirectory,
    blockOrderDirectory,
  };
}

/**
 * 根据图谱 ID 解析图谱文件路径。
 * @param graphId 图谱稳定 ID
 * @param baseDirPath 小说项目目录
 */
function resolveGraphFilePath(graphId: string, baseDirPath?: string): string {
  assertSafeId(graphId, '关系图谱');
  return resolvePathInBaseDirectory(baseDirPath, RELATION_GRAPH_DIRECTORY_NAME, `${graphId}.json`);
}

/**
 * 解析自定义图谱顺序文件路径。
 * @param baseDirPath 小说项目目录
 */
function resolveGraphOrderFilePath(baseDirPath?: string): string {
  return resolvePathInBaseDirectory(
    baseDirPath,
    LIST_ORDER_DIRECTORY_NAME,
    RELATION_GRAPH_ORDER_FILE_NAME,
  );
}

/**
 * 解析单张图谱的块排序文件路径。
 * @param graphId 图谱稳定 ID
 * @param baseDirPath 小说项目目录
 */
function resolveBlockOrderFilePath(graphId: string, baseDirPath?: string): string {
  assertSafeId(graphId, '关系图谱');
  return resolvePathInBaseDirectory(
    baseDirPath,
    LIST_ORDER_DIRECTORY_NAME,
    RELATION_GRAPH_BLOCK_ORDER_DIRECTORY_NAME,
    `${graphId}.json`,
  );
}

/**
 * 清理排序 ID 列表，避免用户手改排序文件后引入不安全路径片段。
 * @param ids 原始排序 ID
 */
function normalizeOrderIds(ids: string[]): string[] {
  const seenIds = new Set<string>();
  const result: string[] = [];

  ids.forEach((id) => {
    const normalizedId = id.trim();

    if (!normalizedId || seenIds.has(normalizedId) || !SAFE_ID_PATTERN.test(normalizedId)) {
      return;
    }

    seenIds.add(normalizedId);
    result.push(normalizedId);
  });

  return result;
}

/**
 * 按排序文件调整实体列表顺序，缺失的新实体追加在后面。
 * @param entities 实体列表
 * @param orderedIds 排序 ID
 */
function applyOrder<T extends { id: string }>(entities: T[], orderedIds: string[]): T[] {
  if (orderedIds.length === 0) {
    return entities;
  }

  const idToOrderIndex = new Map(orderedIds.map((id, index) => [id, index]));

  return [...entities].sort((left, right) => {
    const leftIndex = idToOrderIndex.get(left.id);
    const rightIndex = idToOrderIndex.get(right.id);

    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex;
    }

    if (leftIndex !== undefined) {
      return -1;
    }

    if (rightIndex !== undefined) {
      return 1;
    }

    return 0;
  });
}

/**
 * 为新增人物节点生成默认画布位置。
 * @param index 节点索引
 */
function createDefaultNodeView(index: number): { x: number; y: number } {
  const column = index % 4;
  const row = Math.floor(index / 4);

  return {
    x: 120 + column * 190,
    y: 120 + row * 130,
  };
}

/**
 * 创建系统默认人物图谱。
 * @param characters 当前小说项目人物
 */
function createDefaultCharacterGraph(characters: CharacterFile[]): RelationGraphFile {
  const now = new Date().toISOString();

  return {
    id: DEFAULT_CHARACTER_GRAPH_ID,
    name: '人物图谱',
    kind: 'character-default',
    description: '系统默认人物关系图谱，节点来自当前项目人物。',
    nodes: characters.map((character, index) => ({
      id: `node_${character.id}`,
      label: character.name,
      kind: 'entity-ref',
      entityRef: {
        type: 'character',
        id: character.id,
      },
      view: createDefaultNodeView(index),
      customFields: {},
    })),
    edges: [],
    view: {
      layout: 'manual',
      zoom: 1,
      pan: {
        x: 0,
        y: 0,
      },
    },
    createdAt: now,
    updatedAt: now,
    schemaVersion: RELATION_GRAPH_SCHEMA_VERSION,
  };
}

/**
 * 根据当前人物列表同步默认人物图谱节点。
 * 人物名称以人物文件为准，已删除人物对应节点和关系会从默认图谱中移除。
 */
function syncDefaultCharacterGraph(
  graph: RelationGraphFile,
  characters: CharacterFile[],
): RelationGraphFile {
  const existingNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const characterIds = new Set(characters.map((character) => character.id));
  const nextNodes: RelationGraphNode[] = characters.map((character, index) => {
    const nodeId = `node_${character.id}`;
    const existingNode = existingNodes.get(nodeId);

    return {
      id: nodeId,
      label: character.name,
      kind: 'entity-ref',
      entityRef: {
        type: 'character',
        id: character.id,
      },
      view: existingNode?.view ?? createDefaultNodeView(index),
      customFields: existingNode?.customFields ?? {},
    };
  });
  const nextNodeIds = new Set(nextNodes.map((node) => node.id));

  return {
    ...graph,
    id: DEFAULT_CHARACTER_GRAPH_ID,
    name: '人物图谱',
    kind: 'character-default',
    nodes: nextNodes,
    edges: graph.edges.filter((edge) => {
      const fromNode = existingNodes.get(edge.from);
      const toNode = existingNodes.get(edge.to);
      const fromCharacterId = fromNode?.entityRef?.type === 'character' ? fromNode.entityRef.id : '';
      const toCharacterId = toNode?.entityRef?.type === 'character' ? toNode.entityRef.id : '';

      return (
        nextNodeIds.has(edge.from) &&
        nextNodeIds.has(edge.to) &&
        characterIds.has(fromCharacterId) &&
        characterIds.has(toCharacterId)
      );
    }),
    updatedAt: new Date().toISOString(),
    schemaVersion: RELATION_GRAPH_SCHEMA_VERSION,
  };
}

/**
 * 读取图谱列表排序文件。
 * @param baseDir 小说项目目录
 */
async function loadGraphOrder(baseDir: string): Promise<RelationOrderReadResult> {
  const orderFilePath = resolveGraphOrderFilePath(baseDir);

  if (!(await fileExists(orderFilePath))) {
    return { ids: [] };
  }

  try {
    const orderFile = await loadJsonFileAs(orderFilePath, isRelationGraphOrderFile);

    return {
      ids: normalizeOrderIds(orderFile.ids),
    };
  } catch (error) {
    return {
      ids: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 读取某张图谱的块排序文件。
 * @param graphId 图谱 ID
 * @param baseDir 小说项目目录
 */
async function loadBlockOrder(
  graphId: string,
  baseDir: string,
): Promise<RelationOrderReadResult> {
  const orderFilePath = resolveBlockOrderFilePath(graphId, baseDir);

  if (!(await fileExists(orderFilePath))) {
    return { ids: [] };
  }

  try {
    const orderFile = await loadJsonFileAs(orderFilePath, isRelationGraphBlockOrderFile);

    if (orderFile.graphId !== graphId) {
      return {
        ids: [],
        error: `关系图谱块排序文件 graphId 不匹配：${orderFilePath}`,
      };
    }

    return {
      ids: normalizeOrderIds(orderFile.ids),
    };
  } catch (error) {
    return {
      ids: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 保存图谱列表顺序。
 * @param graphIds 自定义图谱 ID 顺序
 * @param baseDirPath 小说项目目录
 */
export async function saveRelationGraphOrder(
  graphIds: string[],
  baseDirPath?: string,
): Promise<void> {
  await resolveRelationDirectories(baseDirPath);
  const safeGraphIds = normalizeOrderIds(graphIds);
  await saveJsonFile(resolveGraphOrderFilePath(baseDirPath), createRelationGraphOrderFile(safeGraphIds));
}

/**
 * 保存某张图谱的块展示顺序。
 * @param graphId 图谱 ID
 * @param nodeIds 块 ID 顺序
 * @param baseDirPath 小说项目目录
 */
export async function saveRelationGraphBlockOrder(
  graphId: string,
  nodeIds: string[],
  baseDirPath?: string,
): Promise<void> {
  await resolveRelationDirectories(baseDirPath);
  const safeNodeIds = normalizeOrderIds(nodeIds);
  await saveJsonFile(
    resolveBlockOrderFilePath(graphId, baseDirPath),
    createRelationGraphBlockOrderFile(graphId, safeNodeIds),
  );
}

/**
 * 确保默认人物图谱存在，并同步当前人物节点。
 * @param baseDir 小说项目目录
 */
async function ensureDefaultCharacterGraph(baseDir: string): Promise<string[]> {
  const errors: string[] = [];
  const characterResult = await listCharacters(baseDir);
  const defaultGraphFilePath = resolveGraphFilePath(DEFAULT_CHARACTER_GRAPH_ID, baseDir);

  errors.push(...characterResult.errors);

  let defaultGraph: RelationGraphFile;

  if (await fileExists(defaultGraphFilePath)) {
    try {
      defaultGraph = await loadJsonFileAs(defaultGraphFilePath, isRelationGraphFile);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      defaultGraph = createDefaultCharacterGraph(characterResult.characters);
    }
  } else {
    defaultGraph = createDefaultCharacterGraph(characterResult.characters);
  }

  await saveJsonFile(
    defaultGraphFilePath,
    syncDefaultCharacterGraph(defaultGraph, characterResult.characters),
  );

  return errors;
}

/**
 * 读取关系图谱模块全部图谱。
 * @param baseDirPath 小说项目目录
 */
export async function listRelationGraphs(
  baseDirPath?: string,
): Promise<RelationGraphModuleResult> {
  const { baseDir, graphDirectory } = await resolveRelationDirectories(baseDirPath);
  const errors = await ensureDefaultCharacterGraph(baseDir);
  const entries = await readdir(graphDirectory, { withFileTypes: true });
  const graphs: RelationGraphFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.json') {
      continue;
    }

    const filePath = resolvePathInBaseDirectory(baseDir, RELATION_GRAPH_DIRECTORY_NAME, entry.name);

    try {
      const graph = await loadJsonFileAs(filePath, isRelationGraphFile);
      const blockOrderResult = await loadBlockOrder(graph.id, baseDir);

      if (blockOrderResult.error) {
        errors.push(blockOrderResult.error);
      }

      graphs.push({
        ...graph,
        nodes: applyOrder(graph.nodes, blockOrderResult.ids),
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const defaultGraph = graphs.find((graph) => graph.id === DEFAULT_CHARACTER_GRAPH_ID);
  const customGraphs = graphs.filter((graph) => graph.kind === 'custom');
  const graphOrderResult = await loadGraphOrder(baseDir);

  if (graphOrderResult.error) {
    errors.push(graphOrderResult.error);
  }

  return {
    baseDir,
    graphs: [
      ...(defaultGraph ? [defaultGraph] : []),
      ...applyOrder(customGraphs, graphOrderResult.ids),
    ],
    errors,
  };
}

/**
 * 保存单张关系图谱 JSON 文件。
 * @param graph 待保存图谱
 * @param baseDirPath 小说项目目录
 */
export async function saveRelationGraph(
  graph: RelationGraphFile,
  baseDirPath?: string,
): Promise<RelationGraphFile> {
  if (!isRelationGraphFile(graph)) {
    throw new Error('关系图谱数据结构校验失败，未写入 JSON 文件');
  }

  await resolveRelationDirectories(baseDirPath);
  const nextGraph: RelationGraphFile = {
    ...graph,
    updatedAt: new Date().toISOString(),
  };

  await saveJsonFile(resolveGraphFilePath(graph.id, baseDirPath), nextGraph);

  return nextGraph;
}

/**
 * 删除自定义关系图谱。
 * @param graphId 待删除图谱 ID
 * @param baseDirPath 小说项目目录
 */
export async function deleteRelationGraphFile(
  graphId: string,
  baseDirPath?: string,
): Promise<void> {
  if (graphId === DEFAULT_CHARACTER_GRAPH_ID) {
    throw new Error('人物图谱是系统默认图谱，不能删除');
  }

  const { baseDir } = await resolveRelationDirectories(baseDirPath);
  await rm(resolveGraphFilePath(graphId, baseDir), { force: true });
  await rm(resolveBlockOrderFilePath(graphId, baseDir), { force: true });

  const graphOrderResult = await loadGraphOrder(baseDir);
  await saveRelationGraphOrder(
    graphOrderResult.ids.filter((id) => id !== graphId),
    baseDir,
  );
}
