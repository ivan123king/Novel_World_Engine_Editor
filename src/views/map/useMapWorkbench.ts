import { computed, onMounted, reactive, ref } from 'vue';
import {
  deleteLocation as deleteLocationFile,
  listMapModule,
  saveLocation,
  saveMap,
} from '@/api/mapApi';
import {
  LOCATION_SCHEMA_VERSION,
  MAP_SCHEMA_VERSION,
  type JsonValue,
  type LocationCustomFields,
  type LocationFile,
  type MapFile,
  type MapViewport,
  type MapPin,
} from '@/types';

/** Konva 拖拽事件最小类型。 */
export interface KonvaDragEvent {
  cancelBubble?: boolean;
  target: {
    x: () => number;
    y: () => number;
  };
}

/** Konva 指针事件最小类型。 */
export interface KonvaPointerEvent {
  cancelBubble?: boolean;
  target?: {
    getStage?: () => {
      getPointerPosition: () => { x: number; y: number } | null;
    };
  };
}

/** Konva 滚轮事件最小类型。 */
export interface KonvaWheelEvent extends KonvaPointerEvent {
  evt: {
    deltaY: number;
    preventDefault: () => void;
  };
}

/** 地点自定义字段表单行。 */
export interface LocationCustomFieldRow {
  id: string;
  key: string;
  value: string;
}

/** 地点编辑表单值。 */
export interface LocationFormValues {
  name: string;
  type: string;
  description: string;
  customFields: LocationCustomFieldRow[];
}

/** 地图树渲染项。 */
export interface MapTreeItem {
  map: MapFile;
  depth: number;
}

/** 地图画布固定尺寸。 */
export const MAP_STAGE_SIZE = {
  width: 860,
  height: 580,
};

/** 地图透明拖拽命中区尺寸。 */
export const MAP_HIT_AREA = {
  x: -5000,
  y: -5000,
  width: 10000,
  height: 10000,
};

const pinColors = ['#2563eb', '#16a34a', '#9333ea', '#b45309', '#dc2626', '#0f766e'];
const minViewportScale = 0.35;
const maxViewportScale = 3;
const wheelScaleStep = 1.08;
const viewportSaveDelayMs = 5000;

let fieldRowSeed = 0;

/** 创建自定义字段表单行。 */
function createFieldRow(key = '', value = ''): LocationCustomFieldRow {
  fieldRowSeed += 1;

  return {
    id: `location_field_${Date.now()}_${fieldRowSeed}`,
    key,
    value,
  };
}

/**
 * 判断值是否可以安全保存到 JSON 自定义字段中。
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
 * 将自定义字段值转换为表单文本。
 * @param value 自定义字段值
 */
export function stringifyFieldValue(value: JsonValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

/** 将表单文本转换成 JSON 值。 */
function parseFieldValue(rawValue: string): JsonValue {
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

/**
 * 按保存的自定义字段顺序返回条目。
 * @param location 地点数据
 */
export function getLocationCustomFieldEntries(
  location: LocationFile | null,
): [string, JsonValue][] {
  if (!location) {
    return [];
  }

  const usedKeys = new Set<string>();
  const orderedEntries: [string, JsonValue][] = [];

  location.customFieldOrder?.forEach((fieldKey) => {
    if (Object.prototype.hasOwnProperty.call(location.customFields, fieldKey)) {
      usedKeys.add(fieldKey);
      orderedEntries.push([fieldKey, location.customFields[fieldKey]]);
    }
  });

  Object.entries(location.customFields).forEach(([fieldKey, fieldValue]) => {
    if (!usedKeys.has(fieldKey)) {
      orderedEntries.push([fieldKey, fieldValue]);
    }
  });

  return orderedEntries;
}

/** 将表单行转换为 customFields。 */
function rowsToCustomFields(rows: LocationCustomFieldRow[]): LocationCustomFields {
  return rows.reduce<LocationCustomFields>((fields, row) => {
    const fieldKey = row.key.trim();

    if (!fieldKey) {
      return fields;
    }

    fields[fieldKey] = parseFieldValue(row.value);
    return fields;
  }, {});
}

/** 生成文件安全 ID。 */
function createSafeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 将未知错误格式化为展示文本。 */
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 清理旧版本写入的默认占位名称。
 * @param name 地点名称
 */
function normalizeLocationName(name: string): string {
  return name.trim() === '未命名地点' ? '' : name.trim();
}

/** 地图工作台状态和业务动作。 */
export function useMapWorkbench() {
  const locations = ref<LocationFile[]>([]);
  const maps = ref<MapFile[]>([]);
  const currentMapId = ref('');
  const selectedPinId = ref('');
  const searchKeyword = ref('');
  const inspectorMode = ref<'detail' | 'edit'>('detail');
  const isLoading = ref(false);
  const isSaving = ref(false);
  const isPlacingLocation = ref(false);
  const loadError = ref('');
  const saveError = ref('');
  const fileErrors = ref<string[]>([]);
  const dataDirectory = ref('');
  let viewportSaveTimer: ReturnType<typeof setTimeout> | null = null;

  const locationForm = reactive<LocationFormValues>({
    name: '',
    type: '',
    description: '',
    customFields: [],
  });

  const currentMap = computed(
    () => maps.value.find((map) => map.id === currentMapId.value) ?? maps.value[0] ?? null,
  );
  const currentPins = computed(() => currentMap.value?.pins ?? []);
  const selectedPin = computed(
    () => currentPins.value.find((pin) => pin.id === selectedPinId.value) ?? null,
  );
  const selectedLocation = computed(() => {
    if (!selectedPin.value) {
      return null;
    }

    return locations.value.find((location) => location.id === selectedPin.value?.locationId) ?? null;
  });
  const rootLocation = computed(() =>
    currentMap.value
      ? locations.value.find((location) => location.id === currentMap.value?.rootLocationId) ??
        null
      : null,
  );
  const currentViewport = computed(() => currentMap.value?.viewport ?? { x: 0, y: 0, scale: 1 });
  const mapTreeItems = computed<MapTreeItem[]>(() => {
    const result: MapTreeItem[] = [];
    const visitedMapIds = new Set<string>();

    function visit(parentMapId: string | null, depth: number): void {
      maps.value
        .filter((map) => map.parentMapId === parentMapId)
        .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
        .forEach((map) => {
          if (visitedMapIds.has(map.id)) {
            return;
          }

          visitedMapIds.add(map.id);
          result.push({ map, depth });
          visit(map.id, depth + 1);
        });
    }

    visit(null, 0);

    maps.value.forEach((map) => {
      if (!visitedMapIds.has(map.id)) {
        result.push({ map, depth: 0 });
      }
    });

    return result;
  });
  const breadcrumbs = computed(() => {
    const chain: MapFile[] = [];
    let pointer: MapFile | undefined = currentMap.value ?? undefined;
    const visitedMapIds = new Set<string>();

    while (pointer && !visitedMapIds.has(pointer.id)) {
      visitedMapIds.add(pointer.id);
      chain.unshift(pointer);
      pointer = pointer.parentMapId
        ? maps.value.find((map) => map.id === pointer?.parentMapId)
        : undefined;
    }

    return chain;
  });
  const childMaps = computed(() =>
    currentMap.value ? maps.value.filter((map) => map.parentMapId === currentMap.value?.id) : [],
  );
  const filteredCurrentPins = computed(() => {
    const keyword = searchKeyword.value.trim().toLowerCase();

    if (!keyword) {
      return currentPins.value;
    }

    return currentPins.value.filter((pin) => {
      const location = locations.value.find((item) => item.id === pin.locationId);
      if (!location) {
        return false;
      }

      return [location.name, location.type, location.description, JSON.stringify(location.customFields)]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  });
  const floatingToolbarStyle = computed(() => {
    if (!selectedPin.value) {
      return { display: 'none' };
    }

    const viewport = currentViewport.value;
    const screenX = selectedPin.value.x * viewport.scale + viewport.x;
    const screenY = selectedPin.value.y * viewport.scale + viewport.y;

    return {
      left: `${Math.min(screenX + 28, MAP_STAGE_SIZE.width - 220)}px`,
      top: `${Math.max(screenY + 24, 16)}px`,
    };
  });
  const duplicateFieldKeys = computed(() => {
    const keyCount = new Map<string, number>();

    locationForm.customFields.forEach((row) => {
      const key = row.key.trim();
      if (!key) {
        return;
      }

      keyCount.set(key, (keyCount.get(key) ?? 0) + 1);
    });

    return Array.from(keyCount.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key);
  });
  const canSaveLocationForm = computed(
    () => locationForm.name.trim().length > 0 && duplicateFieldKeys.value.length === 0,
  );
  const canDeleteSelectedLocation = computed(
    () => Boolean(selectedLocation.value) && !hasChildMap(selectedLocation.value!.id),
  );

  function getLocationName(locationId: string): string {
    const location = locations.value.find((item) => item.id === locationId);
    return normalizeLocationName(location?.name ?? '') || '新地点';
  }

  function getLocationType(locationId: string): string {
    return locations.value.find((location) => location.id === locationId)?.type || '地点';
  }

  function hasChildMap(locationId: string): boolean {
    return maps.value.some((map) => map.parentLocationId === locationId);
  }

  function getChildMap(locationId: string): MapFile | null {
    return maps.value.find((map) => map.parentLocationId === locationId) ?? null;
  }

  function upsertLocation(savedLocation: LocationFile): void {
    const existingIndex = locations.value.findIndex((location) => location.id === savedLocation.id);

    if (existingIndex >= 0) {
      locations.value.splice(existingIndex, 1, savedLocation);
    } else {
      locations.value.push(savedLocation);
    }
  }

  function upsertMap(savedMap: MapFile): void {
    const existingIndex = maps.value.findIndex((map) => map.id === savedMap.id);

    if (existingIndex >= 0) {
      maps.value.splice(existingIndex, 1, savedMap);
    } else {
      maps.value.push(savedMap);
    }
  }

  /**
   * 更新当前地图视口并保存。
   * @param viewport 下一个视口状态
   * @param options 保存选项
   */
  async function updateCurrentMapViewport(
    viewport: MapViewport,
    options: { debounce?: boolean } = {},
  ): Promise<void> {
    if (!currentMap.value) {
      return;
    }

    const nextMap: MapFile = {
      ...currentMap.value,
      viewport,
    };

    upsertMap(nextMap);

    if (viewportSaveTimer) {
      clearTimeout(viewportSaveTimer);
      viewportSaveTimer = null;
    }

    const persistViewport = async (): Promise<void> => {
      isSaving.value = true;
      saveError.value = '';

      try {
        upsertMap(await saveMap(nextMap));
      } catch (error) {
        saveError.value = formatError(error);
      } finally {
        isSaving.value = false;
      }
    };

    if (options.debounce) {
      viewportSaveTimer = setTimeout(() => {
        viewportSaveTimer = null;
        void persistViewport();
      }, viewportSaveDelayMs);
      return;
    }

    await persistViewport();
  }

  function openMap(mapId: string): void {
    const targetMap = maps.value.find((map) => map.id === mapId);
    if (!targetMap) {
      return;
    }

    currentMapId.value = mapId;
    selectedPinId.value = targetMap.pins[0]?.id ?? '';
    inspectorMode.value = 'detail';
    isPlacingLocation.value = false;
  }

  function openChildMap(locationId: string): void {
    const childMap = getChildMap(locationId);
    if (childMap) {
      openMap(childMap.id);
    }
  }

  function handlePinClick(pinId: string, event?: KonvaPointerEvent): void {
    if (event) {
      event.cancelBubble = true;
    }

    selectedPinId.value = pinId;
    inspectorMode.value = 'detail';
    isPlacingLocation.value = false;
  }

  function beginPlaceLocation(): void {
    saveError.value = '';
    isPlacingLocation.value = true;
    selectedPinId.value = '';
    inspectorMode.value = 'detail';
  }

  function getPointerPosition(event?: KonvaPointerEvent): { x: number; y: number } {
    const pointerPosition = event?.target?.getStage?.()?.getPointerPosition();
    const viewport = currentViewport.value;

    return pointerPosition
      ? {
          x: Math.round((pointerPosition.x - viewport.x) / viewport.scale),
          y: Math.round((pointerPosition.y - viewport.y) / viewport.scale),
        }
      : {
          x: Math.round(MAP_STAGE_SIZE.width / 2),
          y: Math.round(MAP_STAGE_SIZE.height / 2),
        };
  }

  async function handleStageClick(event?: KonvaPointerEvent): Promise<void> {
    if (isPlacingLocation.value) {
      await createLocationAt(getPointerPosition(event));
      return;
    }

    selectedPinId.value = '';
    inspectorMode.value = 'detail';
  }

  async function handleSceneDragEnd(event: KonvaDragEvent): Promise<void> {
    if (!currentMap.value || isPlacingLocation.value) {
      return;
    }

    await updateCurrentMapViewport(
      {
        ...currentMap.value.viewport,
        x: Math.round(event.target.x()),
        y: Math.round(event.target.y()),
      },
      { debounce: true },
    );
  }

  /**
   * 处理鼠标滚轮缩放地图。
   * 缩放以鼠标指针所在位置为中心，并将 viewport 保存到地图 JSON。
   * @param event Konva 滚轮事件
   */
  async function handleStageWheel(event: KonvaWheelEvent): Promise<void> {
    if (!currentMap.value || isPlacingLocation.value) {
      return;
    }

    event.evt.preventDefault();

    const pointerPosition = event.target?.getStage?.()?.getPointerPosition();
    if (!pointerPosition) {
      return;
    }

    const viewport = currentMap.value.viewport;
    const oldScale = viewport.scale;
    const nextScale =
      event.evt.deltaY > 0 ? oldScale / wheelScaleStep : oldScale * wheelScaleStep;
    const clampedScale = Math.min(maxViewportScale, Math.max(minViewportScale, nextScale));

    if (clampedScale === oldScale) {
      return;
    }

    const mapPointUnderPointer = {
      x: (pointerPosition.x - viewport.x) / oldScale,
      y: (pointerPosition.y - viewport.y) / oldScale,
    };
    const nextViewport: MapViewport = {
      x: Math.round(pointerPosition.x - mapPointUnderPointer.x * clampedScale),
      y: Math.round(pointerPosition.y - mapPointUnderPointer.y * clampedScale),
      scale: Number(clampedScale.toFixed(3)),
    };

    await updateCurrentMapViewport(nextViewport, { debounce: true });
  }

  async function handlePinDragEnd(pinId: string, event: KonvaDragEvent): Promise<void> {
    if (!currentMap.value) {
      return;
    }

    const nextMap: MapFile = {
      ...currentMap.value,
      pins: currentMap.value.pins.map((pin) =>
        pin.id === pinId
          ? {
              ...pin,
              x: Math.round(event.target.x()),
              y: Math.round(event.target.y()),
            }
          : pin,
      ),
    };

    isSaving.value = true;
    saveError.value = '';

    try {
      upsertMap(await saveMap(nextMap));
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  function resetLocationForm(): void {
    const location = selectedLocation.value;
    locationForm.name = normalizeLocationName(location?.name ?? '');
    locationForm.type = location?.type ?? '';
    locationForm.description = location?.description ?? '';

    const rows = getLocationCustomFieldEntries(location).map(([key, value]) =>
      createFieldRow(key, stringifyFieldValue(value)),
    );

    locationForm.customFields = rows.length > 0 ? rows : [createFieldRow()];
  }

  function startEdit(): void {
    if (!selectedLocation.value) {
      return;
    }

    resetLocationForm();
    inspectorMode.value = 'edit';
  }

  function cancelEdit(): void {
    inspectorMode.value = 'detail';
    resetLocationForm();
  }

  function addCustomField(): void {
    locationForm.customFields.push(createFieldRow());
  }

  function removeCustomField(index: number): void {
    locationForm.customFields.splice(index, 1);
  }

  function isDuplicateFieldKey(key: string): boolean {
    return duplicateFieldKeys.value.includes(key.trim());
  }

  async function submitLocationForm(): Promise<void> {
    if (!selectedLocation.value || !canSaveLocationForm.value) {
      return;
    }

    isSaving.value = true;
    saveError.value = '';

    try {
      const nextLocation: LocationFile = {
        ...selectedLocation.value,
        name: locationForm.name.trim(),
        type: locationForm.type.trim(),
        description: locationForm.description.trim(),
        customFields: rowsToCustomFields(locationForm.customFields),
        customFieldOrder: locationForm.customFields
          .map((row) => row.key.trim())
          .filter((key) => key.length > 0),
        schemaVersion: LOCATION_SCHEMA_VERSION,
      };

      upsertLocation(await saveLocation(nextLocation));
      inspectorMode.value = 'detail';
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  async function createLocationAt(position: { x: number; y: number }): Promise<void> {
    if (!currentMap.value) {
      return;
    }

    const locationId = createSafeId('location');
    const pinId = createSafeId('pin');
    const pinColor = pinColors[currentMap.value.pins.length % pinColors.length];
    const nextLocation: LocationFile = {
      id: locationId,
      name: '',
      type: '地点',
      parentLocationId: currentMap.value.rootLocationId,
      description: '',
      customFields: {},
      schemaVersion: LOCATION_SCHEMA_VERSION,
    };
    const nextPin: MapPin = {
      id: pinId,
      locationId,
      x: position.x,
      y: position.y,
      color: pinColor,
      icon: 'location',
      showLabel: true,
    };
    const nextMap: MapFile = {
      ...currentMap.value,
      pins: [...currentMap.value.pins, nextPin],
    };

    isSaving.value = true;
    saveError.value = '';

    try {
      const [savedLocation, savedMap] = await Promise.all([
        saveLocation(nextLocation),
        saveMap(nextMap),
      ]);

      upsertLocation(savedLocation);
      upsertMap(savedMap);
      selectedPinId.value = pinId;
      isPlacingLocation.value = false;
      startEdit();
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  async function createChildMapForSelectedLocation(): Promise<void> {
    if (!selectedLocation.value || !currentMap.value || hasChildMap(selectedLocation.value.id)) {
      return;
    }

    const mapName = `${normalizeLocationName(selectedLocation.value.name) || '新地点'}地图`;
    const nextMap: MapFile = {
      id: createSafeId('map'),
      name: mapName,
      rootLocationId: selectedLocation.value.id,
      parentMapId: currentMap.value.id,
      parentLocationId: selectedLocation.value.id,
      background: null,
      viewport: {
        x: 0,
        y: 0,
        scale: 1,
      },
      pins: [],
      schemaVersion: MAP_SCHEMA_VERSION,
    };

    isSaving.value = true;
    saveError.value = '';

    try {
      const savedMap = await saveMap(nextMap);
      upsertMap(savedMap);
      openMap(savedMap.id);
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteSelectedLocation(): Promise<void> {
    if (!selectedLocation.value || !currentMap.value) {
      return;
    }

    if (!canDeleteSelectedLocation.value) {
      saveError.value = '该地点已有子地图，请先删除或解除子地图后再删除地点。';
      return;
    }

    const locationDisplayName = normalizeLocationName(selectedLocation.value.name) || '新地点';
    const shouldDelete = window.confirm(`确定删除地点“${locationDisplayName}”吗？`);

    if (!shouldDelete) {
      return;
    }

    const deletingLocationId = selectedLocation.value.id;
    const changedMaps = maps.value
      .map<MapFile>((map) => ({
        ...map,
        pins: map.pins.filter((pin) => pin.locationId !== deletingLocationId),
      }))
      .filter((map, index) => map.pins.length !== maps.value[index].pins.length);

    isSaving.value = true;
    saveError.value = '';

    try {
      await Promise.all(changedMaps.map((map) => saveMap(map)));
      await deleteLocationFile(deletingLocationId);

      changedMaps.forEach(upsertMap);
      locations.value = locations.value.filter((location) => location.id !== deletingLocationId);
      selectedPinId.value = currentMap.value.pins[0]?.id ?? '';
      inspectorMode.value = 'detail';
    } catch (error) {
      saveError.value = formatError(error);
    } finally {
      isSaving.value = false;
    }
  }

  async function loadMaps(): Promise<void> {
    isLoading.value = true;
    loadError.value = '';
    saveError.value = '';

    try {
      const result = await listMapModule();
      locations.value = result.locations;
      maps.value = result.maps;
      fileErrors.value = result.errors;
      dataDirectory.value = result.baseDir;

      currentMapId.value =
        maps.value.find((map) => map.parentMapId === null)?.id ?? maps.value[0]?.id ?? '';
      selectedPinId.value = currentMap.value?.pins[0]?.id ?? '';
      resetLocationForm();
    } catch (error) {
      loadError.value = formatError(error);
      locations.value = [];
      maps.value = [];
      fileErrors.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(() => {
    void loadMaps();
  });

  return {
    locations,
    maps,
    currentMapId,
    selectedPinId,
    searchKeyword,
    inspectorMode,
    isLoading,
    isSaving,
    isPlacingLocation,
    loadError,
    saveError,
    fileErrors,
    dataDirectory,
    locationForm,
    currentMap,
    currentPins,
    selectedPin,
    selectedLocation,
    rootLocation,
    currentViewport,
    mapTreeItems,
    breadcrumbs,
    childMaps,
    filteredCurrentPins,
    floatingToolbarStyle,
    duplicateFieldKeys,
    canSaveLocationForm,
    canDeleteSelectedLocation,
    getLocationName,
    getLocationType,
    hasChildMap,
    openMap,
    openChildMap,
    handlePinClick,
    beginPlaceLocation,
    handleStageClick,
    handleStageWheel,
    handleSceneDragEnd,
    handlePinDragEnd,
    startEdit,
    cancelEdit,
    addCustomField,
    removeCustomField,
    isDuplicateFieldKey,
    submitLocationForm,
    createChildMapForSelectedLocation,
    deleteSelectedLocation,
    loadMaps,
  };
}
