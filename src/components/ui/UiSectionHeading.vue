<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'header' | 'div';
  title: string;
  description?: string;
  eyebrow?: string;
  compact?: boolean;
}>(), {
  as: 'header',
  description: '',
  eyebrow: '',
  compact: false,
});
</script>

<template>
  <component :is="as" class="ui-section-heading" :class="{ 'ui-section-heading--compact': compact }">
    <div class="ui-section-heading__copy">
      <span v-if="eyebrow" class="ui-section-heading__eyebrow">{{ eyebrow }}</span>
      <h2>{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="ui-section-heading__action"><slot name="action" /></div>
  </component>
</template>
