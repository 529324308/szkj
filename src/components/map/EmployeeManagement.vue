<template>
	<section class="employee-page">
		<el-card shadow="never" class="content-card employee-filter-card">
			<template #header>
				<div class="content-card__header">
					<span>员工筛选</span>
					<div class="employee-filter-actions">
						<el-button type="primary" @click="openCreateEmployeeDialog">新增员工</el-button>
						<el-button v-if="currentRole === ROLE_ENUM.ADMIN" @click="openDepartmentDialog">新增部门</el-button>
						<el-button @click="resetEmployeeFilters">重置筛选</el-button>
					</div>
				</div>
			</template>
			<div class="employee-filter-grid">
				<el-input
					v-model="employeeFilters.keyword"
					clearable
					placeholder="按姓名、电话、邮箱或职位搜索"
				/>
				<el-select
					v-model="employeeFilters.department"
					clearable
					:disabled="currentRole === ROLE_ENUM.MANAGER"
					placeholder="筛选部门"
				>
					<el-option
						v-for="department in employeeDepartmentOptions"
						:key="department"
						:label="department"
						:value="department"
					/>
				</el-select>
				<el-select v-model="employeeFilters.status" clearable placeholder="筛选状态">
					<el-option
						v-for="status in employeeStatusOptions"
						:key="status"
						:label="status"
						:value="status"
					/>
				</el-select>
			</div>
		</el-card>

		<el-card shadow="never" class="content-card employee-table-card">
			<template #header>
				<div class="content-card__header">
					<span>{{ currentRole === ROLE_ENUM.ADMIN ? '员工列表' : '部门员工列表' }}</span>
					<el-tag type="primary" effect="plain">{{ filteredEmployees.length }} 人</el-tag>
				</div>
			</template>
			<div class="employee-table-shell">
				<el-table
					v-if="filteredEmployees.length"
					:data="paginatedEmployees"
					border
					stripe
					height="100%"
					class="employee-table"
				>
					<el-table-column label="头像" width="88" align="center">
						<template #default="{ row }">
							<div class="employee-avatar">{{ row.name.slice(0, 1) }}</div>
						</template>
					</el-table-column>
					<el-table-column prop="name" label="姓名" min-width="110" />
					<el-table-column prop="userName" label="账号" min-width="130" />
					<el-table-column prop="department" label="所属部门" min-width="120" />
					<el-table-column prop="position" label="职位" min-width="140" show-overflow-tooltip />
					<el-table-column prop="phone" label="联系电话" min-width="130" />
					<el-table-column prop="email" label="邮箱" min-width="190" show-overflow-tooltip />
					<el-table-column label="状态" width="100" align="center">
						<template #default="{ row }">
							<el-tag size="small" :type="employeeStatusTagTypeMap[row.status] || 'info'">{{ row.status }}</el-tag>
						</template>
					</el-table-column>
					<el-table-column prop="createdAt" label="创建时间" min-width="170" />
					<el-table-column label="操作" width="180" fixed="right" align="center">
						<template #default="{ row }">
							<div class="employee-row-actions">
								<el-button link type="primary" @click="openEditEmployeeDialog(row)">编辑</el-button>
								<el-popconfirm
									title="确认将该员工设为离职吗？"
									confirm-button-text="确认"
									cancel-button-text="取消"
									:disabled="isProtectedEmployee(row)"
									@confirm="removeEmployee(row)"
								>
									<template #reference>
										<el-button
											link
											type="danger"
											:disabled="isProtectedEmployee(row)"
										>
											离职
										</el-button>
									</template>
								</el-popconfirm>
							</div>
						</template>
					</el-table-column>
				</el-table>
				<div v-else class="module-empty-state">
					<el-empty :image-size="88" description="当前筛选条件下暂无员工数据" />
					<div class="module-empty-state__actions">
						<el-button @click="resetEmployeeFilters">重置筛选</el-button>
						<el-button type="primary" @click="openCreateEmployeeDialog">新增员工</el-button>
					</div>
				</div>
			</div>
			<div class="employee-pagination">
				<div class="employee-pagination__total">共 {{ filteredEmployees.length }} 人</div>
				<el-pagination
					v-model:current-page="employeeTablePage"
					v-model:page-size="employeeTablePageSize"
					background
					layout="prev, pager, next, sizes"
					:page-sizes="[10, 20, 50]"
					:total="filteredEmployees.length"
				/>
			</div>
		</el-card>

		<el-dialog
			v-model="employeeDialogVisible"
			:title="employeeDialogTitle"
			width="640px"
			append-to-body
		>
			<el-form
				ref="employeeFormRef"
				:model="employeeForm"
				:rules="employeeRules"
				label-width="88px"
				@submit.prevent
			>
				<div class="employee-form-grid">
					<el-form-item label="姓名" prop="name">
						<el-input v-model="employeeForm.name" maxlength="20" placeholder="请输入员工姓名" />
					</el-form-item>
					<el-form-item label="电话" prop="phone">
						<el-input v-model="employeeForm.phone" maxlength="11" placeholder="请输入手机号" />
					</el-form-item>
					<el-form-item label="邮箱" prop="email">
						<el-input v-model="employeeForm.email" placeholder="请输入邮箱" />
					</el-form-item>
					<el-form-item label="部门" prop="department">
						<div class="employee-department-field">
							<el-select
								v-model="employeeForm.department"
								placeholder="请选择所属部门"
								:disabled="currentRole === ROLE_ENUM.MANAGER"
							>
								<el-option
									v-for="department in employeeDepartmentOptions"
									:key="department"
									:label="department"
									:value="department"
								/>
							</el-select>
							<el-button
								v-if="currentRole === ROLE_ENUM.ADMIN"
								type="primary"
								plain
								@click="openDepartmentDialog"
							>
								新增部门
							</el-button>
						</div>
					</el-form-item>
					<el-form-item label="职位" prop="position">
						<el-input v-model="employeeForm.position" maxlength="30" placeholder="请输入职位" />
					</el-form-item>
					<el-form-item v-if="currentRole === ROLE_ENUM.ADMIN" label="角色" prop="role">
						<el-select v-model="employeeForm.role" placeholder="请选择角色" @change="handleRoleChange">
							<el-option
								v-for="item in employeeRoleOptions"
								:key="item.value"
								:label="item.label"
								:value="item.value"
							/>
						</el-select>
					</el-form-item>
					<el-form-item label="状态" prop="status">
						<el-select v-model="employeeForm.status" placeholder="请选择状态">
							<el-option
								v-for="status in employeeStatusOptions"
								:key="status"
								:label="status"
								:value="status"
							/>
						</el-select>
					</el-form-item>
					<el-form-item class="employee-form-grid__full" label="平台账号" prop="userName">
						<el-input
							v-model="employeeForm.userName"
							placeholder="姓名填写后将自动生成默认平台账号，可手动调整"
							@input="handleEmployeeUserNameInput"
						/>
					</el-form-item>
					<el-form-item class="employee-form-grid__full" label="平台密码" prop="password">
						<el-input
							v-model="employeeForm.password"
							type="text"
							placeholder="默认密码已生成，可按需调整"
						/>
					</el-form-item>
				</div>
			</el-form>
			<template #footer>
				<div class="dialog-footer">
					<el-button @click="employeeDialogVisible = false">取消</el-button>
					<el-button type="primary" @click="submitEmployeeForm">保存</el-button>
				</div>
			</template>
		</el-dialog>

		<el-dialog
			v-model="departmentDialogVisible"
			title="新增部门"
			width="420px"
			append-to-body
		>
			<el-form ref="departmentFormRef" :model="departmentForm" :rules="departmentRules" label-width="88px" @submit.prevent>
				<el-form-item label="部门名称" prop="name">
					<el-input v-model="departmentForm.name" maxlength="20" placeholder="请输入新部门名称" />
				</el-form-item>
			</el-form>
			<template #footer>
				<div class="dialog-footer">
					<el-button @click="departmentDialogVisible = false">取消</el-button>
					<el-button type="primary" @click="submitDepartmentForm">保存</el-button>
				</div>
			</template>
		</el-dialog>
	</section>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { pinyin } from 'pinyin-pro';
import {
	createDepartment,
	createEmployee,
	updateEmployee,
	getDepartments,
	getEmployees,
} from '../../api/personalCenter';
import {
	employeeRoleOptions,
	employeeStatusOptions,
} from './personal-center/mockData.js';

// 模拟数据的 employees，仅作为兜底本地状态
const employees = ref([]);

const props = defineProps({
	currentRole: {
		type: String,
		required: true,
	},
	currentUser: {
		type: Object,
		required: true,
	},
	apiData: {
		type: Object,
		required: true,
	},
	scopedEmployees: {
		type: Array,
		required: true,
	},
});

const emit = defineEmits([
	'update:apiData',
]);

const ROLE_ENUM = Object.freeze({
	ADMIN: 'admin',
	MANAGER: 'manager',
	EMPLOYEE: 'employee',
});

const employeeStatusTagTypeMap = {
	在职: 'success',
	试用: 'warning',
	离职: 'info',
};

const employeeTablePage = ref(1);
const employeeTablePageSize = ref(10);
const employeeDialogVisible = ref(false);
const employeeDialogMode = ref('create');
const employeeFormRef = ref(null);
const employeeUserNameTouched = ref(false);
const departmentDialogVisible = ref(false);
const departmentFormRef = ref(null);
const employeeFilters = reactive({
	keyword: '',
	department: '',
	status: '',
});
const employeeForm = reactive({
	id: '',
	name: '',
	userName: '',
	phone: '',
	email: '',
	department: '',
	position: '',
	password: 'Qaz!123',
	status: '在职',
	role: 'employee',
	roleName: '员工',
});
const departmentForm = reactive({
	name: '',
});

const employeeRules = {
	name: [
		{ required: true, message: '请输入员工姓名', trigger: 'blur' },
		{ min: 2, max: 20, message: '姓名长度需在 2-20 个字符之间', trigger: 'blur' },
	],
	phone: [
		{ required: true, message: '请输入联系电话', trigger: 'blur' },
		{ pattern: /^1\d{10}$/, message: '请输入正确的手机号格式', trigger: 'blur' },
	],
	email: [
		{ type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] },
	],
	department: [
		{ required: true, message: '请选择所属部门', trigger: 'change' },
	],
	position: [
		{ required: true, message: '请输入职位', trigger: 'blur' },
		{ min: 2, max: 30, message: '职位长度需在 2-30 个字符之间', trigger: 'blur' },
	],
	userName: [
		{
			validator: (_, value, callback) => {
				if (employeeDialogMode.value !== 'create' && !value) {
					callback();
					return;
				}
				if (!value) {
					callback(new Error('请输入账号'));
					return;
				}
				if (!/^[a-z0-9._-]{3,30}$/i.test(String(value))) {
					callback(new Error('账号支持 3-30 位字母、数字、点、下划线或中划线'));
					return;
				}
				callback();
			},
			trigger: 'blur',
		},
	],
	password: [
		{
			validator: (_, value, callback) => {
				if (employeeDialogMode.value !== 'create') {
					callback();
					return;
				}
				if (!value) {
					callback(new Error('新增员工时请输入密码'));
					return;
				}
				if (String(value).length < 6) {
					callback(new Error('密码长度至少 6 位'));
					return;
				}
				callback();
			},
			trigger: 'blur',
		},
	],
};

const departmentRules = {
	name: [
		{ required: true, message: '请输入部门名称', trigger: 'blur' },
		{
			validator: (_, value, callback) => {
				if (!value) {
					callback();
					return;
				}
				if (localDepartments.value.includes(String(value).trim())) {
					callback(new Error('部门名称已存在'));
					return;
				}
				callback();
			},
			trigger: 'blur',
		},
	],
};

const roleTestUserMap = {
	admin: 'admin',
	manager: 'manager',
	employee: 'employee',
};

const _departmentNames = ref([]); // 部门名称列表，用于下拉选项
const localDepartments = ref([]); // 仅用于部门名称存在性校验兜底
const departmentsMap = ref([]); // 完整的部门列表 { id, name }，用于查找 departmentId

const employeeDepartmentOptions = computed(() => {
	if (props.currentRole === ROLE_ENUM.MANAGER) {
		return [props.currentUser.department];
	}
	return _departmentNames.value;
});

const filteredEmployees = computed(() => {
	const keyword = employeeFilters.keyword.trim().toLowerCase();
	return employees.value.filter((item) => {
		const matchesKeyword = !keyword
			|| item.name.toLowerCase().includes(keyword)
			|| item.phone.includes(keyword)
			|| item.email.toLowerCase().includes(keyword)
			|| item.position.toLowerCase().includes(keyword);
		const matchesDepartment = !employeeFilters.department || item.department === employeeFilters.department;
		const matchesStatus = !employeeFilters.status || item.status === employeeFilters.status;
		return matchesKeyword && matchesDepartment && matchesStatus;
	});
});

const paginatedEmployees = computed(() => {
	const start = (employeeTablePage.value - 1) * employeeTablePageSize.value;
	return filteredEmployees.value.slice(start, start + employeeTablePageSize.value);
});

const employeeDialogTitle = computed(() => employeeDialogMode.value === 'create' ? '新增员工' : '编辑员工');

watch(
	() => [employeeFilters.keyword, employeeFilters.department, employeeFilters.status, props.currentRole].join('|'),
	() => {
		employeeTablePage.value = 1;
	}
);

watch(
	() => [employeeForm.name, employeeDialogMode.value].join('|'),
	() => {
		if (employeeDialogMode.value !== 'create') return;
		if (!employeeForm.name.trim()) {
			if (!employeeUserNameTouched.value) {
				employeeForm.userName = '';
			}
			return;
		}
		if (!employeeUserNameTouched.value || !employeeForm.userName) {
			employeeForm.userName = buildEmployeeDefaultUserName(employeeForm.name);
		}
		if (!employeeForm.password) {
			employeeForm.password = 'Qaz!123';
		}
	}
);

watch(
	() => props.currentRole,
	(nextRole) => {
		employeeFilters.department = nextRole === ROLE_ENUM.MANAGER ? props.currentUser.department : '';
		employeeTablePage.value = 1;
	},
	{ immediate: true }
);

function safeGet(value, defaultValue = '') {
	if (value === null || value === undefined) return defaultValue;
	return value;
}

function safeArray(value) {
	if (!Array.isArray(value)) return [];
	return value;
}

function looksLikeIsoDateString(value) {
	if (typeof value !== 'string') return false;
	const normalized = value.trim();
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(normalized);
}

function normalizeApiDateLike(value, { withTime = true } = {}) {
	const raw = String(safeGet(value, '')).trim();
	if (!raw) return '';
	if (!looksLikeIsoDateString(raw)) return raw;
	const [datePart, timePart = ''] = raw.split('T');
	const normalizedTime = timePart.slice(0, 5);
	if (!withTime) return datePart;
	if (!normalizedTime || normalizedTime === '00:00') return datePart;
	return `${datePart} ${normalizedTime}`;
}

async function loadDepartments() {
	try {
		const res = await getDepartments();
		if (res && res.code === 0 && Array.isArray(res.data)) {
			departmentsMap.value = res.data;
			_departmentNames.value = res.data.map(d => d.name);
			localDepartments.value = res.data.map(d => d.name);
		}
	} catch {
		departmentsMap.value = [];
		_departmentNames.value = [];
		localDepartments.value = [];
	}
}

async function loadEmployees() {
	try {
		const res = await getEmployees();
		if (res && res.code === 0 && Array.isArray(res.data?.items)) {
			employees.value = res.data.items.map((item) => ({
				...item,
				createdAt: normalizeApiDateLike(item.createdAt, { withTime: true }),
			}));
		}
	} catch {
		employees.value = [];
	}
}

async function loadAllData() {
	await Promise.all([loadDepartments(), loadEmployees()]);
}

onMounted(() => {
	loadAllData();
});

function openCreateEmployeeDialog() {
	employeeDialogMode.value = 'create';
	resetEmployeeForm();
	employeeDialogVisible.value = true;
}

function openEditEmployeeDialog(employee) {
	employeeDialogMode.value = 'edit';
	resetEmployeeForm();
	Object.assign(employeeForm, {
		id: employee.id,
		name: employee.name,
		userName: employee.userName,
		phone: employee.phone,
		email: employee.email,
		department: employee.department,
		position: employee.position,
		password: '',
		status: employee.status,
		role: employee.role,
		roleName: employee.roleName,
	});
	employeeDialogVisible.value = true;
}

async function submitEmployeeForm() {
	if (!employeeFormRef.value) return;
	await employeeFormRef.value.validate();

	if (employeeDialogMode.value === 'create') {
		let departmentId = '';
		if (props.currentRole === ROLE_ENUM.MANAGER) {
			const dept = departmentsMap.value.find(d => d.name === props.currentUser.department);
			departmentId = dept?.id || '';
		} else {
			const dept = departmentsMap.value.find(d => d.name === employeeForm.department);
			departmentId = dept?.id || '';
		}

		const payload = {
			name: employeeForm.name.trim(),
			userName: employeeForm.userName.trim(),
			password: employeeForm.password || 'Qaz!123',
			phone: employeeForm.phone.trim(),
			email: employeeForm.email.trim(),
			departmentId,
			position: employeeForm.position.trim(),
			status: employeeForm.status,
			role: employeeForm.role,
			roleName: employeeForm.roleName,
		};

		try {
			const res = await createEmployee(payload);
			if (res && res.code === 0 && res.data) {
				const newEmployee = {
					id: safeGet(res.data.id),
					userName: safeGet(res.data.userName, employeeForm.userName.trim()),
					name: safeGet(res.data.name, employeeForm.name.trim()),
					role: safeGet(res.data.role, ROLE_ENUM.EMPLOYEE),
					roleName: safeGet(res.data.roleName),
					departmentId: safeGet(res.data.departmentId),
					department: safeGet(res.data.department, props.currentRole === ROLE_ENUM.MANAGER ? props.currentUser.department : employeeForm.department),
					position: safeGet(res.data.position, employeeForm.position.trim()),
					phone: safeGet(res.data.phone, employeeForm.phone.trim()),
					email: safeGet(res.data.email, employeeForm.email.trim()),
					status: safeGet(res.data.status, employeeForm.status),
					createdAt: normalizeApiDateLike(safeGet(res.data.createdAt, new Date().toISOString()), { withTime: true }),
				};
				employees.value.unshift(newEmployee);
				ElMessage.success('员工新增成功');
			} else {
				ElMessage.error(res?.message || '员工新增失败');
			}
		} catch (err) {
			ElMessage.error(err?.message || '员工新增失败');
		}
	} else {
		let departmentId = '';
		if (props.currentRole === ROLE_ENUM.MANAGER) {
			const dept = departmentsMap.value.find(d => d.name === props.currentUser.department);
			departmentId = dept?.id || '';
		} else {
			const dept = departmentsMap.value.find(d => d.name === employeeForm.department);
			departmentId = dept?.id || '';
		}

		const payload = {
			name: employeeForm.name.trim(),
			phone: employeeForm.phone.trim(),
			email: employeeForm.email.trim(),
			departmentId,
			position: employeeForm.position.trim(),
			status: employeeForm.status,
			role: employeeForm.role,
			roleName: employeeForm.roleName,
		};

		try {
			const res = await updateEmployee(employeeForm.id, payload);
			if (res && res.code === 0 && res.data) {
				const target = employees.value.find((item) => item.id === employeeForm.id);
				if (target) {
					Object.assign(target, {
						name: safeGet(res.data.name, employeeForm.name.trim()),
						phone: safeGet(res.data.phone, employeeForm.phone.trim()),
						email: safeGet(res.data.email, employeeForm.email.trim()),
						department: safeGet(res.data.department, props.currentRole === ROLE_ENUM.MANAGER ? props.currentUser.department : employeeForm.department),
						position: safeGet(res.data.position, employeeForm.position.trim()),
						status: safeGet(res.data.status, employeeForm.status),
						role: safeGet(res.data.role, employeeForm.role),
						roleName: safeGet(res.data.roleName, employeeForm.roleName),
					});
				}
				ElMessage.success('员工信息已更新');
			} else {
				const target = employees.value.find((item) => item.id === employeeForm.id);
				if (target) {
					Object.assign(target, {
						name: employeeForm.name.trim(),
						phone: employeeForm.phone.trim(),
						email: employeeForm.email.trim(),
						department: props.currentRole === ROLE_ENUM.MANAGER ? props.currentUser.department : employeeForm.department,
						position: employeeForm.position.trim(),
						status: employeeForm.status,
						role: employeeForm.role,
						roleName: employeeForm.roleName,
					});
				}
				ElMessage.success('员工信息已更新（本地）');
			}
		} catch {
			const target = employees.value.find((item) => item.id === employeeForm.id);
			if (target) {
				Object.assign(target, {
					name: employeeForm.name.trim(),
					phone: employeeForm.phone.trim(),
					email: employeeForm.email.trim(),
					department: props.currentRole === ROLE_ENUM.MANAGER ? props.currentUser.department : employeeForm.department,
					position: employeeForm.position.trim(),
					status: employeeForm.status,
				});
			}
			ElMessage.success('员工信息已更新（本地）');
		}
	}
	employeeDialogVisible.value = false;
	resetEmployeeForm();
}

async function submitDepartmentForm() {
	if (!departmentFormRef.value) return;
	await departmentFormRef.value.validate();
	const nextDepartmentName = departmentForm.name.trim();
	if (!nextDepartmentName) return;

	const payload = {
		name: nextDepartmentName,
	};

		try {
			const res = await createDepartment(payload);
			if (res && res.code === 0 && res.data) {
				const newDept = {
					id: safeGet(res.data.id),
					name: safeGet(res.data.name, nextDepartmentName),
					employeeCount: Number(res.data.employeeCount) || 0,
					managerId: safeGet(res.data.managerId),
					managerName: safeGet(res.data.managerName),
				};
				departmentsMap.value = [...departmentsMap.value, newDept];
				_departmentNames.value = [..._departmentNames.value, newDept.name];
				localDepartments.value = [...localDepartments.value, newDept.name];
			} else {
				_departmentNames.value = [..._departmentNames.value, nextDepartmentName];
				localDepartments.value = [...localDepartments.value, nextDepartmentName];
			}
		} catch {
			_departmentNames.value = [..._departmentNames.value, nextDepartmentName];
			localDepartments.value = [...localDepartments.value, nextDepartmentName];
		}

	if (!employeeForm.department) {
		employeeForm.department = nextDepartmentName;
	}
	departmentDialogVisible.value = false;
	departmentForm.name = '';
	ElMessage.success('部门新增成功');
}

async function removeEmployee(employee) {
	if (isProtectedEmployee(employee)) return;

	try {
		const payload = {
			name: employee.name,
			phone: employee.phone,
			email: employee.email,
			departmentId: employee.departmentId,
			position: employee.position,
			status: '离职',
			role: employee.role,
			roleName: employee.roleName,
		};
		const res = await updateEmployee(employee.id, payload);
		if (res && res.code !== 0) {
			ElMessage.error(res?.message || '操作失败，请重试');
			return;
		}
		await loadEmployees();
		ElMessage.success('员工已离职');
	} catch (err) {
		ElMessage.error(err?.message || '操作失败，请重试');
	}
}

function isProtectedEmployee(employee) {
	return Object.values(roleTestUserMap).includes(employee.userName) || employee.role !== ROLE_ENUM.EMPLOYEE;
}

function resetEmployeeForm() {
	employeeUserNameTouched.value = false;
	Object.assign(employeeForm, {
		id: '',
		name: '',
		userName: '',
		phone: '',
		email: '',
		department: props.currentRole === ROLE_ENUM.MANAGER ? props.currentUser.department : '',
		position: '',
		password: 'Qaz!123',
		status: '在职',
		role: 'employee',
		roleName: '员工',
	});
	nextTick(() => {
		employeeFormRef.value?.clearValidate();
	});
}

function resetEmployeeFilters() {
	employeeFilters.keyword = '';
	employeeFilters.status = '';
	employeeFilters.department = props.currentRole === ROLE_ENUM.MANAGER ? props.currentUser.department : '';
}

function createEmployeeId() {
	const maxId = employees.reduce((max, item) => {
		const numeric = Number(String(item.id).replace('emp-', ''));
		return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
	}, 0);
	return `emp-${String(maxId + 1).padStart(3, '0')}`;
}

function createEmployeeUserName(name) {
	const base = String(name || 'staff').trim().toLowerCase() || 'staff';
	return `${base.replace(/\s+/g, '')}.${Date.now().toString().slice(-4)}`;
}

function handleEmployeeUserNameInput() {
	employeeUserNameTouched.value = true;
	employeeForm.userName = String(employeeForm.userName || '').replace(/\s+/g, '').toLowerCase();
}

function handleRoleChange(value) {
	const selected = employeeRoleOptions.find(item => item.value === value);
	employeeForm.roleName = selected ? selected.label : '';
}

function buildEmployeeDefaultUserName(name) {
	const normalized = String(name || '').trim();
	if (!normalized) return '';
	const transliterated = pinyin(normalized, {
		toneType: 'none',
		type: 'array',
		nonZh: 'consecutive',
	})
		.join('')
		.replace(/[^a-z0-9._-]/gi, '')
		.toLowerCase();
	return transliterated || createEmployeeUserName(normalized);
}

function openDepartmentDialog() {
	departmentDialogVisible.value = true;
}
</script>

<style scoped>
.employee-page {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: 14px;
	min-height: 0;
	height: 100%;
}

.employee-filter-card :deep(.el-card__body) {
	padding-top: 18px;
}

.employee-filter-actions {
	display: inline-flex;
	gap: 10px;
	flex-wrap: wrap;
}

.employee-filter-grid {
	display: grid;
	grid-template-columns: 2fr 1fr 1fr;
	gap: 12px;
}

.employee-department-field {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 10px;
	width: 100%;
}

.employee-table-card {
	flex: 1;
	min-height: 0;
}

.employee-table-card :deep(.el-card__body) {
	min-height: 0;
}

.employee-table-shell {
	flex: 1;
	min-height: 0;
	height: 100%;
}

.employee-table {
	width: 100%;
}

.employee-table :deep(.el-table__inner-wrapper) {
	height: 100%;
}

.employee-pagination {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 16px;
	flex-wrap: wrap;
}

.employee-pagination__total {
	font-size: 13px;
	color: #64748b;
}

.employee-avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 14px;
	background: linear-gradient(135deg, #14b8a6 0%, #38bdf8 100%);
	color: #ffffff;
	font-size: 16px;
	font-weight: 700;
}

.employee-row-actions {
	display: inline-flex;
	align-items: center;
	gap: 8px;
}

.employee-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 4px 14px;
}

.employee-form-grid__full {
	grid-column: 1 / -1;
}

@media (max-width: 768px) {
	.employee-filter-grid,
	.employee-form-grid {
		grid-template-columns: 1fr;
	}

	.employee-department-field {
		grid-template-columns: 1fr;
	}
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
.module-empty-state__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
	margin-top: 4px;
}


</style>
