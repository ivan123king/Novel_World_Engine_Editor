<script setup lang="ts">
/**
 * 人物卡片组件。
 * 展示人物基础摘要，并把详情、编辑、删除动作交给父级处理。
 */
import type { CharacterFile } from '@/types';

const props = defineProps<{
  character: CharacterFile;
}>();

const emit = defineEmits<{
  detail: [character: CharacterFile];
  edit: [character: CharacterFile];
  delete: [characterId: string];
}>();

/** 获取年龄展示文本。 */
function formatAge(age: CharacterFile['age']): string {
  return age === null || age === '' ? '未知' : String(age);
}

/** 获取性格标签展示文本。 */
function formatTraits(traits: string[]): string {
  return traits.length > 0 ? traits.join('、') : '未填写';
}
</script>

<template>
  <article class="character-card" tabindex="0" @click="emit('detail', props.character)">
    <div class="card-body">
      <h3>{{ character.name }}</h3>
      <dl>
        <div>
          <dt>姓名</dt>
          <dd>{{ character.name }}</dd>
        </div>
        <div>
          <dt>年龄</dt>
          <dd>{{ formatAge(character.age) }}</dd>
        </div>
        <div>
          <dt>性格</dt>
          <dd>{{ formatTraits(character.traits) }}</dd>
        </div>
      </dl>
    </div>

    <footer class="card-actions">
      <button type="button" @click.stop="emit('delete', character.id)">删除</button>
      <button type="button" @click.stop="emit('edit', props.character)">编辑</button>
    </footer>
  </article>
</template>

<style scoped>
.character-card {
  display: grid;
  grid-template-rows: 1fr auto;
  width: 214px;
  min-height: 230px;
  border: 2px solid #222b35;
  background: #ffffff;
  color: #27313c;
  cursor: pointer;
}

.character-card:hover {
  border-color: #3b6ea8;
  box-shadow: 0 6px 16px rgba(39, 49, 60, 0.12);
}

.character-card:focus-visible {
  outline: 3px solid #7aa7d9;
  outline-offset: 3px;
}

.card-body {
  padding: 18px 14px 10px;
}

.card-body h3 {
  margin: 0 0 14px;
  font-size: 18px;
  line-height: 1.25;
}

dl {
  display: grid;
  gap: 8px;
  margin: 0;
}

dl div {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 8px;
}

dt {
  color: #526170;
}

dd {
  overflow: hidden;
  margin: 0;
  color: #27313c;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px 14px;
}

.card-actions button {
  min-width: 82px;
  border: 2px solid #222b35;
  border-radius: 18px;
  background: #ffffff;
  color: #27313c;
  cursor: pointer;
  padding: 6px 12px;
}

.card-actions button:hover {
  background: #edf3f8;
}
</style>
