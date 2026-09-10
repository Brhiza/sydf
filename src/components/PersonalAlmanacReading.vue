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
      <header><span>{{ reading.name }} · 当日主题</span><h3>{{ reading.title }}</h3><p class="personal-almanac-focus">{{ reading.focus }}</p></header>
      <dl class="personal-almanac-facts">
        <div><dt>当日干支</dt><dd>{{ reading.dayGanzhi }}</dd></div>
        <div><dt>你的日主</dt><dd>{{ reading.dayMaster }}</dd></div>
        <div><dt>与你的关系</dt><dd>{{ reading.relation }}</dd></div>
        <div><dt>原局强弱</dt><dd>{{ reading.strength }}</dd></div>
      </dl>
      <div class="personal-almanac-section"><h4>与你的关系</h4><p>{{ reading.basis }}{{ reading.meaning }}</p></div>
      <div class="personal-almanac-section personal-almanac-impact"><h4>强弱如何影响你</h4><p>{{ reading.impact }}</p></div>
      <section v-if="reading.dayChange" class="personal-almanac-section personal-almanac-change">
        <h4>当日变化</h4>
        <p>{{ reading.dayChange }}</p>
        <p>{{ reading.branchBalance }}</p>
        <p v-if="reading.secondaryNote">{{ reading.secondaryNote }}</p>
        <details class="personal-almanac-undertones">
          <summary>查看日支藏干</summary>
          <dl class="personal-almanac-hidden-stems">
            <div v-for="(item, index) in reading.undertones" :key="item.stem">
              <dt>{{ item.stem }}{{ item.element }} · {{ index === 0 ? '本气' : '藏干' }}</dt>
              <dd>{{ item.relation }}<small>{{ item.scene }}</small></dd>
            </div>
          </dl>
        </details>
      </section>
      <div class="personal-almanac-actions">
        <section class="personal-almanac-section"><h4>可以关注</h4><ol><li>{{ reading.action }}</li><li v-if="reading.nextAction">{{ reading.nextAction }}</li></ol></section>
        <section class="personal-almanac-section"><h4>需要留意</h4><p>{{ reading.caution }}</p><p v-if="reading.conflict" class="personal-almanac-conflict">{{ reading.conflict }}</p></section>
      </div>
      <section class="personal-almanac-section personal-almanac-closing">
        <h4>今日关键词</h4><ul class="personal-almanac-keywords"><li v-for="keyword in reading.keywords" :key="keyword">{{ keyword }}</li></ul>
        <h4>收尾提醒</h4><p>{{ reading.closing }}</p>
      </section>
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
header h3 { color: var(--ink); font-size: 21px; margin: 6px 0 8px; }
.personal-almanac-focus { color: var(--muted); font-size: var(--type-body); line-height: 1.85; margin: 0 0 20px; }
.personal-almanac-facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 0 0 18px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
.personal-almanac-impact { margin-top: 16px; }
.personal-almanac-change { margin-top: 20px; }
.personal-almanac-section p + p { margin-top: 10px; }
dt { color: var(--muted); font-size: var(--type-caption); }
dd { margin: 6px 0 0; color: var(--ink); font-size: 18px; font-weight: 600; }
.personal-almanac-section h4 { margin: 0 0 6px; font-size: var(--type-caption); color: var(--accent); }
.personal-almanac-section p, .personal-almanac-section ol, .personal-almanac-conflict, .personal-almanac-undertones p { margin: 0; line-height: 1.85; color: var(--ink); font-size: var(--type-body); }
.personal-almanac-section ol { padding-left: 1.4em; }
.personal-almanac-section ol li + li { margin-top: 10px; }
.personal-almanac-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-top: 18px; }
.personal-almanac-conflict { border-top: 1px solid var(--line); padding-top: 12px; }
.personal-almanac-hidden-stems { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 14px; margin: 12px 0 0; }
.personal-almanac-hidden-stems dd { font-size: var(--type-body); }
.personal-almanac-hidden-stems dd small { display: block; color: var(--muted); font-size: var(--type-caption); font-weight: normal; line-height: 1.7; margin-top: 4px; }
.personal-almanac-closing { margin-top: 20px; border-top: 1px solid var(--line); padding-top: 16px; }
.personal-almanac-keywords { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-wrap: wrap; gap: 8px; }
.personal-almanac-keywords li { border-radius: 5px; padding: 3px 8px; background: var(--accent-soft); color: var(--accent); font-size: var(--type-caption); }
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
