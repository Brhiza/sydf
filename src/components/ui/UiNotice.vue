<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'div' | 'p';
  tone?: 'neutral' | 'info' | 'success' | 'error';
  compact?: boolean;
}>(), {
  as: 'div',
  tone: 'neutral',
  compact: false,
});
</script>

<template>
  <component
    :is="as"
    class="ui-notice"
    :class="[`ui-notice--${tone}`, { 'ui-notice--compact': compact }]"
    :role="tone === 'error' ? 'alert' : 'status'"
  >
    <span v-if="$slots.icon" class="ui-notice__icon"><slot name="icon" /></span>
    <div class="ui-notice__content"><slot /></div>
    <div v-if="$slots.action" class="ui-notice__action"><slot name="action" /></div>
  </component>
</template>
