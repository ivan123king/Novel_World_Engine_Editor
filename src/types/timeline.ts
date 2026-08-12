import type { JsonObject } from './json-value';

/** 时间线索引和单条时间线文件结构版本。 */
export const TIMELINE_SCHEMA_VERSION = 1;

/** 时间线事件结构版本。 */
export const TIMELINE_EVENT_SCHEMA_VERSION = 1;

/**
 * 时间线索引条目。
 * 用于多时间线下拉框，只保存轻量名称和稳定 ID。
 */
export interface TimelineIndexEntry {
  /** 时间线稳定 ID，不随显示名称变化。 */
  id: string;

  /** 时间线显示名称，例如：主线时间线、战争线。 */
  name: string;
}

/**
 * 时间线索引文件。
 * 后续真实持久化时对应 novel-project/timeline/timelines.json。
 */
export interface TimelineIndexFile {
  /** 上次选中的时间线 ID，用于恢复页面状态。 */
  activeTimelineId: string | null;

  /** 当前小说项目下的时间线索引列表。 */
  timelines: TimelineIndexEntry[];

  /** 索引文件结构版本。 */
  schemaVersion: typeof TIMELINE_SCHEMA_VERSION;
}

/**
 * 时间块结构。
 * 时间块是时间线主轴节点，只包含时间名和别名。
 * 展示顺序统一由 list-order 元数据保存，不写入时间块题材数据。
 */
export interface TimelineTimeBlock {
  /** 时间块稳定 ID，用于事件归属引用。 */
  id: string;

  /** 时间名，例如：元年、公元202年、公元202年2月。 */
  name: string;

  /** 别名列表，不同历法、国家或角色视角下的时间称呼。 */
  aliases: string[];

}

/** 时间线事件布局。 */
export interface TimelineEventLayout {
  /** 事件在当前时间块中的平铺顺序，数值越小越靠前。 */
  row: number;

  /** 保留字段，第一版固定为 1，避免旧 mock 数据和后续迁移断裂。 */
  column: number;
}

/** 时间线事件自定义字段。 */
export type TimelineCustomFields = JsonObject;

/**
 * 时间线事件结构。
 * 卡片只展示 title 和所属时间，content 与 customFields 放入详情弹框。
 */
export interface TimelineEvent {
  /** 事件稳定 ID。 */
  id: string;

  /** 所属时间块 ID。 */
  timeBlockId: string;

  /** 时间块内的具体时间，例如：3月、初七、午后。 */
  specificTime: string;

  /** 事件标题。 */
  title: string;

  /** 事件完整内容，可能很长，只在详情弹框展示。 */
  content: string;

  /** 事件在当前时间块事件区中的布局位置。 */
  layout: TimelineEventLayout;

  /** 作者自定义字段，人物、地点、物品、剧情线等都放在这里。 */
  customFields: TimelineCustomFields;

  /** 事件结构版本。 */
  schemaVersion: typeof TIMELINE_EVENT_SCHEMA_VERSION;
}

/**
 * 单条时间线文件。
 * 后续真实持久化时对应 novel-project/timeline/timeline_xxx.json。
 */
export interface TimelineFile {
  /** 时间线稳定 ID。 */
  id: string;

  /** 时间线显示名称。 */
  name: string;

  /** 时间线主轴时间块。 */
  timeBlocks: TimelineTimeBlock[];

  /** 当前时间线下的事件。 */
  events: TimelineEvent[];

  /** 时间线文件结构版本。 */
  schemaVersion: typeof TIMELINE_SCHEMA_VERSION;
}

/**
 * 创建空时间线索引文件。
 * @param activeTimelineId 默认激活的时间线 ID
 */
export function createEmptyTimelineIndex(activeTimelineId: string | null = null): TimelineIndexFile {
  return {
    activeTimelineId,
    timelines: [],
    schemaVersion: TIMELINE_SCHEMA_VERSION,
  };
}

/**
 * 创建空时间线文件。
 * @param id 时间线 ID
 * @param name 时间线名称
 */
export function createEmptyTimelineFile(id: string, name = '新时间线'): TimelineFile {
  return {
    id,
    name,
    timeBlocks: [],
    events: [],
    schemaVersion: TIMELINE_SCHEMA_VERSION,
  };
}

/**
 * 创建时间块。
 * @param id 时间块 ID
 * @param name 时间名
 */
export function createTimelineTimeBlock(
  id: string,
  name = '新时间',
): TimelineTimeBlock {
  return {
    id,
    name,
    aliases: [],
  };
}

/**
 * 创建时间线事件。
 * @param id 事件 ID
 * @param timeBlockId 所属时间块 ID
 * @param row 事件顺序
 * @param column 保留列字段，第一版固定为 1
 */
export function createTimelineEvent(
  id: string,
  timeBlockId: string,
  row = 1,
  column = 1,
): TimelineEvent {
  return {
    id,
    timeBlockId,
    specificTime: '',
    title: '新事件',
    content: '',
    layout: {
      row,
      column,
    },
    customFields: {},
    schemaVersion: TIMELINE_EVENT_SCHEMA_VERSION,
  };
}

/** 判断未知值是否是时间线索引条目。 */
export function isTimelineIndexEntry(value: unknown): value is TimelineIndexEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<TimelineIndexEntry>;
  return typeof data.id === 'string' && typeof data.name === 'string';
}

/** 判断未知值是否是时间线索引文件。 */
export function isTimelineIndexFile(value: unknown): value is TimelineIndexFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<TimelineIndexFile>;
  return (
    (typeof data.activeTimelineId === 'string' || data.activeTimelineId === null) &&
    Array.isArray(data.timelines) &&
    data.timelines.every(isTimelineIndexEntry) &&
    data.schemaVersion === TIMELINE_SCHEMA_VERSION
  );
}

/** 判断未知值是否是时间块。 */
export function isTimelineTimeBlock(value: unknown): value is TimelineTimeBlock {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<TimelineTimeBlock>;
  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    Array.isArray(data.aliases) &&
    data.aliases.every((alias) => typeof alias === 'string')
  );
}

/** 判断未知值是否是事件布局。 */
export function isTimelineEventLayout(value: unknown): value is TimelineEventLayout {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<TimelineEventLayout>;
  return (
    typeof data.row === 'number' &&
    Number.isFinite(data.row) &&
    typeof data.column === 'number' &&
    Number.isFinite(data.column)
  );
}

/** 判断未知值是否是可保存 JSON 值。 */
function isJsonValue(value: unknown): boolean {
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

/** 判断未知值是否是时间线事件。 */
export function isTimelineEvent(value: unknown): value is TimelineEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<TimelineEvent>;
  return (
    typeof data.id === 'string' &&
    typeof data.timeBlockId === 'string' &&
    typeof data.specificTime === 'string' &&
    typeof data.title === 'string' &&
    typeof data.content === 'string' &&
    isTimelineEventLayout(data.layout) &&
    typeof data.customFields === 'object' &&
    data.customFields !== null &&
    isJsonValue(data.customFields) &&
    data.schemaVersion === TIMELINE_EVENT_SCHEMA_VERSION
  );
}

/** 判断未知值是否是单条时间线文件。 */
export function isTimelineFile(value: unknown): value is TimelineFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<TimelineFile>;
  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    Array.isArray(data.timeBlocks) &&
    data.timeBlocks.every(isTimelineTimeBlock) &&
    Array.isArray(data.events) &&
    data.events.every(isTimelineEvent) &&
    data.schemaVersion === TIMELINE_SCHEMA_VERSION
  );
}
