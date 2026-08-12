<script setup lang="ts">
import { computed, ref } from 'vue';
import { RotateCcw, Sparkles } from 'lucide-vue-next';
import { buildDivinationPrompt } from 'mingyu-core/prompt/divination';
import { drawLenormandSpread } from 'mingyu-core/divination/lenormand';
import type { AiCustomConfig, AiPreferences } from '../lib/ai';
import type { WesternCardReadingResult, WesternDeckType, WesternInterpretationPayload } from '../lib/tarot';
import { drawShiyueOracleCard, getLenormandImageUrl } from '../lib/westernDecks';
import TarotView from './TarotView.vue';
import WesternCardBoard from './WesternCardBoard.vue';
import { UiActionBar, UiButton, UiNotice, UiPageShell, UiTextField, UiWorkspaceSurface } from './ui';

const props = defineProps<{
  preferences?: AiPreferences;
  aiConfig?: AiCustomConfig;
  castingPreference?: 'auto' | 'manual';
}>();

const emit = defineEmits<{ interpret: [payload: WesternInterpretationPayload] }>();

const deckOptions: Array<{ value: WesternDeckType; label: string; description: string }> = [
  { value: 'tarot', label: '塔罗牌', description: '选择牌阵，观察事情的层次与发展' },
  { value: 'lenormand', label: '雷诺曼', description: '以三张牌串联事件的起因、现状与走向' },
  { value: 'shiyue-oracle', label: '时月神谕', description: '抽取一张六十甲子神谕，获得当下提示' },
];

const phase = ref<'entry' | 'tarot' | 'result'>('entry');
const deckType = ref<WesternDeckType>('tarot');
const question = ref('');
const errorMessage = ref('');
const reading = ref<WesternCardReadingResult | null>(null);
const prompt = ref('');
const selectedDeck = computed(() => deckOptions.find(item => item.value === deckType.value) || deckOptions[0]!);

function begin() {
  const asked = question.value.trim();
  if (!asked) {
    errorMessage.value = '请先写下想问的事。';
    return;
  }
  errorMessage.value = '';
  if (deckType.value === 'tarot') {
    phase.value = 'tarot';
    return;
  }
  if (deckType.value === 'lenormand') {
    const result = drawLenormandSpread('three');
    reading.value = {
      deckType: 'lenormand',
      deckName: '雷诺曼',
      spreadType: result.spreadType,
      spreadName: result.spreadName,
      cards: result.cards.map(card => ({ ...card, reversed: false, imageUrl: getLenormandImageUrl(card.id) })),
      timestamp: result.timestamp,
      meta: result.meta,
      draw: result.draw,
    };
    prompt.value = buildDivinationPrompt({ method: 'lenormand', data: result, question: asked, isCustomQuestion: true }).trim();
  } else {
    const card = drawShiyueOracleCard();
    reading.value = {
      deckType: 'shiyue-oracle',
      deckName: '时月神谕',
      spreadType: 'single',
      spreadName: '单牌神谕',
      cards: [card],
      timestamp: Date.now(),
      draw: { deckSize: 60, method: '加密随机抽取一张', order: [{ index: 1, cardId: card.id, cardName: card.name }] },
    };
    prompt.value = [
      '请解读一次时月六十甲子神谕抽牌。',
      `用户问题：${asked}`,
      `抽到的牌：第${card.id}张，${card.name}，纳音${card.subtitle}。`,
      '请只以牌面名称、六十甲子和纳音的传统象征为依据，先给出直接回答，再解释象意、现实提醒和可执行建议；不要虚构牌面未提供的固定签文或吉凶等级。',
    ].join('\n');
  }
  phase.value = 'result';
}

function startInterpretation() {
  if (!reading.value || !prompt.value) return;
  const summary = `${reading.value.spreadName}：${reading.value.cards.map(card => `${card.position} ${card.name}`).join('；')}`;
  emit('interpret', {
    question: question.value.trim(),
    reading: reading.value,
    request: {
      mode: 'divination',
      question: question.value.trim(),
      method: reading.value.deckName,
      reading: { summary, data: reading.value, prompt: prompt.value },
      preferences: props.preferences,
      aiConfig: props.aiConfig,
    },
  });
}

function reset() {
  phase.value = 'entry';
  reading.value = null;
  prompt.value = '';
  errorMessage.value = '';
}
</script>

<template>
  <TarotView
    v-if="phase === 'tarot'"
    :initial-question="question.trim()"
    hide-question-setup
    :preferences="preferences"
    :ai-config="aiConfig"
    :casting-preference="castingPreference"
    @interpret="emit('interpret', $event)"
  />

  <UiPageShell v-else width="reading" class="screen western-screen">
    <UiWorkspaceSurface v-if="phase === 'entry'" class="western-workspace western-entry" padding="standard">
      <header class="western-intro">
        <div class="western-portrait"><img src="/zhanbu.png" alt="西方占卜" /></div>
        <span>西方占卜</span>
      </header>

      <section class="western-form">
        <fieldset class="western-decks">
          <legend>选择牌卡</legend>
          <button v-for="item in deckOptions" :key="item.value" type="button" :class="{ active: deckType === item.value }" @click="deckType = item.value; errorMessage = ''">
            <strong>{{ item.label }}</strong><small>{{ item.description }}</small>
          </button>
        </fieldset>
        <UiTextField id="western-question" v-model="question" label="所问之事" multiline :rows="3" :maxlength="10000" :error="errorMessage" placeholder="写下此刻想问的事" @update:model-value="errorMessage = ''" />
        <UiActionBar align="center"><UiButton @click="begin"><Sparkles :size="16" />开始{{ selectedDeck.label }}</UiButton></UiActionBar>
      </section>
    </UiWorkspaceSurface>

    <UiWorkspaceSurface v-else-if="reading" class="western-workspace western-result" padding="standard">
      <header class="western-result-head">
        <div><span>{{ reading.deckName }} · {{ reading.spreadName }}</span><h2>{{ question }}</h2></div>
        <UiButton variant="ghost" size="small" @click="reset"><RotateCcw :size="14" />重新开始</UiButton>
      </header>
      <WesternCardBoard :reading="reading" />
      <UiNotice v-if="!prompt" tone="error" compact>解读资料生成失败，请重新抽牌。</UiNotice>
      <UiActionBar align="center"><UiButton size="large" :disabled="!prompt" @click="startInterpretation"><Sparkles :size="16" />开始解读</UiButton></UiActionBar>
    </UiWorkspaceSurface>
  </UiPageShell>
</template>

<style scoped>
.western-screen { min-height: calc(100dvh - 188px); }
.western-workspace { min-width: 0; }
.western-intro { align-items: center; display: flex; flex-direction: column; text-align: center; }
.western-portrait { background: #171216; border-radius: 18px; box-shadow: 0 16px 38px rgba(46,31,57,.14); overflow: hidden; width: min(100%, 560px); }
.western-portrait img { aspect-ratio: 16 / 9; display: block; object-fit: cover; width: 100%; }
.western-intro > span { color: var(--ds-accent); font-size: 11px; font-weight: 600; letter-spacing: .18em; margin-top: 22px; }
.western-form { margin: 24px auto 0; max-width: 560px; }
.western-decks { border: 0; display: grid; gap: 8px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0 0 20px; padding: 0; }
.western-decks legend { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); font-weight: 550; margin-bottom: 8px; }
.western-decks button { background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-md); color: var(--ds-text-primary); cursor: pointer; display: grid; gap: 5px; min-height: 92px; padding: 13px 10px; text-align: left; transition: border-color .18s, background .18s, box-shadow .18s; }
.western-decks button.active { background: var(--ds-accent-soft); border-color: color-mix(in srgb, var(--ds-accent) 48%, var(--ds-line)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ds-accent) 15%, transparent); }
.western-decks button:focus-visible { box-shadow: var(--ds-focus-ring); outline: none; }
.western-decks strong { font-size: var(--ds-text-sm); }
.western-decks small { color: var(--ds-text-tertiary); font-size: 10px; line-height: 1.45; }
.western-result { margin-inline: auto; }
.western-result-head { align-items: flex-start; display: flex; gap: 18px; justify-content: space-between; margin-bottom: 22px; }
.western-result-head span { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); letter-spacing: .08em; }
.western-result-head h2 { color: var(--ds-text-primary); font-size: var(--ds-heading-sm); line-height: 1.5; margin: 6px 0 0; }
@media (max-width: 720px) {
  .western-screen { min-height: calc(100dvh - 98px); }
  .western-portrait { border-radius: 13px; width: min(100%, 440px); }
  .western-intro > span { margin-top: 17px; }
  .western-form { margin-top: 19px; }
  .western-decks { gap: 6px; }
  .western-decks button { min-height: 72px; padding: 10px 8px; }
  .western-decks small { display: none; }
  .western-result-head h2 { font-size: var(--ds-text-md); }
}
</style>
