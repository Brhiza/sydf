<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { Check, Copy, Send, Share2, X } from 'lucide-vue-next';
import { buildExternalAiPrompt, type AiPromptPayload } from '../lib/aiPrompt';
import { buildExternalAiShareData, EXTERNAL_AI_TARGETS, getExternalAiAppUrl, isAndroidUserAgent, isIosDevice, type ExternalAiShareTarget } from '../lib/externalAiShare';
import { writeClipboardText } from '../lib/clipboard';
import { UiButton } from './ui';

const props = defineProps<{
  request?: AiPromptPayload | null;
}>();

const openingTarget = ref<ExternalAiShareTarget | null>(null);
const androidActionState = ref<'idle' | 'copied' | 'error'>('idle');
const iosActionState = ref<'idle' | 'copied' | 'error'>('idle');
const showIosFirstShareDialog = ref(false);
const isIos = isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
const isAndroid = isAndroidUserAgent(navigator.userAgent);
const IOS_SHARE_INTRO_KEY = 'sydf.external-ai-share-intro.v1';
let iosStateTimer: number | undefined;
let androidStateTimer: number | undefined;

function resetAndroidActionState() {
  if (androidStateTimer) window.clearTimeout(androidStateTimer);
  androidStateTimer = window.setTimeout(() => {
    androidActionState.value = 'idle';
    openingTarget.value = null;
  }, 1800);
}

function resetIosActionState() {
  if (iosStateTimer) window.clearTimeout(iosStateTimer);
  iosStateTimer = window.setTimeout(() => {
    iosActionState.value = 'idle';
  }, 1800);
}

onBeforeUnmount(() => {
  if (iosStateTimer) window.clearTimeout(iosStateTimer);
  if (androidStateTimer) window.clearTimeout(androidStateTimer);
});

function hasSeenIosShareIntro() {
  try {
    return window.localStorage.getItem(IOS_SHARE_INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberIosShareIntro() {
  try {
    window.localStorage.setItem(IOS_SHARE_INTRO_KEY, '1');
  } catch {
    // 无痕模式或存储被禁用时，不影响当次分享。
  }
}

function promptText() {
  return props.request ? buildExternalAiPrompt(props.request) : '';
}

async function shareTo(target: ExternalAiShareTarget) {
  if (!props.request || openingTarget.value) return;
  openingTarget.value = target;
  const prompt = promptText();
  androidActionState.value = 'idle';
  try {
    await writeClipboardText(prompt);
    androidActionState.value = 'copied';
    resetAndroidActionState();
    window.location.assign(getExternalAiAppUrl(target));
  } catch {
    androidActionState.value = 'error';
    openingTarget.value = null;
    resetAndroidActionState();
  }
}

async function openSystemShareSheet() {
  const prompt = promptText();
  if (!prompt) return;
  if (!navigator.share) {
    try {
      await writeClipboardText(prompt);
      iosActionState.value = 'copied';
      resetIosActionState();
    } catch {
      iosActionState.value = 'error';
      resetIosActionState();
    }
    return;
  }
  try {
    await navigator.share(buildExternalAiShareData(prompt));
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      iosActionState.value = 'error';
      resetIosActionState();
    }
  }
}

async function openIosShareSheet() {
  await openSystemShareSheet();
}

async function requestIosShare() {
  iosActionState.value = 'idle';
  if (!hasSeenIosShareIntro()) {
    showIosFirstShareDialog.value = true;
    return;
  }
  await openIosShareSheet();
}

async function requestSystemShare() {
  if (isIos) {
    await requestIosShare();
    return;
  }
  iosActionState.value = 'idle';
  await openIosShareSheet();
}

async function copyFromIosDialog() {
  const prompt = promptText();
  if (!prompt) return;
  try {
    await writeClipboardText(prompt);
    iosActionState.value = 'copied';
    resetIosActionState();
  } catch {
    iosActionState.value = 'error';
    resetIosActionState();
  }
  rememberIosShareIntro();
  showIosFirstShareDialog.value = false;
}

async function shareFromIosDialog() {
  rememberIosShareIntro();
  showIosFirstShareDialog.value = false;
  await openIosShareSheet();
}
</script>

<template>
  <div class="external-ai-share" aria-label="发送提示词到其他 AI">
    <UiButton variant="secondary" size="small" :disabled="!request" @click="requestSystemShare">
      <Check v-if="iosActionState === 'copied'" :size="14" />
      <Share2 v-else :size="14" />
      {{ iosActionState === 'copied' ? '提示词已复制' : iosActionState === 'error' ? '分享失败，请重试' : '用其他AI软件打开' }}
    </UiButton>
    <div v-if="isAndroid || isIos" class="targeted-app-actions">
      <button
        v-for="target in (['doubao', 'deepseek'] as const)"
        :key="target"
        type="button"
        :disabled="!request || Boolean(openingTarget)"
        @click="shareTo(target)"
      >
        <Send :size="14" />
        {{ androidActionState === 'error' ? '复制失败，请重试' : openingTarget === target && androidActionState === 'copied' ? `已复制，正在打开${EXTERNAL_AI_TARGETS[target].label}…` : `复制并打开${EXTERNAL_AI_TARGETS[target].label}` }}
      </button>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showIosFirstShareDialog" class="ios-share-dialog-backdrop" @click.self="showIosFirstShareDialog = false">
      <section role="dialog" aria-modal="true" aria-labelledby="ios-share-dialog-title" class="ios-share-dialog">
        <button type="button" class="ios-share-dialog-close" aria-label="关闭" @click="showIosFirstShareDialog = false"><X :size="18" /></button>
        <span class="ios-share-dialog-icon"><Share2 :size="20" /></span>
        <h3 id="ios-share-dialog-title">把提示词发到其他 AI</h3>
        <p>可以直接复制，也可以在 iPhone 分享菜单中选择豆包或 DeepSeek。以后点“用其他AI软件打开”会直接打开系统菜单。</p>
        <div>
          <button type="button" class="ios-share-copy" @click="copyFromIosDialog"><Copy :size="16" />复制提示词</button>
          <button type="button" class="ios-share-open" @click="shareFromIosDialog"><Share2 :size="16" />打开分享菜单</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.external-ai-share { display: none; }

@media (max-width: 720px) {
  .external-ai-share { display: contents; }
  .targeted-app-actions button {
    align-items: center;
    background: var(--accent-soft);
    border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--line));
    border-radius: var(--ds-radius-md);
    color: var(--accent-strong);
    display: inline-flex;
    font: inherit;
    font-size: var(--ds-text-xs);
    font-weight: 650;
    gap: 6px;
    justify-content: center;
    min-height: 36px;
    padding: 8px 10px;
  }
  .targeted-app-actions button:disabled { cursor: default; opacity: .58; }
  .targeted-app-actions { display: grid; flex-basis: 100%; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
}

.ios-share-dialog-backdrop {
  align-items: center;
  background: rgb(18 16 22 / 48%);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 20px;
  position: fixed;
  z-index: 1000;
}
.ios-share-dialog {
  background: var(--surface-raised);
  border: 1px solid var(--line);
  border-radius: var(--ds-radius-xl);
  box-shadow: var(--shadow-elevated);
  color: var(--ink);
  max-width: 380px;
  padding: 24px;
  position: relative;
  width: 100%;
}
.ios-share-dialog-close { align-items: center; background: transparent; border: 0; color: var(--muted); display: inline-flex; padding: 6px; position: absolute; right: 12px; top: 12px; }
.ios-share-dialog-icon { align-items: center; background: var(--accent-soft); border-radius: 12px; color: var(--accent-strong); display: inline-flex; height: 42px; justify-content: center; width: 42px; }
.ios-share-dialog h3 { font-size: var(--ds-text-lg); margin: 14px 0 7px; }
.ios-share-dialog p { color: var(--muted); font-size: var(--ds-text-sm); line-height: 1.65; margin: 0; }
.ios-share-dialog > div { display: grid; gap: 8px; margin-top: 18px; }
.ios-share-dialog > div > button { align-items: center; border: 1px solid var(--line); border-radius: var(--ds-radius-md); display: inline-flex; font: inherit; font-size: var(--ds-text-sm); font-weight: 650; gap: 8px; justify-content: center; min-height: 42px; padding: 10px 14px; }
.ios-share-copy { background: var(--surface-muted); color: var(--ink); }
.ios-share-open { background: var(--accent); color: var(--ds-accent-contrast); }
</style>
