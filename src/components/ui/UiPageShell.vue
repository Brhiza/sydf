<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'section' | 'article' | 'div' | 'main';
}>(), {
  as: 'section',
});
</script>

<template>
  <component :is="as" class="ui-page">
    <slot />
  </component>
</template>
