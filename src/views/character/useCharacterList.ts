import { computed, ref } from 'vue';
import {
  CHARACTER_SCHEMA_VERSION,
  createEmptyCharacter,
  isCharacterFile,
  type CharacterFile,
} from '@/types';

export interface CharacterFormValues {
  name: string;
  age: string;
  traits: string;
  appearance: string;
}


/** 将未知 mock 数据恢复为可用于页面的有效人物列表。 */
function normalizeInitialCharacters(value: unknown): CharacterFile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isCharacterFile);
}

/** 将表单年龄转换为人物结构允许的 number、string 或 null。 */
function normalizeAge(rawAge: string): number | string | null {
  const ageText = rawAge.trim();

  if (!ageText) {
    return null;
  }

  const numericAge = Number(ageText);
  return Number.isFinite(numericAge) && String(numericAge) === ageText ? numericAge : ageText;
}

/** 将性格输入拆分为 traits 数组。 */
function normalizeTraits(rawTraits: string): string[] {
  return rawTraits
    .split(/[\s,，、]+/)
    .map((trait) => trait.trim())
    .filter(Boolean);
}

/** 生成人物表单默认值。 */
export function createCharacterFormValues(character?: CharacterFile): CharacterFormValues {
  return {
    name: character?.name ?? '',
    age: character?.age === null || character?.age === undefined ? '' : String(character.age),
    traits: character?.traits.join('，') ?? '',
    appearance: character?.appearance ?? '',
  };
}

/** 管理人物列表页的本地响应式状态。 */
export function useCharacterList(initialValue: unknown) {
  const characters = ref<CharacterFile[]>(normalizeInitialCharacters(initialValue));
  const selectedCharacter = ref<CharacterFile | null>(null);
  const editingCharacter = ref<CharacterFile | null>(null);
  const isCreateModalOpen = ref(false);
  const isEditModalOpen = ref(false);

  const characterCount = computed(() => characters.value.length);

  /** 打开人物详情弹框。 */
  function openDetail(character: CharacterFile): void {
    selectedCharacter.value = character;
  }

  /** 关闭人物详情弹框。 */
  function closeDetail(): void {
    selectedCharacter.value = null;
  }

  /** 打开新建人物弹框。 */
  function openCreate(): void {
    isCreateModalOpen.value = true;
  }

  /** 关闭新建人物弹框。 */
  function closeCreate(): void {
    isCreateModalOpen.value = false;
  }

  /** 打开编辑人物弹框。 */
  function openEdit(character: CharacterFile): void {
    editingCharacter.value = character;
    isEditModalOpen.value = true;
  }

  /** 关闭编辑人物弹框。 */
  function closeEdit(): void {
    editingCharacter.value = null;
    isEditModalOpen.value = false;
  }

  /** 从本地列表中直接删除人物。 */
  function deleteCharacter(characterId: string): void {
    characters.value = characters.value.filter((character) => character.id !== characterId);

    if (selectedCharacter.value?.id === characterId) {
      closeDetail();
    }

    if (editingCharacter.value?.id === characterId) {
      closeEdit();
    }
  }

  /** 根据表单值创建人物并加入本地列表。 */
  function createCharacter(values: CharacterFormValues): void {
    const nextCharacter = createEmptyCharacter(`char_${Date.now()}`, values.name.trim() || '未命名人物');
    nextCharacter.age = normalizeAge(values.age);
    nextCharacter.traits = normalizeTraits(values.traits);
    nextCharacter.appearance = values.appearance.trim();
    nextCharacter.schemaVersion = CHARACTER_SCHEMA_VERSION;

    characters.value = [...characters.value, nextCharacter];
    closeCreate();
  }

  /** 根据表单值更新人物，并保留未展示字段和 customFields。 */
  function updateCharacter(characterId: string, values: CharacterFormValues): void {
    characters.value = characters.value.map((character) => {
      if (character.id !== characterId) {
        return character;
      }

      return {
        ...character,
        name: values.name.trim() || '未命名人物',
        age: normalizeAge(values.age),
        traits: normalizeTraits(values.traits),
        appearance: values.appearance.trim(),
        customFields: character.customFields,
        schemaVersion: character.schemaVersion,
      };
    });

    closeEdit();
  }

  return {
    characters,
    characterCount,
    selectedCharacter,
    editingCharacter,
    isCreateModalOpen,
    isEditModalOpen,
    openDetail,
    closeDetail,
    openCreate,
    closeCreate,
    openEdit,
    closeEdit,
    deleteCharacter,
    createCharacter,
    updateCharacter,
  };
}
