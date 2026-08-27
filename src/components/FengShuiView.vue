<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  Check,
  ChevronDown,
  Compass,
  Move,
  Plus,
  Redo2,
  Ruler,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from 'lucide-vue-next';
import { requestAiInterpretation, type AiCustomConfig, type AiInterpretationRequest, type AiPreferences } from '../lib/ai';
import AiPromptFallback from './AiPromptFallback.vue';
import AiReadingActions from './AiReadingActions.vue';
import ChatMarkdown from './ChatMarkdown.vue';
import CaseMultiSelect from './CaseMultiSelect.vue';
import FengShuiImageWorkspace from './FengShuiImageWorkspace.vue';
import { UiButton, UiNotice, UiSectionHeading, UiSegmentedControl, UiSelect, UiToolPage, UiWorkspaceSurface } from './ui';
import type { SelectableCaseProfile } from '../lib/caseSelection';
import { buildFengShuiResidentBaziContext } from '../lib/fengShuiResidents';
import { appendPromptSchoolGuidance, resolvePromptSchoolIds } from '../lib/promptSchools';
import {
  FENG_SHUI_COLUMNS,
  FENG_SHUI_ROWS,
  buildFengShuiModelContext,
  createEmptyFengShuiPlan,
  fengShuiEdgeDirection,
  fengShuiFacingOptions,
  fengShuiFixtureDefinition,
  fengShuiFixtureTypes,
  fengShuiRoomDefinition,
  fengShuiRoomTypes,
  fengShuiTopDirectionOptions,
  findFixtureRoom,
  normalizeFengShuiPlan,
  normalizePolygonPoints,
  pointInPolygon,
  pointsFromRectangle,
  polygonArea,
  polygonBounds,
  polygonCentroid,
  polygonSelfIntersects,
  type FengShuiFixture,
  type FengShuiFixtureType,
  type FengShuiPlan,
  type FengShuiPoint,
  type FengShuiRoom,
  type FengShuiRoomType,
} from '../lib/fengShui';

const props = defineProps<{
  preferences: AiPreferences;
  aiConfig: AiCustomConfig;
  cases: SelectableCaseProfile[];
  selectedCaseIds: string[];
  globalCaseId: string;
}>();

const emit = defineEmits<{
  (event: 'update:selectedCaseIds', value: string[]): void;
  (event: 'manageCases'): void;
}>();

type EditorTool = 'select' | 'room' | 'fixture';
type RoomMode = 'rectangle' | 'polygon';
type GridPoint = FengShuiPoint;
type RoomDraft = { start: GridPoint; current: GridPoint };
type VertexDrag = { roomId: string; index: number; originalPoints: FengShuiPoint[]; originalShape: FengShuiRoom['shape']; moved: boolean };
type RoomDrag = { roomId: string; startClient: FengShuiPoint; canvasSize: FengShuiPoint; originalPoints: FengShuiPoint[]; originalFixtures: Array<{ id: string; x: number; y: number }>; moved: boolean };
type FixtureDrag = { fixtureId: string; original: FengShuiPoint; startClient: FengShuiPoint; canvasSize: FengShuiPoint; moved: boolean };

const STORAGE_KEY = 'shiyue-feng-shui-plan-v1';
const WORKSPACE_STORAGE_KEY = 'shiyue-feng-shui-workspace-v1';
const SNAP_STEP = 0.5;
const HISTORY_LIMIT = 60;
const activeWorkspace = ref<'image' | 'draw'>('image');
const workspaceTabs = [
  { value: 'image', label: '上传户型图' },
  { value: 'draw', label: '在线绘制' },
];
const editorToolTabs = [
  { value: 'select', label: '选择' },
  { value: 'room', label: '房间' },
  { value: 'fixture', label: '标记' },
];
const roomModeTabs = [
  { value: 'rectangle', label: '矩形拖绘' },
  { value: 'polygon', label: '自由轮廓' },
];

function chooseWorkspace(value: string) {
  if (value === 'image' || value === 'draw') activeWorkspace.value = value;
}
const plan = ref<FengShuiPlan>(createEmptyFengShuiPlan());
const canvasRef = ref<HTMLElement | null>(null);
const activeTool = ref<EditorTool>('room');
const roomMode = ref<RoomMode>('rectangle');
const activeRoomType = ref<FengShuiRoomType>('living');
const activeFixtureType = ref<FengShuiFixtureType>('mainDoor');
const selectedRoomId = ref('');
const selectedFixtureId = ref('');
const roomDraft = ref<RoomDraft | null>(null);
const polygonDraft = ref<FengShuiPoint[]>([]);
const polygonHoverPoint = ref<FengShuiPoint | null>(null);
const vertexDrag = ref<VertexDrag | null>(null);
const roomDrag = ref<RoomDrag | null>(null);
const fixtureDrag = ref<FixtureDrag | null>(null);
const selectedVertexIndex = ref<number | null>(null);
const undoStack = ref<string[]>([]);
const redoStack = ref<string[]>([]);
const editorMessage = ref('');
const editorMessageType = ref<'info' | 'error' | 'success'>('info');
const question = ref('');
const aiAnswer = ref('');
const aiError = ref('');
const lastAiRequest = ref<AiInterpretationRequest | null>(null);
const isInterpreting = ref(false);
const answerOutdated = ref(false);
let mounted = false;
let interpretationId = 0;
let historySnapshot = '';
let historyTimer: number | undefined;
let historyMuted = false;
let historySuspended = false;

const selectedRoom = computed(() => plan.value.rooms.find((room) => room.id === selectedRoomId.value) || null);
const selectedFixture = computed(() => plan.value.fixtures.find((fixture) => fixture.id === selectedFixtureId.value) || null);
const modelContext = computed(() => buildFengShuiModelContext(plan.value));
const selectedResidentProfiles = computed(() => props.cases.filter((profile) => props.selectedCaseIds.includes(profile.id) && profile.available !== false));
const residentBaziContext = computed(() => buildFengShuiResidentBaziContext(selectedResidentProfiles.value));
const roomDraftRect = computed(() => roomDraft.value ? normalizeDraft(roomDraft.value) : null);
const polygonDraftSvgPoints = computed(() => polygonDraft.value.map((point) => `${point.x},${point.y}`).join(' '));
const polygonDraftArea = computed(() => polygonDraft.value.length >= 3 ? polygonArea(polygonDraft.value) : 0);
const topDirectionLabel = computed(() => fengShuiTopDirectionOptions.find((item) => item.value === plan.value.topDirection)?.label || '北');
const hasCanvasContent = computed(() => plan.value.rooms.length > 0 || plan.value.fixtures.length > 0);

onMounted(() => {
  try {
    if (localStorage.getItem(WORKSPACE_STORAGE_KEY) === 'draw') activeWorkspace.value = 'draw';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) plan.value = normalizeFengShuiPlan(JSON.parse(stored));
  } catch {
    showEditorMessage('上次保存的平面图无法读取，已打开空白画布。', 'error');
  }
  historySnapshot = JSON.stringify(plan.value);
  mounted = true;
  window.addEventListener('keydown', handleEditorShortcut);
});

watch(activeWorkspace, (workspace) => {
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace);
  } catch {
    // 工作区选择不是关键数据，浏览器拒绝存储时保持当前会话可用。
  }
});

watch(plan, () => {
  if (!mounted) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan.value));
  } catch {
    showEditorMessage('浏览器未能保存当前平面图。', 'error');
  }
  if (!historyMuted && !historySuspended) queueHistoryCheckpoint();
  if (aiAnswer.value) answerOutdated.value = true;
}, { deep: true });

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEditorShortcut);
  if (historyTimer) window.clearTimeout(historyTimer);
});

function queueHistoryCheckpoint() {
  if (!mounted || historyMuted || historySuspended) return;
  if (historyTimer) window.clearTimeout(historyTimer);
  historyTimer = window.setTimeout(commitHistoryCheckpoint, 220);
}

function commitHistoryCheckpoint() {
  historyTimer = undefined;
  if (historyMuted || historySuspended) return;
  const current = JSON.stringify(plan.value);
  if (!historySnapshot || current === historySnapshot) return;
  undoStack.value.push(historySnapshot);
  if (undoStack.value.length > HISTORY_LIMIT) undoStack.value.shift();
  redoStack.value = [];
  historySnapshot = current;
}

function restoreHistory(snapshot: string) {
  historyMuted = true;
  plan.value = normalizeFengShuiPlan(JSON.parse(snapshot));
  historySnapshot = JSON.stringify(plan.value);
  selectedRoomId.value = '';
  selectedFixtureId.value = '';
  selectedVertexIndex.value = null;
  try {
    localStorage.setItem(STORAGE_KEY, historySnapshot);
  } catch {
    showEditorMessage('已恢复画布，但浏览器未能保存当前状态。', 'error');
  }
  void nextTick(() => { historyMuted = false; });
}

function undoPlan() {
  if (historyTimer) {
    window.clearTimeout(historyTimer);
    historyTimer = undefined;
    commitHistoryCheckpoint();
  }
  const previous = undoStack.value.pop();
  if (!previous) return;
  redoStack.value.push(historySnapshot);
  restoreHistory(previous);
  showEditorMessage('已撤销上一步。', 'success');
}

function redoPlan() {
  const next = redoStack.value.pop();
  if (!next) return;
  undoStack.value.push(historySnapshot);
  restoreHistory(next);
  showEditorMessage('已恢复下一步。', 'success');
}

function handleEditorShortcut(event: KeyboardEvent) {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const target = event.target as HTMLElement | null;
  if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
  if (event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) redoPlan(); else undoPlan();
  } else if (event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redoPlan();
  }
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function snapCoordinate(value: number, step = SNAP_STEP) {
  return Math.round(value / step) * step;
}

function showEditorMessage(message: string, type: 'info' | 'error' | 'success' = 'info') {
  editorMessage.value = message;
  editorMessageType.value = type;
}

function selectTool(tool: EditorTool) {
  activeTool.value = tool;
  roomDraft.value = null;
  polygonDraft.value = [];
  polygonHoverPoint.value = null;
  vertexDrag.value = null;
  roomDrag.value = null;
  fixtureDrag.value = null;
  selectedVertexIndex.value = null;
  editorMessage.value = '';
}

function selectRoomMode(mode: RoomMode) {
  roomMode.value = mode;
  selectTool('room');
}

function chooseRoomType(type: FengShuiRoomType) {
  activeRoomType.value = type;
  selectTool('room');
}

function chooseFixtureType(type: FengShuiFixtureType) {
  activeFixtureType.value = type;
  selectTool('fixture');
}

function vertexPointFromEvent(event: PointerEvent): GridPoint | null {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  return {
    x: clamp(snapCoordinate((event.clientX - bounds.left) / bounds.width * FENG_SHUI_COLUMNS), 0, FENG_SHUI_COLUMNS),
    y: clamp(snapCoordinate((event.clientY - bounds.top) / bounds.height * FENG_SHUI_ROWS), 0, FENG_SHUI_ROWS),
  };
}

function fixturePointFromEvent(event: PointerEvent): GridPoint | null {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  return {
    x: clamp(snapCoordinate((event.clientX - bounds.left) / bounds.width * FENG_SHUI_COLUMNS - 0.5), 0, FENG_SHUI_COLUMNS - 1),
    y: clamp(snapCoordinate((event.clientY - bounds.top) / bounds.height * FENG_SHUI_ROWS - 0.5), 0, FENG_SHUI_ROWS - 1),
  };
}

function normalizeDraft(draft: RoomDraft) {
  const x = Math.min(draft.start.x, draft.current.x);
  const y = Math.min(draft.start.y, draft.current.y);
  return {
    x,
    y,
    width: Math.abs(draft.current.x - draft.start.x),
    height: Math.abs(draft.current.y - draft.start.y),
  };
}

function rectanglesOverlap(left: Pick<FengShuiRoom, 'x' | 'y' | 'width' | 'height'>, right: Pick<FengShuiRoom, 'x' | 'y' | 'width' | 'height'>) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

function roomName(type: FengShuiRoomType) {
  const label = fengShuiRoomDefinition(type).label;
  const count = plan.value.rooms.filter((room) => room.type === type).length;
  return count ? `${label}${count + 1}` : label;
}

function roomStyle(room: Pick<FengShuiRoom, 'x' | 'y' | 'width' | 'height' | 'type'>) {
  return {
    left: `${room.x / FENG_SHUI_COLUMNS * 100}%`,
    top: `${room.y / FENG_SHUI_ROWS * 100}%`,
    width: `${room.width / FENG_SHUI_COLUMNS * 100}%`,
    height: `${room.height / FENG_SHUI_ROWS * 100}%`,
    '--room-color': fengShuiRoomDefinition(room.type).color,
  };
}

function roomSvgPoints(room: FengShuiRoom) {
  return room.points.map((point) => `${point.x},${point.y}`).join(' ');
}

function roomLabelPoint(room: FengShuiRoom) {
  const centroid = polygonCentroid(room.points);
  if (pointInPolygon(centroid, room.points)) return centroid;
  for (let y = room.y + 0.25; y < room.y + room.height; y += 0.5) {
    for (let x = room.x + 0.25; x < room.x + room.width; x += 0.5) {
      if (pointInPolygon({ x, y }, room.points)) return { x, y };
    }
  }
  return room.points[0];
}

function roomAreaLabel(room: FengShuiRoom) {
  return (polygonArea(room.points) * plan.value.cellMeters * plan.value.cellMeters).toFixed(1);
}

function vertexStyle(point: FengShuiPoint) {
  return {
    left: `${point.x / FENG_SHUI_COLUMNS * 100}%`,
    top: `${point.y / FENG_SHUI_ROWS * 100}%`,
  };
}

function fixtureStyle(fixture: FengShuiFixture) {
  return {
    left: `${(fixture.x + 0.5) / FENG_SHUI_COLUMNS * 100}%`,
    top: `${(fixture.y + 0.5) / FENG_SHUI_ROWS * 100}%`,
  };
}

function startCanvasAction(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  if (activeTool.value === 'room') {
    if (roomMode.value === 'polygon') {
      const point = vertexPointFromEvent(event);
      if (point) addPolygonPoint(point);
      return;
    }
    const point = vertexPointFromEvent(event);
    if (!point) return;
    roomDraft.value = { start: point, current: point };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    return;
  }
  if (activeTool.value === 'fixture') {
    const point = fixturePointFromEvent(event);
    if (!point) return;
    addFixture(point);
    return;
  }
  selectedRoomId.value = '';
  selectedFixtureId.value = '';
}

function moveCanvasAction(event: PointerEvent) {
  if (roomDraft.value) {
    const point = vertexPointFromEvent(event);
    if (point) roomDraft.value.current = point;
    return;
  }
  if (activeTool.value === 'room' && roomMode.value === 'polygon' && polygonDraft.value.length) {
    polygonHoverPoint.value = vertexPointFromEvent(event);
  }
}

function finishCanvasAction(event: PointerEvent) {
  if (!roomDraft.value) return;
  const point = vertexPointFromEvent(event);
  if (point) roomDraft.value.current = point;
  const rect = normalizeDraft(roomDraft.value);
  roomDraft.value = null;
  if (rect.width < SNAP_STEP || rect.height < SNAP_STEP) {
    showEditorMessage('请拖出房间范围，最小边长为半格。', 'error');
    return;
  }
  addRoom(rect);
}

function cancelCanvasAction() {
  roomDraft.value = null;
}

function addRoom(rect: Pick<FengShuiRoom, 'x' | 'y' | 'width' | 'height'>) {
  return addRoomFromPoints(pointsFromRectangle(rect), 'rectangle');
}

function addRoomFromPoints(points: FengShuiPoint[], shape: FengShuiRoom['shape']) {
  const bounds = polygonBounds(points);
  const room: FengShuiRoom = {
    id: createId('room'),
    type: activeRoomType.value,
    name: roomName(activeRoomType.value),
    shape,
    ...bounds,
    points: points.map((point) => ({ ...point })),
  };
  plan.value.rooms.push(room);
  selectedRoomId.value = room.id;
  selectedFixtureId.value = '';
  showEditorMessage(`已添加${room.name}。`, 'success');
  return room;
}

function addPolygonPoint(point: FengShuiPoint) {
  const points = polygonDraft.value;
  if (points.length >= 3 && points[0].x === point.x && points[0].y === point.y) {
    finishPolygonRoom();
    return;
  }
  const last = points[points.length - 1];
  if (last && last.x === point.x && last.y === point.y) return;
  polygonDraft.value.push(point);
  polygonHoverPoint.value = point;
  editorMessage.value = '';
}

function undoPolygonPoint() {
  polygonDraft.value.pop();
  if (!polygonDraft.value.length) polygonHoverPoint.value = null;
}

function cancelPolygonRoom() {
  polygonDraft.value = [];
  polygonHoverPoint.value = null;
  showEditorMessage('已取消当前轮廓。');
}

function finishPolygonRoom() {
  const points = normalizePolygonPoints(polygonDraft.value);
  if (points.length < 3) {
    showEditorMessage('自由轮廓至少需要 3 个不同的拐点。', 'error');
    return;
  }
  if (polygonSelfIntersects(points)) {
    showEditorMessage('轮廓边线不能互相交叉，请撤销交叉的拐点后再完成。', 'error');
    return;
  }
  if (polygonArea(points) < 0.25) {
    showEditorMessage('房间轮廓面积至少需要四分之一格。', 'error');
    return;
  }
  addRoomFromPoints(points, 'polygon');
  polygonDraft.value = [];
  polygonHoverPoint.value = null;
}

function quickAddRoom() {
  const compactTypes: FengShuiRoomType[] = ['entrance', 'bathroom', 'storage', 'balcony'];
  const size = compactTypes.includes(activeRoomType.value) ? { width: 4, height: 4 } : { width: 6, height: 5 };
  for (let y = 0; y <= FENG_SHUI_ROWS - size.height; y += 1) {
    for (let x = 0; x <= FENG_SHUI_COLUMNS - size.width; x += 1) {
      const rect = { x, y, ...size };
      if (!plan.value.rooms.some((room) => rectanglesOverlap(room, rect))) {
        addRoom(rect);
        return;
      }
    }
  }
  const room = addRoom({ x: 0, y: 0, ...size });
  if (room) showEditorMessage(`已添加${room.name}；房间可以交叠，请按实际户型调整轮廓。`, 'success');
}

function addFixture(point: GridPoint) {
  if (plan.value.fixtures.some((fixture) => fixture.x === point.x && fixture.y === point.y)) {
    showEditorMessage('这一格已有标记，请换一格放置。', 'error');
    return;
  }
  const fixture: FengShuiFixture = {
    id: createId('fixture'),
    type: activeFixtureType.value,
    x: point.x,
    y: point.y,
    facing: 'unknown',
  };
  plan.value.fixtures.push(fixture);
  selectedFixtureId.value = fixture.id;
  selectedRoomId.value = '';
  const room = findFixtureRoom(fixture, plan.value.rooms);
  showEditorMessage(`已放置${fengShuiFixtureDefinition(fixture.type).label}${room ? `（${room.name}）` : ''}。`, 'success');
}

function selectRoom(room: FengShuiRoom) {
  selectedRoomId.value = room.id;
  selectedFixtureId.value = '';
  selectedVertexIndex.value = null;
  activeTool.value = 'select';
}

function selectFixture(fixture: FengShuiFixture) {
  selectedFixtureId.value = fixture.id;
  selectedRoomId.value = '';
  selectedVertexIndex.value = null;
  activeTool.value = 'select';
}

function startRoomDrag(event: PointerEvent, room: FengShuiRoom) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const bounds = canvasRef.value?.getBoundingClientRect();
  if (!bounds?.width || !bounds.height) return;
  event.preventDefault();
  selectRoom(room);
  const fixtures = plan.value.fixtures.filter((fixture) => findFixtureRoom(fixture, [room]));
  roomDrag.value = {
    roomId: room.id,
    startClient: { x: event.clientX, y: event.clientY },
    canvasSize: { x: bounds.width, y: bounds.height },
    originalPoints: room.points.map((item) => ({ ...item })),
    originalFixtures: fixtures.map((fixture) => ({ id: fixture.id, x: fixture.x, y: fixture.y })),
    moved: false,
  };
  historySuspended = true;
  (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
}

function moveRoomDrag(event: PointerEvent) {
  const drag = roomDrag.value;
  const room = drag ? plan.value.rooms.find((item) => item.id === drag.roomId) : null;
  if (!drag || !room) return;
  const originalBounds = polygonBounds(drag.originalPoints);
  const requestedX = snapCoordinate((event.clientX - drag.startClient.x) / drag.canvasSize.x * FENG_SHUI_COLUMNS);
  const requestedY = snapCoordinate((event.clientY - drag.startClient.y) / drag.canvasSize.y * FENG_SHUI_ROWS);
  const deltaX = clamp(requestedX, -originalBounds.x, FENG_SHUI_COLUMNS - originalBounds.x - originalBounds.width);
  const deltaY = clamp(requestedY, -originalBounds.y, FENG_SHUI_ROWS - originalBounds.y - originalBounds.height);
  drag.moved = drag.moved || Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001;
  room.points = drag.originalPoints.map((item) => ({ x: item.x + deltaX, y: item.y + deltaY }));
  Object.assign(room, polygonBounds(room.points));
  drag.originalFixtures.forEach((original) => {
    const fixture = plan.value.fixtures.find((item) => item.id === original.id);
    if (!fixture) return;
    fixture.x = clamp(original.x + deltaX, 0, FENG_SHUI_COLUMNS - 1);
    fixture.y = clamp(original.y + deltaY, 0, FENG_SHUI_ROWS - 1);
  });
}

function finishRoomDrag(event: PointerEvent) {
  moveRoomDrag(event);
  const moved = roomDrag.value?.moved;
  roomDrag.value = null;
  historySuspended = false;
  if (moved) {
    commitHistoryCheckpoint();
    showEditorMessage('房间及其中的标记已移动。', 'success');
  }
}

function cancelRoomDrag() {
  const drag = roomDrag.value;
  const room = drag ? plan.value.rooms.find((item) => item.id === drag.roomId) : null;
  if (drag && room) {
    room.points = drag.originalPoints;
    Object.assign(room, polygonBounds(room.points));
    drag.originalFixtures.forEach((original) => {
      const fixture = plan.value.fixtures.find((item) => item.id === original.id);
      if (fixture) Object.assign(fixture, { x: original.x, y: original.y });
    });
  }
  roomDrag.value = null;
  historySuspended = false;
}

function startFixtureDrag(event: PointerEvent, fixture: FengShuiFixture) {
  if (activeTool.value !== 'select' || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const bounds = canvasRef.value?.getBoundingClientRect();
  if (!bounds?.width || !bounds.height) return;
  event.preventDefault();
  selectFixture(fixture);
  fixtureDrag.value = {
    fixtureId: fixture.id,
    original: { x: fixture.x, y: fixture.y },
    startClient: { x: event.clientX, y: event.clientY },
    canvasSize: { x: bounds.width, y: bounds.height },
    moved: false,
  };
  historySuspended = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function moveFixtureDrag(event: PointerEvent) {
  const drag = fixtureDrag.value;
  const fixture = drag ? plan.value.fixtures.find((item) => item.id === drag.fixtureId) : null;
  if (!drag || !fixture) return;
  const deltaX = snapCoordinate((event.clientX - drag.startClient.x) / drag.canvasSize.x * FENG_SHUI_COLUMNS);
  const deltaY = snapCoordinate((event.clientY - drag.startClient.y) / drag.canvasSize.y * FENG_SHUI_ROWS);
  const point = {
    x: clamp(drag.original.x + deltaX, 0, FENG_SHUI_COLUMNS - 1),
    y: clamp(drag.original.y + deltaY, 0, FENG_SHUI_ROWS - 1),
  };
  drag.moved = drag.moved || Math.abs(deltaX) > 0.001 || Math.abs(deltaY) > 0.001;
  Object.assign(fixture, point);
}

function finishFixtureDrag(event: PointerEvent) {
  moveFixtureDrag(event);
  const drag = fixtureDrag.value;
  const fixture = drag ? plan.value.fixtures.find((item) => item.id === drag.fixtureId) : null;
  fixtureDrag.value = null;
  historySuspended = false;
  if (!drag || !fixture || !drag.moved) return;
  if (plan.value.fixtures.some((item) => item.id !== fixture.id && item.x === fixture.x && item.y === fixture.y)) {
    Object.assign(fixture, drag.original);
    showEditorMessage('该位置已有标记，已恢复原来的位置。', 'error');
    return;
  }
  commitHistoryCheckpoint();
  showEditorMessage('标记位置已更新。', 'success');
}

function cancelFixtureDrag() {
  const drag = fixtureDrag.value;
  const fixture = drag ? plan.value.fixtures.find((item) => item.id === drag.fixtureId) : null;
  if (drag && fixture) Object.assign(fixture, drag.original);
  fixtureDrag.value = null;
  historySuspended = false;
}

function cancelVertexDrag() {
  const drag = vertexDrag.value;
  const room = drag ? plan.value.rooms.find((item) => item.id === drag.roomId) : null;
  if (drag && room) {
    room.points = drag.originalPoints;
    room.shape = drag.originalShape;
    Object.assign(room, polygonBounds(room.points));
  }
  vertexDrag.value = null;
  historySuspended = false;
}

function startVertexDrag(event: PointerEvent, room: FengShuiRoom | null, index: number) {
  if (!room) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  selectedVertexIndex.value = index;
  vertexDrag.value = {
    roomId: room.id,
    index,
    originalPoints: room.points.map((point) => ({ ...point })),
    originalShape: room.shape,
    moved: false,
  };
  historySuspended = true;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function moveVertexDrag(event: PointerEvent) {
  const drag = vertexDrag.value;
  if (!drag) return;
  const room = plan.value.rooms.find((item) => item.id === drag.roomId);
  const point = vertexPointFromEvent(event);
  if (!room || !point) return;
  const original = drag.originalPoints[drag.index];
  drag.moved = drag.moved || Math.abs(point.x - original.x) > 0.001 || Math.abs(point.y - original.y) > 0.001;
  if (!drag.moved) return;
  room.points[drag.index] = point;
  Object.assign(room, polygonBounds(room.points));
  room.shape = 'polygon';
}

function finishVertexDrag(event: PointerEvent) {
  moveVertexDrag(event);
  const drag = vertexDrag.value;
  if (!drag) return;
  const room = plan.value.rooms.find((item) => item.id === drag.roomId);
  vertexDrag.value = null;
  historySuspended = false;
  if (!room) return;
  if (!drag.moved) return;
  const points = normalizePolygonPoints(room.points);
  if (points.length < 3 || polygonArea(points) < 0.25 || polygonSelfIntersects(points)) {
    room.points = drag.originalPoints;
    room.shape = drag.originalShape;
    Object.assign(room, polygonBounds(room.points));
    showEditorMessage('这个拐点会让轮廓交叉或面积过小，已恢复原来的位置。', 'error');
    return;
  }
  room.points = points;
  Object.assign(room, polygonBounds(points));
  commitHistoryCheckpoint();
  showEditorMessage('房间轮廓已更新。', 'success');
}

function addRoomVertex() {
  const room = selectedRoom.value;
  if (!room) return;
  const index = selectedVertexIndex.value ?? 0;
  const current = room.points[index];
  const next = room.points[(index + 1) % room.points.length];
  const midpoint = { x: snapCoordinate((current.x + next.x) / 2), y: snapCoordinate((current.y + next.y) / 2) };
  if ((midpoint.x === current.x && midpoint.y === current.y) || (midpoint.x === next.x && midpoint.y === next.y)) {
    showEditorMessage('这条边太短，暂时无法继续增加拐点。', 'error');
    return;
  }
  room.points.splice(index + 1, 0, midpoint);
  room.shape = 'polygon';
  Object.assign(room, polygonBounds(room.points));
  selectedVertexIndex.value = index + 1;
  showEditorMessage('已在所选拐点后的边上增加拐点。', 'success');
}

function removeRoomVertex() {
  const room = selectedRoom.value;
  const index = selectedVertexIndex.value;
  if (!room || index === null) {
    showEditorMessage('请先点击一个紫色拐点。', 'error');
    return;
  }
  if (room.points.length <= 3) {
    showEditorMessage('房间轮廓至少需要保留 3 个拐点。', 'error');
    return;
  }
  const points = room.points.filter((_, pointIndex) => pointIndex !== index);
  if (polygonArea(points) < 0.25 || polygonSelfIntersects(points)) {
    showEditorMessage('删除后轮廓会交叉或面积过小，本次修改未保存。', 'error');
    return;
  }
  room.points = points;
  room.shape = 'polygon';
  Object.assign(room, polygonBounds(points));
  selectedVertexIndex.value = Math.min(index, points.length - 1);
  showEditorMessage('拐点已删除。', 'success');
}

function updateRoomNumber(field: 'x' | 'y' | 'width' | 'height', event: Event) {
  const room = selectedRoom.value;
  if (!room || room.shape !== 'rectangle') return;
  const raw = snapCoordinate(Number((event.target as HTMLInputElement).value));
  if (!Number.isFinite(raw)) return;
  const candidate = { ...room };
  if (field === 'x') candidate.x = clamp(raw, 0, FENG_SHUI_COLUMNS - candidate.width);
  if (field === 'y') candidate.y = clamp(raw, 0, FENG_SHUI_ROWS - candidate.height);
  if (field === 'width') candidate.width = clamp(raw, SNAP_STEP, FENG_SHUI_COLUMNS - candidate.x);
  if (field === 'height') candidate.height = clamp(raw, SNAP_STEP, FENG_SHUI_ROWS - candidate.y);
  candidate.points = pointsFromRectangle(candidate);
  Object.assign(room, candidate);
  editorMessage.value = '';
}

function deleteSelection() {
  if (selectedRoom.value) {
    const room = selectedRoom.value;
    if (!window.confirm(`删除“${room.name}”？只属于这个房间的标记也会一起删除。`)) return;
    const otherRooms = plan.value.rooms.filter((item) => item.id !== room.id);
    const fixtureIds = new Set(plan.value.fixtures
      .filter((fixture) => findFixtureRoom(fixture, [room]) && !findFixtureRoom(fixture, otherRooms))
      .map((fixture) => fixture.id));
    plan.value.rooms = plan.value.rooms.filter((item) => item.id !== room.id);
    plan.value.fixtures = plan.value.fixtures.filter((fixture) => !fixtureIds.has(fixture.id));
    selectedRoomId.value = '';
    selectedVertexIndex.value = null;
    showEditorMessage('房间已删除。', 'success');
    return;
  }
  if (selectedFixture.value) {
    plan.value.fixtures = plan.value.fixtures.filter((fixture) => fixture.id !== selectedFixture.value?.id);
    selectedFixtureId.value = '';
    showEditorMessage('标记已删除。', 'success');
  }
}

function clearPlan() {
  if (!hasCanvasContent.value) return;
  if (!window.confirm('清空当前平面图？已画的房间和标记会被删除，户型设置和补充信息会保留。')) return;
  if (historyTimer) {
    window.clearTimeout(historyTimer);
    historyTimer = undefined;
  }
  commitHistoryCheckpoint();
  plan.value = {
    ...createEmptyFengShuiPlan(),
    title: plan.value.title,
    topDirection: plan.value.topDirection,
    cellMeters: plan.value.cellMeters,
    notes: plan.value.notes,
  };
  selectedRoomId.value = '';
  selectedFixtureId.value = '';
  roomDraft.value = null;
  polygonDraft.value = [];
  polygonHoverPoint.value = null;
  vertexDrag.value = null;
  roomDrag.value = null;
  fixtureDrag.value = null;
  selectedVertexIndex.value = null;
  interpretationId += 1;
  isInterpreting.value = false;
  aiAnswer.value = '';
  aiError.value = '';
  lastAiRequest.value = null;
  answerOutdated.value = false;
  showEditorMessage('画布已清空。', 'success');
}

async function interpretPlan() {
  if (!plan.value.rooms.length) {
    aiError.value = '请先画出至少一个房间。';
    return;
  }
  const requestId = ++interpretationId;
  const context = modelContext.value;
  const residentialSchools = resolvePromptSchoolIds('residential', props.preferences.displayLevel, props.preferences.promptSchoolChoices);
  const readingPrompt = [
    appendPromptSchoolGuidance(context.summary, 'residential', residentialSchools),
    residentBaziContext.value.prompt,
  ].filter(Boolean).join('\n\n');
  isInterpreting.value = true;
  aiError.value = '';
  answerOutdated.value = false;
  const payload: AiInterpretationRequest = {
    mode: 'fengshui',
    question: question.value.trim() || '请结合这份住宅平面图，分析居住动线、功能布局和传统居家风水上值得优先调整的地方。',
    method: '居家风水',
    reading: {
      summary: readingPrompt,
      data: { plan: context.data, residents: residentBaziContext.value.entries },
      prompt: readingPrompt,
    },
    preferences: props.preferences,
    aiConfig: props.aiConfig,
  };
  lastAiRequest.value = payload;
  try {
    const response = await requestAiInterpretation(payload);
    if (requestId !== interpretationId) return;
    aiAnswer.value = response.content;
  } catch (error) {
    if (requestId !== interpretationId) return;
    aiError.value = error instanceof Error ? error.message : 'AI 解读暂时失败，请稍后再试。';
  } finally {
    if (requestId === interpretationId) isInterpreting.value = false;
  }
}
</script>

<template>
  <UiToolPage class="screen feng-shui-screen" toolbar-label="居家风水使用方式">
    <template #toolbar-primary>
      <UiSegmentedControl
        class="feng-workspace-tabs ui-tool-tabs"
        :model-value="activeWorkspace"
        :items="workspaceTabs"
        label="居家风水使用方式"
        compact
        @update:model-value="chooseWorkspace"
      />
    </template>
    <template #toolbar-secondary>
      <CaseMultiSelect
        :cases="cases"
        :model-value="selectedCaseIds"
        :required-ids="globalCaseId ? [globalCaseId] : []"
        label="居住成员"
        title="选择居住成员"
        allow-empty
        compact
        @update:model-value="emit('update:selectedCaseIds', $event)"
        @manage="emit('manageCases')"
      />
    </template>

    <UiWorkspaceSurface as="article" class="feng-workspace-surface" padding="standard">
      <FengShuiImageWorkspace v-if="activeWorkspace === 'image'" :resident-bazi-prompt="residentBaziContext.prompt" />

    <template v-else>
    <details class="feng-settings-disclosure">
      <summary><span><strong>户型设置</strong><small>上方朝{{ topDirectionLabel }} · {{ plan.cellMeters }} 米/格</small></span><ChevronDown :size="15" /></summary>
      <section class="feng-plan-settings" aria-label="平面图基本信息">
        <label><span>户型名称</span><input v-model.trim="plan.title" maxlength="40" /></label>
        <UiSelect v-model="plan.topDirection" label="上方朝向"><option v-for="item in fengShuiTopDirectionOptions" :key="item.value" :value="item.value">{{ item.label }}</option></UiSelect>
        <label><span>每格米数</span><input v-model.number="plan.cellMeters" type="number" min="0.2" max="2" step="0.1" /></label>
        <label class="feng-notes"><span>补充信息</span><textarea v-model="plan.notes" maxlength="1000" placeholder="楼层、外部环境或常住人数"></textarea></label>
      </section>
    </details>

    <div class="feng-editor" :class="{ 'has-inspector': selectedRoom || selectedFixture }">
      <aside class="feng-palette">
        <UiSegmentedControl class="feng-tool-tabs" :model-value="activeTool" :items="editorToolTabs" label="编辑工具" compact equal @update:model-value="selectTool($event as EditorTool)" />
        <section v-if="activeTool === 'room'">
          <div class="feng-panel-title"><strong>房间</strong><UiButton variant="ghost" size="small" @click="quickAddRoom"><Plus :size="12" />快速添加</UiButton></div>
          <UiSegmentedControl class="feng-room-modes" :model-value="roomMode" :items="roomModeTabs" label="房间绘制方式" compact equal @update:model-value="selectRoomMode($event as RoomMode)" />
          <div class="feng-room-types">
            <button v-for="item in fengShuiRoomTypes" :key="item.value" type="button" :class="{ active: activeTool === 'room' && activeRoomType === item.value }" @click="chooseRoomType(item.value)"><i :style="{ background: item.color }"></i>{{ item.label }}</button>
          </div>
        </section>
        <section v-else-if="activeTool === 'fixture'">
          <div class="feng-panel-title"><strong>门窗与家具</strong></div>
          <div class="feng-fixture-types">
            <button v-for="item in fengShuiFixtureTypes" :key="item.value" type="button" :class="{ active: activeTool === 'fixture' && activeFixtureType === item.value }" @click="chooseFixtureType(item.value)"><span>{{ item.symbol }}</span>{{ item.label }}</button>
          </div>
        </section>
      </aside>

      <section class="feng-canvas-panel">
        <div class="feng-editor-toolbar" aria-label="画布编辑操作">
          <div class="feng-history-actions">
            <button type="button" :disabled="!undoStack.length" title="撤销（Ctrl+Z）" @click="undoPlan"><Undo2 :size="14" />撤销</button>
            <button type="button" :disabled="!redoStack.length" title="重做（Ctrl+Y）" @click="redoPlan"><Redo2 :size="14" />重做</button>
            <button class="is-clear" type="button" :disabled="!hasCanvasContent" title="清空房间和标记" @click="clearPlan"><Trash2 :size="14" />清空</button>
          </div>
          <div class="feng-grid-status">
            <span>{{ plan.rooms.length }} 个房间 · {{ plan.fixtures.length }} 个标记</span>
            <span><Ruler :size="13" />{{ FENG_SHUI_COLUMNS }}×{{ FENG_SHUI_ROWS }} 格</span>
            <span><Move :size="13" />吸附 0.5 格</span>
          </div>
        </div>
        <div class="feng-canvas-guide">
          <span v-if="activeTool === 'room' && roomMode === 'rectangle'">按住画布并拖动，画出{{ fengShuiRoomDefinition(activeRoomType).label }}</span>
          <span v-else-if="activeTool === 'room'">依次点击房间拐点，点回第一个点完成</span>
          <span v-else-if="activeTool === 'fixture'">点击画布，放置{{ fengShuiFixtureDefinition(activeFixtureType).label }}</span>
          <span v-else>点击房间或标记，可在右侧调整</span>
          <b>上方朝{{ topDirectionLabel }}</b>
        </div>
        <div v-if="activeTool === 'room' && roomMode === 'polygon'" class="feng-polygon-actions">
          <span>{{ polygonDraft.length ? `已确定 ${polygonDraft.length} 个拐点${polygonDraftArea ? ` · 约 ${(polygonDraftArea * plan.cellMeters * plan.cellMeters).toFixed(1)}㎡` : ''}` : '尚未确定拐点' }}</span>
          <button type="button" :disabled="!polygonDraft.length" @click="undoPolygonPoint"><Undo2 :size="12" />撤销一点</button>
          <button type="button" :disabled="polygonDraft.length < 3" @click="finishPolygonRoom"><Check :size="12" />完成轮廓</button>
          <button type="button" :disabled="!polygonDraft.length" @click="cancelPolygonRoom"><X :size="12" />取消</button>
        </div>
        <div class="feng-canvas-wrap">
          <span class="feng-compass is-top">{{ fengShuiEdgeDirection('top', plan.topDirection) }}</span>
          <span class="feng-compass is-right">{{ fengShuiEdgeDirection('right', plan.topDirection) }}</span>
          <span class="feng-compass is-bottom">{{ fengShuiEdgeDirection('bottom', plan.topDirection) }}</span>
          <span class="feng-compass is-left">{{ fengShuiEdgeDirection('left', plan.topDirection) }}</span>
          <div
            ref="canvasRef"
            class="feng-canvas"
            :class="[`is-${activeTool}`, { 'is-room-polygon': activeTool === 'room' && roomMode === 'polygon' }]"
            role="application"
            :aria-label="`${FENG_SHUI_COLUMNS}乘${FENG_SHUI_ROWS}格住宅平面图画布`"
            @pointerdown="startCanvasAction"
            @pointermove="moveCanvasAction"
            @pointerup="finishCanvasAction"
            @pointercancel="cancelCanvasAction"
          >
            <svg class="feng-room-layer" :viewBox="`0 0 ${FENG_SHUI_COLUMNS} ${FENG_SHUI_ROWS}`" preserveAspectRatio="none">
              <g
                v-for="room in plan.rooms"
                :key="room.id"
                class="feng-room-shape"
                :class="{ selected: selectedRoomId === room.id }"
                :style="{ '--room-color': fengShuiRoomDefinition(room.type).color }"
                role="button"
                tabindex="0"
                :aria-label="`${room.name}，${room.shape === 'polygon' ? '自由轮廓' : '矩形'}，面积${roomAreaLabel(room)}平方米`"
                @pointerdown.stop="startRoomDrag($event, room)"
                @pointermove.stop="moveRoomDrag"
                @pointerup.stop="finishRoomDrag"
                @pointercancel.stop="cancelRoomDrag"
                @click.stop="selectRoom(room)"
                @keydown.enter.prevent="selectRoom(room)"
                @keydown.space.prevent="selectRoom(room)"
              >
                <polygon :points="roomSvgPoints(room)" />
                <text :x="roomLabelPoint(room).x" :y="roomLabelPoint(room).y - 0.08" text-anchor="middle">
                  <tspan :x="roomLabelPoint(room).x">{{ room.name }}</tspan>
                  <tspan :x="roomLabelPoint(room).x" dy="0.58">{{ roomAreaLabel(room) }}㎡</tspan>
                </text>
              </g>
            </svg>
            <svg v-if="polygonDraft.length" class="feng-polygon-draft" :viewBox="`0 0 ${FENG_SHUI_COLUMNS} ${FENG_SHUI_ROWS}`" preserveAspectRatio="none" aria-hidden="true">
              <polyline :points="polygonDraftSvgPoints" />
              <line
                v-if="polygonHoverPoint"
                :x1="polygonDraft[polygonDraft.length - 1].x"
                :y1="polygonDraft[polygonDraft.length - 1].y"
                :x2="polygonHoverPoint.x"
                :y2="polygonHoverPoint.y"
              />
              <circle v-for="(point, index) in polygonDraft" :key="`${point.x}-${point.y}-${index}`" :class="{ 'is-first': index === 0 }" :cx="point.x" :cy="point.y" r="0.18" />
            </svg>
            <button
              v-for="(point, index) in activeTool === 'select' ? (selectedRoom?.points || []) : []"
              :key="`vertex-${selectedRoom?.id}-${index}`"
              type="button"
              class="feng-vertex-handle"
              :class="{ active: selectedVertexIndex === index }"
              :style="vertexStyle(point)"
              :aria-label="`拖动${selectedRoom?.name}的第${index + 1}个拐点`"
              @pointerdown.stop="startVertexDrag($event, selectedRoom, index)"
              @pointermove.stop="moveVertexDrag"
              @pointerup.stop="finishVertexDrag"
              @pointercancel.stop="cancelVertexDrag"
              @click.stop
            ></button>
            <button
              v-for="fixture in plan.fixtures"
              :key="fixture.id"
              type="button"
              class="feng-fixture"
              :class="{ selected: selectedFixtureId === fixture.id, 'is-main-door': fixture.type === 'mainDoor' }"
              :style="fixtureStyle(fixture)"
              :aria-label="fengShuiFixtureDefinition(fixture.type).label"
              @pointerdown.stop="startFixtureDrag($event, fixture)"
              @pointermove.stop="moveFixtureDrag"
              @pointerup.stop="finishFixtureDrag"
              @pointercancel.stop="cancelFixtureDrag"
              @click.stop="selectFixture(fixture)"
            >{{ fengShuiFixtureDefinition(fixture.type).symbol }}</button>
            <div v-if="roomDraftRect" class="feng-room-draft" :style="roomStyle({ ...roomDraftRect, type: activeRoomType })"><span>{{ roomDraftRect.width }}×{{ roomDraftRect.height }} 格 · {{ (roomDraftRect.width * plan.cellMeters).toFixed(1) }}×{{ (roomDraftRect.height * plan.cellMeters).toFixed(1) }}米</span></div>
            <div v-if="!plan.rooms.length && !roomDraftRect && !polygonDraft.length" class="feng-canvas-empty"><Compass :size="25" /><strong>从左侧选择房间</strong><span>可以拖出矩形，也可以逐点绘制自由轮廓</span></div>
          </div>
        </div>
        <UiNotice v-if="editorMessage" class="feng-editor-message" :tone="editorMessageType === 'error' ? 'error' : editorMessageType === 'success' ? 'success' : 'info'" compact>{{ editorMessage }}</UiNotice>
      </section>

      <aside v-if="selectedRoom || selectedFixture" class="feng-inspector">
        <template v-if="selectedRoom">
          <div class="feng-inspector-heading"><div><small>正在调整</small><strong>{{ selectedRoom.name }}</strong></div><button type="button" aria-label="删除房间" @click="deleteSelection"><Trash2 :size="14" /></button></div>
          <label><span>名称</span><input v-model.trim="selectedRoom.name" maxlength="20" /></label>
          <UiSelect v-model="selectedRoom.type" label="房间类型"><option v-for="item in fengShuiRoomTypes" :key="item.value" :value="item.value">{{ item.label }}</option></UiSelect>
          <div class="feng-room-metrics">
            <div><span>外接尺寸</span><strong>{{ selectedRoom.width }}×{{ selectedRoom.height }} 格</strong><small>{{ (selectedRoom.width * plan.cellMeters).toFixed(1) }}×{{ (selectedRoom.height * plan.cellMeters).toFixed(1) }} 米</small></div>
            <div><span>真实面积</span><strong>{{ roomAreaLabel(selectedRoom) }}㎡</strong><small>{{ selectedRoom.points.length }} 个拐点</small></div>
          </div>
          <div v-if="selectedRoom.shape === 'rectangle'" class="feng-number-grid">
            <label><span>距左（格）</span><input :value="selectedRoom.x" type="number" min="0" step="0.5" :max="FENG_SHUI_COLUMNS - selectedRoom.width" @change="updateRoomNumber('x', $event)" /></label>
            <label><span>距上（格）</span><input :value="selectedRoom.y" type="number" min="0" step="0.5" :max="FENG_SHUI_ROWS - selectedRoom.height" @change="updateRoomNumber('y', $event)" /></label>
            <label><span>宽（格）</span><input :value="selectedRoom.width" type="number" min="0.5" step="0.5" :max="FENG_SHUI_COLUMNS - selectedRoom.x" @change="updateRoomNumber('width', $event)" /></label>
            <label><span>高（格）</span><input :value="selectedRoom.height" type="number" min="0.5" step="0.5" :max="FENG_SHUI_ROWS - selectedRoom.y" @change="updateRoomNumber('height', $event)" /></label>
          </div>
          <div class="feng-vertex-actions">
            <button type="button" @click="addRoomVertex"><Plus :size="13" />增加拐点</button>
            <button type="button" :disabled="selectedVertexIndex === null || selectedRoom.points.length <= 3" @click="removeRoomVertex"><X :size="13" />删除此拐点</button>
            <small>{{ selectedVertexIndex === null ? '点击一个紫色拐点后，可指定增删位置' : `已选择第 ${selectedVertexIndex + 1} 个拐点` }}</small>
          </div>
          <p class="feng-room-shape-hint">拖动房间主体可整体移动；拖动紫色拐点可调整不规则轮廓。</p>
        </template>
        <template v-else-if="selectedFixture">
          <div class="feng-inspector-heading"><div><small>正在调整</small><strong>{{ fengShuiFixtureDefinition(selectedFixture.type).label }}</strong></div><button type="button" aria-label="删除标记" @click="deleteSelection"><Trash2 :size="14" /></button></div>
          <UiSelect v-model="selectedFixture.type" label="标记类型"><option v-for="item in fengShuiFixtureTypes" :key="item.value" :value="item.value">{{ item.label }}</option></UiSelect>
          <UiSelect v-model="selectedFixture.facing" label="朝向"><option v-for="item in fengShuiFacingOptions" :key="item.value" :value="item.value">{{ item.label }}</option></UiSelect>
          <p class="feng-fixture-location">位于{{ findFixtureRoom(selectedFixture, plan.rooms)?.name || '已绘制房间之外' }} · 中心坐标 X {{ selectedFixture.x + 0.5 }} / Y {{ selectedFixture.y + 0.5 }}</p>
        </template>
      </aside>
    </div>

    <section class="feng-ai-section">
      <UiSectionHeading class="feng-ai-heading" title="风水解读" compact />
      <div class="feng-ai-layout">
        <div class="feng-ai-form">
          <label><span>你想重点了解什么</span><textarea v-model="question" maxlength="2000" placeholder="例如：卧室和厨房布局是否需要调整？"></textarea></label>
          <UiButton class="feng-interpret-button" :loading="isInterpreting" :disabled="!plan.rooms.length" @click="interpretPlan"><Sparkles v-if="!isInterpreting" :size="15" />{{ isInterpreting ? '解读中…' : '开始解读' }}</UiButton>
          <small v-if="!plan.rooms.length">请先在上方绘制房间。</small>
        </div>
      </div>
      <div v-if="isInterpreting || aiError || aiAnswer" class="feng-ai-answer">
        <div><Sparkles :size="15" /><strong>AI 解读</strong><span v-if="answerOutdated">平面图已修改，建议重新解读</span></div>
        <p v-if="isInterpreting">正在结合房间、方位和相邻关系整理建议…</p>
        <template v-else-if="aiError"><UiNotice tone="error" compact>{{ aiError }}</UiNotice><AiPromptFallback v-if="lastAiRequest" :request="lastAiRequest" @retry="interpretPlan" /></template>
        <template v-else><ChatMarkdown class="feng-ai-markdown" :content="aiAnswer" /><AiReadingActions :content="aiAnswer" title="居家风水解读" /></template>
      </div>
    </section>
      </template>
    </UiWorkspaceSurface>
  </UiToolPage>
</template>

<style scoped>
.feng-shui-screen { --feng-panel: var(--ds-surface-raised); --feng-soft: var(--ds-surface-muted); --feng-line: var(--ds-line); }
.feng-workspace-surface { min-width: 0; }
.feng-plan-settings { align-items: end; border-bottom: 1px solid var(--feng-line); display: grid; gap: 12px; grid-template-columns: minmax(150px, 1.2fr) minmax(120px, .7fr) minmax(120px, .7fr); padding: 4px 0 18px; }
.feng-plan-settings label, .feng-inspector label, .feng-ai-form label { color: var(--muted); display: grid; font-size: var(--type-caption); gap: 6px; min-width: 0; }
.feng-plan-settings input, .feng-plan-settings select, .feng-inspector input, .feng-inspector select, .feng-inspector textarea, .feng-ai-form textarea { background: var(--feng-soft); border: 1px solid var(--feng-line); border-radius: var(--ds-radius-sm); color: var(--ink); font-size: var(--type-small); min-height: var(--ds-control-md); padding: 8px 10px; width: 100%; }
.feng-editor { display: grid; gap: 16px; grid-template-columns: minmax(170px, .58fr) minmax(390px, 1.6fr) minmax(190px, .68fr); margin-top: 18px; }
.feng-palette, .feng-canvas-panel, .feng-inspector { min-width: 0; }
.feng-palette { align-content: start; border-right: 1px solid var(--feng-line); display: grid; gap: 18px; padding: 0 16px 0 0; }
.feng-tool-tabs { width: 100%; }
.feng-panel-title { align-items: center; display: flex; justify-content: space-between; margin-bottom: 8px; }
.feng-panel-title strong { color: var(--ink); font-size: var(--type-small); }
.feng-panel-title small { color: var(--subtle); font-size: var(--type-micro); }
.feng-room-modes { margin-bottom: 8px; width: 100%; }
.feng-room-types { display: grid; gap: 4px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.feng-room-types button { align-items: center; background: transparent; border: 1px solid transparent; border-radius: 7px; color: var(--muted); display: flex; font-size: var(--type-micro); gap: 5px; min-height: 32px; min-width: 0; padding: 5px; text-align: left; }
.feng-room-types button:hover, .feng-room-types button.active { background: var(--feng-soft); border-color: var(--feng-line); color: var(--accent-strong); }
.feng-room-types i { border: 1px solid rgba(71, 57, 76, .08); border-radius: 3px; flex: 0 0 auto; height: 12px; width: 12px; }
.feng-fixture-types { display: grid; gap: 4px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.feng-fixture-types button { align-items: center; background: transparent; border-radius: 7px; color: var(--muted); display: flex; font-size: var(--type-micro); gap: 5px; min-height: 32px; padding: 4px; text-align: left; }
.feng-fixture-types button:hover, .feng-fixture-types button.active { background: var(--feng-soft); color: var(--accent-strong); }
.feng-fixture-types span { align-items: center; background: var(--accent-soft); border-radius: 5px; color: var(--accent-strong); display: inline-flex; flex: 0 0 auto; font-size: var(--type-micro); height: 24px; justify-content: center; width: 24px; }
.feng-canvas-panel { background: var(--feng-panel); border: 1px solid var(--feng-line); border-radius: 14px; padding: 13px 17px 14px; }
.feng-editor-toolbar { align-items: center; border-bottom: 1px solid var(--feng-line); display: flex; gap: 10px; justify-content: space-between; margin-bottom: 9px; padding-bottom: 8px; }
.feng-history-actions, .feng-grid-status { align-items: center; display: flex; gap: 5px; }
.feng-history-actions button { align-items: center; background: var(--feng-soft); border: 1px solid transparent; border-radius: 7px; color: var(--muted); display: inline-flex; font-size: var(--type-micro); gap: 4px; min-height: 30px; padding: 4px 8px; }
.feng-history-actions button:hover:not(:disabled) { border-color: var(--feng-line); color: var(--accent-strong); }
.feng-history-actions button.is-clear { color: #a65364; margin-left: 3px; }
.feng-history-actions button.is-clear:hover:not(:disabled) { border-color: color-mix(in srgb, #a65364 38%, var(--feng-line)); }
.feng-history-actions button:disabled { cursor: not-allowed; opacity: .38; }
.feng-grid-status { color: var(--subtle); flex-wrap: wrap; font-size: var(--type-micro); justify-content: flex-end; }
.feng-grid-status span { align-items: center; display: inline-flex; gap: 3px; white-space: nowrap; }
.feng-canvas-guide { align-items: center; color: var(--muted); display: flex; font-size: var(--type-caption); gap: 10px; justify-content: space-between; margin-bottom: 12px; }
.feng-canvas-guide b { color: var(--accent-strong); font-weight: 600; }
.feng-polygon-actions { align-items: center; background: var(--feng-soft); border: 1px solid var(--feng-line); border-radius: 8px; display: flex; flex-wrap: wrap; gap: 5px; margin: -4px 0 8px; padding: 6px 8px; }
.feng-polygon-actions span { color: var(--muted); font-size: var(--type-micro); margin-right: auto; }
.feng-polygon-actions button { align-items: center; background: var(--feng-panel); border: 1px solid var(--feng-line); border-radius: 6px; color: var(--accent-strong); display: inline-flex; font-size: var(--type-micro); gap: 3px; min-height: 29px; padding: 4px 7px; }
.feng-polygon-actions button:disabled { cursor: not-allowed; opacity: .42; }
.feng-canvas-wrap { padding: 18px; position: relative; }
.feng-canvas { aspect-ratio: 5 / 4; background-color: #fbfafc; background-image: linear-gradient(to right, rgba(104, 91, 118, .12) 1px, transparent 1px), linear-gradient(to bottom, rgba(104, 91, 118, .12) 1px, transparent 1px); background-size: 5% 6.25%; border: 2px solid #81738c; cursor: crosshair; overflow: hidden; position: relative; touch-action: none; width: 100%; }
.feng-canvas.is-select { cursor: default; }
.feng-canvas.is-fixture { cursor: cell; }
.feng-canvas:not(.is-select) .feng-room-shape, .feng-canvas:not(.is-select) .feng-fixture { pointer-events: none; }
.feng-compass { align-items: center; background: var(--accent-strong); border-radius: 99px; color: white; display: inline-flex; font-size: var(--type-micro); height: 22px; justify-content: center; position: absolute; width: 22px; z-index: 2; }
.feng-compass.is-top { left: 50%; top: -4px; transform: translateX(-50%); }
.feng-compass.is-right { right: -4px; top: 50%; transform: translateY(-50%); }
.feng-compass.is-bottom { bottom: -4px; left: 50%; transform: translateX(-50%); }
.feng-compass.is-left { left: -4px; top: 50%; transform: translateY(-50%); }
.feng-room-layer { height: 100%; inset: 0; pointer-events: none; position: absolute; width: 100%; z-index: 1; }
.feng-room-shape { cursor: move; outline: none; pointer-events: all; }
.feng-room-shape polygon { fill: color-mix(in srgb, var(--room-color) 78%, white); stroke: color-mix(in srgb, var(--room-color) 58%, #66566f); stroke-linejoin: round; stroke-width: .09; transition: filter .15s ease, stroke-width .15s ease; }
.feng-room-shape:hover polygon, .feng-room-shape:focus-visible polygon, .feng-room-shape.selected polygon { filter: brightness(.97); stroke: #765b8b; stroke-width: .18; }
.feng-room-shape text { fill: #4d4654; font-size: .43px; font-weight: 600; pointer-events: none; }
.feng-room-shape text tspan + tspan { font-size: .31px; font-weight: 400; opacity: .72; }
.feng-polygon-draft { height: 100%; inset: 0; overflow: visible; pointer-events: none; position: absolute; width: 100%; z-index: 6; }
.feng-polygon-draft polyline, .feng-polygon-draft line { fill: color-mix(in srgb, var(--room-color, #d9d7ef) 20%, transparent); stroke: var(--accent-strong); stroke-dasharray: .22 .14; stroke-linecap: round; stroke-linejoin: round; stroke-width: .1; }
.feng-polygon-draft circle { fill: #fff; stroke: var(--accent-strong); stroke-width: .08; }
.feng-polygon-draft circle.is-first { fill: var(--accent-strong); }
.feng-vertex-handle { background: #fff; border: 2px solid #765b8b; border-radius: 50%; box-shadow: 0 1px 5px rgba(55, 38, 67, .24); cursor: grab; height: clamp(12px, 1.5vw, 17px); padding: 0; position: absolute; transform: translate(-50%, -50%); width: clamp(12px, 1.5vw, 17px); z-index: 7; }
.feng-vertex-handle.active { background: #765b8b; box-shadow: 0 0 0 4px rgba(118, 91, 139, .2); }
.feng-vertex-handle:active { cursor: grabbing; transform: translate(-50%, -50%) scale(1.16); }
.feng-fixture { align-items: center; background: #fff; border: 1px solid #75627f; border-radius: 5px; box-shadow: 0 2px 7px rgba(43, 34, 49, .14); color: #5b4965; cursor: grab; display: inline-flex; font-size: 7px; height: clamp(16px, 2vw, 23px); justify-content: center; padding: 0; position: absolute; transform: translate(-50%, -50%); width: clamp(16px, 2vw, 23px); z-index: 4; }
.feng-fixture:active { cursor: grabbing; }
.feng-fixture.is-main-door { background: #6f556f; color: #fff; }
.feng-fixture:hover, .feng-fixture.selected { box-shadow: 0 0 0 3px rgba(126, 95, 155, .28); }
.feng-room-draft { align-items: center; background: color-mix(in srgb, var(--room-color) 45%, transparent); border: 2px dashed var(--accent-strong); color: var(--accent-strong); display: flex; justify-content: center; pointer-events: none; position: absolute; z-index: 5; }
.feng-room-draft span { background: #fff; border-radius: 4px; font-size: 8px; padding: 3px 5px; }
.feng-canvas-empty { align-items: center; color: var(--subtle); display: flex; flex-direction: column; inset: 0; justify-content: center; pointer-events: none; position: absolute; text-align: center; }
.feng-canvas-empty strong { color: var(--muted); font-size: var(--type-small); margin-top: 7px; }
.feng-canvas-empty span { font-size: var(--type-micro); margin-top: 4px; }
.feng-editor-message { font-size: var(--type-caption); margin: 8px 1px 0; }
.feng-editor-message.is-info { color: var(--muted); }
.feng-editor-message.is-success { color: #61846d; }
.feng-editor-message.is-error { color: #ae5969; }
.feng-inspector { align-content: start; align-self: start; border-left: 1px solid var(--feng-line); display: grid; gap: 11px; padding: 0 0 0 16px; }
.feng-inspector-heading { align-items: center; border-bottom: 1px solid var(--feng-line); display: flex; justify-content: space-between; padding-bottom: 10px; }
.feng-inspector-heading small, .feng-inspector-heading strong { display: block; }
.feng-inspector-heading small { color: var(--subtle); font-size: var(--type-micro); }
.feng-inspector-heading strong { color: var(--ink); font-size: var(--type-control); margin-top: 2px; }
.feng-inspector-heading button { align-items: center; background: var(--feng-soft); border-radius: 7px; color: #a65364; display: inline-flex; height: 30px; justify-content: center; width: 30px; }
.feng-number-grid { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.feng-room-metrics { display: grid; gap: 6px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.feng-room-metrics > div { background: var(--feng-soft); border: 1px solid var(--feng-line); border-radius: 8px; display: grid; gap: 2px; padding: 8px; }
.feng-room-metrics span, .feng-room-metrics small { color: var(--subtle); font-size: var(--type-micro); }
.feng-room-metrics strong { color: var(--ink); font-size: var(--type-caption); font-weight: 600; }
.feng-vertex-actions { display: grid; gap: 5px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.feng-vertex-actions button { align-items: center; background: var(--feng-soft); border: 1px solid var(--feng-line); border-radius: 7px; color: var(--accent-strong); display: inline-flex; font-size: var(--type-micro); gap: 4px; justify-content: center; min-height: 32px; padding: 5px; }
.feng-vertex-actions button:disabled { cursor: not-allowed; opacity: .4; }
.feng-vertex-actions small { color: var(--subtle); font-size: var(--type-micro); grid-column: 1 / -1; line-height: 1.45; }
.feng-room-shape-hint { background: var(--feng-soft); border-radius: 8px; color: var(--muted); font-size: var(--type-micro); line-height: 1.6; margin: 0; padding: 8px 9px; }
.feng-fixture-location { color: var(--subtle); font-size: var(--type-micro); line-height: 1.6; margin: 0; }
.feng-notes { border-top: 1px solid var(--feng-line); margin-top: 3px; padding-top: 11px; }
.feng-notes textarea { line-height: 1.6; min-height: 86px; resize: vertical; }
.feng-ai-section { border-top: 1px solid var(--feng-line); margin-top: 22px; padding: 20px 0 0; }
.feng-ai-heading { align-items: flex-end; display: flex; justify-content: space-between; }
.feng-ai-heading h2 { color: var(--ink); font-size: var(--type-section); margin: 0; }
.feng-ai-heading > span { color: var(--muted); font-size: var(--type-caption); }
.feng-ai-layout { display: grid; gap: 14px; grid-template-columns: minmax(0, 680px); margin-top: 13px; }
.feng-ai-form textarea { line-height: 1.65; min-height: 94px; resize: vertical; }
.feng-interpret-button { margin-top: 9px; width: 100%; }
.feng-ai-form > small { color: var(--subtle); display: block; font-size: var(--type-micro); margin-top: 7px; text-align: center; }
.feng-ai-answer { background: var(--feng-soft); border-radius: 12px; margin-top: 14px; padding: 14px; }
.feng-ai-answer > div { align-items: center; color: var(--accent-strong); display: flex; font-size: var(--type-small); gap: 6px; }
.feng-ai-answer > div span { color: var(--plum); font-size: var(--type-micro); margin-left: auto; }
.feng-ai-answer p { color: var(--ink); font-size: var(--type-body); line-height: 1.85; margin: 10px 0 0; white-space: pre-wrap; }
.feng-ai-markdown { color: var(--ink); font-size: var(--type-body); line-height: 1.85; margin-top: 10px; }
.feng-ai-markdown :deep(> :first-child) { margin-top: 0; }
.feng-ai-markdown :deep(> :last-child) { margin-bottom: 0; }
.feng-ai-answer p.is-error { color: #ae5969; }
@media (max-width: 1200px) {
  .feng-editor { grid-template-columns: minmax(180px, .52fr) minmax(0, 1.48fr); }
  .feng-inspector { border-left: 0; border-top: 1px solid var(--feng-line); grid-column: 1 / -1; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 15px 0 0; }
  .feng-inspector-heading, .feng-notes { grid-column: 1 / -1; }
}

@media (max-width: 820px) {
  .feng-plan-settings { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .feng-editor, .feng-ai-layout { grid-template-columns: 1fr; }
  .feng-inspector { border-top: 1px solid var(--feng-line); grid-column: auto; padding-top: 15px; }
  .feng-palette { border-bottom: 1px solid var(--feng-line); border-right: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 0 0 15px; }
  .feng-tool-tabs { grid-column: 1 / -1; }
}

@media (max-width: 520px) {
  .feng-plan-settings { gap: 9px; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 2px 0 14px; }
  .feng-plan-settings label:first-child { grid-column: 1 / -1; }
  .feng-editor { gap: 14px; margin-top: 14px; }
  .feng-palette { display: block; padding: 0 0 14px; }
  .feng-palette > section { margin-top: 12px; min-width: 0; }
  .feng-inspector { grid-template-columns: 1fr; }
  .feng-room-types,
  .feng-fixture-types { display: flex; gap: 6px; margin: 0 -2px; overflow-x: auto; padding: 1px 2px 5px; scroll-snap-type: x proximity; scrollbar-width: none; }
  .feng-room-types::-webkit-scrollbar,
  .feng-fixture-types::-webkit-scrollbar { display: none; }
  .feng-room-types button,
  .feng-fixture-types button { background: var(--feng-soft); border: 1px solid var(--feng-line); flex: 0 0 auto; min-height: 36px; min-width: 78px; padding: 5px 7px; scroll-snap-align: start; }
  .feng-room-types button.active,
  .feng-fixture-types button.active { background: var(--accent-soft); border-color: color-mix(in srgb, var(--accent) 38%, var(--line)); }
  .feng-tool-tabs, .feng-inspector-heading, .feng-notes { grid-column: auto; }
  .feng-canvas-panel { padding: 11px 7px 12px; }
  .feng-canvas-guide { padding: 0 3px; }
  .feng-canvas-guide span { max-width: 72%; }
  .feng-canvas-wrap { padding: 16px 14px; }
  .feng-room-shape text tspan + tspan { display: none; }
  .feng-polygon-actions span { flex-basis: 100%; }
  .feng-ai-section { margin-top: 16px; padding: 16px 0 0; }
  .feng-ai-heading { align-items: flex-start; flex-direction: column; gap: 7px; }
}

/* 极简编辑布局：低频设置收起，同一时间只显示一种绘制工具。 */
.feng-settings-disclosure { border-bottom: 1px solid var(--feng-line); border-top: 1px solid var(--feng-line); }
.feng-settings-disclosure > summary { align-items: center; color: var(--ink); cursor: pointer; display: flex; justify-content: space-between; list-style: none; min-height: 44px; }
.feng-settings-disclosure > summary::-webkit-details-marker { display: none; }
.feng-settings-disclosure > summary > span { display: grid; gap: 2px; }
.feng-settings-disclosure > summary strong { font-size: var(--type-small); }
.feng-settings-disclosure > summary small { color: var(--muted); font-size: var(--type-caption); font-weight: 400; }
.feng-settings-disclosure > summary svg { color: var(--muted); transition: transform .18s ease; }
.feng-settings-disclosure[open] > summary svg { transform: rotate(180deg); }
.feng-settings-disclosure > summary:focus { outline: 0; }
.feng-settings-disclosure > summary:focus-visible { box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 42%, transparent); }
.feng-plan-settings { border-bottom: 0; border-top: 1px solid var(--feng-line); padding: 12px 0 14px; }
.feng-plan-settings .feng-notes { border: 0; grid-column: 1 / -1; margin: 0; padding: 0; }
.feng-plan-settings .feng-notes textarea { min-height: 40px; resize: vertical; }
.feng-editor { gap: 18px; grid-template-columns: minmax(170px, .42fr) minmax(0, 1.58fr); margin-top: 14px; }
.feng-editor.has-inspector { grid-template-columns: minmax(170px, .42fr) minmax(390px, 1.4fr) minmax(185px, .52fr); }
.feng-palette { gap: 12px; }
.feng-palette > section { margin-top: 0; }
.feng-canvas-panel { background: transparent; border: 0; border-radius: 0; padding: 0; }
.feng-canvas-guide { margin-bottom: 7px; }
.feng-canvas-wrap { padding: 15px; }
.feng-inspector { gap: 9px; }
.feng-ai-section { margin-top: 17px; padding-top: 16px; }
.feng-ai-layout { margin-top: 9px; max-width: none; }
.feng-ai-form { align-items: end; display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr) auto; }
.feng-ai-form textarea { min-height: 62px; resize: none; }
.feng-interpret-button { margin: 0; min-width: 112px; width: auto; }
.feng-ai-form > small { grid-column: 1 / -1; margin-top: 0; text-align: left; }
@media (max-width: 1200px) {
  .feng-editor,
  .feng-editor.has-inspector { grid-template-columns: minmax(180px, .48fr) minmax(0, 1.52fr); }
}

@media (max-width: 820px) {
  .feng-editor,
  .feng-editor.has-inspector { grid-template-columns: 1fr; }
  .feng-palette { display: block; }
  .feng-palette > section { margin-top: 10px; }
}

@media (max-width: 520px) {
  .feng-settings-disclosure > summary { min-height: 41px; }
  .feng-plan-settings { gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 10px 0 12px; }
  .feng-plan-settings label:first-child,
  .feng-plan-settings .feng-notes { grid-column: 1 / -1; }
  .feng-plan-settings .feng-notes textarea { min-height: 52px; }
  .feng-editor { gap: 9px; margin-top: 10px; }
  .feng-palette { border-bottom: 0; padding-bottom: 0; }
  .feng-palette > section { margin-top: 9px; }
  .feng-room-modes { margin-bottom: 6px; }
  .feng-room-types,
  .feng-fixture-types { padding-bottom: 3px; }
  .feng-room-types button,
  .feng-fixture-types button { min-height: 33px; min-width: 72px; }
  .feng-editor-toolbar { align-items: flex-start; flex-wrap: wrap; }
  .feng-history-actions { width: 100%; }
  .feng-history-actions button { flex: 1 1 0; justify-content: center; }
  .feng-grid-status { justify-content: space-between; width: 100%; }
  .feng-canvas-guide { font-size: 11px; margin-bottom: 5px; padding: 0; }
  .feng-canvas-wrap { padding: 13px 12px; }
  .feng-inspector { gap: 8px; padding-top: 11px; }
  .feng-ai-section { margin-top: 12px; padding-top: 12px; }
  .feng-ai-layout { margin-top: 7px; }
  .feng-ai-form textarea { min-height: 56px; }
  .feng-interpret-button { min-width: 104px; padding-inline: 10px; }
}

@media (max-width: 350px) {
  .feng-ai-form { grid-template-columns: 1fr; }
  .feng-interpret-button { width: 100%; }
}

@media (prefers-color-scheme: dark) {
  .feng-shui-screen { --feng-panel: var(--ds-surface-raised); --feng-soft: var(--ds-surface-muted); --feng-line: var(--ds-line); }
  .feng-canvas { background-color: #252229; background-image: linear-gradient(to right, rgba(202, 190, 210, .12) 1px, transparent 1px), linear-gradient(to bottom, rgba(202, 190, 210, .12) 1px, transparent 1px); border-color: #81758b; }
  .feng-room-shape polygon { fill: color-mix(in srgb, var(--room-color) 42%, #29262d); stroke: color-mix(in srgb, var(--room-color) 45%, #aaa0af); }
  .feng-room-shape text { fill: #eee9f0; }
  .feng-fixture { background: #3e3944; border-color: #9b8ca4; color: #eee8f1; }
  .feng-fixture.is-main-door { background: #826a84; }
  .feng-fixture-types span { background: #413a49; color: #d8c3e0; }
  .feng-room-draft span { background: #302c35; }
  .feng-vertex-handle { background: #2f2a33; border-color: #b59ac7; }
  .feng-vertex-handle.active { background: #b59ac7; }
}
</style>
