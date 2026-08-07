<script setup lang="ts">
/**
 * 公共弹框组件。
 * 用于详情、新建、编辑等需要覆盖当前页面的轻量交互场景。
 */
import { onBeforeUnmount, onMounted } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    width?: string;
  }>(),
  {
    width: '560px',
  },
);

const emit = defineEmits<{
  close: [];
}>();

/** 关闭当前弹框。 */
function closeModal(): void {
  emit('close');
}

/** 按 Escape 时关闭弹框，保持桌面工具常见交互。 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) {
    closeModal();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="closeModal">
      <section class="app-modal" :style="{ width }" role="dialog" aria-modal="true">
        <header class="modal-header">
          <h2>{{ title }}</h2>
          <button class="modal-close" type="button" aria-label="关闭弹框" @click="closeModal">×</button>
        </header>
        <div class="modal-content">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: rgba(23, 33, 43, 0.28);
  padding: 24px;
}

.app-modal {
  max-width: min(92vw, 720px);
  max-height: min(86vh, 760px);
  overflow: hidden;
  border: 1px solid #b7c3cf;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(23, 33, 43, 0.18);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #d8e0e8;
  padding: 14px 16px;
}

.modal-header h2 {
  overflow: hidden;
  color: #17212b;
  font-size: 17px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-close {
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #526170;
  cursor: pointer;
  font-size: 22px;
  line-height: 1;
}

.modal-close:hover {
  border-color: #c7d1dc;
  background: #f2f5f8;
  color: #17212b;
}

.modal-content {
  max-height: calc(86vh - 130px);
  overflow: auto;
  padding: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #d8e0e8;
  padding: 12px 16px;
}
</style>
