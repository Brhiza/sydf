<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'article' | 'section' | 'div';
  padding?: 'none' | 'compact' | 'standard';
}>(), {
  as: 'article',
  padding: 'none',
});
</script>

<template>
  <component :is="as" class="ui-workspace-surface" :class="`ui-workspace-surface--${padding}`">
    <slot />
  </component>
</template>
