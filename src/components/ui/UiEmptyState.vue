<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  description?: string;
  compact?: boolean;
  busy?: boolean;
}>(), {
  description: '',
  compact: false,
  busy: false,
});
</script>

<template>
  <div class="ui-empty-state" :class="{ 'ui-empty-state--compact': compact, 'ui-empty-state--busy': busy }" role="status" :aria-live="busy ? 'polite' : 'off'">
    <span v-if="$slots.icon" class="ui-empty-state__icon"><slot name="icon" /></span>
    <strong>{{ title }}</strong>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.action" class="ui-empty-state__action"><slot name="action" /></div>
  </div>
</template>
