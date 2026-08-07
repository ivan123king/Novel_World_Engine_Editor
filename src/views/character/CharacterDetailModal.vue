<script setup lang="ts">
/**
 * 人物详情弹框。
 * 使用 Naive UI 的 NDescriptions 组件展示人物基础信息，
 * 当前阶段用弹框临时代替独立详情页面。
 */
import AppModal from '@/components/common/AppModal.vue';
import type { CharacterFile } from '@/types';

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
 * 格式化自定义字段，便于第一版详情弹框直接查看原始结构。
 * @returns 格式化后的 JSON 字符串
 */
function formatCustomFields(character: CharacterFile | null): string {
  return JSON.stringify(character?.customFields ?? {}, null, 2);
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
      <n-card title="自定义字段" size="small" :bordered="true">
        <n-code :code="formatCustomFields(character)" language="json" word-wrap />
      </n-card>
    </div>
  </AppModal>
</template>
