<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Check, Copy, Share2 } from 'lucide-vue-next';
import { writeClipboardText } from '../lib/clipboard';

const props = withDefaults(defineProps<{
  content: string;
  title?: string;
  showInline?: boolean;
}>(), {
  title: 'AI 解读',
  showInline: true,
});

const menuRef = ref<HTMLElement | null>(null);
const menuOpen = ref(false);
const menuPosition = ref({ left: '8px', top: '8px' });
const actionState = ref<'idle' | 'copied' | 'shared' | 'error'>('idle');
let longPressTimer: number | undefined;
let resetTimer: number | undefined;
let pressStart = { x: 0, y: 0 };
let suppressClickUntil = 0;

watch(() => props.content, () => {
  actionState.value = 'idle';
  closeMenu();
});

onMounted(() => {
  document.addEventListener('pointerdown', closeMenuFromOutside);
  document.addEventListener('keydown', closeMenuFromKeyboard);
  window.addEventListener('blur', closeMenu);
  window.addEventListener('scroll', closeMenu, true);
});

onBeforeUnmount(() => {
  clearLongPress();
  if (resetTimer) window.clearTimeout(resetTimer);
  document.removeEventListener('pointerdown', closeMenuFromOutside);
  document.removeEventListener('keydown', closeMenuFromKeyboard);
  window.removeEventListener('blur', closeMenu);
  window.removeEventListener('scroll', closeMenu, true);
});

function scheduleReset() {
  if (resetTimer) window.clearTimeout(resetTimer);
  resetTimer = window.setTimeout(() => {
    actionState.value = 'idle';
  }, 2200);
}

function closeMenu() {
  menuOpen.value = false;
}

function closeMenuFromOutside(event: PointerEvent) {
  if (!menuOpen.value || menuRef.value?.contains(event.target as Node)) return;
  closeMenu();
}

function closeMenuFromKeyboard(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu();
}

function openMenu(clientX: number, clientY: number) {
  if (!props.content) return;
  const viewportPadding = 8;
  const menuWidth = 156;
  const menuHeight = 92;
  menuPosition.value = {
    left: `${Math.max(viewportPadding, Math.min(clientX, window.innerWidth - menuWidth - viewportPadding))}px`,
    top: `${Math.max(viewportPadding, Math.min(clientY, window.innerHeight - menuHeight - viewportPadding))}px`,
  };
  menuOpen.value = true;
  window.getSelection()?.removeAllRanges();
  void nextTick(() => menuRef.value?.focus({ preventScroll: true }));
}

function openContextMenu(event: MouseEvent) {
  event.preventDefault();
  openMenu(event.clientX, event.clientY);
}

function clearLongPress() {
  if (longPressTimer !== undefined) {
    window.clearTimeout(longPressTimer);
    longPressTimer = undefined;
  }
}

function beginLongPress(event: PointerEvent) {
  if (event.pointerType === 'mouse' || !props.content) return;
  clearLongPress();
  pressStart = { x: event.clientX, y: event.clientY };
  longPressTimer = window.setTimeout(() => {
    suppressClickUntil = Date.now() + 700;
    openMenu(pressStart.x, pressStart.y);
    longPressTimer = undefined;
  }, 520);
}

function trackLongPress(event: PointerEvent) {
  if (longPressTimer === undefined) return;
  if (Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > 10) clearLongPress();
}

function suppressLongPressClick(event: MouseEvent) {
  if (Date.now() >= suppressClickUntil) return;
  event.preventDefault();
  event.stopPropagation();
}

async function copyReading() {
  try {
    await writeClipboardText(props.content);
    actionState.value = 'copied';
  } catch {
    actionState.value = 'error';
  }
  closeMenu();
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
  closeMenu();
  scheduleReset();
}
</script>

<template>
  <div
    class="ai-reading-action-host"
    @click.capture="suppressLongPressClick"
    @contextmenu="openContextMenu"
    @pointerdown="beginLongPress"
    @pointermove="trackLongPress"
    @pointerup="clearLongPress"
    @pointercancel="clearLongPress"
  >
    <slot />
    <div v-if="showInline" class="ai-reading-actions" aria-label="解读操作">
      <button
        type="button"
        class="ai-reading-action-button"
        :aria-label="actionState === 'copied' ? '已复制' : actionState === 'error' ? '复制失败' : '复制解读'"
        :title="actionState === 'copied' ? '已复制' : actionState === 'error' ? '复制失败' : '复制'"
        :disabled="!content"
        @click="copyReading"
      >
        <Check v-if="actionState === 'copied'" :size="15" />
        <Copy v-else :size="15" />
      </button>
      <button
        type="button"
        class="ai-reading-action-button"
        :aria-label="actionState === 'shared' ? '已分享' : '分享解读'"
        :title="actionState === 'shared' ? '已分享' : '分享'"
        :disabled="!content"
        @click="shareReading"
      >
        <Check v-if="actionState === 'shared'" :size="15" />
        <Share2 v-else :size="15" />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="menuOpen"
        ref="menuRef"
        class="ai-reading-context-menu"
        :style="menuPosition"
        role="menu"
        tabindex="-1"
        aria-label="消息操作"
        @contextmenu.prevent
        @pointerdown.stop
      >
        <button type="button" role="menuitem" @click="copyReading"><Copy :size="15" /><span>{{ actionState === 'copied' ? '已复制' : '复制' }}</span></button>
        <button type="button" role="menuitem" @click="shareReading"><Share2 :size="15" /><span>分享</span></button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ai-reading-action-host { min-width: 0; position: relative; touch-action: pan-y; -webkit-touch-callout: none; }
.ai-reading-actions { align-items: center; display: flex; gap: 3px; justify-content: flex-start; margin-top: 7px; }
.ai-reading-action-button { align-items: center; background: transparent; border: 0; border-radius: 8px; color: var(--ds-text-tertiary); display: inline-flex; height: 28px; justify-content: center; padding: 0; transition: background-color .16s ease, color .16s ease; width: 28px; }
.ai-reading-action-button:hover { background: color-mix(in srgb, var(--ds-accent) 10%, transparent); color: var(--ds-text-primary); }
.ai-reading-action-button:focus-visible { outline: 2px solid color-mix(in srgb, var(--ds-accent) 42%, transparent); outline-offset: 1px; }
.ai-reading-action-button:disabled { cursor: default; opacity: .45; }
.ai-reading-context-menu { background: color-mix(in srgb, var(--ds-surface-raised) 96%, transparent); border: 1px solid var(--ds-line); border-radius: 11px; box-shadow: 0 12px 34px rgba(35, 28, 43, .18); display: grid; gap: 2px; min-width: 148px; padding: 5px; position: fixed; z-index: 120; }
.ai-reading-context-menu:focus { outline: 0; }
.ai-reading-context-menu button { align-items: center; background: transparent; border: 0; border-radius: 7px; color: var(--ds-text-secondary); display: flex; font-size: var(--ds-text-sm); gap: 9px; min-height: 36px; padding: 7px 10px; text-align: left; width: 100%; }
.ai-reading-context-menu button:hover,
.ai-reading-context-menu button:focus-visible { background: var(--ds-accent-soft); color: var(--ds-text-primary); outline: 0; }
.ai-reading-context-menu svg { color: var(--ds-text-tertiary); flex: 0 0 auto; }
@media (prefers-reduced-motion: reduce) {
  .ai-reading-action-button { transition: none; }
}
</style>
