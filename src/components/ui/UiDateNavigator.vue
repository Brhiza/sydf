<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-vue-next';

withDefaults(defineProps<{
  label: string;
  selectLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  resetLabel?: string;
  variant?: 'contained' | 'plain';
}>(), {
  selectLabel: '选择日期',
  previousLabel: '上一日期',
  nextLabel: '下一日期',
  resetLabel: '',
  variant: 'contained',
});

const emit = defineEmits<{
  previous: [];
  next: [];
  select: [];
  reset: [];
}>();
</script>

<template>
  <div class="ui-date-navigator" :class="`ui-date-navigator--${variant}`">
    <button type="button" class="ui-date-navigator__step" :aria-label="previousLabel" @click="emit('previous')">
      <ChevronLeft :size="16" />
    </button>
    <div v-if="$slots.trigger" class="ui-date-navigator__custom">
      <slot name="trigger" :label="label" />
    </div>
    <button v-else type="button" class="ui-date-navigator__trigger" :aria-label="selectLabel" aria-haspopup="dialog" @click="emit('select')">
      <CalendarDays :size="15" />
      <strong>{{ label }}</strong>
    </button>
    <button type="button" class="ui-date-navigator__step" :aria-label="nextLabel" @click="emit('next')">
      <ChevronRight :size="16" />
    </button>
    <button v-if="resetLabel" type="button" class="ui-date-navigator__reset" :aria-label="resetLabel" @click="emit('reset')">
      {{ resetLabel }}
    </button>
  </div>
</template>
