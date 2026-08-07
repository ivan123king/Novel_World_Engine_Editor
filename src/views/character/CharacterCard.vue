<script setup lang="ts">
/**
 * 人物卡片组件。
 * 基于 Naive UI 的 NCard 组件封装，展示人物基础摘要，
 * 并把详情、编辑、删除动作交给父级处理。
 */
import type { CharacterFile } from '@/types';

const props = defineProps<{
  /** 人物数据对象。 */
  character: CharacterFile;
}>();

const emit = defineEmits<{
  /** 点击卡片查看详情。 */
  detail: [character: CharacterFile];
  /** 点击编辑按钮。 */
  edit: [character: CharacterFile];
  /** 点击删除按钮。 */
  delete: [characterId: string];
}>();

/**
 * 获取年龄展示文本。
 * @param age 原始年龄值
 * @returns 格式化后的年龄字符串
 */
function formatAge(age: CharacterFile['age']): string {
  return age === null || age === '' ? '未知' : String(age);
}

/**
 * 获取性格标签展示文本。
 * @param traits 性格标签数组
 * @returns 格式化后的性格标签字符串
 */
function formatTraits(traits: string[]): string {
  return traits.length > 0 ? traits.join('、') : '未填写';
}
</script>

<template>
  <n-card
    hoverable
    size="small"
    :bordered="true"
    style="min-height: 230px; cursor: pointer"
    @click="emit('detail', props.character)"
  >
    <!-- 卡片主体：人物基础信息 -->
    <div style="display: grid; grid-template-rows: auto 1fr; gap: 14px; min-height: 160px">
      <n-text strong style="font-size: 18px; color: #27313c; line-height: 1.25">
        {{ character.name }}
      </n-text>

      <!-- 人物属性描述列表 -->
      <n-descriptions :column="1" size="small" bordered label-placement="left">
        <n-descriptions-item label="姓名" label-style="width: 52px">
          {{ character.name }}
        </n-descriptions-item>
        <n-descriptions-item label="年龄" label-style="width: 52px">
          {{ formatAge(character.age) }}
        </n-descriptions-item>
        <n-descriptions-item label="性格" label-style="width: 52px">
          <n-text :depth="character.traits.length > 0 ? false : 3">
            {{ formatTraits(character.traits) }}
          </n-text>
        </n-descriptions-item>
      </n-descriptions>
    </div>

    <!-- 卡片底部操作区：编辑和删除按钮 -->
    <template #footer>
      <div style="display: flex; justify-content: space-between; gap: 12px">
        <n-button
          size="small"
          type="error"
          quaternary
          @click.stop="emit('delete', character.id)"
        >
          删除
        </n-button>
        <n-button
          size="small"
          type="primary"
          quaternary
          @click.stop="emit('edit', props.character)"
        >
          编辑
        </n-button>
      </div>
    </template>
  </n-card>
</template>
