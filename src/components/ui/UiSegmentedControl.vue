<script setup lang="ts">
type SegmentedItem = {
  value: string;
  label: string;
  icon?: string;
  description?: string;
  disabled?: boolean;
};

withDefaults(defineProps<{
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
      v-for="item in items"
      :key="item.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === item.value"
      :class="{ active: modelValue === item.value }"
      :disabled="item.disabled"
      @click="emit('update:modelValue', item.value)"
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
