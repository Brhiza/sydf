<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { Check, Copy, Share2 } from 'lucide-vue-next';
import { writeClipboardText } from '../lib/clipboard';
import { UiButton } from './ui';

const props = withDefaults(defineProps<{
  content: string;
  title?: string;
}>(), {
  title: 'AI 解读',
});

const actionState = ref<'idle' | 'copied' | 'shared' | 'error'>('idle');
let resetTimer: number | undefined;

watch(() => props.content, () => {
  actionState.value = 'idle';
});

onBeforeUnmount(() => {
  if (resetTimer) window.clearTimeout(resetTimer);
});

function scheduleReset() {
  if (resetTimer) window.clearTimeout(resetTimer);
  resetTimer = window.setTimeout(() => {
    actionState.value = 'idle';
  }, 2200);
}

async function copyReading() {
  try {
    await writeClipboardText(props.content);
    actionState.value = 'copied';
  } catch {
    actionState.value = 'error';
  }
  scheduleReset();
}

async function shareReading() {
  try {
    if (navigator.share) {
      await navigator.share({ title: props.title, text: props.content });
      actionState.value = 'shared';
    } else {
      await writeClipboardText(props.content);
      actionState.value = 'copied';
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    actionState.value = 'error';
  }
  scheduleReset();
}
</script>

<template>
  <div class="ai-reading-actions" aria-label="解读操作">
    <UiButton variant="ghost" size="small" :disabled="!content" @click="copyReading">
      <Check v-if="actionState === 'copied'" :size="13" />
      <Copy v-else :size="13" />
      {{ actionState === 'copied' ? '已复制' : actionState === 'error' ? '复制失败' : '复制' }}
    </UiButton>
    <UiButton variant="ghost" size="small" :disabled="!content" @click="shareReading">
      <Check v-if="actionState === 'shared'" :size="13" />
      <Share2 v-else :size="13" />
      {{ actionState === 'shared' ? '已分享' : '分享' }}
    </UiButton>
  </div>
</template>

<style scoped>
.ai-reading-actions { align-items: center; border-top: 1px solid var(--ds-line); display: flex; gap: 2px; justify-content: flex-end; margin-top: var(--ds-space-3); padding-top: var(--ds-space-2); }
.ai-reading-actions :deep(.ui-button) { color: var(--ds-text-tertiary); }
.ai-reading-actions :deep(.ui-button:hover) { color: var(--ds-text-primary); }
</style>
