<script setup lang="ts">
import { computed } from 'vue';
import type {
  JinkoujueData,
  LiurenData,
  LiuyaoData,
  MeihuaData,
  QimenData,
  SsgwData,
  TaiyiResult,
  XiaoliurenData,
} from 'mingyu-core/types';
import type { WuyunLiuqiResult } from 'mingyu-core/wuyun-liuqi';
import type { HuangjiJingshiResult } from 'mingyu-core/huangji-jingshi';
import type { DivinationKind, ReadingResult } from '../lib/divination';
import { resolveSsgwFortuneStatus } from '../lib/fortuneStatus';
import FortuneStatusImage from './FortuneStatusImage.vue';

const props = defineProps<{
  method: DivinationKind;
  result: ReadingResult;
}>();

const meihua = computed(() => props.result as MeihuaData);
const liuyao = computed(() => props.result as LiuyaoData);
const ssgw = computed(() => props.result as SsgwData);
const xiaoliuren = computed(() => props.result as XiaoliurenData);
const jinkoujue = computed(() => props.result as JinkoujueData);
const qimen = computed(() => props.result as QimenData);
const liuren = computed(() => props.result as LiurenData);
const taiyi = computed(() => props.result as TaiyiResult);
const wuyunLiuqi = computed(() => props.result as WuyunLiuqiResult);
const huangji = computed(() => props.result as HuangjiJingshiResult);
const huangjiForecast = computed(() => huangji.value.forecast);
const meihuaYaoRows = computed(() => [...meihua.value.yaosDetail].reverse());
const meihuaHexagrams = computed(() => [
  { label: '主卦', value: meihua.value.mainHexagram },
  { label: '互卦', value: meihua.value.interHexagram },
  { label: '变卦', value: meihua.value.changedHexagram },
].filter((item) => item.value));
const meihuaMethodLabel = computed(() => (meihua.value.calculation as { method?: string } | undefined)?.method || '梅花易数');
const yaoRows = computed(() => [...liuyao.value.yaosDetail].reverse());
const signPoemLines = computed(() => ssgw.value.poem.split(/[，。；！？\n]+/).map((line) => line.trim()).filter(Boolean));
const signFortuneStatus = computed(() => resolveSsgwFortuneStatus(ssgw.value.details));
const signDetails = computed(() => {
  const seenValues = new Set<string>();
  return Object.entries(ssgw.value.details || {}).filter(([key, value]) => {
    if (key === '典故' || key.replace(/\s+/g, '') === '吉凶' || !value) return false;
    const normalizedValue = String(value).trim().replace(/\s+/g, ' ');
    if (seenValues.has(normalizedValue)) return false;
    seenValues.add(normalizedValue);
    return true;
  });
});
const qimenPalaces = computed(() => [4, 9, 2, 3, 5, 7, 8, 1, 6]
  .map((gong) => qimen.value.jiuGongGe.find((palace) => palace.gong === gong))
  .filter((palace): palace is QimenData['jiuGongGe'][number] => Boolean(palace)));
const jinkouPositions = computed(() => [
  jinkoujue.value.positions.renYuan,
  jinkoujue.value.positions.guiShen,
  jinkoujue.value.positions.jiangShen,
  jinkoujue.value.positions.diFen,
]);
const liurenPlateSlots = [0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4];
const xiaoliurenSlots = [1, 2, 5, 8, 7, 4];
const taiyiPalaceLayout = [
  { palace: 9, gua: '巽', dir: '东南' },
  { palace: 2, gua: '离', dir: '南' },
  { palace: 7, gua: '坤', dir: '西南' },
  { palace: 4, gua: '震', dir: '东' },
  { palace: 5, gua: '中', dir: '中宫' },
  { palace: 6, gua: '兑', dir: '西' },
  { palace: 3, gua: '艮', dir: '东北' },
  { palace: 8, gua: '坎', dir: '北' },
  { palace: 1, gua: '乾', dir: '西北' },
];
const taiyiPointPalaces: Record<string, number> = {
  戌: 1, 乾: 1, 巳: 2, 午: 2, 丑: 3, 艮: 3, 寅: 4, 卯: 4,
  申: 6, 酉: 6, 未: 7, 坤: 7, 亥: 8, 子: 8, 辰: 9, 巽: 9,
};
const taiyiPalaces = computed(() => {
  const reading = taiyi.value;
  const markers = [
    { label: '太乙', palace: reading.taiyiPalace, tone: 'primary' },
    { label: '文昌', palace: reading.wenChangPalace, tone: 'lord' },
    { label: '始击', palace: reading.shiJiPalace, tone: 'guest' },
    { label: '计神', palace: reading.jiShenPalace, tone: 'set' },
    { label: '主大将', palace: reading.lordGeneral, tone: 'lord' },
    { label: '主参将', palace: reading.lordAssistant, tone: 'lord' },
    { label: '客大将', palace: reading.guestGeneral, tone: 'guest' },
    { label: '客参将', palace: reading.guestAssistant, tone: 'guest' },
    { label: '定大将', palace: reading.setGeneral, tone: 'set' },
    { label: '定参将', palace: reading.setAssistant, tone: 'set' },
  ];
  return taiyiPalaceLayout.map((item) => ({
    ...item,
    markers: markers.filter((marker) => marker.palace === item.palace),
    gods: reading.sixteenGods.filter((god) => taiyiPointPalaces[god.branch] === item.palace),
  }));
});

function yaoPositionName(position: number) {
  return ['初', '二', '三', '四', '五', '上'][position - 1] || String(position);
}

function gridSlotStyle(slot: number, columns: number) {
  return { gridColumn: String((slot % columns) + 1), gridRow: String(Math.floor(slot / columns) + 1) };
}

function formatCivilYear(year: number) {
  return year < 0 ? `公元前${Math.abs(year)}年` : `${year}年`;
}

function formatPeriodRange(period: { startYear: number; endYear: number }) {
  return `${formatCivilYear(period.startYear)}—${formatCivilYear(period.endYear)}`;
}

</script>

<template>
  <div v-if="method === 'meihua'" class="traditional-reading meihua-board">
    <header><span>{{ meihuaMethodLabel }}</span><h3>{{ meihua.originalName }}　之　{{ meihua.changedName }}</h3><small>{{ meihua.ganzhi.year }}年 {{ meihua.ganzhi.month }}月 {{ meihua.ganzhi.day }}日 {{ meihua.ganzhi.hour }}时</small></header>
    <div class="meihua-triad">
      <section v-for="item in meihuaHexagrams" :key="item.label">
        <span>{{ item.label }}</span><b>{{ item.value?.symbol }}</b><h4>{{ item.value?.name }}</h4><small>上{{ item.value?.upper }} · 下{{ item.value?.lower }}</small>
      </section>
    </div>
    <div class="meihua-yaos">
      <div v-for="yao in meihuaYaoRows" :key="yao.position" :class="{ changing: yao.isChanging }">
        <span>{{ yaoPositionName(yao.position) }}爻</span>
        <i class="full-yao" :class="{ broken: yao.yaoType === '阴' }"><i></i><i></i></i>
        <strong>{{ yao.tiYong }}<template v-if="yao.isChanging"> · 动</template></strong>
      </div>
    </div>
    <footer><span>体卦 {{ meihua.tiGua.name }}{{ meihua.tiGua.element }}</span><span>用卦 {{ meihua.yongGua.name }}{{ meihua.yongGua.element }}</span><span>{{ meihua.analysis.tiYongRelation }}</span><span>{{ meihua.movingYao.description }}</span></footer>
  </div>

  <div v-else-if="method === 'liuyao'" class="traditional-reading liuyao-board">
    <header><span>{{ liuyao.ganzhi.year }}年 {{ liuyao.ganzhi.month }}月 {{ liuyao.ganzhi.day }}日 {{ liuyao.ganzhi.hour }}时</span><h3>{{ liuyao.originalName }}<template v-if="liuyao.changedName">　之　{{ liuyao.changedName }}</template></h3><small>{{ liuyao.palace.name }}宫 · {{ liuyao.palace.wuxing }} · {{ liuyao.palaceStage || '本宫' }}</small></header>
    <div class="liuyao-head"><span>六神</span><span>六亲纳甲</span><span>本卦</span><span>世应</span><span>变爻</span></div>
    <div class="liuyao-lines">
      <div v-for="yao in yaoRows" :key="yao.position" class="liuyao-row" :class="{ changing: yao.isChanging }">
        <span>{{ yao.sixGod }}</span>
        <span><strong>{{ yao.sixRelative }}</strong><small>{{ yao.najiaDizhi }}{{ yao.wuxing }}<template v-if="yao.isVoid"> · 空</template></small></span>
        <span class="full-yao" :class="{ broken: yao.yaoType === '阴' }"><i></i><i></i><b v-if="yao.isChanging">{{ yao.rawValue === 6 ? '×' : '○' }}</b></span>
        <span>{{ yao.isWorld ? '世' : yao.isResponse ? '应' : '' }}</span>
        <span class="changed-yao"><template v-if="yao.changedYao"><strong>{{ yao.changedYao.liuqin }}</strong><small>{{ yao.changedYao.dizhi }}{{ yao.changedYao.wuxing }}</small></template><template v-else>—</template></span>
      </div>
    </div>
    <footer><span>旬空 {{ liuyao.voidBranches.join('、') || '—' }}</span><span>{{ liuyao.specialPattern || (liuyao.changingYaos.length ? `${liuyao.changingYaos.length}爻动` : '静卦') }}</span><span v-if="liuyao.hexagramRelations?.transition">{{ liuyao.hexagramRelations.transition }}</span></footer>
  </div>

  <div v-else-if="method === 'xiaoliuren'" class="traditional-reading xiaoliuren-board">
    <header><span>{{ xiaoliuren.methodLabel }}</span><h3>小六壬六宫课</h3><small>{{ xiaoliuren.ganzhi.year }}年 {{ xiaoliuren.ganzhi.month }}月 {{ xiaoliuren.ganzhi.day }}日 {{ xiaoliuren.ganzhi.hour }}时</small></header>
    <div class="xiaoliuren-plate">
      <section v-for="(palace, index) in xiaoliuren.palaceOrder" :key="palace.name" :class="{ primary: palace.name === xiaoliuren.primary.name }" :style="gridSlotStyle(xiaoliurenSlots[index] ?? index, 3)">
        <span>{{ palace.index + 1 }}</span><strong>{{ palace.name }}</strong><small>{{ palace.verse }}</small>
      </section>
      <div class="xiaoliuren-center"><span>月 · 日 · 时</span><strong>{{ xiaoliuren.sequence.month.name }} → {{ xiaoliuren.sequence.day.name }} → {{ xiaoliuren.sequence.hour.name }}</strong><small>{{ xiaoliuren.hourLabel }}</small></div>
    </div>
    <footer><span>月宫 {{ xiaoliuren.sequence.month.name }}</span><span>日宫 {{ xiaoliuren.sequence.day.name }}</span><span>时宫 {{ xiaoliuren.sequence.hour.name }}</span><strong>主象 {{ xiaoliuren.primary.name }}</strong></footer>
  </div>

  <div v-else-if="method === 'jinkoujue'" class="traditional-reading jinkou-board">
    <header><span>{{ jinkoujue.methodLabel }} · {{ jinkoujue.dayNight }}</span><h3>大六壬金口诀</h3><small>{{ jinkoujue.ganzhi.year }}年 {{ jinkoujue.ganzhi.month }}月 {{ jinkoujue.ganzhi.day }}日 {{ jinkoujue.ganzhi.hour }}时</small></header>
    <div class="jinkou-meta"><span>月将 <b>{{ jinkoujue.monthLeader }}</b></span><span>占时 <b>{{ jinkoujue.divinationBranch }}</b></span><span>旬空 <b>{{ jinkoujue.xunKong.join('、') || '—' }}</b></span><span>用爻 <b>{{ jinkoujue.yinYangUse.usePosition }}</b></span></div>
    <div class="jinkou-four">
      <section v-for="position in jinkouPositions" :key="position.name" :class="{ used: position.name === jinkoujue.yinYangUse.usePosition, void: position.isVoid }">
        <span>{{ position.name }}</span><strong>{{ position.stem || '' }}{{ position.branch }}<em v-if="position.god">{{ position.god }}</em></strong><small>{{ position.role }} · {{ position.element }} · {{ position.yinYang }} · {{ position.seasonState }}<template v-if="position.isVoid"> · 空</template></small>
      </section>
    </div>
    <div class="jinkou-relations"><span>{{ jinkoujue.yinYangUse.pattern }}</span><span v-for="movement in jinkoujue.movements" :key="`${movement.category}-${movement.name}`">{{ movement.category }} · {{ movement.name }}</span></div>
  </div>

  <div v-else-if="method === 'qimen'" class="traditional-reading qimen-board">
    <header><span>{{ qimen.scope === 'day' ? '日家' : qimen.scope === 'month' ? '月家' : qimen.scope === 'year' ? '年家' : '时家' }} · {{ qimen.method === 'feipan' ? '飞盘' : '转盘' }}</span><h3>{{ qimen.isYangDun ? '阳遁' : '阴遁' }} {{ qimen.juShu }} 局</h3><small>{{ qimen.ganzhi.year }}年 {{ qimen.ganzhi.month }}月 {{ qimen.ganzhi.day }}日 {{ qimen.ganzhi.hour }}时 · {{ qimen.timeInfo.solarTerm }}</small></header>
    <div class="qimen-value-strip"><span>值符 <strong>{{ qimen.zhiFu }}</strong></span><span>值使 <strong>{{ qimen.zhiShi }}</strong></span><span>定局 <strong>{{ qimen.juMethod === 'zhirun' ? '置闰' : '拆补' }}</strong></span><span>旬空 <strong>{{ qimen.voidBranches?.join('、') || '—' }}</strong></span></div>
    <div class="qimen-nine-grid">
      <section v-for="palace in qimenPalaces" :key="palace.gong" :class="{ center: palace.gong === 5 }">
        <div class="qimen-palace-head"><span>{{ palace.gong }} · {{ palace.name }}</span><small>{{ palace.direction }} · {{ palace.element }}</small></div>
        <div class="qimen-palace-body"><b>{{ palace.shenPan.god }}</b><strong>{{ palace.tianPan.star }}<em v-if="palace.tianPan.companionStar"> / {{ palace.tianPan.companionStar }}</em></strong><span>{{ palace.renPan.door }}</span></div>
        <footer><span>天 {{ palace.tianPan.stem }}<template v-if="palace.tianPan.companionStem"> {{ palace.tianPan.companionStem }}</template></span><span>地 {{ palace.diPan.stem }}</span></footer>
      </section>
    </div>
    <div v-if="qimen.patternTags?.length" class="qimen-patterns"><span v-for="tag in qimen.patternTags" :key="tag">{{ tag }}</span></div>
  </div>

  <div v-else-if="method === 'liuren'" class="traditional-reading liuren-board">
    <header><span>{{ liuren.dayNight || '六壬课' }}</span><h3>大六壬四课三传</h3><small>{{ liuren.ganzhi.year }}年 {{ liuren.ganzhi.month }}月 {{ liuren.ganzhi.day }}日 {{ liuren.ganzhi.hour }}时</small></header>
    <div class="liuren-topline"><span>月将 <strong>{{ liuren.monthLeader }}</strong></span><span>占时 <strong>{{ liuren.divinationBranch }}</strong></span><span>贵人 <strong>{{ liuren.noblemanBranch || '—' }}</strong></span><span>旬空 <strong>{{ liuren.xunKong?.join('、') || '—' }}</strong></span></div>
    <div class="liuren-heaven-plate">
      <section v-for="(item, index) in liuren.heavenlyPlate" :key="`${item.branch}-${index}`" :style="gridSlotStyle(liurenPlateSlots[index] ?? index, 4)"><small>{{ item.god }}</small><strong>{{ item.branch }}</strong><span>{{ item.under }}</span></section>
      <div class="liuren-plate-center"><span>天盘 · 地盘</span><strong>{{ liuren.transmissionRule || '九宗门取传' }}</strong><small>{{ liuren.transmissionPattern || liuren.guaTi?.slice(0, 2).join(' · ') || '四课三传' }}</small></div>
    </div>
    <div class="liuren-lessons"><section v-for="lesson in liuren.fourLessons" :key="lesson.name"><span>{{ lesson.name }}</span><div><strong>{{ lesson.upper }}</strong><i></i><b>{{ lesson.lower }}</b></div><small>{{ lesson.god }} · {{ lesson.relation }}</small></section></div>
    <div class="liuren-transmissions"><section v-for="item in liuren.threeTransmissions" :key="item.stage"><span>{{ item.stage }}</span><strong>{{ item.branch }}</strong><small>{{ item.god }} · {{ item.relation }}<template v-if="item.seasonState"> · {{ item.seasonState }}</template><template v-if="item.isVoid"> · 空</template></small></section></div>
  </div>

  <div v-else-if="method === 'taiyi'" class="traditional-reading taiyi-board">
    <header><span>太乙年计</span><h3>{{ taiyi.ganZhi }}年 · {{ taiyi.yinYang }}第 {{ taiyi.bureau }} 局</h3><small>{{ taiyi.dateTime.slice(0, 4) }} 年计七十二局</small></header>
    <div class="taiyi-value-strip"><span>积年 <strong>{{ taiyi.accumulatedValue }}</strong></span><span>太乙 <strong>{{ taiyi.taiyiPosition }} · {{ taiyi.taiyiDir }}</strong></span><span>文昌 <strong>{{ taiyi.wenChangPosition }}</strong></span><span>始击 <strong>{{ taiyi.shiJiPosition }}</strong></span></div>
    <div class="taiyi-nine-grid">
      <section v-for="palace in taiyiPalaces" :key="palace.palace" :class="{ center: palace.palace === 5, occupied: palace.markers.length }">
        <div class="taiyi-palace-head"><span>{{ palace.palace }} · {{ palace.gua }}</span><small>{{ palace.dir }}</small></div>
        <template v-if="palace.palace === 5">
          <div class="taiyi-center"><span>{{ taiyi.ganZhi }}年</span><strong>{{ taiyi.yinYang }} {{ taiyi.bureau }}局</strong><small>主 {{ taiyi.lordCount }} · 客 {{ taiyi.guestCount }} · 定 {{ taiyi.setCount }}</small></div>
        </template>
        <template v-else>
          <div class="taiyi-markers"><span v-for="marker in palace.markers" :key="marker.label" :class="`tone-${marker.tone}`">{{ marker.label }}</span></div>
          <div class="taiyi-gods"><small v-for="god in palace.gods" :key="`${god.branch}-${god.god}`">{{ god.branch }} · {{ god.god }}</small></div>
        </template>
      </section>
    </div>
    <div class="taiyi-forces">
      <section><span>主算</span><strong>{{ taiyi.lordCount }}</strong><small>大将 {{ taiyi.lordGeneral }}宫 · 参将 {{ taiyi.lordAssistant }}宫</small></section>
      <section><span>客算</span><strong>{{ taiyi.guestCount }}</strong><small>大将 {{ taiyi.guestGeneral }}宫 · 参将 {{ taiyi.guestAssistant }}宫</small></section>
      <section><span>定算</span><strong>{{ taiyi.setCount }}</strong><small>大将 {{ taiyi.setGeneral }}宫 · 参将 {{ taiyi.setAssistant }}宫</small></section>
    </div>
    <div v-if="taiyi.judgments.length" class="taiyi-judgments"><p v-for="item in taiyi.judgments" :key="item">{{ item }}</p></div>
  </div>

  <div v-else-if="method === 'wuyun-liuqi'" class="traditional-reading wuyun-board">
    <header><span>{{ wuyunLiuqi.input.yearGanZhi }}年</span><h3>五运六气</h3><small>{{ wuyunLiuqi.annualMovement.name }}{{ wuyunLiuqi.annualMovement.strength }} · {{ wuyunLiuqi.sitian.name }}司天 · {{ wuyunLiuqi.zaiquan.name }}在泉</small></header>
    <div class="wuyun-overview">
      <section><span>中运</span><strong>{{ wuyunLiuqi.annualMovement.name }}</strong><small>{{ wuyunLiuqi.annualMovement.toneName }} · {{ wuyunLiuqi.annualMovement.strength }}</small></section>
      <section><span>司天</span><strong>{{ wuyunLiuqi.sitian.name }}</strong><small>{{ wuyunLiuqi.sitian.qi }} · {{ wuyunLiuqi.sitian.element }}</small></section>
      <section><span>在泉</span><strong>{{ wuyunLiuqi.zaiquan.name }}</strong><small>{{ wuyunLiuqi.zaiquan.qi }} · {{ wuyunLiuqi.zaiquan.element }}</small></section>
      <section><span>气运关系</span><strong>{{ wuyunLiuqi.annualRelation.kind }}</strong><small>{{ wuyunLiuqi.annualConformities.names.join(' · ') || '常年气运' }}</small></section>
    </div>
    <section class="wuyun-section">
      <div class="wuyun-section-head"><strong>五运</strong><small>主运 · 客运</small></div>
      <div class="wuyun-steps is-five"><article v-for="step in wuyunLiuqi.movementSteps" :key="step.order"><span>{{ step.label }}</span><strong>{{ step.guestMovement.toneName }}</strong><small>主 {{ step.hostMovement.toneName }}</small><em>{{ step.hostGuestRelation.kind }}</em><p>{{ step.startBoundary.solarTerm }}后第{{ step.startBoundary.offsetDays }}日交运</p></article></div>
    </section>
    <section class="wuyun-section">
      <div class="wuyun-section-head"><strong>六气</strong><small>主气 · 客气</small></div>
      <div class="wuyun-steps is-six"><article v-for="step in wuyunLiuqi.qiSteps" :key="step.order"><span>{{ step.label }}</span><strong>{{ step.guestQi.name }}</strong><small>主 {{ step.hostQi.name }}</small><em>{{ step.hostGuestRelation.kind }}</em><p>{{ step.solarTerms.join(' · ') }}</p></article></div>
    </section>
  </div>

  <div v-else-if="method === 'huangji-jingshi'" class="traditional-reading huangji-board">
    <template v-if="huangjiForecast">
      <header><span>公历 {{ huangji.input.year }} 年 · {{ huangjiForecast.hexagrams.annual.ganzhi }}年</span><h3>{{ huangjiForecast.hexagrams.annual.symbol }} {{ huangjiForecast.hexagrams.annual.name }}</h3><small>值年卦 · {{ huangjiForecast.hexagrams.annual.upper }}上{{ huangjiForecast.hexagrams.annual.lower }}下</small></header>
      <section class="huangji-annual">
        <span>这一年的主卦</span>
        <p>{{ huangjiForecast.hexagrams.annual.judgment }}</p>
        <small>{{ huangjiForecast.reading.cycleContext }}</small>
      </section>
      <div class="huangji-cycles">
        <section><span>十年阶段</span><strong>{{ huangjiForecast.hexagrams.decade.hexagram.symbol }} {{ huangjiForecast.hexagrams.decade.hexagram.name }}</strong><small>{{ formatPeriodRange(huangjiForecast.hexagrams.decade) }}</small></section>
        <section><span>六十年阶段</span><strong>{{ huangjiForecast.hexagrams.sixtyYear.hexagram.symbol }} {{ huangjiForecast.hexagrams.sixtyYear.hexagram.name }}</strong><small>{{ formatPeriodRange(huangjiForecast.hexagrams.sixtyYear) }}</small></section>
        <section><span>长期运卦</span><strong>{{ huangjiForecast.hexagrams.yun.hexagram.symbol }} {{ huangjiForecast.hexagrams.yun.hexagram.name }}</strong><small>{{ formatPeriodRange(huangjiForecast.hexagrams.yun) }}</small></section>
        <section><span>会内统卦</span><strong>{{ huangjiForecast.hexagrams.governing.hexagram.symbol }} {{ huangjiForecast.hexagrams.governing.hexagram.name }}</strong><small>{{ formatPeriodRange(huangjiForecast.hexagrams.governing) }}</small></section>
      </div>
      <section class="huangji-related">
        <div><span>互卦</span><strong>{{ huangjiForecast.relatedHexagrams.mutual.symbol }} {{ huangjiForecast.relatedHexagrams.mutual.name }}</strong><small>观察事情内部如何发展</small></div>
        <div><span>错卦</span><strong>{{ huangjiForecast.relatedHexagrams.opposite.symbol }} {{ huangjiForecast.relatedHexagrams.opposite.name }}</strong><small>观察相反条件与制约</small></div>
        <div><span>综卦</span><strong>{{ huangjiForecast.relatedHexagrams.reversed.symbol }} {{ huangjiForecast.relatedHexagrams.reversed.name }}</strong><small>换一个位置观察局势</small></div>
      </section>
    </template>
    <template v-else>
      <header><span>{{ huangji.input.year }} 年</span><h3>皇极经世</h3><small>元 · 会 · 运 · 世周期</small></header>
      <div class="huangji-cycles is-position"><section><span>本元</span><strong>第 {{ huangji.position.yuan.indexFromEpoch }} 元</strong><small>{{ formatPeriodRange(huangji.position.yuan) }}</small></section><section><span>本会</span><strong>第 {{ huangji.position.hui.indexInYuan }} 会</strong><small>{{ formatPeriodRange(huangji.position.hui) }}</small></section><section><span>本运</span><strong>第 {{ huangji.position.yun.indexInYuan }} 运</strong><small>{{ formatPeriodRange(huangji.position.yun) }}</small></section><section><span>本世</span><strong>第 {{ huangji.position.shi.indexInYuan }} 世</strong><small>{{ formatPeriodRange(huangji.position.shi) }}</small></section></div>
    </template>
  </div>

  <div v-else-if="method === 'ssgw'" class="traditional-reading sign-board">
    <div class="sign-paper">
      <header class="sign-paper-head">
        <div class="sign-seal">三山<br />国王</div>
        <div><span class="sign-order">第 {{ ssgw.number }} 签</span><h3>{{ ssgw.title }}</h3></div>
      </header>
      <div class="sign-paper-main">
        <FortuneStatusImage :status="signFortuneStatus" class="sign-fortune-art" />
        <div class="sign-poem"><p v-for="line in signPoemLines" :key="line">{{ line }}</p></div>
      </div>
      <small>三山国王九十二签</small>
    </div>
    <div class="sign-reading-body">
      <section v-if="ssgw.story" class="sign-story"><span>典故</span><p>{{ ssgw.story }}</p></section>
      <div v-if="signDetails.length" class="sign-interpretations"><section v-for="([key, value]) in signDetails" :key="key"><span>{{ key }}</span><p>{{ value }}</p></section></div>
    </div>
  </div>
</template>

<style scoped>
.traditional-reading { color: var(--ink); margin-top: 18px; }
.traditional-reading > header { border-bottom: 1px solid var(--line); padding: 0 3px 14px; text-align: center; }
.traditional-reading > header span, .traditional-reading > header small { color: var(--muted); display: block; font-size: 11px; }
.traditional-reading > header h3 { font-size: 20px; font-weight: 650; letter-spacing: .07em; margin: 7px 0 5px; }
.meihua-triad { display: grid; gap: 1px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 18px; }
.meihua-triad section { border-right: 1px solid var(--line); padding: 8px 10px 15px; text-align: center; }
.meihua-triad section:last-child { border-right: 0; }
.meihua-triad span, .meihua-triad small { color: var(--muted); display: block; font-size: 11px; }
.meihua-triad b { color: var(--ink); display: block; font-size: 43px; font-weight: 400; letter-spacing: .05em; line-height: 1; margin: 13px 0 9px; }
.meihua-triad h4 { color: var(--ink); font-size: 15px; margin: 0 0 5px; }
.meihua-yaos { border-top: 1px solid var(--line); margin: 4px auto 0; max-width: 440px; padding-top: 7px; }
.meihua-yaos > div { align-items: center; display: grid; grid-template-columns: 45px 1fr 48px; min-height: 37px; }
.meihua-yaos > div > span, .meihua-yaos > div > strong { color: var(--muted); font-size: 11px; font-style: normal; font-weight: 500; text-align: center; }
.meihua-yaos > div.changing { background: color-mix(in srgb, var(--plum-soft) 48%, transparent); }
.meihua-yaos > div.changing > strong { color: var(--plum); }
.meihua-board footer { color: var(--muted); display: flex; flex-wrap: wrap; font-size: 11px; gap: 14px; justify-content: center; padding: 14px 4px 0; }
.liuyao-head, .liuyao-row { align-items: center; display: grid; grid-template-columns: 52px minmax(110px, 1.35fr) minmax(112px, 1.2fr) 36px minmax(88px, .9fr); }
.liuyao-head { color: var(--subtle); font-size: 11px; padding: 11px 4px 5px; text-align: center; }
.liuyao-row { border-bottom: 1px solid var(--line); min-height: 55px; padding: 4px; }
.liuyao-row > span { color: var(--muted); font-size: 11px; min-width: 0; text-align: center; }
.liuyao-row > span:nth-child(2), .changed-yao { text-align: left; }
.liuyao-row strong, .liuyao-row small { display: block; }
.liuyao-row strong { color: var(--ink); font-size: 12px; }
.liuyao-row small { color: var(--muted); font-size: 11px; margin-top: 3px; }
.full-yao { align-items: center; display: flex; gap: 0; justify-content: center; position: relative; }
.full-yao i { background: var(--ink); height: 6px; width: 90px; }
.full-yao i + i { display: none; }
.full-yao.broken { gap: 16px; }
.full-yao.broken i { width: 37px; }
.full-yao.broken i + i { display: block; }
.full-yao b { color: var(--plum); font-size: 14px; margin-left: 6px; position: absolute; right: 0; }
.liuyao-row.changing { background: color-mix(in srgb, var(--plum-soft) 48%, transparent); }
.liuyao-board footer { color: var(--muted); display: flex; flex-wrap: wrap; font-size: 11px; gap: 15px; justify-content: center; padding: 12px 4px 0; }
.xiaoliuren-plate { display: grid; gap: 6px; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(92px, auto)); margin: 18px auto 0; max-width: 610px; }
.xiaoliuren-plate > section { border: 1px solid var(--line); min-width: 0; padding: 11px; position: relative; text-align: center; }
.xiaoliuren-plate > section.primary { background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 42%, var(--line)); }
.xiaoliuren-plate > section > span { color: var(--subtle); font-size: 10px; left: 7px; position: absolute; top: 6px; }
.xiaoliuren-plate > section > strong { color: var(--ink); display: block; font-size: 17px; margin-top: 7px; }
.xiaoliuren-plate > section > small { color: var(--muted); display: block; font-size: 10px; line-height: 1.5; margin-top: 7px; }
.xiaoliuren-center { align-items: center; display: flex; flex-direction: column; grid-column: 2; grid-row: 2; justify-content: center; min-width: 0; padding: 8px; text-align: center; }
.xiaoliuren-center span, .xiaoliuren-center small { color: var(--muted); font-size: 10px; }.xiaoliuren-center strong { color: var(--accent-strong); font-size: 13px; line-height: 1.6; margin: 4px 0; }
.xiaoliuren-board > footer { align-items: center; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 8px 18px; justify-content: center; margin-top: 13px; padding-top: 12px; }.xiaoliuren-board > footer span, .xiaoliuren-board > footer strong { color: var(--muted); font-size: 11px; }.xiaoliuren-board > footer strong { color: var(--accent-strong); }
.jinkou-meta, .qimen-value-strip, .liuren-topline { border-bottom: 1px solid var(--line); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 10px; }.jinkou-meta span, .qimen-value-strip span, .liuren-topline span { color: var(--muted); font-size: 10px; padding: 10px 5px; text-align: center; }.jinkou-meta b, .qimen-value-strip strong, .liuren-topline strong { color: var(--ink); display: block; font-size: 12px; margin-top: 4px; }
.jinkou-four { margin: 15px auto 0; max-width: 590px; }.jinkou-four section { align-items: center; border-bottom: 1px solid var(--line); display: grid; gap: 12px; grid-template-columns: 54px minmax(120px, .8fr) minmax(170px, 1.2fr); min-height: 61px; padding: 7px 8px; }.jinkou-four section.used { background: var(--accent-soft); }.jinkou-four section.void { box-shadow: inset 3px 0 0 var(--plum); }.jinkou-four section > span { color: var(--muted); font-size: 11px; }.jinkou-four section > strong { color: var(--ink); font-size: 20px; font-weight: 600; letter-spacing: .1em; }.jinkou-four section em { color: var(--accent-strong); font-size: 11px; font-style: normal; letter-spacing: 0; margin-left: 9px; }.jinkou-four section > small { color: var(--muted); font-size: 11px; line-height: 1.6; }.jinkou-relations { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin-top: 14px; }.jinkou-relations span { background: var(--surface-muted); border-radius: 99px; color: var(--muted); font-size: 10px; padding: 5px 9px; }
.qimen-nine-grid { border: 1px solid var(--line); display: grid; gap: 1px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 15px auto 0; max-width: 720px; overflow: hidden; }.qimen-nine-grid > section { background: var(--surface-raised); box-shadow: 0 0 0 1px var(--line); min-height: 145px; padding: 9px; }.qimen-nine-grid > section.center { background: var(--surface-muted); }.qimen-palace-head { align-items: baseline; display: flex; justify-content: space-between; }.qimen-palace-head span { color: var(--ink); font-size: 11px; font-weight: 650; }.qimen-palace-head small { color: var(--subtle); font-size: 9px; }.qimen-palace-body { align-items: center; display: grid; gap: 3px; grid-template-columns: 1fr 1.4fr 1fr; min-height: 79px; text-align: center; }.qimen-palace-body b, .qimen-palace-body span { color: var(--muted); font-size: 11px; }.qimen-palace-body strong { color: var(--accent-strong); font-size: 17px; }.qimen-palace-body em { display: block; font-size: 9px; font-style: normal; margin-top: 3px; }.qimen-nine-grid footer { border-top: 1px dashed var(--line); display: flex; justify-content: space-between; padding-top: 7px; }.qimen-nine-grid footer span { color: var(--muted); font-size: 10px; }.qimen-patterns { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 13px; }.qimen-patterns span { border: 1px solid var(--line); border-radius: 5px; color: var(--muted); font-size: 10px; padding: 4px 7px; }
.liuren-heaven-plate { display: grid; gap: 1px; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(4, 78px); margin: 15px auto 0; max-width: 650px; }.liuren-heaven-plate > section { align-items: center; border: 1px solid var(--line); display: grid; grid-template-columns: 1fr auto 1fr; min-width: 0; padding: 7px; text-align: center; }.liuren-heaven-plate > section small { color: var(--muted); font-size: 9px; }.liuren-heaven-plate > section strong { color: var(--accent-strong); font-size: 20px; }.liuren-heaven-plate > section span { color: var(--ink); font-size: 11px; }.liuren-plate-center { align-items: center; border: 1px solid var(--line); display: flex; flex-direction: column; grid-column: 2 / 4; grid-row: 2 / 4; justify-content: center; padding: 10px; text-align: center; }.liuren-plate-center span, .liuren-plate-center small { color: var(--muted); font-size: 10px; }.liuren-plate-center strong { color: var(--ink); font-size: 16px; margin: 8px 0 6px; }
.liuren-lessons { border-bottom: 1px solid var(--line); border-top: 1px solid var(--line); display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 18px; }.liuren-lessons section { border-right: 1px solid var(--line); padding: 10px 6px; text-align: center; }.liuren-lessons section:last-child { border-right: 0; }.liuren-lessons span, .liuren-lessons small { color: var(--muted); display: block; font-size: 10px; }.liuren-lessons div { align-items: center; display: flex; gap: 8px; justify-content: center; margin: 8px 0 6px; }.liuren-lessons strong, .liuren-lessons b { color: var(--ink); font-size: 17px; }.liuren-lessons i { background: var(--line); display: block; height: 1px; width: 20px; }.liuren-transmissions { display: grid; gap: 1px; grid-template-columns: repeat(3, 1fr); margin: 15px auto 0; max-width: 560px; }.liuren-transmissions section { background: var(--surface-muted); padding: 12px; text-align: center; }.liuren-transmissions span, .liuren-transmissions small { color: var(--muted); display: block; font-size: 10px; }.liuren-transmissions strong { color: var(--accent-strong); display: block; font-size: 24px; margin: 7px 0 5px; }
.taiyi-value-strip { border-bottom: 1px solid var(--line); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 10px; }.taiyi-value-strip span { color: var(--muted); font-size: 10px; padding: 10px 5px; text-align: center; }.taiyi-value-strip strong { color: var(--ink); display: block; font-size: 12px; margin-top: 4px; }
.taiyi-nine-grid { border: 1px solid var(--line); display: grid; gap: 1px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 15px auto 0; max-width: 720px; overflow: hidden; }.taiyi-nine-grid > section { background: var(--surface-raised); box-shadow: 0 0 0 1px var(--line); min-height: 142px; min-width: 0; padding: 9px; }.taiyi-nine-grid > section.center { background: var(--surface-muted); }.taiyi-nine-grid > section.occupied { background: color-mix(in srgb, var(--plum-soft) 24%, var(--surface-raised)); }.taiyi-palace-head { align-items: baseline; display: flex; justify-content: space-between; }.taiyi-palace-head span { color: var(--ink); font-size: 11px; font-weight: 650; }.taiyi-palace-head small { color: var(--subtle); font-size: 9px; }.taiyi-markers { align-content: center; display: flex; flex-wrap: wrap; gap: 5px; min-height: 70px; padding: 10px 0 6px; }.taiyi-markers span { border: 1px solid var(--line); border-radius: 4px; color: var(--muted); font-size: 9px; padding: 4px 6px; }.taiyi-markers .tone-primary { background: var(--accent-strong); border-color: var(--accent-strong); color: #fff; }.taiyi-markers .tone-lord { color: var(--accent-strong); }.taiyi-markers .tone-guest { color: #9a5e73; }.taiyi-markers .tone-set { color: var(--sage); }.taiyi-gods { border-top: 1px dashed var(--line); display: flex; flex-wrap: wrap; gap: 4px 10px; padding-top: 7px; }.taiyi-gods small { color: var(--muted); font-size: 9px; }.taiyi-center { align-items: center; display: flex; flex-direction: column; justify-content: center; min-height: 100px; text-align: center; }.taiyi-center span, .taiyi-center small { color: var(--muted); font-size: 10px; }.taiyi-center strong { color: var(--accent-strong); font-size: 16px; margin: 8px 0 6px; }
.taiyi-forces { border-bottom: 1px solid var(--line); border-top: 1px solid var(--line); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 16px; }.taiyi-forces section { border-right: 1px solid var(--line); padding: 12px 8px; text-align: center; }.taiyi-forces section:last-child { border-right: 0; }.taiyi-forces span, .taiyi-forces small { color: var(--muted); display: block; font-size: 10px; }.taiyi-forces strong { color: var(--accent-strong); display: block; font-size: 22px; margin: 5px 0 4px; }.taiyi-judgments { padding-top: 10px; }.taiyi-judgments p { border-bottom: 1px solid var(--line); color: var(--muted); font-size: 11px; line-height: 1.65; margin: 0; padding: 8px 2px; }
.wuyun-overview { border-bottom: 1px solid var(--line); border-top: 1px solid var(--line); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 14px; }
.wuyun-overview section { border-right: 1px solid var(--line); min-width: 0; padding: 12px 8px; text-align: center; }
.wuyun-overview section:last-child { border-right: 0; }
.wuyun-overview span, .wuyun-overview small { color: var(--muted); display: block; font-size: 10px; line-height: 1.5; }
.wuyun-overview strong { color: var(--ink); display: block; font-size: 15px; margin: 5px 0 3px; }
.wuyun-section { padding-top: 16px; }
.wuyun-section-head { align-items: baseline; display: flex; justify-content: space-between; margin-bottom: 8px; }
.wuyun-section-head strong { color: var(--ink); font-size: 13px; }
.wuyun-section-head small { color: var(--muted); font-size: 10px; }
.wuyun-steps { border: 1px solid var(--line); display: grid; gap: 1px; overflow: hidden; }
.wuyun-steps.is-five { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.wuyun-steps.is-six { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.wuyun-steps article { background: var(--surface-raised); box-shadow: 0 0 0 1px var(--line); min-width: 0; padding: 10px 8px; text-align: center; }
.wuyun-steps span, .wuyun-steps small, .wuyun-steps p { color: var(--muted); display: block; font-size: 9px; line-height: 1.5; }
.wuyun-steps strong { color: var(--accent-strong); display: block; font-size: 13px; margin: 5px 0 3px; }
.wuyun-steps em { background: var(--surface-muted); border-radius: 999px; color: var(--muted); display: inline-block; font-size: 9px; font-style: normal; margin-top: 6px; padding: 3px 6px; }
.wuyun-steps p { border-top: 1px dashed var(--line); margin: 7px 0 0; padding-top: 6px; }
.huangji-annual { border-bottom: 1px solid var(--line); padding: 18px 4px 16px; text-align: center; }
.huangji-annual > span { color: var(--accent-strong); font-size: 10px; font-weight: 650; letter-spacing: .08em; }
.huangji-annual p { color: var(--ink); font-family: "Noto Serif SC", "Songti SC", serif; font-size: 14px; line-height: 1.75; margin: 8px auto 6px; max-width: 720px; }
.huangji-annual small { color: var(--muted); font-size: 10px; line-height: 1.55; }
.huangji-cycles { border-bottom: 1px solid var(--line); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.huangji-cycles section { border-right: 1px solid var(--line); min-width: 0; padding: 14px 8px; text-align: center; }
.huangji-cycles section:last-child { border-right: 0; }
.huangji-cycles span, .huangji-cycles small { color: var(--muted); display: block; font-size: 10px; line-height: 1.45; }
.huangji-cycles strong { color: var(--ink); display: block; font-size: 13px; margin: 6px 0 4px; }
.huangji-related { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding-top: 14px; }
.huangji-related div { border-right: 1px solid var(--line); min-width: 0; padding: 8px 10px; text-align: center; }
.huangji-related div:last-child { border-right: 0; }
.huangji-related span, .huangji-related small { color: var(--muted); display: block; font-size: 10px; line-height: 1.45; }
.huangji-related strong { color: var(--accent-strong); display: block; font-size: 13px; margin: 5px 0 4px; }
.sign-board { align-items: start; display: grid; gap: clamp(20px, 2.6vw, 28px); grid-template-columns: minmax(330px, 370px) minmax(0, 1fr); margin-top: 0; }
.sign-paper { background: linear-gradient(100deg, rgba(132, 51, 52, .045), transparent 28%), #f8f0dc; border: 1px solid #d7c49d; border-radius: 8px; box-shadow: inset 0 0 28px rgba(137, 93, 51, .07), 0 10px 24px rgba(88, 62, 41, .07); color: #4f2929; padding: 22px 22px 18px; position: relative; text-align: center; }
.sign-paper::before, .sign-paper::after { border-top: 1px solid #aa7770; content: ''; left: 13px; position: absolute; right: 13px; top: 10px; }
.sign-paper::after { bottom: 10px; top: auto; }
.sign-paper-head { align-items: center; display: grid; gap: 12px; grid-template-columns: 43px 1fr 43px; }
.sign-paper-head::after { content: ''; }
.sign-seal { border: 2px solid #9c4744; color: #9c4744; font-size: 11px; line-height: 1.35; padding: 4px; transform: rotate(-4deg); }
.sign-order { color: #98625a; display: block; font-size: 11px; letter-spacing: .16em; }
.sign-paper h3 { font-size: 18px; letter-spacing: .08em; line-height: 1.45; margin: 5px 0 0; }
.sign-paper-main { align-items: stretch; border-bottom: 1px solid #d8c5a1; border-top: 1px solid #d8c5a1; display: grid; gap: 13px; grid-template-columns: 116px 1fr; margin-top: 14px; padding: 13px 0; }
.sign-fortune-art { align-self: center; border: 1px solid rgba(152, 98, 90, .2); border-radius: 9px; box-shadow: 0 5px 14px rgba(88, 62, 41, .08); overflow: hidden; width: 116px; }
.sign-poem { align-items: center; display: flex; flex-direction: row-reverse; gap: clamp(8px, 1.3vw, 12px); justify-content: center; min-height: 180px; min-width: 0; padding: 4px 0; }
.sign-poem p { font-size: 14px; letter-spacing: .08em; line-height: 1.65; margin: 0; writing-mode: vertical-rl; }
.sign-paper > small { color: #9b756b; display: block; font-size: 10px; letter-spacing: .16em; margin-top: 12px; }
.sign-reading-body { min-width: 0; padding-top: 1px; }
.sign-story { padding: 0 0 15px; }
.sign-story span, .sign-interpretations span { color: var(--accent); font-size: 11px; font-weight: 650; letter-spacing: .1em; }
.sign-story p, .sign-interpretations p { color: var(--muted); font-size: 13px; line-height: 1.75; margin: 6px 0 0; }
.sign-interpretations { align-content: start; border-top: 1px solid var(--line); display: grid; gap: 0 20px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.sign-interpretations section { border-bottom: 1px solid var(--line); min-width: 0; padding: 11px 0 10px; }
@media (max-width: 720px) {
  .meihua-triad b { font-size: 34px; }
  .meihua-triad section { padding-left: 4px; padding-right: 4px; }
  .liuyao-head, .liuyao-row { grid-template-columns: 40px minmax(82px, 1fr) minmax(95px, 1.2fr) 25px; }
  .liuyao-head span:last-child, .liuyao-row > span:last-child { display: none; }
  .full-yao i { width: 70px; }
  .full-yao.broken { gap: 11px; }
  .full-yao.broken i { width: 29px; }
  .xiaoliuren-plate { gap: 3px; grid-template-rows: repeat(3, minmax(78px, auto)); }.xiaoliuren-plate > section { padding: 8px 5px; }.xiaoliuren-plate > section > strong { font-size: 15px; }.xiaoliuren-plate > section > small { font-size: 9px; }
  .jinkou-meta, .qimen-value-strip, .liuren-topline { grid-template-columns: repeat(2, 1fr); }.jinkou-meta span:nth-child(n + 3), .qimen-value-strip span:nth-child(n + 3), .liuren-topline span:nth-child(n + 3) { border-top: 1px solid var(--line); }.jinkou-four section { gap: 7px; grid-template-columns: 42px 92px minmax(0, 1fr); padding-left: 3px; padding-right: 3px; }.jinkou-four section > strong { font-size: 17px; }.jinkou-four section > small { font-size: 10px; }
  .qimen-nine-grid > section { min-height: 124px; padding: 6px; }.qimen-palace-head { align-items: flex-start; flex-direction: column; gap: 2px; }.qimen-palace-body { grid-template-columns: 1fr; min-height: 77px; }.qimen-palace-body strong { font-size: 15px; }.qimen-palace-body b, .qimen-palace-body span { font-size: 10px; }.qimen-nine-grid footer { gap: 4px; }.qimen-nine-grid footer span { font-size: 9px; }
  .liuren-heaven-plate { grid-template-rows: repeat(4, 65px); }.liuren-heaven-plate > section { grid-template-columns: 1fr; padding: 4px 2px; }.liuren-heaven-plate > section strong { font-size: 16px; }.liuren-heaven-plate > section small, .liuren-heaven-plate > section span { font-size: 8px; }.liuren-plate-center { padding: 6px; }.liuren-plate-center strong { font-size: 13px; margin: 4px 0; }.liuren-lessons section { padding-left: 3px; padding-right: 3px; }.liuren-lessons div { gap: 3px; }.liuren-lessons i { width: 10px; }.liuren-transmissions section { padding: 10px 5px; }
  .taiyi-value-strip { grid-template-columns: repeat(2, 1fr); }.taiyi-value-strip span:nth-child(n + 3) { border-top: 1px solid var(--line); }.taiyi-nine-grid > section { min-height: 116px; padding: 6px; }.taiyi-palace-head { align-items: flex-start; flex-direction: column; gap: 2px; }.taiyi-markers { align-content: flex-start; gap: 3px; min-height: 58px; padding: 7px 0 4px; }.taiyi-markers span { font-size: 8px; padding: 3px 4px; }.taiyi-gods { gap: 2px 6px; padding-top: 5px; }.taiyi-gods small { font-size: 8px; }.taiyi-center { min-height: 83px; }.taiyi-center strong { font-size: 13px; }.taiyi-forces section { padding: 10px 4px; }.taiyi-forces strong { font-size: 19px; }.taiyi-forces small { font-size: 9px; line-height: 1.45; }
  .wuyun-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }.wuyun-overview section { padding: 10px 6px; }.wuyun-overview section:nth-child(2) { border-right: 0; }.wuyun-overview section:nth-child(n + 3) { border-top: 1px solid var(--line); }.wuyun-steps.is-five, .wuyun-steps.is-six { grid-template-columns: repeat(2, minmax(0, 1fr)); }.wuyun-steps article { padding: 9px 6px; }.wuyun-steps strong { font-size: 12px; }
  .huangji-cycles { grid-template-columns: repeat(2, minmax(0, 1fr)); }.huangji-cycles section { padding: 11px 5px; }.huangji-cycles section:nth-child(2) { border-right: 0; }.huangji-cycles section:nth-child(n + 3) { border-top: 1px solid var(--line); }.huangji-related div { padding: 7px 5px; }.huangji-related small { font-size: 9px; }
  .sign-board { gap: 18px; grid-template-columns: 1fr; }
  .sign-paper { margin: 0 auto; max-width: 460px; padding: 20px 18px 17px; width: 100%; }
  .sign-paper-main { gap: 12px; grid-template-columns: 108px 1fr; margin-top: 12px; padding: 12px 0; }
  .sign-fortune-art { width: 108px; }
  .sign-poem { min-height: 168px; }
  .sign-poem p { font-size: 13px; line-height: 1.6; }
  .sign-story { padding-bottom: 13px; }
  .sign-interpretations { gap: 0 16px; }
}
@media (max-width: 390px) {
  .sign-paper { padding-left: 14px; padding-right: 14px; }
  .sign-paper-head { gap: 8px; grid-template-columns: 40px 1fr 40px; }
  .sign-paper h3 { font-size: 16px; }
  .sign-paper-main { gap: 9px; grid-template-columns: 92px 1fr; }
  .sign-fortune-art { width: 92px; }
  .sign-poem { gap: 7px; min-height: 144px; }
  .sign-poem p { font-size: 12px; letter-spacing: .05em; }
  .sign-interpretations { grid-template-columns: 1fr; }
}
@media (prefers-color-scheme: dark) {
  .sign-paper { background: linear-gradient(90deg, rgba(199, 123, 112, .06), transparent 20%), #2c251f; border-color: #685947; box-shadow: inset 0 0 30px rgba(0, 0, 0, .18), 0 12px 30px rgba(0, 0, 0, .14); color: #ead9c4; }
  .sign-paper::before, .sign-paper::after { border-color: #805e59; }
  .sign-seal { border-color: #b66e68; color: #c78078; }
  .sign-order, .sign-paper > small { color: #b99888; }
  .sign-paper-main { border-color: #655747; }
  .sign-fortune-art { border-color: rgba(201, 147, 135, .22); box-shadow: 0 5px 14px rgba(0, 0, 0, .14); }
}
</style>
