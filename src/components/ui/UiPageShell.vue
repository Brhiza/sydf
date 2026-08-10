<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'section' | 'article' | 'div' | 'main';
  width?: 'reading' | 'standard' | 'wide' | 'immersive';
}>(), {
  as: 'section',
  width: 'standard',
});
</script>

<template>
  <component :is="as" class="ui-page" :class="`ui-page--${width}`">
    <slot />
  </component>
</template>
