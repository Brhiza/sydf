<script setup lang="ts">
withDefaults(defineProps<{
  ariaLabel?: string;
  labelledby?: string;
  panelClass?: string | string[] | Record<string, boolean>;
  size?: 'compact' | 'standard' | 'wide';
  padding?: 'none' | 'compact' | 'standard';
}>(), {
  ariaLabel: '',
  labelledby: '',
  panelClass: '',
  size: 'standard',
  padding: 'standard',
});

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div class="ui-dialog-layer" @click.self="emit('close')">
    <section
      class="ui-dialog"
      :class="[`ui-dialog--${size}`, `ui-dialog--padding-${padding}`, panelClass]"
      role="dialog"
      aria-modal="true"
      :aria-label="ariaLabel || undefined"
      :aria-labelledby="labelledby || undefined"
    >
      <slot />
    </section>
  </div>
</template>
