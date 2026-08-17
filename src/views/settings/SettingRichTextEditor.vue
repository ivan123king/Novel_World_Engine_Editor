<script setup lang="ts">
/**
 * 设定富文本编辑器组件。
 * 基于 Tiptap 提供最基础的文字编辑能力，不开放图片、附件等会扩大数据边界的内容类型。
 */
import { watch } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { EMPTY_SETTING_HTML } from '@/views/settings/settingContent';

const props = defineProps<{
  /** 富文本 HTML 内容。 */
  modelValue: string;
  /** 保存过程中禁止继续编辑，避免提交内容和界面状态不一致。 */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  /** 内容变化事件，用于父组件表单状态同步。 */
  'update:modelValue': [value: string];
}>();

/** Tiptap 编辑器实例，只启用基础文字编辑扩展。 */
const editor = useEditor({
  content: props.modelValue || EMPTY_SETTING_HTML,
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [2, 3],
      },
      link: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
    }),
  ],
  onUpdate: ({ editor: currentEditor }) => {
    emit('update:modelValue', currentEditor.getHTML());
  },
});

/** 外部表单重置或切换编辑对象时，同步更新编辑器内容。 */
watch(
  () => props.modelValue,
  (nextValue) => {
    const currentEditor = editor.value;

    if (!currentEditor || currentEditor.getHTML() === nextValue) {
      return;
    }

    currentEditor.commands.setContent(nextValue || EMPTY_SETTING_HTML, {
      emitUpdate: false,
    });
  },
);

/** 保存状态变化时，切换编辑器可编辑状态。 */
watch(
  () => props.disabled,
  (nextDisabled) => {
    editor.value?.setEditable(!nextDisabled);
  },
);
</script>

<template>
  <div class="setting-rich-editor" :class="{ 'is-disabled': disabled }">
    <!-- 富文本工具栏：只保留设定内容需要的基础文字编写能力。 -->
    <div v-if="editor" class="setting-editor-toolbar" aria-label="设定富文本工具栏">
      <button
        class="toolbar-button"
        :class="{ 'is-active': editor.isActive('paragraph') }"
        type="button"
        title="正文"
        :disabled="disabled"
        @click="editor.chain().focus().setParagraph().run()"
      >
        正文
      </button>
      <button
        class="toolbar-button"
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        type="button"
        title="二级标题"
        :disabled="disabled"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        class="toolbar-button"
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        type="button"
        title="三级标题"
        :disabled="disabled"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <span class="toolbar-divider" aria-hidden="true" />
      <button
        class="toolbar-button"
        :class="{ 'is-active': editor.isActive('bold') }"
        type="button"
        title="加粗"
        :disabled="disabled"
        @click="editor.chain().focus().toggleBold().run()"
      >
        加粗
      </button>
      <button
        class="toolbar-button"
        :class="{ 'is-active': editor.isActive('italic') }"
        type="button"
        title="斜体"
        :disabled="disabled"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        斜体
      </button>
      <button
        class="toolbar-button"
        :class="{ 'is-active': editor.isActive('strike') }"
        type="button"
        title="删除线"
        :disabled="disabled"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        删除线
      </button>
      <span class="toolbar-divider" aria-hidden="true" />
      <button
        class="toolbar-button"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        type="button"
        title="无序列表"
        :disabled="disabled"
        @click="editor.chain().focus().toggleBulletList().run()"
      >
        • 列表
      </button>
      <button
        class="toolbar-button"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        type="button"
        title="有序列表"
        :disabled="disabled"
        @click="editor.chain().focus().toggleOrderedList().run()"
      >
        1. 列表
      </button>
      <button
        class="toolbar-button"
        :class="{ 'is-active': editor.isActive('blockquote') }"
        type="button"
        title="引用"
        :disabled="disabled"
        @click="editor.chain().focus().toggleBlockquote().run()"
      >
        引用
      </button>
      <span class="toolbar-divider" aria-hidden="true" />
      <button
        class="toolbar-button"
        type="button"
        title="撤销"
        :disabled="disabled || !editor.can().undo()"
        @click="editor.chain().focus().undo().run()"
      >
        撤销
      </button>
      <button
        class="toolbar-button"
        type="button"
        title="重做"
        :disabled="disabled || !editor.can().redo()"
        @click="editor.chain().focus().redo().run()"
      >
        重做
      </button>
    </div>

    <EditorContent class="setting-editor-content" :editor="editor" />
  </div>
</template>

<style scoped>
/** 富文本编辑器外框。 */
.setting-rich-editor {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 6px;
}

.setting-rich-editor.is-disabled {
  opacity: 0.72;
}

/** 简化工具栏。 */
.setting-editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px;
  background: #f8fafc;
  border-bottom: 1px solid #d9e1ea;
}

/** 工具栏按钮。 */
.toolbar-button {
  min-width: 34px;
  height: 28px;
  padding: 0 8px;
  color: #334155;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

.toolbar-button:hover:not(:disabled),
.toolbar-button.is-active {
  color: #1f5f9f;
  background: #eef6ff;
  border-color: #7aa7d9;
}

.toolbar-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/** 工具栏分隔线。 */
.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #d9e1ea;
}

/** 编辑器正文区域。 */
.setting-editor-content :deep(.tiptap) {
  min-height: 260px;
  max-height: 420px;
  padding: 14px 16px;
  overflow: auto;
  color: #24313d;
  font-size: 14px;
  line-height: 1.75;
  outline: none;
}

.setting-editor-content :deep(.tiptap p),
.setting-editor-content :deep(.tiptap ul),
.setting-editor-content :deep(.tiptap ol),
.setting-editor-content :deep(.tiptap blockquote),
.setting-editor-content :deep(.tiptap h2),
.setting-editor-content :deep(.tiptap h3) {
  margin: 0 0 10px;
}

.setting-editor-content :deep(.tiptap h2) {
  font-size: 20px;
  line-height: 1.35;
}

.setting-editor-content :deep(.tiptap h3) {
  font-size: 17px;
  line-height: 1.4;
}

.setting-editor-content :deep(.tiptap ul),
.setting-editor-content :deep(.tiptap ol) {
  padding-left: 24px;
}

.setting-editor-content :deep(.tiptap blockquote) {
  padding-left: 12px;
  color: #52616f;
  border-left: 3px solid #9db7d3;
}
</style>
