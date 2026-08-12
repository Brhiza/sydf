<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

defineOptions({ inheritAttrs: false });

export interface UiSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface UiSelectGroup {
  label: string;
  options: UiSelectOption[];
  disabled?: boolean;
}

let nextSelectId = 0;

const props = withDefaults(defineProps<{
  modelValue?: string | number;
  options?: UiSelectOption[];
  groups?: UiSelectGroup[];
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  modelModifiers?: { number?: boolean };
}>(), {
  modelValue: '',
  options: () => [],
  groups: () => [],
  id: '',
  label: '',
  hint: '',
  error: '',
  placeholder: '',
  disabled: false,
  required: false,
  modelModifiers: () => ({}),
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const attrs = useAttrs();
const generatedId = `ui-select-${++nextSelectId}`;
const controlId = computed(() => props.id || generatedId);
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style);
const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});
const allOptions = computed(() => [...props.options, ...props.groups.flatMap(group => group.options)]);

function updateValue(event: Event) {
  const rawValue = (event.target as HTMLSelectElement).value;
  const matched = allOptions.value.find(option => String(option.value) === rawValue);
  const value = matched?.value ?? (props.modelModifiers.number ? Number(rawValue) : rawValue);
  emit('update:modelValue', value);
}
</script>

<template>
  <div class="ui-select" :class="[rootClass, { 'ui-select--error': error, 'ui-select--disabled': disabled }]" :style="rootStyle">
    <label v-if="label" class="ui-select__label" :for="controlId">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <div class="ui-select__control-wrap">
      <select
        v-bind="controlAttrs"
        :id="controlId"
        class="ui-select__control"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :aria-invalid="Boolean(error) || undefined"
        :aria-describedby="hint || error ? `${controlId}-message` : undefined"
        @change="updateValue"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="option in options" :key="String(option.value)" :value="option.value" :disabled="option.disabled">{{ option.label }}</option>
        <optgroup v-for="group in groups" :key="group.label" :label="group.label" :disabled="group.disabled">
          <option v-for="option in group.options" :key="String(option.value)" :value="option.value" :disabled="option.disabled">{{ option.label }}</option>
        </optgroup>
        <slot></slot>
      </select>
      <ChevronDown class="ui-select__icon" :size="16" aria-hidden="true" />
    </div>
    <p v-if="error || hint" :id="`${controlId}-message`" class="ui-select__message" :class="{ 'is-error': error }">{{ error || hint }}</p>
  </div>
</template>
