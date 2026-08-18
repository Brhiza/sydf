<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type CSSProperties } from 'vue';
import { Flame, RotateCcw, X } from 'lucide-vue-next';
import { UiButton, UiDialogShell } from './ui';

const emit = defineEmits<{ close: [] }>();

type IncenseKind = 'small' | 'medium' | 'large';

interface IncenseOption {
  key: IncenseKind;
  label: string;
  image: string;
  burnableRatio: number;
  durationMs: number;
  durationLabel: string;
}

interface OfferingOption {
  key: string;
  label: string;
  image: string;
}

interface SmokeParticle {
  id: string;
  style: CSSProperties;
}

const incenseOptions: IncenseOption[] = [
  { key: 'small', label: '清香', image: '/divination-assets/temple/incense-small-normalized.png', burnableRatio: .74, durationMs: 15 * 60 * 1000, durationLabel: '15 分钟' },
  { key: 'medium', label: '贡香', image: '/divination-assets/temple/incense-medium-normalized.png', burnableRatio: .70, durationMs: 3 * 60 * 60 * 1000, durationLabel: '3 小时' },
  { key: 'large', label: '龙香', image: '/divination-assets/temple/incense-large-normalized.png', burnableRatio: .75, durationMs: 12 * 60 * 60 * 1000, durationLabel: '12 小时' },
];

const offeringOptions: OfferingOption[] = [
  { key: 'apple', label: '苹果', image: '/gongpin/图层 36.png' },
  { key: 'orange', label: '柑橘', image: '/gongpin/图层 34.png' },
  { key: 'banana', label: '香蕉', image: '/gongpin/图层 33.png' },
  { key: 'peach', label: '寿桃', image: '/gongpin/图层 29.png' },
  { key: 'grape', label: '葡萄', image: '/gongpin/图层 1.png' },
  { key: 'zongzi', label: '粽子', image: '/gongpin/图层 3.png' },
  { key: 'fish', label: '鲜鱼', image: '/gongpin/图层 4.png' },
  { key: 'chicken', label: '全鸡', image: '/gongpin/图层 5.png' },
  { key: 'tea', label: '清茶', image: '/gongpin/图层 20.png' },
  { key: 'pastry', label: '糕点', image: '/gongpin/图层 18.png' },
  { key: 'rice-cake', label: '粿品', image: '/gongpin/图层 14.png' },
  { key: 'lotus', label: '莲花', image: '/gongpin/图层 9.png' },
];

const incenseStorageKey = 'shiyue-temple-incense-v1';
const offeringStorageKey = 'shiyue-temple-offerings-v1';
function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createSmokeParticle(stickIndex: number, particleIndex: number): SmokeParticle {
  const side = Math.random() > .5 ? 1 : -1;
  const firstDrift = side * randomBetween(3, 15);
  const secondDrift = -side * randomBetween(2, 19);
  const finalDrift = (Math.random() > .42 ? side : -side) * randomBetween(15, 48);
  return {
    id: `${stickIndex}-${particleIndex}`,
    style: {
      '--smoke-start-x': `${randomBetween(-5, 5).toFixed(1)}px`,
      '--smoke-drift-1': `${firstDrift.toFixed(1)}px`,
      '--smoke-drift-2': `${secondDrift.toFixed(1)}px`,
      '--smoke-drift-3': `${finalDrift.toFixed(1)}px`,
      '--smoke-rise-1': `${-randomBetween(22, 34).toFixed(1)}px`,
      '--smoke-rise-2': `${-randomBetween(47, 67).toFixed(1)}px`,
      '--smoke-rise-3': `${-randomBetween(82, 126).toFixed(1)}px`,
      '--smoke-duration': `${randomBetween(14, 22).toFixed(2)}s`,
      '--smoke-delay': `${-randomBetween(0, 22).toFixed(2)}s`,
      '--smoke-scale': `${randomBetween(.82, 1.72).toFixed(2)}`,
      '--smoke-opacity': `${randomBetween(.16, .34).toFixed(2)}`,
      '--smoke-width': `${randomBetween(6, 11).toFixed(1)}px`,
      '--smoke-height': `${randomBetween(16, 27).toFixed(1)}px`,
      '--smoke-blur': `${randomBetween(1.4, 2.8).toFixed(1)}px`,
      '--smoke-rotate': `${randomBetween(-28, 28).toFixed(1)}deg`,
    } as CSSProperties,
  };
}

function createSmokeParticles() {
  return Array.from({ length: 3 }, (_, stickIndex) => (
    Array.from({ length: 4 }, (_, particleIndex) => createSmokeParticle(stickIndex, particleIndex))
  ));
}

const smokeParticles = ref<SmokeParticle[][]>(createSmokeParticles());
const selectedIncense = ref<IncenseKind>('small');
const incenseLit = ref(false);
const burnStartedAt = ref(0);
const burnEndsAt = ref(0);
const currentTime = ref(Date.now());
const placedOfferingKeys = ref<string[]>([]);
const ceremonyMessage = ref('');
const templeScene = ref<HTMLElement | null>(null);
const incenseBundle = ref<HTMLElement | null>(null);
const incenseHolding = ref(false);
const incenseDragOffset = ref({ x: 0, y: 0 });
let timerId: number | undefined;
let incensePointerId: number | null = null;
let incenseDragStart = { clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 };
let incenseDragBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

const activeIncense = computed(() => incenseOptions.find((item) => item.key === selectedIncense.value) || incenseOptions[0]);
const placedOfferings = computed(() => placedOfferingKeys.value
  .map((key) => offeringOptions.find((item) => item.key === key))
  .filter((item): item is OfferingOption => Boolean(item)));
const burnRemainingMs = computed(() => Math.max(0, burnEndsAt.value - currentTime.value));
const burnProgress = computed(() => {
  if (!incenseLit.value) return 0;
  const total = Math.max(1, burnEndsAt.value - burnStartedAt.value);
  return Math.min(1, Math.max(0, (currentTime.value - burnStartedAt.value) / total));
});
const burnCutPercent = computed(() => burnProgress.value * activeIncense.value.burnableRatio * 100);
const incenseVisualStyle = computed(() => ({
  '--burn-cut': `${burnCutPercent.value}%`,
} as CSSProperties));
const incenseBundleStyle = computed(() => ({
  transform: `translate3d(${incenseDragOffset.value.x}px, ${incenseDragOffset.value.y}px, 0)`,
}));
const burnHeadStyle = computed(() => ({
  top: `${burnCutPercent.value}%`,
}));
const showIgnitionFlame = computed(() => (
  incenseLit.value && currentTime.value - burnStartedAt.value < 3_000
));
const burnRemainingLabel = computed(() => {
  const totalSeconds = Math.ceil(burnRemainingMs.value / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});

function chooseIncense(kind: IncenseKind) {
  if (incenseLit.value) return;
  selectedIncense.value = kind;
  ceremonyMessage.value = '';
}

function lightIncense() {
  const now = Date.now();
  burnStartedAt.value = now;
  burnEndsAt.value = now + activeIncense.value.durationMs;
  currentTime.value = now;
  incenseLit.value = true;
  smokeParticles.value = createSmokeParticles();
  persistBurnState();
  ceremonyMessage.value = `三支${activeIncense.value.label}已点燃`;
}

function refreshSmokeParticle(stickIndex: number, particleIndex: number) {
  if (!incenseLit.value) return;
  smokeParticles.value[stickIndex][particleIndex] = createSmokeParticle(stickIndex, particleIndex);
}

function startIncenseHold(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const scene = templeScene.value;
  const handle = event.currentTarget as HTMLElement;
  if (!scene) return;

  const sceneRect = scene.getBoundingClientRect();
  const handleRect = handle.getBoundingClientRect();
  let offset = incenseDragOffset.value;
  if (incenseBundle.value) {
    const matrix = new DOMMatrixReadOnly(window.getComputedStyle(incenseBundle.value).transform);
    offset = { x: matrix.m41, y: matrix.m42 };
    incenseDragOffset.value = offset;
  }
  const restLeft = handleRect.left - offset.x;
  const restRight = handleRect.right - offset.x;
  const restTop = handleRect.top - offset.y;
  const restBottom = handleRect.bottom - offset.y;
  const edgePadding = 6;

  incenseDragBounds = {
    minX: sceneRect.left + edgePadding - restLeft,
    maxX: sceneRect.right - edgePadding - restRight,
    minY: sceneRect.top + edgePadding - restTop,
    maxY: sceneRect.bottom - edgePadding - restBottom,
  };
  incenseDragStart = {
    clientX: event.clientX,
    clientY: event.clientY,
    offsetX: offset.x,
    offsetY: offset.y,
  };
  incensePointerId = event.pointerId;
  incenseHolding.value = true;
  handle.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function moveHeldIncense(event: PointerEvent) {
  if (!incenseHolding.value || incensePointerId !== event.pointerId) return;
  const nextX = incenseDragStart.offsetX + event.clientX - incenseDragStart.clientX;
  const nextY = incenseDragStart.offsetY + event.clientY - incenseDragStart.clientY;
  incenseDragOffset.value = {
    x: Math.min(incenseDragBounds.maxX, Math.max(incenseDragBounds.minX, nextX)),
    y: Math.min(incenseDragBounds.maxY, Math.max(incenseDragBounds.minY, nextY)),
  };
  event.preventDefault();
}

function releaseHeldIncense(event: PointerEvent) {
  if (incensePointerId !== event.pointerId) return;
  const handle = event.currentTarget as HTMLElement;
  incensePointerId = null;
  incenseHolding.value = false;
  incenseDragOffset.value = { x: 0, y: 0 };
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
}

function persistBurnState() {
  try {
    window.localStorage.setItem(incenseStorageKey, JSON.stringify({
      kind: selectedIncense.value,
      startedAt: burnStartedAt.value,
      endsAt: burnEndsAt.value,
    }));
  } catch {
    // 无法访问本地存储时，仍在本次页面停留期间继续燃烧。
  }
}

function restoreBurnState() {
  try {
    const raw = window.localStorage.getItem(incenseStorageKey);
    if (!raw) return;
    const stored = JSON.parse(raw) as { kind?: IncenseKind; startedAt?: number; endsAt?: number };
    if (!incenseOptions.some((item) => item.key === stored.kind) || !stored.startedAt || !stored.endsAt) return;
    selectedIncense.value = stored.kind as IncenseKind;
    burnStartedAt.value = stored.startedAt;
    burnEndsAt.value = stored.endsAt;
    currentTime.value = Date.now();
    incenseLit.value = stored.endsAt > currentTime.value;
    if (!incenseLit.value) window.localStorage.removeItem(incenseStorageKey);
  } catch {
    // 损坏的本地记录不影响本次上香。
  }
}

function updateBurnClock() {
  currentTime.value = Date.now();
  if (!incenseLit.value || burnEndsAt.value > currentTime.value) return;
  incenseLit.value = false;
  burnStartedAt.value = 0;
  burnEndsAt.value = 0;
  ceremonyMessage.value = '香已燃尽';
  try {
    window.localStorage.removeItem(incenseStorageKey);
  } catch {
    // 本地存储不可用不影响燃尽状态。
  }
}

function persistOfferingState() {
  try {
    window.localStorage.setItem(offeringStorageKey, JSON.stringify(placedOfferingKeys.value));
  } catch {
    // 无法访问本地存储时，供品仍在本次页面停留期间保留。
  }
}

function restoreOfferingState() {
  try {
    const raw = window.localStorage.getItem(offeringStorageKey);
    if (!raw) return;
    const stored = JSON.parse(raw) as unknown;
    if (!Array.isArray(stored)) return;
    const validKeys = new Set(offeringOptions.map((item) => item.key));
    placedOfferingKeys.value = [...new Set(
      stored.filter((key): key is string => typeof key === 'string' && validKeys.has(key)),
    )].slice(0, 10);
  } catch {
    // 损坏的本地记录不影响本次上供。
  }
}

function toggleOffering(key: string) {
  if (placedOfferingKeys.value.includes(key)) {
    placedOfferingKeys.value = placedOfferingKeys.value.filter((item) => item !== key);
    persistOfferingState();
    ceremonyMessage.value = '';
    return;
  }
  if (placedOfferingKeys.value.length >= 10) {
    ceremonyMessage.value = '供桌已摆满，请先撤下一样供品';
    return;
  }
  placedOfferingKeys.value = [...placedOfferingKeys.value, key];
  persistOfferingState();
  const offering = offeringOptions.find((item) => item.key === key);
  ceremonyMessage.value = offering ? `${offering.label}已奉上` : '';
}

function offeringStyle(index: number) {
  const frontSlots = [50, 41, 59, 32, 68];
  const backSlots = [45.5, 54.5, 36.5, 63.5, 50];
  const isBackRow = index >= frontSlots.length;
  return {
    '--offering-bottom': isBackRow ? '39.2%' : '34.4%',
    '--offering-height': isBackRow ? '11.5%' : '13%',
    '--offering-z': isBackRow ? '1' : '2',
    left: `${isBackRow ? backSlots[index - frontSlots.length] : frontSlots[index]}%`,
  };
}

function clearAltar() {
  placedOfferingKeys.value = [];
  try {
    window.localStorage.removeItem(offeringStorageKey);
  } catch {
    // 本地存储不可用不影响整理供桌。
  }
  ceremonyMessage.value = '供桌已整理';
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

onMounted(() => {
  restoreBurnState();
  restoreOfferingState();
  timerId = window.setInterval(updateBurnClock, 1000);
  window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  if (timerId !== undefined) window.clearInterval(timerId);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <UiDialogShell aria-label="三山国王庙上香" size="wide" padding="none" panel-class="temple-dialog" @close="emit('close')">
    <div class="temple-shell">
      <header class="temple-header">
        <div>
          <small>三山国王庙</small>
          <h2>上香祈愿</h2>
        </div>
        <button type="button" aria-label="离开庙堂" title="离开庙堂" @click="emit('close')"><X :size="19" /></button>
      </header>

      <div ref="templeScene" class="temple-scene" aria-label="三山国王庙供桌">
        <div class="temple-lantern-glow temple-lantern-glow--left"></div>
        <div class="temple-lantern-glow temple-lantern-glow--right"></div>
        <img class="temple-deities" src="/ssgw.webp" alt="三山国王神像" />
        <img class="temple-altar" src="/divination-assets/temple/altar.png" alt="三山国王庙供桌" />

        <div class="temple-offerings" aria-live="polite">
          <img
            v-for="(item, index) in placedOfferings"
            :key="item.key"
            class="temple-offering-art"
            :style="offeringStyle(index)"
            :src="item.image"
            :alt="item.label"
            :title="item.label"
          />
        </div>

        <div class="temple-incense" :class="[`is-${selectedIncense}`, { 'is-lit': incenseLit }]">
          <div
            ref="incenseBundle"
            class="temple-incense-bundle"
            :class="{ 'is-holding': incenseHolding }"
            :style="incenseBundleStyle"
          >
            <div v-for="index in 3" :key="index" class="temple-incense-stick" :class="`temple-incense-stick--${index}`">
              <div class="temple-burning-stick" :style="incenseVisualStyle">
                <img class="temple-incense-art" :src="activeIncense.image" :alt="index === 1 ? `三支${activeIncense.label}` : ''" draggable="false" />
                <div v-if="incenseLit" class="temple-burn-head" :style="burnHeadStyle" aria-hidden="true">
                  <span class="temple-ash-cap"></span>
                  <span class="temple-ember"></span>
                  <span v-if="showIgnitionFlame" class="temple-flame"></span>
                  <span
                    v-for="(particle, particleIndex) in smokeParticles[index - 1]"
                    :key="particle.id"
                    class="temple-smoke-particle"
                    :style="particle.style"
                    aria-hidden="true"
                    @animationiteration="refreshSmokeParticle(index - 1, particleIndex)"
                  ></span>
                  <span class="temple-ash-fall temple-ash-fall--one"></span>
                </div>
              </div>
            </div>
            <div
              class="temple-incense-handle"
              role="button"
              tabindex="0"
              aria-label="按住拖动三支香"
              title="按住拖动三支香"
              @pointerdown="startIncenseHold"
              @pointermove="moveHeldIncense"
              @pointerup="releaseHeldIncense"
              @pointercancel="releaseHeldIncense"
              @lostpointercapture="releaseHeldIncense"
            ></div>
          </div>
          <img class="temple-burner" src="/divination-assets/temple/incense-burner.png" alt="香炉" />
        </div>
      </div>

      <div class="temple-controls">
        <section class="temple-control-section">
          <div class="temple-control-heading"><strong>敬香</strong><span>{{ incenseLit ? `剩余 ${burnRemainingLabel}` : '每次敬三支香' }}</span></div>
          <div class="incense-options" role="group" aria-label="选择香型">
            <button
              v-for="item in incenseOptions"
              :key="item.key"
              type="button"
              :class="{ active: selectedIncense === item.key }"
              :aria-pressed="selectedIncense === item.key"
              :disabled="incenseLit"
              @click="chooseIncense(item.key)"
            >
              <img :src="item.image" alt="" />
              <span>{{ item.label }}</span>
              <small>{{ item.durationLabel }}</small>
            </button>
          </div>
          <UiButton block :disabled="incenseLit" @click="lightIncense"><Flame :size="16" />{{ incenseLit ? `燃烧中 ${burnRemainingLabel}` : '点燃三支香' }}</UiButton>
        </section>

        <section class="temple-control-section">
          <div class="temple-control-heading"><strong>供品</strong><span>点击奉上或撤下</span></div>
          <div class="offering-options" role="group" aria-label="选择供品">
            <button
              v-for="item in offeringOptions"
              :key="item.key"
              type="button"
              :class="{ active: placedOfferingKeys.includes(item.key) }"
              :aria-pressed="placedOfferingKeys.includes(item.key)"
              @click="toggleOffering(item.key)"
            >
              <img class="offering-sprite" :src="item.image" alt="" />
              <small>{{ item.label }}</small>
            </button>
          </div>
        </section>
      </div>

      <footer class="temple-footer">
        <span aria-live="polite">{{ ceremonyMessage || '心诚意敬' }}</span>
        <UiButton variant="ghost" size="small" @click="clearAltar"><RotateCcw :size="14" />整理供桌</UiButton>
      </footer>
    </div>
  </UiDialogShell>
</template>

<style scoped>
:global(.ui-dialog-layer:has(.temple-dialog)) { background: rgba(18, 5, 5, .78); z-index: 80; }
:global(.temple-dialog) { background: #1b0808; border-color: rgba(214, 164, 71, .45); overflow: hidden; }
.temple-shell { background: linear-gradient(180deg, #280b0a, #150707); color: #f8dfaa; }
.temple-header { align-items: center; background: linear-gradient(90deg, rgba(89, 12, 8, .94), rgba(48, 8, 7, .94)); border-bottom: 1px solid rgba(226, 175, 77, .32); display: flex; justify-content: space-between; padding: 14px 18px; }
.temple-header div { display: grid; gap: 1px; }
.temple-header small { color: #d3a85b; font-size: 10px; letter-spacing: .2em; }
.temple-header h2 { color: #fff2ce; font-family: 'STKaiti', 'KaiTi', serif; font-size: 22px; font-weight: 600; letter-spacing: .08em; margin: 0; }
.temple-header > button { align-items: center; background: rgba(255, 244, 215, .08); border: 1px solid rgba(229, 189, 111, .25); border-radius: 9px; color: #efd59c; display: flex; height: 36px; justify-content: center; width: 36px; }
.temple-header > button:hover { background: rgba(255, 244, 215, .14); }
.temple-scene { aspect-ratio: 4 / 3; background: radial-gradient(circle at 50% 28%, rgba(205, 76, 25, .3), transparent 33%), linear-gradient(#210707, #090303); isolation: isolate; margin: 0 auto; max-height: 58dvh; overflow: hidden; position: relative; width: 100%; }
.temple-scene::after { background: linear-gradient(90deg, rgba(10, 1, 1, .34), transparent 22%, transparent 78%, rgba(10, 1, 1, .34)), linear-gradient(transparent 62%, rgba(9, 2, 2, .3)); content: ''; inset: 0; pointer-events: none; position: absolute; z-index: 7; }
.temple-lantern-glow { background: radial-gradient(circle, rgba(255, 188, 64, .26), transparent 66%); filter: blur(5px); height: 34%; position: absolute; top: 22%; width: 20%; z-index: 0; }
.temple-lantern-glow--left { left: 2%; }
.temple-lantern-glow--right { right: 2%; }
.temple-altar { height: 100%; inset: 0; object-fit: contain; position: absolute; width: 100%; z-index: 2; }
.temple-deities { border: 2px solid rgba(221, 170, 69, .78); box-shadow: 0 0 28px rgba(215, 86, 24, .4); height: 29%; left: 50%; object-fit: cover; object-position: center 35%; position: absolute; top: 24%; transform: translateX(-50%); width: 45%; z-index: 7; }
.temple-offerings { inset: 0; position: absolute; z-index: 4; }
.temple-offering-art { bottom: var(--offering-bottom); filter: drop-shadow(0 5px 5px rgba(24, 3, 2, .45)); height: var(--offering-height); object-fit: contain; object-position: center bottom; position: absolute; transform: translateX(-50%); transition: left .3s ease, bottom .3s ease, height .3s ease, opacity .2s ease, transform .3s ease; width: 14%; z-index: var(--offering-z); }
.temple-incense { inset: 0; pointer-events: none; position: absolute; z-index: 6; }
.temple-incense-bundle { inset: 0; pointer-events: none; position: absolute; transition: transform .48s cubic-bezier(.2, .88, .25, 1.12); will-change: transform; z-index: 4; }
.temple-incense-bundle.is-holding { transition: none; }
.temple-incense-handle { background: transparent; bottom: 16%; cursor: grab; height: 25.5%; left: 42%; outline: none; pointer-events: auto; position: absolute; touch-action: none; width: 16%; z-index: 9; }
.temple-incense-handle:active { cursor: grabbing; }
.temple-incense-handle:focus-visible { border: 1px solid rgba(255, 222, 147, .62); border-radius: 45% 45% 12px 12px; box-shadow: 0 0 0 3px rgba(255, 191, 78, .12); }
.temple-incense-stick { --ash-delay: 0s; --insert-cut: 13.7%; bottom: 16%; height: 25.5%; left: 50%; position: absolute; transform: translateX(-50%) rotate(var(--stick-angle, 0deg)); transform-origin: 50% 100%; width: 15%; z-index: 4; }
.temple-incense-stick::after { background: rgba(49, 27, 16, .58); border-radius: 50%; bottom: calc(var(--insert-cut) - 1px); box-shadow: 0 1px 2px rgba(236, 218, 183, .28); content: ''; height: 3px; left: 50%; position: absolute; transform: translateX(-50%); width: 6px; z-index: 6; }
.temple-incense-stick--1 { left: 48.7%; --ash-delay: 0s; --stick-angle: -1.8deg; }
.temple-incense-stick--2 { --ash-delay: -12s; }
.temple-incense-stick--3 { left: 51.3%; --ash-delay: -24s; --stick-angle: 1.8deg; }
.temple-incense.is-medium .temple-incense-stick--1 { left: 48.1%; }
.temple-incense.is-medium .temple-incense-stick--3 { left: 51.9%; }
.temple-incense.is-medium .temple-incense-stick::after { width: 8px; }
.temple-incense.is-large .temple-incense-stick--1 { left: 45.5%; --stick-angle: -1deg; }
.temple-incense.is-large .temple-incense-stick--3 { left: 54.5%; --stick-angle: 1deg; }
.temple-incense.is-large .temple-incense-stick::after { height: 4px; width: 11px; }
.temple-burning-stick { bottom: 0; height: 100%; left: 0; position: absolute; width: 100%; }
.temple-incense-art { clip-path: inset(var(--burn-cut, 0%) 0 var(--insert-cut)); height: 100%; inset: 0; object-fit: contain; position: absolute; transition: clip-path 1s linear; width: 100%; z-index: 2; }
.temple-burn-head { height: 0; left: 0; position: absolute; transition: top 1s linear; width: 100%; z-index: 5; }
.temple-burner { bottom: 1.5%; filter: drop-shadow(0 6px 8px rgba(18, 2, 2, .55)); height: 28%; left: 50%; object-fit: contain; position: absolute; transform: translateX(-50%); width: 24%; z-index: 3; }
.temple-ash-cap { animation: temple-ash-form 36s ease-in-out var(--ash-delay) infinite; background: linear-gradient(90deg, #8f8880, #ded9cf 48%, #827a72); border-radius: 5px 5px 2px 2px; bottom: -1px; box-shadow: 0 -2px 3px rgba(224, 218, 207, .24); height: 8px; left: 50%; position: absolute; transform: translateX(-50%); transform-origin: 50% 100%; width: 4px; z-index: 5; }
.is-medium .temple-ash-cap { height: 10px; width: 6px; }
.is-large .temple-ash-cap { height: 13px; width: 12px; }
.temple-ember { animation: temple-ember 3.2s ease-in-out infinite alternate; background: #ff6a20; border-radius: 50%; box-shadow: 0 0 7px #ff7228, 0 0 14px rgba(255, 80, 15, .72); height: 4px; left: 50%; position: absolute; top: -2px; transform: translateX(-50%); width: 5px; z-index: 7; }
.is-medium .temple-ember { height: 5px; width: 7px; }
.is-large .temple-ember { height: 7px; top: -3px; width: 12px; }
.temple-flame { animation: temple-flame 2.4s ease-in-out infinite alternate; background: #ffe691; border-radius: 50% 50% 50% 12%; box-shadow: 0 0 8px #ff9d2e, 0 0 18px rgba(255, 96, 20, .75); height: 9px; left: 50%; position: absolute; top: -10px; transform: translateX(-50%) rotate(45deg); width: 8px; z-index: 6; }
.is-large .temple-flame { height: 13px; top: -14px; width: 11px; }
.temple-smoke-particle { animation: temple-smoke-random var(--smoke-duration) ease-out var(--smoke-delay) infinite; background: rgba(235, 231, 222, .48); border-radius: 48% 52% 55% 45%; filter: blur(var(--smoke-blur)); height: var(--smoke-height); left: calc(50% + var(--smoke-start-x)); opacity: 0; position: absolute; top: -17px; width: var(--smoke-width); z-index: 3; }
.temple-ash-fall { animation: temple-ash-fall-right 36s ease-in var(--ash-delay) infinite; background: #c8c0b5; border-radius: 50%; height: 2px; left: 50%; opacity: 0; position: absolute; top: -4px; width: 2px; z-index: 6; }
@keyframes temple-flame { from { transform: translateX(-50%) rotate(43deg) scale(.84); } to { transform: translateX(-50%) rotate(49deg) scale(1.14); } }
@keyframes temple-ember { from { opacity: .78; } to { opacity: 1; transform: translateX(-50%) scale(1.08); } }
@keyframes temple-ash-form { 0%, 12% { opacity: .35; transform: translateX(-50%) scaleY(.22); } 68% { opacity: 1; transform: translateX(-50%) scaleY(1); } 74%, 100% { opacity: .2; transform: translateX(-50%) scaleY(.28); } }
@keyframes temple-smoke-random {
  0% { opacity: 0; transform: translate(-50%, 3px) rotate(0) scale(.36); }
  10% { opacity: var(--smoke-opacity); }
  32% { opacity: .42; transform: translate(calc(-50% + var(--smoke-drift-1)), var(--smoke-rise-1)) rotate(var(--smoke-rotate)) scale(.72); }
  63% { opacity: .25; transform: translate(calc(-50% + var(--smoke-drift-2)), var(--smoke-rise-2)) rotate(calc(var(--smoke-rotate) * -.6)) scale(1.04); }
  100% { opacity: 0; transform: translate(calc(-50% + var(--smoke-drift-3)), var(--smoke-rise-3)) rotate(calc(var(--smoke-rotate) * 1.4)) scale(var(--smoke-scale)); }
}
@keyframes temple-ash-fall-right { 0%, 68% { opacity: 0; transform: translate(0, 0); } 73% { opacity: .75; } 100% { opacity: 0; transform: translate(9px, 31px) rotate(165deg); } }
@keyframes temple-ash-fall-left { 0%, 68% { opacity: 0; transform: translate(0, 0); } 73% { opacity: .68; } 100% { opacity: 0; transform: translate(-7px, 28px) rotate(-145deg); } }
.temple-controls { border-top: 1px solid rgba(229, 184, 96, .2); display: grid; gap: 1px; grid-template-columns: .82fr 1.18fr; }
.temple-control-section { background: rgba(255, 242, 209, .035); padding: 14px 16px 16px; }
.temple-control-section + .temple-control-section { border-left: 1px solid rgba(229, 184, 96, .16); }
.temple-control-heading { align-items: baseline; display: flex; justify-content: space-between; margin-bottom: 10px; }
.temple-control-heading strong { color: #f4d79a; font-size: 13px; letter-spacing: .08em; }
.temple-control-heading span { color: rgba(239, 213, 156, .58); font-size: 10px; }
.incense-options { display: grid; gap: 7px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 10px; }
.incense-options button, .offering-options button { background: rgba(255, 250, 232, .055); border: 1px solid rgba(224, 180, 96, .18); border-radius: 9px; color: rgba(248, 223, 170, .72); min-width: 0; }
.incense-options button { align-items: center; display: flex; flex-direction: column; gap: 1px; height: 81px; justify-content: flex-end; padding: 5px 6px; }
.incense-options button img { height: 43px; object-fit: contain; width: 32px; }
.incense-options button span { font-size: 10px; }
.incense-options button small { color: rgba(239, 213, 156, .5); font-size: 8px; }
.incense-options button:disabled { cursor: not-allowed; opacity: .62; }
.incense-options button.active, .offering-options button.active { background: rgba(175, 48, 22, .24); border-color: rgba(244, 191, 86, .68); box-shadow: inset 0 0 15px rgba(221, 103, 32, .1); color: #ffe2a1; }
.temple-control-section :deep(.ui-button--primary) { background: #8d2818; border-color: #b4512d; color: #ffefc8; }
.temple-control-section :deep(.ui-button--primary:hover:not(:disabled)) { background: #a9361e; border-color: #d17845; }
.offering-options { display: grid; gap: 6px; grid-template-columns: repeat(6, minmax(0, 1fr)); }
.offering-options button { display: grid; gap: 2px; justify-items: center; padding: 3px 3px 5px; }
.offering-options small { font-size: 9px; }
.offering-sprite { display: block; height: 48px; object-fit: contain; width: min(100%, 62px); }
.temple-footer { align-items: center; border-top: 1px solid rgba(229, 184, 96, .16); display: flex; justify-content: space-between; min-height: 48px; padding: 8px 16px; }
.temple-footer > span { color: rgba(246, 218, 157, .68); font-size: 11px; letter-spacing: .04em; }
.temple-footer :deep(.ui-button--ghost) { color: rgba(246, 218, 157, .72); }
.temple-footer :deep(.ui-button--ghost:hover:not(:disabled)) { background: rgba(255, 242, 209, .08); border-color: rgba(229, 184, 96, .2); color: #ffe5ad; }
@media (max-width: 720px) {
  :global(.ui-dialog-layer:has(.temple-dialog)) { align-items: center; padding: 0; }
  :global(.temple-dialog) { -webkit-overflow-scrolling: touch; border: 0; border-radius: 0; height: 100dvh; max-height: 100dvh; overflow-y: auto; overscroll-behavior-y: contain; }
  .temple-shell { min-height: 100%; }
  .temple-header { padding: max(11px, env(safe-area-inset-top)) 13px 10px; }
  .temple-header h2 { font-size: 18px; }
  .temple-scene { max-height: none; }
  .temple-deities { height: 30%; top: 23%; width: 47%; }
  .temple-offering-art { width: 15%; }
  .temple-burner { bottom: 1%; height: 27%; width: 27%; }
  .temple-controls { grid-template-columns: 1fr; }
  .temple-control-section { padding: 10px 12px 12px; }
  .temple-control-section + .temple-control-section { border-left: 0; border-top: 1px solid rgba(229, 184, 96, .16); }
  .incense-options button { height: 65px; }
  .incense-options button img { height: 30px; }
  .offering-options { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .offering-sprite { height: 37px; width: min(100%, 48px); }
  .temple-footer { padding: 7px 12px max(7px, env(safe-area-inset-bottom)); }
}
@media (max-width: 380px) {
  .temple-header { padding-block: 8px; }
  .temple-control-heading { margin-bottom: 6px; }
  .incense-options { margin-bottom: 7px; }
  .incense-options button { height: 54px; }
  .incense-options button img { height: 25px; }
  .temple-control-section { padding-block: 8px; }
  .offering-options button { padding-block: 2px 3px; }
  .offering-sprite { height: 31px; width: 40px; }
}
@media (prefers-reduced-motion: reduce) {
  .temple-incense-bundle { transition-duration: .01ms; }
  .temple-flame, .temple-smoke-particle, .temple-ember, .temple-ash-cap, .temple-ash-fall { animation: none; }
  .temple-smoke-particle { opacity: .22; transform: translate(-50%, -16px); }
}
</style>
