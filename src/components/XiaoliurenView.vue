<script setup lang="ts">
import { computed, ref } from 'vue';
import UIPickerView from './UIPickerView.vue';
import { UiBadge, UiDateNavigator, UiNotice, UiReadingGrid, UiReadingLead, UiReadingRows, UiReadingSection, UiReadingWorkspace, UiToolPage } from './ui';
import {
  calculateLocalXiaoliuren,
  formatXiaoliurenInput,
  getXiaoliurenPresentationImage,
  parseXiaoliurenInput,
} from '../lib/xiaoliuren';

interface PickerOption {
  value: string;
  label: string;
}

interface PickerColumn {
  key: string;
  label: string;
  options: PickerOption[];
  flex?: number;
}

const SHICHEN_OPTIONS = [
  { value: '00', label: '子时', range: '23–1' },
  { value: '02', label: '丑时', range: '1–3' },
  { value: '04', label: '寅时', range: '3–5' },
  { value: '06', label: '卯时', range: '5–7' },
  { value: '08', label: '辰时', range: '7–9' },
  { value: '10', label: '巳时', range: '9–11' },
  { value: '12', label: '午时', range: '11–13' },
  { value: '14', label: '未时', range: '13–15' },
  { value: '16', label: '申时', range: '15–17' },
  { value: '18', label: '酉时', range: '17–19' },
  { value: '20', label: '戌时', range: '19–21' },
  { value: '22', label: '亥时', range: '21–23' },
] as const;

const inputValue = ref(formatXiaoliurenInput());
const reading = ref(calculateLocalXiaoliuren(inputValue.value));
const error = ref('');
const pickerOpen = ref(false);
const pickerValues = ref<string[]>([]);

function shichenValueFromHour(hour: number) {
  return SHICHEN_OPTIONS[Math.floor((hour + 1) / 2) % 12]?.value || '00';
}

function numberPickerOptions(start: number, end: number, suffix: string, padding = 0): PickerOption[] {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const number = start + index;
    const value = padding ? String(number).padStart(padding, '0') : String(number);
    return { value, label: `${number}${suffix}` };
  });
}

function normalizePickerValues(values: string[]) {
  const year = /^\d{4}$/.test(values[0] || '') ? values[0] : '2000';
  const monthNumber = Math.max(1, Math.min(12, Number(values[1]) || 1));
  const month = String(monthNumber).padStart(2, '0');
  const maxDay = new Date(Number(year), monthNumber, 0).getDate();
  const day = String(Math.max(1, Math.min(maxDay, Number(values[2]) || 1))).padStart(2, '0');
  const shichen = SHICHEN_OPTIONS.some((option) => option.value === values[3]) ? values[3] : '00';
  return [year, month, day, shichen];
}

const pickerColumns = computed<PickerColumn[]>(() => {
  const [year, month] = normalizePickerValues(pickerValues.value);
  const maxDay = new Date(Number(year), Number(month), 0).getDate();
  return [
    { key: 'year', label: '年份', options: numberPickerOptions(1900, 2100, '年'), flex: 1.2 },
    { key: 'month', label: '月份', options: numberPickerOptions(1, 12, '月', 2) },
    { key: 'day', label: '日期', options: numberPickerOptions(1, maxDay, '日', 2) },
    { key: 'time', label: '时间', options: SHICHEN_OPTIONS.map((option) => ({ value: option.value, label: option.range })), flex: 1.1 },
  ];
});

const selectedShichen = computed(() => {
  const hour = Number(inputValue.value.slice(11, 13));
  const value = shichenValueFromHour(hour);
  return SHICHEN_OPTIONS.find((option) => option.value === value) || SHICHEN_OPTIONS[0];
});

const actionRows = computed(() => reading.value.presentation.actions.map((item, index) => ({
  key: item.title,
  marker: String(index + 1),
  title: item.title,
  detail: item.detail,
  tone: 'accent' as const,
})));

const insightRows = computed(() => [
  ...reading.value.presentation.insights.map((item) => ({
    key: item.label,
    marker: item.label.slice(0, 1),
    title: item.label,
    detail: item.value,
    tone: 'neutral' as const,
  })),
]);

function calculate() {
  try {
    reading.value = calculateLocalXiaoliuren(inputValue.value);
    error.value = '';
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '起课没有完成，请检查日期和时间。';
  }
}

function shiftTime(hours: number) {
  const date = parseXiaoliurenInput(inputValue.value);
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  inputValue.value = formatXiaoliurenInput(date);
  calculate();
}

function resetNow() {
  inputValue.value = formatXiaoliurenInput();
  calculate();
}

function openPicker() {
  const [date, time] = inputValue.value.split('T');
  const [year, month, day] = date.split('-');
  pickerValues.value = normalizePickerValues([year, month, day, shichenValueFromHour(Number(time.slice(0, 2)))]);
  pickerOpen.value = true;
}

function updatePickerValues(values: string[]) {
  pickerValues.value = normalizePickerValues(values);
}

function closePicker() {
  pickerOpen.value = false;
}

function confirmPicker(values: string[]) {
  const [year, month, day, hour] = normalizePickerValues(values);
  inputValue.value = `${year}-${month}-${day}T${hour}:00`;
  pickerOpen.value = false;
  calculate();
}
</script>

<template>
  <UiToolPage class="screen xlr-screen" toolbar-label="起课日期和时间">
    <template #toolbar-primary>
      <UiDateNavigator
        :label="`${reading.dateLabel} · ${selectedShichen.range}`"
        select-label="选择小六壬起课日期和时间"
        previous-label="查看前一个时辰"
        next-label="查看后一个时辰"
        reset-label="此刻"
        @previous="shiftTime(-2)"
        @next="shiftTime(2)"
        @select="openPicker"
        @reset="resetNow"
      />
    </template>

    <UiNotice v-if="error" class="xlr-error" tone="error" compact>{{ error }}</UiNotice>

    <UiReadingWorkspace
      class="xlr-reading"
    >
      <template #hero-media>
        <figure class="xlr-hero-image">
          <img :src="getXiaoliurenPresentationImage(reading.data.primary.name)" :alt="`${reading.data.primary.name}卡片`" />
        </figure>
      </template>

      <template #hero-context>
        <div class="xlr-hero-sequence" aria-label="月宫、日宫、时宫顺数结果">
          <span>顺数三宫</span>
          <div>
            <p><small>月宫</small><strong>{{ reading.data.sequence.month.name }}</strong></p>
            <i></i>
            <p><small>日宫</small><strong>{{ reading.data.sequence.day.name }}</strong></p>
            <i></i>
            <p class="is-result"><small>时宫</small><strong>{{ reading.data.sequence.hour.name }}</strong></p>
          </div>
          <small>农历{{ reading.data.lunarMonth }}月{{ reading.data.lunarDay }}日 · {{ reading.data.hourLabel }}</small>
        </div>
      </template>

      <template #hero-summary>
        <UiReadingLead
          kicker="本次占得"
          :meta="`${reading.dateLabel} · ${reading.lunarLabel}`"
          :title="reading.data.primary.name"
          :subtitle="reading.presentation.verdict"
          :summary="reading.presentation.summary"
        >
          <template #title-addon><UiBadge tone="accent">{{ reading.presentation.tagline }}</UiBadge></template>
          <p class="xlr-ganzhi">{{ reading.ganzhiLabel }}</p>
        </UiReadingLead>
      </template>

      <UiReadingGrid ratio="equal" class="xlr-decision-grid">
        <UiReadingSection kicker="宜" title="适合安排">
          <p class="xlr-decision-copy">{{ reading.presentation.bestFor }}</p>
        </UiReadingSection>
        <UiReadingSection kicker="缓" title="暂缓决定">
          <p class="xlr-decision-copy">{{ reading.presentation.avoidFor }}</p>
        </UiReadingSection>
      </UiReadingGrid>

      <UiReadingGrid ratio="wide-left">
        <UiReadingSection class="xlr-actions-section" kicker="行动建议" title="怎么处理" heading-id="xlr-actions-title">
          <template #meta><small>按优先顺序</small></template>
          <UiReadingRows :items="actionRows" marker-style="soft" />
        </UiReadingSection>

        <UiReadingSection class="xlr-insights-section" kicker="综合判断" title="判断重点" heading-id="xlr-insights-title">
          <UiReadingRows :items="insightRows" />
        </UiReadingSection>
      </UiReadingGrid>

      <UiReadingSection class="xlr-palaces-section" kicker="传统依据" title="传统歌诀" heading-id="xlr-palaces-title">
        <blockquote class="xlr-palace-verse">
          <p>{{ reading.data.primary.verse }}</p>
        </blockquote>
      </UiReadingSection>

    </UiReadingWorkspace>

    <UIPickerView
      v-if="pickerOpen"
      title="选择起课日期和时间"
      :columns="pickerColumns"
      :model-value="pickerValues"
      @update:model-value="updatePickerValues"
      @cancel="closePicker"
      @confirm="confirmPicker"
    />
  </UiToolPage>
</template>

<style scoped>
.xlr-error { margin: 0 0 var(--ds-space-3); }

.xlr-ganzhi {
  color: var(--ds-text-tertiary);
  font-size: var(--ds-text-xs);
  line-height: 1.5;
  margin: var(--ds-space-3) 0 0;
}

.xlr-hero-sequence {
  display: grid;
  gap: var(--ds-space-3);
  text-align: center;
  width: 100%;
}

.xlr-hero-sequence > span,
.xlr-hero-sequence > small {
  color: var(--ds-text-tertiary);
  font-size: var(--ds-text-xs);
}

.xlr-hero-sequence > div {
  align-items: center;
  display: grid;
  gap: var(--ds-space-2);
  grid-template-columns: 1fr auto 1fr auto 1fr;
}

.xlr-hero-sequence p { display: grid; gap: 3px; margin: 0; }
.xlr-hero-sequence p small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.xlr-hero-sequence p strong { color: var(--ds-text-primary); font-size: var(--ds-heading-sm); }
.xlr-hero-sequence p.is-result strong { color: var(--ds-accent-strong); }
.xlr-hero-sequence i { background: var(--ds-line-strong); height: 1px; width: 16px; }

.xlr-palace-verse {
  margin: 0;
}

.xlr-palace-verse p {
  color: var(--ds-text-primary);
  font-size: var(--ds-text-md);
  line-height: var(--ds-line-relaxed);
  margin: 0;
}

.xlr-decision-copy {
  color: var(--ds-text-secondary);
  font-size: var(--ds-text-sm);
  line-height: var(--ds-line-normal);
  margin: 0;
}

/* Result-page content styles. Page structure and responsive columns are owned
 * by the shared reading components. */
.xlr-hero-image {
  margin: 0;
  width: 100%;
}

.xlr-hero-image img { display: block; height: 100%; object-fit: cover; width: 100%; }
@media (max-width: 720px) {
  .xlr-hero-sequence { gap: var(--ds-space-2); }
  .xlr-hero-sequence > div { gap: 5px; }
  .xlr-hero-sequence i { width: 10px; }
  .xlr-hero-sequence p strong { font-size: var(--ds-text-lg); }
}

</style>
