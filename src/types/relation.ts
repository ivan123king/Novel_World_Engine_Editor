import type { JsonObject, JsonValue } from './json-value';

/** 关系图谱文件的当前 schema 版本。 */
export const RELATION_GRAPH_SCHEMA_VERSION = 1;

/** 关系图谱类型，区分系统默认人物图谱和作者自定义图谱。 */
export type RelationGraphKind = 'character-default' | 'custom';

/** 图谱节点引用的小说项目实体类型。 */
export type RelationEntityRefType = 'character' | 'item' | 'location' | 'faction' | 'event' | 'other';

/** 关系图谱节点类型，第一版主要使用实体引用节点和纯图谱块。 */
export type RelationNodeKind = 'entity-ref' | 'graph-block';

/** 关系图谱节点引用的外部实体信息。 */
export interface RelationEntityRef {
  /** 被引用实体所属模块。 */
  type: RelationEntityRefType;
  /** 被引用实体稳定 ID。 */
  id: string;
}

/** 关系图谱节点在画布中的展示偏好。 */
export interface RelationNodeView {
  /** 节点在领域画布坐标系中的横向位置。 */
  x: number;
  /** 节点在领域画布坐标系中的纵向位置。 */
  y: number;
}

/** 关系图谱节点，代表人物、势力、地点或作者创建的图谱块。 */
export interface RelationGraphNode {
  /** 节点稳定 ID。 */
  id: string;
  /** 节点展示名称。 */
  label: string;
  /** 节点来源类型。 */
  kind: RelationNodeKind;
  /** 可选实体引用，用于后续跨模块引用。 */
  entityRef?: RelationEntityRef;
  /** 画布展示位置。 */
  view: RelationNodeView;
  /** 作者自定义扩展字段，读取保存时必须保留。 */
  customFields: JsonObject;
}

/** 当前成立的关系状态，用于画布连线展示。 */
export interface RelationCurrentState {
  /** 当前关系名称。 */
  type: string;
  /** 可选关系强度，数值越高代表关系越强烈。 */
  score?: number;
  /** 当前关系成立的原因。 */
  reason: string;
}

/** 关系变化历史记录，用于右侧时间轴解释关系如何变化。 */
export interface RelationHistoryRecord {
  /** 历史记录稳定 ID。 */
  id: string;
  /** 作者输入的时间标记。 */
  label: string;
  /** 可选排序值，不强制等同章节号。 */
  order?: number;
  /** 当时的关系名称。 */
  type: string;
  /** 当时的关系强度。 */
  score?: number;
  /** 关系变化原因。 */
  reason: string;
  /** 创建时间，排序值缺失时可作为兜底排序依据。 */
  createdAt?: string;
}

/** 关系图谱中的一条当前关系边。 */
export interface RelationGraphEdge {
  /** 关系边稳定 ID。 */
  id: string;
  /** 起点节点 ID。 */
  from: string;
  /** 终点节点 ID。 */
  to: string;
  /** 当前关系状态。 */
  current: RelationCurrentState;
  /** 关系变化历史。 */
  history: RelationHistoryRecord[];
  /** 作者自定义扩展字段，读取保存时必须保留。 */
  customFields: JsonObject;
}

/** 关系图谱画布视图偏好。 */
export interface RelationGraphView {
  /** 当前布局名称。 */
  layout: string;
  /** 当前缩放比例。 */
  zoom: number;
  /** 当前画布平移量。 */
  pan: {
    x: number;
    y: number;
  };
}

/** 单张关系图谱文件结构。 */
export interface RelationGraphFile {
  /** 图谱稳定 ID。 */
  id: string;
  /** 图谱展示名称。 */
  name: string;
  /** 图谱类型。 */
  kind: RelationGraphKind;
  /** 图谱说明。 */
  description: string;
  /** 图谱节点列表。 */
  nodes: RelationGraphNode[];
  /** 当前成立的关系边列表。 */
  edges: RelationGraphEdge[];
  /** 画布视图偏好。 */
  view: RelationGraphView;
  /** 创建时间。 */
  createdAt: string;
  /** 更新时间。 */
  updatedAt: string;
  /** schema 版本。 */
  schemaVersion: number;
}

/** 关系图谱列表排序元数据文件。 */
export interface RelationGraphOrderFile {
  /** 排序所属实体类型。 */
  entityType: 'relation-graphs';
  /** 自定义图谱 ID 展示顺序。 */
  ids: string[];
  /** schema 版本。 */
  schemaVersion: typeof RELATION_GRAPH_SCHEMA_VERSION;
}

/** 单张图谱的块列表排序元数据文件。 */
export interface RelationGraphBlockOrderFile {
  /** 排序所属实体类型。 */
  entityType: 'relation-graph-blocks';
  /** 当前排序所属图谱 ID。 */
  graphId: string;
  /** 块节点 ID 展示顺序。 */
  ids: string[];
  /** schema 版本。 */
  schemaVersion: typeof RELATION_GRAPH_SCHEMA_VERSION;
}

/**
 * 判断未知值是否为可保存的 JSON 值。
 * @param value 待判断的未知值
 */
function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }

  const valueType = typeof value;

  if (valueType === 'string' || valueType === 'boolean') {
    return true;
  }

  if (valueType === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (valueType === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

/**
 * 判断未知值是否为 JSON 对象。
 * @param value 待判断的未知值
 */
function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && isJsonValue(value);
}

/**
 * 判断未知值是否为关系图谱节点。
 * @param value 待判断的未知值
 */
function isRelationGraphNode(value: unknown): value is RelationGraphNode {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<RelationGraphNode>;
  const entityRefIsValid =
    data.entityRef === undefined ||
    (
      typeof data.entityRef === 'object' &&
      data.entityRef !== null &&
      typeof data.entityRef.id === 'string' &&
      (
        data.entityRef.type === 'character' ||
        data.entityRef.type === 'item' ||
        data.entityRef.type === 'location' ||
        data.entityRef.type === 'faction' ||
        data.entityRef.type === 'event' ||
        data.entityRef.type === 'other'
      )
    );

  return (
    typeof data.id === 'string' &&
    typeof data.label === 'string' &&
    (data.kind === 'entity-ref' || data.kind === 'graph-block') &&
    entityRefIsValid &&
    typeof data.view === 'object' &&
    data.view !== null &&
    typeof data.view.x === 'number' &&
    Number.isFinite(data.view.x) &&
    typeof data.view.y === 'number' &&
    Number.isFinite(data.view.y) &&
    isJsonObject(data.customFields)
  );
}

/**
 * 判断未知值是否为当前关系状态。
 * @param value 待判断的未知值
 */
function isRelationCurrentState(value: unknown): value is RelationCurrentState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<RelationCurrentState>;
  const scoreIsValid =
    data.score === undefined || (typeof data.score === 'number' && Number.isFinite(data.score));

  return typeof data.type === 'string' && scoreIsValid && typeof data.reason === 'string';
}

/**
 * 判断未知值是否为关系历史记录。
 * @param value 待判断的未知值
 */
function isRelationHistoryRecord(value: unknown): value is RelationHistoryRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<RelationHistoryRecord>;
  const orderIsValid =
    data.order === undefined || (typeof data.order === 'number' && Number.isFinite(data.order));
  const scoreIsValid =
    data.score === undefined || (typeof data.score === 'number' && Number.isFinite(data.score));
  const createdAtIsValid = data.createdAt === undefined || typeof data.createdAt === 'string';

  return (
    typeof data.id === 'string' &&
    typeof data.label === 'string' &&
    orderIsValid &&
    typeof data.type === 'string' &&
    scoreIsValid &&
    typeof data.reason === 'string' &&
    createdAtIsValid
  );
}

/**
 * 判断未知值是否为关系图谱边。
 * @param value 待判断的未知值
 */
function isRelationGraphEdge(value: unknown): value is RelationGraphEdge {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<RelationGraphEdge>;

  return (
    typeof data.id === 'string' &&
    typeof data.from === 'string' &&
    typeof data.to === 'string' &&
    isRelationCurrentState(data.current) &&
    Array.isArray(data.history) &&
    data.history.every(isRelationHistoryRecord) &&
    isJsonObject(data.customFields)
  );
}

/**
 * 判断未知值是否为关系图谱文件。
 * @param value 待判断的未知值
 */
export function isRelationGraphFile(value: unknown): value is RelationGraphFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<RelationGraphFile>;

  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    (data.kind === 'character-default' || data.kind === 'custom') &&
    typeof data.description === 'string' &&
    Array.isArray(data.nodes) &&
    data.nodes.every(isRelationGraphNode) &&
    Array.isArray(data.edges) &&
    data.edges.every(isRelationGraphEdge) &&
    typeof data.view === 'object' &&
    data.view !== null &&
    typeof data.view.layout === 'string' &&
    typeof data.view.zoom === 'number' &&
    Number.isFinite(data.view.zoom) &&
    typeof data.view.pan === 'object' &&
    data.view.pan !== null &&
    typeof data.view.pan.x === 'number' &&
    Number.isFinite(data.view.pan.x) &&
    typeof data.view.pan.y === 'number' &&
    Number.isFinite(data.view.pan.y) &&
    typeof data.createdAt === 'string' &&
    typeof data.updatedAt === 'string' &&
    data.schemaVersion === RELATION_GRAPH_SCHEMA_VERSION
  );
}

/**
 * 创建关系图谱列表排序文件。
 * @param ids 自定义图谱 ID 顺序
 */
export function createRelationGraphOrderFile(ids: string[]): RelationGraphOrderFile {
  return {
    entityType: 'relation-graphs',
    ids,
    schemaVersion: RELATION_GRAPH_SCHEMA_VERSION,
  };
}

/**
 * 创建关系图谱块排序文件。
 * @param graphId 图谱 ID
 * @param ids 块 ID 顺序
 */
export function createRelationGraphBlockOrderFile(
  graphId: string,
  ids: string[],
): RelationGraphBlockOrderFile {
  return {
    entityType: 'relation-graph-blocks',
    graphId,
    ids,
    schemaVersion: RELATION_GRAPH_SCHEMA_VERSION,
  };
}

/**
 * 判断未知值是否为关系图谱列表排序文件。
 * @param value 待判断的未知值
 */
export function isRelationGraphOrderFile(value: unknown): value is RelationGraphOrderFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<RelationGraphOrderFile>;

  return (
    data.entityType === 'relation-graphs' &&
    Array.isArray(data.ids) &&
    data.ids.every((id) => typeof id === 'string') &&
    data.schemaVersion === RELATION_GRAPH_SCHEMA_VERSION
  );
}

/**
 * 判断未知值是否为关系图谱块排序文件。
 * @param value 待判断的未知值
 */
export function isRelationGraphBlockOrderFile(
  value: unknown,
): value is RelationGraphBlockOrderFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<RelationGraphBlockOrderFile>;

  return (
    data.entityType === 'relation-graph-blocks' &&
    typeof data.graphId === 'string' &&
    Array.isArray(data.ids) &&
    data.ids.every((id) => typeof id === 'string') &&
    data.schemaVersion === RELATION_GRAPH_SCHEMA_VERSION
  );
}
