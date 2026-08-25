<script setup lang="ts">
import { computed, ref } from 'vue';
import { Sparkles } from 'lucide-vue-next';
import type { AiCustomConfig, AiPreferences } from '../lib/ai';
import { tarotSpreadOptions, type TarotSpreadType, type WesternDeckType, type WesternInterpretationPayload, type WesternSpreadType } from '../lib/tarot';
import { getWesternSpreadOptions } from '../lib/westernDecks';
import { getDivinationBannerUrl } from '../lib/divinationTheme';
import TarotView from './TarotView.vue';
import WesternDeckDrawView from './WesternDeckDrawView.vue';
import { UiActionBar, UiButton, UiPageShell, UiSegmentedControl, UiSelect, UiTextField, UiWorkspaceSurface } from './ui';

const props = defineProps<{
  preferences?: AiPreferences;
  aiConfig?: AiCustomConfig;
  castingPreference?: 'auto' | 'manual';
}>();

const emit = defineEmits<{
  interpret: [payload: WesternInterpretationPayload];
}>();

const deckOptions: Array<{ value: WesternDeckType; label: string; description: string }> = [
  { value: 'tarot', label: '塔罗牌', description: '选择牌阵，观察事情的层次与发展' },
  { value: 'lenormand', label: '雷诺曼', description: '以三张牌串联事件的起因、现状与走向' },
  { value: 'shiyue-oracle', label: '时月神谕', description: '抽取一张六十甲子神谕，获得当下提示' },
];
const deckTabs = deckOptions.map(({ value, label }) => ({ value, label }));
const phase = ref<'entry' | 'draw'>('entry');
const deckType = ref<WesternDeckType>('tarot');
const tarotSpread = ref<TarotSpreadType>('single');
const lenormandSpread = ref<WesternSpreadType>('single');
const oracleSpread = ref<WesternSpreadType>('single');
const question = ref('');
const errorMessage = ref('');
const selectedDeck = computed(() => deckOptions.find(item => item.value === deckType.value) || deckOptions[0]!);
const selectedTarotSpread = computed(() => tarotSpreadOptions.find(item => item.value === tarotSpread.value) || tarotSpreadOptions[0]!);
const selectedWesternSpread = computed({
  get: () => deckType.value === 'lenormand' ? lenormandSpread.value : oracleSpread.value,
  set: (value: WesternSpreadType) => { if (deckType.value === 'lenormand') lenormandSpread.value = value; else oracleSpread.value = value; },
});
const westernSpreadOptions = computed(() => deckType.value === 'tarot' ? [] : getWesternSpreadOptions(deckType.value));
const visibleSpreadOptions = computed(() => (deckType.value === 'tarot' ? tarotSpreadOptions : westernSpreadOptions.value).map(item => ({
  value: item.value,
  label: `${item.label} · ${item.count} 张`,
})));
const selectedSpreadSummary = computed(() => {
  if (deckType.value !== 'tarot') {
    const item = westernSpreadOptions.value.find(option => option.value === selectedWesternSpread.value) || westernSpreadOptions.value[0]!;
    return { name: `${item.label} · ${item.count} 张`, detail: item.description };
  }
  return { name: `${selectedTarotSpread.value.label} · ${selectedTarotSpread.value.count} 张`, detail: selectedTarotSpread.value.description };
});
function begin() {
  const asked = question.value.trim();
  if (!asked) {
    errorMessage.value = '请先写下想问的事。';
    return;
  }
  errorMessage.value = '';
  phase.value = 'draw';
}

function handleQuestionKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  begin();
}

function reset() {
  phase.value = 'entry';
  errorMessage.value = '';
}
</script>

<template>
  <TarotView
    v-if="phase === 'draw' && deckType === 'tarot'"
    :initial-question="question.trim()"
    :initial-spread="tarotSpread"
    hide-question-setup
    hide-spread-setup
    :preferences="preferences"
    :ai-config="aiConfig"
    :casting-preference="castingPreference"
    @restart="reset"
    @interpret="emit('interpret', $event)"
  />

  <WesternDeckDrawView
    v-else-if="phase === 'draw' && deckType !== 'tarot'"
    :deck-type="deckType"
    :initial-question="question.trim()"
    :initial-spread="selectedWesternSpread"
    :casting-preference="castingPreference"
    :preferences="preferences"
    :ai-config="aiConfig"
    @restart="reset"
    @interpret="emit('interpret', $event)"
  />

  <UiPageShell v-else class="screen western-screen">
    <UiWorkspaceSurface v-if="phase === 'entry'" class="western-workspace western-entry" padding="standard">
      <header class="western-intro">
        <div class="western-portrait"><img :src="getDivinationBannerUrl()" alt="西方占卜" /></div>
        <span>西方占卜</span>
      </header>

      <section class="western-form">
        <fieldset class="western-deck-spread">
          <legend>牌卡与牌阵</legend>
          <UiSegmentedControl class="western-decks ui-tool-tabs" :model-value="deckType" :items="deckTabs" label="选择牌卡" @update:model-value="deckType = $event as WesternDeckType; errorMessage = ''" />
          <UiSelect v-if="deckType === 'tarot'" v-model="tarotSpread" class="western-spread" label="牌阵" :options="visibleSpreadOptions" :hint="selectedSpreadSummary.detail" />
          <UiSelect v-else v-model="selectedWesternSpread" class="western-spread" label="牌阵" :options="visibleSpreadOptions" :hint="selectedSpreadSummary.detail" />
        </fieldset>
        <UiTextField id="western-question" v-model="question" label="所问之事" multiline :rows="3" :maxlength="10000" :error="errorMessage" placeholder="写下此刻想问的事" @keydown="handleQuestionKeydown" @update:model-value="errorMessage = ''" />
        <UiActionBar align="center"><UiButton @click="begin"><Sparkles :size="16" />开始{{ selectedDeck.label }}</UiButton></UiActionBar>
      </section>
    </UiWorkspaceSurface>

  </UiPageShell>
</template>

<style scoped>
.western-screen { min-height: calc(100dvh - 188px); }
.western-workspace { min-width: 0; }
.western-intro { align-items: center; display: flex; flex-direction: column; text-align: center; }
.western-portrait { background: #171216; border-radius: 18px; box-shadow: 0 16px 38px rgba(46,31,57,.14); overflow: hidden; width: min(100%, var(--ds-feature-banner-width)); }
.western-portrait img { aspect-ratio: 16 / 9; display: block; object-fit: cover; width: 100%; }
.western-intro > span { color: var(--ds-accent-strong); font-size: 11px; font-weight: 600; letter-spacing: .18em; margin-top: 22px; }
.western-form { margin: 24px auto 0; max-width: 680px; }
.western-deck-spread { border: 0; margin: 0 0 20px; padding: 0; }
.western-deck-spread > legend { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); font-weight: 550; margin-bottom: 9px; }
.western-decks { max-width: 100%; width: fit-content; }
.western-decks.ui-tool-tabs :deep(button) { flex: 0 0 auto; min-width: 0; }
.western-spread { margin-top: 14px; }
.western-school { margin-top: 14px; }
.western-result { margin-inline: auto; }
.western-result-head { align-items: flex-start; display: flex; gap: 18px; justify-content: space-between; margin-bottom: 22px; }
.western-result-head span { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); letter-spacing: .08em; }
.western-result-head h2 { color: var(--ds-text-primary); font-size: var(--ds-heading-sm); line-height: 1.5; margin: 6px 0 0; }
@media (max-width: 720px) {
  .western-screen { min-height: calc(100dvh - 98px); }
  .western-portrait { border-radius: 13px; width: min(100%, 440px); }
  .western-intro > span { margin-top: 17px; }
  .western-form { margin-top: 19px; }
  .western-spread { margin-top: 12px; }
  .western-result-head h2 { font-size: var(--ds-text-md); }
}
</style>
