<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Flame, RotateCcw, Sparkles } from 'lucide-vue-next';
import type { SsgwData } from 'mingyu-core/types';
import { finishInteractiveSsgw, previewInteractiveSsgw } from '../lib/divination';
import { getShengbeiImageUrl } from '../lib/divinationTheme';
import type { AiInterpretationRequest } from '../lib/ai';
import AiPromptFallback from './AiPromptFallback.vue';
import AiReadingActions from './AiReadingActions.vue';
import ChatMarkdown from './ChatMarkdown.vue';
import TraditionalReading from './TraditionalReading.vue';
import TempleOffering from './TempleOffering.vue';
import { UiActionBar, UiButton, UiNotice, UiPageShell, UiTextField, UiWorkspaceSurface } from './ui';

const props = defineProps<{
  result?: SsgwData | null;
  initialQuestion?: string;
  aiAnswer?: string;
  aiError?: string;
  aiRequest?: AiInterpretationRequest | null;
  interpreting?: boolean;
}>();

const emit = defineEmits<{
  complete: [payload: { result: SsgwData; question: string }];
  'retry-interpretation': [];
}>();

type OraclePhase = 'idle' | 'drawing' | 'drawn' | 'confirming' | 'confirmed' | 'rejected';
interface SsgwRitualThrow {
  firstFace: '阳面' | '阴面';
  secondFace: '阳面' | '阴面';
  result: '圣杯' | '笑杯' | '阴杯';
}

const question = ref(props.initialQuestion || '');
const oracleError = ref('');
const phase = ref<OraclePhase>('idle');
const signSample = ref<number | null>(null);
const cupSamples = ref<number[]>([]);
const throws = ref<SsgwRitualThrow[]>([]);
const preview = ref<SsgwData | null>(null);
const completedResult = ref<SsgwData | null>(null);
const cupAnimating = ref(false);
const showStoredResult = ref(true);
const ritualVersion = ref(0);
const showTemple = ref(false);

const displayResult = computed(() => completedResult.value || (phase.value === 'idle' && showStoredResult.value ? props.result || null : null));
const latestThrow = computed(() => throws.value.at(-1));
const canThrow = computed(() => phase.value === 'drawn' && !cupAnimating.value);

watch(() => props.initialQuestion, (value) => {
  if (!value) return;
  question.value = value;
  resetRitual(false);
});

async function drawSign() {
  const currentRitual = ritualVersion.value + 1;
  ritualVersion.value = currentRitual;
  const asked = question.value.trim() || '请赐予我当下的指引。';
  question.value = asked;
  showStoredResult.value = false;
  signSample.value = Math.random();
  phase.value = 'drawing';
  completedResult.value = null;
  cupSamples.value = [];
  throws.value = [];
  const [nextPreview] = await Promise.all([
    previewInteractiveSsgw(signSample.value),
    new Promise((resolve) => window.setTimeout(resolve, 1_850)),
  ]);
  if (ritualVersion.value !== currentRitual) return;
  preview.value = nextPreview;
  phase.value = 'drawn';
}

async function beginOracleCasting() {
  oracleError.value = '';
  try {
    await drawSign();
  } catch (error) {
    phase.value = 'idle';
    oracleError.value = error instanceof Error ? error.message : '求签没有完成。';
  }
}

function faceFromSample(sample: number): '阳面' | '阴面' {
  return Math.floor(sample * 2) === 0 ? '阳面' : '阴面';
}

function resultFromFaces(firstFace: '阳面' | '阴面', secondFace: '阳面' | '阴面'): SsgwRitualThrow['result'] {
  if (firstFace !== secondFace) return '圣杯';
  return firstFace === '阳面' ? '笑杯' : '阴杯';
}

function consecutiveYinCount(nextThrows: SsgwRitualThrow[]) {
  let count = 0;
  for (let index = nextThrows.length - 1; index >= 0 && nextThrows[index].result === '阴杯'; index -= 1) count += 1;
  return count;
}

function cupImage(face?: '阳面' | '阴面') {
  return getShengbeiImageUrl(face === '阳面' ? 'yang' : 'yin');
}

async function throwCups() {
  if (!canThrow.value || signSample.value === null) return;
  cupAnimating.value = true;
  const firstSample = Math.random();
  const secondSample = Math.random();
  await new Promise((resolve) => window.setTimeout(resolve, 460));
  const firstFace = faceFromSample(firstSample);
  const secondFace = faceFromSample(secondSample);
  const result = resultFromFaces(firstFace, secondFace);
  const nextThrows = [...throws.value, { firstFace, secondFace, result }];
  throws.value = nextThrows;
  cupSamples.value = [...cupSamples.value, firstSample, secondSample];
  cupAnimating.value = false;
  oracleError.value = '';

  if (result === '圣杯') {
    const currentRitual = ritualVersion.value;
    phase.value = 'confirming';
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    if (currentRitual !== ritualVersion.value || signSample.value === null) return;
    const finalResult = await finishInteractiveSsgw(signSample.value, cupSamples.value);
    completedResult.value = finalResult;
    phase.value = 'confirmed';
    emit('complete', { result: finalResult, question: question.value });
    return;
  }
  if (consecutiveYinCount(nextThrows) >= 3 || nextThrows.length >= 12) phase.value = 'rejected';
}

function resetRitual(clearQuestion = true) {
  ritualVersion.value += 1;
  phase.value = 'idle';
  signSample.value = null;
  cupSamples.value = [];
  throws.value = [];
  preview.value = null;
  completedResult.value = null;
  cupAnimating.value = false;
  showStoredResult.value = false;
  if (clearQuestion) question.value = '';
}

onBeforeUnmount(() => {
  ritualVersion.value += 1;
});
</script>

<template>
  <UiPageShell width="reading" class="screen oracle-screen" :class="{ 'is-result': Boolean(displayResult) }">
    <UiWorkspaceSurface v-if="phase === 'idle' && !displayResult" class="oracle-workspace oracle-entry" padding="standard">
      <header class="oracle-intro">
        <div class="oracle-portrait"><img src="/ssgw.webp" alt="三山国王神像" /></div>
        <section class="temple-entry">
          <span>三山国王庙</span>
          <UiButton variant="secondary" @click="showTemple = true"><Flame :size="16" />进庙上香</UiButton>
        </section>
        <span>三山国王九十二签</span>
        <p class="oracle-description">三山国王是潮汕人常拜的“老爷”，是巾山、明山、独山三座山的山神，信仰发源于今揭西河婆一带。随着潮汕人迁徙，这份香火也流传至香港、台湾及东南亚，寄托着人们祈求平安、护佑乡土的心愿。</p>
      </header>

      <section class="oracle-question">
        <UiTextField id="oracle-question" v-model="question" label="所问之事" multiline :rows="3" :maxlength="10000" :error="oracleError" placeholder="写下此刻想求问的事" />
        <UiActionBar align="center">
          <UiButton @click="beginOracleCasting"><Sparkles :size="16" />诚心抽签</UiButton>
        </UiActionBar>
      </section>
    </UiWorkspaceSurface>

    <UiWorkspaceSurface v-else-if="phase === 'drawing' || phase === 'drawn' || phase === 'confirming' || phase === 'rejected'" class="oracle-workspace oracle-ritual" padding="standard" aria-live="polite">
      <div v-if="phase === 'drawing'" class="sign-casting-stage">
        <div class="sign-vessel" aria-hidden="true">
          <img v-for="index in 7" :key="index" class="sign-in-vessel" :class="`sign-in-vessel--${index}`" src="/divination-assets/temple/fortune-stick.png" alt="" />
          <img class="sign-rising" src="/divination-assets/temple/fortune-stick.png" alt="" />
          <img class="sign-cylinder" src="/divination-assets/temple/fortune-cylinder.png" alt="" />
        </div>
        <strong>诚心摇签中</strong>
        <small>请静心默念所问之事</small>
      </div>

      <template v-else>
        <header class="oracle-drawn-head">
          <span>所求灵签</span>
          <div class="drawn-sign"><small>第</small><strong>{{ preview?.number }}</strong><small>签</small></div>
          <p>{{ preview?.title }}</p>
        </header>

        <div class="cup-heading"><strong>{{ latestThrow ? `第 ${throws.length} 次 · ${latestThrow.result}` : '请掷圣杯确认此签' }}</strong><small>{{ throws.length }} / 12</small></div>
        <div class="cup-stage" :class="{ throwing: cupAnimating }">
          <figure><img :src="cupImage(latestThrow?.firstFace)" alt="第一枚筊杯" /><figcaption>{{ latestThrow?.firstFace || '第一杯' }}</figcaption></figure>
          <figure><img :src="cupImage(latestThrow?.secondFace)" alt="第二枚筊杯" /><figcaption>{{ latestThrow?.secondFace || '第二杯' }}</figcaption></figure>
        </div>
        <div v-if="throws.length" class="cup-history"><span v-for="(item, index) in throws" :key="index" :class="{ sacred: item.result === '圣杯' }">{{ index + 1 }} · {{ item.result }}</span></div>
        <p v-if="phase === 'confirming'" class="oracle-confirming">圣杯已成，稍候奉请签文</p>
        <p v-if="phase === 'rejected'" class="oracle-rejected">本次未获圣杯确认，请稍后静心再求。</p>
        <UiActionBar align="center">
          <UiButton v-if="phase === 'drawn'" :loading="cupAnimating" @click="throwCups"><Sparkles v-if="!cupAnimating" :size="16" />{{ cupAnimating ? '掷杯中…' : '掷圣杯' }}</UiButton>
          <UiButton v-else-if="phase === 'confirming'" disabled><Sparkles :size="15" />圣杯已成</UiButton>
          <UiButton v-else @click="resetRitual(false)"><RotateCcw :size="15" />重新求签</UiButton>
        </UiActionBar>
      </template>
    </UiWorkspaceSurface>

    <UiWorkspaceSurface v-else-if="displayResult" class="oracle-result" padding="standard">
      <header class="oracle-result-head">
        <span>三山国王九十二签</span>
        <UiButton variant="secondary" size="small" @click="resetRitual()"><RotateCcw :size="14" />再求一签</UiButton>
      </header>
      <TraditionalReading method="ssgw" :result="displayResult" />
      <section v-if="interpreting || aiAnswer || aiError" class="oracle-ai">
        <span><Sparkles :size="14" />AI 解签</span>
        <p v-if="interpreting">正在解签……</p>
        <template v-else-if="aiError"><UiNotice tone="error" compact>{{ aiError }}</UiNotice><AiPromptFallback v-if="aiRequest" :request="aiRequest" @retry="emit('retry-interpretation')" /></template>
        <template v-else><ChatMarkdown class="oracle-ai-markdown" :content="aiAnswer || ''" /><AiReadingActions :content="aiAnswer || ''" title="灵签解读" /></template>
      </section>
    </UiWorkspaceSurface>

    <TempleOffering v-if="showTemple" @close="showTemple = false" />
  </UiPageShell>
</template>

<style scoped>
.oracle-screen { min-height: calc(100dvh - 188px); }
.oracle-workspace { min-width: 0; }
.oracle-intro { align-items: center; display: flex; flex-direction: column; text-align: center; }
.oracle-portrait { background: #171216; border-radius: 18px; box-shadow: 0 16px 38px rgba(46, 31, 57, .14); overflow: hidden; width: min(100%, 560px); }
.oracle-portrait img { display: block; height: auto; width: 100%; }
.oracle-intro > span, .oracle-drawn-head > span { color: var(--accent); font-size: 11px; font-weight: 600; letter-spacing: .18em; margin-top: 22px; }
.oracle-intro .oracle-description { color: var(--muted); font-size: 13px; line-height: 1.8; margin: 8px 0 0; max-width: 620px; text-wrap: pretty; }
.oracle-question { margin: 30px auto 0; max-width: 560px; text-align: center; }
.oracle-question :deep(.ui-text-field__control) { min-height: 94px; resize: none; }
.oracle-ritual { margin-inline: auto; max-width: 600px; text-align: center; }
.sign-casting-stage { align-items: center; display: flex; flex-direction: column; min-height: 450px; justify-content: center; }
.sign-casting-stage > strong { color: var(--ink); font-family: 'STKaiti', 'KaiTi', serif; font-size: 18px; font-weight: 600; letter-spacing: .1em; margin-top: 8px; }
.sign-casting-stage > small { color: var(--muted); font-size: 11px; letter-spacing: .06em; margin-top: 5px; }
.sign-vessel { height: 330px; isolation: isolate; position: relative; width: 260px; }
.sign-cylinder { animation: sign-cylinder-shake .18s ease-in-out infinite; bottom: 0; filter: drop-shadow(0 15px 18px rgba(68, 18, 17, .25)); height: 300px; left: 50%; object-fit: contain; position: absolute; transform: translateX(-50%); width: 220px; z-index: 3; }
.sign-in-vessel { animation: sign-bundle-shake .22s ease-in-out infinite alternate; height: 180px; left: 50%; object-fit: contain; position: absolute; top: -1px; transform-origin: 50% 100%; width: 60px; z-index: 4; }
.sign-in-vessel--1 { margin-left: -56px; transform: rotate(-14deg); }
.sign-in-vessel--2 { margin-left: -40px; transform: rotate(-9deg); animation-delay: -.08s; }
.sign-in-vessel--3 { margin-left: -24px; transform: rotate(-4deg); animation-delay: -.13s; }
.sign-in-vessel--4 { margin-left: -8px; transform: rotate(2deg); animation-delay: -.04s; }
.sign-in-vessel--5 { margin-left: 8px; transform: rotate(7deg); animation-delay: -.16s; }
.sign-in-vessel--6 { margin-left: 24px; transform: rotate(11deg); animation-delay: -.1s; }
.sign-in-vessel--7 { margin-left: 40px; transform: rotate(16deg); animation-delay: -.19s; }
.sign-rising { animation: sign-rise 1.85s cubic-bezier(.25, .75, .32, 1) forwards; height: 196px; left: 50%; object-fit: contain; opacity: 0; position: absolute; top: 26px; transform: translateX(-50%); width: 65px; z-index: 5; }
@keyframes sign-cylinder-shake { 0%, 100% { transform: translateX(-50%) rotate(-1.5deg); } 50% { transform: translateX(-50%) rotate(1.5deg); } }
@keyframes sign-bundle-shake { from { translate: -2px 2px; } to { translate: 2px -3px; } }
@keyframes sign-rise { 0%, 36% { opacity: 0; transform: translate(-50%, 45px) rotate(-3deg); } 46% { opacity: 1; } 76% { opacity: 1; transform: translate(-50%, -118px) rotate(3deg); } 100% { opacity: 0; transform: translate(-50%, -168px) rotate(7deg); } }
.oracle-drawn-head { align-items: center; display: flex; flex-direction: column; }
.oracle-drawn-head > span { margin-top: 0; }
.drawn-sign { align-items: baseline; color: var(--muted); display: flex; gap: 7px; justify-content: center; margin-top: 7px; }
.drawn-sign > strong { color: var(--accent-strong); font-size: 54px; font-weight: 550; line-height: 1.15; }
.drawn-sign > small { color: var(--muted); font-size: 13px; }
.oracle-drawn-head p { color: var(--ink); font-size: 15px; margin: 5px 0 0; }
.cup-heading { align-items: center; border-top: 1px solid var(--line); display: flex; justify-content: center; margin-top: 24px; padding-top: 19px; position: relative; }
.cup-heading strong { color: var(--ink); font-size: 14px; }
.cup-heading small { color: var(--subtle); font-size: 11px; position: absolute; right: 0; }
.cup-stage { align-items: center; display: flex; gap: 8px; justify-content: center; min-height: 172px; overflow: hidden; }
.cup-stage figure { margin: 0; text-align: center; width: 40%; }
.cup-stage img { height: 105px; max-width: 100%; object-fit: contain; transition: transform .25s; }
.cup-stage figure:nth-child(2) img { transform: scaleX(-1) rotate(4deg); }
.cup-stage figcaption { color: var(--muted); font-size: 11px; margin-top: 4px; }
.cup-stage.throwing img { animation: cup-throw .46s ease-in-out; }
.cup-stage.throwing figure:nth-child(2) img { animation-delay: .04s; }
@keyframes cup-throw { 0% { transform: translateY(0) rotate(0); } 45% { transform: translateY(-38px) rotate(150deg); } 100% { transform: translateY(0) rotate(360deg); } }
.cup-history { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
.cup-history span { background: var(--surface-muted); border-radius: 99px; color: var(--muted); font-size: 11px; padding: 5px 9px; }
.cup-history span.sacred { background: var(--accent-soft); color: var(--accent-strong); }
.oracle-rejected { color: var(--plum); font-size: 12px; line-height: 1.7; margin: 14px 0 0; }
.oracle-confirming { color: var(--accent-strong); font-size: 13px; font-weight: 600; letter-spacing: .08em; margin: 13px 0 0; }
.oracle-result { margin: 0 auto; }
.oracle-result-head { align-items: center; display: flex; justify-content: space-between; margin-bottom: 13px; min-height: 34px; }
.oracle-result-head span { color: var(--muted); font-size: 11px; letter-spacing: .12em; }
.oracle-ai { border-top: 1px solid var(--line); margin-top: 26px; padding-top: 18px; }
.oracle-ai > span { align-items: center; color: var(--accent); display: flex; font-size: 12px; gap: 6px; letter-spacing: .08em; }
.oracle-ai p { color: var(--muted); font-size: 14px; line-height: 1.85; margin: 12px 0 0; white-space: pre-wrap; }
.oracle-ai-markdown { color: var(--muted); font-size: 14px; line-height: 1.85; margin-top: 12px; }
.oracle-ai-markdown :deep(> :first-child) { margin-top: 0; }
.oracle-ai-markdown :deep(> :last-child) { margin-bottom: 0; }
.oracle-ai p.error { color: var(--plum); }
.temple-entry { align-items: center; display: flex; justify-content: space-between; margin-top: 17px; width: min(100%, 560px); }
.temple-entry > span { color: var(--muted); font-size: 11px; letter-spacing: .1em; }
.temple-entry :deep(.ui-button--secondary) { border-color: color-mix(in srgb, var(--gold) 38%, var(--line)); color: var(--gold); }
.temple-entry :deep(.ui-button--secondary:hover:not(:disabled)) { background: color-mix(in srgb, var(--gold) 12%, var(--surface-muted)); border-color: color-mix(in srgb, var(--gold) 60%, var(--line)); color: var(--ink); }
@media (max-width: 720px) {
  .oracle-screen { min-height: calc(100dvh - 98px); }
  .oracle-portrait { border-radius: 13px; box-shadow: 0 11px 28px rgba(46, 31, 57, .12); width: min(100%, 440px); }
  .oracle-intro > span { margin-top: 17px; }
  .oracle-intro .oracle-description { font-size: 12px; line-height: 1.75; margin-top: 7px; }
  .oracle-question { margin-top: 23px; }
  .oracle-question :deep(.ui-text-field__control) { min-height: 82px; }
  .oracle-ritual { margin-top: 2vh; }
  .sign-casting-stage { min-height: 370px; }
  .sign-vessel { height: 285px; width: 220px; }
  .sign-cylinder { height: 260px; width: 190px; }
  .sign-in-vessel { height: 155px; top: 2px; width: 52px; }
  .sign-rising { height: 170px; width: 56px; }
  .drawn-sign > strong { font-size: 47px; }
  .cup-heading { margin-top: 19px; padding-top: 16px; }
  .cup-stage { min-height: 148px; }
  .cup-stage img { height: 88px; }
  .oracle-result-head { margin-bottom: 10px; min-height: 32px; }
  .temple-entry { margin-top: 13px; }
}
@media (prefers-reduced-motion: reduce) {
  .sign-cylinder, .sign-in-vessel { animation: none; }
  .sign-rising { animation-duration: .01ms; }
}
</style>
