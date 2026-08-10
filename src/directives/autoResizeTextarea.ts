import type { ObjectDirective } from 'vue';

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = 'auto';
  const maximum = Number.parseFloat(window.getComputedStyle(element).maxHeight);
  const maximumHeight = Number.isFinite(maximum) ? maximum : Number.POSITIVE_INFINITY;
  const nextHeight = Math.min(element.scrollHeight, maximumHeight);
  element.style.height = `${nextHeight}px`;
  element.style.overflowY = element.scrollHeight > maximumHeight ? 'auto' : 'hidden';
}

function handleInput(event: Event) {
  resizeTextarea(event.currentTarget as HTMLTextAreaElement);
}

const autoResizeTextarea: ObjectDirective<HTMLTextAreaElement> = {
  mounted(element) {
    element.addEventListener('input', handleInput);
    resizeTextarea(element);
  },
  updated(element) {
    resizeTextarea(element);
  },
  beforeUnmount(element) {
    element.removeEventListener('input', handleInput);
  },
};

export default autoResizeTextarea;
