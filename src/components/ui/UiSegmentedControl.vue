<script setup lang="ts">
import { nextTick } from 'vue';

type SegmentedItem = {
  value: string;
  label: string;
  icon?: string;
  description?: string;
  disabled?: boolean;
};

const props = withDefaults(defineProps<{
  modelValue: string;
  items: SegmentedItem[];
  label: string;
  variant?: 'pill' | 'underline';
  compact?: boolean;
  equal?: boolean;
  wrap?: boolean;
  as?: 'div' | 'nav';
}>(), {
  variant: 'pill',
  compact: false,
  equal: false,
  wrap: false,
  as: 'div',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function tabIndexFor(item: SegmentedItem, index: number) {
  if (item.disabled) return -1;
  if (props.modelValue === item.value) return 0;
  const hasEnabledSelection = props.items.some(candidate => !candidate.disabled && candidate.value === props.modelValue);
  return !hasEnabledSelection && props.items.findIndex(candidate => !candidate.disabled) === index ? 0 : -1;
}

function handleKeydown(event: KeyboardEvent, index: number) {
  const enabled = props.items.map((item, itemIndex) => item.disabled ? -1 : itemIndex).filter(itemIndex => itemIndex >= 0);
  if (!enabled.length) return;

  const current = Math.max(0, enabled.indexOf(index));
  let targetPosition: number | null = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetPosition = (current + 1) % enabled.length;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetPosition = (current - 1 + enabled.length) % enabled.length;
  if (event.key === 'Home') targetPosition = 0;
  if (event.key === 'End') targetPosition = enabled.length - 1;
  if (targetPosition === null) return;

  event.preventDefault();
  const targetIndex = enabled[targetPosition]!;
  emit('update:modelValue', props.items[targetIndex]!.value);
  const group = (event.currentTarget as HTMLButtonElement).parentElement;
  void nextTick(() => group?.querySelectorAll<HTMLButtonElement>(':scope > button')[targetIndex]?.focus());
}
</script>

<template>
  <component
    :is="as"
    class="ui-segmented-control"
    :class="[`ui-segmented-control--${variant}`, {
      'ui-segmented-control--compact': compact,
      'ui-segmented-control--equal': equal,
      'ui-segmented-control--wrap': wrap,
    }]"
    role="tablist"
    :aria-label="label"
  >
    <button
      v-for="(item, index) in items"
      :key="item.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === item.value"
      :tabindex="tabIndexFor(item, index)"
      :class="{ active: modelValue === item.value }"
      :disabled="item.disabled"
      @click="emit('update:modelValue', item.value)"
      @keydown="handleKeydown($event, index)"
    >
      <span v-if="item.icon" class="ui-segmented-control__icon" aria-hidden="true">{{ item.icon }}</span>
      <span v-if="item.description" class="ui-segmented-control__copy">
        <strong>{{ item.label }}</strong>
        <small>{{ item.description }}</small>
      </span>
      <template v-else>{{ item.label }}</template>
    </button>
  </component>
</template>
