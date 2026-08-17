<script setup lang="ts">
/**
 * 公共富文本编辑器组件。
 * 默认只提供标题和正文两类结构，并内置中文写作 Tab 首行缩进能力。
 */
import { watch } from 'vue';
import { Extension, type Editor } from '@tiptap/core';
import { TableKit } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';

type RichTextEditorMode = 'simple' | 'setting';

const FIRST_LINE_INDENT = '\u3000\u3000';
const EMPTY_RICH_TEXT_HTML = '<p></p>';

const props = withDefaults(
  defineProps<{
    /** 富文本 HTML 内容。 */
    modelValue: string;
    /** 编辑器能力模式，simple 只保留标题和正文，setting 保留设定模块已有能力。 */
    mode?: RichTextEditorMode;
    /** 保存过程中禁止继续编辑，避免提交内容和界面状态不一致。 */
    disabled?: boolean;
  }>(),
  {
    mode: 'simple',
    disabled: false,
  },
);

const emit = defineEmits<{
  /** 内容变化事件，用于父组件表单状态同步。 */
  'update:modelValue': [value: string];
}>();

/**
 * 删除当前文本块开头的中文首行缩进。
 * @param currentEditor 当前 Tiptap 编辑器实例
 */
function removeCurrentTextBlockIndent(currentEditor: Editor): boolean {
  const { state, view } = currentEditor;
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);

    if (!node.isTextblock) {
      continue;
    }

    const leadingText = node.textBetween(0, FIRST_LINE_INDENT.length);

    if (!leadingText.startsWith(FIRST_LINE_INDENT)) {
      return true;
    }

    const contentStartPosition = $from.before(depth) + 1;
    view.dispatch(
      state.tr
        .delete(contentStartPosition, contentStartPosition + FIRST_LINE_INDENT.length)
        .scrollIntoView(),
    );

    return true;
  }

  return true;
}

/** 中文写作快捷键：正文按 Tab 插入首行缩进，设定模式中的列表和表格保留编辑器语义。 */
const ChineseWritingKeymap = Extension.create({
  name: 'chineseWritingKeymap',

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor: currentEditor }) => {
        if (currentEditor.isActive('table')) {
          if (currentEditor.commands.goToNextCell()) {
            return true;
          }

          if (!currentEditor.can().addRowAfter()) {
            return true;
          }

          return currentEditor.chain().addRowAfter().goToNextCell().run();
        }

        if (currentEditor.isActive('listItem')) {
          currentEditor.commands.sinkListItem('listItem');
          return true;
        }

        currentEditor.chain().focus().insertContent(FIRST_LINE_INDENT).run();
        return true;
      },
      'Shift-Tab': ({ editor: currentEditor }) => {
        if (currentEditor.isActive('table')) {
          currentEditor.commands.goToPreviousCell();
          return true;
        }

        if (currentEditor.isActive('listItem')) {
          currentEditor.commands.liftListItem('listItem');
          return true;
        }

        return removeCurrentTextBlockIndent(currentEditor);
      },
    };
  },
});

/** 创建只保留标题和正文的精简编辑器扩展。 */
function createSimpleExtensions() {
  return [
    StarterKit.configure({
      heading: {
        levels: [2, 3],
      },
      bold: false,
      italic: false,
      strike: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
      link: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
    }),
    ChineseWritingKeymap,
  ];
}

/** 创建设定模块模式扩展，兼容原设定编辑器的基础文字、列表和表格能力。 */
function createSettingExtensions() {
  return [
    StarterKit.configure({
      heading: {
        levels: [2, 3],
      },
      link: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
    }),
    TableKit.configure({
      table: {
        resizable: true,
      },
      tableCell: {},
      tableHeader: {},
      tableRow: {},
    }),
    ChineseWritingKeymap,
  ];
}

/** Tiptap 编辑器实例，根据模式开放对应工具栏和扩展能力。 */
const editor = useEditor({
  content: props.modelValue || EMPTY_RICH_TEXT_HTML,
  editable: !props.disabled,
  extensions: props.mode === 'setting' ? createSettingExtensions() : createSimpleExtensions(),
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

    currentEditor.commands.setContent(nextValue || EMPTY_RICH_TEXT_HTML, {
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
  <div class="rich-text-editor" :class="{ 'is-disabled': disabled }">
    <!-- 富文本工具栏：精简模式只保留标题和正文，设定模式保留原有设定写作能力。 -->
    <div v-if="editor" class="rich-text-editor__toolbar" aria-label="富文本工具栏">
      <button
        class="rich-text-editor__button"
        :class="{ 'is-active': editor.isActive('paragraph') }"
        type="button"
        title="正文"
        :disabled="disabled"
        @click="editor.chain().focus().setParagraph().run()"
      >
        正文
      </button>
      <button
        class="rich-text-editor__button"
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        type="button"
        title="二级标题"
        :disabled="disabled"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        class="rich-text-editor__button"
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        type="button"
        title="三级标题"
        :disabled="disabled"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>

      <template v-if="mode === 'setting'">
        <span class="rich-text-editor__divider" aria-hidden="true" />
        <button
          class="rich-text-editor__button"
          :class="{ 'is-active': editor.isActive('bold') }"
          type="button"
          title="加粗"
          :disabled="disabled"
          @click="editor.chain().focus().toggleBold().run()"
        >
          加粗
        </button>
        <button
          class="rich-text-editor__button"
          :class="{ 'is-active': editor.isActive('italic') }"
          type="button"
          title="斜体"
          :disabled="disabled"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          斜体
        </button>
        <button
          class="rich-text-editor__button"
          :class="{ 'is-active': editor.isActive('strike') }"
          type="button"
          title="删除线"
          :disabled="disabled"
          @click="editor.chain().focus().toggleStrike().run()"
        >
          删除线
        </button>
        <span class="rich-text-editor__divider" aria-hidden="true" />
        <button
          class="rich-text-editor__button"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          type="button"
          title="无序列表"
          :disabled="disabled"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          • 列表
        </button>
        <button
          class="rich-text-editor__button"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          type="button"
          title="有序列表"
          :disabled="disabled"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          1. 列表
        </button>
        <button
          class="rich-text-editor__button"
          :class="{ 'is-active': editor.isActive('blockquote') }"
          type="button"
          title="引用"
          :disabled="disabled"
          @click="editor.chain().focus().toggleBlockquote().run()"
        >
          引用
        </button>
        <span class="rich-text-editor__divider" aria-hidden="true" />
        <button
          class="rich-text-editor__button"
          type="button"
          title="插入三行三列表格"
          :disabled="disabled"
          @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
        >
          表格
        </button>
        <button
          class="rich-text-editor__button"
          type="button"
          title="在当前行后插入一行"
          :disabled="disabled || !editor.isActive('table')"
          @click="editor.chain().focus().addRowAfter().run()"
        >
          +行
        </button>
        <button
          class="rich-text-editor__button"
          type="button"
          title="删除当前行"
          :disabled="disabled || !editor.isActive('table')"
          @click="editor.chain().focus().deleteRow().run()"
        >
          -行
        </button>
        <button
          class="rich-text-editor__button"
          type="button"
          title="在当前列后插入一列"
          :disabled="disabled || !editor.isActive('table')"
          @click="editor.chain().focus().addColumnAfter().run()"
        >
          +列
        </button>
        <button
          class="rich-text-editor__button"
          type="button"
          title="删除当前列"
          :disabled="disabled || !editor.isActive('table')"
          @click="editor.chain().focus().deleteColumn().run()"
        >
          -列
        </button>
        <button
          class="rich-text-editor__button"
          type="button"
          title="删除当前表格"
          :disabled="disabled || !editor.isActive('table')"
          @click="editor.chain().focus().deleteTable().run()"
        >
          删表
        </button>
      </template>

      <span class="rich-text-editor__divider" aria-hidden="true" />
      <button
        class="rich-text-editor__button"
        type="button"
        title="撤销"
        :disabled="disabled || !editor.can().undo()"
        @click="editor.chain().focus().undo().run()"
      >
        撤销
      </button>
      <button
        class="rich-text-editor__button"
        type="button"
        title="重做"
        :disabled="disabled || !editor.can().redo()"
        @click="editor.chain().focus().redo().run()"
      >
        重做
      </button>
    </div>

    <EditorContent class="rich-text-editor__content" :editor="editor" />
  </div>
</template>

<style scoped>
/** 富文本编辑器外框。 */
.rich-text-editor {
  display: block;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #d9e1ea;
  border-radius: 6px;
}

.rich-text-editor.is-disabled {
  opacity: 0.72;
}

/** 编辑器工具栏。 */
.rich-text-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  width: 100%;
  padding: 8px;
  background: #f8fafc;
  border-bottom: 1px solid #d9e1ea;
}

/** 工具栏按钮。 */
.rich-text-editor__button {
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

.rich-text-editor__button:hover:not(:disabled),
.rich-text-editor__button.is-active {
  color: #1f5f9f;
  background: #eef6ff;
  border-color: #7aa7d9;
}

.rich-text-editor__button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/** 工具栏分隔线。 */
.rich-text-editor__divider {
  width: 1px;
  height: 20px;
  background: #d9e1ea;
}

/** 编辑器正文区域。 */
.rich-text-editor__content :deep(.tiptap) {
  width: 100%;
  box-sizing: border-box;
  min-height: 260px;
  max-height: 420px;
  padding: 14px 16px;
  overflow: auto;
  color: #24313d;
  font-size: 14px;
  line-height: 1.75;
  outline: none;
}

.rich-text-editor__content :deep(.tiptap p),
.rich-text-editor__content :deep(.tiptap ul),
.rich-text-editor__content :deep(.tiptap ol),
.rich-text-editor__content :deep(.tiptap blockquote),
.rich-text-editor__content :deep(.tiptap h2),
.rich-text-editor__content :deep(.tiptap h3) {
  margin: 0 0 10px;
}

.rich-text-editor__content :deep(.tiptap h2) {
  font-size: 20px;
  line-height: 1.35;
}

.rich-text-editor__content :deep(.tiptap h3) {
  font-size: 17px;
  line-height: 1.4;
}

.rich-text-editor__content :deep(.tiptap ul),
.rich-text-editor__content :deep(.tiptap ol) {
  padding-left: 24px;
}

.rich-text-editor__content :deep(.tiptap blockquote) {
  padding-left: 12px;
  color: #52616f;
  border-left: 3px solid #9db7d3;
}

.rich-text-editor__content :deep(.tiptap table) {
  width: 100%;
  margin: 0 0 12px;
  border-collapse: collapse;
  table-layout: fixed;
}

.rich-text-editor__content :deep(.tiptap th),
.rich-text-editor__content :deep(.tiptap td) {
  position: relative;
  min-width: 72px;
  padding: 8px 10px;
  vertical-align: top;
  border: 1px solid #cbd5e1;
}

.rich-text-editor__content :deep(.tiptap th) {
  color: #17212b;
  background: #eef6ff;
  font-weight: 700;
}

.rich-text-editor__content :deep(.tiptap .selectedCell::after) {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  content: '';
  background: rgb(122 167 217 / 18%);
}

.rich-text-editor__content :deep(.tiptap .column-resize-handle) {
  position: absolute;
  top: 0;
  right: -2px;
  bottom: -2px;
  width: 4px;
  pointer-events: none;
  background: #7aa7d9;
}

.rich-text-editor__content :deep(.tiptap.resize-cursor) {
  cursor: col-resize;
}
</style>
