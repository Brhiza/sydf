<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Check, Clock3, Hand, Hash, RotateCcw } from 'lucide-vue-next';
import { UiActionBar, UiButton, UiDialogHeader, UiDialogShell, UiNotice, UiSegmentedControl } from './ui';
import {
  runConfiguredJinkoujue,
  runConfiguredMeihua,
  runAutomaticCasting,
  runManualLiuyao,
  runSpecifiedLiuyao,
  runTaiyiYear,
  runTimeCasting,
  type CastingMode,
  type CastingPreference,
  type LiuyaoCoinThrow,
  type ReadingResult,
} from '../lib/divination';

type CastingKind = 'meihua' | 'liuyao' | 'xiaoliuren' | 'jinkoujue' | 'qimen' | 'liuren' | 'taiyi';

const props = defineProps<{
  kind: CastingKind;
  qimenScope: 'hour' | 'day' | 'month' | 'year';
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
const coinThrows = ref<LiuyaoCoinThrow[]>([]);
const specifiedYaos = ref<Array<6 | 7 | 8 | 9>>([7, 7, 7, 7, 7, 7]);
const isTimeOnlyKind = computed(() => props.kind === 'xiaoliuren' || props.kind === 'qimen' || props.kind === 'liuren');
const currentTimeLabel = computed(() => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(openedAt.value));

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
  taiyi: '确认当前公历年份，以年计七十二局起局。',
})[props.kind]);
const specifiedHint = computed(() => ({
  meihua: '指定一个日期时刻，以该时刻起时间卦。',
  liuyao: '录入已有的六个爻值，并指定实际起卦时刻。',
  jinkoujue: '指定一个日期时刻，以该时刻起课。',
  xiaoliuren: '指定日期时刻，按月、日、时顺宫起课。',
  qimen: '指定日期时刻，按当前所选局式排盘。',
  liuren: '指定日期时刻，按月将加时排课。',
  taiyi: '输入公历年份，以该年起年计七十二局。',
})[props.kind]);

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function resetFlow() {
  castingMode.value = props.initialMode;
  formError.value = '';
  openedAt.value = new Date();
  specifiedDateTime.value = toLocalDateTimeInput(new Date());
  specifiedYear.value = currentYear;
  manualNumber.value = '';
  coinThrows.value = [];
  specifiedYaos.value = [7, 7, 7, 7, 7, 7];
}

watch(() => [props.kind, props.qimenScope, props.initialMode], resetFlow, { immediate: true });

function chooseMode(mode: CastingMode) {
  castingMode.value = mode;
  formError.value = '';
}

function finish(result: ReadingResult) {
  emit('complete', { result, mode: castingMode.value });
}

function completeAuto() {
  try {
    finish(runAutomaticCasting(props.kind, new Date(), { qimenScope: props.qimenScope }));
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '起课没有完成。';
  }
}

function completeManualNumber() {
  const number = Number(manualNumber.value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    formError.value = '请输入一个正整数。';
    return;
  }
  if (props.kind === 'meihua') finish(runConfiguredMeihua('number', number, new Date()));
  else finish(runConfiguredJinkoujue('number', number, new Date()));
}

function shakeYao() {
  if (coinThrows.value.length >= 6) return;
  const coins = Array.from({ length: 3 }, () => Math.random() < 0.5 ? 2 as const : 3 as const) as [2 | 3, 2 | 3, 2 | 3];
  const total = coins.reduce<number>((sum, coin) => sum + coin, 0) as 6 | 7 | 8 | 9;
  coinThrows.value = [...coinThrows.value, { coins, total }];
}

function completeManual() {
  formError.value = '';
  try {
    if (props.kind === 'meihua' || props.kind === 'jinkoujue') {
      completeManualNumber();
      return;
    }
    if (props.kind === 'liuyao') {
      if (coinThrows.value.length !== 6) {
        formError.value = '请先从初爻到上爻摇满六次。';
        return;
      }
      finish(runManualLiuyao(coinThrows.value));
      return;
    }
    if (props.kind === 'taiyi') finish(runTaiyiYear(currentYear));
    if (isTimeOnlyKind.value) finish(runTimeCasting(props.kind as 'xiaoliuren' | 'qimen' | 'liuren', new Date(), { qimenScope: props.qimenScope }));
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '起课没有完成。';
  }
}

function specifiedDate() {
  const date = new Date(specifiedDateTime.value);
  if (!specifiedDateTime.value || Number.isNaN(date.getTime())) throw new Error('请选择完整的日期和时间。');
  return date;
}

function completeSpecified() {
  formError.value = '';
  try {
    if (props.kind === 'taiyi') {
      const year = Number(specifiedYear.value);
      if (!Number.isSafeInteger(year) || year < 1 || year > 9999) throw new Error('请输入 1 至 9999 之间的公历年份。');
      finish(runTaiyiYear(year));
      return;
    }
    const date = specifiedDate();
    if (props.kind === 'meihua') finish(runConfiguredMeihua('time', undefined, date));
    else if (props.kind === 'liuyao') finish(runSpecifiedLiuyao(specifiedYaos.value, date));
    else if (props.kind === 'jinkoujue') finish(runConfiguredJinkoujue('time', undefined, date));
    else finish(runTimeCasting(props.kind as 'xiaoliuren' | 'qimen' | 'liuren', date, { qimenScope: props.qimenScope }));
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '指定起课没有完成。';
  }
}

function yaoName(total: number) {
  return ({ 6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳' } as Record<number, string>)[total];
}
</script>

<template>
  <UiDialogShell :aria-label="`${kindLabel}起法设置`" size="compact" :panel-class="['manual-dialog', `kind-${kind}`]" @close="emit('close')">
      <UiDialogHeader :title="kindLabel" eyebrow="起法设置" description="完成起卦后，将直接进入聊天解读。" @close="emit('close')" />

      <UiSegmentedControl class="casting-tabs" :model-value="castingMode" :items="castingModeTabs" label="起法" equal @update:model-value="chooseMode($event as CastingMode)" />

      <section v-if="castingMode === 'auto'" class="simple-casting-pane">
        <Clock3 :size="22" /><strong>自动起课</strong><p>{{ kind === 'taiyi' ? `按当前公历 ${currentYear} 年起年计七十二局。` : '由系统按当前时刻完成起课，不需要额外填写。' }}</p>
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
          <div class="yao-stack" aria-live="polite">
            <div v-for="position in [6, 5, 4, 3, 2, 1]" :key="position" class="yao-slot" :class="{ filled: coinThrows[position - 1] }">
              <span>{{ ['初', '二', '三', '四', '五', '上'][position - 1] }}爻</span>
              <template v-if="coinThrows[position - 1]">
                <div class="coin-row"><img v-for="(coin, index) in coinThrows[position - 1].coins" :key="index" :src="coin === 3 ? '/coin-heads.png' : '/coin-tails.png'" :alt="coin === 3 ? '铜钱正面' : '铜钱背面'" /></div>
                <div class="mini-yao" :class="{ broken: coinThrows[position - 1].total === 6 || coinThrows[position - 1].total === 8, moving: coinThrows[position - 1].total === 6 || coinThrows[position - 1].total === 9 }"><b></b><b></b></div>
                <strong>{{ coinThrows[position - 1].total }} · {{ yaoName(coinThrows[position - 1].total) }}</strong>
              </template>
              <small v-else>待摇</small>
            </div>
          </div>
          <UiActionBar align="center">
            <UiButton v-if="coinThrows.length < 6" @click="shakeYao"><Hand :size="16" />摇第 {{ coinThrows.length + 1 }} 爻</UiButton>
            <UiButton v-else @click="completeManual"><Check :size="16" />确认卦象</UiButton>
            <UiButton v-if="coinThrows.length" variant="secondary" @click="coinThrows = []"><RotateCcw :size="14" />重新摇卦</UiButton>
          </UiActionBar>
        </template>

        <div v-else class="simple-casting-pane is-inline"><Clock3 :size="22" /><strong>{{ kind === 'taiyi' ? `${currentYear} 年` : currentTimeLabel }}</strong><p>{{ kind === 'taiyi' ? '太乙当前开放年计，以公历年份起局。' : '以确认按钮实际点击时刻起课。' }}</p><UiActionBar align="center"><UiButton @click="completeManual"><Check :size="16" />{{ kind === 'taiyi' ? '以本年起局' : '以此刻起课' }}</UiButton></UiActionBar></div>
      </section>

      <section v-else class="casting-pane">
        <p class="casting-guide">{{ specifiedHint }}</p>
        <div v-if="kind === 'taiyi'" class="specified-time-pane taiyi-year-pane">
          <label for="specified-year">公历年份</label><input id="specified-year" v-model.number="specifiedYear" type="number" min="1" max="9999" step="1" inputmode="numeric" />
          <small>当前仅开放已经完成校勘的年计七十二局。</small>
        </div>
        <div v-else class="specified-time-pane">
          <label for="specified-date-time">起课时刻</label><input id="specified-date-time" v-model="specifiedDateTime" type="datetime-local" />
          <div v-if="kind === 'liuyao'" class="specified-yaos"><div v-for="(_, index) in specifiedYaos" :key="index"><span>{{ ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][index] }}</span><select v-model.number="specifiedYaos[index]"><option :value="6">6 · 老阴</option><option :value="7">7 · 少阳</option><option :value="8">8 · 少阴</option><option :value="9">9 · 老阳</option></select></div></div>
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
.yao-stack { display: grid; gap: 5px; }.yao-slot { align-items: center; border-bottom: 1px solid var(--line); color: var(--subtle); display: grid; gap: 10px; grid-template-columns: 38px minmax(132px, 1fr) 116px 86px; min-height: 56px; padding: 5px 3px; }.yao-slot > span, .yao-slot > small { font-size: 12px; }.yao-slot > small { grid-column: 2 / -1; }.yao-slot > strong { color: var(--ink); font-size: 12px; text-align: right; }.coin-row { display: flex; gap: 5px; }.coin-row img { filter: drop-shadow(0 3px 4px rgba(56, 39, 18, .18)); height: 36px; object-fit: contain; width: 36px; }.mini-yao { align-items: center; display: flex; justify-content: center; position: relative; }.mini-yao b { background: var(--ink); height: 5px; width: 82px; }.mini-yao b + b { display: none; }.mini-yao.broken { gap: 14px; }.mini-yao.broken b { width: 34px; }.mini-yao.broken b + b { display: block; }.mini-yao.moving::after { border: 1px solid var(--plum); border-radius: 50%; color: var(--plum); content: '动'; font-size: 10px; padding: 2px; position: absolute; right: 0; transform: translateX(50%); }
.specified-time-pane { border-top: 1px solid var(--line); padding-top: 15px; }.specified-time-pane > label { color: var(--muted); display: block; font-size: 12px; margin-bottom: 7px; }.specified-time-pane > input { background: var(--surface-muted); border: 1px solid var(--line); border-radius: 10px; color: var(--ink); font-size: 14px; min-height: 44px; padding: 9px 11px; width: 100%; }.specified-yaos { display: grid; gap: 7px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 14px; }.specified-yaos > div { align-items: center; border-bottom: 1px solid var(--line); display: flex; gap: 8px; justify-content: space-between; padding: 7px 1px; }.specified-yaos span { color: var(--muted); font-size: 12px; }.specified-yaos select { background: var(--surface-muted); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); min-height: 36px; padding: 5px 8px; }
.taiyi-year-pane > small { color: var(--muted); display: block; font-size: 11px; line-height: 1.6; margin-top: 8px; }
@media (max-width: 720px) {
  .casting-tabs .ui-segmented-control__copy small { display: none; }.yao-slot { gap: 6px; grid-template-columns: 31px minmax(108px, 1fr) 82px; min-height: 52px; }.yao-slot > strong { display: none; }.coin-row { gap: 2px; }.coin-row img { height: 30px; width: 30px; }.mini-yao b { width: 62px; }.mini-yao.broken { gap: 10px; }.mini-yao.broken b { width: 26px; }.specified-yaos { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
