<script setup lang="ts">
withDefaults(defineProps<{
  label?: string;
}>(), {
  label: '页面工具栏',
});
</script>

<template>
  <header class="ui-tool-toolbar" :aria-label="label">
    <div class="ui-tool-toolbar__primary">
      <slot name="primary" />
    </div>
    <div v-if="$slots.secondary" class="ui-tool-toolbar__secondary">
      <slot name="secondary" />
    </div>
  </header>
</template>
