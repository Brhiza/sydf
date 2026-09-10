<script setup lang="ts">
import { computed } from 'vue';
import type { AlmanacDayCandidate, AlmanacParticipantProfile } from 'mingyu-core/types';
import { getPersonalAlmanacChart, getPersonalAlmanacReading } from '../lib/personalAlmanac';
import type { AlmanacProfile } from '../lib/almanac';

const props = defineProps<{ day: AlmanacDayCandidate; participants: AlmanacParticipantProfile[]; profiles: AlmanacProfile[] }>();
const charts = computed(() => new Map<string, { chart: ReturnType<typeof getPersonalAlmanacChart> | null; error: string }>(props.profiles.map((profile) => {
  try { return [profile.id, { chart: getPersonalAlmanacChart(profile), error: '' }] as const; }
  catch (error) { return [profile.id, { chart: null, error: error instanceof Error ? error.message : '出生信息暂时无法解析。' }] as const; }
})));
const readings = computed(() => props.participants.map((participant) => {
  const context = charts.value.get(participant.id);
  try {
    const reading = context?.chart ? getPersonalAlmanacReading(props.day, participant, context.chart) : null;
    return { participant, reading, error: reading ? '' : context?.error || '出生信息不完整，暂时无法生成个人解读。' };
  } catch (error) {
    return { participant, reading: null, error: error instanceof Error ? error.message : '个人解读暂时无法生成。' };
  }
}));
</script>

<template>
  <section v-if="readings.length" class="personal-almanac-readings" aria-label="当日个人解读">
    <template v-for="{ participant, reading, error } in readings" :key="participant.id">
    <p v-if="error" role="alert">{{ participant.name }}：{{ error }}</p>
    <article v-if="reading" class="personal-almanac-reading">
      <header><span>{{ reading.name }} · 当日主题</span><h3>{{ reading.title }}</h3></header>
      <dl class="personal-almanac-facts">
        <div><dt>当日干支</dt><dd>{{ reading.dayGanzhi }}</dd></div>
        <div><dt>你的日主</dt><dd>{{ reading.dayMaster }}</dd></div>
        <div><dt>与你的关系</dt><dd>{{ reading.relation }}</dd></div>
        <div><dt>原局强弱</dt><dd>{{ reading.strength }}</dd></div>
      </dl>
      <div class="personal-almanac-section"><h4>与你的关系</h4><p>{{ reading.basis }}{{ reading.meaning }}</p></div>
      <div class="personal-almanac-section personal-almanac-impact"><h4>对你的影响</h4><p>{{ reading.impact }}</p></div>
      <div class="personal-almanac-actions">
        <section class="personal-almanac-section"><h4>可以做</h4><p>{{ reading.action }}</p></section>
        <section class="personal-almanac-section"><h4>需要留意</h4><p>{{ reading.caution }}</p></section>
      </div>
      <p v-if="reading.conflict" class="personal-almanac-conflict">{{ reading.conflict }}</p>
      <details v-if="reading.undertones.length" class="personal-almanac-undertones">
        <summary>日支藏干 · {{ reading.undertones.map((item) => item.relation).join('、') }}</summary>
        <p>{{ reading.dayGanzhi[1] }}中藏{{ reading.undertones.map((item) => `${item.stem}（${item.relation}·${item.keyword}）`).join('、') }}，作为理解当天主题的补充。</p>
      </details>
      <details class="personal-almanac-undertones">
        <summary>强弱与取用依据</summary>
        <p>{{ reading.ruleBasis.join('；') }}</p>
        <p>格局：{{ reading.pattern }}；喜用五行：{{ reading.favorable.join('、') || '未明确' }}；忌神五行：{{ reading.unfavorable.join('、') || '未明确' }}。</p>
        <p v-if="reading.usefulReason">取用侧重：{{ reading.usefulReason }}。</p>
      </details>
    </article>
    </template>
    <p class="personal-almanac-footnote">结合原局强弱、喜忌与当日干支提供传统文化参考；身强身弱不指身体健康，日历不决定事情成败。</p>
  </section>
</template>

<style scoped>
.personal-almanac-readings { display: grid; gap: 16px; margin: 20px 0; }
.personal-almanac-reading { border: 1px solid var(--line); border-radius: 14px; padding: 20px; min-width: 0; }
header > span { color: var(--muted); font-size: var(--type-caption); overflow-wrap: anywhere; }
header h3 { color: var(--ink); font-size: 21px; margin: 6px 0 16px; }
.personal-almanac-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 0 0 18px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
.personal-almanac-impact { margin-top: 16px; }
dt { color: var(--muted); font-size: var(--type-caption); }
dd { margin: 6px 0 0; color: var(--ink); font-size: 18px; font-weight: 600; }
.personal-almanac-section h4 { margin: 0 0 6px; font-size: var(--type-caption); color: var(--accent); }
.personal-almanac-section p, .personal-almanac-conflict, .personal-almanac-undertones p { margin: 0; line-height: 1.85; color: var(--ink); font-size: var(--type-body); }
.personal-almanac-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-top: 18px; }
.personal-almanac-conflict { border-top: 1px solid var(--line); padding-top: 14px; margin-top: 16px; }
.personal-almanac-undertones { margin-top: 16px; color: var(--muted); font-size: var(--type-caption); }
.personal-almanac-undertones summary { cursor: pointer; line-height: 1.8; }
.personal-almanac-undertones p { padding-top: 8px; }
.personal-almanac-footnote { color: var(--muted); font-size: var(--type-caption); line-height: 1.7; margin: 0; }
@media (max-width: 600px) {
  .personal-almanac-reading { padding: 16px; }
  .personal-almanac-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .personal-almanac-actions { grid-template-columns: 1fr; gap: 16px; }
}
</style>
