export const FENG_SHUI_COLUMNS = 20;
export const FENG_SHUI_ROWS = 16;

export type FengShuiTopDirection = 'north' | 'east' | 'south' | 'west';
export type FengShuiFacingDirection = FengShuiTopDirection | 'northeast' | 'southeast' | 'southwest' | 'northwest' | 'unknown';
export type FengShuiRoomType = 'entrance' | 'living' | 'dining' | 'kitchen' | 'masterBedroom' | 'bedroom' | 'study' | 'bathroom' | 'balcony' | 'storage' | 'other';
export type FengShuiFixtureType = 'mainDoor' | 'door' | 'window' | 'bed' | 'stove' | 'sink' | 'toilet' | 'sofa' | 'desk' | 'altar';

export interface FengShuiPoint {
  x: number;
  y: number;
}

export interface FengShuiRoom {
  id: string;
  type: FengShuiRoomType;
  name: string;
  shape: 'rectangle' | 'polygon';
  x: number;
  y: number;
  width: number;
  height: number;
  points: FengShuiPoint[];
}

export interface FengShuiFixture {
  id: string;
  type: FengShuiFixtureType;
  x: number;
  y: number;
  facing: FengShuiFacingDirection;
}

export interface FengShuiPlan {
  version: 2;
  title: string;
  topDirection: FengShuiTopDirection;
  cellMeters: number;
  rooms: FengShuiRoom[];
  fixtures: FengShuiFixture[];
  notes: string;
}

export const fengShuiTopDirectionOptions: Array<{ value: FengShuiTopDirection; label: string }> = [
  { value: 'north', label: '北' },
  { value: 'east', label: '东' },
  { value: 'south', label: '南' },
  { value: 'west', label: '西' },
];

export const fengShuiFacingOptions: Array<{ value: FengShuiFacingDirection; label: string }> = [
  { value: 'unknown', label: '未标注' },
  { value: 'north', label: '北' },
  { value: 'northeast', label: '东北' },
  { value: 'east', label: '东' },
  { value: 'southeast', label: '东南' },
  { value: 'south', label: '南' },
  { value: 'southwest', label: '西南' },
  { value: 'west', label: '西' },
  { value: 'northwest', label: '西北' },
];

export const fengShuiRoomTypes: Array<{ value: FengShuiRoomType; label: string; color: string }> = [
  { value: 'entrance', label: '玄关', color: '#e8d9bd' },
  { value: 'living', label: '客厅', color: '#d9d7ef' },
  { value: 'dining', label: '餐厅', color: '#e7d8e9' },
  { value: 'kitchen', label: '厨房', color: '#efcfca' },
  { value: 'masterBedroom', label: '主卧', color: '#cedfec' },
  { value: 'bedroom', label: '次卧', color: '#d8e4ee' },
  { value: 'study', label: '书房', color: '#d6e4db' },
  { value: 'bathroom', label: '卫生间', color: '#cfe2e5' },
  { value: 'balcony', label: '阳台', color: '#e6e1c7' },
  { value: 'storage', label: '储物间', color: '#ddd7cf' },
  { value: 'other', label: '其他', color: '#dfdbe5' },
];

export const fengShuiFixtureTypes: Array<{ value: FengShuiFixtureType; label: string; symbol: string }> = [
  { value: 'mainDoor', label: '大门', symbol: '门' },
  { value: 'door', label: '房门', symbol: '户' },
  { value: 'window', label: '窗户', symbol: '窗' },
  { value: 'bed', label: '床', symbol: '床' },
  { value: 'stove', label: '灶台', symbol: '灶' },
  { value: 'sink', label: '水槽', symbol: '水' },
  { value: 'toilet', label: '马桶', symbol: '卫' },
  { value: 'sofa', label: '沙发', symbol: '沙' },
  { value: 'desk', label: '书桌', symbol: '桌' },
  { value: 'altar', label: '神位', symbol: '位' },
];

const directionLabels: Record<FengShuiFacingDirection | 'center', string> = {
  north: '北',
  northeast: '东北',
  east: '东',
  southeast: '东南',
  south: '南',
  southwest: '西南',
  west: '西',
  northwest: '西北',
  unknown: '未标注',
  center: '中部',
};

const clockwiseDirections: FengShuiFacingDirection[] = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

function finiteInteger(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function finiteCoordinate(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function samePoint(left: FengShuiPoint, right: FengShuiPoint) {
  return Math.abs(left.x - right.x) < 0.001 && Math.abs(left.y - right.y) < 0.001;
}

function cross(a: FengShuiPoint, b: FengShuiPoint, c: FengShuiPoint) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function pointOnSegment(point: FengShuiPoint, start: FengShuiPoint, end: FengShuiPoint) {
  return Math.abs(cross(start, end, point)) < 0.001
    && point.x >= Math.min(start.x, end.x) - 0.001
    && point.x <= Math.max(start.x, end.x) + 0.001
    && point.y >= Math.min(start.y, end.y) - 0.001
    && point.y <= Math.max(start.y, end.y) + 0.001;
}

function segmentsIntersect(a: FengShuiPoint, b: FengShuiPoint, c: FengShuiPoint, d: FengShuiPoint) {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return true;
  return (Math.abs(abC) < 0.001 && pointOnSegment(c, a, b))
    || (Math.abs(abD) < 0.001 && pointOnSegment(d, a, b))
    || (Math.abs(cdA) < 0.001 && pointOnSegment(a, c, d))
    || (Math.abs(cdB) < 0.001 && pointOnSegment(b, c, d));
}

export function normalizePolygonPoints(points: FengShuiPoint[]) {
  const normalized: FengShuiPoint[] = [];
  points.forEach((point) => {
    if (!normalized.length || !samePoint(normalized[normalized.length - 1], point)) normalized.push({ x: point.x, y: point.y });
  });
  if (normalized.length > 1 && samePoint(normalized[0], normalized[normalized.length - 1])) normalized.pop();
  return normalized;
}

export function pointsFromRectangle(rect: Pick<FengShuiRoom, 'x' | 'y' | 'width' | 'height'>): FengShuiPoint[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

export function polygonBounds(points: FengShuiPoint[]) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}

export function polygonArea(points: FengShuiPoint[]) {
  if (points.length < 3) return 0;
  const doubledArea = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.abs(doubledArea) / 2;
}

export function polygonCentroid(points: FengShuiPoint[]): FengShuiPoint {
  if (points.length < 3) return { x: 0, y: 0 };
  let signedAreaTimesTwo = 0;
  let x = 0;
  let y = 0;
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const factor = point.x * next.y - next.x * point.y;
    signedAreaTimesTwo += factor;
    x += (point.x + next.x) * factor;
    y += (point.y + next.y) * factor;
  });
  if (Math.abs(signedAreaTimesTwo) < 0.001) {
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
  }
  return { x: x / (3 * signedAreaTimesTwo), y: y / (3 * signedAreaTimesTwo) };
}

export function pointInPolygon(point: FengShuiPoint, points: FengShuiPoint[]) {
  if (points.some((vertex, index) => pointOnSegment(point, vertex, points[(index + 1) % points.length]))) return true;
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const current = points[index];
    const last = points[previous];
    const crosses = (current.y > point.y) !== (last.y > point.y)
      && point.x < (last.x - current.x) * (point.y - current.y) / (last.y - current.y) + current.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function polygonSelfIntersects(points: FengShuiPoint[]) {
  if (points.length < 4) return false;
  for (let left = 0; left < points.length; left += 1) {
    const leftNext = (left + 1) % points.length;
    for (let right = left + 1; right < points.length; right += 1) {
      const rightNext = (right + 1) % points.length;
      if (left === right || leftNext === right || rightNext === left) continue;
      if (segmentsIntersect(points[left], points[leftNext], points[right], points[rightNext])) return true;
    }
  }
  return false;
}

function isRoomType(value: unknown): value is FengShuiRoomType {
  return fengShuiRoomTypes.some((item) => item.value === value);
}

function isFixtureType(value: unknown): value is FengShuiFixtureType {
  return fengShuiFixtureTypes.some((item) => item.value === value);
}

function isTopDirection(value: unknown): value is FengShuiTopDirection {
  return fengShuiTopDirectionOptions.some((item) => item.value === value);
}

function isFacingDirection(value: unknown): value is FengShuiFacingDirection {
  return fengShuiFacingOptions.some((item) => item.value === value);
}

export function createEmptyFengShuiPlan(): FengShuiPlan {
  return {
    version: 2,
    title: '我的住宅',
    topDirection: 'north',
    cellMeters: 0.5,
    rooms: [],
    fixtures: [],
    notes: '',
  };
}

export function normalizeFengShuiPlan(value: unknown): FengShuiPlan {
  const empty = createEmptyFengShuiPlan();
  if (!value || typeof value !== 'object') return empty;
  const source = value as Partial<FengShuiPlan>;
  const rooms = Array.isArray(source.rooms) ? source.rooms.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return [];
    const room = entry as Partial<FengShuiRoom>;
    const x = clamp(finiteInteger(room.x, 0), 0, FENG_SHUI_COLUMNS - 1);
    const y = clamp(finiteInteger(room.y, 0), 0, FENG_SHUI_ROWS - 1);
    const width = clamp(finiteInteger(room.width, 2), 1, FENG_SHUI_COLUMNS - x);
    const height = clamp(finiteInteger(room.height, 2), 1, FENG_SHUI_ROWS - y);
    const type = isRoomType(room.type) ? room.type : 'other';
    const fallbackName = fengShuiRoomTypes.find((item) => item.value === type)?.label || '其他';
    const rectanglePoints = pointsFromRectangle({ x, y, width, height });
    const suppliedPoints = Array.isArray(room.points)
      ? room.points.flatMap((point) => {
        if (!point || typeof point !== 'object') return [];
        const sourcePoint = point as Partial<FengShuiPoint>;
        return [{
          x: clamp(finiteCoordinate(sourcePoint.x, 0), 0, FENG_SHUI_COLUMNS),
          y: clamp(finiteCoordinate(sourcePoint.y, 0), 0, FENG_SHUI_ROWS),
        }];
      })
      : [];
    const points = normalizePolygonPoints(suppliedPoints);
    const hasValidPolygon = points.length >= 3 && polygonArea(points) >= 0.25 && !polygonSelfIntersects(points);
    const normalizedPoints = hasValidPolygon ? points : rectanglePoints;
    const bounds = polygonBounds(normalizedPoints);
    const shape: FengShuiRoom['shape'] = hasValidPolygon && room.shape !== 'rectangle' ? 'polygon' : 'rectangle';
    return [{
      id: typeof room.id === 'string' && room.id ? room.id : `room-${index}`,
      type,
      name: typeof room.name === 'string' && room.name.trim() ? room.name.trim().slice(0, 20) : fallbackName,
      shape,
      ...bounds,
      points: normalizedPoints,
    }];
  }) : [];
  const fixtures = Array.isArray(source.fixtures) ? source.fixtures.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return [];
    const fixture = entry as Partial<FengShuiFixture>;
    if (!isFixtureType(fixture.type)) return [];
    return [{
      id: typeof fixture.id === 'string' && fixture.id ? fixture.id : `fixture-${index}`,
      type: fixture.type,
      x: clamp(finiteCoordinate(fixture.x, 0), 0, FENG_SHUI_COLUMNS - 1),
      y: clamp(finiteCoordinate(fixture.y, 0), 0, FENG_SHUI_ROWS - 1),
      facing: isFacingDirection(fixture.facing) ? fixture.facing : 'unknown',
    }];
  }) : [];
  const cellMeters = Number(source.cellMeters);
  return {
    version: 2,
    title: typeof source.title === 'string' && source.title.trim() ? source.title.trim().slice(0, 40) : empty.title,
    topDirection: isTopDirection(source.topDirection) ? source.topDirection : empty.topDirection,
    cellMeters: Number.isFinite(cellMeters) ? clamp(Math.round(cellMeters * 10) / 10, 0.2, 2) : empty.cellMeters,
    rooms,
    fixtures,
    notes: typeof source.notes === 'string' ? source.notes.slice(0, 1000) : '',
  };
}

export function fengShuiRoomDefinition(type: FengShuiRoomType) {
  return fengShuiRoomTypes.find((item) => item.value === type) || fengShuiRoomTypes[fengShuiRoomTypes.length - 1];
}

export function fengShuiFixtureDefinition(type: FengShuiFixtureType) {
  return fengShuiFixtureTypes.find((item) => item.value === type) || fengShuiFixtureTypes[0];
}

function rotateScreenDirection(direction: FengShuiFacingDirection, topDirection: FengShuiTopDirection) {
  const index = clockwiseDirections.indexOf(direction);
  if (index < 0) return direction;
  const quarterTurns = fengShuiTopDirectionOptions.findIndex((item) => item.value === topDirection);
  return clockwiseDirections[(index + quarterTurns * 2) % clockwiseDirections.length];
}

export function fengShuiPositionDirection(x: number, y: number, width: number, height: number, topDirection: FengShuiTopDirection) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const horizontal = centerX < FENG_SHUI_COLUMNS / 3 ? 'west' : centerX > FENG_SHUI_COLUMNS * 2 / 3 ? 'east' : 'center';
  const vertical = centerY < FENG_SHUI_ROWS / 3 ? 'north' : centerY > FENG_SHUI_ROWS * 2 / 3 ? 'south' : 'center';
  if (horizontal === 'center' && vertical === 'center') return '中部';
  const screenDirection = vertical === 'north'
    ? horizontal === 'west' ? 'northwest' : horizontal === 'east' ? 'northeast' : 'north'
    : vertical === 'south'
      ? horizontal === 'west' ? 'southwest' : horizontal === 'east' ? 'southeast' : 'south'
      : horizontal;
  return directionLabels[rotateScreenDirection(screenDirection as FengShuiFacingDirection, topDirection)];
}

export function fengShuiEdgeDirection(edge: 'top' | 'right' | 'bottom' | 'left', topDirection: FengShuiTopDirection) {
  const screenDirection: Record<typeof edge, FengShuiFacingDirection> = { top: 'north', right: 'east', bottom: 'south', left: 'west' };
  return directionLabels[rotateScreenDirection(screenDirection[edge], topDirection)];
}

export function findFixtureRoom(fixture: FengShuiFixture, rooms: FengShuiRoom[]) {
  const point = { x: fixture.x + 0.5, y: fixture.y + 0.5 };
  return [...rooms].reverse().find((room) => pointInPolygon(point, room.points)) || null;
}

function sharedSegmentLength(a: FengShuiPoint, b: FengShuiPoint, c: FengShuiPoint, d: FengShuiPoint) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length < 0.001 || Math.abs(cross(a, b, c)) > 0.001 || Math.abs(cross(a, b, d)) > 0.001) return 0;
  const unitX = (b.x - a.x) / length;
  const unitY = (b.y - a.y) / length;
  const cDistance = (c.x - a.x) * unitX + (c.y - a.y) * unitY;
  const dDistance = (d.x - a.x) * unitX + (d.y - a.y) * unitY;
  return Math.max(0, Math.min(length, Math.max(cDistance, dDistance)) - Math.max(0, Math.min(cDistance, dDistance)));
}

function sharedBoundaryLength(left: FengShuiRoom, right: FengShuiRoom) {
  let length = 0;
  left.points.forEach((point, leftIndex) => {
    const leftNext = left.points[(leftIndex + 1) % left.points.length];
    right.points.forEach((otherPoint, rightIndex) => {
      length += sharedSegmentLength(point, leftNext, otherPoint, right.points[(rightIndex + 1) % right.points.length]);
    });
  });
  return length;
}

function relativeDirection(from: FengShuiPoint, to: FengShuiPoint): FengShuiFacingDirection {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  if (Math.abs(deltaX) > Math.abs(deltaY) * 2) return deltaX > 0 ? 'east' : 'west';
  if (Math.abs(deltaY) > Math.abs(deltaX) * 2) return deltaY > 0 ? 'south' : 'north';
  if (deltaX >= 0 && deltaY >= 0) return 'southeast';
  if (deltaX >= 0 && deltaY < 0) return 'northeast';
  if (deltaX < 0 && deltaY >= 0) return 'southwest';
  return 'northwest';
}

function sharedWallDescription(left: FengShuiRoom, right: FengShuiRoom, topDirection: FengShuiTopDirection) {
  const sharedLength = sharedBoundaryLength(left, right);
  if (sharedLength < 0.01) return '';
  const direction = relativeDirection(polygonCentroid(left.points), polygonCentroid(right.points));
  const roundedLength = Math.round(sharedLength * 10) / 10;
  return `${right.name}位于${left.name}的${directionLabels[rotateScreenDirection(direction, topDirection)]}侧，共墙约${roundedLength}格`;
}

function getAdjacency(plan: FengShuiPlan) {
  const relations: string[] = [];
  plan.rooms.forEach((room, index) => {
    plan.rooms.slice(index + 1).forEach((other) => {
      const relation = sharedWallDescription(room, other, plan.topDirection);
      if (relation) relations.push(relation);
    });
  });
  return relations;
}

export function buildFengShuiModelContext(plan: FengShuiPlan) {
  const normalized = normalizeFengShuiPlan(plan);
  const topLabel = directionLabels[normalized.topDirection];
  const relations = getAdjacency(normalized);
  const rooms = normalized.rooms.map((room) => {
    const areaInGridCells = polygonArea(room.points);
    const center = polygonCentroid(room.points);
    return {
      id: room.id,
      name: room.name,
      type: fengShuiRoomDefinition(room.type).label,
      shape: room.shape === 'polygon' ? '自由轮廓' : '矩形',
      outline: room.points.map((point) => ({ x: point.x, y: point.y })),
      gridBounds: { left: room.x, top: room.y, width: room.width, height: room.height },
      center: { x: Number(center.x.toFixed(2)), y: Number(center.y.toFixed(2)) },
      approximateSizeMeters: {
        boundingWidth: Number((room.width * normalized.cellMeters).toFixed(1)),
        boundingHeight: Number((room.height * normalized.cellMeters).toFixed(1)),
        area: Number((areaInGridCells * normalized.cellMeters * normalized.cellMeters).toFixed(1)),
      },
      gridArea: Number(areaInGridCells.toFixed(2)),
      compassSector: fengShuiPositionDirection(center.x, center.y, 0, 0, normalized.topDirection),
    };
  });
  const fixtures = normalized.fixtures.map((fixture) => {
    const definition = fengShuiFixtureDefinition(fixture.type);
    const room = findFixtureRoom(fixture, normalized.rooms);
    const centerCoordinate = {
      x: Number((fixture.x + 0.5).toFixed(2)),
      y: Number((fixture.y + 0.5).toFixed(2)),
    };
    return {
      id: fixture.id,
      type: definition.label,
      gridPosition: { column: fixture.x, row: fixture.y },
      centerCoordinate,
      compassSector: fengShuiPositionDirection(fixture.x, fixture.y, 1, 1, normalized.topDirection),
      room: room?.name || '未落在已绘制房间内',
      facing: directionLabels[fixture.facing],
    };
  });
  const missingFacts: string[] = [];
  if (!fixtures.some((item) => item.type === '大门')) missingFacts.push('未标注住宅大门');
  if (!fixtures.some((item) => item.type === '窗户')) missingFacts.push('未标注窗户');
  if (!normalized.notes.trim()) missingFacts.push('未补充楼层、外部环境或居住者需求');

  const text = [
    `户型名称：${normalized.title}`,
    `坐标约定：画布为 ${FENG_SHUI_COLUMNS}×${FENG_SHUI_ROWS} 网格，原点在左上角，画布上方朝${topLabel}，每格约 ${normalized.cellMeters} 米；房间轮廓和标记中心均使用网格坐标，位置方位均已按该朝向换算。`,
    `房间（${rooms.length}）：${rooms.length ? rooms.map((room, index) => `${index + 1}. ${room.name}（${room.type}，${room.shape}），位于${room.compassSector}，轮廓面积约 ${room.approximateSizeMeters.area} 平方米（${room.gridArea} 格），外接范围约 ${room.approximateSizeMeters.boundingWidth}×${room.approximateSizeMeters.boundingHeight} 米，轮廓拐点依次为 ${room.outline.map((point) => `(${point.x},${point.y})`).join('→')}`).join('；') : '尚未绘制房间'}`,
    `房间相邻关系：${relations.length ? relations.join('；') : '未发现共墙关系或房间不足两个'}`,
    `门窗与家具（${fixtures.length}）：${fixtures.length ? fixtures.map((fixture, index) => `${index + 1}. ${fixture.type}中心坐标为 (${fixture.centerCoordinate.x},${fixture.centerCoordinate.y})，位于${fixture.room}的${fixture.compassSector}区域，朝向${fixture.facing}`).join('；') : '尚未放置标记'}`,
    `补充说明：${normalized.notes.trim() || '无'}`,
    `资料缺口：${missingFacts.length ? missingFacts.join('；') : '无明显缺项'}`,
  ].join('\n');

  return {
    summary: text,
    data: {
      schema: 'feng-shui-floor-plan-v2',
      coordinateConvention: {
        columns: FENG_SHUI_COLUMNS,
        rows: FENG_SHUI_ROWS,
        topDirection: topLabel,
        cellMeters: normalized.cellMeters,
        origin: '左上角',
        fixtureCoordinateReference: '标记中心点',
      },
      title: normalized.title,
      rooms,
      adjacency: relations,
      fixtures,
      notes: normalized.notes,
      missingFacts,
    },
  };
}
