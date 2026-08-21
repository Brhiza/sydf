<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { ArrowRight, Coins, RotateCcw, Sparkles } from 'lucide-vue-next';
import { UiButton, UiNotice, UiReadingGrid, UiReadingLead, UiReadingRows, UiReadingSection, UiReadingWorkspace, UiToolPage, UiWorkspaceSurface } from './ui';
import type { AiInterpretationRequest } from '../lib/ai';
import { getHexagramCardImageUrl } from '../lib/divinationCardAssets';
import { getLiuyaoRitualImageUrl } from '../lib/divinationTheme';
import {
  DAILY_HEXAGRAM_STORAGE_KEY,
  buildDailyHexagramResult,
  createDailyHexagramSession,
  dailyHexagramYaoLabel,
  formatDailyHexagramDateKey,
  parseDailyHexagramSession,
  shakeDailyHexagramCoins,
  type DailyHexagramCoinThrow,
  type DailyHexagramResult,
  type DailyHexagramSession,
} from '../lib/dailyHexagram';
import AiPromptFallback from './AiPromptFallback.vue';
import AiReadingActions from './AiReadingActions.vue';
import ChatMarkdown from './ChatMarkdown.vue';

const props = defineProps<{
  aiAnswer?: string;
  aiError?: string;
  aiRequest?: AiInterpretationRequest | null;
  interpreting?: boolean;
}>();

const emit = defineEmits<{
  interpret: [result: DailyHexagramResult];
  'retry-interpretation': [];
}>();

const today = new Date();
const isLocalTesting = import.meta.env.DEV;

function restoreDailyHexagramState(): {
  session: DailyHexagramSession;
  result: DailyHexagramResult | null;
  errorMessage: string;
} {
  const fallbackSession = createDailyHexagramSession(today);
  if (typeof window === 'undefined') {
    return { session: fallbackSession, result: null, errorMessage: '' };
  }

  try {
    const stored = parseDailyHexagramSession(localStorage.getItem(DAILY_HEXAGRAM_STORAGE_KEY), today);
    const restoredSession = stored || fallbackSession;
    if (restoredSession.coinThrows.length !== 6) {
      return { session: restoredSession, result: null, errorMessage: '' };
    }
    return {
      session: restoredSession,
      result: buildDailyHexagramResult(restoredSession.coinThrows, new Date(restoredSession.startedAt)),
      errorMessage: '',
    };
  } catch {
    return {
      session: fallbackSession,
      result: null,
      errorMessage: '当天记录未能恢复，请重新起卦。',
    };
  }
}

const initialState = restoreDailyHexagramState();
const session = ref<DailyHexagramSession>(initialState.session);
const result = ref<DailyHexagramResult | null>(initialState.result);
const pendingThrow = ref<DailyHexagramCoinThrow | null>(null);
const errorMessage = ref(initialState.errorMessage);
const isShaking = ref(false);
const latestLineIndex = ref(-1);
const interpretationRequested = ref(false);
let shakeTimer: number | null = null;

const lineNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
const displayLineIndexes = [5, 4, 3, 2, 1, 0];
const directionItems = [
  { key: 'wealth', label: '财运' },
  { key: 'social', label: '人际' },
  { key: 'health', label: '健康' },
  { key: 'study', label: '学业' },
  { key: 'travel', label: '出行' },
] as const;

const dateLabel = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric',
}).format(today);
const nextLineName = computed(() => lineNames[session.value.coinThrows.length] || '卦象');
const latestThrow = computed(() => session.value.coinThrows[session.value.coinThrows.length - 1] || null);
const latestThrowName = computed(() => lineNames[session.value.coinThrows.length - 1] || '');
const castingTitle = computed(() => {
  if (isShaking.value) return `正在摇${nextLineName.value}`;
  if (!latestThrow.value) return '静心起卦';
  return `已得${latestThrowName.value}，继续摇${nextLineName.value}`;
});
const castingHint = computed(() => latestThrow.value
  ? '六爻由下向上排列，继续完成余下爻位。'
  : '心中默念今日所问，从初爻开始依次摇满六爻。');
const hasChangingLines = computed(() => (result.value?.chart.changingYaos.length ?? 0) !== 0);
const hexagramCardImageUrl = computed(() => getHexagramCardImageUrl(result.value?.original.id ?? 1));
const movingLines = computed(() => result.value?.interpretation.movingLines || []);
const changeSummary = computed(() => {
  const positions = result.value?.chart.changingYaos.map((line) => lineNames[line.position - 1]) || [];
  return positions.length ? `${positions.join('、')}动` : '六爻皆静';
});
const changeTone = computed(() => {
  const movingCount = result.value?.chart.changingYaos.length ?? 0;
  if (movingCount === 0) return '局面稳定';
  if (movingCount <= 2) return '变化渐显';
  if (movingCount <= 4) return '变化明显';
  return '转折较强';
});
const hexagramReadingDescription = computed(() => {
  if (!result.value) return '';
  const changed = hasChangingLines.value ? ` · 之卦 ${result.value.changed.name}` : '';
  return `本卦 ${result.value.original.name} · 互卦 ${result.value.inter.name}${changed}`;
});
const focusRows = computed(() => {
  if (!result.value) return [];
  return [
    {
      key: 'traditional',
      marker: '取',
      title: '传统取用',
      detail: result.value.interpretation.traditionalOverview,
      tone: 'accent' as const,
    },
    {
      key: 'plain',
      marker: '断',
      title: '现代直断',
      detail: result.value.interpretation.plainOverview,
      tone: 'accent' as const,
    },
    ...([
      { key: 'career', marker: '事', title: '办事' },
      { key: 'relationship', marker: '系', title: '关系' },
      { key: 'decision', marker: '择', title: '选择' },
    ] as const).map((item) => ({
      ...item,
      detail: result.value!.interpretation.directions[item.key].current,
      tone: 'neutral' as const,
    })),
  ];
});
const interpretationRows = computed(() => {
  if (!result.value) return [];
  return [
    {
      key: 'focus',
      marker: '势',
      title: '解读重心',
      badge: '卦势',
      detail: result.value.interpretation.focus,
      tone: 'accent' as const,
    },
    {
      key: 'context',
      marker: '互',
      title: '内在条件',
      badge: '互卦',
      detail: result.value.interpretation.innerContext,
      tone: 'neutral' as const,
    },
    {
      key: 'trend',
      marker: hasChangingLines.value ? '变' : '本',
      title: '后续走势',
      badge: hasChangingLines.value ? '之卦' : '本卦',
      detail: result.value.interpretation.trend,
      tone: 'neutral' as const,
    },
    {
      key: 'decision',
      marker: '用',
      title: '行动判断',
      badge: '取用',
      detail: result.value.interpretation.pace,
      note: result.value.interpretation.decisionRule,
      tone: 'accent' as const,
    },
    ...(result.value.interpretation.specialText ? [{
      key: 'special',
      marker: '全',
      title: '用辞',
      badge: '全动',
      detail: result.value.interpretation.specialText,
      tone: 'caution' as const,
    }] : []),
  ];
});
const directionRows = computed(() => {
  if (!result.value) return [];
  return directionItems.map((item) => ({
    key: item.key,
    marker: item.label.slice(0, 1),
    title: item.label,
    detail: result.value!.interpretation.directions[item.key].current,
    note: result.value!.interpretation.directions[item.key].trend
      ? `趋势：${result.value!.interpretation.directions[item.key].trend}`
      : undefined,
    tone: 'neutral' as const,
  }));
});
const showAiReading = computed(() => interpretationRequested.value
  && Boolean(props.interpreting || props.aiAnswer || props.aiError));

function scrollPageTop() {
  const content = document.querySelector<HTMLElement>('.content');
  content?.scrollTo({ top: 0, behavior: 'smooth' });
}

function persistSession() {
  try {
    localStorage.setItem(DAILY_HEXAGRAM_STORAGE_KEY, JSON.stringify(session.value));
  } catch {
    // 浏览器拒绝本地存储时，本次起卦仍可继续完成。
  }
}

function buildResultIfComplete() {
  errorMessage.value = '';
  if (session.value.coinThrows.length !== 6) return;
  try {
    result.value = buildDailyHexagramResult(session.value.coinThrows, new Date(session.value.startedAt));
  } catch (error) {
    result.value = null;
    errorMessage.value = error instanceof Error ? error.message : '卦象计算没有完成。';
  }
}

onBeforeUnmount(() => {
  if (shakeTimer !== null) window.clearTimeout(shakeTimer);
});

function shakeNextLine() {
  if (isShaking.value || session.value.coinThrows.length >= 6 || result.value) return;
  isShaking.value = true;
  const now = new Date();
  const todayKey = formatDailyHexagramDateKey(now);
  const activeSession = session.value.dateKey === todayKey
    ? session.value
    : createDailyHexagramSession(now);
  pendingThrow.value = shakeDailyHexagramCoins();

  shakeTimer = window.setTimeout(() => {
    if (!pendingThrow.value) return;
    session.value = {
      ...activeSession,
      startedAt: activeSession.coinThrows.length ? activeSession.startedAt : now.getTime(),
      coinThrows: [...activeSession.coinThrows, pendingThrow.value],
    };
    latestLineIndex.value = session.value.coinThrows.length - 1;
    pendingThrow.value = null;
    isShaking.value = false;
    shakeTimer = null;
    persistSession();
    buildResultIfComplete();
    if (result.value) void nextTick(scrollPageTop);
  }, 760);
}

function resetDailyHexagramForTesting() {
  if (!isLocalTesting) return;
  if (shakeTimer !== null) {
    window.clearTimeout(shakeTimer);
    shakeTimer = null;
  }
  try {
    localStorage.removeItem(DAILY_HEXAGRAM_STORAGE_KEY);
  } catch {
    // 本地存储不可用时，仍允许在当前页面重新起卦。
  }
  session.value = createDailyHexagramSession(new Date());
  result.value = null;
  pendingThrow.value = null;
  errorMessage.value = '';
  isShaking.value = false;
  latestLineIndex.value = -1;
  interpretationRequested.value = false;
  void nextTick(scrollPageTop);
}

function requestAiReading() {
  if (!result.value || props.interpreting) return;
  interpretationRequested.value = true;
  emit('interpret', result.value);
}
</script>

<template>
  <Transition name="hex-page" mode="out-in">
    <UiToolPage
      v-if="result"
      key="result"
      width="standard"
      class="screen daily-result-screen"
    >
      <UiReadingWorkspace
        class="daily-reading"
      >
        <template #hero-media>
          <img class="daily-hexagram-card" :src="hexagramCardImageUrl" :alt="`${result.original.name}卦卡`" />
        </template>

        <template #hero-context>
          <section class="result-hexagram">
            <div class="hexagram-name-flow">
              <span><small>本卦</small><strong>{{ result.original.name }}</strong></span>
              <ArrowRight v-if="hasChangingLines" :size="17" />
              <span v-if="hasChangingLines"><small>之卦</small><strong>{{ result.changed.name }}</strong></span>
            </div>
            <div class="hexagram-meta">
              <span>互卦</span>
              <strong>{{ result.inter.name }}</strong>
              <i></i>
              <span>{{ changeSummary }}</span>
            </div>
            <div class="hexagram-lines" aria-label="今日六爻卦象">
              <div v-for="lineIndex in displayLineIndexes" :key="lineIndex" class="hexagram-line-row">
                <span>{{ lineNames[lineIndex] }}</span>
                <div
                  class="yao-line"
                  :class="{
                    yin: session.coinThrows[lineIndex].total === 6 || session.coinThrows[lineIndex].total === 8,
                    moving: session.coinThrows[lineIndex].total === 6 || session.coinThrows[lineIndex].total === 9,
                  }"
                ><b></b><b></b></div>
                <small>{{ session.coinThrows[lineIndex].total }}</small>
              </div>
            </div>
          </section>
        </template>

        <template #hero-summary>
          <UiReadingLead
            kicker="今日解读"
            :meta="dateLabel"
            :title="result.guidance.theme"
            :summary="result.guidance.summary"
          >
            <template v-if="isLocalTesting" #title-addon>
              <UiButton class="daily-reset-action" variant="secondary" size="small" @click="resetDailyHexagramForTesting">
                <RotateCcw :size="14" />
                <span>重新起卦</span>
              </UiButton>
            </template>
          </UiReadingLead>
        </template>

        <UiReadingSection class="daily-focus-panel" title="判断依据">
          <UiReadingRows :items="focusRows" />
        </UiReadingSection>

        <UiReadingGrid ratio="wide-left">
          <UiReadingSection class="interpretation-panel" title="卦象解读" :description="hexagramReadingDescription">
            <template #meta><span class="section-meta-pill">{{ changeSummary }} · {{ changeTone }}</span></template>
            <UiReadingRows :items="interpretationRows" />
          </UiReadingSection>

          <UiReadingSection class="direction-panel" title="生活参考">
            <UiReadingRows :items="directionRows" marker-style="soft" />
          </UiReadingSection>
        </UiReadingGrid>

        <UiReadingSection v-if="movingLines.length" class="moving-lines-panel" title="动爻提示">
        <div>
          <article v-for="line in movingLines" :key="line.position">
            <div class="moving-line-heading"><span>{{ line.name }}</span><strong>{{ line.type }}</strong></div>
            <div class="moving-line-content">
              <blockquote>{{ line.source }}</blockquote>
              <p>{{ line.meaning }}</p>
              <p class="moving-line-advice">{{ line.advice }}</p>
            </div>
          </article>
        </div>
        </UiReadingSection>

        <div class="daily-ai-action">
          <UiButton class="daily-ai-button" size="large" :loading="interpreting" :disabled="interpreting" @click="requestAiReading">
            <Sparkles v-if="!interpreting" :size="16" />
            {{ interpreting ? '解读中…' : interpretationRequested ? '重新解读' : 'AI 解读' }}
          </UiButton>
        </div>

        <UiReadingSection v-if="showAiReading" class="daily-ai-reading" title="AI 解读">
          <p v-if="interpreting" class="daily-ai-loading">正在结合今日卦象解读……</p>
          <template v-else-if="aiError">
            <UiNotice tone="error" compact>{{ aiError }}</UiNotice>
            <AiPromptFallback v-if="aiRequest" :request="aiRequest" @retry="emit('retry-interpretation')" />
          </template>
          <template v-else>
            <ChatMarkdown class="daily-ai-markdown" :content="aiAnswer || ''" />
            <AiReadingActions :content="aiAnswer || ''" title="每日一卦解读" />
          </template>
        </UiReadingSection>

      </UiReadingWorkspace>
    </UiToolPage>

    <UiToolPage
      v-else
      key="casting"
      width="standard"
      class="screen daily-hexagram-screen"
    >
      <UiWorkspaceSurface as="article" class="casting-board">
        <header class="casting-intro">
          <div>
            <span class="casting-date">每日一卦 · {{ dateLabel }}</span>
            <h2>{{ castingTitle }}</h2>
            <p>{{ castingHint }}</p>
          </div>
          <div
            class="casting-progress"
            role="progressbar"
            aria-label="起卦进度"
            aria-valuemin="0"
            aria-valuemax="6"
            :aria-valuenow="session.coinThrows.length"
          >
            <div class="casting-progress-value">
              <strong>{{ session.coinThrows.length }}</strong>
              <span>/ 6 爻</span>
            </div>
            <div class="casting-progress-track" aria-hidden="true">
              <i v-for="step in 6" :key="step" :class="{ done: step <= session.coinThrows.length }"></i>
            </div>
          </div>
        </header>

        <div class="casting-layout">
          <section class="hexagram-display" aria-label="今日六爻卦象">
            <header>
              <strong>六爻进度</strong>
              <span>自下而上成卦</span>
            </header>
            <div class="hexagram-lines">
              <div
                v-for="lineIndex in displayLineIndexes"
                :key="lineIndex"
                class="hexagram-line-row"
                :class="{ filled: session.coinThrows[lineIndex], latest: latestLineIndex === lineIndex }"
              >
                <span>{{ lineNames[lineIndex] }}</span>
                <div
                  v-if="session.coinThrows[lineIndex]"
                  class="yao-line"
                  :class="{
                    yin: session.coinThrows[lineIndex].total === 6 || session.coinThrows[lineIndex].total === 8,
                    moving: session.coinThrows[lineIndex].total === 6 || session.coinThrows[lineIndex].total === 9,
                  }"
                ><b></b><b></b></div>
                <div v-else class="yao-placeholder"><i></i></div>
                <small v-if="session.coinThrows[lineIndex]">{{ dailyHexagramYaoLabel(session.coinThrows[lineIndex].total) }}</small>
                <small v-else>待摇</small>
              </div>
            </div>
          </section>

          <section class="casting-stage" aria-live="polite">
            <div class="stage-heading">
              <span>{{ latestThrow ? latestThrowName : '第一步' }}</span>
              <strong>{{ isShaking ? `正在摇${nextLineName}` : (latestThrow ? '本次铜钱' : '准备摇初爻') }}</strong>
            </div>
            <div class="shake-result">
              <Transition name="shake-visual" mode="out-in">
                <div v-if="isShaking" key="shell" class="shell-animation">
                  <img :src="getLiuyaoRitualImageUrl('shell')" alt="龟壳正在摇卦" />
                  <span>正在摇{{ nextLineName }}</span>
                </div>
                <div v-else-if="latestThrow" key="coins" class="coin-result">
                  <div>
                    <img
                      v-for="(coin, coinIndex) in latestThrow.coins"
                      :key="`${session.coinThrows.length}-${coinIndex}`"
                      :src="getLiuyaoRitualImageUrl(coin === 3 ? 'coin-heads' : 'coin-tails')"
                      :alt="coin === 3 ? '铜钱正面' : '铜钱背面'"
                    />
                  </div>
                  <p><strong>{{ dailyHexagramYaoLabel(latestThrow.total) }}</strong><span>{{ latestThrow.total }} 点 · {{ latestThrowName }}</span></p>
                </div>
                <div v-else key="empty" class="empty-result">
                  <img :src="getLiuyaoRitualImageUrl('shell')" alt="起卦龟壳" />
                  <span>等待摇出初爻</span>
                </div>
              </Transition>
            </div>
            <div class="casting-controls">
              <UiButton
                v-if="session.coinThrows.length < 6"
                class="daily-shake-action"
                size="large"
                block
                :loading="isShaking"
                @click="shakeNextLine"
              >
                <Coins v-if="!isShaking" :size="17" />
                <span>{{ isShaking ? '摇卦中' : `摇${nextLineName}` }}</span>
              </UiButton>
              <UiNotice v-if="errorMessage" class="daily-hexagram-error" tone="error" compact>{{ errorMessage }}</UiNotice>
            </div>
          </section>
        </div>
      </UiWorkspaceSurface>
    </UiToolPage>
  </Transition>
</template>

<style scoped>
.hex-page-enter-active, .hex-page-leave-active { transition: opacity .18s ease; }
.hex-page-enter-from, .hex-page-leave-to { opacity: 0; }

.yao-line { box-sizing: border-box; display: flex; height: 9px; justify-content: center; padding-right: 25px; position: relative; }
.yao-line b { background: var(--ds-accent-strong); border-radius: 2px; display: block; height: 8px; width: 100%; }
.yao-line b + b { display: none; }
.yao-line.yin b + b { display: block; }
.yao-line.moving::after { align-items: center; border: 1px solid var(--ds-plum); border-radius: 50%; color: var(--ds-plum); content: '动'; display: flex; font-size: 7px; height: 17px; justify-content: center; position: absolute; right: 0; top: -5px; width: 17px; }

.casting-board { background: var(--ds-surface-raised); overflow: hidden; }
.casting-intro { align-items: center; background: linear-gradient(110deg, color-mix(in srgb, var(--ds-accent-soft) 32%, var(--ds-surface-raised)), var(--ds-surface-raised) 52%); border-bottom: 1px solid var(--ds-line); display: flex; gap: var(--ds-space-7); justify-content: space-between; padding: 27px clamp(24px, 4vw, 42px) 25px; }
.casting-date { color: var(--ds-accent); display: block; font-size: var(--ds-text-xs); font-weight: 600; letter-spacing: .04em; margin-bottom: 7px; }
.casting-intro h2 { color: var(--ds-text-primary); font-size: clamp(21px, 2.6vw, 28px); font-weight: 700; letter-spacing: -.025em; line-height: 1.2; margin: 0; }
.casting-intro p { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.6; margin: 7px 0 0; }
.casting-progress { background: color-mix(in srgb, var(--ds-surface-muted) 86%, var(--ds-surface-raised)); border: 1px solid color-mix(in srgb, var(--ds-accent) 16%, var(--ds-line)); border-radius: var(--ds-radius-md); display: flex; flex: 0 0 auto; flex-direction: column; gap: var(--ds-space-2); min-width: 128px; padding: 12px 14px 11px; }
.casting-progress-value { align-items: baseline; display: flex; gap: 5px; justify-content: center; }
.casting-progress strong { color: var(--ds-accent-strong); font-size: 25px; font-weight: 720; line-height: 1; }
.casting-progress span { color: var(--ds-text-secondary); font-size: var(--ds-text-xs); }
.casting-progress-track { display: grid; gap: 3px; grid-template-columns: repeat(6, 1fr); width: 100%; }
.casting-progress-track i { background: var(--ds-line-strong); border-radius: var(--ds-radius-round); display: block; height: 3px; transition: background .2s ease, transform .2s ease; }
.casting-progress-track i.done { background: var(--ds-accent); transform: scaleY(1.35); }
.casting-layout { display: grid; grid-template-columns: minmax(320px, .92fr) minmax(390px, 1.08fr); min-height: 410px; }
.hexagram-display { padding: 28px clamp(24px, 4vw, 42px) 30px; }
.hexagram-display > header { align-items: baseline; display: flex; justify-content: space-between; margin-bottom: 25px; }
.hexagram-display > header span { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.hexagram-display > header strong { color: var(--ds-text-primary); font-size: var(--ds-text-sm); font-weight: 650; }
.daily-hexagram-screen .hexagram-lines { display: grid; gap: 16px; margin: 0 auto; width: min(100%, 390px); }
.daily-hexagram-screen .hexagram-line-row { align-items: center; border-radius: var(--ds-radius-sm); display: grid; gap: 14px; grid-template-columns: 38px minmax(150px, 1fr) 48px; min-height: 28px; padding: 5px 8px; transition: background .18s ease; }
.daily-hexagram-screen .hexagram-line-row > span, .daily-hexagram-screen .hexagram-line-row > small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); text-align: right; }
.daily-hexagram-screen .hexagram-line-row > small { text-align: left; }
.daily-hexagram-screen .hexagram-line-row.filled > span, .daily-hexagram-screen .hexagram-line-row.filled > small { color: var(--ds-text-secondary); }
.daily-hexagram-screen .hexagram-line-row.latest { background: color-mix(in srgb, var(--ds-accent) 8%, transparent); }
.daily-hexagram-screen .hexagram-line-row.latest > span, .daily-hexagram-screen .hexagram-line-row.latest > small { color: var(--ds-accent-strong); font-weight: 600; }
.yao-placeholder { align-items: center; display: flex; height: 8px; }
.yao-placeholder i { border-top: 1px dashed var(--ds-line-strong); width: 100%; }
.daily-hexagram-screen .yao-line.yin { gap: 22px; }
.daily-hexagram-screen .yao-line.yin b { width: calc(50% - 11px); }
.casting-stage { align-items: stretch; background: radial-gradient(circle at 50% 48%, color-mix(in srgb, var(--ds-accent-soft) 74%, transparent) 0, transparent 48%), var(--ds-surface-muted); border-left: 1px solid var(--ds-line); display: flex; flex-direction: column; min-width: 0; padding: 28px clamp(24px, 4vw, 42px) 30px; }
.stage-heading { align-items: baseline; display: flex; justify-content: space-between; }
.stage-heading span { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.stage-heading strong { color: var(--ds-text-primary); font-size: var(--ds-text-sm); font-weight: 650; }
.shake-result { align-items: center; display: flex; flex: 1 1 auto; justify-content: center; min-height: 236px; overflow: hidden; padding: 12px 0; }
.shell-animation, .coin-result, .empty-result { align-items: center; display: flex; flex-direction: column; justify-content: center; min-height: 206px; width: 100%; }
.shell-animation img, .empty-result img { display: block; filter: drop-shadow(0 12px 18px color-mix(in srgb, var(--ds-accent) 18%, transparent)); height: 142px; object-fit: contain; width: 132px; }
.shell-animation img { animation: shell-shake .68s ease-in-out infinite; }
.shell-animation span { color: var(--ds-accent); font-size: var(--ds-text-xs); letter-spacing: .12em; margin-top: 9px; }
@keyframes shell-shake { 0%, 100% { transform: rotate(-3deg) translateX(-2px); } 35% { transform: rotate(4deg) translateX(3px); } 70% { transform: rotate(-2deg) translateX(1px); } }
.coin-result > div { align-items: center; display: flex; gap: 15px; justify-content: center; }
.coin-result img { display: block; filter: drop-shadow(0 3px 5px rgba(77, 55, 111, .12)); height: 88px; object-fit: contain; width: 88px; }
.coin-result img:nth-child(1) { transform: rotate(-7deg); }
.coin-result img:nth-child(2) { transform: rotate(5deg); }
.coin-result img:nth-child(3) { transform: rotate(-2deg); }
.coin-result p { align-items: baseline; display: flex; gap: 8px; margin: 15px 0 0; }
.coin-result p strong { color: var(--ds-accent-strong); font-size: var(--ds-text-sm); }
.coin-result p span { color: var(--ds-text-secondary); font-size: var(--ds-text-xs); }
.empty-result { color: var(--ds-text-tertiary); }
.empty-result img { filter: saturate(.82) drop-shadow(0 12px 18px color-mix(in srgb, var(--ds-accent) 18%, transparent)); opacity: .88; }
.empty-result span { font-size: var(--ds-text-xs); letter-spacing: .06em; margin-top: 8px; }
.shake-visual-enter-active, .shake-visual-leave-active { transition: opacity .18s ease, transform .18s ease; }
.shake-visual-enter-from { opacity: 0; transform: translateY(-5px) scale(.96); }
.shake-visual-leave-to { opacity: 0; transform: translateY(5px) scale(.96); }
.casting-controls { align-items: center; display: flex; flex-direction: column; text-align: center; }
.daily-shake-action { box-shadow: 0 10px 22px color-mix(in srgb, var(--ds-accent-strong) 24%, transparent); max-width: 330px; }
.casting-controls > p { color: var(--ds-text-secondary); font-size: var(--ds-text-xs); line-height: 1.7; margin: 9px 0 0; }
.casting-controls .daily-hexagram-error { margin-top: var(--ds-space-2); width: 100%; }

.result-hexagram { width: min(100%, 280px); }
.daily-hexagram-card { aspect-ratio: 2 / 3; border-radius: var(--ds-radius-md); display: block; height: auto; object-fit: cover; width: 100%; }
.daily-result-screen .hexagram-lines { display: grid; gap: 8px; width: 100%; }
.daily-result-screen .hexagram-line-row { align-items: center; display: grid; gap: 10px; grid-template-columns: 36px minmax(126px, 1fr) 18px; line-height: 1; }
.daily-result-screen .hexagram-line-row > span, .daily-result-screen .hexagram-line-row > small { color: var(--ds-text-secondary); font-size: 11px; line-height: 1; text-align: right; }
.daily-result-screen .hexagram-line-row > small { text-align: left; }
.daily-result-screen .yao-line.yin { gap: 21px; }
.daily-result-screen .yao-line.yin b { width: calc(50% - 10.5px); }
.hexagram-name-flow { align-items: center; display: flex; gap: 12px; justify-content: center; margin-bottom: 5px; text-align: center; }
.hexagram-name-flow > span { display: grid; gap: 2px; }
.hexagram-name-flow small { color: var(--ds-accent); font-size: 11px; letter-spacing: .08em; line-height: 1.2; }
.hexagram-name-flow strong { color: var(--ds-text-primary); font-size: 16px; font-weight: 700; line-height: 1.2; white-space: nowrap; }
.hexagram-name-flow > svg { color: var(--ds-accent); }
.hexagram-meta { align-items: center; color: var(--ds-text-secondary); display: flex; font-size: 11px; gap: 6px; justify-content: center; line-height: 1.2; margin-bottom: 10px; }
.hexagram-meta strong { color: var(--ds-text-primary); font-size: inherit; font-weight: 600; }
.hexagram-meta i { background: var(--ds-line); height: 10px; margin: 0 3px; width: 1px; }
.daily-reset-action { border-radius: var(--ds-radius-round); }
.section-meta-pill { background: var(--ds-surface-muted); border-radius: var(--ds-radius-round); color: var(--ds-accent-strong); display: inline-block; padding: 6px 10px; }
.moving-lines-panel article { align-items: start; border-top: 1px solid var(--ds-line); display: grid; gap: 18px; grid-template-columns: 82px minmax(0, 1fr); padding: 17px 0; }
.moving-line-heading { align-items: baseline; display: flex; flex-wrap: wrap; gap: 7px; }
.moving-line-heading span { color: var(--ds-accent); font-size: var(--ds-text-sm); }
.moving-line-heading strong { color: var(--ds-text-primary); font-size: var(--ds-text-xs); }
.moving-line-content blockquote { color: var(--ds-text-primary); font-size: var(--ds-text-sm); line-height: var(--ds-line-normal); margin: 0 0 7px; }
.moving-line-content p { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: var(--ds-line-normal); margin: 0; }
.moving-line-content .moving-line-advice { color: var(--ds-text-primary); margin-top: 5px; }
.daily-ai-action { display: flex; justify-content: center; padding: var(--ds-space-2) 0; }
.daily-ai-button { min-width: 150px; }
.daily-ai-loading { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); margin: 0; }
.daily-ai-markdown { color: var(--ds-text-primary); }

@media (max-width: 900px) {
  .casting-intro { align-items: flex-start; gap: var(--ds-space-3); padding: 18px 16px 16px; }
  .casting-date { margin-bottom: 4px; }
  .casting-intro h2 { font-size: 20px; }
  .casting-intro p { font-size: var(--ds-text-xs); line-height: 1.5; margin-top: 5px; }
  .casting-progress { border-radius: var(--ds-radius-sm); gap: 6px; min-width: 76px; padding: 9px 9px 8px; }
  .casting-progress strong { font-size: 21px; }
  .casting-layout { display: flex; flex-direction: column; min-height: 0; }
  .hexagram-display { padding: 15px 14px 16px; }
  .hexagram-display > header { margin-bottom: 10px; }
  .daily-hexagram-screen .hexagram-lines { gap: 6px; width: 100%; }
  .daily-hexagram-screen .hexagram-line-row { gap: 8px; grid-template-columns: 32px minmax(120px, 1fr) 42px; min-height: 21px; padding: 2px 5px; }
  .daily-hexagram-screen .yao-line.yin { gap: 16px; }
  .daily-hexagram-screen .yao-line.yin b { width: calc(50% - 8px); }
  .casting-stage { border-left: 0; border-top: 1px solid var(--ds-line); padding: 15px 16px calc(17px + env(safe-area-inset-bottom)); }
  .shake-result { min-height: 150px; padding: 5px 0 8px; }
  .shell-animation, .coin-result, .empty-result { min-height: 138px; }
  .shell-animation img, .empty-result img { height: 104px; width: 96px; }
  .coin-result img { height: 68px; width: 68px; }
  .coin-result > div { gap: 7px; }
  .daily-shake-action { max-width: none; }

  .daily-result-screen .hexagram-lines { gap: 7px; }
  .daily-result-screen .hexagram-line-row { gap: 7px; grid-template-columns: 27px minmax(96px, 1fr) 14px; }
  .daily-result-screen .hexagram-line-row > span, .daily-result-screen .hexagram-line-row > small { font-size: 10px; }
  .daily-result-screen .yao-line { height: 7px; padding-right: 21px; }
  .daily-result-screen .yao-line b { height: 6px; }
  .daily-result-screen .yao-line.moving::after { font-size: 6px; height: 14px; right: 0; top: -4px; width: 14px; }
  .daily-result-screen .yao-line.yin { gap: 15px; }
  .daily-result-screen .yao-line.yin b { width: calc(50% - 7.5px); }
  .hexagram-name-flow { gap: 9px; margin-bottom: 5px; }
  .hexagram-name-flow small { font-size: 10px; }
  .hexagram-name-flow strong { font-size: 13px; }
  .hexagram-name-flow > svg { height: 14px; width: 14px; }
  .hexagram-meta { font-size: 10px; margin-bottom: 13px; }
  .moving-lines-panel article { gap: 10px; grid-template-columns: 66px minmax(0, 1fr); padding: 12px 0; }
  .daily-ai-button { width: 100%; }
}

@media (max-width: 380px) {
  .daily-result-screen .hexagram-line-row { grid-template-columns: 24px minmax(86px, 1fr) 13px; }
}

@media (prefers-reduced-motion: reduce) {
  .hex-page-enter-active, .hex-page-leave-active { transition: none; }
  .shell-animation img { animation: none !important; }
  .shake-visual-enter-active, .shake-visual-leave-active { transition: none; }
}
</style>
