import { iter } from 'but-unzip';
import shp from 'shpjs';
import { request } from './request';

const STORAGE_KEY = 'inspection-task-mock-store-v3';
const MOCK_DELAY = 120;
const ZIP_ENTRY_REGEX = /\.(shp|dbf|prj|cpg)$/i;
const textDecoder = new TextDecoder();

const executionAreas = [
  { id: 'area-1', name: '城东片区' },
  { id: 'area-2', name: '城西片区' },
  { id: 'area-3', name: '北环片区' },
  { id: 'area-4', name: '南站片区' },
];

const routeCatalog = [
  {
    routeId: 'route-1',
    routeName: '1号线',
    coordinates: [
      { lng: 120.1636, lat: 30.2512 },
      { lng: 120.1678, lat: 30.2526 },
      { lng: 120.1713, lat: 30.2541 },
      { lng: 120.1754, lat: 30.2559 },
    ],
  },
  {
    routeId: 'route-2',
    routeName: '2号线',
    coordinates: [
      { lng: 120.1545, lat: 30.2445 },
      { lng: 120.1588, lat: 30.2451 },
      { lng: 120.1625, lat: 30.2466 },
      { lng: 120.1662, lat: 30.2478 },
    ],
  },
  {
    routeId: 'route-3',
    routeName: '3号线',
    coordinates: [
      { lng: 120.1735, lat: 30.2418 },
      { lng: 120.1762, lat: 30.2453 },
      { lng: 120.1789, lat: 30.2487 },
      { lng: 120.1811, lat: 30.2516 },
    ],
  },
  {
    routeId: 'route-4',
    routeName: '4号线',
    coordinates: [
      { lng: 120.1452, lat: 30.2525 },
      { lng: 120.1493, lat: 30.2543 },
      { lng: 120.1531, lat: 30.2564 },
      { lng: 120.1574, lat: 30.2581 },
    ],
  },
  {
    routeId: 'route-5',
    routeName: '5号线',
    coordinates: [
      { lng: 120.1813, lat: 30.2571 },
      { lng: 120.1842, lat: 30.2594 },
      { lng: 120.1876, lat: 30.2612 },
      { lng: 120.1905, lat: 30.2633 },
    ],
  },
  {
    routeId: 'route-6',
    routeName: '6号线',
    coordinates: [
      { lng: 120.1376, lat: 30.2395 },
      { lng: 120.1415, lat: 30.2411 },
      { lng: 120.1457, lat: 30.2432 },
      { lng: 120.1498, lat: 30.2449 },
    ],
  },
];

function wait(ms = MOCK_DELAY) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function normalizeZipEntryName(name) {
  return String(name || '').replace(/\\/g, '/').trim();
}

function getZipEntryBaseName(name) {
  const normalized = normalizeZipEntryName(name);
  const dotIndex = normalized.lastIndexOf('.');
  return dotIndex >= 0 ? normalized.slice(0, dotIndex) : normalized;
}

function sanitizeCpgValue(value) {
  return String(value || '').replace(/\u0000/g, '').trim();
}

function hasReplacementChar(value) {
  return typeof value === 'string' && value.includes('\uFFFD');
}

function collectReplacementCharCount(value) {
  if (typeof value === 'string') {
    return (value.match(/\uFFFD/g) || []).length;
  }
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + collectReplacementCharCount(item), 0);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((sum, [key, item]) => sum + collectReplacementCharCount(key) + collectReplacementCharCount(item), 0);
  }
  return 0;
}

function findGarbledSamples(value, samples = []) {
  if (samples.length >= 5) return samples;
  if (typeof value === 'string') {
    if (hasReplacementChar(value)) samples.push(value);
    return samples;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => findGarbledSamples(item, samples));
    return samples;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      findGarbledSamples(key, samples);
      findGarbledSamples(item, samples);
    });
  }
  return samples;
}

function analyzeGeoJsonTextQuality(geojson) {
  const replacementCount = collectReplacementCharCount(geojson);
  return {
    replacementCount,
    garbledSamples: findGarbledSamples(geojson, []),
  };
}

function toDataView(raw) {
  if (!raw) return undefined;
  return new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
}

async function unzipShapefileEntries(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const grouped = new Map();
  for (const entry of iter(bytes)) {
    const filename = normalizeZipEntryName(entry?.filename);
    if (!ZIP_ENTRY_REGEX.test(filename)) continue;
    const ext = filename.split('.').pop().toLowerCase();
    const baseName = getZipEntryBaseName(filename);
    if (!grouped.has(baseName)) grouped.set(baseName, {});
    const target = grouped.get(baseName);
    const raw = await entry.read();
    if (ext === 'shp' || ext === 'dbf') {
      target[ext] = raw;
    } else {
      target[ext] = sanitizeCpgValue(textDecoder.decode(raw));
    }
    target.baseName = baseName;
  }
  return [...grouped.values()].filter((item) => item?.shp);
}

function buildShpParseInput(entry, encoding) {
  const input = {
    shp: toDataView(entry.shp),
  };
  if (entry.dbf) input.dbf = toDataView(entry.dbf);
  if (entry.prj) input.prj = entry.prj;
  if (encoding) input.cpg = encoding;
  return input;
}

async function parseSingleShapefileEntry(entry) {
  const detectedCpg = sanitizeCpgValue(entry.cpg);
  const fallbackEncodings = ['GBK', '936', 'GB18030', 'UTF-8'];
  const candidateEncodings = detectedCpg
    ? [detectedCpg]
    : (entry.dbf ? fallbackEncodings : [undefined]);
  let bestResult = null;
  let lastError = null;

  for (const encoding of candidateEncodings) {
    try {
      const parsed = await shp(buildShpParseInput(entry, encoding));
      const quality = analyzeGeoJsonTextQuality(parsed);
      const candidate = {
        parsed,
        encoding: encoding || 'default',
        quality,
      };
      if (!bestResult || quality.replacementCount < bestResult.quality.replacementCount) {
        bestResult = candidate;
      }
      if (quality.replacementCount === 0) break;
    } catch (error) {
      lastError = error;
    }
  }

  if (bestResult) {
    return {
      ...bestResult,
      detectedCpg: detectedCpg || '',
      baseName: entry.baseName || '',
    };
  }
  throw lastError || new Error('Failed to parse shapefile entry');
}

async function parseLocalShapefileZip(zipFile) {
  const arrayBuffer = await zipFile.arrayBuffer();
  const entries = await unzipShapefileEntries(arrayBuffer);
  if (!entries.length) {
    throw new Error('压缩包中未找到有效的 .shp 文件');
  }

  const parsedEntries = [];
  for (const entry of entries) {
    const parsedEntry = await parseSingleShapefileEntry(entry);
    if (parsedEntry.parsed && typeof parsedEntry.parsed === 'object') {
      parsedEntry.parsed.fileName = parsedEntry.parsed.fileName || parsedEntry.baseName;
    }
    parsedEntries.push(parsedEntry);
  }

  return parsedEntries.length === 1 ? parsedEntries[0].parsed : parsedEntries.map((item) => item.parsed);
}

function extractFileId(response) {
  if (response == null) return '';
  if (typeof response === 'string' || typeof response === 'number') return String(response);
  if (typeof response === 'object') {
    return String(
      response.FileId
      || response.fileId
      || response.fileID
      || response.id
      || response.data?.FileId
      || response.data?.fileId
      || response.result?.FileId
      || response.result?.fileId
      || ''
    );
  }
  return '';
}

/**
 * 第一步：申请导入文件 FileId。
 * 使用 x-www-form-urlencoded 传 fileName 和固定 importedType=temp。
 */
export async function requestImportedFileId(fileName) {
  const formBody = new URLSearchParams({
    fileName,
    importedType: 'temp',
  }).toString();

  const result = await request('/api/Map/getimportedifileid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });

  const fileId = extractFileId(result);
  if (!fileId) {
    throw new Error('获取 FileId 失败');
  }
  return {
    fileId,
    raw: result,
  };
}

/**
 * 第二步：将 ZIP 解析得到的 GeoJSON 导入临时工程。
 * 依赖第一步返回的 FileId，并使用 x-www-form-urlencoded 提交。
 */
export async function importInspectionProjectGeojson({ geojson, fileName, fileId }) {
  const geojsonText = typeof geojson === 'string' ? geojson : JSON.stringify(geojson);
  if (!geojsonText || geojsonText === 'undefined') {
    throw new Error('GeoJSON 数据不能为空');
  }

  const formBody = new URLSearchParams({
    Geojson: geojsonText,
    FileName: fileName,
    FileId: fileId,
    NodeId: '0',
    ImportType: 'temp',
  }).toString();

  return request('/api/Map/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });
}

/**
 * 上传工程文件后的预处理流程：解析 ZIP，申请 FileId，并完成 GeoJSON 导入。
 * 仅当前两步都成功后，才返回可用于下发任务的 FileId。
 */
export async function prepareInspectionProjectImport(zipFile) {
  if (!(zipFile instanceof File)) {
    throw new Error('请上传工程 zip 文件');
  }

  const fileName = String(zipFile.name || '').trim();
  if (!fileName) {
    throw new Error('工程文件名不能为空');
  }

  const geojson = await parseLocalShapefileZip(zipFile);
  const { fileId } = await requestImportedFileId(fileName);
  await importInspectionProjectGeojson({
    geojson,
    fileName,
    fileId,
  });

  return {
    fileId,
    fileName,
    geojson,
  };
}

/**
 * 第三步：确认下发巡检任务。
 * 使用已保存的 FileId、工程名称、截止时间和备注创建任务。
 */
export async function createInspectionTask(payload) {
  const projectName = String(payload.projectName || '').trim() || String(payload.fileName || '').replace(/\.zip$/i, '') || '未命名工程';
  const fileId = String(payload.fileId || '').trim();
  if (!fileId) {
    throw new Error('缺少 FileId，请重新上传工程文件');
  }

  const deadlineValue = payload?.deadline;
  const closingDate = deadlineValue ? new Date(deadlineValue).toISOString() : '';
  if (!closingDate || Number.isNaN(new Date(closingDate).getTime())) {
    throw new Error('请选择有效的截止时间');
  }

  const result = await request('/api/Task/create', {
    method: 'POST',
    body: JSON.stringify({
      fileName: projectName,
      fileId,
      closingDate,
      remark: String(payload.remark || '').trim(),
    }),
  });

  return {
    fileId,
    projectName,
    closingDate,
    raw: result,
  };
}

function findExecutionAreaName(executionAreaId) {
  return executionAreas.find((item) => item.id === executionAreaId)?.name || '未分配区域';
}

function findRouteCatalog(routeId) {
  return routeCatalog.find((item) => item.routeId === routeId);
}

function interpolateTrackPoints(coordinates, options = {}) {
  const points = Array.isArray(coordinates) ? coordinates : [];
  const stepPerSegment = Math.max(2, Number(options.stepPerSegment) || 5);
  const startedAt = new Date(options.startedAt || Date.now());
  const intervalMs = Number(options.intervalMs) || 20 * 1000;
  const result = [];

  if (points.length < 2) {
    return result;
  }

  let cursor = startedAt.getTime();
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    for (let step = 0; step < stepPerSegment; step += 1) {
      const ratio = step / stepPerSegment;
      result.push({
        lng: Number((start.lng + (end.lng - start.lng) * ratio).toFixed(6)),
        lat: Number((start.lat + (end.lat - start.lat) * ratio).toFixed(6)),
        recordedAt: new Date(cursor).toISOString(),
      });
      cursor += intervalMs;
    }
  }

  const last = points[points.length - 1];
  result.push({
    lng: last.lng,
    lat: last.lat,
    recordedAt: new Date(cursor).toISOString(),
  });
  return result;
}

function sumDistanceKm(points) {
  const list = Array.isArray(points) ? points : [];
  if (list.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < list.length; i += 1) {
    const prev = list[i - 1];
    const curr = list[i];
    const dx = (curr.lng - prev.lng) * 102000;
    const dy = (curr.lat - prev.lat) * 111000;
    total += Math.sqrt(dx * dx + dy * dy);
  }

  return Number((total / 1000).toFixed(2));
}

function deriveTaskStatus(task) {
  const routes = Array.isArray(task.routes) ? task.routes : [];
  const now = Date.now();
  const deadline = new Date(task.deadline).getTime();
  const statuses = routes.map((item) => item.status);

  if (statuses.includes('REJECTED')) return 'REJECTED';
  if (deadline < now && !statuses.every((status) => ['COMPLETED', 'REJECTED'].includes(status))) return 'OVERDUE';
  if (statuses.length && statuses.every((status) => status === 'COMPLETED')) return 'COMPLETED';
  if (statuses.length && statuses.every((status) => status === 'AWAITING_REVIEW')) return 'AWAITING_REVIEW';
  if (statuses.length && statuses.every((status) => status === 'PENDING')) return 'PENDING';
  if (statuses.some((status) => status === 'IN_PROGRESS')) return 'IN_PROGRESS';
  if (statuses.some((status) => status === 'AWAITING_REVIEW')) return 'IN_PROGRESS';
  return 'PENDING';
}

function decorateTask(task) {
  const routes = Array.isArray(task.routes) ? task.routes : [];
  const completedRouteCount = routes.filter((item) => item.status === 'COMPLETED').length;
  const status = deriveTaskStatus(task);
  return {
    ...task,
    projectId: task.projectId || 'project-unknown',
    projectName: task.projectName || '未命名工程',
    executionAreaId: task.executionAreaId || 'area-unknown',
    executionAreaName: task.executionAreaName || findExecutionAreaName(task.executionAreaId),
    routeCount: routes.length,
    completedRouteCount,
    routeNames: routes.map((item) => item.routeName),
    status,
    statusText: status,
  };
}

function createIssue(route, options = {}) {
  const pointIndex = Math.max(0, Math.min(route.coordinates.length - 1, Number(options.pointIndex) || 0));
  const point = route.coordinates[pointIndex] || { lng: 0, lat: 0 };
  return {
    id: options.id,
    taskRouteId: route.id,
    title: options.title || '巡检问题',
    description: options.description || '发现需复核问题，请现场确认。',
    imageUrl: options.imageUrl || 'https://dummyimage.com/320x180/f2f4f8/5b6472&text=Issue',
    lng: point.lng,
    lat: point.lat,
    location: options.location || `${route.routeName} K${12 + pointIndex}+${(pointIndex + 1) * 80}`,
    createdAt: options.createdAt,
  };
}

function createRouteRecord(seed) {
  const catalog = findRouteCatalog(seed.routeId);
  const coordinates = clone(catalog?.coordinates || []);
  const route = {
    id: seed.id,
    routeId: seed.routeId,
    routeName: catalog?.routeName || seed.routeId,
    status: seed.status,
    coordinates,
    inspectStartedAt: seed.inspectStartedAt || null,
    inspectCompletedAt: seed.inspectCompletedAt || null,
    reviewAction: seed.reviewAction || null,
    reviewReason: seed.reviewReason || '',
    issues: [],
    trackPoints: [],
  };

  if (seed.trackOptions) {
    route.trackPoints = interpolateTrackPoints(coordinates, {
      startedAt: route.inspectStartedAt || seed.trackOptions.startedAt,
      intervalMs: seed.trackOptions.intervalMs,
      stepPerSegment: seed.trackOptions.stepPerSegment,
    });
  }

  route.issues = (seed.issues || []).map((item, index) => createIssue(route, {
    ...item,
    id: item.id || `${route.id}-issue-${index + 1}`,
  }));

  route.stats = {
    durationMinutes: route.inspectStartedAt && route.inspectCompletedAt
      ? Math.max(1, Math.round((new Date(route.inspectCompletedAt).getTime() - new Date(route.inspectStartedAt).getTime()) / 60000))
      : route.trackPoints.length * 2,
    distanceKm: sumDistanceKm(route.trackPoints.length ? route.trackPoints : coordinates),
    pointCount: route.trackPoints.length,
    issueCount: route.issues.length,
    startedAt: route.inspectStartedAt,
    endedAt: route.inspectCompletedAt,
  };

  return route;
}

function createTask(seed) {
  return decorateTask({
    projectId: seed.projectId,
    projectName: seed.projectName,
    id: seed.id,
    taskName: seed.taskName,
    deadline: seed.deadline,
    createdAt: seed.createdAt,
    executionAreaId: seed.executionAreaId,
    executionAreaName: seed.executionAreaName,
    remark: seed.remark || '',
    routes: seed.routes || [],
  });
}

function createProjectSummary(projectId, projectName, tasks) {
  const taskList = Array.isArray(tasks) ? tasks.map(decorateTask) : [];
  const completedTaskCount = taskList.filter((task) => task.status === 'COMPLETED').length;
  const status = taskList.length && completedTaskCount === taskList.length ? 'COMPLETED' : 'PENDING';

  return {
    id: projectId,
    projectId,
    projectName,
    taskCount: taskList.length,
    completedTaskCount,
    awaitingReviewCount: taskList.filter((task) => task.routes.some((route) => route.status === 'AWAITING_REVIEW')).length,
    executionAreas: [...new Set(taskList.map((task) => task.executionAreaName).filter(Boolean))],
    deadline: taskList.reduce((latest, task) => {
      if (!latest) return task.deadline;
      return new Date(task.deadline).getTime() > new Date(latest).getTime() ? task.deadline : latest;
    }, ''),
    createdAt: taskList.reduce((earliest, task) => {
      if (!earliest) return task.createdAt;
      return new Date(task.createdAt).getTime() < new Date(earliest).getTime() ? task.createdAt : earliest;
    }, ''),
    status,
    tasks: taskList.map((task) => ({
      id: task.id,
      projectId: task.projectId,
      projectName: task.projectName,
      taskName: task.taskName,
      deadline: task.deadline,
      createdAt: task.createdAt,
      executionAreaId: task.executionAreaId,
      executionAreaName: task.executionAreaName,
      status: task.status,
      routeCount: task.routeCount,
      completedRouteCount: task.completedRouteCount,
      routeNames: task.routeNames,
      routes: task.routes.map((route) => ({
        id: route.id,
        routeId: route.routeId,
        routeName: route.routeName,
        status: route.status,
        issueCount: route.stats?.issueCount || 0,
      })),
    })),
  };
}

function groupTasksByProject(tasks) {
  const projectMap = new Map();
  tasks.forEach((task) => {
    const decoratedTask = decorateTask(task);
    const projectId = decoratedTask.projectId || 'project-unknown';
    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, {
        projectId,
        projectName: decoratedTask.projectName || '未命名工程',
        tasks: [],
      });
    }
    projectMap.get(projectId).tasks.push(decoratedTask);
  });

  return Array.from(projectMap.values())
    .map((item) => createProjectSummary(item.projectId, item.projectName, item.tasks))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function buildAutoAssignedTaskSeeds({ projectId, projectName, deadline, remark, createdAt, baseTaskId, fileName }) {
  const routeGroups = [
    ['route-1', 'route-3'],
    ['route-2', 'route-4'],
    ['route-5', 'route-6'],
  ];

  const normalizedName = String(fileName || '').replace(/\.zip$/i, '').trim() || projectName;

  return routeGroups.map((routeIds, index) => {
    const executionArea = executionAreas[index % executionAreas.length];
    return {
      projectId,
      projectName,
      id: `${baseTaskId}-${index + 1}`,
      taskName: `${normalizedName}-任务${index + 1}`,
      deadline,
      createdAt,
      executionAreaId: executionArea.id,
      executionAreaName: executionArea.name,
      remark,
      routes: routeIds.map((routeId, routeIndex) => createRouteRecord({
        id: `${baseTaskId}-${index + 1}-route-${routeIndex + 1}`,
        routeId,
        status: 'PENDING',
      })),
    };
  });
}

function seedTasks() {
  const tasks = [
    createTask({
      projectId: 'project-2026-0601',
      projectName: '城东排水工程',
      id: 'task-2026-0601',
      taskName: '3月管线巡检',
      deadline: '2026-06-20T18:00:00',
      createdAt: '2026-06-01T09:30:00',
      executionAreaId: 'area-1',
      remark: '按月度计划执行',
      routes: [
        createRouteRecord({
          id: 'task-route-101',
          routeId: 'route-1',
          status: 'COMPLETED',
          inspectStartedAt: '2026-06-02T09:00:00',
          inspectCompletedAt: '2026-06-02T09:46:00',
          reviewAction: 'PASS',
          trackOptions: { startedAt: '2026-06-02T09:00:00', intervalMs: 18 * 1000, stepPerSegment: 4 },
        }),
        createRouteRecord({
          id: 'task-route-102',
          routeId: 'route-3',
          status: 'AWAITING_REVIEW',
          inspectStartedAt: '2026-06-03T14:10:00',
          inspectCompletedAt: '2026-06-03T15:02:00',
          trackOptions: { startedAt: '2026-06-03T14:10:00', intervalMs: 18 * 1000, stepPerSegment: 4 },
          issues: [
            {
              pointIndex: 1,
              title: '井盖松动',
              description: '线路中段井盖松动，存在安全隐患。',
              createdAt: '2026-06-03T14:28:00',
            },
            {
              pointIndex: 2,
              title: '标识牌缺失',
              description: '沿线标识牌破损，需要补装。',
              createdAt: '2026-06-03T14:45:00',
            },
          ],
        }),
      ],
    }),
    createTask({
      projectId: 'project-2026-0601',
      projectName: '城东排水工程',
      id: 'task-2026-0602',
      taskName: '设备补充巡检',
      deadline: '2026-06-18T17:30:00',
      createdAt: '2026-05-28T10:15:00',
      executionAreaId: 'area-2',
      remark: '补充设备点位检查',
      routes: [
        createRouteRecord({
          id: 'task-route-201',
          routeId: 'route-2',
          status: 'PENDING',
        }),
        createRouteRecord({
          id: 'task-route-202',
          routeId: 'route-4',
          status: 'PENDING',
        }),
      ],
    }),
    createTask({
      projectId: 'project-2026-0605',
      projectName: '城西道路工程',
      id: 'task-2026-0603',
      taskName: '道路专项巡检',
      deadline: '2026-06-25T16:00:00',
      createdAt: '2026-06-05T11:20:00',
      executionAreaId: 'area-3',
      remark: '重点检查沿线附属设施',
      routes: [
        createRouteRecord({
          id: 'task-route-301',
          routeId: 'route-5',
          status: 'IN_PROGRESS',
          inspectStartedAt: '2026-06-09T08:30:00',
          trackOptions: { startedAt: '2026-06-09T08:30:00', intervalMs: 20 * 1000, stepPerSegment: 4 },
        }),
        createRouteRecord({
          id: 'task-route-302',
          routeId: 'route-6',
          status: 'PENDING',
        }),
      ],
    }),
  ];
  return tasks;
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedTasks();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => decorateTask(item)) : seedTasks();
  } catch {
    const seeded = seedTasks();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeStore(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function withTaskRoute(tasks, taskRouteId) {
  for (const task of tasks) {
    const route = (task.routes || []).find((item) => item.id === taskRouteId);
    if (route) {
      return { task, route };
    }
  }
  return { task: null, route: null };
}

export async function getInspectionRouteCatalog() {
  await wait();
  return clone(routeCatalog);
}

function normalizePagedList(items, fallbackKeys = []) {
  const source = items && typeof items === 'object' ? items : {};
  const list = source.items
    || source.records
    || source.rows
    || source.data
    || source.list
    || fallbackKeys.map((key) => source[key]).find((value) => Array.isArray(value))
    || [];
  const total = Number(
    source.total
    || source.totalCount
    || source.count
    || source.recordCount
    || source.dataCount
    || 0
  );
  return {
    list: Array.isArray(list) ? list : [],
    total: Number.isFinite(total) ? total : 0,
    raw: source,
  };
}

/**
 * 工程列表分页查询。
 * page、limit 为必传分页参数，其余筛选字段按需传空字符串。
 */
export async function getImportedFilePage(params = {}) {
  const query = new URLSearchParams({
    page: String(params.page || 1),
    limit: String(params.limit || 10),
    projectName: String(params.projectName || '').trim(),
    importedUser: String(params.importedUser || '').trim(),
    importedType: String(params.importedType || '').trim(),
    areaId: String(params.areaId || '').trim(),
  }).toString();

  const result = await request(`/api/ImportedFile/page?${query}`, {
    method: 'GET',
  });

  return normalizePagedList(result, ['data', 'result']);
}

/**
 * 按工程分页查询任务列表。
 * 需传 fileId，分页参数使用 pageIndex、pageSize。
 */
export async function getInspectionTaskPagedList(params = {}) {
  const fileId = String(params.fileId || '').trim();
  if (!fileId) {
    throw new Error('缺少工程 fileId');
  }

  const query = new URLSearchParams({
    fileId,
    pageIndex: String(params.pageIndex || 1),
    pageSize: String(params.pageSize || 10),
  }).toString();

  const result = await request(`/api/Task/paged-list?${query}`, {
    method: 'GET',
  });

  return normalizePagedList(result, ['data', 'result']);
}

export async function getInspectionTaskList(params = {}) {
  await wait();
  const tasks = readStore();
  const keyword = String(params.keyword || '').trim();
  const status = String(params.status || '').trim();
  const [startDate, endDate] = Array.isArray(params.dateRange) ? params.dateRange : [];

  const filteredTasks = tasks.filter((task) => {
    const keywordMatched = !keyword
      || task.taskName.includes(keyword)
      || String(task.projectName || '').includes(keyword)
      || String(task.executionAreaName || '').includes(keyword);
    if (!keywordMatched) return false;
    if (status && task.status !== status) return false;
    if (startDate && new Date(task.deadline).getTime() < new Date(startDate).getTime()) return false;
    if (endDate && new Date(task.deadline).getTime() > new Date(endDate).getTime()) return false;
    return true;
  });

  return groupTasksByProject(filteredTasks);
}

export async function getInspectionTaskDetail(taskId) {
  await wait();
  const tasks = readStore();
  const task = tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error('未找到任务详情');
  }
  return clone(task);
}

export async function reviewInspectionTaskRoute(taskRouteId, payload) {
  await wait();
  const tasks = readStore();
  const { task, route } = withTaskRoute(tasks, taskRouteId);
  if (!task || !route) {
    throw new Error('未找到待审核线路');
  }

  const action = payload.action === 'REJECT' ? 'REJECT' : 'PASS';
  route.status = action === 'PASS' ? 'COMPLETED' : 'REJECTED';
  route.reviewAction = action;
  route.reviewReason = String(payload.reason || '').trim();

  const nextTasks = tasks.map((item) => decorateTask(item));
  writeStore(nextTasks);
  return clone(decorateTask(task));
}

export async function getInspectionTaskRouteIssues(taskRouteId) {
  await wait();
  const tasks = readStore();
  const { route } = withTaskRoute(tasks, taskRouteId);
  if (!route) {
    throw new Error('未找到线路问题数据');
  }
  return clone(route.issues || []);
}

export async function getInspectionTaskRouteTracks(taskRouteId) {
  await wait();
  const tasks = readStore();
  const { route } = withTaskRoute(tasks, taskRouteId);
  if (!route) {
    throw new Error('未找到轨迹数据');
  }
  return clone({
    routeId: route.routeId,
    taskRouteId: route.id,
    routeName: route.routeName,
    stats: route.stats,
    points: route.trackPoints || [],
    issues: route.issues || [],
    coordinates: route.coordinates || [],
  });
}

export async function resetInspectionTaskMockData() {
  await wait(40);
  writeStore(seedTasks());
  return true;
}
