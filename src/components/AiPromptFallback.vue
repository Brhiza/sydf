<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { Check, Copy, RefreshCw } from 'lucide-vue-next';
import { buildExternalAiPrompt, type AiPromptPayload } from '../lib/aiPrompt';
import { writeClipboardText } from '../lib/clipboard';
import ExternalAiShareButtons from './ExternalAiShareButtons.vue';
import { UiButton } from './ui';

const props = defineProps<{
  request?: AiPromptPayload | null;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const copyState = ref<'idle' | 'copied' | 'error'>('idle');
let resetTimer: number | undefined;

watch(() => props.request, () => {
  copyState.value = 'idle';
});

onBeforeUnmount(() => {
  if (resetTimer) window.clearTimeout(resetTimer);
});

async function copyPrompt() {
  if (!props.request) return;
  if (resetTimer) window.clearTimeout(resetTimer);
  try {
    await writeClipboardText(buildExternalAiPrompt(props.request));
    copyState.value = 'copied';
  } catch {
    copyState.value = 'error';
  }
  resetTimer = window.setTimeout(() => {
    copyState.value = 'idle';
  }, 2200);
}
</script>

<template>
  <div class="ai-prompt-fallback">
    <p>你也可以把问题和盘面资料发到其他 AI 继续解读。</p>
    <div>
      <UiButton
        variant="secondary"
        size="small"
        :disabled="!request"
        :title="copyState === 'error' ? '浏览器未允许复制，请重试' : '复制问题和盘面资料到其他在线 AI 解读'"
        @click="copyPrompt"
      >
        <Check v-if="copyState === 'copied'" :size="14" />
        <Copy v-else :size="14" />
        {{ copyState === 'copied' ? '提示词已复制' : copyState === 'error' ? '复制失败，请重试' : '复制提示词' }}
      </UiButton>
      <UiButton variant="secondary" size="small" @click="emit('retry')"><RefreshCw :size="14" />重新解读</UiButton>
      <ExternalAiShareButtons :request="request" />
    </div>
  </div>
</template>

<style scoped>
.ai-prompt-fallback { margin-top: 10px; }
.ai-prompt-fallback > p { color: var(--ds-text-secondary); font-size: var(--ds-text-xs); line-height: 1.55; margin: 0 0 8px; }
.ai-prompt-fallback > div { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; }

@media (max-width: 720px) {
  .ai-prompt-fallback > div > :deep(.external-ai-share) { flex-basis: 100%; }
}
</style>
