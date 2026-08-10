<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  block?: boolean;
  iconOnly?: boolean;
  disabled?: boolean;
  loading?: boolean;
}>(), {
  type: 'button',
  variant: 'primary',
  size: 'medium',
  block: false,
  iconOnly: false,
  disabled: false,
  loading: false,
});
</script>

<template>
  <button
    :type="type"
    class="ui-button"
    :class="[
      `ui-button--${variant}`,
      `ui-button--${size}`,
      { 'ui-button--block': block, 'ui-button--icon-only': iconOnly },
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="ui-button__spinner" aria-hidden="true"></span>
    <span class="ui-button__content"><slot /></span>
  </button>
</template>
