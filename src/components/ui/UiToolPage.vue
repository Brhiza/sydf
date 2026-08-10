<script setup lang="ts">
import UiPageShell from './UiPageShell.vue';
import UiToolToolbar from './UiToolToolbar.vue';

withDefaults(defineProps<{
  as?: 'section' | 'article' | 'div' | 'main';
  width?: 'reading' | 'standard' | 'wide' | 'immersive';
  toolbarLabel?: string;
  toolbarClass?: string;
}>(), {
  as: 'section',
  width: 'standard',
  toolbarLabel: '页面工具栏',
  toolbarClass: '',
});
</script>

<template>
  <UiPageShell :as="as" :width="width" class="ui-tool-page">
    <UiToolToolbar v-if="$slots['toolbar-primary'] || $slots['toolbar-secondary']" :class="toolbarClass" :label="toolbarLabel">
      <template v-if="$slots['toolbar-primary']" #primary><slot name="toolbar-primary" /></template>
      <template v-if="$slots['toolbar-secondary']" #secondary><slot name="toolbar-secondary" /></template>
    </UiToolToolbar>
    <slot />
  </UiPageShell>
</template>
