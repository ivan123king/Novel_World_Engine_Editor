<script setup lang="ts">
/**
 * 人物详情弹框。
 * 当前阶段用只读弹框临时代替独立详情页面。
 */
import AppModal from '@/components/common/AppModal.vue';
import type { CharacterFile } from '@/types';

const props = defineProps<{
  open: boolean;
  character: CharacterFile | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

/** 获取名称展示文本。 */
function formatName(character: CharacterFile | null): string {
  return character?.name || '人物详情';
}

/** 获取年龄展示文本。 */
function formatAge(character: CharacterFile | null): string {
  const age = character?.age;
  return age === null || age === undefined || age === '' ? '未知' : String(age);
}

/** 获取性格标签展示文本。 */
function formatTraits(character: CharacterFile | null): string {
  return character?.traits.length ? character.traits.join('、') : '未填写';
}

/** 获取外貌展示文本。 */
function formatAppearance(character: CharacterFile | null): string {
  return character?.appearance || '未填写';
}

/** 格式化自定义字段，便于第一版详情弹框直接查看原始结构。 */
function formatCustomFields(character: CharacterFile | null): string {
  return JSON.stringify(character?.customFields ?? {}, null, 2);
}
</script>

<template>
  <AppModal :open="open" :title="formatName(character)" width="620px" @close="emit('close')">
    <div v-if="props.character" class="detail-panel">
      <dl>
        <div>
          <dt>名称</dt>
          <dd>{{ formatName(character) }}</dd>
        </div>
        <div>
          <dt>年龄</dt>
          <dd>{{ formatAge(character) }}</dd>
        </div>
        <div>
          <dt>性格</dt>
          <dd>{{ formatTraits(character) }}</dd>
        </div>
        <div>
          <dt>外貌</dt>
          <dd>{{ formatAppearance(character) }}</dd>
        </div>
      </dl>

      <section class="custom-fields">
        <h3>自定义字段</h3>
        <pre>{{ formatCustomFields(character) }}</pre>
      </section>
    </div>
  </AppModal>
</template>

<style scoped>
.detail-panel {
  display: grid;
  gap: 18px;
}

dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

dl div {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 14px;
}

dt {
  color: #607080;
}

dd {
  margin: 0;
  color: #17212b;
  line-height: 1.6;
}

.custom-fields {
  display: grid;
  gap: 8px;
}

.custom-fields h3 {
  margin: 0;
  color: #27313c;
  font-size: 15px;
}

pre {
  overflow: auto;
  max-height: 220px;
  margin: 0;
  border: 1px solid #d8e0e8;
  border-radius: 6px;
  background: #f7fafc;
  padding: 12px;
  color: #27313c;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}
</style>
