import axios from 'axios';
import { request } from './request';

const API_BASE_URL = 'https://www.zjshuzhi.cn:8090';

/**
 * 管理中心接口封装
 */

// ==================== 公共接口 ====================

/**
 * 获取当前登录用户与权限
 */
export async function getCurrentUser() {
	return request('/api/PersonalCenter/current-user');
}

/**
 * 获取管理中心基础字典
 */
export async function getOptions() {
	return request('/api/PersonalCenter/options');
}

/**
 * 上传附件
 * @param {FormData} formData - 包含 bizType, bizId, files
 */
export async function uploadFiles(formData) {
	return request('/api/PersonalCenter/files', {
		method: 'POST',
		body: formData,
		headers: {}, // 让 request 处理 Content-Type
	});
}

export async function uploadFilesWithProgress(formData, onUploadProgress) {
	const accessToken = localStorage.getItem('accessToken');
	const response = await axios.post(`${API_BASE_URL}/api/PersonalCenter/files`, formData, {
		headers: {
			...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
		},
		onUploadProgress,
	});
	return response.data;
}

function getAuthHeaders() {
	const accessToken = localStorage.getItem('accessToken');
	return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function parseDownloadFileName(contentDisposition, fallbackName) {
	const raw = String(contentDisposition || '');
	const utf8Match = raw.match(/filename\*=UTF-8''([^;]+)/i);
	if (utf8Match?.[1]) {
		try {
			return decodeURIComponent(utf8Match[1]);
		} catch {
			return utf8Match[1];
		}
	}
	const normalMatch = raw.match(/filename="?([^";]+)"?/i);
	return normalMatch?.[1] || fallbackName;
}

function resolveApiUrl(url) {
	const normalized = String(url || '').trim();
	if (!normalized) return '';
	if (/^https?:\/\//i.test(normalized)) return normalized;
	return `${API_BASE_URL}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

/**
 * 下载附件
 * @param {string} fileId - 附件ID
 */
export function getFileDownloadUrl(fileId) {
	return `${API_BASE_URL}/api/PersonalCenter/files/${fileId}/download`;
}

export async function downloadFile(fileId) {
	const response = await axios.get(`${API_BASE_URL}/api/PersonalCenter/files/${fileId}/download`, {
		headers: {
			...getAuthHeaders(),
		},
		responseType: 'blob',
	});
	return {
		blob: response.data,
		fileName: parseDownloadFileName(response.headers?.['content-disposition'], `file-${fileId}`),
	};
}

// ==================== 管理中心概览 ====================

/**
 * 获取管理中心概览数据
 * @param {object} params - { range, trendMode }
 */
export async function getOverview(params = {}) {
	return request('/api/PersonalCenter/overview', { params });
}

/**
 * 获取重点关注状态
 */
export async function getFocusState() {
	return request('/api/PersonalCenter/focus-state');
}

/**
 * 更新重点关注状态
 * @param {object} data - { upcomingProjectIds, adminProgressFeedIds }
 */
export async function updateFocusState(data) {
	return request('/api/PersonalCenter/focus-state', {
		method: 'PUT',
		body: JSON.stringify(data),
	});
}

// ==================== 员工管理页 ====================

/**
 * 获取部门列表
 * @param {object} params - { keyword }
 */
export async function getDepartments(params = {}) {
	return request('/api/PersonalCenter/departments', { params });
}

/**
 * 新增部门
 * @param {object} data - { name, managerId }
 */
export async function createDepartment(data) {
	return request('/api/PersonalCenter/departments', {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

/**
 * 员工列表
 * @param {object} params - { keyword, departmentId, status, pageIndex, pageSize }
 */
export async function getEmployees(params = {}) {
	return request('/api/PersonalCenter/employees', { params });
}

/**
 * 新增员工
 * @param {object} data - { name, userName, password, phone, email, departmentId, position, status }
 */
export async function createEmployee(data) {
	return request('/api/PersonalCenter/employees', {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

/**
 * 编辑员工
 * @param {string} employeeId - 员工ID
 * @param {object} data - { name, phone, email, departmentId, position, status }
 */
export async function updateEmployee(employeeId, data) {
	return request(`/api/PersonalCenter/employees/${employeeId}`, {
		method: 'PUT',
		body: JSON.stringify(data),
	});
}

/**
 * 删除员工
 * @param {string} employeeId - 员工ID
 */
export async function deleteEmployee(employeeId) {
	return request(`/api/PersonalCenter/employees/${employeeId}`, {
		method: 'DELETE',
	});
}

/**
 * 根据部门获取可选执行人
 * @param {string} departmentId - 部门ID
 * @param {object} params - { keyword }
 */
export async function getDepartmentExecutors(departmentId, params = {}) {
	return request(`/api/PersonalCenter/departments/${departmentId}/executors`, { params });
}

// ==================== 项目管理页 ====================

/**
 * 项目列表
 * @param {object} params - { keyword, status, priority, progressMin, departmentId, deadlineStart, deadlineEnd, pageIndex, pageSize }
 */
export async function getProjects(params = {}) {
	return request('/api/PersonalCenter/projects', { params });
}

/**
 * 项目详情
 * @param {string} projectId - 项目ID
 */
export async function getProject(projectId) {
	return request(`/api/PersonalCenter/projects/${projectId}`);
}

/**
 * 下发项目
 * @param {object} data - { departmentId, customerName, customerContact, projectName, projectDesc, executorId, deadline, priority, attachmentIds }
 */
export async function createProject(data) {
	return request('/api/PersonalCenter/projects', {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

/**
 * 提交项目进度
 * @param {string} projectId - 项目ID
 * @param {object} data - { stageKey, progress, content, attachmentIds }
 */
export async function submitProjectProgress(projectId, data) {
	return request(`/api/PersonalCenter/projects/${projectId}/progress`, {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

/**
 * 管理员审核通过项目
 * @param {string} projectId - 项目ID
 * @param {object} data - { comment }
 */
export async function approveProject(projectId, data = {}) {
	return request(`/api/PersonalCenter/projects/${projectId}/approve`, {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

/**
 * 管理员驳回项目
 * @param {string} projectId - 项目ID
 * @param {object} data - { reason }
 */
export async function rejectProject(projectId, data) {
	return request(`/api/PersonalCenter/projects/${projectId}/reject`, {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

/**
 * 下载项目全部附件
 * @param {string} projectId - 项目ID
 */
export function getProjectAttachmentsDownloadUrl(projectId) {
	return `${API_BASE_URL}/api/PersonalCenter/projects/${projectId}/attachments/download-all`;
}

export async function downloadProjectAttachments(projectId) {
	const response = await axios.get(`${API_BASE_URL}/api/PersonalCenter/projects/${projectId}/attachments/download-all`, {
		headers: {
			...getAuthHeaders(),
		},
		responseType: 'blob',
	});
	return {
		blob: response.data,
		fileName: parseDownloadFileName(response.headers?.['content-disposition'], `project-${projectId}-attachments.zip`),
	};
}

// ==================== 日报管理页 ====================

/**
 * 日报列表
 * @param {object} params - { keyword, status, departmentId, startDate, endDate, pageIndex, pageSize }
 */
export async function getReports(params = {}) {
	return request('/api/PersonalCenter/reports', { params });
}

/**
 * 日报详情
 * @param {string} reportId - 日报ID
 */
export async function getReport(reportId) {
	return request(`/api/PersonalCenter/reports/${reportId}`);
}

/**
 * 写日报
 * @param {object} data - { date, title, relatedProjectId, workContent, tomorrowPlan, problems, attachmentIds }
 */
export async function createReport(data) {
	return request('/api/PersonalCenter/reports', {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

/**
 * 获取可关联项目
 * @param {object} params - { keyword }
 */
export async function deleteReport(reportId) {
	return request(`/api/PersonalCenter/reports/delete/${reportId}`, {
		method: 'DELETE',
	});
}

export async function getReportProjectOptions(params = {}) {
	return request('/api/PersonalCenter/reports/project-options', { params });
}

/**
 * 主管批注日报
 * @param {string} reportId - 日报ID
 * @param {object} data - { leaderComment, score }
 */
export async function commentReport(reportId, data) {
	return request(`/api/PersonalCenter/reports/${reportId}/comment`, {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

/**
 * 下载日报全部附件
 * @param {string} reportId - 日报ID
 */
export function getReportAttachmentsDownloadUrl(reportId) {
	return `${API_BASE_URL}/api/PersonalCenter/reports/${reportId}/attachments/download-all`;
}

export async function downloadReportAttachments(reportId) {
	const response = await axios.get(`${API_BASE_URL}/api/PersonalCenter/reports/${reportId}/attachments/download-all`, {
		headers: {
			...getAuthHeaders(),
		},
		responseType: 'blob',
	});
	return {
		blob: response.data,
		fileName: parseDownloadFileName(response.headers?.['content-disposition'], `report-${reportId}-attachments.zip`),
	};
}

export function resolveAttachmentUrl(url, fileId) {
	return resolveApiUrl(url) || getFileDownloadUrl(fileId);
}

// ==================== 个人设置页 ====================

/**
 * 获取个人设置
 */
export async function getSettings() {
	return request('/api/PersonalCenter/settings');
}

/**
 * 保存个人联系方式
 * @param {object} data - { phone, email }
 */
export async function updateSettings(data) {
	return request('/api/PersonalCenter/settings', {
		method: 'PUT',
		body: JSON.stringify(data),
	});
}

/**
 * 上传/更换头像（使用 2.3 公共上传接口）
 * @param {File} file - 头像文件
 * @param {string} userId - 用户ID
 */
export async function uploadAvatar(file, userId) {
	const formData = new FormData();
	formData.append('bizType', 'avatar');
	formData.append('bizId', userId);
	formData.append('files', file);
	return request('/api/PersonalCenter/files', {
		method: 'POST',
		body: formData,
	});
}

/**
 * 恢复默认头像
 */
export async function deleteAvatar() {
	return request('/api/PersonalCenter/settings/avatar', {
		method: 'DELETE',
	});
}
