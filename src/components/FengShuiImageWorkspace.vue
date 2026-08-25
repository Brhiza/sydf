<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Check, Compass, Copy, Download, FileText, ImageUp, Move, RotateCcw, Trash2, Upload } from 'lucide-vue-next';
import { UiButton, UiSelect } from './ui';

const props = withDefaults(defineProps<{
  residentBaziPrompt?: string;
}>(), {
  residentBaziPrompt: '',
});

type PlanDirection = 'unknown' | 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest';

interface FengShuiImageState {
  version: 1;
  imageName: string;
  imageWidth: number;
  imageHeight: number;
  compassCenterX: number;
  compassCenterY: number;
  compassSize: number;
  compassOpacity: number;
  topDirection: PlanDirection;
  fineAngle: number;
  title: string;
  location: string;
  floor: string;
  builtYear: string;
  facing: string;
  residents: string;
  exterior: string;
  knownFacts: string;
  focus: string;
}

const META_STORAGE_KEY = 'shiyue-feng-shui-image-workspace-v1';
const IMAGE_DB_NAME = 'shiyue-feng-shui-assets';
const IMAGE_STORE_NAME = 'floor-plans';
const IMAGE_RECORD_KEY = 'current';
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const EXPORT_MAX_EDGE = 6000;

const directionOptions: Array<{ value: PlanDirection; label: string; rotation: number }> = [
  { value: 'unknown', label: '请选择图纸上方朝向', rotation: 0 },
  { value: 'north', label: '北', rotation: 0 },
  { value: 'northeast', label: '东北', rotation: -45 },
  { value: 'east', label: '东', rotation: -90 },
  { value: 'southeast', label: '东南', rotation: -135 },
  { value: 'south', label: '南', rotation: 180 },
  { value: 'southwest', label: '西南', rotation: 135 },
  { value: 'west', label: '西', rotation: 90 },
  { value: 'northwest', label: '西北', rotation: 45 },
];

const mountainLabels = ['子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳', '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥', '壬'];
const sectorLabels = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
const trigramLabels = ['坎', '艮', '震', '巽', '离', '坤', '兑', '乾'];

function createDefaultState(): FengShuiImageState {
  return {
    version: 1,
    imageName: '',
    imageWidth: 0,
    imageHeight: 0,
    compassCenterX: 50,
    compassCenterY: 50,
    compassSize: 58,
    compassOpacity: 76,
    topDirection: 'unknown',
    fineAngle: 0,
    title: '',
    location: '',
    floor: '',
    builtYear: '',
    facing: '',
    residents: '',
    exterior: '',
    knownFacts: '',
    focus: '',
  };
}

const state = ref<FengShuiImageState>(createDefaultState());
const fileInputRef = ref<HTMLInputElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
const compassSvgRef = ref<SVGSVGElement | null>(null);
const imageUrl = ref('');
const stageSize = ref({ width: 0, height: 0 });
const uploadMessage = ref('');
const uploadMessageType = ref<'info' | 'error' | 'success'>('info');
const isDraggingFile = ref(false);
const isExporting = ref(false);
const copied = ref(false);
let isReady = false;
let resizeObserver: ResizeObserver | null = null;
let activeCompassPointer: number | null = null;
let copyTimer: number | undefined;

const hasImage = computed(() => Boolean(imageUrl.value && state.value.imageWidth && state.value.imageHeight));
const canGenerate = computed(() => hasImage.value && state.value.topDirection !== 'unknown');
const selectedDirection = computed(() => directionOptions.find((item) => item.value === state.value.topDirection) || directionOptions[0]);
const compassRotation = computed(() => selectedDirection.value.rotation + state.value.fineAngle);
const renderedCompassSize = computed(() => Math.max(80, Math.min(stageSize.value.width, stageSize.value.height) * state.value.compassSize / 100));
const compassStyle = computed(() => ({
  left: `${state.value.compassCenterX}%`,
  top: `${state.value.compassCenterY}%`,
  width: `${renderedCompassSize.value}px`,
  opacity: state.value.compassOpacity / 100,
  transform: `translate(-50%, -50%) rotate(${compassRotation.value}deg)`,
}));

const promptText = computed(() => {
  const direction = state.value.topDirection === 'unknown' ? '尚未确认，不得根据图面擅自猜测' : selectedDirection.value.label;
  const adjustment = state.value.fineAngle === 0
    ? '0°（未微调）'
    : `${state.value.fineAngle > 0 ? '顺时针' : '逆时针'} ${Math.abs(state.value.fineAngle)}°`;
  const focus = state.value.focus.trim() || '请综合分析空间布局、居住动线、采光通风，以及传统居家风水中值得优先核实和调整的部分。';
  const residenceDetails = [
    ['户型/住宅名称', state.value.title],
    ['所在地区', state.value.location],
    ['楼层情况', state.value.floor],
    ['建成年份或最近大修年份', state.value.builtYear],
    ['已知坐向、大门朝向或测量信息', state.value.facing],
    ['常住者与主要使用需求', state.value.residents],
    ['外部道路、楼栋、水体、高差等环境', state.value.exterior],
    ['图中不易看出的已知事实', state.value.knownFacts],
  ].flatMap(([label, value]) => value.trim() ? [`- ${label}：${value.trim()}`] : []);

  return [
    '你是一名谨慎的住宅空间与传统居家风水分析助手。请查看我随消息附上的“带罗盘户型图”，并结合下列资料完成解读。',
    '',
    '【罗盘校准】',
    `- 图纸上方朝向：${direction}`,
    `- 罗盘角度微调：${adjustment}`,
    `- 罗盘中心位于图片横向 ${state.value.compassCenterX.toFixed(1)}%、纵向 ${state.value.compassCenterY.toFixed(1)}%；这是用户在图上校准的位置。`,
    '- 罗盘外圈标有八方，内圈标有二十四山。请以图片中实际叠加后的罗盘为准，不要另行旋转或镜像户型图。',
    ...(residenceDetails.length ? ['', '【住宅资料】', ...residenceDetails] : []),
    ...(props.residentBaziPrompt ? ['', props.residentBaziPrompt] : []),
    '',
    '【本次重点】',
    focus,
    '',
    '【回答要求】',
    '1. 先列出你能从图片和资料中确认的事实，再单独列出看不清、无法确认或需要补充的信息。',
    '2. 不要虚构房间用途、门窗位置、尺寸、外部环境或精确坐向；图像模糊处请直接说明。',
    '3. 先分析实际动线、采光、通风、隐私和日常使用，再提供传统居家风水角度的参考，两者要明确分开。',
    '4. 按“优先处理 / 有条件再调 / 暂不需要处理”给出建议，并说明每项建议依据。',
    '5. 未提供的结构与施工条件不得作为判断依据，也不要臆测改造可行性。',
  ].join('\n');
});

onMounted(async () => {
  restoreMetadata();
  try {
    const blob = await readStoredImage();
    if (blob) {
      await showImageBlob(blob, state.value.imageName || '已保存的户型图', false);
    } else {
      state.value.imageName = '';
      state.value.imageWidth = 0;
      state.value.imageHeight = 0;
    }
  } catch {
    showUploadMessage('上次保存的图片无法读取，可以重新上传。', 'error');
  }
  isReady = true;
});

watch(state, () => {
  if (!isReady) return;
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(state.value));
  } catch {
    showUploadMessage('当前设置无法保存在浏览器中，但本次仍可继续使用。', 'error');
  }
}, { deep: true });

watch(stageRef, () => {
  void nextTick(observeStage);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  if (copyTimer) window.clearTimeout(copyTimer);
});

function normalizeNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function restoreMetadata() {
  try {
    const stored = localStorage.getItem(META_STORAGE_KEY);
    if (!stored) return;
    const source = JSON.parse(stored) as Partial<FengShuiImageState>;
    const defaults = createDefaultState();
    const textValue = (value: unknown, maximum: number) => typeof value === 'string' ? value.slice(0, maximum) : '';
    state.value = {
      ...defaults,
      ...source,
      version: 1,
      imageName: typeof source.imageName === 'string' ? source.imageName.slice(0, 180) : '',
      imageWidth: normalizeNumber(source.imageWidth, 0, 0, 100000),
      imageHeight: normalizeNumber(source.imageHeight, 0, 0, 100000),
      compassCenterX: normalizeNumber(source.compassCenterX, 50, 0, 100),
      compassCenterY: normalizeNumber(source.compassCenterY, 50, 0, 100),
      compassSize: normalizeNumber(source.compassSize, 58, 18, 95),
      compassOpacity: normalizeNumber(source.compassOpacity, 76, 20, 100),
      topDirection: directionOptions.some((item) => item.value === source.topDirection) ? source.topDirection as PlanDirection : 'unknown',
      fineAngle: normalizeNumber(source.fineAngle, 0, -22.5, 22.5),
      title: textValue(source.title, 60),
      location: textValue(source.location, 80),
      floor: textValue(source.floor, 100),
      builtYear: textValue(source.builtYear, 100),
      facing: textValue(source.facing, 500),
      residents: textValue(source.residents, 800),
      exterior: textValue(source.exterior, 1000),
      knownFacts: textValue(source.knownFacts, 1200),
      focus: textValue(source.focus, 1600),
    };
  } catch {
    state.value = createDefaultState();
    showUploadMessage('上次保存的设置无法读取，已恢复默认值。', 'error');
  }
}

function showUploadMessage(message: string, type: 'info' | 'error' | 'success' = 'info') {
  uploadMessage.value = message;
  uploadMessageType.value = type;
}

function openFilePicker() {
  fileInputRef.value?.click();
}

function onFileInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) void acceptImageFile(file);
}

function onFileDrop(event: DragEvent) {
  isDraggingFile.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) void acceptImageFile(file);
}

function fileTypeSupported(file: File) {
  if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type.toLowerCase())) return true;
  return /\.(png|jpe?g|webp)$/i.test(file.name);
}

async function acceptImageFile(file: File) {
  uploadMessage.value = '';
  if (!fileTypeSupported(file)) {
    showUploadMessage('请选择 PNG、JPEG 或 WebP 户型图片。', 'error');
    return;
  }
  if (!file.size) {
    showUploadMessage('这张图片没有可读取的内容。', 'error');
    return;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    showUploadMessage('图片超过 50MB，请先使用原应用导出为 PNG、JPEG 或 WebP 后再上传。', 'error');
    return;
  }
  try {
    await showImageBlob(file, file.name, true);
    showUploadMessage('户型图已载入。拖动罗盘中心并校准方向即可。', 'success');
  } catch {
    showUploadMessage('浏览器无法解析这张图片，请换用有效的 PNG、JPEG 或 WebP 文件。', 'error');
  }
}

async function showImageBlob(blob: Blob, name: string, persist: boolean) {
  const nextUrl = URL.createObjectURL(blob);
  try {
    const dimensions = await readImageDimensions(nextUrl);
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
    imageUrl.value = nextUrl;
    state.value.imageName = name.slice(0, 180);
    state.value.imageWidth = dimensions.width;
    state.value.imageHeight = dimensions.height;
    if (persist) {
      state.value.compassCenterX = 50;
      state.value.compassCenterY = 50;
      state.value.topDirection = 'unknown';
      state.value.fineAngle = 0;
      try {
        await storeImage(blob);
      } catch {
        showUploadMessage('图片已载入，但浏览器未能长期保存；刷新后可能需要重新上传。', 'error');
      }
    }
    await nextTick();
    observeStage();
    clampCompassPosition();
  } catch (error) {
    URL.revokeObjectURL(nextUrl);
    throw error;
  }
}

function readImageDimensions(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth && image.naturalHeight
      ? resolve({ width: image.naturalWidth, height: image.naturalHeight })
      : reject(new Error('图片尺寸无效'));
    image.onerror = () => reject(new Error('图片解码失败'));
    image.src = url;
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片解码失败'));
    image.src = url;
  });
}

function observeStage() {
  resizeObserver?.disconnect();
  const element = stageRef.value;
  if (!element) return;
  const update = () => {
    const bounds = element.getBoundingClientRect();
    stageSize.value = { width: bounds.width, height: bounds.height };
    clampCompassPosition();
  };
  update();
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);
  }
}

function compassHalfPercent() {
  if (!stageSize.value.width || !stageSize.value.height) return { x: 0, y: 0 };
  return {
    x: renderedCompassSize.value / stageSize.value.width * 50,
    y: renderedCompassSize.value / stageSize.value.height * 50,
  };
}

function clampCompassPosition() {
  const half = compassHalfPercent();
  state.value.compassCenterX = normalizeNumber(state.value.compassCenterX, 50, half.x, 100 - half.x);
  state.value.compassCenterY = normalizeNumber(state.value.compassCenterY, 50, half.y, 100 - half.y);
}

function startCompassDrag(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  activeCompassPointer = event.pointerId;
  (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  moveCompass(event);
}

function moveCompass(event: PointerEvent) {
  if (activeCompassPointer !== event.pointerId || !stageRef.value) return;
  const bounds = stageRef.value.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const half = compassHalfPercent();
  state.value.compassCenterX = normalizeNumber((event.clientX - bounds.left) / bounds.width * 100, 50, half.x, 100 - half.x);
  state.value.compassCenterY = normalizeNumber((event.clientY - bounds.top) / bounds.height * 100, 50, half.y, 100 - half.y);
}

function finishCompassDrag(event: PointerEvent) {
  if (activeCompassPointer !== event.pointerId) return;
  moveCompass(event);
  activeCompassPointer = null;
}

function resetCompass() {
  state.value.compassCenterX = 50;
  state.value.compassCenterY = 50;
  state.value.compassSize = 58;
  state.value.compassOpacity = 76;
  state.value.fineAngle = 0;
  clampCompassPosition();
  showUploadMessage('罗盘位置和显示已复位，图纸上方朝向保持不变。');
}

function compassPoint(index: number, total: number, radius: number, offset = -90) {
  const angle = (offset + index * 360 / total) * Math.PI / 180;
  return { x: 200 + Math.cos(angle) * radius, y: 200 + Math.sin(angle) * radius };
}

function mountainBoundary(index: number, radius: number) {
  return compassPoint(index, 24, radius, -97.5);
}

async function removeImage() {
  if (!hasImage.value) return;
  if (!window.confirm('移除当前上传的户型图？已填写的住宅资料会保留。')) return;
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
  imageUrl.value = '';
  state.value.imageName = '';
  state.value.imageWidth = 0;
  state.value.imageHeight = 0;
  stageSize.value = { width: 0, height: 0 };
  resizeObserver?.disconnect();
  try {
    await deleteStoredImage();
  } catch {
    showUploadMessage('图片已从页面移除，但浏览器中的旧缓存未能清理。', 'error');
    return;
  }
  showUploadMessage('户型图已移除，住宅资料仍然保留。', 'success');
}

async function copyPrompt() {
  if (!canGenerate.value) {
    showUploadMessage('请先确认图纸上方朝向。', 'error');
    return;
  }
  try {
    await navigator.clipboard.writeText(promptText.value);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = promptText.value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copiedByFallback = document.execCommand('copy');
    textarea.remove();
    if (!copiedByFallback) {
      showUploadMessage('提示词复制失败，请展开提示词后手动复制。', 'error');
      return;
    }
  }
  copied.value = true;
  showUploadMessage('提示词已复制。请把合成图和提示词一起发给支持图片的 AI。', 'success');
  if (copyTimer) window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => { copied.value = false; }, 1800);
}

async function exportComposite() {
  if (!canGenerate.value || !compassSvgRef.value) {
    showUploadMessage('请先确认图纸上方朝向。', 'error');
    return;
  }
  isExporting.value = true;
  try {
    const source = await loadImage(imageUrl.value);
    const scale = Math.min(1, EXPORT_MAX_EDGE / Math.max(source.naturalWidth, source.naturalHeight));
    const width = Math.max(1, Math.round(source.naturalWidth * scale));
    const height = Math.max(1, Math.round(source.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('浏览器不支持图片合成');
    context.drawImage(source, 0, 0, width, height);

    const compass = compassSvgRef.value.cloneNode(true) as SVGSVGElement;
    compass.removeAttribute('style');
    compass.removeAttribute('class');
    compass.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    compass.setAttribute('width', '400');
    compass.setAttribute('height', '400');
    const compassBlob = new Blob([new XMLSerializer().serializeToString(compass)], { type: 'image/svg+xml;charset=utf-8' });
    const compassUrl = URL.createObjectURL(compassBlob);
    try {
      const compassImage = await loadImage(compassUrl);
      const diameter = Math.min(width, height) * state.value.compassSize / 100;
      const centerX = width * state.value.compassCenterX / 100;
      const centerY = height * state.value.compassCenterY / 100;
      context.save();
      context.translate(centerX, centerY);
      context.rotate(compassRotation.value * Math.PI / 180);
      context.globalAlpha = state.value.compassOpacity / 100;
      context.drawImage(compassImage, -diameter / 2, -diameter / 2, diameter, diameter);
      context.restore();
    } finally {
      URL.revokeObjectURL(compassUrl);
    }

    const output = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('图片导出失败')), 'image/png');
    });
    const downloadUrl = URL.createObjectURL(output);
    const anchor = document.createElement('a');
    const baseName = (state.value.title.trim() || state.value.imageName.replace(/\.[^.]+$/, '') || '户型图').replace(/[\\/:*?"<>|]+/g, '-');
    anchor.href = downloadUrl;
    anchor.download = `${baseName}-带罗盘.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    const resized = scale < 1 ? `为保证浏览器稳定，已等比导出为 ${width}×${height}。` : '';
    showUploadMessage(`合成图已下载。${resized}`, 'success');
  } catch (error) {
    showUploadMessage(error instanceof Error ? error.message : '合成图导出失败，请稍后重试。', 'error');
  } finally {
    isExporting.value = false;
  }
}

function openImageDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGE_STORE_NAME)) request.result.createObjectStore(IMAGE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('浏览器存储不可用'));
  });
}

async function runImageStoreRequest<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  if (typeof indexedDB === 'undefined') throw new Error('浏览器存储不可用');
  const database = await openImageDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE_NAME, mode);
    const request = action(transaction.objectStore(IMAGE_STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('浏览器存储失败'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error('浏览器存储失败'));
    };
  });
}

function storeImage(blob: Blob) {
  return runImageStoreRequest('readwrite', (store) => store.put(blob, IMAGE_RECORD_KEY));
}

function readStoredImage() {
  return runImageStoreRequest<Blob | undefined>('readonly', (store) => store.get(IMAGE_RECORD_KEY));
}

function deleteStoredImage() {
  return runImageStoreRequest('readwrite', (store) => store.delete(IMAGE_RECORD_KEY));
}
</script>

<template>
  <section class="fs-image-workspace">
    <input ref="fileInputRef" class="fs-hidden-input" type="file" accept="image/png,image/jpeg,image/webp" @change="onFileInput" />

    <div v-if="!hasImage" class="fs-upload-card">
      <div
        class="fs-drop-zone"
        :class="{ 'is-dragging': isDraggingFile }"
        role="button"
        tabindex="0"
        aria-label="上传户型图"
        @click="openFilePicker"
        @keydown.enter.prevent="openFilePicker"
        @keydown.space.prevent="openFilePicker"
        @dragenter.prevent="isDraggingFile = true"
        @dragover.prevent="isDraggingFile = true"
        @dragleave.prevent="isDraggingFile = false"
        @drop.prevent="onFileDrop"
      >
        <span class="fs-upload-icon"><ImageUp :size="26" /></span>
        <strong>上传户型图</strong>
        <span>选择或拖入 PNG、JPEG、WebP 图片，最大 50MB</span>
        <UiButton class="fs-upload-action" size="small" @click.stop="openFilePicker"><Upload :size="15" />选择图片</UiButton>
      </div>
      <p>图片只保存在当前浏览器中，不会发送给内置 AI。</p>
    </div>

    <template v-else>
      <div class="fs-image-toolbar">
        <div><strong>{{ state.imageName }}</strong><span>{{ state.imageWidth }}×{{ state.imageHeight }} 像素</span></div>
        <div>
          <UiButton variant="secondary" size="small" @click="openFilePicker"><Upload :size="14" />更换图片</UiButton>
          <UiButton variant="danger" size="small" @click="removeImage"><Trash2 :size="14" />移除</UiButton>
        </div>
      </div>

      <div class="fs-workbench">
        <section class="fs-stage-panel" aria-label="户型图罗盘校准区">
          <div ref="stageRef" class="fs-image-stage" :style="{ aspectRatio: `${state.imageWidth} / ${state.imageHeight}` }">
            <img :src="imageUrl" alt="已上传的住宅户型图" draggable="false" />
            <svg
              ref="compassSvgRef"
              class="fs-compass-overlay"
              :style="compassStyle"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 400 400"
              role="img"
              aria-label="可拖动的二十四山罗盘"
              @pointerdown="startCompassDrag"
              @pointermove="moveCompass"
              @pointerup="finishCompassDrag"
              @pointercancel="finishCompassDrag"
            >
              <circle cx="200" cy="200" r="197" fill="#fffdf8" fill-opacity="0.92" stroke="#6d4b59" stroke-width="4" />
              <circle cx="200" cy="200" r="178" fill="none" stroke="#866774" stroke-width="1.5" />
              <circle cx="200" cy="200" r="151" fill="none" stroke="#866774" stroke-width="1.5" />
              <circle cx="200" cy="200" r="124" fill="#f6eee5" fill-opacity="0.72" stroke="#866774" stroke-width="1.5" />
              <g v-for="(_, index) in mountainLabels" :key="`line-${index}`">
                <line
                  :x1="mountainBoundary(index, 151).x"
                  :y1="mountainBoundary(index, 151).y"
                  :x2="mountainBoundary(index, 178).x"
                  :y2="mountainBoundary(index, 178).y"
                  stroke="#9b7e86"
                  stroke-width="1"
                />
              </g>
              <g v-for="(label, index) in mountainLabels" :key="label">
                <text
                  :x="compassPoint(index, 24, 164).x"
                  :y="compassPoint(index, 24, 164).y"
                  fill="#49343d"
                  font-family="Microsoft YaHei, PingFang SC, sans-serif"
                  font-size="13"
                  font-weight="600"
                  text-anchor="middle"
                  dominant-baseline="central"
                >{{ label }}</text>
              </g>
              <g v-for="(label, index) in sectorLabels" :key="label">
                <line
                  :x1="compassPoint(index, 8, 124, -112.5).x"
                  :y1="compassPoint(index, 8, 124, -112.5).y"
                  :x2="compassPoint(index, 8, 151, -112.5).x"
                  :y2="compassPoint(index, 8, 151, -112.5).y"
                  stroke="#6d4b59"
                  stroke-width="1.5"
                />
                <text
                  :x="compassPoint(index, 8, 138).x"
                  :y="compassPoint(index, 8, 138).y"
                  fill="#7b3148"
                  font-family="Microsoft YaHei, PingFang SC, sans-serif"
                  font-size="16"
                  font-weight="700"
                  text-anchor="middle"
                  dominant-baseline="central"
                >{{ label }}</text>
                <text
                  :x="compassPoint(index, 8, 105).x"
                  :y="compassPoint(index, 8, 105).y"
                  fill="#6d4b59"
                  font-family="Microsoft YaHei, PingFang SC, sans-serif"
                  font-size="20"
                  text-anchor="middle"
                  dominant-baseline="central"
                >{{ trigramLabels[index] }}</text>
              </g>
              <path d="M200 18 L190 45 L200 40 L210 45 Z" fill="#b33e50" stroke="#fff" stroke-width="1" />
              <circle cx="200" cy="200" r="42" fill="#fffdf8" fill-opacity="0.82" stroke="#6d4b59" stroke-width="2" />
              <line x1="172" y1="200" x2="228" y2="200" stroke="#7b3148" stroke-width="2" />
              <line x1="200" y1="172" x2="200" y2="228" stroke="#7b3148" stroke-width="2" />
              <circle cx="200" cy="200" r="6" fill="#7b3148" />
            </svg>
          </div>
          <p><Move :size="13" />拖动罗盘圆心到图中需要校准的位置；红色箭头指向正北。</p>
        </section>

        <aside class="fs-compass-controls">
          <div class="fs-control-heading"><div><Compass :size="17" /><strong>罗盘校准</strong></div><UiButton variant="ghost" size="small" @click="resetCompass"><RotateCcw :size="13" />复位</UiButton></div>
          <UiSelect v-model="state.topDirection" label="图纸上方朝向" required><option v-for="item in directionOptions" :key="item.value" :value="item.value" :disabled="item.value === 'unknown'">{{ item.label }}</option></UiSelect>
          <label class="fs-range-control"><span>角度微调 <b>{{ state.fineAngle }}°</b></span><input v-model.number="state.fineAngle" type="range" min="-22.5" max="22.5" step="0.5" /></label>
          <label class="fs-range-control"><span>罗盘大小 <b>{{ state.compassSize }}%</b></span><input v-model.number="state.compassSize" type="range" min="18" max="95" step="1" @input="clampCompassPosition" /></label>
          <label class="fs-range-control"><span>透明度 <b>{{ state.compassOpacity }}%</b></span><input v-model.number="state.compassOpacity" type="range" min="20" max="100" step="1" /></label>
          <p v-if="state.topDirection === 'unknown'" class="fs-direction-warning">必须先确认图纸上方朝向，才能导出合成图和生成提示词。</p>
          <div class="fs-position-readout"><span>圆心位置</span><strong>X {{ state.compassCenterX.toFixed(1) }}% · Y {{ state.compassCenterY.toFixed(1) }}%</strong></div>
        </aside>
      </div>
    </template>

    <section class="fs-details-section">
      <div class="fs-section-heading"><FileText :size="17" /><div><strong>补充住宅资料</strong><span>没有把握的内容可以留空</span></div></div>
      <div class="fs-details-grid">
        <label><span>户型/住宅名称</span><input v-model.trim="state.title" maxlength="60" placeholder="例如：自住房" /></label>
        <label><span>所在地区</span><input v-model.trim="state.location" maxlength="80" placeholder="城市或区域" /></label>
        <label><span>楼层情况</span><input v-model.trim="state.floor" maxlength="100" placeholder="所在楼层、总楼层" /></label>
        <label><span>建成或最近大修年份</span><input v-model.trim="state.builtYear" maxlength="100" placeholder="不知道可留空" /></label>
        <label class="is-wide"><span>已知坐向、大门朝向或测量信息</span><textarea v-model.trim="state.facing" maxlength="500" placeholder="例如：入户门朝向、手机罗盘或现场测量结果"></textarea></label>
        <label class="is-wide"><span>常住者与主要使用需求</span><textarea v-model.trim="state.residents" maxlength="800" placeholder="人数、卧室使用者、办公或睡眠等实际需求"></textarea></label>
        <label class="is-wide"><span>外部环境</span><textarea v-model.trim="state.exterior" maxlength="1000" placeholder="道路、相邻楼栋、水体、高差、明显遮挡等"></textarea></label>
        <label class="is-wide"><span>图中不易看出的已知事实</span><textarea v-model.trim="state.knownFacts" maxlength="1200" placeholder="房间用途、门窗、承重结构或尺寸等已确认信息"></textarea></label>
        <label class="is-wide fs-focus-field"><span>本次重点</span><textarea v-model.trim="state.focus" maxlength="1600" placeholder="例如：重点看主卧、入户和厨房，想改善睡眠与日常动线"></textarea></label>
      </div>
    </section>

    <section class="fs-output-section">
      <div class="fs-output-copy">
        <strong>交给支持图片的 AI</strong>
        <span>下载合成图，再复制提示词，将两者放在同一条消息中发送。</span>
      </div>
      <div class="fs-output-actions">
        <UiButton variant="secondary" :loading="isExporting" :disabled="!canGenerate" @click="exportComposite"><Download v-if="!isExporting" :size="15" />{{ isExporting ? '正在合成…' : '下载带罗盘图片' }}</UiButton>
        <UiButton :disabled="!canGenerate" @click="copyPrompt"><Check v-if="copied" :size="15" /><Copy v-else :size="15" />{{ copied ? '已复制' : '复制完整提示词' }}</UiButton>
      </div>
      <details v-if="canGenerate" class="fs-prompt-preview">
        <summary>查看将要发送的提示词</summary>
        <textarea :value="promptText" readonly aria-label="多模态居家风水提示词"></textarea>
      </details>
    </section>

    <p v-if="uploadMessage" class="fs-workspace-message" :class="`is-${uploadMessageType}`">{{ uploadMessage }}</p>
    <p class="fs-workspace-note">内置 AI 目前无法查看上传图片。若只能使用内置 AI，请切换到“在线绘制”，用结构化文字数据解读。</p>
  </section>
</template>

<style scoped>
.fs-image-workspace { --fs-panel: var(--surface-raised); --fs-soft: var(--surface-muted); --fs-line: var(--line); display: grid; gap: 18px; min-width: 0; padding-top: 16px; }
.fs-hidden-input { display: none; }
.fs-upload-card { display: grid; gap: 8px; }
.fs-upload-card > p, .fs-stage-panel > p, .fs-workspace-note { color: var(--subtle); font-size: var(--type-micro); line-height: 1.65; margin: 0; }
.fs-drop-zone { align-items: center; background: var(--fs-soft); border: 1px dashed color-mix(in srgb, var(--accent) 48%, var(--fs-line)); border-radius: 14px; cursor: pointer; display: flex; flex-direction: column; min-height: 230px; padding: 30px 20px; text-align: center; transition: background .16s ease, border-color .16s ease; }
.fs-drop-zone:hover, .fs-drop-zone.is-dragging, .fs-drop-zone:focus-visible { background: color-mix(in srgb, var(--accent-soft) 55%, var(--fs-soft)); border-color: var(--accent); outline: 0; }
.fs-upload-icon { align-items: center; background: var(--fs-panel); border: 1px solid var(--fs-line); border-radius: 13px; color: var(--accent-strong); display: inline-flex; height: 52px; justify-content: center; width: 52px; }
.fs-drop-zone strong { color: var(--ink); font-size: var(--type-section); margin-top: 13px; }
.fs-drop-zone > span:not(.fs-upload-icon) { color: var(--muted); font-size: var(--type-caption); margin-top: 5px; }
.fs-upload-action { margin-top: 15px; }
.fs-image-toolbar { align-items: center; border-bottom: 1px solid var(--fs-line); display: flex; gap: 12px; justify-content: space-between; padding-bottom: 10px; }
.fs-image-toolbar > div:first-child { display: grid; min-width: 0; }
.fs-image-toolbar strong { color: var(--ink); font-size: var(--type-small); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fs-image-toolbar span { color: var(--subtle); font-size: var(--type-micro); margin-top: 2px; }
.fs-image-toolbar > div:last-child { display: flex; flex: 0 0 auto; gap: 5px; }
.fs-workbench { align-items: start; display: grid; gap: 18px; grid-template-columns: minmax(0, 1.55fr) minmax(220px, .55fr); }
.fs-stage-panel { min-width: 0; }
.fs-image-stage { background: #eee9e4; border: 1px solid var(--fs-line); border-radius: 11px; overflow: hidden; position: relative; touch-action: none; width: 100%; }
.fs-image-stage > img { display: block; height: 100%; inset: 0; object-fit: contain; pointer-events: none; position: absolute; user-select: none; width: 100%; }
.fs-compass-overlay { cursor: grab; overflow: visible; position: absolute; touch-action: none; transform-origin: center; user-select: none; z-index: 2; }
.fs-compass-overlay:active { cursor: grabbing; }
.fs-stage-panel > p { align-items: center; display: flex; gap: 5px; margin-top: 7px; }
.fs-compass-controls { align-content: start; background: var(--fs-soft); border: 1px solid var(--fs-line); border-radius: 12px; display: grid; gap: 14px; padding: 14px; }
.fs-control-heading { align-items: center; border-bottom: 1px solid var(--fs-line); display: flex; justify-content: space-between; padding-bottom: 10px; }
.fs-control-heading > div { align-items: center; color: var(--accent-strong); display: flex; gap: 6px; }
.fs-control-heading strong { color: var(--ink); font-size: var(--type-small); }
.fs-compass-controls label, .fs-details-grid label { color: var(--muted); display: grid; font-size: var(--type-caption); gap: 6px; min-width: 0; }
.fs-compass-controls select, .fs-details-grid input, .fs-details-grid textarea { background: var(--fs-panel); border: 1px solid var(--fs-line); border-radius: var(--ds-radius-sm); color: var(--ink); font-size: var(--type-small); min-height: var(--ds-control-md); padding: 7px 9px; width: 100%; }
.fs-range-control span { align-items: center; display: flex; justify-content: space-between; }
.fs-range-control b { color: var(--accent-strong); font-size: var(--type-micro); font-weight: 600; }
.fs-range-control input { accent-color: var(--accent); cursor: pointer; min-width: 0; width: 100%; }
.fs-direction-warning { background: color-mix(in srgb, #c88b45 10%, var(--fs-panel)); border-radius: 7px; color: #9a672d; font-size: var(--type-micro); line-height: 1.55; margin: -2px 0 0; padding: 7px 8px; }
.fs-position-readout { border-top: 1px solid var(--fs-line); display: grid; gap: 2px; padding-top: 10px; }
.fs-position-readout span { color: var(--subtle); font-size: var(--type-micro); }
.fs-position-readout strong { color: var(--ink); font-size: var(--type-caption); font-weight: 600; }
.fs-details-section, .fs-output-section { border-top: 1px solid var(--fs-line); padding-top: 16px; }
.fs-section-heading { align-items: center; color: var(--accent-strong); display: flex; gap: 7px; }
.fs-section-heading > div { display: grid; gap: 1px; }
.fs-section-heading strong { color: var(--ink); font-size: var(--type-small); }
.fs-section-heading span { color: var(--subtle); font-size: var(--type-micro); }
.fs-details-grid { display: grid; gap: 11px 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 12px; }
.fs-details-grid textarea { line-height: 1.6; min-height: 64px; resize: vertical; }
.fs-details-grid label.is-wide { grid-column: 1 / -1; }
.fs-details-grid .fs-focus-field textarea { min-height: 82px; }
.fs-output-section { align-items: center; display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr) auto; }
.fs-output-copy { display: grid; gap: 3px; }
.fs-output-copy strong { color: var(--ink); font-size: var(--type-small); }
.fs-output-copy span { color: var(--muted); font-size: var(--type-caption); line-height: 1.6; }
.fs-output-actions { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; }
.fs-prompt-preview { background: var(--fs-soft); border: 1px solid var(--fs-line); border-radius: 9px; grid-column: 1 / -1; overflow: hidden; }
.fs-prompt-preview summary { color: var(--accent-strong); cursor: pointer; font-size: var(--type-caption); list-style-position: inside; padding: 10px 11px; }
.fs-prompt-preview textarea { background: var(--fs-panel); border: 0; border-top: 1px solid var(--fs-line); color: var(--muted); font-family: inherit; font-size: var(--type-caption); line-height: 1.7; min-height: 320px; padding: 11px; resize: vertical; width: 100%; }
.fs-workspace-message { border-radius: 8px; font-size: var(--type-caption); line-height: 1.55; margin: -6px 0 0; padding: 8px 10px; }
.fs-workspace-message.is-info { background: var(--fs-soft); color: var(--muted); }
.fs-workspace-message.is-success { background: color-mix(in srgb, #6f9a76 11%, var(--fs-soft)); color: #5c7e63; }
.fs-workspace-message.is-error { background: color-mix(in srgb, #bd6675 10%, var(--fs-soft)); color: #a94e60; }
.fs-workspace-note { border-top: 1px solid var(--fs-line); padding-top: 10px; }

@media (max-width: 900px) {
  .fs-workbench { grid-template-columns: 1fr; }
  .fs-compass-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fs-control-heading, .fs-direction-warning, .fs-position-readout { grid-column: 1 / -1; }
}

@media (max-width: 620px) {
  .fs-image-workspace { gap: 14px; padding-top: 12px; }
  .fs-drop-zone { min-height: 205px; padding: 25px 14px; }
  .fs-image-toolbar { align-items: flex-start; }
  .fs-image-toolbar > div:last-child { align-items: stretch; flex-direction: column; }
  .fs-workbench { gap: 12px; }
  .fs-compass-controls, .fs-details-grid { grid-template-columns: 1fr; }
  .fs-control-heading, .fs-direction-warning, .fs-position-readout, .fs-details-grid label.is-wide { grid-column: auto; }
  .fs-output-section { align-items: stretch; grid-template-columns: 1fr; }
  .fs-output-actions { justify-content: flex-start; }
  .fs-prompt-preview { grid-column: auto; }
  .fs-prompt-preview textarea { min-height: 260px; }
}

@media (prefers-color-scheme: dark) {
  .fs-image-workspace { --fs-panel: #2b2830; --fs-soft: #343039; --fs-line: #47414d; }
  .fs-image-stage { background: #201e22; }
  .fs-direction-warning { color: #d2a66f; }
  .fs-workspace-message.is-success { color: #9fc1a5; }
  .fs-workspace-message.is-error { color: #e29baa; }
}
</style>
