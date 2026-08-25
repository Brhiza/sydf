<script setup lang="ts">
import { computed } from 'vue';
import type { InstantBaziChartResult, InstantChartResponse, InstantZiweiChartResult } from 'mingyu-core/instant';
import type { AstrolabeData } from 'mingyu-core/types';
import type { QizhengResult } from 'mingyu-core/qizheng';
import { formatInstantWallClock, instantChartSummary, instantTimeBasisLabel } from '../lib/instantChart';

const props = defineProps<{ response: InstantChartResponse }>();

const bazi = computed(() => {
  if (props.response.type === 'bazi') return props.response.result as InstantBaziChartResult;
  if (props.response.type === 'bazi-ziwei') return (props.response.result as { bazi: InstantBaziChartResult }).bazi;
  return null;
});
const ziwei = computed(() => {
  if (props.response.type === 'ziwei') return props.response.result as InstantZiweiChartResult;
  if (props.response.type === 'bazi-ziwei') return (props.response.result as { ziwei: InstantZiweiChartResult }).ziwei;
  return null;
});
const astrolabe = computed(() => props.response.type === 'astrolabe'
  ? props.response.result as Omit<AstrolabeData, 'birth'> & { birth: Omit<AstrolabeData['birth'], 'gender'> }
  : null);
const qizheng = computed(() => props.response.type === 'qizheng' ? props.response.result as QizhengResult : null);
const pillarItems = computed(() => bazi.value ? [
  { key: 'year' as const, label: '年柱' },
  { key: 'month' as const, label: '月柱' },
  { key: 'day' as const, label: '日柱' },
  { key: 'hour' as const, label: '时柱' },
] : []);

function ziweiStars(palace: InstantZiweiChartResult['palaces'][number]) {
  return [...palace.major_stars, ...palace.minor_stars, ...palace.other_stars];
}

function qizhengPalaceStars(signIndex: number) {
  return qizheng.value?.stars.filter((star) => star.signIndex === signIndex) || [];
}
</script>

<template>
  <div class="instant-chart-detail">
    <section class="instant-chart-context">
      <div><small>起盘时刻</small><strong>{{ formatInstantWallClock(response) }}</strong></div>
      <div><small>时间口径</small><strong>{{ response.timeStandard === 'true-solar' ? '真太阳时' : '北京时间' }}</strong></div>
      <div v-if="response.observer?.locationName"><small>观测地点</small><strong>{{ response.observer.locationName }}</strong></div>
    </section>

    <p class="instant-chart-summary">{{ instantChartSummary(response) }}</p>

    <section v-if="bazi" class="instant-chart-section">
      <header><div><small>当前四柱</small><h3>八字即时盘</h3></div><span>{{ bazi.lunarDate.monthName }}{{ bazi.lunarDate.dayName }}</span></header>
      <div class="instant-bazi-grid">
        <article v-for="item in pillarItems" :key="item.key" :class="{ 'is-day': item.key === 'day' }">
          <small>{{ item.label }}</small>
          <strong>{{ bazi.pillars[item.key].gan }}</strong>
          <strong>{{ bazi.pillars[item.key].zhi }}</strong>
          <span>{{ item.key === 'day' ? '日元' : bazi.tenGods[item.key] }}</span>
          <p>{{ bazi.hiddenStems[item.key].join(' · ') }}</p>
          <em>{{ bazi.nayin[item.key] }}</em>
        </article>
      </div>
      <div class="instant-facts">
        <span><small>日元</small><strong>{{ bazi.dayMaster.gan }} · {{ bazi.dayMaster.element }} · {{ bazi.dayMaster.yinYang }}</strong></span>
        <span><small>五行出现</small><strong>{{ bazi.wuxingStrength.present.join('、') || '—' }}</strong></span>
        <span><small>五行缺失</small><strong>{{ bazi.wuxingStrength.missing.join('、') || '无' }}</strong></span>
      </div>
    </section>

    <section v-if="ziwei" class="instant-chart-section">
      <header><div><small>十二宫与星曜</small><h3>紫微即时盘</h3></div><span>{{ ziwei.basicInfo.five_elements_class }}</span></header>
      <div class="instant-ziwei-grid">
        <article v-for="palace in ziwei.palaces" :key="palace.index" :class="{ 'is-body': palace.is_body_palace }">
          <header><strong>{{ palace.name }}</strong><small>{{ palace.heavenly_stem }}{{ palace.earthly_branch }}<b v-if="palace.is_body_palace">身</b></small></header>
          <p v-if="ziweiStars(palace).length"><span v-for="star in ziweiStars(palace)" :key="`${palace.index}-${star.name}`" :class="{ major: palace.major_stars.some((item) => item.name === star.name) }">{{ star.name }}<em v-if="star.birth_mutagen">化{{ star.birth_mutagen }}</em></span></p>
          <p v-else class="is-empty">无主星</p>
        </article>
      </div>
      <div v-if="ziwei.activeScope.mutagen_map.length" class="instant-mutagens"><span v-for="item in ziwei.activeScope.mutagen_map" :key="`${item.star}-${item.mutagen}`"><strong>{{ item.star }}</strong>化{{ item.mutagen }}<small v-if="item.palace_name"> · {{ item.palace_name }}</small></span></div>
    </section>

    <section v-if="astrolabe" class="instant-chart-section">
      <header><div><small>星体、宫位与相位</small><h3>星盘即时盘</h3></div><span>{{ astrolabe.birth.location }}</span></header>
      <div class="instant-astro-grid">
        <article v-for="point in [...astrolabe.angles, ...astrolabe.planets]" :key="point.name"><span>{{ point.label }}</span><strong>{{ point.formatted }}</strong><small v-if="'house' in point">第 {{ point.house }} 宫{{ point.retrograde ? ' · 逆行' : '' }}</small></article>
      </div>
      <div class="instant-aspects"><span v-for="aspect in astrolabe.aspects.slice(0, 16)" :key="`${aspect.body1}-${aspect.body2}-${aspect.type}`"><strong>{{ aspect.body1 }} {{ aspect.symbol }} {{ aspect.body2 }}</strong><small>{{ aspect.type }} · {{ aspect.orb.toFixed(2) }}°</small></span></div>
    </section>

    <section v-if="qizheng" class="instant-chart-section">
      <header><div><small>二十八宿与十一曜</small><h3>七政四余即时盘</h3></div><span>命宫主星 {{ qizheng.mingZhu }}</span></header>
      <div class="instant-qizheng-grid">
        <article v-for="palace in qizheng.twelvePalaces" :key="palace.signIndex" :class="{ 'is-ming': palace.signIndex === qizheng.mingGong, 'is-shen': palace.signIndex === qizheng.shenGong }">
          <header><strong>{{ palace.palace }}</strong><small>{{ palace.signBranch }}宫</small></header>
          <p>{{ qizhengPalaceStars(palace.signIndex).map((star) => star.name.replace(/\([^)]*\)/g, '')).join('、') || '—' }}</p>
          <span v-if="palace.signIndex === qizheng.mingGong">命宫</span><span v-if="palace.signIndex === qizheng.shenGong">身宫</span>
        </article>
      </div>
      <div class="instant-aspects"><span v-for="aspect in qizheng.aspects.slice(0, 16)" :key="`${aspect.star1}-${aspect.star2}-${aspect.type}`"><strong>{{ aspect.star1 }} · {{ aspect.star2 }}</strong><small>{{ aspect.type }} · {{ aspect.closeness }}</small></span></div>
    </section>

    <footer class="instant-chart-footnote">{{ instantTimeBasisLabel(response) }} · 此盘只记录当前事件时刻，不含个人性别与出生运限。</footer>
  </div>
</template>

<style scoped>
.instant-chart-detail { color: var(--text); display: grid; gap: 18px; padding: 2px 2px 20px; }
.instant-chart-context { border-bottom: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 10px 28px; padding: 2px 2px 14px; }
.instant-chart-context div { display: grid; gap: 3px; }
.instant-chart-context small, .instant-chart-section header small, .instant-facts small { color: var(--muted); font-size: 11px; }
.instant-chart-context strong { font-size: 13px; }
.instant-chart-summary { color: var(--accent-strong); font-size: 14px; font-weight: 650; margin: 0; }
.instant-chart-section { display: grid; gap: 14px; }
.instant-chart-section > header { align-items: end; display: flex; justify-content: space-between; }
.instant-chart-section > header h3 { font-size: 18px; margin: 2px 0 0; }
.instant-chart-section > header > span { color: var(--muted); font-size: 12px; }
.instant-bazi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.instant-bazi-grid article { align-items: center; border-bottom: 1px solid var(--line); border-top: 1px solid var(--line); display: grid; gap: 4px; justify-items: center; padding: 12px 6px; }
.instant-bazi-grid article + article { border-left: 1px solid var(--line); }
.instant-bazi-grid article.is-day { background: color-mix(in srgb, var(--accent-soft) 50%, transparent); }
.instant-bazi-grid article > strong { font-family: serif; font-size: 24px; line-height: 1; }
.instant-bazi-grid article span, .instant-bazi-grid article em { color: var(--muted); font-size: 10px; font-style: normal; }
.instant-bazi-grid article p { font-size: 12px; margin: 2px 0; }
.instant-facts { display: grid; grid-template-columns: repeat(3, 1fr); }
.instant-facts span { display: grid; gap: 4px; padding-right: 12px; }
.instant-facts span + span { border-left: 1px solid var(--line); padding-left: 12px; }
.instant-facts strong { font-size: 12px; }
.instant-ziwei-grid, .instant-qizheng-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.instant-ziwei-grid article, .instant-qizheng-grid article { border-bottom: 1px solid var(--line); min-height: 106px; padding: 10px; }
.instant-ziwei-grid article:not(:nth-child(4n + 1)), .instant-qizheng-grid article:not(:nth-child(4n + 1)) { border-left: 1px solid var(--line); }
.instant-ziwei-grid article.is-body, .instant-qizheng-grid article.is-ming { background: color-mix(in srgb, var(--accent-soft) 45%, transparent); }
.instant-ziwei-grid article > header, .instant-qizheng-grid article > header { display: flex; justify-content: space-between; }
.instant-ziwei-grid header b { background: var(--accent-soft); border-radius: 999px; color: var(--accent-strong); font-size: 9px; margin-left: 4px; padding: 2px 4px; }
.instant-ziwei-grid p { display: flex; flex-wrap: wrap; gap: 5px 8px; margin: 12px 0 0; }
.instant-ziwei-grid p span { color: var(--muted); font-size: 11px; }
.instant-ziwei-grid p span.major { color: var(--text); font-weight: 650; }
.instant-ziwei-grid p em { color: var(--accent-strong); font-size: 9px; font-style: normal; margin-left: 2px; }
.instant-mutagens, .instant-aspects { display: flex; flex-wrap: wrap; gap: 7px; }
.instant-mutagens > span, .instant-aspects > span { background: var(--surface-muted); border-radius: 9px; display: grid; font-size: 11px; gap: 2px; padding: 7px 9px; }
.instant-mutagens small, .instant-aspects small { color: var(--muted); }
.instant-astro-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.instant-astro-grid article { border-bottom: 1px solid var(--line); display: grid; gap: 3px; padding: 9px 8px; }
.instant-astro-grid article:not(:nth-child(4n + 1)) { border-left: 1px solid var(--line); }
.instant-astro-grid span, .instant-astro-grid small { color: var(--muted); font-size: 10px; }
.instant-astro-grid strong { font-size: 12px; }
.instant-qizheng-grid article p { color: var(--muted); font-size: 11px; margin: 12px 0 6px; }
.instant-qizheng-grid article > span { color: var(--accent-strong); font-size: 10px; margin-right: 5px; }
.instant-chart-footnote { border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; padding-top: 14px; }
@media (max-width: 640px) {
  .instant-chart-detail { gap: 15px; }
  .instant-chart-context { display: grid; grid-template-columns: 1fr 1fr; }
  .instant-chart-context div:first-child { grid-column: 1 / -1; }
  .instant-bazi-grid article { padding-inline: 3px; }
  .instant-bazi-grid article > strong { font-size: 21px; }
  .instant-bazi-grid article p { font-size: 10px; }
  .instant-facts { grid-template-columns: 1fr; }
  .instant-facts span { padding: 8px 0; }
  .instant-facts span + span { border-left: 0; border-top: 1px solid var(--line); padding-left: 0; }
  .instant-ziwei-grid, .instant-qizheng-grid, .instant-astro-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .instant-ziwei-grid article:not(:nth-child(4n + 1)), .instant-qizheng-grid article:not(:nth-child(4n + 1)), .instant-astro-grid article:not(:nth-child(4n + 1)) { border-left: 0; }
  .instant-ziwei-grid article:nth-child(even), .instant-qizheng-grid article:nth-child(even), .instant-astro-grid article:nth-child(even) { border-left: 1px solid var(--line); }
}
</style>
