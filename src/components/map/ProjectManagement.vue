<template>
	<section class="project-page">
		<section class="metrics-grid">
			<el-card
				v-for="card in projectSummaryCards"
				:key="card.key"
				shadow="hover"
				class="metric-card"
			>
				<div class="metric-card__label">{{ card.label }}</div>
				<div class="metric-card__value">{{ card.value }}</div>
				<div class="metric-card__hint">{{ card.hint }}</div>
			</el-card>
		</section>

		<el-card shadow="never" class="content-card project-filter-card">
			<template #header>
				<div class="content-card__header">
					<span>项目筛选</span>
					<div class="project-filter-actions">
						<el-button v-if="currentRole !== roleEnum.EMPLOYEE" type="primary" @click="emit('open-create-dialog')">
							{{ currentRole === roleEnum.ADMIN ? '下发项目' : '下发本部门项目' }}
						</el-button>
						<el-button @click="emit('reset-filters')">重置筛选</el-button>
					</div>
				</div>
			</template>
			<div class="project-filter-grid">
				<el-input
					:model-value="projectFilters.keyword"
					clearable
					placeholder="按项目名、客户名或执行人搜索"
					@update:model-value="emit('update-filter', 'keyword', $event)"
				/>
				<el-select
					:model-value="projectFilters.status"
					clearable
					placeholder="筛选状态"
					@update:model-value="emit('update-filter', 'status', $event)"
				>
					<el-option
						v-for="status in projectStatusOptions"
						:key="status"
						:label="status"
						:value="status"
					/>
				</el-select>
				<el-select
					:model-value="projectFilters.priority"
					clearable
					placeholder="筛选优先级"
					@update:model-value="emit('update-filter', 'priority', $event)"
				>
					<el-option
						v-for="priority in projectPriorityOptions"
						:key="priority"
						:label="priority"
						:value="priority"
					/>
				</el-select>
				<el-select
					:model-value="projectFilters.progress"
					clearable
					placeholder="筛选项目进度"
					@update:model-value="emit('update-filter', 'progress', $event)"
				>
					<el-option
						v-for="option in projectProgressFilterOptions"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					/>
				</el-select>
				<el-select
					v-if="currentRole !== roleEnum.EMPLOYEE"
					:model-value="projectFilters.department"
					clearable
					:disabled="currentRole === roleEnum.MANAGER"
					placeholder="筛选部门"
					@update:model-value="emit('update-filter', 'department', $event)"
				>
					<el-option
						v-for="department in projectDepartmentOptions"
						:key="department"
						:label="department"
						:value="department"
					/>
				</el-select>
			</div>
		</el-card>

		<el-card shadow="never" class="content-card project-table-card">
			<template #header>
				<div class="content-card__header">
					<span>{{ projectTableTitle }}</span>
					<el-tag type="primary" effect="plain">{{ projectTotal || filteredProjects.length }} 个</el-tag>
				</div>
			</template>
			<div class="project-table-shell">
				<el-table
					v-if="filteredProjects.length"
					:data="paginatedProjects"
					border
					stripe
					height="100%"
					class="project-table"
				>
					<el-table-column prop="projectName" label="项目名称" min-width="200" show-overflow-tooltip />
					<el-table-column prop="customerName" label="客户名称" min-width="160" show-overflow-tooltip />
					<el-table-column
						v-if="currentRole !== roleEnum.EMPLOYEE"
						prop="department"
						label="所属部门"
						min-width="130"
					/>
					<el-table-column prop="leader" label="负责人" min-width="110" />
					<el-table-column prop="executor" label="执行人" min-width="110" />
					<el-table-column label="进度" min-width="180">
						<template #default="{ row }">
							<el-progress
								:percentage="row.progress"
								:stroke-width="12"
								:status="row.status === '已完成' ? 'success' : undefined"
							/>
						</template>
					</el-table-column>
					<el-table-column label="状态" width="100" align="center">
						<template #default="{ row }">
							<el-tag size="small" :type="statusTagTypeMap[row.status] || 'info'">{{ row.status }}</el-tag>
						</template>
					</el-table-column>
					<el-table-column label="优先级" width="100" align="center">
						<template #default="{ row }">
							<el-tag size="small" effect="plain" :type="priorityTagTypeMap[row.priority] || 'info'">{{ row.priority }}</el-tag>
						</template>
					</el-table-column>
					<el-table-column prop="deadline" label="截止日期" min-width="120" />
					<el-table-column label="附件" width="86" align="center">
						<template #default="{ row }">
							{{ getProjectAttachmentCount(row) }}
						</template>
					</el-table-column>
					<el-table-column label="操作" min-width="220" fixed="right" align="center">
						<template #default="{ row }">
							<div class="project-row-actions">
								<el-button link type="primary" @click="emit('open-detail', row)">详情</el-button>
								<el-button
									v-if="canSubmitProjectProgress(row)"
									link
									type="success"
									@click="emit('open-progress', row)"
								>
									提交进度
								</el-button>
								<el-button
									v-if="canAuditProject(row)"
									link
									type="success"
									@click="emit('approve', row)"
								>
									审核通过
								</el-button>
								<el-button
									v-if="canAuditProject(row)"
									link
									type="danger"
									@click="emit('reject', row)"
								>
									驳回
								</el-button>
							</div>
						</template>
					</el-table-column>
				</el-table>
				<div v-else class="module-empty-state">
					<el-empty :image-size="88" description="当前筛选条件下暂无项目数据" />
					<div class="module-empty-state__actions">
						<el-button @click="emit('reset-filters')">重置筛选</el-button>
						<el-button v-if="currentRole !== roleEnum.EMPLOYEE" type="primary" @click="emit('open-create-dialog')">
							{{ currentRole === roleEnum.ADMIN ? '下发项目' : '下发本部门项目' }}
						</el-button>
					</div>
				</div>
			</div>
			<div class="employee-pagination">
				<div class="employee-pagination__total">共 {{ projectTotal || filteredProjects.length }} 个</div>
				<el-pagination
					v-model:current-page="internalPage"
					v-model:page-size="internalPageSize"
					background
					layout="prev, pager, next, sizes"
					:page-sizes="[10, 20, 50]"
					:total="projectTotal || filteredProjects.length"
				/>
			</div>
		</el-card>
	</section>

	<el-dialog
		:model-value="projectDetailVisible"
		title="项目详情"
		width="920px"
		append-to-body
		@update:model-value="emit('update-detail-visible', $event)"
	>
		<div v-if="currentProjectDetail" class="project-detail-grid">
			<div class="project-detail-panel">
				<div class="project-detail-panel__header">
					<div>
						<div class="project-detail-panel__title">{{ currentProjectDetail.projectName }}</div>
						<div class="project-detail-panel__meta">
							{{ currentProjectDetail.department }} / {{ currentProjectDetail.customerName }} / 截止 {{ currentProjectDetail.deadline }}
						</div>
					</div>
					<el-tag :type="statusTagTypeMap[currentProjectDetail.status] || 'info'">
						{{ currentProjectDetail.status }}
					</el-tag>
				</div>
				<el-descriptions :column="2" border size="small" class="project-descriptions">
					<el-descriptions-item label="客户联系方式">{{ currentProjectDetail.customerContact }}</el-descriptions-item>
					<el-descriptions-item label="项目负责人">{{ currentProjectDetail.leader }}</el-descriptions-item>
					<el-descriptions-item label="执行人">{{ currentProjectDetail.executor }}</el-descriptions-item>
					<el-descriptions-item label="当前进度">{{ currentProjectDetail.progress }}%</el-descriptions-item>
					<el-descriptions-item label="当前节点">{{ getProjectStageLabel(getProjectCurrentStageKey(currentProjectDetail)) || '任务下发' }}</el-descriptions-item>
					<el-descriptions-item label="优先级">{{ currentProjectDetail.priority }}</el-descriptions-item>
					<el-descriptions-item label="创建日期">{{ currentProjectDetail.createdAt }}</el-descriptions-item>
					<el-descriptions-item label="项目描述" :span="2">
						{{ getProjectDescription(currentProjectDetail) }}
					</el-descriptions-item>
				</el-descriptions>
			</div>

			<div class="project-detail-section">
				<div class="project-detail-section__title">进度与审核记录</div>
				<el-scrollbar v-if="projectTimelineEntries.length" class="project-timeline-scroll">
					<el-timeline class="project-timeline">
						<el-timeline-item
							v-for="entry in projectTimelineEntries"
							:key="entry.key"
							:timestamp="entry.date"
							placement="top"
							:color="entry.color"
						>
							<el-card shadow="never" class="project-timeline-card">
								<div class="project-timeline__head">
									<strong>{{ entry.title }}</strong>
									<el-tag size="small" effect="plain" :style="{ color: entry.color, borderColor: entry.color }">
										{{ entry.typeLabel }}
									</el-tag>
								</div>
								<div class="project-timeline__desc">{{ entry.content }}</div>
								<div v-if="entry.attachments?.length" class="project-timeline__attachments">
									<div class="project-timeline__attachments-title">附件</div>
									<div class="project-timeline__attachment-list">
										<template v-for="(attachment, attachmentIndex) in entry.attachments" :key="`${entry.key}-${attachmentIndex}`">
											<div
												v-if="isTimelineImageAttachment(attachment)"
												class="project-timeline__attachment-preview"
											>
												<el-image
													:src="getTimelineAttachmentUrl(attachment)"
													:preview-src-list="getTimelineImagePreviewList(entry.attachments)"
													fit="cover"
													class="project-timeline__attachment-image"
													preview-teleported
												/>
												<div class="project-timeline__attachment-name">{{ getTimelineAttachmentLabel(attachment) }}</div>
											</div>
											<button
												v-else
												type="button"
												class="project-timeline__attachment-item"
												@click="emit('download-attachment', currentProjectDetail, attachment, entry.title)"
											>
												<el-icon><Download /></el-icon>
												{{ getTimelineAttachmentLabel(attachment) }}
											</button>
										</template>
									</div>
								</div>
							</el-card>
						</el-timeline-item>
					</el-timeline>
				</el-scrollbar>
				<el-empty v-else :image-size="72" description="暂无进度记录" />
			</div>

			<div class="project-detail-section">
				<div class="project-detail-section__header">
					<div class="project-detail-section__title">附件列表</div>
					<el-button
						v-if="currentProjectDetail && currentProjectAttachments.length"
						size="small"
						type="primary"
						plain
						@click="emit('download-all-attachments', currentProjectDetail)"
					>
						下载全部
					</el-button>
				</div>
				<div v-if="currentProjectAttachments.length" class="project-attachment-list">
					<button
						v-for="(attachment, index) in currentProjectAttachments"
						:key="attachment?.key || `${currentProjectDetail.id}-${index}`"
						type="button"
						class="project-attachment-item"
						@click="emit('download-attachment', currentProjectDetail, attachment, '项目详情附件')"
					>
						<el-icon><Download /></el-icon>
						<span>{{ attachment?.fileName || attachment }}</span>
					</button>
				</div>
				<el-empty v-else :image-size="72" description="当前项目暂无附件" />
			</div>
		</div>
		<template #footer>
			<div class="dialog-footer">
				<el-button @click="emit('update-detail-visible', false)">关闭</el-button>
				<el-button
					v-if="currentProjectDetail && canSubmitProjectProgress(currentProjectDetail)"
					type="primary"
					@click="emit('open-progress', currentProjectDetail)"
				>
					提交进度
				</el-button>
				<el-button
					v-if="currentProjectDetail && canAuditProject(currentProjectDetail)"
					type="danger"
					plain
					@click="emit('reject', currentProjectDetail)"
				>
					驳回
				</el-button>
				<el-button
					v-if="currentProjectDetail && canAuditProject(currentProjectDetail)"
					type="success"
					@click="emit('approve', currentProjectDetail)"
				>
					审核通过
				</el-button>
			</div>
		</template>
	</el-dialog>

	<el-dialog
		:model-value="projectFormVisible"
		:title="currentRole === roleEnum.ADMIN ? '下发项目' : '下发本部门项目'"
		width="720px"
		append-to-body
		@update:model-value="emit('update-form-visible', $event)"
	>
		<el-form
			ref="projectFormRef"
			:model="projectForm"
			:rules="projectRules"
			label-width="92px"
			@submit.prevent
		>
			<div class="project-form-grid">
				<el-form-item label="所属部门" prop="department">
					<el-select
						v-model="projectForm.department"
						:disabled="currentRole === roleEnum.MANAGER"
						clearable
						placeholder="请选择所属部门"
						@change="emit('department-change')"
					>
						<el-option
							v-for="department in projectDepartmentOptions"
							:key="department"
							:label="department"
							:value="department"
						/>
					</el-select>
				</el-form-item>
				<el-form-item label="执行人" prop="executor">
					<el-select v-model="projectForm.executor" clearable placeholder="请选择执行人" @change="emit('executor-change', $event)">
						<el-option
							v-for="employee in availableProjectExecutors"
							:key="employee.id"
							:label="`${employee.name} / ${employee.position} / ${employee.department}`"
							:value="employee.name"
						/>
					</el-select>
				</el-form-item>
				<el-form-item label="客户名称" prop="customerName">
					<el-input v-model="projectForm.customerName" placeholder="请输入客户名称" />
				</el-form-item>
				<el-form-item label="联系方式" prop="customerContact">
					<el-input v-model="projectForm.customerContact" placeholder="请输入客户联系方式" />
				</el-form-item>
				<el-form-item class="project-form-grid__full" label="项目名称" prop="projectName">
					<el-input v-model="projectForm.projectName" placeholder="请输入项目名称" />
				</el-form-item>
				<el-form-item class="project-form-grid__full" label="项目描述" prop="projectDesc">
					<el-input
						v-model="projectForm.projectDesc"
						type="textarea"
						:rows="3"
						placeholder="请输入项目描述"
					/>
				</el-form-item>
				<el-form-item label="截止日期" prop="deadline">
					<el-date-picker
						v-model="projectForm.deadline"
						type="date"
						value-format="YYYY-MM-DD"
						placeholder="请选择截止日期"
					/>
				</el-form-item>
				<el-form-item label="优先级" prop="priority">
					<el-select v-model="projectForm.priority" placeholder="请选择优先级">
						<el-option
							v-for="priority in projectPriorityOptions"
							:key="priority"
							:label="priority"
							:value="priority"
						/>
					</el-select>
				</el-form-item>
				<el-form-item class="project-form-grid__full" label="附件清单">
					<el-upload
						v-model:file-list="projectForm.attachmentFiles"
						class="project-upload"
						drag
						multiple
						limit="10"
						:auto-upload="false"
						accept=".jpg,.png,.pdf,.doc,.docx,.xls,.xlsx,.zip"
						:before-upload="beforeProjectAttachmentUpload"
						:on-change="handleProjectAttachmentChange"
						:on-exceed="handleProjectAttachmentExceed"
					>
						<el-icon class="el-icon--upload"><UploadFilled /></el-icon>
						<div class="el-upload__text">
							将文件拖到此处，或<em>点击上传</em>
						</div>
						<template #tip>
							<div class="project-upload__tip">
								附件大小限制：单个最大 50MB，最多 10 个，总大小不超过 200MB。
							</div>
							<div class="project-upload__tip">
								允许格式：.jpg,.png,.pdf,.doc,.docx,.xls,.xlsx,.zip
							</div>

						</template>
					</el-upload>
				</el-form-item>
			</div>
		</el-form>
		<template #footer>
			<div class="dialog-footer">
				<el-button @click="handleResetForm">重置</el-button>
				<el-button type="primary" @click="emit('submit-form')">确认下发</el-button>
			</div>
		</template>
	</el-dialog>

	<el-dialog
		:model-value="projectProgressVisible"
		title="提交项目进度"
		width="640px"
		append-to-body
		@update:model-value="emit('update-progress-visible', $event)"
	>
		<div v-if="progressTargetProject" class="project-progress-summary">
			<div class="project-progress-summary__title">{{ progressTargetProject.projectName }}</div>
			<div class="project-progress-summary__meta">
				当前节点 {{ getProjectStageLabel(projectProgressCurrentStageKey) || '任务下发' }} / 当前进度 {{ progressTargetProject.progress }}%，截止 {{ progressTargetProject.deadline }}
			</div>
		</div>
		<el-form
			ref="projectProgressFormRef"
			:model="projectProgressForm"
			:rules="projectProgressRules"
			label-width="92px"
			@submit.prevent
		>
			<el-form-item label="进度节点" prop="stageKey">
				<el-select v-model="projectProgressForm.stageKey" placeholder="请选择固定节点">
					<el-option
						v-for="stage in projectProgressStageOptions"
						:key="stage.key"
						:label="stage.label"
						:value="stage.key"
					/>
				</el-select>
			</el-form-item>
			<el-form-item label="进度百分比" prop="progress">
				<div class="project-progress-field">
					<el-slider
						v-model="projectProgressForm.progress"
						:min="projectProgressRange.min"
						:max="projectProgressRange.max"
						:disabled="Boolean(selectedProjectProgressStage?.fixedProgress !== undefined)"
						show-input
					/>
					<div class="project-progress-field__hint">{{ projectProgressStageHint }}</div>
				</div>
			</el-form-item>
			<el-form-item label="进度说明" prop="content">
				<el-input
					v-model="projectProgressForm.content"
					type="textarea"
					:rows="4"
					placeholder="请输入本次进度说明"
				/>
			</el-form-item>
			<el-form-item label="补充附件">
				<el-upload
					v-model:file-list="projectProgressForm.attachmentFiles"
					class="project-upload"
					drag
					multiple
					limit="10"
					:auto-upload="false"
					accept=".jpg,.png,.pdf,.doc,.docx,.xls,.xlsx,.zip"
					:before-upload="beforeProjectAttachmentUpload"
					:on-change="handleProjectProgressAttachmentChange"
					:on-exceed="handleProjectAttachmentExceed"
				>
					<el-icon class="el-icon--upload"><UploadFilled /></el-icon>
					<div class="el-upload__text">
						将文件拖到此处，或<em>点击上传</em>
					</div>
					<template #tip>
						<div class="project-upload__tip">
							附件大小限制：单个最大 50MB，最多 10 个，总大小不超过 200MB。
						</div>
						<div class="project-upload__tip">
							允许格式：.jpg,.png,.pdf,.doc,.docx,.xls,.xlsx,.zip
						</div>
					</template>
				</el-upload>
			</el-form-item>
		</el-form>
		<template #footer>
			<div class="dialog-footer">
				<el-button @click="emit('update-progress-visible', false)">取消</el-button>
				<el-button type="primary" @click="emit('submit-progress')">提交</el-button>
			</div>
		</template>
	</el-dialog>
	<el-dialog
		:model-value="projectUploadProgressVisible"
		title="上传附件"
		width="420px"
		append-to-body
		:close-on-click-modal="false"
		:close-on-press-escape="false"
		:show-close="false"
	>
		<div class="project-upload-progress">
			<div class="project-upload-progress__text">{{ projectUploadProgressText }}</div>
			<el-progress :percentage="projectUploadProgress" :stroke-width="12" />
		</div>
	</el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Download, UploadFilled } from '@element-plus/icons-vue';
import { downloadFile as apiDownloadFile } from '../../api/personalCenter';
import {
	projectStatusOptions,
	projectPriorityOptions,
	projectProgressFilterOptions,
} from './personal-center/mockData.js';

// 本地表单 ref，供 el-form 使用
const projectFormRef = ref(null);
const projectProgressFormRef = ref(null);

const props = defineProps({
	currentRole: {
		type: String,
		required: true,
	},
	roleEnum: {
		type: Object,
		required: true,
	},
	projectFilters: {
		type: Object,
		required: true,
	},
	projectForm: {
		type: Object,
		required: true,
	},
	projectProgressForm: {
		type: Object,
		required: true,
	},
	projectRules: {
		type: Object,
		required: true,
	},
	projectProgressRules: {
		type: Object,
		required: true,
	},
	projectDepartmentOptions: {
		type: Array,
		required: true,
	},
	availableProjectExecutors: {
		type: Array,
		required: true,
	},
	filteredProjects: {
		type: Array,
		required: true,
	},
	projectTablePage: {
		type: Number,
		required: true,
	},
	projectTablePageSize: {
		type: Number,
		required: true,
	},
	projectTotal: {
		type: Number,
		default: 0,
	},
	projectDetailVisible: {
		type: Boolean,
		required: true,
	},
	projectFormVisible: {
		type: Boolean,
		required: true,
	},
	projectProgressVisible: {
		type: Boolean,
		required: true,
	},
	projectUploadProgressVisible: {
		type: Boolean,
		default: false,
	},
	projectUploadProgress: {
		type: Number,
		default: 0,
	},
	projectUploadProgressText: {
		type: String,
		default: '',
	},
	projectFormRef: {
		type: Object,
		default: null,
	},
	projectProgressFormRef: {
		type: Object,
		default: null,
	},
	currentProjectDetail: {
		type: Object,
		default: null,
	},
	currentProjectAttachments: {
		type: Array,
		default: () => [],
	},
	projectTimelineEntries: {
		type: Array,
		default: () => [],
	},
	progressTargetProject: {
		type: Object,
		default: null,
	},
	projectProgressBaseline: {
		type: Number,
		default: 0,
	},
	projectProgressCurrentStageKey: {
		type: String,
		default: '',
	},
	projectProgressStageOptions: {
		type: Array,
		default: () => [],
	},
	selectedProjectProgressStage: {
		type: Object,
		default: null,
	},
	projectProgressRange: {
		type: Object,
		required: true,
	},
	projectProgressStageHint: {
		type: String,
		default: '',
	},
	projectTableTitle: {
		type: String,
		required: true,
	},
	projectSummaryCards: {
		type: Array,
		required: true,
	},
	scopedProjects: {
		type: Array,
		required: true,
	},
	currentUser: {
		type: Object,
		required: true,
	},
	getProjectAttachmentCount: {
		type: Function,
		required: true,
	},
	getProjectCurrentStageKey: {
		type: Function,
		required: true,
	},
	getProjectStageLabel: {
		type: Function,
		required: true,
	},
	getProjectDescription: {
		type: Function,
		required: true,
	},
	canAuditProject: {
		type: Function,
		required: true,
	},
	canSubmitProjectProgress: {
		type: Function,
		required: true,
	},
});


const emit = defineEmits([
	'update-filter',
	'reset-filters',
	'open-detail',
	'open-create-dialog',
	'open-progress',
	'approve',
	'reject',
	'update-detail-visible',
	'update-form-visible',
	'reset-form',
	'update-progress-visible',
	'department-change',
	'executor-change',
	'submit-form',
	'submit-progress',
	'download-attachment',
	'download-all-attachments',
	'update:project-table-page',
	'update:project-table-page-size',
]);

const internalPage = computed({
	get: () => props.projectTablePage,
	set: (val) => emit('update:project-table-page', val),
});

const internalPageSize = computed({
	get: () => props.projectTablePageSize,
	set: (val) => emit('update:project-table-page-size', val),
});

const paginatedProjects = computed(() => props.filteredProjects);

const statusTagTypeMap = {
	'待审核': 'warning',
	'进行中': 'primary',
	'已完成': 'success',
};

const priorityTagTypeMap = {
	'高': 'danger',
	'中': 'warning',
	'低': 'info',
};

const PROJECT_ATTACHMENT_MAX_COUNT = 10;
const PROJECT_ATTACHMENT_MAX_SIZE = 50 * 1024 * 1024;
const PROJECT_ATTACHMENT_MAX_TOTAL_SIZE = 200 * 1024 * 1024;
const PROJECT_ATTACHMENT_ACCEPTED_EXTENSIONS = ['.jpg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip'];
const TIMELINE_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const timelineAttachmentPreviewUrls = reactive({});

function getTimelineAttachmentKey(attachment) {
	if (!attachment || typeof attachment === 'string') return String(attachment || '');
	return String(attachment?.id || attachment?.fileId || attachment?.attachmentId || attachment?.url || attachment?.fileName || '').trim();
}

function getTimelineAttachmentLabel(attachment) {
	if (typeof attachment === 'string') return attachment;
	return String(attachment?.fileName || attachment?.name || '').trim();
}

function getTimelineAttachmentUrl(attachment) {
	const key = getTimelineAttachmentKey(attachment);
	return String((key && timelineAttachmentPreviewUrls[key]) || attachment?.url || '').trim();
}

function getTimelineAttachmentExtension(attachment) {
	const fileName = getTimelineAttachmentLabel(attachment).toLowerCase();
	const lastDotIndex = fileName.lastIndexOf('.');
	return lastDotIndex >= 0 ? fileName.slice(lastDotIndex) : '';
}

function isTimelineImageAttachment(attachment) {
	const url = getTimelineAttachmentUrl(attachment);
	if (!url) return false;
	return TIMELINE_IMAGE_EXTENSIONS.includes(getTimelineAttachmentExtension(attachment));
}

function getTimelineImagePreviewList(attachments) {
	return Array.isArray(attachments)
		? attachments
			.filter((attachment) => isTimelineImageAttachment(attachment))
			.map((attachment) => getTimelineAttachmentUrl(attachment))
			.filter(Boolean)
		: [];
}

function revokeTimelineAttachmentPreviewUrls() {
	Object.values(timelineAttachmentPreviewUrls).forEach((url) => {
		if (typeof url === 'string' && url.startsWith('blob:')) {
			URL.revokeObjectURL(url);
		}
	});
	Object.keys(timelineAttachmentPreviewUrls).forEach((key) => {
		delete timelineAttachmentPreviewUrls[key];
	});
}

async function loadTimelineImagePreview(attachment) {
	if (!isTimelineImageAttachment(attachment) || typeof attachment === 'string') return;
	const key = getTimelineAttachmentKey(attachment);
	const fileId = String(attachment?.id || attachment?.fileId || attachment?.attachmentId || '').trim();
	if (!key || !fileId || timelineAttachmentPreviewUrls[key]) return;
	try {
		const { blob } = await apiDownloadFile(fileId);
		timelineAttachmentPreviewUrls[key] = URL.createObjectURL(blob);
	} catch {
		// Ignore preview loading failure and keep fallback rendering.
	}
}

watch(
	() => props.projectTimelineEntries,
	(entries) => {
		revokeTimelineAttachmentPreviewUrls();
		const imageAttachments = Array.isArray(entries)
			? entries.flatMap((entry) => Array.isArray(entry?.attachments) ? entry.attachments : [])
				.filter((attachment) => isTimelineImageAttachment(attachment))
			: [];
		imageAttachments.forEach((attachment) => {
			loadTimelineImagePreview(attachment);
		});
	},
	{ immediate: true, deep: true },
);

onBeforeUnmount(() => {
	revokeTimelineAttachmentPreviewUrls();
});

function getFileExtension(fileName) {
	const normalized = String(fileName || '').trim().toLowerCase();
	const lastDotIndex = normalized.lastIndexOf('.');
	return lastDotIndex >= 0 ? normalized.slice(lastDotIndex) : '';
}

function validateProjectAttachmentFile(rawFile, { showMessage = true } = {}) {
	const extension = getFileExtension(rawFile?.name);
	if (!PROJECT_ATTACHMENT_ACCEPTED_EXTENSIONS.includes(extension)) {
		if (showMessage) {
			ElMessage.warning(`仅支持上传 ${PROJECT_ATTACHMENT_ACCEPTED_EXTENSIONS.join('、')} 格式的文件`);
		}
		return false;
	}
	if (Number(rawFile?.size || 0) > PROJECT_ATTACHMENT_MAX_SIZE) {
		if (showMessage) {
			ElMessage.warning('单个附件不能超过 50MB');
		}
		return false;
	}
	return true;
}

function beforeProjectAttachmentUpload(rawFile) {
	return validateProjectAttachmentFile(rawFile);
}

function handleProjectAttachmentChange(uploadFile, fileList) {
	const nextFileList = Array.isArray(fileList) ? fileList.filter((item) => validateProjectAttachmentFile(item?.raw || item, { showMessage: false })) : [];
	const totalSize = nextFileList.reduce((sum, item) => sum + Number(item?.size || item?.raw?.size || 0), 0);
	if (totalSize > PROJECT_ATTACHMENT_MAX_TOTAL_SIZE) {
		ElMessage.warning('附件总大小不能超过 200MB');
		return;
	}
	if (nextFileList.length !== (Array.isArray(fileList) ? fileList.length : 0)) {
		props.projectForm.attachmentFiles.splice(0, props.projectForm.attachmentFiles.length, ...nextFileList);
	}
}

function handleProjectProgressAttachmentChange(uploadFile, fileList) {
	const nextFileList = Array.isArray(fileList) ? fileList.filter((item) => validateProjectAttachmentFile(item?.raw || item, { showMessage: false })) : [];
	const totalSize = nextFileList.reduce((sum, item) => sum + Number(item?.size || item?.raw?.size || 0), 0);
	if (totalSize > PROJECT_ATTACHMENT_MAX_TOTAL_SIZE) {
		ElMessage.warning('附件总大小不能超过 200MB');
		return;
	}
	if (nextFileList.length !== (Array.isArray(fileList) ? fileList.length : 0)) {
		props.projectProgressForm.attachmentFiles.splice(0, props.projectProgressForm.attachmentFiles.length, ...nextFileList);
	}
}

function handleProjectAttachmentExceed() {
	ElMessage.warning(`最多只能上传 ${PROJECT_ATTACHMENT_MAX_COUNT} 个附件`);
}

function handleResetForm() {
	projectForm.department = currentRole.value === roleEnum.MANAGER ? currentUser.value.department : '';
	projectForm.customerName = '';
	projectForm.customerContact = '';
	projectForm.projectName = '';
	projectForm.projectDesc = '';
	projectForm.executor = '';
	projectForm.deadline = '';
	projectForm.priority = '中';
	projectForm.attachmentFiles.splice(0, projectForm.attachmentFiles.length);
	projectFormRef.value?.clearValidate();
}

// 暴露表单 ref 给父组件
handleResetForm = function handleProjectFormReset() {
	props.projectForm.department = props.currentRole === props.roleEnum.MANAGER ? props.currentUser.department : '';
	props.projectForm.customerName = '';
	props.projectForm.customerContact = '';
	props.projectForm.projectName = '';
	props.projectForm.projectDesc = '';
	props.projectForm.executor = '';
	props.projectForm.deadline = '';
	props.projectForm.priority = '中';
	props.projectForm.attachmentFiles.splice(0, props.projectForm.attachmentFiles.length);
	projectFormRef.value?.clearValidate();
};

defineExpose({
	projectFormRef,
	projectProgressFormRef,
});
</script>

<style scoped>
.project-page {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: 14px;
	min-height: 0;
	height: 100%;
}

.project-filter-card :deep(.el-card__body) {
	padding-top: 18px;
}

.project-filter-actions {
	display: inline-flex;
	gap: 10px;
	flex-wrap: wrap;
}

.project-filter-grid {
	display: grid;
	grid-template-columns: minmax(220px, 2fr) repeat(4, minmax(140px, 1fr));
	gap: 12px;
}

.project-table-card {
	display: flex;
	align-items: stretch;
	flex-direction: column;
}

.project-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 4px 14px;
}

.project-form-grid__full {
	grid-column: 1 / -1;
}

.project-upload {
	width: 100%;
}

.project-upload :deep(.el-upload) {
	width: 100%;
}

.project-upload :deep(.el-upload-dragger) {
	width: 100%;
}

.project-upload__tip {
	font-size: 12px;
	line-height: 1.6;
	color: #64748b;
}

.project-detail-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 14px;
}

.project-detail-panel,
.project-detail-section {
	padding: 16px 18px;
	border-radius: 18px;
	background: #f8fafc;
	border: 1px solid #e5edf4;
}

.project-detail-panel__header,
.project-timeline__head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
}

.project-detail-panel__title,
.project-detail-section__title,
.project-progress-summary__title {
	font-size: 16px;
	font-weight: 700;
	color: #0f172a;
}

.project-detail-panel__meta,
.project-progress-summary__meta,
.project-timeline__desc {
	margin-top: 6px;
	font-size: 12px;
	line-height: 1.7;
	color: #64748b;
}

.project-descriptions {
	margin-top: 14px;
}

.project-timeline-scroll {
	max-height: 420px;
	padding-right: 6px;
}

.project-timeline {
	padding-top: 4px;
	padding-right: 6px;
}

.project-timeline :deep(.el-timeline-item__wrapper) {
	padding-left: 18px;
}

.project-timeline :deep(.el-timeline-item__timestamp) {
	margin-bottom: 10px;
	font-size: 12px;
	color: #64748b;
}

.project-timeline-card {
	border-radius: 18px;
	border: 1px solid #e5edf4;
	background: linear-gradient(180deg, #ffffff 0%, #f8fbfe 100%);
}

.project-timeline-card :deep(.el-card__body) {
	padding: 16px;
}

.project-timeline__head strong {
	font-size: 14px;
	color: #0f172a;
}

.project-timeline__attachments {
	margin-top: 12px;
}

.project-timeline__attachments-title {
	margin-bottom: 8px;
	font-size: 12px;
	font-weight: 600;
	color: #475569;
}

.project-timeline__attachment-list {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.project-timeline__attachment-preview {
	display: flex;
	flex-direction: column;
	gap: 6px;
	width: 112px;
}

.project-timeline__attachment-image {
	width: 112px;
	height: 112px;
	border-radius: 12px;
	overflow: hidden;
	border: 1px solid #dbe6f0;
	background: #f8fafc;
}

.project-timeline__attachment-name {
	font-size: 12px;
	line-height: 1.5;
	color: #475569;
	word-break: break-all;
}

.project-timeline__attachment-item {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	appearance: none;
	font: inherit;
	padding: 6px 10px;
	border-radius: 999px;
	background: #f1f5f9;
	border: 1px solid #dbe6f0;
	font-size: 12px;
	line-height: 1.4;
	color: #475569;
	cursor: pointer;
	transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.project-timeline__attachment-item:hover {
	color: #0369a1;
	border-color: #7dd3fc;
	background: #f0f9ff;
}

.project-attachment-list {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
}

.project-detail-section__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 12px;
}

.project-attachment-item,
.project-progress-summary {
	padding: 14px 16px;
	border-radius: 16px;
	background: #f8fafc;
	border: 1px solid #e5edf4;
}

.project-attachment-item {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	appearance: none;
	font: inherit;
	text-align: left;
	font-size: 13px;
	color: #334155;
	cursor: pointer;
	transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.project-attachment-item:hover {
	color: #0369a1;
	border-color: #7dd3fc;
	background: #f0f9ff;
}

.project-progress-summary {
	margin-bottom: 16px;
}

.project-progress-field {
	width: 100%;
	padding-right: 16px;
	box-sizing: border-box;
}

.project-progress-field__hint {
	margin-top: 10px;
	font-size: 12px;
	line-height: 1.6;
	color: #64748b;
}
.metrics-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 14px;
}
.metric-card {
	display: flex;
	flex-direction: column;
	height: 100%;
	border: none;
	border-radius: 22px;
	background: linear-gradient(145deg, #ffffff 0%, #f8fbff 100%);
}
.metric-card :deep(.el-card__body) {
	flex: 1;
	display: flex;
	flex-direction: column;
	height: 100%;
	box-sizing: border-box;
	background: linear-gradient(180deg, #f6f9fc 0%, #eef4fa 100%);
}

.metric-card__label {
	font-size: 13px;
	color: #64748b;
}

.metric-card__value {
	margin-top: 12px;
	font-size: 30px;
	font-weight: 700;
	line-height: 1;
	color: #0f172a;
}

.metric-card__hint {
	margin-top: 10px;
	font-size: 12px;
	line-height: 1.6;
	color: #94a3b8;
}
.content-card__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	flex-wrap: wrap;
	font-weight: 600;
	color: #0f172a;
}

.employee-pagination {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 16px;
	flex-wrap: wrap;
}
.module-empty-state__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
	margin-top: 4px;
}
@media (max-width: 1380px) {
	.metrics-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}
@media (max-width: 720px) {
	.metrics-grid {
		grid-template-columns: 1fr;
	}
}

.project-upload-progress {
	display: grid;
	gap: 14px;
	padding: 6px 2px;
}

.project-upload-progress__text {
	color: #334155;
	font-size: 14px;
	line-height: 1.5;
}
</style>
