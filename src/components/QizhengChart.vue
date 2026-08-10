<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { QizhengChartData } from '../lib/divination';
import ChartCoreFacts from './ChartCoreFacts.vue';
import ChartIdentityBar from './ChartIdentityBar.vue';

const props = defineProps<{ result: QizhengChartData }>();

const selectedSignIndex = ref(props.result.mingGong);
const center = 520;
const traditionalSigns = [
  { branch: '戌', name: '白羊' },
  { branch: '酉', name: '金牛' },
  { branch: '申', name: '双子' },
  { branch: '未', name: '巨蟹' },
  { branch: '午', name: '狮子' },
  { branch: '巳', name: '双女' },
  { branch: '辰', name: '天秤' },
  { branch: '卯', name: '天蝎' },
  { branch: '寅', name: '人马' },
  { branch: '丑', name: '磨羯' },
  { branch: '子', name: '宝瓶' },
  { branch: '亥', name: '双鱼' },
] as const;

watch(() => props.result, (result) => {
  selectedSignIndex.value = result.mingGong;
});

function normalizeDegree(value: number) {
  return ((value % 360) + 360) % 360;
}

function polarPoint(degreeValue: number, radius: number) {
  const radians = (normalizeDegree(degreeValue) - 90) * Math.PI / 180;
  return {
    x: center + Math.cos(radians) * radius,
    y: center + Math.sin(radians) * radius,
  };
}

function radialLine(degreeValue: number, innerRadius: number, outerRadius: number) {
  const start = polarPoint(degreeValue, innerRadius);
  const end = polarPoint(degreeValue, outerRadius);
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
}

function sectorPath(startDegree: number, endDegree: number, innerRadius: number, outerRadius: number) {
  const outerStart = polarPoint(startDegree, outerRadius);
  const outerEnd = polarPoint(endDegree, outerRadius);
  const innerEnd = polarPoint(endDegree, innerRadius);
  const innerStart = polarPoint(startDegree, innerRadius);
  const largeArc = endDegree - startDegree > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

const palaceRows = computed(() => props.result.twelvePalaces.map((palace) => {
  const stars = props.result.stars.filter((star) => star.signIndex === palace.signIndex);
  const oppositeIndex = (palace.signIndex + 6) % 12;
  return {
    ...palace,
    stars,
    opposite: props.result.twelvePalaces.find((item) => item.signIndex === oppositeIndex),
    oppositeStars: props.result.stars.filter((star) => star.signIndex === oppositeIndex),
    shensha: props.result.shensha.filter((item) => item.value.includes(traditionalSigns[palace.signIndex]?.branch || '—')),
    isMing: palace.signIndex === props.result.mingGong,
    isShen: palace.signIndex === props.result.shenGong,
    midDegree: palace.signIndex * 30 + 15,
    labelPoint: polarPoint(palace.signIndex * 30 + 15, 205),
    path: sectorPath(palace.signIndex * 30, palace.signIndex * 30 + 30, 132, 264),
  };
}));

const selectedPalace = computed(() => palaceRows.value.find((palace) => palace.signIndex === selectedSignIndex.value) || palaceRows.value[0]);
const oppositePalace = computed(() => palaceRows.value.find((palace) => palace.signIndex === (selectedSignIndex.value + 6) % 12));
const mingPalace = computed(() => palaceRows.value.find((palace) => palace.isMing));
const shenPalace = computed(() => palaceRows.value.find((palace) => palace.isShen));
const coreFacts = computed(() => [
  {
    key: 'ming',
    symbol: '命',
    label: '命宫',
    value: `${traditionalSigns[props.result.mingGong]?.branch}宫 · ${traditionalSigns[props.result.mingGong]?.name}`,
    detail: mingPalace.value?.palace || '',
  },
  {
    key: 'shen',
    symbol: '身',
    label: '身宫',
    value: `${traditionalSigns[props.result.shenGong]?.branch}宫 · ${traditionalSigns[props.result.shenGong]?.name}`,
    detail: shenPalace.value?.palace || '',
  },
  {
    key: 'lord',
    symbol: '主',
    label: '命主',
    value: props.result.mingZhu,
    detail: props.result.birth.gender === 'male' ? '乾造' : '坤造',
  },
  {
    key: 'calendar',
    symbol: '历',
    label: props.result.calendar.lunar,
    value: props.result.calendar.ganzhi,
    detail: `${props.result.calendar.jieqi} · ${props.result.calendar.shichen}`,
  },
]);
const selectedStarNames = computed(() => new Set(selectedPalace.value?.stars.map((star) => star.name) || []));
const closeAspects = computed(() => [...props.result.aspects].sort((left, right) => left.orbRatio - right.orbRatio));
const selectedAspects = computed(() => closeAspects.value.filter((aspect) => selectedStarNames.value.has(aspect.star1) || selectedStarNames.value.has(aspect.star2)));

const degreeTicks = computed(() => Array.from({ length: 72 }, (_, index) => {
  const value = index * 5;
  return {
    value,
    major: value % 30 === 0,
    medium: value % 10 === 0,
    line: radialLine(value, value % 30 === 0 ? 466 : value % 10 === 0 ? 474 : 480, 493),
    labelPoint: polarPoint(value, 507),
  };
}));

const signNodes = computed(() => traditionalSigns.map((sign, index) => ({
  ...sign,
  index,
  point: polarPoint(index * 30 + 15, 448),
  line: radialLine(index * 30, 132, 493),
})));

const mansionNodes = computed(() => props.result.mansionBoundaries.map((mansion) => ({
  ...mansion,
  point: polarPoint(mansion.longitude + mansion.widthDegrees / 2, 383),
  line: radialLine(mansion.longitude, 346, 420),
})));

const starNodes = computed(() => {
  const sorted = [...props.result.stars].sort((left, right) => left.longitude - right.longitude);
  let previousLongitude = Number.NEGATIVE_INFINITY;
  let lane = 0;
  return sorted.map((star) => {
    const gap = star.longitude - previousLongitude;
    lane = gap < 11 ? (lane + 1) % 3 : 0;
    previousLongitude = star.longitude;
    const labelRadius = 296 + lane * 19;
    return {
      ...star,
      marker: polarPoint(star.longitude, 340),
      label: polarPoint(star.longitude, labelRadius),
      connector: radialLine(star.longitude, labelRadius + 21, 340),
    };
  });
});

const aspectLines = computed(() => {
  const starMap = new Map(props.result.stars.map((star) => [star.name, star]));
  return closeAspects.value.map((aspect) => {
    const left = starMap.get(aspect.star1);
    const right = starMap.get(aspect.star2);
    if (!left || !right) return null;
    const start = polarPoint(left.longitude, 278);
    const end = polarPoint(right.longitude, 278);
    return {
      ...aspect,
      start,
      end,
      active: selectedStarNames.value.has(aspect.star1) || selectedStarNames.value.has(aspect.star2),
    };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
});

function starTone(name: string) {
  if (name.includes('太白') || name.includes('(金)')) return 'is-metal';
  if (name.includes('岁星') || name.includes('紫炁') || name.includes('(木)')) return 'is-wood';
  if (name.includes('辰星') || name.includes('太阴') || name.includes('月孛') || name.includes('(水)')) return 'is-water';
  if (name.includes('荧惑') || name.includes('罗睺') || name.includes('太阳') || name.includes('(火)')) return 'is-fire';
  if (name.includes('镇星') || name.includes('计都') || name.includes('(土)')) return 'is-earth';
  return '';
}

function aspectTone(type: QizhengChartData['aspects'][number]['type']) {
  if (type === '对照') return 'is-opposite';
  if (type === '三方') return 'is-trine';
  if (type === '四正') return 'is-square';
  if (type === '六合') return 'is-sextile';
  return 'is-conjunct';
}

function shortStarName(name: string) {
  return name.replace(/\([^)]*\)/g, '');
}

function signLabel(index: number) {
  const sign = traditionalSigns[index];
  return sign ? `${sign.branch}宫 · ${sign.name}` : `第${index + 1}宫`;
}

function starStatus(star: QizhengChartData['stars'][number]) {
  return [star.dignity && star.dignity !== '—' ? star.dignity : '', star.retrograde ? '逆行' : ''].filter(Boolean).join(' · ');
}

function degree(value: number, digits = 2) {
  return `${value.toFixed(digits)}°`;
}

</script>

<template>
  <div class="qizheng-chart">
    <section class="qizheng-overview" aria-label="命盘基本信息">
      <ChartIdentityBar
        :name="result.birth.name"
        :subtitle="`${result.calendar.solar} · ${result.birth.locationName}`"
        :badge="`${result.birth.gender === 'male' ? '乾造' : '坤造'} · 七政四余`"
      />
      <ChartCoreFacts title="命盘核心信息" hint="命身 · 命主 · 生辰" :items="coreFacts" />
    </section>

    <section class="qizheng-wheel-section">
      <header class="qizheng-heading">
        <div><strong>七政四余星命盘</strong><span>点击内圈宫位或星曜查看对应信息</span></div>
        <small>黄道 · 二十八宿 · 十一曜 · 十二宫</small>
      </header>

      <div class="qizheng-wheel-scroll">
        <div class="qizheng-wheel-board">
          <div class="qizheng-wheel-canvas">
            <svg class="qizheng-wheel-svg" viewBox="0 0 1040 1040" role="img" aria-label="七政四余多层黄道星命圆盘">
              <circle class="wheel-surface" :cx="center" :cy="center" r="493" />
              <path
                v-for="palace in palaceRows"
                :key="`sector-${palace.signIndex}`"
                class="palace-sector"
                :class="{ selected: palace.signIndex === selectedSignIndex, 'is-ming': palace.isMing }"
                :d="palace.path"
              />

              <g class="aspect-layer" aria-hidden="true">
                <line
                  v-for="aspect in aspectLines"
                  :key="`${aspect.star1}-${aspect.star2}-${aspect.type}`"
                  class="aspect-line"
                  :class="[aspectTone(aspect.type), { active: aspect.active }]"
                  :x1="aspect.start.x"
                  :y1="aspect.start.y"
                  :x2="aspect.end.x"
                  :y2="aspect.end.y"
                />
              </g>

              <g class="wheel-rings" aria-hidden="true">
                <circle v-for="radius in [132, 264, 346, 420, 466, 493]" :key="radius" :cx="center" :cy="center" :r="radius" />
                <line v-for="sign in signNodes" :key="`sign-line-${sign.index}`" v-bind="sign.line" class="sign-line" />
                <line v-for="mansion in mansionNodes" :key="`mansion-line-${mansion.mansion}`" v-bind="mansion.line" class="mansion-line" />
                <line v-for="tick in degreeTicks" :key="`tick-${tick.value}`" v-bind="tick.line" class="degree-tick" :class="{ major: tick.major, medium: tick.medium }" />
              </g>

              <g class="degree-labels" aria-hidden="true">
                <text v-for="tick in degreeTicks.filter((item) => item.medium)" :key="`degree-${tick.value}`" :x="tick.labelPoint.x" :y="tick.labelPoint.y">{{ tick.value }}</text>
              </g>

              <g class="sign-labels" aria-hidden="true">
                <text v-for="sign in signNodes" :key="`sign-${sign.index}`" :x="sign.point.x" :y="sign.point.y - 3">
                  <tspan :x="sign.point.x">{{ sign.branch }}宫</tspan>
                  <tspan :x="sign.point.x" dy="16">{{ sign.name }}</tspan>
                </text>
              </g>

              <g class="mansion-labels" aria-hidden="true">
                <text v-for="mansion in mansionNodes" :key="`mansion-${mansion.mansion}`" :x="mansion.point.x" :y="mansion.point.y">{{ mansion.mansion }}</text>
              </g>

              <g
                v-for="palace in palaceRows"
                :key="`palace-${palace.signIndex}`"
                class="palace-node"
                :class="{ selected: palace.signIndex === selectedSignIndex }"
                :transform="`translate(${palace.labelPoint.x} ${palace.labelPoint.y})`"
                role="button"
                tabindex="0"
                :aria-label="`${palace.palace}，${signLabel(palace.signIndex)}`"
                @click="selectedSignIndex = palace.signIndex"
                @keydown.enter.prevent="selectedSignIndex = palace.signIndex"
                @keydown.space.prevent="selectedSignIndex = palace.signIndex"
              >
                <title>{{ palace.palace }} · {{ signLabel(palace.signIndex) }}</title>
                <text y="-10">
                  <tspan class="palace-name" x="0">{{ palace.palace }}</tspan>
                  <tspan v-if="palace.isMing || palace.isShen" class="palace-badge" x="0" dy="17">{{ [palace.isMing ? '命' : '', palace.isShen ? '身' : ''].filter(Boolean).join(' · ') }}</tspan>
                  <tspan v-else class="palace-stars" x="0" dy="17">{{ palace.stars.length ? palace.stars.map((star) => shortStarName(star.name)).join('、') : `借${palace.opposite?.palace || '对宫'}` }}</tspan>
                  <tspan class="palace-shensha" x="0" dy="15">{{ palace.shensha.slice(0, 2).map((item) => item.name).join(' · ') || (palace.isMing || palace.isShen ? palace.stars.map((star) => shortStarName(star.name)).join('、') : '') }}</tspan>
                </text>
              </g>

              <g
                v-for="star in starNodes"
                :key="`star-${star.name}`"
                class="star-node"
                :class="[starTone(star.name), { selected: star.signIndex === selectedSignIndex }]"
                role="button"
                tabindex="0"
                :aria-label="`${shortStarName(star.name)}，${star.xiu}宿${degree(star.xiuDegree)}`"
                @click.stop="selectedSignIndex = star.signIndex"
                @keydown.enter.prevent="selectedSignIndex = star.signIndex"
                @keydown.space.prevent="selectedSignIndex = star.signIndex"
              >
                <title>{{ star.name }} · {{ star.xiu }}宿 {{ degree(star.xiuDegree) }} · {{ starStatus(star) || star.kind }}</title>
                <line v-bind="star.connector" />
                <circle :cx="star.marker.x" :cy="star.marker.y" r="5" />
                <g :transform="`translate(${star.label.x} ${star.label.y})`">
                  <rect x="-34" y="-17" width="68" height="34" rx="7" />
                  <text y="-2">{{ shortStarName(star.name) }}</text>
                  <text class="star-degree" y="11">{{ star.xiu }} {{ degree(star.xiuDegree, 1) }}</text>
                </g>
              </g>

              <g v-if="selectedPalace" class="wheel-center" :transform="`translate(${center} ${center})`">
                <text class="center-sign" y="-83">{{ signLabel(selectedPalace.signIndex) }}</text>
                <text class="center-palace" y="-57">{{ selectedPalace.palace }}</text>
                <text v-if="selectedPalace.isMing || selectedPalace.isShen" class="center-badges" y="-37">{{ [selectedPalace.isMing ? '命宫' : '', selectedPalace.isShen ? '身宫' : ''].filter(Boolean).join(' · ') }}</text>
                <g v-if="selectedPalace.stars.length" class="center-stars">
                  <text v-for="(star, index) in selectedPalace.stars.slice(0, 3)" :key="star.name" :y="-12 + index * 21">
                    <tspan :class="starTone(star.name)">{{ shortStarName(star.name) }}</tspan>
                    <tspan dx="7">{{ star.xiu }}{{ degree(star.xiuDegree, 1) }}</tspan>
                    <tspan v-if="starStatus(star)" dx="6">{{ starStatus(star) }}</tspan>
                  </text>
                  <text v-if="selectedPalace.stars.length > 3" y="55">另有 {{ selectedPalace.stars.length - 3 }} 曜</text>
                </g>
                <g v-else class="center-stars">
                  <text y="-9">本宫无曜 · 借看{{ oppositePalace?.palace }}</text>
                  <text y="14">{{ oppositePalace?.stars.length ? oppositePalace.stars.map((star) => shortStarName(star.name)).join('、') : '对宫亦无曜' }}</text>
                </g>
                <g class="center-aspects">
                  <text v-for="(aspect, index) in selectedAspects.slice(0, 2)" :key="`${aspect.star1}-${aspect.star2}-${aspect.type}`" :y="60 + index * 17">{{ shortStarName(aspect.star1) }} {{ aspect.type }} {{ shortStarName(aspect.star2) }}</text>
                </g>
                <text class="center-owner" y="103">命主 {{ result.mingZhu }} · {{ result.birth.gender === 'male' ? '乾造' : '坤造' }} {{ result.birth.name }}</text>
              </g>
            </svg>
          </div>

          <aside v-if="selectedPalace" class="qizheng-wheel-rail">
            <section class="rail-palace">
              <header><span><small>{{ signLabel(selectedPalace.signIndex) }}</small><strong>{{ selectedPalace.palace }}</strong></span><b v-if="selectedPalace.isMing || selectedPalace.isShen">{{ [selectedPalace.isMing ? '命' : '', selectedPalace.isShen ? '身' : ''].filter(Boolean).join(' · ') }}</b></header>
              <dl><div><dt>对宫</dt><dd>{{ oppositePalace?.palace }}</dd></div><div><dt>神煞</dt><dd>{{ selectedPalace.shensha.map((item) => item.name).join('、') || '—' }}</dd></div></dl>
            </section>

            <section class="rail-stars">
              <h3>本宫星度</h3>
              <article v-for="star in selectedPalace.stars" :key="star.name">
                <header><strong :class="starTone(star.name)">{{ shortStarName(star.name) }}</strong><i>{{ star.kind }}<template v-if="starStatus(star)"> · {{ starStatus(star) }}</template></i></header>
                <p><span>{{ star.xiu }}宿 {{ degree(star.xiuDegree) }}</span><span>黄经 {{ degree(star.longitude) }}</span></p>
              </article>
              <div v-if="!selectedPalace.stars.length" class="rail-empty"><small>本宫无曜，借看{{ oppositePalace?.palace }}</small><b>{{ oppositePalace?.stars.map((star) => shortStarName(star.name)).join('、') || '对宫亦无曜' }}</b></div>
            </section>

            <section class="rail-aspects">
              <h3>本宫吊照</h3>
              <p v-for="aspect in selectedAspects.slice(0, 6)" :key="`${aspect.star1}-${aspect.star2}-${aspect.type}`"><span><b>{{ shortStarName(aspect.star1) }}</b><i>{{ aspect.type }}</i><b>{{ shortStarName(aspect.star2) }}</b></span><small>{{ aspect.closeness }} · {{ degree(aspect.actualAngle, 1) }} · 偏差 {{ degree(aspect.orb) }}</small></p>
              <small v-if="!selectedAspects.length">当前容许度内暂无吊照</small>
            </section>
          </aside>
        </div>
      </div>
    </section>

  </div>
</template>

<style>
.qizheng-chart { color: var(--ink); display: grid; gap: 18px; min-width: 0; }
.qizheng-overview { display: grid; gap: 7px; padding: 0 2px 1px; }
.qizheng-wheel-section { display: grid; gap: 11px; min-width: 0; }
.qizheng-heading { align-items: flex-end; display: flex; justify-content: space-between; }
.qizheng-heading > div { align-items: baseline; display: flex; gap: 9px; }
.qizheng-heading strong { font-size: 14px; }
.qizheng-heading span, .qizheng-heading > small { color: var(--muted); font-size: 10px; }
.qizheng-wheel-scroll { margin: 0 auto; max-width: 1100px; overflow-x: auto; overscroll-behavior-inline: contain; padding: 3px; scrollbar-width: none; width: 100%; }
.qizheng-wheel-scroll::-webkit-scrollbar { display: none; }
.qizheng-wheel-board { background: var(--surface-raised); border: 1px solid var(--line); border-radius: 12px; display: grid; gap: 12px; grid-template-columns: minmax(0, 780px) minmax(235px, 1fr); min-width: 1020px; overflow: hidden; padding: 10px; }
.qizheng-wheel-canvas { aspect-ratio: 1; min-width: 0; }
.qizheng-wheel-svg { display: block; height: auto; width: 100%; }
.qizheng-wheel-svg text { fill: var(--ink); font-family: "Noto Serif SC", "Songti SC", serif; text-anchor: middle; }
.wheel-surface { fill: var(--surface-raised); stroke: var(--line); stroke-width: 2; }
.palace-sector { fill: transparent; stroke: none; }
.palace-sector.is-ming { fill: color-mix(in srgb, var(--accent-soft) 26%, transparent); }
.palace-sector.selected { fill: color-mix(in srgb, var(--accent-soft) 72%, transparent); }
.wheel-rings circle, .wheel-rings line { fill: none; stroke: var(--line); stroke-width: 1.2; }
.wheel-rings .sign-line { stroke-width: 1.6; }
.wheel-rings .mansion-line { stroke: var(--subtle); stroke-width: .8; }
.wheel-rings .degree-tick { stroke: var(--subtle); stroke-width: .8; }
.wheel-rings .degree-tick.medium { stroke: var(--muted); stroke-width: 1.3; }
.wheel-rings .degree-tick.major { stroke: var(--accent); stroke-width: 2.2; }
.degree-labels text { fill: var(--muted); font-family: inherit; font-size: 11px; dominant-baseline: middle; }
.sign-labels text { font-size: 15px; font-weight: 650; }
.sign-labels tspan + tspan { fill: var(--muted); font-size: 12px; font-weight: 500; }
.mansion-labels text { fill: var(--muted); font-size: 13px; dominant-baseline: middle; }
.palace-node { cursor: pointer; outline: none; }
.palace-node text { dominant-baseline: middle; }
.palace-node .palace-name { font-size: 18px; font-weight: 700; }
.palace-node .palace-badge { fill: var(--accent-strong); font-size: 12px; }
.palace-node .palace-stars { fill: var(--muted); font-size: 11px; }
.palace-node .palace-shensha { fill: var(--plum); font-size: 10px; }
.palace-node.selected .palace-name { fill: var(--accent-strong); }
.palace-node:focus .palace-name { text-decoration: underline; }
.aspect-line { opacity: .16; stroke-width: 1.4; }
.aspect-line.active { opacity: .6; stroke-width: 2; }
.aspect-line.is-opposite { stroke: var(--accent-strong); }
.aspect-line.is-trine { stroke: var(--sage); }
.aspect-line.is-square { stroke: var(--plum); stroke-dasharray: 5 4; }
.aspect-line.is-sextile { stroke: var(--accent); stroke-dasharray: 2 4; }
.aspect-line.is-conjunct { stroke: var(--muted); }
.star-node { color: var(--accent-strong); cursor: pointer; outline: none; }
.star-node > line { stroke: currentColor; stroke-width: 1.2; }
.star-node > circle { fill: currentColor; stroke: var(--surface-raised); stroke-width: 2; }
.star-node rect { fill: var(--surface-raised); stroke: currentColor; stroke-width: 1.2; }
.star-node text { fill: currentColor; font-size: 15px; font-weight: 700; }
.star-node text.star-degree { fill: var(--muted); font-family: inherit; font-size: 10px; font-weight: 500; }
.star-node.selected rect { fill: var(--accent-soft); stroke-width: 2.2; }
.star-node:focus rect { stroke-width: 3; }
.wheel-center > text, .wheel-center g > text { dominant-baseline: middle; }
.wheel-center .center-sign { fill: var(--muted); font-size: 12px; }
.wheel-center .center-palace { fill: var(--accent-strong); font-size: 25px; font-weight: 700; }
.wheel-center .center-badges { fill: var(--plum); font-size: 11px; }
.wheel-center .center-stars text { font-family: inherit; font-size: 12px; }
.wheel-center .center-stars tspan:first-child { font-family: "Noto Serif SC", "Songti SC", serif; font-size: 14px; font-weight: 700; }
.wheel-center .center-aspects text { fill: var(--muted); font-family: inherit; font-size: 10px; }
.wheel-center .center-owner { fill: var(--subtle); font-family: inherit; font-size: 10px; }
.qizheng-wheel-rail { align-content: start; background: var(--surface-muted); border-radius: 9px; display: grid; gap: 8px; min-width: 0; padding: 9px; }
.qizheng-wheel-rail section { background: var(--surface-raised); border: 1px solid var(--line); border-radius: 8px; padding: 10px; }
.rail-palace > header { align-items: center; display: flex; justify-content: space-between; }
.rail-palace > header span { display: grid; gap: 2px; }
.rail-palace > header small { color: var(--muted); font-size: 8px; }
.rail-palace > header strong { font-family: "Noto Serif SC", "Songti SC", serif; font-size: 16px; }
.rail-palace > header > b { background: var(--accent-soft); border-radius: 4px; color: var(--accent-strong); font-size: 8px; padding: 3px 5px; }
.rail-palace dl { display: grid; gap: 7px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 9px 0 0; }
.rail-palace dt { color: var(--muted); font-size: 7px; margin-bottom: 2px; }
.rail-palace dd { font-size: 9px; margin: 0; }
.qizheng-wheel-rail h3 { font-size: 10px; margin: 0 0 8px; }
.rail-stars { display: grid; gap: 6px; }
.rail-stars article { border-top: 1px solid var(--line); display: grid; gap: 5px; padding-top: 7px; }
.rail-stars article > header { align-items: baseline; display: flex; gap: 6px; justify-content: space-between; }
.rail-stars article > header strong { font-family: "Noto Serif SC", "Songti SC", serif; font-size: 11px; }
.rail-stars article > header i { color: var(--muted); font-size: 7px; font-style: normal; }
.rail-stars article > p { display: flex; gap: 7px; margin: 0; }
.rail-stars article > p span { font-size: 8px; }
.rail-stars article > small, .rail-empty small { color: var(--muted); font-size: 7px; line-height: 1.45; }
.rail-empty { display: grid; gap: 5px; }
.rail-empty b { color: var(--accent-strong); font-size: 9px; }
.rail-aspects { display: grid; gap: 6px; }
.rail-aspects > p { border-top: 1px solid var(--line); display: grid; gap: 3px; margin: 0; padding-top: 6px; }
.rail-aspects > p > span { align-items: center; display: flex; gap: 5px; }
.rail-aspects > p b { font-size: 8px; }
.rail-aspects > p i { color: var(--accent-strong); font-size: 7px; font-style: normal; }
.rail-aspects > p small, .rail-aspects > small { color: var(--muted); font-size: 7px; }
.qizheng-chart .is-wood { color: var(--sage); fill: var(--sage); }
.qizheng-chart .is-fire { color: var(--accent-strong); fill: var(--accent-strong); }
.qizheng-chart .is-earth { color: var(--plum); fill: var(--plum); }
.qizheng-chart .is-metal { color: color-mix(in srgb, var(--plum) 58%, var(--ink)); fill: color-mix(in srgb, var(--plum) 58%, var(--ink)); }
.qizheng-chart .is-water { color: color-mix(in srgb, var(--accent) 58%, var(--ink)); fill: color-mix(in srgb, var(--accent) 58%, var(--ink)); }

@media (max-width: 920px) {
  .qizheng-wheel-board { grid-template-columns: 700px; min-width: 700px; }
  .qizheng-wheel-rail { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 720px) {
  .qizheng-chart { gap: 15px; }
  .qizheng-overview { gap: 6px; padding-inline: 1px; }
  .qizheng-heading > div { align-items: flex-start; display: grid; gap: 2px; }
  .qizheng-wheel-scroll { margin-inline: calc(var(--mobile-page-gutter, 12px) * -1); padding: 3px var(--mobile-page-gutter, 12px) 8px; width: auto; }
  .qizheng-wheel-board { grid-template-columns: 680px; min-width: 680px; padding: 7px; }
  .qizheng-wheel-rail { gap: 6px; padding: 7px; }
}

@media (max-width: 420px) {
  .qizheng-heading > small { display: none; }
}
</style>
