<script setup lang="ts">
import { X } from 'lucide-vue-next';

withDefaults(defineProps<{
  title: string;
  titleId?: string;
  eyebrow?: string;
  description?: string;
  closeLabel?: string;
}>(), {
  titleId: '',
  eyebrow: '',
  description: '',
  closeLabel: '关闭',
});

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <header class="ui-dialog-header">
    <div class="ui-dialog-header__copy">
      <span v-if="eyebrow" class="ui-dialog-header__eyebrow">{{ eyebrow }}</span>
      <h2 :id="titleId || undefined">{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="ui-dialog-header__action"><slot name="action" /></div>
    <button type="button" class="ui-dialog-header__close" :aria-label="closeLabel" @click="emit('close')">
      <X :size="18" />
    </button>
  </header>
</template>
