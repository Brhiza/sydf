<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { Check, Clock3, Coins, Hash, RotateCcw } from 'lucide-vue-next';
import { UiActionBar, UiButton, UiDialogHeader, UiDialogShell, UiNotice, UiSegmentedControl, UiSelect } from './ui';
import {
  runConfiguredJinkoujue,
  runConfiguredMeihua,
  runAutomaticCasting,
  runManualLiuyao,
  runSpecifiedLiuyao,
  runTaiyi,
  runTimeCasting,
  type CastingMode,
  type CastingPreference,
  type LiuyaoCoinThrow,
  type ReadingResult,
} from '../lib/divination';
import { dailyHexagramYaoLabel, shakeDailyHexagramCoins } from '../lib/dailyHexagram';
import { getLiuyaoRitualImageUrl } from '../lib/divinationTheme';

type CastingKind = 'meihua' | 'liuyao' | 'xiaoliuren' | 'jinkoujue' | 'qimen' | 'liuren' | 'taiyi';

const props = defineProps<{
  kind: CastingKind;
  qimenScope: 'hour' | 'day' | 'month' | 'year';
  qimenLayout: 'zhuanpan' | 'feipan';
  qimenJuMethod: 'chaibu' | 'zhirun';
  taiyiScope: 'year' | 'month' | 'day' | 'hour';
  initialMode: CastingPreference;
}>();

const emit = defineEmits<{
  close: [];
  complete: [payload: { result: ReadingResult; mode: CastingMode }];
}>();

const castingMode = ref<CastingMode>(props.initialMode);
const currentYear = new Date().getFullYear();
const formError = ref('');
const openedAt = ref(new Date());
const specifiedDateTime = ref('');
const specifiedYear = ref(currentYear);
const manualNumber = ref('');
const specifiedBranch = ref('子');
const coinThrows = ref<LiuyaoCoinThrow[]>([]);
const pendingCoinThrow = ref<LiuyaoCoinThrow | null>(null);
const isShakingYao = ref(false);
const latestYaoIndex = ref(-1);
const specifiedYaos = ref<Array<6 | 7 | 8 | 9>>([7, 7, 7, 7, 7, 7]);
let shakeTimer: number | null = null;
const isTimeOnlyKind = computed(() => props.kind === 'xiaoliuren' || props.kind === 'qimen' || props.kind === 'liuren');
const currentTimeLabel = computed(() => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(openedAt.value));
const lineNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const taiyiScopeLabel = computed(() => ({ year: '年计', month: '月计', day: '日计', hour: '时计' })[props.taiyiScope]);
const displayLineIndexes = [5, 4, 3, 2, 1, 0];
const nextLineName = computed(() => lineNames[coinThrows.value.length] || '卦象');
const latestThrow = computed(() => coinThrows.value[coinThrows.value.length - 1] || null);
const latestLineName = computed(() => lineNames[coinThrows.value.length - 1] || '');

const kindLabel = computed(() => ({
  meihua: '梅花易数', liuyao: '六爻', xiaoliuren: '小六壬', jinkoujue: '金口诀',
  qimen: '奇门遁甲', liuren: '大六壬', taiyi: '太乙神数',
})[props.kind]);
const castingModeTabs = [
  { value: 'auto', label: '自动', description: '系统代起' },
  { value: 'manual', label: '手动', description: '亲自取数' },
  { value: 'specified', label: '指定', description: '录入已知结果' },
];
const manualHint = computed(() => ({
  meihua: '输入心中自然浮现的数字取象起卦。',
  liuyao: '依初爻到上爻亲手摇三枚铜钱六次。',
  jinkoujue: '输入心中所取数字，以十二地支归一取地分。',
  xiaoliuren: '确认后，以你点击时的月、日、时起课。',
  qimen: '确认后，以你点击时的时空信息排布九宫。',
  liuren: '确认后，以你点击时的月将加时排四课三传。',
  taiyi: `确认当前时点，以太乙${taiyiScopeLabel.value}起局。`,
})[props.kind]);
const specifiedHint = computed(() => ({
  meihua: '指定一个日期时刻，以该时刻起时间卦。',
  liuyao: '录入已有的六个爻值，并指定实际起卦时刻。',
  jinkoujue: '指定地分与实际起课时刻。',
  xiaoliuren: '指定日期时刻，按月、日、时顺宫起课。',
  qimen: '指定日期时刻，按当前所选局式排盘。',
  liuren: '指定日期时刻，按月将加时排课。',
  taiyi: props.taiyiScope === 'year' ? '输入公历年份，以该年起年计七十二局。' : `指定日期时刻，以太乙${taiyiScopeLabel.value}起局。`,
})[props.kind]);

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function resetFlow() {
  if (shakeTimer !== null) {
    window.clearTimeout(shakeTimer);
    shakeTimer = null;
  }
  castingMode.value = props.initialMode;
  formError.value = '';
  openedAt.value = new Date();
  specifiedDateTime.value = toLocalDateTimeInput(new Date());
  specifiedYear.value = currentYear;
  manualNumber.value = '';
  specifiedBranch.value = '子';
  coinThrows.value = [];
  pendingCoinThrow.value = null;
  isShakingYao.value = false;
  latestYaoIndex.value = -1;
  specifiedYaos.value = [7, 7, 7, 7, 7, 7];
}

watch(() => [props.kind, props.qimenScope, props.qimenLayout, props.qimenJuMethod, props.taiyiScope, props.initialMode], resetFlow, { immediate: true });

function chooseMode(mode: CastingMode) {
  if (props.kind === 'liuyao' && castingMode.value === 'manual' && mode !== 'manual') resetLiuyao();
  castingMode.value = mode;
  formError.value = '';
}

function finish(result: ReadingResult) {
  emit('complete', { result, mode: castingMode.value });
}

async function completeAuto() {
  try {
    finish(await runAutomaticCasting(props.kind, new Date(), {
      qimenScope: props.qimenScope,
      qimenLayout: props.qimenLayout,
      qimenJuMethod: props.qimenJuMethod,
      taiyiScope: props.taiyiScope,
    }));
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '起课没有完成。';
  }
}

async function completeManualNumber() {
  const number = Number(manualNumber.value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    formError.value = '请输入一个正整数。';
    return;
  }
  if (props.kind === 'meihua') finish(await runConfiguredMeihua('number', number, new Date()));
  else finish(await runConfiguredJinkoujue('number', number, new Date()));
}

function shakeYao() {
  if (isShakingYao.value || coinThrows.value.length >= 6) return;
  isShakingYao.value = true;
  pendingCoinThrow.value = shakeDailyHexagramCoins();
  shakeTimer = window.setTimeout(() => {
    if (!pendingCoinThrow.value) return;
    coinThrows.value = [...coinThrows.value, pendingCoinThrow.value];
    latestYaoIndex.value = coinThrows.value.length - 1;
    pendingCoinThrow.value = null;
    isShakingYao.value = false;
    shakeTimer = null;
    if (coinThrows.value.length === 6) void nextTick(completeManual);
  }, 760);
}

function resetLiuyao() {
  if (shakeTimer !== null) {
    window.clearTimeout(shakeTimer);
    shakeTimer = null;
  }
  coinThrows.value = [];
  pendingCoinThrow.value = null;
  isShakingYao.value = false;
  latestYaoIndex.value = -1;
  formError.value = '';
}

onBeforeUnmount(() => {
  if (shakeTimer !== null) window.clearTimeout(shakeTimer);
});

async function completeManual() {
  formError.value = '';
  try {
    if (props.kind === 'meihua' || props.kind === 'jinkoujue') {
      await completeManualNumber();
      return;
    }
    if (props.kind === 'liuyao') {
      if (coinThrows.value.length !== 6) {
        formError.value = '请先从初爻到上爻摇满六次。';
        return;
      }
      finish(await runManualLiuyao(coinThrows.value));
      return;
    }
    if (props.kind === 'taiyi') finish(await runTaiyi(props.taiyiScope, new Date(), currentYear));
    if (isTimeOnlyKind.value) finish(await runTimeCasting(props.kind as 'xiaoliuren' | 'qimen' | 'liuren', new Date(), {
      qimenScope: props.qimenScope,
      qimenLayout: props.qimenLayout,
      qimenJuMethod: props.qimenJuMethod,
    }));
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '起课没有完成。';
  }
}

function specifiedDate() {
  const date = new Date(specifiedDateTime.value);
  if (!specifiedDateTime.value || Number.isNaN(date.getTime())) throw new Error('请选择完整的日期和时间。');
  return date;
}

async function completeSpecified() {
  formError.value = '';
  try {
    if (props.kind === 'taiyi' && props.taiyiScope === 'year') {
      const year = Number(specifiedYear.value);
      if (!Number.isSafeInteger(year) || year < 1 || year > 9999) throw new Error('请输入 1 至 9999 之间的公历年份。');
      finish(await runTaiyi('year', new Date(year, 6, 1, 12), year));
      return;
    }
    const date = specifiedDate();
    if (props.kind === 'meihua') finish(await runConfiguredMeihua('time', undefined, date));
    else if (props.kind === 'liuyao') finish(await runSpecifiedLiuyao(specifiedYaos.value, date));
    else if (props.kind === 'jinkoujue') finish(await runConfiguredJinkoujue('branch', specifiedBranch.value, date));
    else if (props.kind === 'taiyi') finish(await runTaiyi(props.taiyiScope, date));
    else finish(await runTimeCasting(props.kind as 'xiaoliuren' | 'qimen' | 'liuren', date, {
      qimenScope: props.qimenScope,
      qimenLayout: props.qimenLayout,
      qimenJuMethod: props.qimenJuMethod,
    }));
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '指定起课没有完成。';
  }
}

</script>

<template>
  <UiDialogShell :aria-label="`${kindLabel}起法设置`" :size="kind === 'liuyao' && castingMode === 'manual' ? 'standard' : 'compact'" :layer-class="{ 'manual-liuyao-layer': kind === 'liuyao' }" :panel-class="['manual-dialog', `kind-${kind}`]" @close="emit('close')">
      <UiDialogHeader :title="kindLabel" eyebrow="起法设置" description="完成起卦后，将直接进入聊天解读。" @close="emit('close')" />

      <UiSegmentedControl class="casting-tabs" :model-value="castingMode" :items="castingModeTabs" label="起法" equal @update:model-value="chooseMode($event as CastingMode)" />

      <section v-if="castingMode === 'auto'" class="simple-casting-pane">
        <Clock3 :size="22" /><strong>自动起课</strong><p>{{ kind === 'taiyi' ? `按当前时点起太乙${taiyiScopeLabel}。` : '由系统按当前时刻完成起课，不需要额外填写。' }}</p>
        <UiActionBar align="center"><UiButton @click="completeAuto"><Check :size="16" />确认自动起课</UiButton></UiActionBar>
      </section>

      <section v-else-if="castingMode === 'manual'" class="casting-pane">
        <p class="casting-guide">{{ manualHint }}</p>

        <div v-if="kind === 'meihua' || kind === 'jinkoujue'" class="number-casting">
          <label for="manual-number">心中之数</label>
          <div><Hash :size="18" /><input id="manual-number" v-model="manualNumber" type="number" min="1" step="1" inputmode="numeric" placeholder="输入一个正整数" @keydown.enter.prevent="completeManual" /></div>
          <small>{{ kind === 'meihua' ? '用于定上下卦与动爻' : '按十二地支归一取地分' }}</small>
          <UiActionBar align="center"><UiButton @click="completeManual"><Check :size="16" />确认取数</UiButton></UiActionBar>
        </div>

        <template v-else-if="kind === 'liuyao'">
          <div class="manual-liuyao-intro">
            <div><strong>{{ isShakingYao ? `正在摇${nextLineName}` : (latestThrow ? `已得${latestLineName}，继续摇${nextLineName}` : '静心起卦') }}</strong><span>六爻由下向上排列</span></div>
            <div class="manual-liuyao-progress" role="progressbar" aria-label="起卦进度" aria-valuemin="0" aria-valuemax="6" :aria-valuenow="coinThrows.length">
              <b>{{ coinThrows.length }}</b><span>/ 6 爻</span>
              <i><em v-for="step in 6" :key="step" :class="{ done: step <= coinThrows.length }"></em></i>
            </div>
          </div>
          <div class="manual-liuyao-layout">
            <section class="manual-liuyao-lines" aria-label="六爻进度">
              <header><strong>六爻进度</strong><span>自下而上成卦</span></header>
              <div class="manual-hexagram-lines">
                <div v-for="lineIndex in displayLineIndexes" :key="lineIndex" class="manual-hexagram-line" :class="{ filled: coinThrows[lineIndex], latest: latestYaoIndex === lineIndex }">
                  <span>{{ lineNames[lineIndex] }}</span>
                  <div v-if="coinThrows[lineIndex]" class="manual-yao-line" :class="{ yin: coinThrows[lineIndex].total === 6 || coinThrows[lineIndex].total === 8, moving: coinThrows[lineIndex].total === 6 || coinThrows[lineIndex].total === 9 }"><b></b><b></b></div>
                  <div v-else class="manual-yao-placeholder"><i></i></div>
                  <small>{{ coinThrows[lineIndex] ? dailyHexagramYaoLabel(coinThrows[lineIndex].total) : '待摇' }}</small>
                </div>
              </div>
            </section>
            <section class="manual-liuyao-stage" aria-live="polite">
              <header><span>{{ latestThrow ? latestLineName : '第一步' }}</span><strong>{{ isShakingYao ? `正在摇${nextLineName}` : (latestThrow ? '本次铜钱' : '准备摇初爻') }}</strong></header>
              <div class="manual-shake-result">
                <Transition name="manual-shake-visual" mode="out-in">
                  <div v-if="isShakingYao" key="shell" class="manual-shell-animation"><img :src="getLiuyaoRitualImageUrl('shell')" alt="龟壳正在摇卦" /><span>正在摇{{ nextLineName }}</span></div>
                  <div v-else-if="latestThrow" key="coins" class="manual-coin-result"><div><img v-for="(coin, index) in latestThrow.coins" :key="index" :src="getLiuyaoRitualImageUrl(coin === 3 ? 'coin-heads' : 'coin-tails')" :alt="coin === 3 ? '铜钱正面' : '铜钱背面'" /></div><p><strong>{{ dailyHexagramYaoLabel(latestThrow.total) }}</strong><span>{{ latestThrow.total }} 点 · {{ latestLineName }}</span></p></div>
                  <div v-else key="empty" class="manual-shell-empty"><img :src="getLiuyaoRitualImageUrl('shell')" alt="起卦龟壳" /><span>等待摇出初爻</span></div>
                </Transition>
              </div>
              <UiButton v-if="coinThrows.length < 6" size="large" block :loading="isShakingYao" @click="shakeYao"><Coins v-if="!isShakingYao" :size="17" />{{ isShakingYao ? '摇卦中' : `摇${nextLineName}` }}</UiButton>
              <UiButton v-if="coinThrows.length && !isShakingYao" class="manual-liuyao-reset" variant="ghost" size="small" @click="resetLiuyao"><RotateCcw :size="14" />重新摇卦</UiButton>
            </section>
          </div>
        </template>

        <div v-else class="simple-casting-pane is-inline"><Clock3 :size="22" /><strong>{{ kind === 'taiyi' && taiyiScope === 'year' ? `${currentYear} 年` : currentTimeLabel }}</strong><p>{{ kind === 'taiyi' ? `以确认按钮实际点击时点起太乙${taiyiScopeLabel}。` : '以确认按钮实际点击时刻起课。' }}</p><UiActionBar align="center"><UiButton @click="completeManual"><Check :size="16" />{{ kind === 'taiyi' && taiyiScope === 'year' ? '以本年起局' : '以此刻起课' }}</UiButton></UiActionBar></div>
      </section>

      <section v-else class="casting-pane">
        <p class="casting-guide">{{ specifiedHint }}</p>
        <div v-if="kind === 'taiyi' && taiyiScope === 'year'" class="specified-time-pane taiyi-year-pane">
          <label for="specified-year">公历年份</label><input id="specified-year" v-model.number="specifiedYear" type="number" min="1" max="9999" step="1" inputmode="numeric" />
          <small>按所选公历年份起太乙年计。</small>
        </div>
        <div v-else class="specified-time-pane">
          <label for="specified-date-time">起课时刻</label><input id="specified-date-time" v-model="specifiedDateTime" type="datetime-local" />
          <label v-if="kind === 'jinkoujue'" for="specified-branch" class="specified-branch-label">地分</label>
          <UiSelect v-if="kind === 'jinkoujue'" id="specified-branch" v-model="specifiedBranch" aria-label="选择金口诀地分"><option v-for="branch in earthlyBranches" :key="branch" :value="branch">{{ branch }}</option></UiSelect>
          <div v-if="kind === 'liuyao'" class="specified-yaos"><div v-for="(_, index) in specifiedYaos" :key="index"><span>{{ ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][index] }}</span><UiSelect v-model.number="specifiedYaos[index]"><option :value="6">6 · 老阴</option><option :value="7">7 · 少阳</option><option :value="8">8 · 少阴</option><option :value="9">9 · 老阳</option></UiSelect></div></div>
        </div>
        <UiActionBar align="center"><UiButton @click="completeSpecified"><Check :size="16" />确认指定结果</UiButton></UiActionBar>
      </section>

      <UiNotice v-if="formError" class="manual-error" tone="error" compact>{{ formError }}</UiNotice>
  </UiDialogShell>
</template>

<style>
.casting-tabs { margin-top: 0; width: 100%; }
.casting-pane { margin-top: 17px; }.casting-guide { color: var(--muted); font-size: 12px; line-height: 1.7; margin: 0 2px 13px; }
.simple-casting-pane { align-items: center; display: flex; flex-direction: column; padding: 42px 14px 16px; text-align: center; }.simple-casting-pane.is-inline { padding-top: 28px; }
.simple-casting-pane > svg { color: var(--accent); }.simple-casting-pane > strong { color: var(--ink); font-size: 17px; margin-top: 11px; }.simple-casting-pane > p { color: var(--muted); font-size: 12px; line-height: 1.7; margin: 6px 0 0; }
.manual-dialog .ui-action-bar button { min-width: 142px; }
.manual-error { margin: 12px 0 0; }
.number-casting { padding: 18px 3px 3px; }.number-casting > label, .number-casting > small { color: var(--muted); display: block; font-size: 12px; }.number-casting > div:not(.ui-action-bar) { align-items: center; background: var(--surface-muted); border: 1px solid var(--line); border-radius: 10px; display: flex; gap: 8px; margin: 8px 0 6px; padding: 0 11px; }.number-casting input { background: transparent; border: 0; color: var(--ink); font-size: 16px; min-height: 44px; outline: 0; width: 100%; }
.manual-dialog.kind-liuyao { width: min(760px, calc(100vw - 32px)); }
.manual-liuyao-intro { align-items: center; border-bottom: 1px solid var(--line); display: flex; gap: 18px; justify-content: space-between; padding: 2px 2px 14px; }
.manual-liuyao-intro > div:first-child { display: grid; gap: 3px; min-width: 0; }
.manual-liuyao-intro strong { color: var(--ink); font-size: 18px; }
.manual-liuyao-intro span { color: var(--muted); font-size: var(--type-caption); }
.manual-liuyao-progress { align-items: baseline; background: var(--surface-muted); border: 1px solid var(--line); border-radius: 10px; display: grid; flex: 0 0 auto; gap: 2px 5px; grid-template-columns: auto auto; padding: 8px 11px 7px; }
.manual-liuyao-progress b { color: var(--accent-strong); font-size: 22px; line-height: 1; }
.manual-liuyao-progress i { display: grid; gap: 3px; grid-column: 1 / -1; grid-template-columns: repeat(6, 1fr); width: 80px; }
.manual-liuyao-progress em { background: var(--line); border-radius: 99px; height: 3px; }
.manual-liuyao-progress em.done { background: var(--accent); }
.manual-liuyao-layout { display: grid; grid-template-columns: minmax(260px, .92fr) minmax(300px, 1.08fr); min-height: 310px; }
.manual-liuyao-lines { padding: 22px 24px 18px 2px; }
.manual-liuyao-lines > header, .manual-liuyao-stage > header { align-items: baseline; display: flex; justify-content: space-between; }
.manual-liuyao-lines > header strong, .manual-liuyao-stage > header strong { color: var(--ink); font-size: var(--type-small); }
.manual-liuyao-lines > header span, .manual-liuyao-stage > header span { color: var(--muted); font-size: var(--type-caption); }
.manual-hexagram-lines { display: grid; gap: 11px; margin-top: 20px; }
.manual-hexagram-line { align-items: center; border-radius: 8px; display: grid; gap: 10px; grid-template-columns: 34px minmax(120px, 1fr) 42px; min-height: 28px; padding: 4px 6px; }
.manual-hexagram-line.latest { background: color-mix(in srgb, var(--accent) 8%, transparent); }
.manual-hexagram-line > span, .manual-hexagram-line > small { color: var(--subtle); font-size: var(--type-caption); text-align: right; }
.manual-hexagram-line > small { text-align: left; }
.manual-hexagram-line.filled > span, .manual-hexagram-line.filled > small { color: var(--muted); }
.manual-yao-line { display: flex; height: 9px; justify-content: center; padding-right: 24px; position: relative; }
.manual-yao-line b { background: var(--accent-strong); border-radius: 2px; display: block; height: 8px; width: 100%; }
.manual-yao-line b + b { display: none; }
.manual-yao-line.yin { gap: 18px; }
.manual-yao-line.yin b { width: calc(50% - 9px); }
.manual-yao-line.yin b + b { display: block; }
.manual-yao-line.moving::after { align-items: center; border: 1px solid var(--plum); border-radius: 50%; color: var(--plum); content: '动'; display: flex; font-size: 7px; height: 17px; justify-content: center; position: absolute; right: 0; top: -5px; width: 17px; }
.manual-yao-placeholder { align-items: center; display: flex; height: 8px; }
.manual-yao-placeholder i { border-top: 1px dashed var(--line); width: 100%; }
.manual-liuyao-stage { background: radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--accent-soft) 72%, transparent), transparent 52%), var(--surface-muted); border-left: 1px solid var(--line); display: flex; flex-direction: column; margin: 0 -24px -24px 0; padding: 22px 24px 18px; }
.manual-shake-result { align-items: center; display: flex; flex: 1 1 auto; justify-content: center; min-height: 170px; overflow: hidden; padding: 6px 0; }
.manual-shell-animation, .manual-shell-empty, .manual-coin-result { align-items: center; display: flex; flex-direction: column; justify-content: center; width: 100%; }
.manual-shell-animation img, .manual-shell-empty img { filter: drop-shadow(0 10px 16px color-mix(in srgb, var(--accent) 18%, transparent)); height: 118px; object-fit: contain; width: 110px; }
.manual-shell-animation img { animation: manual-shell-shake .68s ease-in-out infinite; }
.manual-shell-animation span, .manual-shell-empty span { color: var(--muted); font-size: var(--type-caption); margin-top: 7px; }
.manual-coin-result > div { display: flex; gap: 10px; justify-content: center; }
.manual-coin-result img { filter: drop-shadow(0 3px 5px rgba(77, 55, 111, .12)); height: 70px; object-fit: contain; width: 70px; }
.manual-coin-result img:first-child { transform: rotate(-7deg); }.manual-coin-result img:nth-child(2) { transform: rotate(5deg); }.manual-coin-result img:nth-child(3) { transform: rotate(-2deg); }
.manual-coin-result p { align-items: baseline; display: flex; gap: 7px; margin: 13px 0 0; }.manual-coin-result p strong { color: var(--accent-strong); }.manual-coin-result p span { color: var(--muted); font-size: var(--type-caption); }
.manual-liuyao-reset { align-self: center; margin-top: 5px; }
@keyframes manual-shell-shake { 0%, 100% { transform: rotate(-3deg) translateX(-2px); } 35% { transform: rotate(4deg) translateX(3px); } 70% { transform: rotate(-2deg) translateX(1px); } }
.manual-shake-visual-enter-active, .manual-shake-visual-leave-active { transition: opacity .18s ease, transform .18s ease; }.manual-shake-visual-enter-from { opacity: 0; transform: translateY(-5px) scale(.96); }.manual-shake-visual-leave-to { opacity: 0; transform: translateY(5px) scale(.96); }
.specified-time-pane { border-top: 1px solid var(--line); padding-top: 15px; }.specified-time-pane > label { color: var(--muted); display: block; font-size: 12px; margin-bottom: 7px; }.specified-time-pane > input { background: var(--surface-muted); border: 1px solid var(--line); border-radius: 10px; color: var(--ink); font-size: 14px; min-height: 44px; padding: 9px 11px; width: 100%; }.specified-yaos { display: grid; gap: 7px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 14px; }.specified-yaos > div { align-items: center; border-bottom: 1px solid var(--line); display: flex; gap: 8px; justify-content: space-between; padding: 7px 1px; }.specified-yaos span { color: var(--muted); font-size: 12px; }.specified-yaos .ui-select { min-width: 112px; }
.specified-time-pane > .specified-branch-label { margin-top: 13px; }
.specified-time-pane > .ui-select { width: 100%; }
.taiyi-year-pane > small { color: var(--muted); display: block; font-size: 11px; line-height: 1.6; margin-top: 8px; }
@media (max-width: 720px) {
  .casting-tabs .ui-segmented-control__copy small { display: none; }.specified-yaos { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ui-dialog-layer.manual-liuyao-layer { align-items: center; padding: 10px; }
  .manual-dialog.kind-liuyao { border: 1px solid var(--line-strong); border-radius: var(--ds-radius-lg); box-shadow: var(--ds-shadow-overlay); height: auto; max-height: calc(100dvh - 20px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); width: min(560px, calc(100vw - 20px)); }
  .manual-dialog.kind-liuyao .casting-guide { display: none; }
  .manual-liuyao-intro { padding-bottom: 10px; }
  .manual-liuyao-intro strong { font-size: 16px; }
  .manual-liuyao-layout { display: flex; flex-direction: column; min-height: 0; }
  .manual-liuyao-lines { padding: 14px 2px 12px; }
  .manual-hexagram-lines { gap: 5px; margin-top: 9px; }
  .manual-hexagram-line { grid-template-columns: 32px minmax(110px, 1fr) 42px; min-height: 23px; padding-block: 2px; }
  .manual-liuyao-stage { border-left: 0; border-top: 1px solid var(--line); flex: 0 0 auto; margin: 0 -12px -16px; min-height: 0; padding: 12px 12px 14px; }
  .manual-shake-result { flex: 0 0 auto; min-height: 106px; padding: 2px 0 5px; }
  .manual-shell-animation img, .manual-shell-empty img { height: 92px; width: 88px; }
  .manual-coin-result img { height: 58px; width: 58px; }
}
</style>
