import { reactive, ref } from 'vue';

export function createPersonalCenterForm() {
	const employeeTablePage = ref(1);
	const employeeTablePageSize = ref(10);
	const employeeDialogVisible = ref(false);
	const employeeDialogMode = ref('create');
	const employeeFormRef = ref(null);
	const employeeUserNameTouched = ref(false);
	const departmentDialogVisible = ref(false);
	const departmentFormRef = ref(null);
	const projectTablePage = ref(1);
	const projectTablePageSize = ref(10);
	const projectDetailVisible = ref(false);
	const projectFormVisible = ref(false);
	const projectProgressVisible = ref(false);
	const reportTablePage = ref(1);
	const reportTablePageSize = ref(10);
	const reportDetailVisible = ref(false);
	const reportFormVisible = ref(false);
	const reportCommentVisible = ref(false);
	const projectFormRef = ref(null);
	const projectProgressFormRef = ref(null);
	const reportFormRef = ref(null);
	const reportCommentFormRef = ref(null);
	const settingsFormRef = ref(null);
	const activeProjectId = ref('');
	const activeReportId = ref('');
	const settingsAvatarState = reactive({});

	const employeeFilters = reactive({
		keyword: '',
		department: '',
		status: '',
	});
	const projectFilters = reactive({
		keyword: '',
		status: '',
		priority: '',
		progress: '',
		department: '',
	});
	const reportFilters = reactive({
		keyword: '',
		status: '',
		department: '',
		dateRange: [],
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
	});
	const departmentForm = reactive({
		name: '',
	});
	const projectForm = reactive({
		department: '',
		customerName: '',
		customerContact: '',
		projectName: '',
		projectDesc: '',
		executor: '',
		deadline: '',
		priority: '中',
		attachmentFiles: [],
	});
	const projectProgressForm = reactive({
		projectId: '',
		stageKey: '',
		progress: 0,
		content: '',
		attachmentFiles: [],
	});
	const reportForm = reactive({
		id: '',
		date: '',
		title: '',
		relatedProjectId: '',
		workContent: '',
		tomorrowPlan: '',
		problems: '',
		attachmentFiles: [],
	});
	const reportCommentForm = reactive({
		leaderComment: '',
		score: '',
	});
	const settingsForm = reactive({
		phone: '',
		email: '',
	});

	const employeeStatusOptions = ['在职', '试用', '离职'];
	const projectStatusOptions = ['待审核', '进行中', '已完成'];
	const projectPriorityOptions = ['高', '中', '低'];
	const reportStatusOptions = ['已提交', '已批注'];
	const reportScoreOptions = ['优', '良', '需跟进'];
	const projectProgressFilterOptions = [
		{ label: '已完成 0%', value: 10 },
		{ label: '已完成 20%', value: 30 },
		{ label: '已完成 40%', value: 50 },
		{ label: '已完成 60%', value: 70 },
		{ label: '已完成 80%', value: 90 },
		{ label: '已完成 100%', value: 100 },
	];

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
					if (departments.includes(String(value).trim())) {
						callback(new Error('部门名称已存在'));
						return;
					}
					callback();
				},
				trigger: 'blur',
			},
		],
	};

	const projectRules = {
		department: [
			{ required: true, message: '请选择所属部门', trigger: 'change' },
		],
		customerName: [
			{ required: true, message: '请输入客户名称', trigger: 'blur' },
		],
		customerContact: [
			{ required: true, message: '请输入客户联系方式', trigger: 'blur' },
		],
		projectName: [
			{ required: true, message: '请输入项目名称', trigger: 'blur' },
		],
		projectDesc: [
			{ required: true, message: '请输入项目描述', trigger: 'blur' },
		],
		executor: [
			{ required: true, message: '请选择执行人', trigger: 'change' },
		],
		deadline: [
			{ required: true, message: '请选择截止日期', trigger: 'change' },
		],
		priority: [
			{ required: true, message: '请选择优先级', trigger: 'change' },
		],
	};

	const reportRules = {
		date: [
			{ required: true, message: '请选择日报日期', trigger: 'change' },
		],
		workContent: [
			{ required: true, message: '请输入今日工作内容', trigger: 'blur' },
		],
		tomorrowPlan: [
			{ required: true, message: '请输入明日计划', trigger: 'blur' },
		],
	};
	const reportCommentRules = {
		leaderComment: [
			{ required: true, message: '请填写批注内容', trigger: 'blur' },
		],
	};
	const settingsRules = {
		phone: [
			{ required: true, message: '请输入手机号', trigger: 'blur' },
			{ pattern: /^1\d{10}$/, message: '请输入正确的手机号格式', trigger: 'blur' },
		],
		email: [
			{ required: true, message: '请输入邮箱', trigger: 'blur' },
			{ type: 'email', message: '请输入正确的邮箱格式', trigger: ['blur', 'change'] },
		],
	};

	const projectProgressRules = {
		stageKey: [
			{ required: true, message: '请选择固定节点', trigger: 'change' },
		],
		progress: [
			{
				validator: (_, value, callback) => {
					if (!projectProgressForm.stageKey) {
						callback(new Error('请先选择固定节点'));
						return;
					}
					if (value === '' || value === null || value === undefined) {
						callback(new Error('请填写项目进度'));
						return;
					}
					callback();
				},
				trigger: 'change',
			},
		],
		content: [
			{ required: true, message: '请输入进度说明', trigger: 'blur' },
		],
	};

	return {
		employeeTablePage,
		employeeTablePageSize,
		employeeDialogVisible,
		employeeDialogMode,
		employeeFormRef,
		employeeUserNameTouched,
		departmentDialogVisible,
		departmentFormRef,
		projectTablePage,
		projectTablePageSize,
		projectDetailVisible,
		projectFormVisible,
		projectProgressVisible,
		reportTablePage,
		reportTablePageSize,
		reportDetailVisible,
		reportFormVisible,
		reportCommentVisible,
		projectFormRef,
		projectProgressFormRef,
		reportFormRef,
		reportCommentFormRef,
		settingsFormRef,
		activeProjectId,
		activeReportId,
		settingsAvatarState,
		employeeFilters,
		projectFilters,
		reportFilters,
		employeeForm,
		departmentForm,
		projectForm,
		projectProgressForm,
		reportForm,
		reportCommentForm,
		settingsForm,
		employeeStatusOptions,
		projectStatusOptions,
		projectPriorityOptions,
		reportStatusOptions,
		reportScoreOptions,
		projectProgressFilterOptions,
		employeeRules,
		departmentRules,
		projectRules,
		reportRules,
		reportCommentRules,
		settingsRules,
		projectProgressRules,
	};
}
