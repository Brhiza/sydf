<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Check, Search, UserPlus, UsersRound } from 'lucide-vue-next';
import { caseBirthSummary, caseDisplayName, type SelectableCaseProfile } from '../lib/caseSelection';
import { UiActionBar, UiButton, UiDialogHeader, UiDialogShell, UiEmptyState } from './ui';

const props = withDefaults(defineProps<{
  cases: SelectableCaseProfile[];
  modelValue: string[];
  label?: string;
  title?: string;
  allowEmpty?: boolean;
  compact?: boolean;
  requiredIds?: string[];
  requiredLabel?: string;
}>(), {
  label: '案例',
  title: '选择案例',
  allowEmpty: false,
  compact: false,
  requiredIds: () => [],
  requiredLabel: '全局案例',
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: string[]): void;
  (event: 'manage'): void;
}>();

const open = ref(false);
const search = ref('');
const draftIds = ref<string[]>([]);

const availableCases = computed(() => props.cases.filter((profile) => profile.available !== false));
const selectedCases = computed(() => availableCases.value.filter((profile) => props.modelValue.includes(profile.id)));
const filteredCases = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('zh-CN');
  if (!query) return props.cases;
  return props.cases.filter((profile) => [profile.label, profile.name, profile.date, profile.locationName]
    .some((value) => String(value || '').toLocaleLowerCase('zh-CN').includes(query)));
});
const triggerValue = computed(() => {
  if (!selectedCases.value.length) return '未选择';
  if (selectedCases.value.length === 1) return caseDisplayName(selectedCases.value[0]!);
  return `已选 ${selectedCases.value.length} 人`;
});
const canConfirm = computed(() => props.allowEmpty || draftIds.value.length > 0);

watch(() => props.modelValue, (value) => {
  if (!open.value) draftIds.value = [...new Set([...props.requiredIds, ...value])];
}, { deep: true, immediate: true });

function openDialog() {
  draftIds.value = [...new Set([...props.requiredIds, ...props.modelValue]
    .filter((id) => availableCases.value.some((profile) => profile.id === id)))];
  search.value = '';
  open.value = true;
}

function closeDialog() {
  open.value = false;
}

function toggleCase(profile: SelectableCaseProfile) {
  if (profile.available === false || props.requiredIds.includes(profile.id)) return;
  draftIds.value = draftIds.value.includes(profile.id)
    ? draftIds.value.filter((id) => id !== profile.id)
    : [...draftIds.value, profile.id];
}

function confirmSelection() {
  if (!canConfirm.value) return;
  emit('update:modelValue', [...new Set([...props.requiredIds, ...draftIds.value])]);
  closeDialog();
}

function manageCases() {
  closeDialog();
  emit('manage');
}
</script>

<template>
  <div class="case-multi-select" :class="{ 'is-compact': compact }">
    <button type="button" class="case-multi-trigger" aria-haspopup="dialog" :aria-label="`${label}：${triggerValue}`" @click="openDialog">
      <UsersRound :size="15" />
      <span><small>{{ label }}</small><strong>{{ triggerValue }}</strong></span>
    </button>

    <Teleport to="body">
      <UiDialogShell v-if="open" :aria-label="title" size="compact" panel-class="case-multi-dialog" @close="closeDialog">
          <UiDialogHeader :title="title" description="可同时选择多位，判断时会分别核对" @close="closeDialog" />

          <label v-if="cases.length > 5" class="case-multi-search"><Search :size="15" /><input v-model="search" type="search" placeholder="搜索案例" /></label>

          <div v-if="filteredCases.length" class="case-multi-list">
            <button
              v-for="profile in filteredCases"
              :key="profile.id"
              type="button"
              class="case-multi-item"
              :class="{ selected: draftIds.includes(profile.id), disabled: profile.available === false, required: requiredIds.includes(profile.id) }"
              :disabled="profile.available === false"
              @click="toggleCase(profile)"
            >
              <span class="case-multi-avatar">{{ caseDisplayName(profile).slice(0, 1) }}</span>
              <span class="case-multi-copy">
                <strong>{{ caseDisplayName(profile) }}<em v-if="requiredIds.includes(profile.id)">{{ requiredLabel }}</em></strong>
                <small>{{ profile.available === false ? '出生资料不完整' : caseBirthSummary(profile) }}</small>
              </span>
              <span class="case-multi-check"><Check v-if="draftIds.includes(profile.id)" :size="14" /></span>
            </button>
          </div>

          <UiEmptyState v-else class="case-multi-empty" :title="cases.length ? '没有找到相关案例' : '还没有可用案例'" compact><template #icon><UsersRound :size="22" /></template></UiEmptyState>

          <UiActionBar align="between" mobile="inline">
            <template #start><UiButton class="case-multi-manage" variant="secondary" @click="manageCases"><UserPlus :size="15" />管理案例</UiButton></template>
            <UiButton v-if="allowEmpty && draftIds.some((id) => !requiredIds.includes(id))" class="case-multi-clear" variant="secondary" @click="draftIds = [...requiredIds]">清空其他</UiButton>
            <UiButton class="case-multi-confirm" :disabled="!canConfirm" @click="confirmSelection">确定<span v-if="draftIds.length">（{{ draftIds.length }}）</span></UiButton>
          </UiActionBar>
      </UiDialogShell>
    </Teleport>
  </div>
</template>

<style>
.case-multi-select { min-width: 0; }
.case-multi-trigger { align-items: center; background: var(--surface-muted); border: 1px solid var(--line); border-radius: var(--ds-radius-md, 10px); color: var(--ink); display: inline-flex; gap: 8px; min-height: var(--ds-control-md, 40px); max-width: 210px; padding: 5px 10px; text-align: left; }
.case-multi-trigger:hover { background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 42%, var(--line)); }
.case-multi-trigger > svg { color: var(--accent-strong); flex: none; }
.case-multi-trigger > span { display: grid; min-width: 0; }
.case-multi-trigger small { color: var(--muted); font-size: 10px; line-height: 1.15; }
.case-multi-trigger strong { font-size: var(--type-caption); line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.is-compact .case-multi-trigger { min-height: var(--ds-control-md, 40px); padding-inline: 9px; }

.case-multi-dialog { display: flex; flex-direction: column; max-height: min(680px, calc(100dvh - 40px)); overflow: hidden; }
.case-multi-search { align-items: center; background: var(--surface-muted); border: 1px solid var(--line); border-radius: 10px; color: var(--muted); display: flex; gap: 7px; margin-bottom: 10px; min-height: 38px; padding: 0 10px; }
.case-multi-search input { background: transparent; border: 0; color: var(--ink); font: inherit; min-width: 0; outline: 0; width: 100%; }
.case-multi-list { display: grid; gap: 7px; min-height: 0; overflow-y: auto; padding: 1px; scrollbar-width: thin; }
.case-multi-item { align-items: center; background: var(--surface); border: 1px solid var(--line); border-radius: 11px; color: var(--ink); display: grid; gap: 10px; grid-template-columns: 36px minmax(0, 1fr) 22px; min-height: 57px; padding: 8px 10px; text-align: left; width: 100%; }
.case-multi-item:hover { background: var(--surface-muted); }
.case-multi-item.selected { background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 58%, var(--line)); }
.case-multi-item.disabled { cursor: not-allowed; opacity: .52; }
.case-multi-item.required { cursor: default; }
.case-multi-avatar { align-items: center; background: var(--surface-muted); border-radius: 50%; color: var(--accent-strong); display: inline-flex; font-size: var(--type-small); font-weight: 700; height: 34px; justify-content: center; width: 34px; }
.case-multi-copy { display: grid; min-width: 0; }
.case-multi-copy strong { font-size: var(--type-small); }
.case-multi-copy strong em { background: var(--surface-raised); border-radius: 99px; color: var(--accent-strong); font-size: 9px; font-style: normal; font-weight: 600; margin-left: 6px; padding: 2px 5px; vertical-align: 1px; }
.case-multi-copy small { color: var(--muted); font-size: var(--type-micro); line-height: 1.45; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.case-multi-check { align-items: center; border: 1px solid var(--line); border-radius: 6px; color: white; display: inline-flex; height: 20px; justify-content: center; width: 20px; }
.selected .case-multi-check { background: var(--accent); border-color: var(--accent); }
.case-multi-empty { min-height: 150px; }
.case-multi-confirm { min-width: 76px; }
.case-multi-confirm:disabled { cursor: not-allowed; opacity: .45; }

@media (max-width: 720px) {
  .case-multi-dialog { max-height: calc(100dvh - 20px); }
  .case-multi-item { min-height: 54px; }
  .is-compact .case-multi-trigger { max-width: 86px; padding-inline: 7px; }
  .is-compact .case-multi-trigger > svg, .is-compact .case-multi-trigger small { display: none; }
}

</style>
