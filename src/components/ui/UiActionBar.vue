<script setup lang="ts">
withDefaults(defineProps<{
  align?: 'start' | 'center' | 'end' | 'between';
  mobile?: 'inline' | 'stack' | 'stretch';
}>(), {
  align: 'end',
  mobile: 'stretch',
});
</script>

<template>
  <div class="ui-action-bar" :class="[`ui-action-bar--${align}`, `ui-action-bar--mobile-${mobile}`]">
    <div v-if="$slots.start" class="ui-action-bar__start"><slot name="start" /></div>
    <div class="ui-action-bar__actions"><slot /></div>
  </div>
</template>
