<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

withDefaults(defineProps<{
  ariaLabel?: string;
  labelledby?: string;
  layerClass?: string | string[] | Record<string, boolean>;
  panelClass?: string | string[] | Record<string, boolean>;
  size?: 'compact' | 'standard' | 'wide';
  padding?: 'none' | 'compact' | 'standard';
}>(), {
  ariaLabel: '',
  labelledby: '',
  layerClass: '',
  panelClass: '',
  size: 'standard',
  padding: 'standard',
});

const emit = defineEmits<{ close: [] }>();
const panel = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableElements() {
  return Array.from(panel.value?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
    .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0);
}

function handleDialogKeydown(event: KeyboardEvent) {
  const topmostDialog = Array.from(document.querySelectorAll<HTMLElement>('.ui-dialog-layer > .ui-dialog')).at(-1);
  if (topmostDialog !== panel.value) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    emit('close');
    return;
  }
  if (event.key !== 'Tab') return;
  const elements = focusableElements();
  if (!elements.length) {
    event.preventDefault();
    panel.value?.focus();
    return;
  }
  const first = elements[0]!;
  const last = elements[elements.length - 1]!;
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

onMounted(() => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.addEventListener('keydown', handleDialogKeydown, true);
  nextTick(() => {
    const autofocus = panel.value?.querySelector<HTMLElement>('[autofocus]');
    (autofocus || focusableElements()[0] || panel.value)?.focus();
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleDialogKeydown, true);
  if (previouslyFocused?.isConnected) previouslyFocused.focus();
});
</script>

<template>
  <div class="ui-dialog-layer" :class="layerClass" @click.self="emit('close')">
    <section
      ref="panel"
      class="ui-dialog"
      :class="[`ui-dialog--${size}`, `ui-dialog--padding-${padding}`, panelClass]"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-label="ariaLabel || undefined"
      :aria-labelledby="labelledby || undefined"
    >
      <slot />
    </section>
  </div>
</template>
