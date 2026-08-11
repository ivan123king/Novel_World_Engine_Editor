export type { JsonObject, JsonPrimitive, JsonValue } from './json-value';
export {
  CHARACTER_SCHEMA_VERSION,
  createEmptyCharacter,
  getCharacterCustomFieldEntries,
  isCharacterFile,
  type CharacterCustomFields,
  type CharacterFile,
} from './character';
export {
  ITEM_SCHEMA_VERSION,
  createEmptyItem,
  isItemFile,
  type ItemCustomFields,
  type ItemFile,
} from './item';
export {
  LIST_ORDER_SCHEMA_VERSION,
  createListOrderFile,
  isListOrderFile,
  type ListOrderEntityType,
  type ListOrderFile,
} from './list-order';
export {
  LOCATION_SCHEMA_VERSION,
  createEmptyLocation,
  isLocationFile,
  type LocationCustomFields,
  type LocationFile,
} from './location';
export {
  MAP_SCHEMA_VERSION,
  createEmptyMap,
  isMapFile,
  type MapBackground,
  type MapFile,
  type MapPin,
  type MapViewport,
} from './map';
export {
  NOVEL_PROJECT_SCHEMA_VERSION,
  createNovelProjectFile,
  isNovelProjectFile,
  type CurrentProject,
  type NovelProjectFile,
} from './project';
