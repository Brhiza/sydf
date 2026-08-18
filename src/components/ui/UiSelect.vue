<script setup lang="ts">
import {
  Comment,
  Fragment,
  Text,
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useAttrs,
  useId,
  useSlots,
  type CSSProperties,
  type VNode,
} from 'vue';
import { Check, ChevronDown } from 'lucide-vue-next';

defineOptions({ inheritAttrs: false });

export interface UiSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface UiSelectGroup {
  label: string;
  options: UiSelectOption[];
  disabled?: boolean;
}

interface RenderOption extends UiSelectOption {
  group?: string;
  key: string;
}

const props = withDefaults(defineProps<{
  modelValue?: string | number;
  options?: UiSelectOption[];
  groups?: UiSelectGroup[];
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  modelModifiers?: { number?: boolean };
}>(), {
  modelValue: '',
  options: () => [],
  groups: () => [],
  id: '',
  label: '',
  hint: '',
  error: '',
  placeholder: '',
  disabled: false,
  required: false,
  modelModifiers: () => ({}),
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  change: [event: Event];
}>();

const attrs = useAttrs();
const slots = useSlots() as { default?: () => VNode[] };
const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const menu = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const activeIndex = ref(-1);
const menuStyle = ref<CSSProperties>({});
const generatedId = `ui-select-${useId()}`;
const controlId = computed(() => props.id || generatedId);
const listboxId = computed(() => `${controlId.value}-listbox`);
const rootClass = computed(() => attrs.class);
const rootStyle = computed(() => attrs.style);
const triggerAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});
const describedBy = computed<string | undefined>(() => {
  const externalValue = triggerAttrs.value['aria-describedby'];
  return typeof externalValue === 'string'
    ? externalValue
    : props.hint || props.error ? `${controlId.value}-message` : undefined;
});
const ariaInvalid = computed<boolean | 'true' | 'false' | 'grammar' | 'spelling' | undefined>(() => {
  const externalValue = triggerAttrs.value['aria-invalid'];
  if (typeof externalValue === 'boolean' || externalValue === 'true' || externalValue === 'false' || externalValue === 'grammar' || externalValue === 'spelling') {
    return externalValue;
  }
  return Boolean(props.error) || undefined;
});

function nodeText(node: VNode): string {
  if (typeof node.children === 'string') return node.children;
  if (!Array.isArray(node.children)) return String(node.props?.label ?? '');
  return node.children.map(child => typeof child === 'string' ? child : nodeText(child as VNode)).join('');
}

function slotOptions(nodes: VNode[], group?: string, groupDisabled = false): RenderOption[] {
  const result: RenderOption[] = [];
  for (const node of nodes) {
    if (node.type === Comment || node.type === Text) continue;
    if (node.type === Fragment && Array.isArray(node.children)) {
      result.push(...slotOptions(node.children as VNode[], group, groupDisabled));
      continue;
    }
    if (node.type === 'optgroup') {
      const slotChildren = node.children as { default?: () => VNode[] } | null;
      const children = slotChildren?.default
        ? slotChildren.default()
        : Array.isArray(node.children) ? node.children as VNode[] : [];
      result.push(...slotOptions(children, String(node.props?.label ?? ''), Boolean(node.props?.disabled)));
      continue;
    }
    if (node.type !== 'option') continue;
    const value = node.props?.value ?? nodeText(node);
    result.push({
      value,
      label: nodeText(node).trim(),
      disabled: groupDisabled || Boolean(node.props?.disabled),
      group,
      key: `${group ?? ''}-${String(value)}-${result.length}`,
    });
  }
  return result;
}

const renderedOptions = computed<RenderOption[]>(() => {
  const direct = props.options.map((option, index) => ({ ...option, key: `direct-${String(option.value)}-${index}` }));
  const grouped = props.groups.flatMap((group, groupIndex) => group.options.map((option, index) => ({
    ...option,
    disabled: group.disabled || option.disabled,
    group: group.label,
    key: `group-${groupIndex}-${String(option.value)}-${index}`,
  })));
  return [...direct, ...grouped, ...slotOptions(slots.default?.() ?? [])];
});
const selectedIndex = computed(() => renderedOptions.value.findIndex(option => String(option.value) === String(props.modelValue)));
const selectedOption = computed(() => renderedOptions.value[selectedIndex.value]);
const displayText = computed(() => selectedOption.value?.label || props.placeholder || '请选择');

function firstEnabledIndex() {
  return renderedOptions.value.findIndex(option => !option.disabled);
}

function moveActive(step: 1 | -1) {
  if (!renderedOptions.value.length) return;
  let index = activeIndex.value < 0 ? (step === 1 ? -1 : renderedOptions.value.length) : activeIndex.value;
  for (let count = 0; count < renderedOptions.value.length; count += 1) {
    index = (index + step + renderedOptions.value.length) % renderedOptions.value.length;
    if (!renderedOptions.value[index]?.disabled) {
      activeIndex.value = index;
      nextTick(() => menu.value?.querySelector<HTMLElement>(`[data-option-index="${index}"]`)?.scrollIntoView({ block: 'nearest' }));
      return;
    }
  }
}

function updateMenuPosition() {
  if (!isOpen.value || !trigger.value) return;
  const rect = trigger.value.getBoundingClientRect();
  const gap = 6;
  const viewportGap = 10;
  const desiredHeight = Math.min(288, renderedOptions.value.length * 40 + 16);
  const spaceBelow = window.innerHeight - rect.bottom - viewportGap;
  const openAbove = spaceBelow < Math.min(220, desiredHeight) && rect.top > spaceBelow;
  const maxHeight = Math.max(120, Math.min(desiredHeight, openAbove ? rect.top - viewportGap - gap : spaceBelow));
  menuStyle.value = {
    left: `${Math.max(viewportGap, Math.min(rect.left, window.innerWidth - rect.width - viewportGap))}px`,
    top: openAbove ? `${Math.max(viewportGap, rect.top - maxHeight - gap)}px` : `${rect.bottom + gap}px`,
    width: `${Math.min(rect.width, window.innerWidth - viewportGap * 2)}px`,
    maxHeight: `${maxHeight}px`,
  };
}

function openMenu() {
  if (props.disabled || !renderedOptions.value.length) return;
  isOpen.value = true;
  activeIndex.value = selectedOption.value?.disabled ? firstEnabledIndex() : (selectedIndex.value >= 0 ? selectedIndex.value : firstEnabledIndex());
  nextTick(updateMenuPosition);
}

function closeMenu(focusTrigger = false) {
  isOpen.value = false;
  if (focusTrigger) nextTick(() => trigger.value?.focus());
}

function toggleMenu() {
  if (isOpen.value) closeMenu(); else openMenu();
}

function choose(option: RenderOption) {
  if (option.disabled) return;
  const value = props.modelModifiers.number ? Number(option.value) : option.value;
  emit('update:modelValue', value);
  emit('change', { target: { value } } as unknown as Event);
  closeMenu(true);
}

function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!isOpen.value) openMenu();
    else moveActive(event.key === 'ArrowDown' ? 1 : -1);
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (!isOpen.value) openMenu();
    else if (activeIndex.value >= 0) choose(renderedOptions.value[activeIndex.value]!);
    return;
  }
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault();
    closeMenu(true);
    return;
  }
  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    if (!isOpen.value) openMenu();
    activeIndex.value = event.key === 'Home' ? firstEnabledIndex() : renderedOptions.value.findLastIndex(option => !option.disabled);
  }
}

function handleOutsidePointer(event: PointerEvent) {
  const target = event.target as Node;
  if (!root.value?.contains(target) && !menu.value?.contains(target)) closeMenu();
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointer);
  window.addEventListener('resize', updateMenuPosition);
  window.addEventListener('scroll', updateMenuPosition, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointer);
  window.removeEventListener('resize', updateMenuPosition);
  window.removeEventListener('scroll', updateMenuPosition, true);
});
</script>

<template>
  <div ref="root" class="ui-select" :class="[rootClass, { 'ui-select--error': error, 'ui-select--disabled': disabled, 'is-open': isOpen }]" :style="rootStyle">
    <label v-if="label" class="ui-select__label" :for="controlId">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <button
      :id="controlId"
      ref="trigger"
      v-bind="triggerAttrs"
      type="button"
      class="ui-select__control"
      role="combobox"
      :disabled="disabled"
      :aria-expanded="isOpen"
      :aria-controls="listboxId"
      :aria-invalid="ariaInvalid"
      :aria-describedby="describedBy"
      :aria-activedescendant="isOpen && activeIndex >= 0 ? `${controlId}-option-${activeIndex}` : undefined"
      @click="toggleMenu"
      @keydown="handleKeydown"
    >
      <span :class="{ 'is-placeholder': !selectedOption }">{{ displayText }}</span>
      <ChevronDown class="ui-select__icon" :size="16" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <div v-if="isOpen" :id="listboxId" ref="menu" class="ui-select-menu" :style="menuStyle" role="listbox" :aria-labelledby="controlId" @keydown="handleKeydown">
        <template v-for="(option, index) in renderedOptions" :key="option.key">
          <div v-if="option.group && option.group !== renderedOptions[index - 1]?.group" class="ui-select-menu__group">{{ option.group }}</div>
          <button
            :id="`${controlId}-option-${index}`"
            type="button"
            class="ui-select-menu__option"
            :class="{ 'is-selected': index === selectedIndex, 'is-active': index === activeIndex }"
            role="option"
            :aria-selected="index === selectedIndex"
            :disabled="option.disabled"
            :data-option-index="index"
            @mouseenter="activeIndex = index"
            @click="choose(option)"
          >
            <span>{{ option.label }}</span><Check v-if="index === selectedIndex" :size="15" aria-hidden="true" />
          </button>
        </template>
      </div>
    </Teleport>
    <p v-if="error || hint" :id="`${controlId}-message`" class="ui-select__message" :class="{ 'is-error': error }">{{ error || hint }}</p>
  </div>
</template>
