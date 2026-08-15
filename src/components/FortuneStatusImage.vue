<script setup lang="ts">
import { computed } from 'vue';
import { fortuneStatusMeta, getFortuneStatusImageUrl, type FortuneStatus } from '../lib/fortuneStatus';

const props = withDefaults(defineProps<{
  status: FortuneStatus;
  compact?: boolean;
}>(), {
  compact: false,
});

const meta = computed(() => fortuneStatusMeta[props.status]);
</script>

<template>
  <figure class="fortune-status-image" :class="[`tone-${meta.tone}`, { compact }]">
    <img :src="getFortuneStatusImageUrl(status)" :alt="`${meta.label}状态图`" />
  </figure>
</template>

<style scoped>
.fortune-status-image { margin: 0; min-width: 0; }
.fortune-status-image img { border-radius: var(--ds-radius-md); display: block; height: auto; max-height: 100%; object-fit: contain; width: 100%; }
.fortune-status-image.compact { width: 92px; }
@media (max-width: 720px) {
  .fortune-status-image.compact { width: 70px; }
}
</style>
