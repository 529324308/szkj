<template>
  <div v-if="active" class="toolbar">
    <button :class="['tool-btn', { active: activeAction === 'layerManagement' }]" @click="setActiveAction('layerManagement')">
      <img class="tool-icon" :src="icons.tuceng" alt="图层管理" />
      <span>图层管理</span>
    </button>
    <button :class="['tool-btn', { active: activeAction === 'importData' }]" @click="setActiveAction('importData')">
      <img class="tool-icon" :src="icons.shangchuan" alt="上传云端" />
      <span>上传云端</span>
    </button>
    <button :class="['tool-btn', { active: activeAction === 'temporaryPreview' }]" @click="setActiveAction('temporaryPreview')">
      <img class="tool-icon" :src="icons.daoru" alt="本地查看" />
      <span>本地查看</span>
    </button>
    <button :class="['tool-btn', { active: activeAction === 'inspectionTask' }]" @click="openInspectionTasks">
      <img class="tool-icon" :src="inspectionIcon" alt="巡检任务" />
      <span>巡检任务</span>
    </button>
  </div>

  <div v-if="active && activeAction === 'layerManagement'" class="placeholder-card">
    <div class="placeholder-card__title">图层管理</div>
    <div class="placeholder-card__text">保留现有数据管理能力，巡检任务按照原型图在数据管理内统一展示。</div>
  </div>

  <div v-if="active && activeAction === 'importData'" class="placeholder-card">
    <div class="placeholder-card__title">上传云端</div>
    <div class="placeholder-card__text">当前重点为巡检任务界面落地，原有上传入口后续可继续扩展。</div>
  </div>

  <div v-if="active && activeAction === 'temporaryPreview'" class="placeholder-card">
    <div class="placeholder-card__title">本地查看</div>
    <div class="placeholder-card__text">当前重点为巡检任务界面落地，原有本地预览入口保持不变。</div>
  </div>

  <section v-if="active && inspectionPanelVisible" class="inspection-layout">
    <el-card class="inspection-panel" shadow="always">
      <template #header>
        <div class="panel-header">
          <div>
            <div class="panel-header__title">任务管理</div>
            <div class="panel-header__subtitle">巡检任务台账</div>
          </div>
          <div class="panel-header__actions">
            <el-button type="primary" @click="openCreateDialog">下发任务</el-button>
            <el-button @click="closeInspectionPanel">关闭</el-button>
          </div>
        </div>
      </template>

      <el-form :inline="true" class="filter-form">
        <el-form-item label="工程名称" class="filter-form__item filter-form__item--keyword">
          <el-input v-model.trim="filters.projectName" placeholder="请输入工程名称" clearable @keyup.enter="loadTasks" />
        </el-form-item>
        <el-form-item label="区域ID" class="filter-form__item filter-form__item--range">
          <el-input v-model.trim="filters.areaId" placeholder="请输入区域ID" clearable @keyup.enter="loadTasks" />
        </el-form-item>
        <el-form-item class="filter-form__item filter-form__item--actions">
          <el-button type="primary" @click="loadTasks">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
      <el-empty v-if="!taskLoading && !taskError && !projectList.length" description="暂无巡检工程任务" />
      <div v-else class="table-wrapper">
        <el-table
          ref="projectTableRef"
          v-loading="taskLoading"
          :data="projectList"
          class="project-table"
          border
          stripe
          height="calc(100% - var(--inspection-pagination-height, 68px))"
          row-key="projectId"
          :expand-row-keys="expandedProjectIds"
          @expand-change="handleProjectExpandChange"
        >
          <el-table-column type="expand" width="56">
            <template #default="{ row }">
              <div class="project-expand">
                <div class="project-expand__header">
                  <div class="project-expand__title">工程任务列表</div>
                  <div class="project-expand__meta">共 {{ row.taskCount }} 个任务，已完成 {{ row.completedTaskCount }} 个任务</div>
                </div>

                <el-table
                  v-loading="isTaskListLoading(row.projectId)"
                  :data="getPagedProjectTasks(row)"
                  border
                  class="project-task-table"
                  row-key="id"
                  :row-class-name="projectTaskRowClassName"
                >
                  <el-table-column prop="taskName" label="任务名称" min-width="220">
                    <template #default="{ row: task }">
                      <div class="task-name-cell">
                        <span class="task-name-dot" :class="statusAccentClass(task.status)" />
                        <div>
                          <div class="cell-title">{{ task.taskName }}</div>
                          <div class="cell-sub">任务ID：{{ task.id }}</div>
                        </div>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="状态" min-width="120" align="center">
                    <template #default="{ row: task }">
                      <el-tag :type="statusTagType(task.status)" effect="dark">{{ statusLabel(task.status) }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="deadline" label="截止时间" min-width="180">
                    <template #default="{ row: task }">{{ formatDateTime(task.deadline) }}</template>
                  </el-table-column>
                  <el-table-column prop="executionAreaName" label="区域ID" min-width="120" align="center" />
                  <el-table-column prop="description" label="任务说明" min-width="320" show-overflow-tooltip />
                  <el-table-column label="要素数" min-width="100" align="center">
                    <template #default="{ row: task }">{{ task.featureCount }}</template>
                  </el-table-column>
                  <el-table-column label="操作" width="120" fixed="right">
                    <template #default="{ row: task }">
                      <el-button type="primary" link @click="viewTaskDetail(task)">详情</el-button>
                    </template>
                  </el-table-column>
                </el-table>

                <div class="inner-pagination">
                  <el-pagination
                    small
                    background
                    layout="total, sizes, prev, pager, next"
                    :total="getTaskPageState(row.projectId).total || row.taskCount"
                    :current-page="getTaskPageState(row.projectId).page"
                    :page-size="getTaskPageState(row.projectId).pageSize"
                    :page-sizes="[10, 20, 50]"
                    @current-change="(page) => handleTaskPageChange(row.projectId, page)"
                    @size-change="(pageSize) => handleTaskPageSizeChange(row.projectId, pageSize)"
                  />
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="projectName" label="工程名称" min-width="220">
            <template #default="{ row }">
              <div class="cell-title">{{ row.projectName }}</div>
              <div class="cell-sub">FileId：{{ row.fileId }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="tasksCount" label="任务数量" min-width="120" align="center" />
          <el-table-column prop="regionId" label="区域ID" min-width="120" align="center" />
          <el-table-column prop="importedTime" label="导入时间" min-width="180">
            <template #default="{ row }">{{ formatDateTime(row.importedTime) }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="toggleProjectExpanded(row)">
                {{ expandedProjectIds.includes(row.projectId) ? '收起任务' : '展开任务' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="outer-pagination">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next"
            :total="projectPagination.total"
            :page-size="projectPagination.pageSize"
            :current-page="projectPagination.page"
            :page-sizes="[10, 20, 50]"
            @size-change="handleProjectPageSizeChange"
            @current-change="handleProjectPageChange"
          />
        </div>
      </div>
    </el-card>
  </section>

  <el-drawer
    v-model="detailPanelVisible"
    title="任务详情"
    size="42%"
    append-to-body
    destroy-on-close
  >
    <template v-if="detailTask">
      <el-descriptions :column="2" border class="detail-descriptions">
        <el-descriptions-item label="所属工程">{{ detailTask.projectName }}</el-descriptions-item>
        <el-descriptions-item label="任务名称">{{ detailTask.taskName }}</el-descriptions-item>
        <el-descriptions-item label="执行区域">{{ detailTask.executionAreaName }}</el-descriptions-item>
        <el-descriptions-item label="截止时间">{{ formatDateTime(detailTask.deadline) }}</el-descriptions-item>
        <el-descriptions-item label="整体状态">
          <el-tag :type="statusTagType(detailTask.status)" effect="dark">{{ statusLabel(detailTask.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="任务进度">{{ detailTask.completedRouteCount }}/{{ detailTask.routeCount }}</el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">线路巡检明细</el-divider>

      <el-scrollbar height="calc(100vh - 290px)">
        <el-card v-for="route in detailTask.routes" :key="route.id" class="route-card" shadow="hover">
          <template #header>
            <div class="route-card__header">
              <div>
                <div class="route-card__title">{{ route.routeName }}</div>
                <div class="route-card__sub">
                  <template v-if="route.inspectStartedAt">
                    {{ formatShortDateTime(route.inspectStartedAt) }}
                    <span v-if="route.inspectCompletedAt"> ~ {{ formatShortDateTime(route.inspectCompletedAt) }}</span>
                  </template>
                  <template v-else>尚未开始</template>
                </div>
              </div>
              <el-tag :type="statusTagType(route.status)" effect="dark">{{ statusLabel(route.status) }}</el-tag>
            </div>
          </template>

          <el-space direction="vertical" alignment="flex-start" fill>
            <span>问题数：{{ route.stats?.issueCount || route.issues?.length || 0 }}</span>
            <span v-if="route.reviewReason">驳回原因：{{ route.reviewReason }}</span>
            <el-space wrap>
              <el-button :disabled="!route.issues || route.issues.length === 0" @click="viewRouteIssues(detailTask, route)">查看问题</el-button>
              <el-button :disabled="!route.trackPoints || route.trackPoints.length === 0" @click="playRouteTrack(detailTask, route)">轨迹回放</el-button>
              <el-button
                v-if="detailTask.status === 'AWAITING_REVIEW' && route.status === 'AWAITING_REVIEW'"
                type="warning"
                @click="openRouteReview(detailTask, route)"
              >
                审核
              </el-button>
            </el-space>
          </el-space>
        </el-card>
      </el-scrollbar>
    </template>
  </el-drawer>

  <el-dialog v-model="createDialogVisible" title="下发巡检任务" width="720px" append-to-body>
    <el-form label-width="100px" class="dialog-form">
      <el-form-item label="工程名称">
        <el-input v-model.trim="createForm.projectName" placeholder="可不填，默认取 zip 文件名" />
      </el-form-item>
      <el-form-item label="工程文件">
        <el-upload
          v-if="!createForm.zipFileName"
          ref="projectUploadRef"
          :key="projectUploadKey"
          class="project-upload"
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".zip"
          :before-upload="beforeProjectZipUpload"
          :on-change="handleProjectZipChange"
          :limit="1"
        >
          <div class="project-upload__inner">
            <div class="project-upload__title">上传工程 zip 文件</div>
            <div class="project-upload__desc">后端自动分配任务并返回任务列表，无需逐条下发</div>
            <div class="project-upload__hint">仅支持 `.zip`，一次上传一个工程文件</div>
          </div>
        </el-upload>
        <div v-if="createForm.zipFileName" class="selected-project-file">
          <span>{{ createForm.zipFileName }}</span>
          <el-button link type="danger" @click="clearProjectZip">移除</el-button>
        </div>
      </el-form-item>
      <el-form-item label="截止日期">
        <el-date-picker
          v-model="createForm.deadline"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss"
          placeholder="请选择截止时间"
          style="width: 100%"
          :disabled-date="disabledDeadlineDate"
          :shortcuts="deadlineShortcuts"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model.trim="createForm.remark" type="textarea" :rows="4" placeholder="补充说明" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createDialogVisible = false">取消</el-button>
      <el-button type="primary" :disabled="createSubmitting || !createForm.zipFile || !createForm.importedFileId" @click="submitCreateTask">
        {{ createSubmitting ? (createForm.importedFileId ? '提交中...' : '导入中...') : '确认下发' }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="issueDialogVisible" title="线路问题详情" width="760px" append-to-body>
    <el-empty v-if="!issueLoading && !issueList.length" description="本次巡检未发现问题" />
    <el-scrollbar v-else height="520px">
      <div v-loading="issueLoading" class="issue-list">
        <el-card v-for="issue in issueList" :key="issue.id" class="issue-card" shadow="hover">
          <div class="issue-card__content">
            <el-image class="issue-card__image" :src="issue.imageUrl" :preview-src-list="[issue.imageUrl]" fit="cover" />
            <div class="issue-card__body">
              <div class="issue-card__title">{{ issue.title }}</div>
              <div class="issue-card__meta">位置：{{ issue.location }}</div>
              <div class="issue-card__meta">{{ issue.description }}</div>
              <div class="issue-card__meta">坐标：{{ issue.lng }}, {{ issue.lat }}</div>
            </div>
          </div>
        </el-card>
      </div>
    </el-scrollbar>
  </el-dialog>

  <el-dialog v-model="reviewDialogVisible" title="线路审核" width="820px" append-to-body>
    <template v-if="reviewRoute">
      <div v-loading="reviewContextLoading" class="review-dialog-body">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务名称">{{ reviewTask?.taskName }}</el-descriptions-item>
          <el-descriptions-item label="线路名称">{{ reviewRoute.routeName }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="statusTagType(reviewRoute.status)" effect="dark">{{ statusLabel(reviewRoute.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="问题数量">{{ reviewRoute.stats?.issueCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDateTime(reviewRoute.stats?.startedAt) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatDateTime(reviewRoute.stats?.endedAt) }}</el-descriptions-item>
          <el-descriptions-item label="巡检时长">{{ reviewTrackData?.stats?.durationMinutes || 0 }} 分钟</el-descriptions-item>
          <el-descriptions-item label="巡检里程">{{ reviewTrackData?.stats?.distanceKm || 0 }} km</el-descriptions-item>
        </el-descriptions>

        <el-alert
          class="review-playback-alert"
          title="需要查看轨迹时可手动点击“轨迹回放”，地图会同步显示巡检路径和问题点。"
          type="info"
          :closable="false"
          show-icon
        />

        <el-card class="review-section-card" shadow="never">
          <template #header>
            <div class="review-section-card__header">
              <span>巡检问题列表</span>
              <el-button
                type="primary"
                plain
                :disabled="!reviewRoute || !reviewTrackData"
                @click="playRouteTrack(reviewTask, reviewRoute, { track: reviewTrackData, autoPlay: true, resetProgress: true })"
              >
                轨迹回放
              </el-button>
            </div>
          </template>

          <el-empty v-if="!reviewContextLoading && !reviewIssueList.length" description="当前线路未发现问题" />
          <el-table v-else :data="reviewIssueList" border size="small" max-height="240">
            <el-table-column label="问题图片" width="120" align="center">
              <template #default="{ row }">
                <el-image
                  class="review-issue-image"
                  :src="row.imageUrl"
                  :preview-src-list="[row.imageUrl]"
                  fit="cover"
                  preview-teleported
                />
              </template>
            </el-table-column>
            <el-table-column prop="title" label="问题名称" min-width="160" />
            <el-table-column prop="location" label="位置" min-width="170" />
            <el-table-column prop="description" label="问题描述" min-width="240" show-overflow-tooltip />
            <el-table-column label="上报时间" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-form class="review-form">
          <el-form-item label="审核意见" label-width="90px">
            <el-input v-model.trim="reviewForm.reason" type="textarea" :rows="4" placeholder="通过可选填，驳回请填写原因" />
          </el-form-item>
        </el-form>
      </div>
    </template>
    <template #footer>
      <el-button @click="reviewDialogVisible = false">取消</el-button>
      <el-button type="danger" :disabled="reviewSubmitting || reviewContextLoading" @click="submitRouteReview('REJECT')">驳回</el-button>
      <el-button type="primary" :disabled="reviewSubmitting || reviewContextLoading" @click="submitRouteReview('PASS')">通过</el-button>
    </template>
  </el-dialog>

  <InspectionPlaybackWindow
    v-model="playbackPanelVisible"
    :track="playbackTrack"
    :route="playbackRoute"
    :progress="playbackProgress"
    :max="playbackMax"
    :playing="trackPlaying"
    :loading="playbackLoading"
    @toggle="toggleTrackPlayback"
    @reset="resetTrackPlayback"
    @seek="seekTrackPlayback"
  />
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import InspectionPlaybackWindow from './InspectionPlaybackWindow.vue';
import {
  createInspectionTask,
  getImportedFilePage,
  getInspectionRouteCatalog,
  getInspectionTaskPagedList,
  getInspectionTaskRouteIssues,
  getInspectionTaskRouteTracks,
  prepareInspectionProjectImport,
  resetInspectionTaskMockData,
  reviewInspectionTaskRoute,
} from '../../api/inspectionTask';

const props = defineProps({
  active: Boolean,
  icons: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  'inspection-task-cleared',
]);

const activeAction = ref('');
const inspectionIcon = new URL('../../assets/任务.png', import.meta.url).href;

const taskStatusOptions = [
  { value: 'PENDING', label: '待巡检' },
  { value: 'IN_PROGRESS', label: '巡检中' },
  { value: 'AWAITING_REVIEW', label: '待审核' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'REJECTED', label: '已驳回' },
  { value: 'OVERDUE', label: '已超时' },
];

const filters = reactive({
  projectName: '',
  importedUser: '',
  importedType: '',
  areaId: '',
});

const taskLoading = ref(false);
const taskError = ref('');
const projectList = ref([]);
const projectTableRef = ref(null);
const selectedTaskId = ref('');
const detailTask = ref(null);
const routeCatalog = ref([]);
const expandedProjectIds = ref([]);
const projectPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});
const taskPaginationMap = reactive({});
const taskLoadingMap = reactive({});

const createDialogVisible = ref(false);
const createSubmitting = ref(false);
const projectUploadRef = ref(null);
const projectUploadKey = ref(0);
const createForm = reactive({
  projectName: '',
  zipFile: null,
  zipFileName: '',
  importedFileId: '',
  deadline: '',
  remark: '',
});

// 截止日期限制：不能选择今天之前的日期，最大期限不超过7天
const disabledDeadlineDate = (time) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return time.getTime() < now.getTime() || time.getTime() > maxDate.getTime();
};

// 截止日期快捷选项
const deadlineShortcuts = [
  {
    text: '3天后',
    value: () => {
      const date = new Date();
      date.setDate(date.getDate() + 3);
      date.setHours(18, 0, 0, 0);
      return date;
    },
  },
  {
    text: '5天后',
    value: () => {
      const date = new Date();
      date.setDate(date.getDate() + 5);
      date.setHours(18, 0, 0, 0);
      return date;
    },
  },
  {
    text: '7天后',
    value: () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      date.setHours(18, 0, 0, 0);
      return date;
    },
  },
];

const issueDialogVisible = ref(false);
const issueLoading = ref(false);
const issueList = ref([]);

const reviewDialogVisible = ref(false);
const reviewSubmitting = ref(false);
const reviewTask = ref(null);
const reviewRoute = ref(null);
const reviewContextLoading = ref(false);
const reviewIssueList = ref([]);
const reviewTrackData = ref(null);
const reviewForm = reactive({
  reason: '',
});

const inspectionPanelVisible = ref(false);
const detailPanelVisible = ref(false);
const playbackPanelVisible = ref(false);
const playbackLoading = ref(false);
const playbackTrack = ref(null);
const playbackTask = ref(null);
const playbackRoute = ref(null);
const playbackProgress = ref(0);
const trackPlaying = ref(false);
let playbackTimer = null;

const flatTaskList = computed(() => projectList.value.flatMap((project) => project.tasks || []));
const playbackMax = computed(() => Math.max(0, (playbackTrack.value?.points?.length || 1) - 1));
const awaitingReviewCount = computed(() => flatTaskList.value.filter((task) => task.routes?.some((route) => route.status === 'AWAITING_REVIEW')).length);
const completedTaskCount = computed(() => flatTaskList.value.filter((task) => task.status === 'COMPLETED').length);

function setActiveAction(action) {
  if (inspectionPanelVisible.value && action !== 'inspectionTask') {
    closeInspectionPanel({ preserveActiveAction: true });
  }
  activeAction.value = action;
}

function statusLabel(status) {
  const match = taskStatusOptions.find((item) => item.value === status);
  return match?.label || status || '未知状态';
}

function projectStatusLabel(status) {
  return status === 'COMPLETED' ? '已完成' : '未完成';
}

function statusTagType(status) {
  switch (status) {
    case 'PENDING':
      return 'primary';
    case 'IN_PROGRESS':
      return 'primary';
    case 'AWAITING_REVIEW':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'OVERDUE':
      return 'info';
    default:
      return 'info';
  }
}

function projectStatusTagType(status) {
  return status === 'COMPLETED' ? 'success' : 'warning';
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function formatShortDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function tableRowClassName({ row }) {
  return row.id === selectedTaskId.value ? 'current-row' : '';
}

function projectTaskRowClassName({ row, rowIndex }) {
  const classNames = [];
  if (row.id === selectedTaskId.value) {
    classNames.push('current-row');
  }
  classNames.push(`task-row--${String(row.status || '').toLowerCase()}`);
  classNames.push(rowIndex % 2 === 0 ? 'task-row--odd' : 'task-row--even');
  return classNames.join(' ');
}

function statusAccentClass(status) {
  return `task-accent--${String(status || '').toLowerCase()}`;
}

function openInspectionTasks() {
  if (inspectionPanelVisible.value && activeAction.value === 'inspectionTask') {
    closeInspectionPanel();
    return;
  }
  activeAction.value = 'inspectionTask';
  inspectionPanelVisible.value = true;
  selectedTaskId.value = '';
  loadTasks();
}

function closeInspectionPanel(options = {}) {
  const { preserveActiveAction = false } = options;
  inspectionPanelVisible.value = false;
  detailPanelVisible.value = false;
  selectedTaskId.value = '';
  closePlaybackPanel();
  if (!preserveActiveAction && activeAction.value === 'inspectionTask') {
    activeAction.value = '';
  }
}

async function ensureBaseData() {
  if (!routeCatalog.value.length) {
    routeCatalog.value = await getInspectionRouteCatalog();
  }
}

async function loadTasks() {
  if (!props.active) return;
  taskLoading.value = true;
  taskError.value = '';
  try {
    await ensureBaseData();
    const { list, total } = await getImportedFilePage({
      page: projectPagination.page,
      limit: projectPagination.pageSize,
      projectName: filters.projectName,
      importedUser: filters.importedUser,
      importedType: filters.importedType,
      areaId: filters.areaId,
    });
    projectList.value = list.map((item) => ({
      ...item,
      projectId: String(item.id || ''),
      fileId: String(item.id || ''),
      projectName: item.fileName || '未命名工程',
      importedUser: item.importedUser || '--',
      importedType: item.importedType || '--',
      regionId: item.regionId || '--',
      remark: item.remark || '--',
      featuresCount: Number(item.featuresCount || 0),
      importedTime: item.importedTime || '',
      executionAreas: [item.regionId].filter(Boolean),
      taskCount: Number(item.taskCount || 0),
      completedTaskCount: Number(item.completedTaskCount || 0),
      status: item.status || '',
      deadline: item.importedTime || '',
      tasks: Array.isArray(item.tasks) ? item.tasks : [],
    }));
    projectPagination.total = total;
  } catch (error) {
    taskError.value = error?.message || '任务加载失败';
  } finally {
    taskLoading.value = false;
  }
}

function resetFilters() {
  filters.projectName = '';
  filters.importedUser = '';
  filters.importedType = '';
  filters.areaId = '';
  projectPagination.page = 1;
  loadTasks();
}

function showTaskReviewButton(task) {
  return task?.status === 'AWAITING_REVIEW';
}

function getTaskPageState(projectId) {
  if (!taskPaginationMap[projectId]) {
    taskPaginationMap[projectId] = { page: 1, pageSize: 10, total: 0 };
  }
  return taskPaginationMap[projectId];
}

function isTaskListLoading(projectId) {
  return Boolean(taskLoadingMap[projectId]);
}

function getPagedProjectTasks(project) {
  return Array.isArray(project.tasks) ? project.tasks : [];
}

async function loadProjectTasks(projectId, fileId) {
  const pageState = getTaskPageState(projectId);
  const currentFileId = String(fileId || '').trim();
  if (!currentFileId) {
    throw new Error('当前工程缺少 fileId');
  }

  taskLoadingMap[projectId] = true;
  try {
    const { list, total } = await getInspectionTaskPagedList({
      fileId: currentFileId,
      pageIndex: pageState.page,
      pageSize: pageState.pageSize,
    });
    const target = projectList.value.find((item) => item.projectId === projectId);
    if (target) {
      target.tasks = (Array.isArray(list) ? list : []).map((task) => {
        const features = Array.isArray(task.features) ? task.features : [];
        const statusMap = {
          '-1': 'PENDING',
          0: 'IN_PROGRESS',
          1: 'AWAITING_REVIEW',
          2: 'COMPLETED',
          3: 'REJECTED',
        };
        const status = statusMap[String(task.taskStatus)] || 'PENDING';
        return {
          ...task,
          taskName: task.title || `任务_${task.id}`,
          description: task.description || '--',
          executionAreaName: task.regionId || '--',
          featureCount: features.length,
          features,
          status,
          statusText: status,
          deadline: task.closingDate || task.createdDate || '',
          createdDate: task.createdDate || '',
          updatedDate: task.updatedDate || '',
          routes: features.map((feature, index) => ({
            id: feature.id || `${task.id}-route-${index + 1}`,
            routeId: feature.id || `route-${index + 1}`,
            routeName: feature.name || feature.routeName || `线路${index + 1}`,
            status: feature.status || status,
            inspectStartedAt: feature.inspectStartedAt || null,
            inspectCompletedAt: feature.inspectCompletedAt || null,
            reviewAction: feature.reviewAction || null,
            reviewReason: feature.reviewReason || '',
            issueCount: feature.issueCount || 0,
            coordinates: feature.coordinates || [],
            trackPoints: feature.trackPoints || [],
            issues: feature.issues || [],
            stats: feature.stats || {
              issueCount: feature.issueCount || 0,
              durationMinutes: feature.durationMinutes || 0,
              distanceKm: feature.distanceKm || 0,
              pointCount: feature.pointCount || 0,
              startedAt: feature.inspectStartedAt,
              endedAt: feature.inspectCompletedAt,
            },
          })),
          routeCount: features.length,
          completedRouteCount: features.filter((f) => f.status === 'COMPLETED').length,
        };
      });
      target.taskCount = Number(total || target.taskCount || 0);
      target.completedTaskCount = target.tasks.filter((task) => task.status === 'COMPLETED').length;
      target.fileId = currentFileId;
    }
    pageState.total = Number(total || 0);
  } finally {
    taskLoadingMap[projectId] = false;
  }
}

async function handleProjectPageChange(page) {
  projectPagination.page = page;
  await loadTasks();
}

async function handleProjectPageSizeChange(pageSize) {
  projectPagination.pageSize = pageSize;
  projectPagination.page = 1;
  await loadTasks();
}

async function handleTaskPageChange(projectId, page) {
  const pageState = getTaskPageState(projectId);
  pageState.page = page;
  const project = projectList.value.find((item) => item.projectId === projectId);
  if (project) {
    await loadProjectTasks(projectId, project.fileId);
  }
}

async function handleTaskPageSizeChange(projectId, pageSize) {
  const pageState = getTaskPageState(projectId);
  pageState.pageSize = pageSize;
  pageState.page = 1;
  const project = projectList.value.find((item) => item.projectId === projectId);
  if (project) {
    await loadProjectTasks(projectId, project.fileId);
  }
}

async function handleProjectExpandChange(row, expandedRows) {
  const expandedProjectId = expandedRows.length ? expandedRows[expandedRows.length - 1].projectId : '';
  expandedProjectIds.value = expandedProjectId ? [expandedProjectId] : [];
  if (!expandedRows.some((item) => item.projectId === row.projectId)) {
    return;
  }
  const pageState = getTaskPageState(row.projectId);
  pageState.page = 1;
  await loadProjectTasks(row.projectId, row.fileId);
}

async function toggleProjectExpanded(project) {
  const projectId = project.projectId;
  const isExpanded = expandedProjectIds.value.includes(projectId);
  projectTableRef.value?.toggleRowExpansion?.(project, !isExpanded);
  if (isExpanded) {
    expandedProjectIds.value = expandedProjectIds.value.filter((item) => item !== projectId);
  }
}

async function viewTaskDetail(task) {
  selectedTaskId.value = task.id;
  detailPanelVisible.value = true;
  detailTask.value = { ...task };
}

async function viewRouteIssues(_task, route) {
  issueDialogVisible.value = true;
  issueLoading.value = true;
  try {
    if (route.issues && Array.isArray(route.issues)) {
      issueList.value = route.issues;
    } else {
      issueList.value = await getInspectionTaskRouteIssues(route.id);
    }
  } catch (error) {
    ElMessage.error(error?.message || '线路问题加载失败');
  } finally {
    issueLoading.value = false;
  }
}

async function loadReviewContext(task, route) {
  reviewContextLoading.value = true;
  reviewIssueList.value = [];
  reviewTrackData.value = null;
  try {
    const issues = route.issues && Array.isArray(route.issues) ? route.issues : await getInspectionTaskRouteIssues(route.id);
    let track = null;
    if (route.trackPoints && Array.isArray(route.trackPoints) && route.trackPoints.length > 0) {
      track = {
        routeId: route.routeId,
        taskRouteId: route.id,
        routeName: route.routeName,
        stats: route.stats || {
          durationMinutes: 0,
          distanceKm: 0,
          pointCount: route.trackPoints.length,
          issueCount: issues.length,
        },
        points: route.trackPoints,
        issues: route.issues || [],
        coordinates: route.coordinates || [],
      };
    } else {
      track = await getInspectionTaskRouteTracks(route.id);
    }
    reviewIssueList.value = issues;
    reviewTrackData.value = track;
  } catch (error) {
    ElMessage.error(error?.message || '审核上下文加载失败');
  } finally {
    reviewContextLoading.value = false;
  }
}

async function openRouteReview(task, route) {
  reviewTask.value = task;
  reviewRoute.value = route;
  reviewForm.reason = route.reviewReason || '';
  reviewDialogVisible.value = true;
  await loadReviewContext(task, route);
}

async function reviewPendingRoute(task) {
  await viewTaskDetail(task);
}

async function submitRouteReview(action) {
  if (!reviewRoute.value) return;
  if (action === 'REJECT' && !reviewForm.reason.trim()) {
    ElMessage.warning('驳回时请填写原因');
    return;
  }
  reviewSubmitting.value = true;
  try {
    await reviewInspectionTaskRoute(reviewRoute.value.id, {
      action,
      reason: reviewForm.reason,
    });
    reviewDialogVisible.value = false;
    reviewIssueList.value = [];
    reviewTrackData.value = null;
    await loadTasks();
    if (reviewTask.value?.id) {
      await viewTaskDetail({ id: reviewTask.value.id });
    }
    ElMessage.success(action === 'PASS' ? '审核通过' : '已驳回');
  } catch (error) {
    ElMessage.error(error?.message || '审核失败');
  } finally {
    reviewSubmitting.value = false;
  }
}

function openCreateDialog() {
  createDialogVisible.value = true;
}

async function resetProjectUpload() {
  projectUploadRef.value?.clearFiles?.();
  projectUploadKey.value += 1;
  await nextTick();
}

async function clearProjectZip() {
  createForm.zipFile = null;
  createForm.zipFileName = '';
  createForm.importedFileId = '';
  await resetProjectUpload();
}

function beforeProjectZipUpload(rawFile) {
  const isZipFile = /\.zip$/i.test(rawFile?.name || '');
  if (!isZipFile) {
    ElMessage.error('仅支持上传 .zip 类型文件');
    return false;
  }
  return false;
}

async function handleProjectZipChange(uploadFile) {
  const rawFile = uploadFile?.raw || uploadFile;
  if (!rawFile) return;
  const isZipFile = /\.zip$/i.test(rawFile?.name || '');
  if (!isZipFile) {
    ElMessage.error('仅支持上传 .zip 类型文件');
    return;
  }

  createSubmitting.value = true;
  try {
    createForm.zipFile = rawFile;
    createForm.zipFileName = rawFile.name;
    if (!createForm.projectName.trim()) {
      createForm.projectName = String(rawFile.name || '').replace(/\.zip$/i, '');
    }

    const { fileId } = await prepareInspectionProjectImport(rawFile);
    createForm.importedFileId = fileId;
    ElMessage.success(`工程文件解析并导入成功，FileId：${fileId}`);
  } catch (error) {
    await clearProjectZip();
    ElMessage.error(error?.message || '工程文件导入失败');
  } finally {
    createSubmitting.value = false;
  }
}

async function submitCreateTask() {
  if (!createForm.zipFile) {
    ElMessage.warning('请上传工程 zip 文件');
    return;
  }
  if (!createForm.importedFileId) {
    ElMessage.warning('工程文件尚未完成导入，请重新上传后再下发');
    return;
  }
  if (!createForm.deadline) {
    ElMessage.warning('请选择截止时间');
    return;
  }

  createSubmitting.value = true;
  try {
    const result = await createInspectionTask({
      projectName: createForm.projectName,
      fileName: createForm.zipFileName,
      fileId: createForm.importedFileId,
      deadline: createForm.deadline,
      remark: createForm.remark,
    });
    createDialogVisible.value = false;
    createForm.projectName = '';
    createForm.deadline = '';
    createForm.remark = '';
    await clearProjectZip();
    await loadTasks();
    ElMessage.success(`任务下发成功，FileId：${result.fileId}`);
  } catch (error) {
    ElMessage.error(error?.message || '下发任务失败');
  } finally {
    createSubmitting.value = false;
  }
}

async function resetMockData() {
  await resetInspectionTaskMockData();
  detailTask.value = null;
  selectedTaskId.value = '';
  issueList.value = [];
  expandedProjectIds.value = [];
  closePlaybackPanel();
  emit('inspection-task-cleared');
  await loadTasks();
  ElMessage.success('测试数据已重置');
}

async function playRouteTrack(task, route, options = {}) {
  const { track = null, autoPlay = false, resetProgress = true } = options;
  playbackTask.value = task || null;
  playbackRoute.value = route;
  playbackPanelVisible.value = true;
  playbackLoading.value = true;
  trackPlaying.value = false;
  if (resetProgress) {
    playbackProgress.value = 0;
  }
  stopPlaybackTimer();
  try {
    if (track) {
      playbackTrack.value = track;
    } else if (route.trackPoints && Array.isArray(route.trackPoints) && route.trackPoints.length > 0) {
      playbackTrack.value = {
        routeId: route.routeId,
        taskRouteId: route.id,
        routeName: route.routeName,
        stats: route.stats || {
          durationMinutes: 0,
          distanceKm: 0,
          pointCount: route.trackPoints.length,
          issueCount: route.issues?.length || 0,
        },
        points: route.trackPoints,
        issues: route.issues || [],
        coordinates: route.coordinates || [],
      };
    } else {
      playbackTrack.value = await getInspectionTaskRouteTracks(route.id);
    }
    emitPlaybackProgress();
    if (autoPlay && playbackTrack.value?.points?.length) {
      toggleTrackPlayback();
    }
  } catch (error) {
    ElMessage.error(error?.message || '轨迹加载失败');
  } finally {
    playbackLoading.value = false;
  }
}

function stopPlaybackTimer() {
  if (playbackTimer) {
    window.clearInterval(playbackTimer);
    playbackTimer = null;
  }
}

function toggleTrackPlayback() {
  if (!playbackTrack.value?.points?.length) return;
  if (trackPlaying.value) {
    trackPlaying.value = false;
    stopPlaybackTimer();
    return;
  }

  trackPlaying.value = true;
  stopPlaybackTimer();
  playbackTimer = window.setInterval(() => {
    if (playbackProgress.value >= playbackMax.value) {
      trackPlaying.value = false;
      stopPlaybackTimer();
      return;
    }
    playbackProgress.value += 1;
    emitPlaybackProgress();
  }, 700);
}

function emitPlaybackProgress() {
}

function seekTrackPlayback() {
  trackPlaying.value = false;
  stopPlaybackTimer();
  emitPlaybackProgress();
}

function resetTrackPlayback() {
  playbackProgress.value = 0;
  trackPlaying.value = false;
  stopPlaybackTimer();
  emitPlaybackProgress();
}

function closePlaybackPanel() {
  playbackPanelVisible.value = false;
  trackPlaying.value = false;
  stopPlaybackTimer();
  playbackTask.value = null;
  playbackRoute.value = null;
  playbackTrack.value = null;
  playbackProgress.value = 0;
}

watch(
  () => props.active,
  async (value) => {
    if (!value) {
      stopPlaybackTimer();
      return;
    }
    await ensureBaseData();
  },
  { immediate: true }
);

watch(
  () => createDialogVisible.value,
  async (value) => {
    if (value) {
      await ensureBaseData();
    } else {
      createForm.projectName = '';
      createForm.deadline = '';
      createForm.remark = '';
      createForm.importedFileId = '';
      await clearProjectZip();
    }
  }
);

watch(
  () => reviewDialogVisible.value,
  (value) => {
    if (!value) {
      reviewIssueList.value = [];
      reviewTrackData.value = null;
      reviewRoute.value = null;
      reviewTask.value = null;
      reviewForm.reason = '';
    }
  }
);

onMounted(async () => {
  await ensureBaseData();
});

onBeforeUnmount(() => {
  stopPlaybackTimer();
});
</script>

<style scoped>
.toolbar {
  position: absolute;
  top: var(--map-topbar-height, 50px);
  left: 0;
  right: 0;
  min-height: var(--map-module-toolbar-height, 60px);
  background: #f3f5f7;
  border-bottom: 1px solid #e0e3e6;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  z-index: 6;
  box-sizing: border-box;
  overflow-x: auto;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
  min-width: 56px;
  color: #243341;
}

.tool-btn:hover {
  background: #e9edef;
}

.tool-btn.active {
  background: #e1eefd;
  color: #007bff;
}

.tool-icon {
  width: 20px;
  height: 20px;
}

.tool-btn span {
  margin-top: 2px;
  font-size: 12px;
  white-space: nowrap;
}

.placeholder-card {
  position: absolute;
  top: var(--map-overlay-top, 120px);
  left: 12px;
  width: 360px;
  min-height: 128px;
  padding: 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.18);
  z-index: 6;
  box-sizing: border-box;
}

.placeholder-card__title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.placeholder-card__text {
  margin-top: 10px;
  color: #526173;
  line-height: 1.7;
  font-size: 13px;
}

.inspection-layout {
  position: fixed;
  top: calc(var(--map-topbar-height, 50px) + 86px);
  bottom: calc(var(--map-bottom-bar-height, 28px) + 12px);
  left: 50%;
  transform: translateX(-50%);
  width: 80vw;
  max-height: calc(100vh - var(--map-topbar-height, 50px) - 86px - var(--map-bottom-bar-height, 28px) - 12px);
  z-index: 20;
  display: flex;
  justify-content: center;
}

.inspection-panel {
  width: 80vw;
  height: 100%;
  max-height: 100%;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.95));
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.18),
    0 8px 20px rgba(30, 64, 175, 0.08);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
}

.panel-header__title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #0f172a;
}

.panel-header__subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.panel-header__actions {
  display: flex;
  gap: 10px;
}

.filter-form {
  margin-bottom: 14px;
  padding: 16px 18px 4px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(240, 246, 255, 0.92), rgba(255, 255, 255, 0.92));
  border: 1px solid #e3edf9;
}

.filter-form__item {
  margin-right: 14px;
}

.filter-form__item--keyword {
  width: 320px;
}

.filter-form__item--status {
  width: 180px;
}

.filter-form__item--range {
  width: 360px;
}

.filter-form__item--actions {
  width: auto;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 14px 0 18px;
}

.table-wrapper {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  --inspection-pagination-height: 148px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid #e3ebf5;
  background: #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.project-table {
  flex: 1;
  min-height: 0;
}

.project-expand {
  padding: 12px 16px 18px;
  background: linear-gradient(180deg, #f6f4ff, #fbfaff);
}

.project-expand__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.project-expand__title {
  font-size: 14px;
  font-weight: 700;
  color: #4c3f91;
}

.project-expand__meta {
  font-size: 12px;
  color: #7063b7;
}

.project-task-table {
  border-radius: 3px;
  overflow: hidden;
}

:deep(.project-task-table .el-table__inner-wrapper) {
  border-radius: 3px;
}

.task-name-cell {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.task-name-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-top: 5px;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.75);
}

.task-accent--pending {
  background: #f59e0b;
}

.task-accent--in_progress {
  background: #14b8a6;
}

.task-accent--awaiting_review {
  background: #f97316;
}

.task-accent--completed {
  background: #22c55e;
}

.task-accent--rejected {
  background: #ef4444;
}

.task-accent--overdue {
  background: #64748b;
}

.cell-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.cell-sub {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.route-list-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-descriptions {
  margin-bottom: 20px;
}

.route-card + .route-card {
  margin-top: 14px;
}

.route-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.route-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.route-card__sub {
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
}

.project-upload {
  width: 100%;
}

.project-upload__inner {
  padding: 8px 0;
}

.project-upload__title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.project-upload__desc {
  margin-top: 6px;
  color: #475569;
  line-height: 1.7;
}

.project-upload__hint {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.selected-project-file {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8fbff;
  border: 1px dashed #d7e7fb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.issue-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.issue-card__content {
  display: flex;
  gap: 14px;
}

.issue-card__image {
  width: 180px;
  height: 110px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.issue-card__body {
  min-width: 0;
}

.issue-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.issue-card__meta {
  margin-top: 10px;
  color: #526173;
  line-height: 1.7;
}

.review-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-playback-alert {
  margin-top: 4px;
}

.review-section-card {
  border-radius: 16px;
  border: 1px solid #e4ebf5;
  background: linear-gradient(180deg, #fbfdff, #f7fbff);
}

.review-section-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.review-issue-image {
  width: 72px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  cursor: zoom-in;
  border: 1px solid #d8d0ff;
  background: #f5f2ff;
}

.review-form {
  margin-top: 18px;
  padding: 16px 16px 0;
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fbff, #ffffff);
}

.outer-pagination,
.inner-pagination {
  display: flex;
  justify-content: flex-end;
}

.outer-pagination {
  padding: 16px 4px 4px;
  min-height: var(--inspection-pagination-height);
  box-sizing: border-box;
  flex-shrink: 0;
}

.inner-pagination {
  padding-top: 14px;
}

:deep(.el-table .current-row > td) {
  background: rgba(64, 158, 255, 0.12) !important;
}

:deep(.inspection-panel > .el-card__header) {
  padding: 18px 22px 12px;
  background:
    radial-gradient(circle at top left, rgba(191, 219, 254, 0.55), transparent 38%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 251, 255, 0.98));
  border-bottom: 1px solid #e5edf7;
}

:deep(.inspection-panel > .el-card__body) {
  padding: 18px 22px 22px;
  height: calc(100% - 74px);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

:deep(.project-task-table.el-table) {
  --el-table-header-bg-color: #ece9ff;
  --el-table-row-hover-bg-color: #f4f1ff;
  --el-table-border-color: #d8d0ff;
  border-radius: 3px;
}

:deep(.project-task-table .el-table__inner-wrapper::before) {
  background-color: #a89cf4;
}

:deep(.project-task-table .task-row--odd > td) {
  background: #faf8ff;
}

:deep(.project-task-table .task-row--even > td) {
  background: #f5f2ff;
}

:deep(.project-task-table .task-row--pending > td:first-child) {
  box-shadow: inset 4px 0 0 #f59e0b;
}

:deep(.project-task-table .task-row--in_progress > td:first-child) {
  box-shadow: inset 4px 0 0 #14b8a6;
}

:deep(.project-task-table .task-row--awaiting_review > td:first-child) {
  box-shadow: inset 4px 0 0 #f97316;
}

:deep(.project-task-table .task-row--completed > td:first-child) {
  box-shadow: inset 4px 0 0 #22c55e;
}

:deep(.project-task-table .task-row--rejected > td:first-child) {
  box-shadow: inset 4px 0 0 #ef4444;
}

:deep(.project-task-table .task-row--overdue > td:first-child) {
  box-shadow: inset 4px 0 0 #64748b;
}

:deep(.filter-form .el-form-item) {
  margin-bottom: 12px;
}

:deep(.filter-form .el-form-item__content) {
  width: 100%;
}

:deep(.filter-form .el-input__wrapper),
:deep(.filter-form .el-select__wrapper),
:deep(.filter-form .el-textarea__inner),
:deep(.filter-form .el-range-editor),
:deep(.project-upload .el-upload-dragger) {
  border-radius: 12px;
  box-shadow: 0 0 0 1px #dce7f5 inset;
}

:deep(.project-upload .el-upload-dragger) {
  width: 100%;
  padding: 24px 18px;
  border: 1px dashed #c7dcfb;
  background: linear-gradient(180deg, #fbfdff, #f4f8ff);
}

:deep(.filter-form .el-input),
:deep(.filter-form .el-select),
:deep(.filter-form .el-date-editor) {
  width: 100%;
}

:deep(.filter-form .el-input__inner),
:deep(.filter-form .el-select__selected-item),
:deep(.filter-form .el-select__placeholder),
:deep(.filter-form .el-range-input) {
  color: #0f172a;
  font-weight: 500;
}

:deep(.filter-form .el-select__placeholder.is-transparent) {
  color: #94a3b8;
}

:deep(.summary-row .el-tag) {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-weight: 600;
}

:deep(.el-table) {
  --el-table-header-bg-color: #f5f9ff;
  --el-table-row-hover-bg-color: #f7fbff;
  --el-table-border-color: #e4ebf5;
  border-radius: 18px;
}

:deep(.el-table th.el-table__cell) {
  padding: 14px 0;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
}

:deep(.el-table td.el-table__cell) {
  padding: 16px 0;
}

:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding: 22px 24px 18px;
  border-bottom: 1px solid #e7edf5;
  background: linear-gradient(180deg, #f8fbff, #ffffff);
}

:deep(.el-drawer__title) {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

:deep(.el-drawer__body) {
  padding: 22px 24px 24px;
  background: linear-gradient(180deg, #ffffff, #f9fbff 82%);
}

:deep(.el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e8eef5;
  background: linear-gradient(180deg, #f8fbff, #ffffff);
}

:deep(.el-dialog__title) {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

:deep(.el-dialog__body) {
  padding: 22px 24px 18px;
}

:deep(.el-dialog__footer) {
  padding: 14px 24px 22px;
  border-top: 1px solid #edf2f7;
  background: #fbfdff;
}

:deep(.el-card.route-card) {
  border-radius: 16px;
  border-color: #e4ebf5;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

:deep(.el-card.route-card > .el-card__header) {
  padding: 16px 18px 14px;
  background: linear-gradient(180deg, #fbfdff, #f6faff);
}

:deep(.el-card.route-card > .el-card__body) {
  padding: 16px 18px 18px;
}

:deep(.issue-card .el-card__body) {
  padding: 16px;
}

:deep(.el-descriptions__body .el-descriptions__table) {
  border-radius: 14px;
  overflow: hidden;
}

:deep(.el-slider__runway) {
  height: 8px;
  border-radius: 999px;
}

:deep(.el-slider__bar) {
  height: 8px;
  border-radius: 999px;
}

:deep(.el-timeline-item__content) {
  color: #334155;
  line-height: 1.6;
}

@media (max-width: 1200px) {
  .inspection-layout,
  .inspection-panel {
    width: calc(100vw - 24px);
  }
}

@media (max-width: 900px) {
  .inspection-layout {
    top: 118px;
    bottom: calc(var(--map-bottom-bar-height, 28px) + 10px);
    width: calc(100vw - 20px);
    max-height: calc(100vh - 118px - var(--map-bottom-bar-height, 28px) - 10px);
  }

  .panel-header,
  .project-expand__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel-header__actions {
    width: 100%;
  }

  .issue-card__content,
  .selected-project-file {
    flex-direction: column;
    align-items: flex-start;
  }

  .issue-card__image {
    width: 100%;
    height: 180px;
  }
}
</style>
