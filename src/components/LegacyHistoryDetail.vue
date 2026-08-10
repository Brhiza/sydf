<script setup lang="ts">
import type { LegacyHistoryRecord, LegacyTarotResult, LegacyDailyResult } from '../lib/historyImport';
import { UiDialogHeader, UiDialogShell } from './ui';

const props = defineProps<{ record: LegacyHistoryRecord }>();
defineEmits<{ close: [] }>();

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function tarotResult() {
  return props.record.result as LegacyTarotResult;
}

function dailyResult() {
  return props.record.result as LegacyDailyResult;
}
</script>

<template>
  <UiDialogShell labelledby="legacy-detail-title" panel-class="legacy-detail" @close="$emit('close')">
      <UiDialogHeader
        :title="record.question"
        title-id="legacy-detail-title"
        :eyebrow="`旧版记录 · ${record.methodLabel}`"
        :description="formatTime(record.createdAt)"
        close-label="关闭旧版记录"
        @close="$emit('close')"
      />

      <template v-if="record.kind === 'tarot'">
        <section class="legacy-summary"><span>牌阵</span><strong>{{ tarotResult().spreadName }}</strong></section>
        <div v-if="tarotResult().cards.length" class="legacy-tarot-cards">
          <section v-for="(card, index) in tarotResult().cards" :key="`${card.name}-${index}`">
            <small>{{ card.position }}</small><strong>{{ card.name }}</strong><span>{{ card.reversed ? '逆位' : '正位' }}</span>
          </section>
        </div>
        <p v-else class="legacy-empty">这条旧记录没有保存牌面明细。</p>
      </template>

      <template v-else>
        <section class="legacy-summary">
          <span>{{ dailyResult().date || '当日运势' }}</span>
          <strong><template v-if="dailyResult().score !== undefined">{{ dailyResult().score }} 分</template><template v-if="dailyResult().luck"> · {{ dailyResult().luck }}</template></strong>
          <p v-if="dailyResult().description">{{ dailyResult().description }}</p>
        </section>
        <div v-if="dailyResult().aspects.length" class="legacy-aspects">
          <section v-for="aspect in dailyResult().aspects" :key="aspect.label">
            <span>{{ aspect.label }}</span><strong v-if="aspect.score !== undefined">{{ aspect.score }} 分</strong>
            <p>{{ aspect.description }}</p><small v-if="aspect.advice">{{ aspect.advice }}</small>
          </section>
        </div>
        <dl class="legacy-lucky">
          <div v-if="dailyResult().lucky.numbers"><dt>幸运数字</dt><dd>{{ dailyResult().lucky.numbers }}</dd></div>
          <div v-if="dailyResult().lucky.colors"><dt>幸运颜色</dt><dd>{{ dailyResult().lucky.colors }}</dd></div>
          <div v-if="dailyResult().lucky.directions"><dt>有利方位</dt><dd>{{ dailyResult().lucky.directions }}</dd></div>
          <div v-if="dailyResult().lucky.time"><dt>有利时段</dt><dd>{{ dailyResult().lucky.time }}</dd></div>
        </dl>
      </template>

      <section v-if="record.interpretation" class="legacy-interpretation"><span>旧版 AI 解读</span><p>{{ record.interpretation }}</p></section>
  </UiDialogShell>
</template>

<style>
.legacy-detail { color: var(--ink); }
.legacy-summary { display: grid; gap: 7px; padding: 20px 2px; }
.legacy-summary > span, .legacy-interpretation > span { color: var(--accent-strong); font-size: 11px; font-weight: 650; }
.legacy-summary > strong { font-size: 19px; }
.legacy-summary p, .legacy-interpretation p { color: var(--muted); line-height: 1.75; margin: 0; white-space: pre-wrap; }
.legacy-tarot-cards, .legacy-aspects { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
.legacy-tarot-cards section, .legacy-aspects section { background: var(--surface-muted); border-radius: 10px; display: grid; gap: 6px; padding: 13px; }
.legacy-tarot-cards small, .legacy-tarot-cards span, .legacy-aspects span, .legacy-aspects small { color: var(--muted); font-size: 11px; }
.legacy-tarot-cards strong { font-size: 15px; }
.legacy-aspects strong { color: var(--accent-strong); font-size: 13px; }
.legacy-aspects p { font-size: 12px; line-height: 1.6; margin: 0; }
.legacy-lucky { border-top: 1px solid var(--line); display: grid; gap: 9px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 18px 0 0; padding-top: 16px; }
.legacy-lucky div { display: grid; gap: 3px; }
.legacy-lucky dt { color: var(--muted); font-size: 10px; }
.legacy-lucky dd { font-size: 12px; margin: 0; }
.legacy-interpretation { border-top: 1px solid var(--line); display: grid; gap: 9px; margin-top: 20px; padding-top: 18px; }
.legacy-empty { color: var(--muted); font-size: 12px; margin: 4px 0 0; }
@media (max-width: 720px) {
  .legacy-lucky { grid-template-columns: 1fr 1fr; }
}
</style>
