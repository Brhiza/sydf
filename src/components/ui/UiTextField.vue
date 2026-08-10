<script setup lang="ts">
import { computed, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

let nextFieldId = 0;

const props = withDefaults(defineProps<{
  modelValue?: string | number;
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxlength?: number;
  disabled?: boolean;
  required?: boolean;
}>(), {
  modelValue: '',
  id: '',
  label: '',
  hint: '',
  error: '',
  type: 'text',
  placeholder: '',
  multiline: false,
  rows: 3,
  maxlength: undefined,
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();
const generatedId = `ui-text-field-${++nextFieldId}`;
const controlId = computed(() => props.id || generatedId);
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style);
const controlAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

function updateValue(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement | HTMLTextAreaElement).value);
}
</script>

<template>
  <div class="ui-text-field" :class="[rootClass, { 'ui-text-field--error': error, 'ui-text-field--multiline': multiline }]" :style="rootStyle">
    <label v-if="label" class="ui-text-field__label" :for="controlId">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <component
      :is="multiline ? 'textarea' : 'input'"
      v-bind="controlAttrs"
      :id="controlId"
      class="ui-text-field__control"
      :type="multiline ? undefined : type"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="multiline ? rows : undefined"
      :maxlength="maxlength"
      :disabled="disabled"
      :required="required"
      :aria-invalid="Boolean(error) || undefined"
      :aria-describedby="hint || error ? `${controlId}-message` : undefined"
      @input="updateValue"
    ></component>
    <p v-if="error || hint" :id="`${controlId}-message`" class="ui-text-field__message" :class="{ 'is-error': error }">{{ error || hint }}</p>
  </div>
</template>
