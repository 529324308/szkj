//接口接入后模拟数据需要删除，不要降级使用。模拟数据仅用于前端开发调试。

import { reactive } from 'vue';

export const PROJECT_STAGE_DEFINITIONS = Object.freeze([
	{ key: 'task_issued', label: '任务下发', min: 0, max: 0, fixedProgress: 0, selectable: false },
	{ key: 'contract_signed', label: '合同签订', min: 10, max: 10, fixedProgress: 10, selectable: true },
	{ key: 'task_execution', label: '任务执行中', min: 10, max: 80, selectable: true },
	{ key: 'invoice_completed', label: '开票完成', min: 90, max: 90, fixedProgress: 90, selectable: true },
	{ key: 'prepayment_invoice', label: '预付款开票', min: 85, max: 85, fixedProgress: 85, selectable: true },
	{ key: 'prepayment_received', label: '预付款回款', min: 90, max: 90, fixedProgress: 90, selectable: true },
	{ key: 'final_invoice_completed', label: '开票完成', min: 95, max: 95, fixedProgress: 95, selectable: true },
	{ key: 'payment_received', label: '回款完成', min: 100, max: 100, fixedProgress: 100, selectable: true },
]);

export const departments = reactive([]);

export const employees = reactive([]);

export const projects = reactive([]);

export const reports = reactive([]);

export const roleSwitchOptions = reactive([
	{ value: 'admin', label: '管理员' },
	{ value: 'manager', label: '部门主管' },
	{ value: 'employee', label: '员工' },
]);

export const roleTestUserMap = Object.freeze({
	admin: 'admin',
	manager: 'manager.survey',	
	employee: 'staff.li',
});

export const overviewRangeOptions = [
	{ value: '7d', label: '近 7 天' },
	{ value: '30d', label: '近 30 天' },
	{ value: 'month', label: '本月' },
];

export const employeeStatusOptions = ['在职', '试用', '离职'];
export const employeeRoleOptions = [
	{ value: 'admin', label: '管理员' },
	{ value: 'manager', label: '部门主管' },
	{ value: 'employee', label: '员工' },
];
export const projectStatusOptions = ['待审核', '进行中', '已完成'];
export const projectPriorityOptions = ['高', '中', '低'];
export const reportStatusOptions = ['已提交', '已批注'];
export const reportScoreOptions = ['优', '良', '需跟进'];
export const projectProgressFilterOptions = [
	{ label: '已完成 0%', value: 10 },
	{ label: '已完成 20%', value: 30 },
	{ label: '已完成 40%', value: 50 },
	{ label: '已完成 60%', value: 70 },
	{ label: '已完成 80%', value: 90 },
	{ label: '已完成 100%', value: 100 },
];