<script setup lang="ts">
withDefaults(defineProps<{
  ratio?: 'equal' | 'wide-left';
}>(), {
  ratio: 'equal',
});
</script>

<template>
  <div class="ui-reading-grid" :class="`ui-reading-grid--${ratio}`">
    <slot />
  </div>
</template>

<style scoped>
.ui-reading-grid {
  border-top: 1px solid var(--ds-line);
  display: grid;
  min-width: 0;
}

.ui-reading-grid--equal { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.ui-reading-grid--wide-left { grid-template-columns: minmax(0, 1.3fr) minmax(260px, .7fr); }
.ui-reading-grid :deep(> .ui-reading-section) { border-top: 0; }
.ui-reading-grid :deep(> :not(:first-child)) { border-left: 1px solid var(--ds-line); }

@media (max-width: 820px) {
  .ui-reading-grid { grid-template-columns: 1fr; }
  .ui-reading-grid :deep(> :not(:first-child)) { border-left: 0; border-top: 1px solid var(--ds-line); }
}
</style>
