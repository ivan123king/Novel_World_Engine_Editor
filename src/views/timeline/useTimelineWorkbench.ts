import { computed, ref } from 'vue';
import {
  createTimelineFile as createTimelineFileInApi,
  deleteTimeline as deleteTimelineFile,
  listTimelineModule,
  saveTimeline,
  saveTimelineIndex,
  saveTimelineTimeBlockOrder,
} from '@/api/timelineApi';
import {
  TIMELINE_SCHEMA_VERSION,
  createEmptyTimelineFile,
  createEmptyTimelineIndex,
  createTimelineEvent,
  createTimelineTimeBlock,
  type JsonValue,
  type ListOrderFile,
  type TimelineEvent,
  type TimelineFile,
  type TimelineIndexFile,
  type TimelineTimeBlock,
} from '@/types';
import { getSimpleRichTextEditorHtml } from '@/components/common/simpleRichTextContent';

/** 时间块拖放插入位置。 */
export type TimelineTimeBlockDropPlacement = 'before' | 'after';

/** 事件拖放插入位置。 */
export type TimelineEventDropPlacement = 'before' | 'after';

/** 自定义字段表单行。 */
export interface TimelineCustomFieldRow {
  /** 表单行稳定 ID，用于 Vue 列表渲染。 */
  id: string;
  /** 自定义字段名。 */
  key: string;
  /** 自定义字段值文本，可解析为 JSON。 */
  value: string;
}

/** 时间块表单。 */
export interface TimelineTimeBlockFormValues {
  name: string;
  aliases: string[];
}

/** 事件详情表单。 */
export interface TimelineEventFormValues {
  timeBlockId: string;
  specificTime: string;
  title: string;
  content: string;
  customFields: TimelineCustomFieldRow[];
}

/** 时间块弹框模式。 */
export type TimelineTimeBlockDialogMode = 'create' | 'view' | 'edit';

/** 事件详情弹框模式。 */
export type TimelineEventDialogMode = 'create' | 'view' | 'edit';

/** 自定义属性行 ID 计数器，保证页面会话内 key 稳定。 */
let customFieldRowSeed = 0;

/** 创建自定义字段表单行。 */
export function createTimelineCustomFieldRow(key = '', value = ''): TimelineCustomFieldRow {
  customFieldRowSeed += 1;

  return {
    id: `timeline_custom_field_${Date.now()}_${customFieldRowSeed}`,
    key,
    value,
  };
}

/** 判断未知值是否可以保存为 JSON。 */
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

/** 深拷贝时间线文件，避免回滚时共享嵌套引用。 */
function cloneTimeline(timeline: TimelineFile): TimelineFile {
  return JSON.parse(JSON.stringify(timeline)) as TimelineFile;
}

/** 深拷贝事件。 */
function cloneTimelineEvent(event: TimelineEvent): TimelineEvent {
  return JSON.parse(JSON.stringify(event)) as TimelineEvent;
}

/** 创建稳定 ID。 */
function createEntityId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 将未知错误转换为页面可读文本。 */
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 格式化自定义字段值到表单文本。 */
function stringifyCustomFieldValue(value: JsonValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

/** 将表单文本解析为 JSON 值；无法解析时按字符串保存。 */
function parseCustomFieldValue(rawValue: string): JsonValue {
  const valueText = rawValue.trim();

  if (!valueText) {
    return '';
  }

  try {
    const parsedValue = JSON.parse(valueText) as unknown;
    return isJsonValue(parsedValue) ? parsedValue : valueText;
  } catch {
    return valueText;
  }
}

/** 根据事件创建详情表单。 */
function createEventFormValues(event?: TimelineEvent, fallbackTimeBlockId = ''): TimelineEventFormValues {
  const customFieldRows = event
    ? Object.entries(event.customFields).map(([key, value]) =>
        createTimelineCustomFieldRow(key, stringifyCustomFieldValue(value)),
      )
    : [];

  return {
    timeBlockId: event?.timeBlockId ?? fallbackTimeBlockId,
    specificTime: event?.specificTime ?? '',
    title: event?.title ?? '新事件',
    content: event ? getSimpleRichTextEditorHtml(event.content) : '',
    customFields: customFieldRows.length > 0 ? customFieldRows : [createTimelineCustomFieldRow()],
  };
}

/** 将自定义字段表单转换为 JSON 对象。 */
function normalizeCustomFields(rows: TimelineCustomFieldRow[]): Record<string, JsonValue> {
  return rows.reduce<Record<string, JsonValue>>((fields, row) => {
    const fieldKey = row.key.trim();

    if (!fieldKey) {
      return fields;
    }

    fields[fieldKey] = parseCustomFieldValue(row.value);
    return fields;
  }, {});
}

/** 根据 list-order 元数据恢复时间块展示顺序，顺序为从新到旧。 */
function applyTimeBlockOrder(
  timeBlocks: TimelineTimeBlock[],
  orderFile?: ListOrderFile,
): TimelineTimeBlock[] {
  if (!orderFile) {
    return [...timeBlocks];
  }

  const timeBlockById = new Map(timeBlocks.map((timeBlock) => [timeBlock.id, timeBlock]));
  const orderedTimeBlocks = orderFile.ids
    .map((timeBlockId) => timeBlockById.get(timeBlockId))
    .filter((timeBlock): timeBlock is TimelineTimeBlock => Boolean(timeBlock));
  const orderedIds = new Set(orderedTimeBlocks.map((timeBlock) => timeBlock.id));
  const missingTimeBlocks = timeBlocks.filter((timeBlock) => !orderedIds.has(timeBlock.id));

  return [...orderedTimeBlocks, ...missingTimeBlocks];
}

/** 按事件顺序排序，数值越小越靠前。 */
function sortEventsByLayout(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((first, second) => first.layout.row - second.layout.row);
}

/** 归一化指定时间块下事件顺序。 */
function normalizeEventLayouts(events: TimelineEvent[], timeBlockId: string): TimelineEvent[] {
  const otherEvents = events.filter((event) => event.timeBlockId !== timeBlockId);
  const normalizedTargetEvents = events
    .filter((event) => event.timeBlockId === timeBlockId)
    .sort((first, second) => first.layout.row - second.layout.row)
    .map((event, index) => ({
      ...event,
      layout: {
        column: 1,
        row: index + 1,
      },
    }));

  return [...otherEvents, ...normalizedTargetEvents];
}

/** 按当前数组顺序归一化指定时间块下事件顺序，避免拖拽插入结果被旧 row 再次排序覆盖。 */
function normalizeEventLayoutsByCurrentOrder(events: TimelineEvent[], timeBlockId: string): TimelineEvent[] {
  const otherEvents = events.filter((event) => event.timeBlockId !== timeBlockId);
  const normalizedTargetEvents = events
    .filter((event) => event.timeBlockId === timeBlockId)
    .map((event, index) => ({
      ...event,
      layout: {
        column: 1,
        row: index + 1,
      },
    }));

  return [...otherEvents, ...normalizedTargetEvents];
}

/** 将事件移动到目标事件前后。 */
function moveEventNear(
  events: TimelineEvent[],
  movedId: string,
  targetId: string,
  placement: TimelineEventDropPlacement,
): TimelineEvent[] {
  if (movedId === targetId) {
    return events;
  }

  const movedEvent = events.find((event) => event.id === movedId);
  const targetEvent = events.find((event) => event.id === targetId);

  if (!movedEvent || !targetEvent || movedEvent.timeBlockId !== targetEvent.timeBlockId) {
    return events;
  }

  const sameTimeEvents = sortEventsByLayout(
    events.filter((event) => event.timeBlockId === movedEvent.timeBlockId && event.id !== movedId),
  );
  const targetIndex = sameTimeEvents.findIndex((event) => event.id === targetId);
  const insertIndex = placement === 'after' ? targetIndex + 1 : targetIndex;

  sameTimeEvents.splice(Math.max(0, insertIndex), 0, movedEvent);

  return normalizeEventLayoutsByCurrentOrder(
    [...events.filter((event) => event.timeBlockId !== movedEvent.timeBlockId), ...sameTimeEvents],
    movedEvent.timeBlockId,
  );
}

/** 管理时间线页面数据、表单和拖拽状态。 */
export function useTimelineWorkbench() {
  const timelineIndex = ref<TimelineIndexFile>(createEmptyTimelineIndex(null));
  const timelines = ref<TimelineFile[]>([]);
  const timeBlockOrders = ref<Record<string, ListOrderFile>>({});
  const selectedTimelineId = ref<string | null>(null);
  const selectedTimeBlockId = ref<string | null>(null);
  const inspectedEvent = ref<TimelineEvent | null>(null);
  const editingTimeBlockId = ref<string | null>(null);
  const editingEventId = ref<string | null>(null);
  const isTimeBlockDialogOpen = ref(false);
  const timeBlockDialogMode = ref<TimelineTimeBlockDialogMode>('create');
  const isEventDetailDialogOpen = ref(false);
  const eventDialogMode = ref<TimelineEventDialogMode>('view');
  const timeBlockFormValues = ref<TimelineTimeBlockFormValues>({
    name: '新时间',
    aliases: [],
  });
  const eventFormValues = ref<TimelineEventFormValues>(createEventFormValues());
  const isLoading = ref(false);
  const isSaving = ref(false);
  const loadError = ref('');
  const saveError = ref('');
  const fileErrors = ref<string[]>([]);
  const dataDirectory = ref('');
  const draggingTimeBlockId = ref<string | null>(null);
  const dragOverTimeBlockId = ref<string | null>(null);
  const timeBlockDropPlacement = ref<TimelineTimeBlockDropPlacement>('before');
  const draggingEventId = ref<string | null>(null);
  const dragOverEventId = ref<string | null>(null);
  const eventDropPlacement = ref<TimelineEventDropPlacement>('before');
  const selectedEventId = ref<string | null>(null);

  const timelineOptions = computed(() => timelineIndex.value.timelines);
  const selectedTimeline = computed(
    () => timelines.value.find((timeline) => timeline.id === selectedTimelineId.value) ?? null,
  );
  const orderedTimeBlocks = computed(() =>
    selectedTimeline.value
      ? applyTimeBlockOrder(
          selectedTimeline.value.timeBlocks,
          timeBlockOrders.value[selectedTimeline.value.id],
        )
      : [],
  );
  const selectedTimeBlock = computed(
    () => orderedTimeBlocks.value.find((timeBlock) => timeBlock.id === selectedTimeBlockId.value) ?? null,
  );
  const selectedTimeBlockEvents = computed(() =>
    selectedTimeline.value && selectedTimeBlockId.value
      ? sortEventsByLayout(
          selectedTimeline.value.events.filter((event) => event.timeBlockId === selectedTimeBlockId.value),
        )
      : [],
  );
  const hasErrorMessage = computed(() => Boolean(loadError.value || saveError.value || fileErrors.value.length));
  const canSubmitTimeBlock = computed(() => timeBlockFormValues.value.name.trim().length > 0);
  const canSubmitEvent = computed(
    () => eventFormValues.value.timeBlockId.length > 0 && eventFormValues.value.title.trim().length > 0,
  );

  /** 设置当前时间线文件。 */
  function replaceTimeline(nextTimeline: TimelineFile): void {
    timelines.value = timelines.value.map((timeline) =>
      timeline.id === nextTimeline.id ? nextTimeline : timeline,
    );
  }

  /** 保存当前时间线。 */
  async function persistSelectedTimeline(nextTimeline: TimelineFile): Promise<TimelineFile> {
    const normalizedTimeline: TimelineFile = {
      ...nextTimeline,
      schemaVersion: TIMELINE_SCHEMA_VERSION,
    };
    const savedTimeline = await saveTimeline(normalizedTimeline);
    replaceTimeline(savedTimeline);
    return savedTimeline;
  }

  /** 保存时间线索引。 */
  async function persistTimelineIndex(nextIndex: TimelineIndexFile): Promise<TimelineIndexFile> {
    const savedIndex = await saveTimelineIndex(nextIndex);
    timelineIndex.value = savedIndex;
    return savedIndex;
  }

  /** 保存当前时间线的时间块展示顺序到 list-order 元数据。 */
  async function persistTimeBlockOrder(timelineId: string, orderedTimeBlockIds: string[]): Promise<void> {
    const savedOrder = await saveTimelineTimeBlockOrder(timelineId, orderedTimeBlockIds);
    timeBlockOrders.value = {
      ...timeBlockOrders.value,
      [timelineId]: savedOrder,
    };
  }

  /** 读取时间线模块数据。 */
  async function loadTimelines(): Promise<void> {
    isLoading.value = true;
    loadError.value = '';
    saveError.value = '';

    try {
      const result = await listTimelineModule();
      timelineIndex.value = result.index;
      timelines.value = result.timelines;
      timeBlockOrders.value = result.timeBlockOrders;
      fileErrors.value = result.errors;
      dataDirectory.value = result.baseDir;
      selectedTimelineId.value =
        result.index.activeTimelineId ??
        result.index.timelines[0]?.id ??
        result.timelines[0]?.id ??
        null;

      const timeline = timelines.value.find((item) => item.id === selectedTimelineId.value);
      selectedTimeBlockId.value = timeline
        ? applyTimeBlockOrder(timeline.timeBlocks, result.timeBlockOrders[timeline.id])[0]?.id ?? null
        : null;
    } catch (error) {
      loadError.value = formatError(error);
      timelineIndex.value = createEmptyTimelineIndex(null);
      timelines.value = [];
      selectedTimelineId.value = null;
      selectedTimeBlockId.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  /** 选择当前时间线，并保存 activeTimelineId。 */
  async function selectTimeline(timelineId: string): Promise<void> {
    const nextTimeline = timelines.value.find((timeline) => timeline.id === timelineId);

    if (!nextTimeline) {
      return;
    }

    selectedTimelineId.value = timelineId;
    selectedTimeBlockId.value = applyTimeBlockOrder(
      nextTimeline.timeBlocks,
      timeBlockOrders.value[nextTimeline.id],
    )[0]?.id ?? null;
    inspectedEvent.value = null;
    selectedEventId.value = null;
    await persistTimelineIndex({
      ...timelineIndex.value,
      activeTimelineId: timelineId,
    });
  }

  /** 新建时间线。 */
  async function createTimeline(): Promise<void> {
    isSaving.value = true;
    saveError.value = '';

    try {
      const timelineId = createEntityId('timeline');
      const timelineName = '新时间线';
      const timeline = await createTimelineFileInApi(timelineId, timelineName);
      timelines.value = [...timelines.value, timeline];

      const nextIndex: TimelineIndexFile = {
        ...timelineIndex.value,
        activeTimelineId: timelineId,
        timelines: [
          ...timelineIndex.value.timelines,
          {
            id: timelineId,
            name: timelineName,
          },
        ],
      };

      await persistTimelineIndex(nextIndex);
      selectedTimelineId.value = timelineId;
      selectedTimeBlockId.value = null;
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 重命名当前时间线。 */
  async function renameSelectedTimeline(name: string): Promise<void> {
    const currentTimeline = selectedTimeline.value;
    const nextName = name.trim();

    if (!currentTimeline || !nextName) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      const savedTimeline = await persistSelectedTimeline({
        ...currentTimeline,
        name: nextName,
      });
      await persistTimelineIndex({
        ...timelineIndex.value,
        timelines: timelineIndex.value.timelines.map((timeline) =>
          timeline.id === savedTimeline.id ? { ...timeline, name: nextName } : timeline,
        ),
      });
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 删除当前时间线。 */
  async function deleteSelectedTimeline(): Promise<void> {
    const currentTimeline = selectedTimeline.value;

    if (!currentTimeline || !window.confirm(`确认删除时间线“${currentTimeline.name}”吗？`)) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      await deleteTimelineFile(currentTimeline.id);
      timelines.value = timelines.value.filter((timeline) => timeline.id !== currentTimeline.id);
      const nextTimelineEntries = timelineIndex.value.timelines.filter(
        (timeline) => timeline.id !== currentTimeline.id,
      );
      const nextActiveTimelineId = nextTimelineEntries[0]?.id ?? null;

      await persistTimelineIndex({
        ...timelineIndex.value,
        activeTimelineId: nextActiveTimelineId,
        timelines: nextTimelineEntries,
      });
      selectedTimelineId.value = nextActiveTimelineId;
      selectedTimeBlockId.value = timelines.value.find((timeline) => timeline.id === nextActiveTimelineId)?.timeBlocks[0]?.id ?? null;
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 选中时间块。 */
  function selectTimeBlock(timeBlockId: string): void {
    selectedTimeBlockId.value = timeBlockId;
    inspectedEvent.value = null;
    selectedEventId.value = null;
  }

  /** 打开新建时间块弹框。 */
  function openCreateTimeBlock(placement: TimelineTimeBlockDropPlacement): void {
    if (!selectedTimeline.value) {
      return;
    }

    editingTimeBlockId.value = null;
    timeBlockDialogMode.value = 'create';
    timeBlockDropPlacement.value = placement;
    timeBlockFormValues.value = {
      name: '新时间',
      aliases: [],
    };
    isTimeBlockDialogOpen.value = true;
  }

  /** 打开编辑时间块弹框。 */
  function openEditTimeBlock(timeBlock: TimelineTimeBlock): void {
    editingTimeBlockId.value = timeBlock.id;
    timeBlockDialogMode.value = 'edit';
    timeBlockFormValues.value = {
      name: timeBlock.name,
      aliases: [...timeBlock.aliases],
    };
    isTimeBlockDialogOpen.value = true;
  }

  /** 打开时间块详情弹框。 */
  function openTimeBlockDetail(timeBlock: TimelineTimeBlock): void {
    editingTimeBlockId.value = timeBlock.id;
    timeBlockDialogMode.value = 'view';
    timeBlockFormValues.value = {
      name: timeBlock.name,
      aliases: [...timeBlock.aliases],
    };
    isTimeBlockDialogOpen.value = true;
  }

  /** 从时间块详情进入编辑模式。 */
  function editCurrentTimeBlock(): void {
    if (!editingTimeBlockId.value) {
      return;
    }

    timeBlockDialogMode.value = 'edit';
  }

  /** 关闭时间块弹框。 */
  function closeTimeBlockDialog(): void {
    isTimeBlockDialogOpen.value = false;
    editingTimeBlockId.value = null;
  }

  /** 提交时间块表单。 */
  async function submitTimeBlockForm(): Promise<void> {
    const currentTimeline = selectedTimeline.value;

    if (!currentTimeline || !canSubmitTimeBlock.value) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      let nextTimeBlocks = applyTimeBlockOrder(
        currentTimeline.timeBlocks,
        timeBlockOrders.value[currentTimeline.id],
      );
      const normalizedAliases = timeBlockFormValues.value.aliases
        .map((alias) => alias.trim())
        .filter(Boolean);

      if (timeBlockDialogMode.value === 'edit' && editingTimeBlockId.value) {
        nextTimeBlocks = nextTimeBlocks.map((timeBlock) =>
          timeBlock.id === editingTimeBlockId.value
            ? {
                ...timeBlock,
                name: timeBlockFormValues.value.name.trim(),
                aliases: normalizedAliases,
              }
            : timeBlock,
        );
      } else {
        const selectedIndex = nextTimeBlocks.findIndex((timeBlock) => timeBlock.id === selectedTimeBlockId.value);
        const insertIndex =
          selectedIndex >= 0
            ? selectedIndex + (timeBlockDropPlacement.value === 'after' ? 1 : 0)
            : nextTimeBlocks.length;
        const nextTimeBlock = createTimelineTimeBlock(
          createEntityId('time'),
          timeBlockFormValues.value.name.trim(),
        );
        nextTimeBlock.aliases = normalizedAliases;
        nextTimeBlocks.splice(insertIndex, 0, nextTimeBlock);
        selectedTimeBlockId.value = nextTimeBlock.id;
      }

      const savedTimeline = await persistSelectedTimeline({
        ...currentTimeline,
        timeBlocks: nextTimeBlocks,
      });
      await persistTimeBlockOrder(savedTimeline.id, nextTimeBlocks.map((timeBlock) => timeBlock.id));

      if (!selectedTimeBlockId.value) {
        selectedTimeBlockId.value = savedTimeline.timeBlocks[0]?.id ?? null;
      }

      closeTimeBlockDialog();
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 删除时间块，包含事件时必须确认。 */
  async function deleteTimeBlock(timeBlockId: string): Promise<void> {
    const currentTimeline = selectedTimeline.value;
    const targetTimeBlock = currentTimeline?.timeBlocks.find((timeBlock) => timeBlock.id === timeBlockId);

    if (!currentTimeline || !targetTimeBlock) {
      return;
    }

    const eventCount = currentTimeline.events.filter((event) => event.timeBlockId === timeBlockId).length;
    const message =
      eventCount > 0
        ? `时间块“${targetTimeBlock.name}”下有 ${eventCount} 个事件，确认一并删除吗？`
        : `确认删除时间块“${targetTimeBlock.name}”吗？`;

    if (!window.confirm(message)) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      const nextTimeline = await persistSelectedTimeline({
        ...currentTimeline,
        timeBlocks: currentTimeline.timeBlocks.filter((timeBlock) => timeBlock.id !== timeBlockId),
        events: currentTimeline.events.filter((event) => event.timeBlockId !== timeBlockId),
      });
      const nextOrderedTimeBlockIds = applyTimeBlockOrder(
        nextTimeline.timeBlocks,
        timeBlockOrders.value[nextTimeline.id],
      )
        .filter((timeBlock) => timeBlock.id !== timeBlockId)
        .map((timeBlock) => timeBlock.id);
      await persistTimeBlockOrder(nextTimeline.id, nextOrderedTimeBlockIds);

      selectedTimeBlockId.value =
        selectedTimeBlockId.value === timeBlockId
          ? applyTimeBlockOrder(nextTimeline.timeBlocks, timeBlockOrders.value[nextTimeline.id])[0]?.id ?? null
          : selectedTimeBlockId.value;
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 开始拖动时间块。 */
  function startTimeBlockDrag(timeBlockId: string): void {
    if (isSaving.value || isLoading.value) {
      return;
    }

    draggingTimeBlockId.value = timeBlockId;
  }

  /** 悬停时间块拖放目标。 */
  function hoverTimeBlockDropTarget(timeBlockId: string, placement: TimelineTimeBlockDropPlacement): void {
    if (!draggingTimeBlockId.value || draggingTimeBlockId.value === timeBlockId) {
      dragOverTimeBlockId.value = null;
      return;
    }

    dragOverTimeBlockId.value = timeBlockId;
    timeBlockDropPlacement.value = placement;
  }

  /** 重置时间块拖拽状态。 */
  function resetTimeBlockDrag(): void {
    draggingTimeBlockId.value = null;
    dragOverTimeBlockId.value = null;
    timeBlockDropPlacement.value = 'before';
  }

  /** 将时间块拖放到目标时间块前后。 */
  async function dropTimeBlockOn(
    targetTimeBlockId: string,
    placement: TimelineTimeBlockDropPlacement,
  ): Promise<void> {
    const currentTimeline = selectedTimeline.value;
    const movedTimeBlockId = draggingTimeBlockId.value;
    resetTimeBlockDrag();

    if (!currentTimeline || !movedTimeBlockId || movedTimeBlockId === targetTimeBlockId) {
      return;
    }

    const previousTimeline = cloneTimeline(currentTimeline);
    const nextTimeBlocks = applyTimeBlockOrder(
      currentTimeline.timeBlocks,
      timeBlockOrders.value[currentTimeline.id],
    );
    const sourceIndex = nextTimeBlocks.findIndex((timeBlock) => timeBlock.id === movedTimeBlockId);
    const targetIndex = nextTimeBlocks.findIndex((timeBlock) => timeBlock.id === targetTimeBlockId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const [movedTimeBlock] = nextTimeBlocks.splice(sourceIndex, 1);
    const nextTargetIndex = nextTimeBlocks.findIndex((timeBlock) => timeBlock.id === targetTimeBlockId);
    nextTimeBlocks.splice(placement === 'after' ? nextTargetIndex + 1 : nextTargetIndex, 0, movedTimeBlock);

    isSaving.value = true;
    saveError.value = '';

    try {
      await persistTimeBlockOrder(currentTimeline.id, nextTimeBlocks.map((timeBlock) => timeBlock.id));
      selectedTimeBlockId.value = movedTimeBlockId;
    } catch (error) {
      replaceTimeline(previousTimeline);
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 打开新建事件弹框。 */
  function openCreateEvent(): void {
    if (!selectedTimeBlockId.value) {
      return;
    }

    editingEventId.value = null;
    inspectedEvent.value = null;
    eventDialogMode.value = 'create';
    eventFormValues.value = createEventFormValues(undefined, selectedTimeBlockId.value);
    isEventDetailDialogOpen.value = true;
  }

  /** 打开事件详情弹框。 */
  function openEventDetail(event: TimelineEvent): void {
    inspectedEvent.value = event;
    editingEventId.value = event.id;
    eventDialogMode.value = 'view';
    eventFormValues.value = createEventFormValues(event, event.timeBlockId);
    isEventDetailDialogOpen.value = true;
  }

  /** 进入事件编辑模式。 */
  function editCurrentEvent(): void {
    if (!editingEventId.value) {
      return;
    }

    eventDialogMode.value = 'edit';
  }

  /** 关闭事件详情弹框。 */
  function closeEventDetailDialog(): void {
    isEventDetailDialogOpen.value = false;
    editingEventId.value = null;
    inspectedEvent.value = null;
  }

  /** 提交事件详情表单。 */
  async function submitEventForm(): Promise<void> {
    const currentTimeline = selectedTimeline.value;

    if (!currentTimeline || !canSubmitEvent.value) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      const targetTimeBlockEvents = sortEventsByLayout(
        currentTimeline.events.filter((event) => event.timeBlockId === eventFormValues.value.timeBlockId),
      );
      let nextEvents = currentTimeline.events;
      const normalizedCustomFields = normalizeCustomFields(eventFormValues.value.customFields);

      if (eventDialogMode.value === 'create') {
        const selectedEventIndex = targetTimeBlockEvents.findIndex(
          (event) => event.id === selectedEventId.value,
        );
        const insertIndex = selectedEventIndex >= 0 ? selectedEventIndex : 0;
        const nextEvent = createTimelineEvent(
          createEntityId('event'),
          eventFormValues.value.timeBlockId,
          insertIndex + 1,
          1,
        );

        nextEvent.title = eventFormValues.value.title.trim();
        nextEvent.specificTime = eventFormValues.value.specificTime.trim();
        nextEvent.content = eventFormValues.value.content;
        nextEvent.customFields = normalizedCustomFields;
        const nextTimeBlockEvents = [...targetTimeBlockEvents];
        nextTimeBlockEvents.splice(insertIndex, 0, nextEvent);
        nextEvents = [
          ...currentTimeline.events.filter((event) => event.timeBlockId !== eventFormValues.value.timeBlockId),
          ...nextTimeBlockEvents,
        ];
        inspectedEvent.value = nextEvent;
        editingEventId.value = nextEvent.id;
        selectedEventId.value = nextEvent.id;
      } else if (editingEventId.value) {
        nextEvents = currentTimeline.events.map((event) =>
          event.id === editingEventId.value
            ? {
                ...event,
                timeBlockId: event.timeBlockId,
                specificTime: eventFormValues.value.specificTime.trim(),
                title: eventFormValues.value.title.trim(),
                content: eventFormValues.value.content,
                customFields: normalizedCustomFields,
              }
            : event,
        );
      }

      const savedTimeline = await persistSelectedTimeline({
        ...currentTimeline,
        events: normalizeEventLayouts(nextEvents, eventFormValues.value.timeBlockId),
      });
      const savedEvent = savedTimeline.events.find(
        (event) =>
          event.id === inspectedEvent.value?.id ||
          event.id === editingEventId.value,
      );

      inspectedEvent.value = savedEvent ? cloneTimelineEvent(savedEvent) : null;
      selectedTimeBlockId.value = eventFormValues.value.timeBlockId;
      selectedEventId.value = savedEvent?.id ?? selectedEventId.value;
      eventDialogMode.value = 'view';
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 删除事件。 */
  async function deleteEvent(eventId: string): Promise<void> {
    const currentTimeline = selectedTimeline.value;
    const targetEvent = currentTimeline?.events.find((event) => event.id === eventId);

    if (!currentTimeline || !targetEvent || !window.confirm(`确认删除事件“${targetEvent.title}”吗？`)) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      const nextEvents = currentTimeline.events.filter((event) => event.id !== eventId);
      await persistSelectedTimeline({
        ...currentTimeline,
        events: normalizeEventLayouts(nextEvents, targetEvent.timeBlockId),
      });

      if (editingEventId.value === eventId) {
        closeEventDetailDialog();
      }
      if (selectedEventId.value === eventId) {
        selectedEventId.value = null;
      }

    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  /** 开始拖动事件卡片。 */
  function startEventDrag(eventId: string): void {
    if (isSaving.value || isLoading.value) {
      return;
    }

    draggingEventId.value = eventId;
  }

  /** 选中事件卡片。 */
  function selectEvent(eventId: string): void {
    selectedEventId.value = selectedEventId.value === eventId ? null : eventId;
  }

  /** 悬停事件拖放目标。 */
  function hoverEventDropTarget(eventId: string, placement: TimelineEventDropPlacement): void {
    if (!draggingEventId.value || draggingEventId.value === eventId) {
      dragOverEventId.value = null;
      return;
    }

    dragOverEventId.value = eventId;
    eventDropPlacement.value = placement;
  }

  /** 清空事件拖放目标，但保持正在拖动的事件不变。 */
  function clearEventDropTarget(): void {
    dragOverEventId.value = null;
    eventDropPlacement.value = 'before';
  }

  /** 重置事件拖拽状态。 */
  function resetEventDrag(): void {
    draggingEventId.value = null;
    dragOverEventId.value = null;
    eventDropPlacement.value = 'before';
  }

  /** 将事件拖放到目标事件前后。 */
  async function dropEventOn(targetEventId: string, placement: TimelineEventDropPlacement): Promise<void> {
    const currentTimeline = selectedTimeline.value;
    const movedEventId = draggingEventId.value;
    resetEventDrag();

    if (!currentTimeline || !movedEventId || movedEventId === targetEventId) {
      return;
    }

    const previousTimeline = cloneTimeline(currentTimeline);
    const nextEvents = moveEventNear(currentTimeline.events, movedEventId, targetEventId, placement);

    isSaving.value = true;
    saveError.value = '';

    try {
      await persistSelectedTimeline({
        ...currentTimeline,
        events: nextEvents,
      });
      selectedEventId.value = movedEventId;
    } catch (error) {
      replaceTimeline(previousTimeline);
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  return {
    timelineIndex,
    timelines,
    timeBlockOrders,
    timelineOptions,
    selectedTimelineId,
    selectedTimeline,
    selectedTimeBlockId,
    selectedTimeBlock,
    orderedTimeBlocks,
    selectedTimeBlockEvents,
    selectedEventId,
    inspectedEvent,
    editingTimeBlockId,
    editingEventId,
    isTimeBlockDialogOpen,
    timeBlockDialogMode,
    isEventDetailDialogOpen,
    eventDialogMode,
    timeBlockFormValues,
    eventFormValues,
    isLoading,
    isSaving,
    loadError,
    saveError,
    fileErrors,
    dataDirectory,
    draggingTimeBlockId,
    dragOverTimeBlockId,
    timeBlockDropPlacement,
    draggingEventId,
    dragOverEventId,
    eventDropPlacement,
    hasErrorMessage,
    canSubmitTimeBlock,
    canSubmitEvent,
    loadTimelines,
    selectTimeline,
    createTimeline,
    renameSelectedTimeline,
    deleteSelectedTimeline,
    selectTimeBlock,
    openCreateTimeBlock,
    openEditTimeBlock,
    openTimeBlockDetail,
    editCurrentTimeBlock,
    closeTimeBlockDialog,
    submitTimeBlockForm,
    deleteTimeBlock,
    startTimeBlockDrag,
    hoverTimeBlockDropTarget,
    resetTimeBlockDrag,
    dropTimeBlockOn,
    openCreateEvent,
    openEventDetail,
    selectEvent,
    editCurrentEvent,
    closeEventDetailDialog,
    submitEventForm,
    deleteEvent,
    startEventDrag,
    hoverEventDropTarget,
    clearEventDropTarget,
    resetEventDrag,
    dropEventOn,
  };
}
