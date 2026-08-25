<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { UiButton } from './ui';

interface PickerOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface PickerColumn {
  key: string;
  label: string;
  options: ReadonlyArray<PickerOption>;
  flex?: number;
}

const props = withDefaults(defineProps<{
  title: string;
  columns: ReadonlyArray<PickerColumn>;
  modelValue: string[];
  cancelText?: string;
  confirmText?: string;
  hideWheel?: boolean;
}>(), {
  cancelText: '取消',
  confirmText: '完成',
  hideWheel: false,
});

const emit = defineEmits<{
  cancel: [];
  confirm: [values: string[]];
  'update:modelValue': [values: string[]];
}>();

const ROW_HEIGHT = 44;
const LOOP_COPIES = 3;
const LOOP_MIDDLE_COPY = 1;
const draftValues = ref<string[]>([]);
const columnElements = ref<Array<HTMLElement | null>>([]);
const scrollTimers = new Map<number, number>();

function valuesEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function normalizeValues(values: string[]) {
  return props.columns.map((column, index) => {
    const requested = values[index];
    return column.options.some((option) => option.value === requested && !option.disabled)
      ? requested
      : column.options.find((option) => !option.disabled)?.value || '';
  });
}

function setColumnElement(element: unknown, index: number) {
  columnElements.value[index] = element as HTMLElement | null;
}

function scrollColumnToValue(
  index: number,
  behavior: ScrollBehavior = 'auto',
  placement: 'middle' | 'nearest' = 'nearest',
) {
  const element = columnElements.value[index];
  const column = props.columns[index];
  if (!element || !column) return;
  const optionIndex = Math.max(0, column.options.findIndex((option) => option.value === draftValues.value[index]));
  const middleIndex = (LOOP_MIDDLE_COPY * column.options.length) + optionIndex;
  let targetIndex = middleIndex;
  if (placement === 'nearest' && column.options.length > 1) {
    const currentIndex = element.scrollTop / ROW_HEIGHT;
    targetIndex = Array.from(
      { length: LOOP_COPIES },
      (_, copyIndex) => (copyIndex * column.options.length) + optionIndex,
    ).reduce((nearest, candidate) => (
      Math.abs(candidate - currentIndex) < Math.abs(nearest - currentIndex) ? candidate : nearest
    ), middleIndex);
  }
  element.scrollTo({ top: targetIndex * ROW_HEIGHT, behavior });
}

function scrollAllColumns() {
  props.columns.forEach((_, index) => scrollColumnToValue(index, 'auto', 'middle'));
}

function syncFromProps() {
  const next = normalizeValues(props.modelValue);
  draftValues.value = next;
  void nextTick(scrollAllColumns);
}

function chooseValue(
  columnIndex: number,
  value: string,
  behavior: ScrollBehavior = 'smooth',
  placement: 'middle' | 'nearest' = 'nearest',
) {
  const column = props.columns[columnIndex];
  const option = column?.options.find((item) => item.value === value);
  if (!option || option.disabled) return;
  const next = normalizeValues([...draftValues.value]);
  next[columnIndex] = value;
  if (!valuesEqual(next, draftValues.value)) {
    draftValues.value = next;
    emit('update:modelValue', [...next]);
  }
  void nextTick(() => scrollColumnToValue(columnIndex, behavior, placement));
}

function handleScroll(columnIndex: number, event: Event) {
  const element = event.currentTarget as HTMLElement;
  const previousTimer = scrollTimers.get(columnIndex);
  if (previousTimer !== undefined) window.clearTimeout(previousTimer);
  const timer = window.setTimeout(() => {
    const column = props.columns[columnIndex];
    if (!column?.options.length) return;
    const renderedIndex = Math.round(element.scrollTop / ROW_HEIGHT);
    const optionIndex = ((renderedIndex % column.options.length) + column.options.length) % column.options.length;
    const option = column.options[optionIndex];
    if (option) chooseValue(columnIndex, option.value, 'auto', 'middle');
  }, 80);
  scrollTimers.set(columnIndex, timer);
}

function handleKeydown(columnIndex: number, event: KeyboardEvent) {
  const column = props.columns[columnIndex];
  if (!column?.options.length) return;
  const currentIndex = Math.max(0, column.options.findIndex((option) => option.value === draftValues.value[columnIndex]));
  let nextIndex = currentIndex;
  if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + column.options.length) % column.options.length;
  else if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % column.options.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = column.options.length - 1;
  else return;
  event.preventDefault();
  const option = column.options[nextIndex];
  if (option) chooseValue(columnIndex, option.value);
}

function confirmSelection() {
  emit('confirm', normalizeValues(draftValues.value));
}

watch(() => props.modelValue, syncFromProps, { deep: true });
watch(() => props.columns, syncFromProps, { deep: true });

onMounted(() => {
  syncFromProps();
  void nextTick(() => columnElements.value[0]?.focus({ preventScroll: true }));
});

onBeforeUnmount(() => {
  scrollTimers.forEach((timer) => window.clearTimeout(timer));
  scrollTimers.clear();
});
</script>

<template>
  <Teleport to="body">
    <div class="ui-picker-layer" @click.self="emit('cancel')">
      <section class="ui-picker-dialog" role="dialog" aria-modal="true" :aria-label="title">
        <header class="ui-picker-header">
          <UiButton class="ui-picker-action" variant="ghost" size="small" @click="emit('cancel')">{{ cancelText }}</UiButton>
          <h2>{{ title }}</h2>
          <UiButton class="ui-picker-action confirm" variant="ghost" size="small" @click="confirmSelection">{{ confirmText }}</UiButton>
        </header>
        <slot name="before-wheel" />
        <div v-show="!hideWheel" class="ui-picker-wheel">
          <div class="ui-picker-selection" aria-hidden="true" />
          <div
            v-for="(column, columnIndex) in columns"
            :key="column.key"
            class="ui-picker-column"
            :style="{ flex: column.flex || 1 }"
            role="listbox"
            :aria-label="column.label"
            tabindex="0"
            :ref="(element) => setColumnElement(element, columnIndex)"
            @scroll="handleScroll(columnIndex, $event)"
            @keydown="handleKeydown(columnIndex, $event)"
          >
            <div class="ui-picker-spacer" aria-hidden="true" />
            <template v-for="copyIndex in LOOP_COPIES" :key="copyIndex">
              <button
                v-for="option in column.options"
                :key="`${copyIndex}-${option.value}`"
                type="button"
                class="ui-picker-option"
                :class="{ selected: draftValues[columnIndex] === option.value }"
                :disabled="option.disabled"
                :tabindex="copyIndex === LOOP_MIDDLE_COPY + 1 ? 0 : -1"
                :role="copyIndex === LOOP_MIDDLE_COPY + 1 ? 'option' : 'presentation'"
                :aria-selected="copyIndex === LOOP_MIDDLE_COPY + 1 ? draftValues[columnIndex] === option.value : undefined"
                @click="chooseValue(columnIndex, option.value)"
              >
                {{ option.label }}
              </button>
            </template>
            <div class="ui-picker-spacer" aria-hidden="true" />
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.ui-picker-layer {
  align-items: center;
  background: rgba(35, 28, 43, .34);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 80;
}

.ui-picker-dialog {
  background: color-mix(in srgb, var(--paper, #fff) 96%, #fff);
  border: 1px solid var(--line, #e4deef);
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(38, 28, 57, .22);
  max-width: 100%;
  overflow: hidden;
  width: 480px;
}

.ui-picker-header {
  align-items: center;
  border-bottom: 1px solid var(--line, #e4deef);
  display: grid;
  grid-template-columns: 72px 1fr 72px;
  min-height: 50px;
  padding: 0 8px;
}

.ui-picker-header h2 {
  color: var(--ink, #302b43);
  font-size: 14px;
  font-weight: 650;
  margin: 0;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-picker-action {
  justify-self: stretch;
  width: 100%;
}

.ui-picker-action:first-child { justify-content: flex-start; }
.ui-picker-action:last-child { justify-content: flex-end; }
.ui-picker-action.confirm { color: var(--accent-strong, #6d529f); font-weight: 650; }

.ui-picker-wheel {
  display: flex;
  height: 220px;
  overflow: hidden;
  position: relative;
}

.ui-picker-selection {
  background: color-mix(in srgb, var(--accent, #8268b3) 9%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--accent, #8268b3) 22%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--accent, #8268b3) 22%, transparent);
  height: 44px;
  left: 8px;
  pointer-events: none;
  position: absolute;
  right: 8px;
  top: 88px;
  z-index: 2;
}

.ui-picker-column {
  height: 220px;
  mask-image: linear-gradient(to bottom, transparent 0, #000 24%, #000 76%, transparent 100%);
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  touch-action: pan-y;
}

.ui-picker-column + .ui-picker-column { border-left: 1px solid color-mix(in srgb, var(--line, #e4deef) 62%, transparent); }
.ui-picker-column::-webkit-scrollbar { display: none; }
.ui-picker-column:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent, #8268b3) 30%, transparent); outline-offset: -2px; }

.ui-picker-spacer { height: 88px; scroll-snap-align: none; }

.ui-picker-option {
  align-items: center;
  background: transparent;
  color: var(--muted, #817995);
  display: flex;
  font-size: 13px;
  height: 44px;
  justify-content: center;
  overflow: hidden;
  padding: 0 8px;
  scroll-snap-align: center;
  text-overflow: ellipsis;
  transition: color .14s, font-size .14s, opacity .14s;
  white-space: nowrap;
  width: 100%;
}

.ui-picker-option.selected { color: var(--ink, #302b43); font-size: 15px; font-weight: 650; }
.ui-picker-option:disabled { opacity: .28; }

@media (max-width: 720px) {
  .ui-picker-layer { align-items: flex-end; padding: 0; }
  .ui-picker-dialog {
    border-bottom: 0;
    border-left: 0;
    border-radius: 18px 18px 0 0;
    border-right: 0;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
    width: 100%;
  }
  .ui-picker-header { min-height: 52px; }
  .ui-picker-option { font-size: 14px; padding: 0 5px; }
  .ui-picker-option.selected { font-size: 16px; }
}

@media (prefers-color-scheme: dark) {
  .ui-picker-layer { background: rgba(4, 3, 7, .68); }
  .ui-picker-dialog { background: #242129; border-color: #403b46; box-shadow: 0 24px 70px rgba(0, 0, 0, .42); }
  .ui-picker-header { border-color: #403b46; }
  .ui-picker-header h2,
  .ui-picker-option.selected { color: #eee9f0; }
  .ui-picker-action,
  .ui-picker-option { color: #a9a1ad; }
  .ui-picker-action.confirm { color: #cbb4de; }
  .ui-picker-selection { background: rgba(166, 132, 199, .13); border-color: rgba(190, 159, 218, .22); }
  .ui-picker-column + .ui-picker-column { border-left-color: #39353f; }
}
</style>
