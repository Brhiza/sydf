<script setup lang="ts">
import UiReadingHero from './UiReadingHero.vue';
import UiWorkspaceSurface from './UiWorkspaceSurface.vue';

withDefaults(defineProps<{
  as?: 'article' | 'section' | 'div';
}>(), {
  as: 'article',
});
</script>

<template>
  <UiWorkspaceSurface :as="as" class="ui-reading-workspace">
    <UiReadingHero
      :has-media="Boolean($slots['hero-media'])"
      :has-context="Boolean($slots['hero-context'])"
      :has-summary="Boolean($slots['hero-summary'])"
    >
      <template v-if="$slots['hero-media']" #media><slot name="hero-media" /></template>
      <template v-if="$slots['hero-context']" #context><slot name="hero-context" /></template>
      <template v-if="$slots['hero-summary']" #summary><slot name="hero-summary" /></template>
    </UiReadingHero>

    <slot />
  </UiWorkspaceSurface>
</template>

<style scoped>
/* On framed desktop heroes, the frame itself already separates the next block. */
@media (min-width: 721px) {
  .ui-reading-workspace :deep(.ui-reading-hero + .ui-reading-section),
  .ui-reading-workspace :deep(.ui-reading-hero + .ui-reading-grid) { border-top: 0; }
}
</style>
