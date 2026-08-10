/** 当前地图文件结构版本。 */
export const MAP_SCHEMA_VERSION = 1;

/** 地图视口状态。 */
export interface MapViewport {
  /** 画布平移 X。 */
  x: number;

  /** 画布平移 Y。 */
  y: number;

  /** 画布缩放比例。 */
  scale: number;
}

/** 地图背景图配置。 */
export interface MapBackground {
  /** 背景类型，第一阶段只预留 image。 */
  type: 'image';

  /** 相对项目目录的背景图路径。 */
  path: string;

  /** 背景透明度。 */
  opacity: number;
}

/** 地图中的地点标记。 */
export interface MapPin {
  /** pin 稳定 ID。 */
  id: string;

  /** 引用的地点 ID。 */
  locationId: string;

  /** 当前地图视图中的 X 坐标。 */
  x: number;

  /** 当前地图视图中的 Y 坐标。 */
  y: number;

  /** pin 颜色。 */
  color: string;

  /** pin 图标类型。 */
  icon: string;

  /** 是否显示地点名称。 */
  showLabel: boolean;
}

/** 地图 JSON 文件结构。 */
export interface MapFile {
  /** 稳定地图 ID。 */
  id: string;

  /** 地图显示名称。 */
  name: string;

  /** 这张地图描述的地点范围。 */
  rootLocationId: string | null;

  /** 上级地图 ID；顶层地图为 null。 */
  parentMapId: string | null;

  /** 父地图中进入本地图的地点 ID。 */
  parentLocationId: string | null;

  /** 背景图配置；第一阶段可以为空。 */
  background: MapBackground | null;

  /** 地图视口状态。 */
  viewport: MapViewport;

  /** 当前地图中的地点标记。 */
  pins: MapPin[];

  /** 地图文件结构版本。 */
  schemaVersion: typeof MAP_SCHEMA_VERSION;
}

/**
 * 创建一个空地图对象。
 * @param id 地图稳定 ID
 * @param name 地图显示名称
 */
export function createEmptyMap(id: string, name = ''): MapFile {
  return {
    id,
    name,
    rootLocationId: null,
    parentMapId: null,
    parentLocationId: null,
    background: null,
    viewport: {
      x: 0,
      y: 0,
      scale: 1,
    },
    pins: [],
    schemaVersion: MAP_SCHEMA_VERSION,
  };
}

/**
 * 判断未知值是否是有限数字。
 * @param value 待校验的未知值
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 判断未知值是否是合法地图背景配置。
 * @param value 待校验的未知值
 */
function isMapBackground(value: unknown): value is MapBackground | null {
  if (value === null) {
    return true;
  }

  if (typeof value !== 'object') {
    return false;
  }

  const data = value as Partial<MapBackground>;

  return (
    data.type === 'image' &&
    typeof data.path === 'string' &&
    isFiniteNumber(data.opacity)
  );
}

/**
 * 判断未知值是否是合法地图视口。
 * @param value 待校验的未知值
 */
function isMapViewport(value: unknown): value is MapViewport {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<MapViewport>;

  return isFiniteNumber(data.x) && isFiniteNumber(data.y) && isFiniteNumber(data.scale);
}

/**
 * 判断未知值是否是合法地图 pin。
 * @param value 待校验的未知值
 */
function isMapPin(value: unknown): value is MapPin {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<MapPin>;

  return (
    typeof data.id === 'string' &&
    typeof data.locationId === 'string' &&
    isFiniteNumber(data.x) &&
    isFiniteNumber(data.y) &&
    typeof data.color === 'string' &&
    typeof data.icon === 'string' &&
    typeof data.showLabel === 'boolean'
  );
}

/**
 * 判断未知数据是否满足地图文件的最小结构。
 * 这里只校验画布运行所需字段，未知顶层字段允许保留给后续版本。
 */
export function isMapFile(value: unknown): value is MapFile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const data = value as Partial<MapFile>;
  const rootLocationIsValid =
    data.rootLocationId === null || typeof data.rootLocationId === 'string';
  const parentMapIsValid = data.parentMapId === null || typeof data.parentMapId === 'string';
  const parentLocationIsValid =
    data.parentLocationId === null || typeof data.parentLocationId === 'string';

  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    rootLocationIsValid &&
    parentMapIsValid &&
    parentLocationIsValid &&
    isMapBackground(data.background) &&
    isMapViewport(data.viewport) &&
    Array.isArray(data.pins) &&
    data.pins.every(isMapPin) &&
    data.schemaVersion === MAP_SCHEMA_VERSION
  );
}
