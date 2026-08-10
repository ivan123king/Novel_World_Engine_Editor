<script setup lang="ts">
/**
 * 人物详情弹框。
 * 使用 Naive UI 的 NDescriptions 组件展示人物基础信息和自定义属性，
 * 当前阶段用弹框临时代替独立详情页面。
 */
import { computed } from 'vue';
import AppModal from '@/components/common/AppModal.vue';
import { getCharacterCustomFieldEntries, type CharacterFile, type JsonValue } from '@/types';

const props = defineProps<{
  /** 控制弹框显示/隐藏。 */
  open: boolean;
  /** 当前展示的人物数据，为 null 时不展示内容。 */
  character: CharacterFile | null;
}>();

const emit = defineEmits<{
  /** 关闭弹框事件。 */
  close: [];
}>();

/** 当前人物的自定义字段条目，用于模板逐行展示。 */
const customFieldEntries = computed(() => getCharacterCustomFieldEntries(props.character));

/**
 * 获取弹框标题文本。
 * @returns 人物名称或默认标题
 */
function formatName(character: CharacterFile | null): string {
  return character?.name || '人物详情';
}

/**
 * 获取年龄展示文本。
 * @returns 格式化后的年龄或"未知"
 */
function formatAge(character: CharacterFile | null): string {
  const age = character?.age;
  return age === null || age === undefined || age === '' ? '未知' : String(age);
}

/**
 * 获取性格标签展示文本。
 * @returns 性格标签用顿号分隔或"未填写"
 */
function formatTraits(character: CharacterFile | null): string {
  return character?.traits.length ? character.traits.join('、') : '未填写';
}

/**
 * 获取外貌展示文本。
 * @returns 外貌描述或"未填写"
 */
function formatAppearance(character: CharacterFile | null): string {
  return character?.appearance || '未填写';
}

/**
 * 格式化单个自定义字段值。
 * 字符串直接展示，对象和数组保留 JSON 层级，便于检查复杂设定。
 * @param value 自定义字段值
 * @returns 适合详情弹框展示的文本
 */
function formatCustomFieldValue(value: JsonValue): string {
  return typeof value === 'string' ? value || '未填写' : JSON.stringify(value, null, 2);
}
</script>

<template>
  <AppModal :open="open" :title="formatName(character)" :width="620" @close="emit('close')">
    <div v-if="props.character" style="display: grid; gap: 20px">
      <!-- 人物基础属性描述列表 -->
      <n-descriptions title="基础信息" :column="1" bordered label-placement="left" size="medium">
        <n-descriptions-item label="名称" label-style="width: 84px">
          {{ formatName(character) }}
        </n-descriptions-item>
        <n-descriptions-item label="年龄" label-style="width: 84px">
          {{ formatAge(character) }}
        </n-descriptions-item>
        <n-descriptions-item label="性格" label-style="width: 84px">
          {{ formatTraits(character) }}
        </n-descriptions-item>
        <n-descriptions-item label="外貌" label-style="width: 84px">
          <div style="max-width: 440px; line-height: 1.6; white-space: pre-wrap">
            {{ formatAppearance(character) }}
          </div>
        </n-descriptions-item>
      </n-descriptions>

      <!-- 自定义字段展示区 -->
      <section class="custom-fields-section">
        <n-text strong>
          自定义属性
        </n-text>

        <n-descriptions
          v-if="customFieldEntries.length > 0"
          class="custom-fields-descriptions"
          :column="1"
          bordered
          label-placement="left"
          size="medium"
        >
          <n-descriptions-item
            v-for="[fieldKey, fieldValue] in customFieldEntries"
            :key="fieldKey"
            :label="fieldKey"
            label-style="width: 112px"
          >
            <pre class="custom-field-value">{{ formatCustomFieldValue(fieldValue) }}</pre>
          </n-descriptions-item>
        </n-descriptions>

        <n-empty v-else description="未填写自定义属性" />
      </section>
    </div>
  </AppModal>
</template>

<style scoped>
/** 自定义属性详情区域。 */
.custom-fields-section {
  display: grid;
  gap: 12px;
}

/** 自定义属性描述列表，避免与弹框容器叠加卡片。 */
.custom-fields-descriptions {
  width: 100%;
}

/** 自定义属性值展示，保留复杂 JSON 的换行和缩进。 */
.custom-field-value {
  max-width: 440px;
  margin: 0;
  color: #27313c;
  font-family: inherit;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
