<template>
	<div v-if="active" class="personal-center">
		<div class="personal-center__shell">
			<aside class="personal-center__aside">
				<div class="brand-panel">
					<div class="brand-panel__eyebrow">Profile Workspace</div>
					<h2 class="brand-panel__title">管理中心</h2>
				</div>

				<el-card shadow="never" class="user-summary-card">
					<div class="user-summary">
						<div class="user-summary__avatar">
							<img v-if="currentUserAvatar" :src="currentUserAvatar" alt="用户头像" class="user-summary__avatar-image" />
							<template v-else>{{ currentUser.name.slice(0, 1) }}</template>
						</div>
						<div class="user-summary__meta">
							<div class="user-summary__name">{{ currentUser.name }}</div>
							<!-- <div class="user-summary__info">{{ currentUser.department }} / {{ currentUser.position }}</div> -->
						</div>
					</div>
					<div class="user-summary__tags">
						<el-tag type="primary" effect="light">{{ roleLabelMap[currentRole] }}</el-tag>
						<el-tag effect="plain">{{ currentUser.status }}</el-tag>
					</div>
					<div class="user-summary__account">登录账号：{{ currentLoginName }}</div>
				</el-card>

				<el-menu
					:default-active="activeSection"
					class="section-menu"
					@select="handleSectionSelect"
				>
					<el-menu-item
						v-for="item in visibleSections"
						:key="item.key"
						:index="item.key"
					>
						<el-icon><component :is="item.icon" /></el-icon>
						<span>{{ item.label }}</span>
					</el-menu-item>
				</el-menu>
			</aside>

			<section class="personal-center__main">
				<header class="page-header">
					<div>
						<div class="page-header__eyebrow">Mock Workspace</div>
						<h3 class="page-header__title">{{ currentSection.label }}</h3>
						<p class="page-header__desc">{{ currentSection.description }}</p>
					</div>
					<div class="page-header__actions">
						<el-tag type="success" effect="dark">模拟数据</el-tag>
						<el-tag effect="plain">单文件实现</el-tag>
					</div>
				</header>

				<el-scrollbar class="page-scroll">
					<div :class="['page-content', { 'page-content--fill': ['employees', 'projects', 'reports', 'settings'].includes(activeSection) }]">
						<template v-if="sectionLoading">
							<section class="section-loading-shell">
								<div class="section-loading-grid">
									<el-skeleton v-for="index in 4" :key="`metric-${index}`" animated class="section-loading-card">
										<template #template>
											<el-skeleton-item variant="rect" class="section-loading-card__rect" />
										</template>
									</el-skeleton>
								</div>
								<el-skeleton animated class="section-loading-panel">
									<template #template>
										<el-skeleton-item variant="rect" class="section-loading-panel__rect section-loading-panel__rect--lg" />
									</template>
								</el-skeleton>
								<div class="section-loading-grid section-loading-grid--secondary">
									<el-skeleton v-for="index in 3" :key="`panel-${index}`" animated class="section-loading-card">
										<template #template>
											<el-skeleton-item variant="rect" class="section-loading-card__rect section-loading-card__rect--md" />
										</template>
									</el-skeleton>
								</div>
							</section>
						</template>

						<template v-else-if="activeSection === 'overview'">
							<section class="overview-toolbar">
								<div class="overview-toolbar__copy">
									<div class="overview-toolbar__title">{{ currentRoleSummary }}总览</div>
									<div class="overview-toolbar__desc">
										统计基于当前测试角色实时切换，当前基准日期为 {{ dashboardTodayLabel }}。
									</div>
								</div>
								<el-radio-group v-model="overviewRange" size="small" class="overview-range-switch">
									<el-radio-button
										v-for="option in overviewRangeOptions"
										:key="option.value"
										:value="option.value"
									>
										{{ option.label }}
									</el-radio-button>
								</el-radio-group>
							</section>

							<section class="metrics-grid">
								<el-card
									v-for="card in overviewSummaryCards"
									:key="card.key"
									shadow="hover"
									class="metric-card"
								>
									<div class="metric-card__label">{{ card.label }}</div>
									<div class="metric-card__value">{{ card.value }}</div>
									<div class="metric-card__hint">{{ card.hint }}</div>
								</el-card>
							</section>

							<section class="overview-main-grid">
								<el-card shadow="never" class="content-card">
									<template #header>
										<div class="content-card__header">
											<span>项目状态分布</span>
											<el-tag size="small" effect="plain">{{ scopedProjects.length }} 个项目</el-tag>
										</div>
									</template>
									<div class="status-distribution">
										<div class="status-distribution__chart">
											<div ref="projectStatusChartRef" class="echart-panel echart-panel--lg"></div>
										</div>
										<div class="status-distribution__aside">
											<div class="mini-stat">
												<div class="mini-stat__label">即将到期</div>
												<div class="mini-stat__value">{{ upcomingProjects.length }}</div>
												<div class="mini-stat__hint">未来 7 天内需关注的项目</div>
											</div>
											<div class="mini-stat">
												<div class="mini-stat__label">平均进度</div>
												<div class="mini-stat__value">{{ averageProjectProgress }}%</div>
												<div class="mini-stat__hint">基于当前角色可见项目计算</div>
											</div>
										</div>
									</div>
								</el-card>

								<el-card shadow="never" class="content-card">
									<template #header>
										<div class="content-card__header">
											<span>项目趋势分析</span>
											<el-radio-group v-model="projectTrendMode" size="small" class="trend-mode-switch">
												<el-radio-button value="new">新增项目趋势</el-radio-button>
												<el-radio-button value="progress">项目推进趋势</el-radio-button>
											</el-radio-group>
										</div>
									</template>
									<div class="trend-card">
										<div ref="projectTrendChartRef" class="echart-panel echart-panel--md-lg"></div>
										<div class="trend-card__hint">{{ projectTrendDescription }}</div>
									</div>
								</el-card>

								<el-card shadow="never" class="content-card">
									<template #header>
										<div class="content-card__header">
											<span>{{ currentRole === ROLE_ENUM.EMPLOYEE ? '我的日报情况' : '日报提交率' }}</span>
											<el-tag size="small" type="success" effect="plain">{{ overviewRangeLabel }}</el-tag>
										</div>
									</template>
									<div v-if="currentRole !== ROLE_ENUM.EMPLOYEE" class="report-rate-panel">
										<div ref="reportRateChartRef" class="echart-panel echart-panel--sm"></div>
										<div class="report-rate-panel__stats">
											<div class="report-rate-row">
												<span>今日已提交</span>
												<strong>{{ todaySubmittedReportsCount }} / {{ scopedEmployees.length }}</strong>
											</div>
											<div class="report-rate-row">
												<span>未提交</span>
												<strong>{{ Math.max(scopedEmployees.length - todaySubmittedReportsCount, 0) }}</strong>
											</div>
											<div class="report-rate-row">
												<span>近周期日报</span>
												<strong>{{ reportsInRange.length }} 条</strong>
											</div>
										</div>
									</div>
									<div v-else class="personal-report-panel">
										<div ref="personalReportChartRef" class="echart-panel echart-panel--md"></div>
										<div class="personal-report-grid">
											<div class="personal-report-item">
												<span>已提交天数</span>
												<strong>{{ personalReportStats.submittedDays }}</strong>
											</div>
											<div class="personal-report-item">
												<span>待提交天数</span>
												<strong>{{ personalReportStats.pendingDays }}</strong>
											</div>
											<div class="personal-report-item">
												<span>今日状态</span>
												<strong>{{ personalReportStats.todayStatus }}</strong>
											</div>
											<div class="personal-report-item">
												<span>提交率</span>
												<strong>{{ personalReportStats.rate }}%</strong>
											</div>
										</div>
									</div>
								</el-card>
							</section>

							<section class="overview-secondary-grid">
								<el-card shadow="never" class="content-card">
									<template #header>
										<div class="content-card__header">
											<span>即将到期项目</span>
											<el-tag size="small" type="warning" effect="plain">{{ upcomingProjectsTag }}</el-tag>
										</div>
									</template>
									<transition-group v-if="visibleUpcomingProjects.length" name="due-list-move" tag="div" class="due-list">
										<div
											v-for="project in visibleUpcomingProjects"
											:key="project.id"
											:class="['due-list__item', 'due-list__item--action', { 'is-focused': isUpcomingProjectFocused(project) }]"
											role="button"
											tabindex="0"
											@click="openProjectFromOverview(project)"
											@keydown.enter.prevent="openProjectFromOverview(project)"
											@keydown.space.prevent="openProjectFromOverview(project)"
										>
											<div class="due-list__main">
												<div class="due-list__title">{{ project.projectName }}</div>
												<div class="due-list__meta">
													{{ project.department }} / {{ project.executor }} / {{ project.deadline }}
												</div>
											</div>
											<div class="due-list__side">
												<div class="due-list__progress">
													<el-progress
														type="circle"
														:percentage="project.progress"
														:width="42"
														:stroke-width="6"
														:status="project.status === '已完成' ? 'success' : undefined"
													/>
													<el-tag size="small" :type="statusTagTypeMap[project.status] || 'info'">{{ project.status }}</el-tag>
												</div>
												<div class="due-list__side-top">
													<el-tag size="small" :type="priorityTagTypeMap[project.priority] || 'info'">{{ project.priority }}</el-tag>
													<div class="due-list__days">{{ formatDaysLeft(project.deadline) }}</div>
												</div>
												<el-button
													size="small"
													link
													type="warning"
													class="due-list__focus-btn"
													:title="isUpcomingProjectFocused(project) ? '取消关注' : '重点关注'"
													:aria-label="isUpcomingProjectFocused(project) ? '取消关注' : '重点关注'"
													@click.stop="toggleUpcomingProjectFocus(project)"
												>
													<img
														:src="isUpcomingProjectFocused(project) ? focusPinOnIcon : focusPinOffIcon"
														alt=""
														class="focus-pin-icon"
													/>
												</el-button>
											</div>
										</div>
									</transition-group>
									<el-empty v-else :image-size="72" description="未来 7 天暂无到期项目" />
								</el-card>

								<el-card v-if="currentRole === ROLE_ENUM.ADMIN" shadow="never" class="content-card">
									<template #header>
										<div class="content-card__header">
											<span>任务进度提交列表</span>
											<el-tag size="small" type="primary" effect="plain">{{ adminProgressFeedTag }}</el-tag>
										</div>
									</template>
									<div v-if="visibleAdminProgressFeed.length" class="progress-feed-board" :style="adminProgressFeedWindowStyle">
										<transition-group name="feed-scroll" tag="div" class="progress-feed-board__list">
											<div
												v-for="item in visibleAdminProgressFeed"
												:key="`${item.id}-${item.date}`"
												:class="['progress-feed-board__item', 'progress-feed-board__item--action', { 'is-focused': isAdminProgressFeedFocused(item) }]"
												role="button"
												tabindex="0"
												@click="openProjectFromOverview(item)"
												@keydown.enter.prevent="openProjectFromOverview(item)"
												@keydown.space.prevent="openProjectFromOverview(item)"
											>
												<div class="progress-feed-board__row">
													<div class="progress-feed-board__project">{{ item.projectName }}</div>
													<div class="progress-feed-board__time">{{ formatProgressFeedDate(item.date) }}</div>
												</div>
												<div class="progress-feed-board__meta">
													<span>{{ item.department }}</span>
													<span>{{ item.operator }}</span>
													<span>{{ item.stageLabel }}</span>
												</div>
												<div class="progress-feed-board__content">{{ item.content }}</div>
												<div class="progress-feed-board__footer">
													<el-tag size="small" type="warning" effect="plain">{{ item.progress }}%</el-tag>
													<el-button
														size="small"
														link
														type="warning"
														class="progress-feed-board__focus-btn"
														:title="isAdminProgressFeedFocused(item) ? '取消关注' : '重点关注'"
														:aria-label="isAdminProgressFeedFocused(item) ? '取消关注' : '重点关注'"
														@click.stop="toggleAdminProgressFeedFocus(item)"
													>
														<img
															:src="isAdminProgressFeedFocused(item) ? focusPinOnIcon : focusPinOffIcon"
															alt=""
															class="focus-pin-icon"
														/>
													</el-button>
												</div>
											</div>
										</transition-group>
										<div class="progress-feed-board__hint">
											实时展示最新任务进度消息，滚动窗口最多显示 5 条，新提交会从顶部滑入。
										</div>
									</div>
									<el-empty v-else :image-size="72" description="暂无任务进度提交" />
								</el-card>

								<el-card v-else-if="currentRole === ROLE_ENUM.MANAGER" shadow="never" class="content-card">
									<template #header>
										<div class="content-card__header">
											<span>部门成员概览</span>
											<el-tag size="small" effect="plain">{{ scopedEmployees.length }} 人</el-tag>
										</div>
									</template>
									<div class="preview-list">
										<div v-for="employee in employeePreview" :key="employee.id" class="preview-row">
											<div>
												<div class="preview-row__title">{{ employee.name }}</div>
												<div class="preview-row__meta">{{ employee.position }} / {{ employee.phone }}</div>
											</div>
											<el-tag size="small" :type="employee.status === '在职' ? 'success' : 'info'">{{ employee.status }}</el-tag>
										</div>
									</div>
								</el-card>

								<el-card v-else shadow="never" class="content-card">
									<template #header>
										<div class="content-card__header">
											<span>我的项目进度</span>
											<el-tag size="small" effect="plain">{{ scopedProjects.length }} 个</el-tag>
										</div>
									</template>
									<div ref="employeeProjectProgressChartRef" class="echart-panel echart-panel--md"></div>
								</el-card>

								<el-card shadow="never" class="content-card">
									<template #header>
										<div class="content-card__header">
											<span>快捷操作</span>
											<el-tag size="small" type="success" effect="plain">{{ quickActions.length }} 个</el-tag>
										</div>
									</template>
									<div class="quick-actions">
										<button
											v-for="action in quickActions"
											:key="action.key"
											type="button"
											class="quick-action-card"
											@click="handleQuickAction(action)"
										>
											<div class="quick-action-card__title">{{ action.title }}</div>
											<div class="quick-action-card__desc">{{ action.description }}</div>
											<div class="quick-action-card__footer">{{ action.cta }}</div>
										</button>
									</div>
								</el-card>
							</section>
						</template>

						<template v-else-if="activeSection === 'employees'">
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
															title="确认删除该员工吗？"
															confirm-button-text="删除"
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
																	删除
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
							</section>

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
						</template>

						<template v-else-if="activeSection === 'projects'">
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
												<el-button v-if="currentRole !== ROLE_ENUM.EMPLOYEE" type="primary" @click="openCreateProjectDialog">
													{{ currentRole === ROLE_ENUM.ADMIN ? '下发项目' : '下发本部门项目' }}
												</el-button>
												<el-button @click="resetProjectFilters">重置筛选</el-button>
											</div>
										</div>
									</template>
									<div class="project-filter-grid">
										<el-input
											v-model="projectFilters.keyword"
											clearable
											placeholder="按项目名、客户名或执行人搜索"
										/>
										<el-select v-model="projectFilters.status" clearable placeholder="筛选状态">
											<el-option
												v-for="status in projectStatusOptions"
												:key="status"
												:label="status"
												:value="status"
											/>
										</el-select>
										<el-select v-model="projectFilters.priority" clearable placeholder="筛选优先级">
											<el-option
												v-for="priority in projectPriorityOptions"
												:key="priority"
												:label="priority"
												:value="priority"
											/>
										</el-select>
										<el-select v-model="projectFilters.progress" clearable placeholder="筛选项目进度">
											<el-option
												v-for="option in projectProgressFilterOptions"
												:key="option.value"
												:label="option.label"
												:value="option.value"
											/>
										</el-select>
										<el-select
											v-if="currentRole !== ROLE_ENUM.EMPLOYEE"
											v-model="projectFilters.department"
											clearable
											:disabled="currentRole === ROLE_ENUM.MANAGER"
											placeholder="筛选部门"
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
											<el-tag type="primary" effect="plain">{{ filteredProjects.length }} 个</el-tag>
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
												v-if="currentRole !== ROLE_ENUM.EMPLOYEE"
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
														<el-button link type="primary" @click="openProjectDetail(row)">详情</el-button>
														<el-button
															v-if="canSubmitProjectProgress(row)"
															link
															type="success"
															@click="openProjectProgressDialog(row)"
														>
															提交进度
														</el-button>
														<el-button
															v-if="canAuditProject(row)"
															link
															type="success"
															@click="approveProject(row)"
														>
															审核通过
														</el-button>
														<el-button
															v-if="canAuditProject(row)"
															link
															type="danger"
															@click="rejectProject(row)"
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
												<el-button @click="resetProjectFilters">重置筛选</el-button>
												<el-button v-if="currentRole !== ROLE_ENUM.EMPLOYEE" type="primary" @click="openCreateProjectDialog">
													{{ currentRole === ROLE_ENUM.ADMIN ? '下发项目' : '下发本部门项目' }}
												</el-button>
											</div>
										</div>
									</div>
									<div class="employee-pagination">
										<div class="employee-pagination__total">共 {{ filteredProjects.length }} 个</div>
										<el-pagination
											v-model:current-page="projectTablePage"
											v-model:page-size="projectTablePageSize"
											background
											layout="prev, pager, next, sizes"
											:page-sizes="[10, 20, 50]"
											:total="filteredProjects.length"
										/>
									</div>
								</el-card>
							</section>

							<el-dialog
								v-model="projectDetailVisible"
								title="项目详情"
								width="920px"
								append-to-body
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
																<button
																	v-for="(attachment, attachmentIndex) in entry.attachments"
																	:key="`${entry.key}-${attachmentIndex}`"
																	type="button"
																	class="project-timeline__attachment-item"
																	@click="downloadProjectAttachment(currentProjectDetail, attachment, entry.title)"
																>
																	<el-icon><Download /></el-icon>
																	{{ attachment }}
																</button>
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
												@click="downloadAllProjectAttachments(currentProjectDetail)"
											>
												下载全部
											</el-button>
										</div>
										<div v-if="currentProjectAttachments.length" class="project-attachment-list">
											<button
												v-for="(attachment, index) in currentProjectAttachments"
												:key="`${currentProjectDetail.id}-${index}`"
												type="button"
												class="project-attachment-item"
												@click="downloadProjectAttachment(currentProjectDetail, attachment, '项目详情附件')"
											>
												<el-icon><Download /></el-icon>
												<span>{{ attachment }}</span>
											</button>
										</div>
										<el-empty v-else :image-size="72" description="当前项目暂无附件" />
									</div>
								</div>
								<template #footer>
									<div class="dialog-footer">
										<el-button @click="projectDetailVisible = false">关闭</el-button>
										<el-button
											v-if="currentProjectDetail && canSubmitProjectProgress(currentProjectDetail)"
											type="primary"
											@click="openProjectProgressDialog(currentProjectDetail)"
										>
											提交进度
										</el-button>
										<el-button
											v-if="currentProjectDetail && canAuditProject(currentProjectDetail)"
											type="danger"
											plain
											@click="rejectProject(currentProjectDetail)"
										>
											驳回
										</el-button>
										<el-button
											v-if="currentProjectDetail && canAuditProject(currentProjectDetail)"
											type="success"
											@click="approveProject(currentProjectDetail)"
										>
											审核通过
										</el-button>
									</div>
								</template>
							</el-dialog>

							<el-dialog
								v-model="projectFormVisible"
								:title="currentRole === ROLE_ENUM.ADMIN ? '下发项目' : '下发本部门项目'"
								width="720px"
								append-to-body
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
												:disabled="currentRole === ROLE_ENUM.MANAGER"
												placeholder="请选择所属部门"
												@change="handleProjectDepartmentChange"
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
											<el-select v-model="projectForm.executor" placeholder="请选择执行人">
												<el-option
													v-for="employee in availableProjectExecutors"
													:key="employee.id"
													:label="`${employee.name} / ${employee.position}`"
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
												:auto-upload="false"
											>
												<el-icon class="el-icon--upload"><UploadFilled /></el-icon>
												<div class="el-upload__text">
													将文件拖到此处，或<em>点击上传</em>
												</div>
												<template #tip>
													<div class="project-upload__tip">
														仅做前端模拟展示，不上传到服务器；提交后会记录文件名到项目附件中。
													</div>
												</template>
											</el-upload>
										</el-form-item>
									</div>
								</el-form>
								<template #footer>
									<div class="dialog-footer">
										<el-button @click="projectFormVisible = false">取消</el-button>
										<el-button type="primary" @click="submitProjectForm">确认下发</el-button>
									</div>
								</template>
							</el-dialog>

							<el-dialog
								v-model="projectProgressVisible"
								title="提交项目进度"
								width="640px"
								append-to-body
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
											:auto-upload="false"
										>
											<el-icon class="el-icon--upload"><UploadFilled /></el-icon>
											<div class="el-upload__text">
												将文件拖到此处，或<em>点击上传</em>
											</div>
											<template #tip>
												<div class="project-upload__tip">
													仅做前端模拟展示，不上传到服务器；提交后会追加到本次进度记录附件中。
												</div>
											</template>
										</el-upload>
									</el-form-item>
								</el-form>
								<template #footer>
									<div class="dialog-footer">
										<el-button @click="projectProgressVisible = false">取消</el-button>
										<el-button type="primary" @click="submitProjectProgress">提交</el-button>
									</div>
								</template>
							</el-dialog>
						</template>

						<template v-else-if="activeSection === 'reports'">
							<section class="report-page">
								<section class="metrics-grid">
									<el-card
										v-for="card in reportSummaryCards"
										:key="card.key"
										shadow="hover"
										class="metric-card"
									>
										<div class="metric-card__label">{{ card.label }}</div>
										<div class="metric-card__value">{{ card.value }}</div>
										<div class="metric-card__hint">{{ card.hint }}</div>
									</el-card>
								</section>

								<el-card shadow="never" class="content-card report-filter-card">
									<template #header>
										<div class="content-card__header">
											<span>日报筛选</span>
											<div class="report-filter-actions">
												<el-button
													v-if="canWriteReport"
													type="primary"
													:disabled="Boolean(currentEmployeeTodayReport)"
													@click="openReportEditor"
												>
													{{ reportPrimaryActionLabel }}
												</el-button>
												<el-button @click="resetReportFilters">重置筛选</el-button>
											</div>
										</div>
									</template>
									<div class="report-filter-grid">
										<el-input
											v-model="reportFilters.keyword"
											clearable
											placeholder="按标题、员工、项目或工作内容搜索"
										/>
										<el-select v-model="reportFilters.status" clearable placeholder="筛选状态">
											<el-option
												v-for="status in reportStatusOptions"
												:key="status"
												:label="status"
												:value="status"
											/>
										</el-select>
										<el-select
											v-if="currentRole !== ROLE_ENUM.EMPLOYEE"
											v-model="reportFilters.department"
											clearable
											:disabled="currentRole === ROLE_ENUM.MANAGER"
											placeholder="筛选部门"
										>
											<el-option
												v-for="department in reportDepartmentOptions"
												:key="department"
												:label="department"
												:value="department"
											/>
										</el-select>
										<el-date-picker
											v-model="reportFilters.dateRange"
											type="daterange"
											value-format="YYYY-MM-DD"
											range-separator="至"
											start-placeholder="开始日期"
											end-placeholder="结束日期"
											unlink-panels
										/>
									</div>
								</el-card>

								<el-card shadow="never" class="content-card report-table-card">
									<template #header>
										<div class="content-card__header">
											<span>{{ reportTableTitle }}</span>
											<el-tag type="primary" effect="plain">{{ filteredReports.length }} 条</el-tag>
										</div>
									</template>
									<div class="report-table-shell">
										<el-table
											v-if="filteredReports.length"
											:data="paginatedReports"
											border
											stripe
											height="100%"
											class="report-table"
										>
											<el-table-column prop="title" label="标题" min-width="170" show-overflow-tooltip />
											<el-table-column v-if="currentRole !== ROLE_ENUM.EMPLOYEE" prop="employeeName" label="员工" min-width="110" />
											<el-table-column v-if="currentRole !== ROLE_ENUM.EMPLOYEE" prop="department" label="部门" min-width="120" />
											<el-table-column prop="submitTime" label="提交时间" min-width="160" />
											<el-table-column prop="relatedProject" label="关联项目" min-width="180" show-overflow-tooltip>
												<template #default="{ row }">
													{{ row.relatedProject || '-' }}
												</template>
											</el-table-column>
											<el-table-column label="内容摘要" min-width="240" show-overflow-tooltip>
												<template #default="{ row }">
													{{ row.content || buildReportSummary(row.workContent) }}
												</template>
											</el-table-column>
											<el-table-column label="状态" width="100" align="center">
												<template #default="{ row }">
													<el-tag size="small" :type="reportStatusTagTypeMap[row.status] || 'info'">{{ row.status }}</el-tag>
												</template>
											</el-table-column>
											<el-table-column label="批注时间" min-width="160">
												<template #default="{ row }">
													{{ row.commentTime || '-' }}
												</template>
											</el-table-column>
											<el-table-column label="操作" min-width="220" fixed="right" align="center">
												<template #default="{ row }">
													<div class="project-row-actions">
														<el-button link type="primary" @click="openReportDetail(row)">详情</el-button>
														<el-button
															v-if="canCommentReport(row)"
															link
															type="warning"
															@click="openReportCommentDialog(row)"
														>
															{{ row.status === '已批注' ? '修改批注' : '写批注' }}
														</el-button>
													</div>
												</template>
											</el-table-column>
										</el-table>
										<div v-else class="module-empty-state">
											<el-empty :image-size="88" description="当前筛选条件下暂无日报数据" />
											<div class="module-empty-state__actions">
												<el-button @click="resetReportFilters">重置筛选</el-button>
												<el-button v-if="canWriteReport" type="primary" :disabled="Boolean(currentEmployeeTodayReport)" @click="openReportEditor">
													{{ reportPrimaryActionLabel }}
												</el-button>
											</div>
										</div>
									</div>
									<div class="employee-pagination">
										<div class="employee-pagination__total">共 {{ filteredReports.length }} 条</div>
										<el-pagination
											v-model:current-page="reportTablePage"
											v-model:page-size="reportTablePageSize"
											background
											layout="prev, pager, next, sizes"
											:page-sizes="[10, 20, 50]"
											:total="filteredReports.length"
										/>
									</div>
								</el-card>
							</section>

							<el-dialog
								v-model="reportDetailVisible"
								title="日报详情"
								width="920px"
								top="4vh"
								class="report-detail-dialog"
								append-to-body
							>
								<el-scrollbar v-if="currentReportDetail" class="report-detail-scroll">
									<div class="report-detail-grid">
										<div class="report-detail-panel">
											<div class="project-detail-panel__header">
												<div>
													<div class="project-detail-panel__title">{{ currentReportDetail.title }}</div>
													<div class="project-detail-panel__meta">
														{{ currentReportDetail.employeeName }} / {{ currentReportDetail.department }} / {{ currentReportDetail.submitTime }}
													</div>
												</div>
												<el-tag :type="reportStatusTagTypeMap[currentReportDetail.status] || 'info'">
													{{ currentReportDetail.status }}
												</el-tag>
											</div>
											<div class="report-meta-grid">
												<div class="report-meta-item">
													<span>关联项目</span>
													<strong>{{ currentReportDetail.relatedProject || '-' }}</strong>
												</div>
												<div class="report-meta-item">
													<span>附件数量</span>
													<strong>{{ currentReportAttachments.length }} 个</strong>
												</div>
											</div>
											<div class="report-reading-grid">
												<div class="report-reading-card report-reading-card--primary">
													<div class="report-reading-card__label">今日工作</div>
													<div class="report-reading-card__content">{{ currentReportDetail.workContent }}</div>
												</div>
												<div class="report-reading-card">
													<div class="report-reading-card__label">明日计划</div>
													<div class="report-reading-card__content">{{ currentReportDetail.tomorrowPlan }}</div>
												</div>
												<div class="report-reading-card">
													<div class="report-reading-card__label">遇到的问题</div>
													<div class="report-reading-card__content">{{ currentReportDetail.problems || '无' }}</div>
												</div>
											</div>
										</div>

										<div class="project-detail-section">
											<div class="project-detail-section__header">
												<div class="project-detail-section__title">附件列表</div>
												<el-button
													v-if="currentReportAttachments.length"
													size="small"
													type="primary"
													plain
													@click="downloadAllReportAttachments(currentReportDetail)"
												>
													下载全部
												</el-button>
											</div>
											<div v-if="currentReportAttachments.length" class="report-attachment-list">
												<button
													v-for="(attachment, index) in currentReportAttachments"
													:key="`${currentReportDetail.id}-${index}`"
													type="button"
													class="project-attachment-item"
													@click="downloadReportAttachment(currentReportDetail, attachment)"
												>
													<el-icon><Download /></el-icon>
													<span>{{ attachment }}</span>
												</button>
											</div>
											<el-empty v-else :image-size="72" description="当前日报暂无附件" />
										</div>

										<div class="project-detail-section">
											<div class="project-detail-section__title">主管批注</div>
											<div v-if="currentReportDetail.leaderComment" class="report-comment-panel">
												<div class="report-comment-panel__meta">
													<span>{{ currentReportDetail.commentAuthor }}</span>
													<span>{{ currentReportDetail.commentTime }}</span>
													<el-tag v-if="currentReportDetail.score" size="small" effect="plain">{{ currentReportDetail.score }}</el-tag>
												</div>
												<div class="report-comment-panel__content">{{ currentReportDetail.leaderComment }}</div>
											</div>
											<el-empty v-else :image-size="72" description="主管暂未填写批注" />
										</div>
									</div>
								</el-scrollbar>
								<template #footer>
									<div class="dialog-footer">
										<el-button @click="reportDetailVisible = false">关闭</el-button>
										<el-button
											v-if="currentReportDetail && canCommentReport(currentReportDetail)"
											type="warning"
											@click="openReportCommentDialog(currentReportDetail)"
										>
											{{ currentReportDetail.status === '已批注' ? '修改批注' : '写批注' }}
										</el-button>
									</div>
								</template>
							</el-dialog>

							<el-dialog
								v-model="reportFormVisible"
								title="写今日日报"
								width="720px"
								append-to-body
							>
								<el-form
									ref="reportFormRef"
									:model="reportForm"
									:rules="reportRules"
									label-width="92px"
									@submit.prevent
								>
									<div class="project-form-grid">
										<el-form-item label="日期" prop="date">
											<el-date-picker
												v-model="reportForm.date"
												type="date"
												value-format="YYYY-MM-DD"
												placeholder="请选择日报日期"
												disabled
											/>
										</el-form-item>
										<el-form-item label="关联项目">
											<el-select v-model="reportForm.relatedProjectId" clearable :placeholder="reportProjectPlaceholder">
												<el-option
													v-for="option in reportProjectOptions"
													:key="option.value"
													:label="option.label"
													:value="option.value"
												/>
											</el-select>
										</el-form-item>
										<el-form-item class="project-form-grid__full" label="日报标题">
											<el-input v-model="reportForm.title" placeholder="默认自动生成 YYYY-MM-DD 日报，可手动覆盖" />
										</el-form-item>
										<el-form-item class="project-form-grid__full" label="今日工作" prop="workContent">
											<el-input
												v-model="reportForm.workContent"
												type="textarea"
												:rows="4"
												placeholder="请输入今日工作内容"
											/>
										</el-form-item>
										<el-form-item class="project-form-grid__full" label="明日计划" prop="tomorrowPlan">
											<el-input
												v-model="reportForm.tomorrowPlan"
												type="textarea"
												:rows="3"
												placeholder="请输入明日计划"
											/>
										</el-form-item>
										<el-form-item class="project-form-grid__full" label="遇到的问题">
											<el-input
												v-model="reportForm.problems"
												type="textarea"
												:rows="3"
												placeholder="如无问题可留空"
											/>
										</el-form-item>
										<el-form-item class="project-form-grid__full" label="附件">
											<el-upload
												v-model:file-list="reportForm.attachmentFiles"
												class="project-upload"
												drag
												multiple
												:auto-upload="false"
											>
												<el-icon class="el-icon--upload"><UploadFilled /></el-icon>
												<div class="el-upload__text">
													将文件拖到此处，或<em>点击上传</em>
												</div>
												<template #tip>
													<div class="project-upload__tip">
														仅做前端模拟展示，不上传到服务器；提交后会记录文件名到日报附件中。
													</div>
												</template>
											</el-upload>
										</el-form-item>
									</div>
								</el-form>
								<template #footer>
									<div class="dialog-footer">
										<el-button @click="reportFormVisible = false">取消</el-button>
										<el-button type="primary" @click="submitReportForm">提交日报</el-button>
									</div>
								</template>
							</el-dialog>

							<el-dialog
								v-model="reportCommentVisible"
								title="主管批注"
								width="560px"
								append-to-body
							>
								<div v-if="currentReportDetail" class="project-progress-summary">
									<div class="project-progress-summary__title">{{ currentReportDetail.title }}</div>
									<div class="project-progress-summary__meta">
										{{ currentReportDetail.employeeName }} / {{ currentReportDetail.submitTime }} / {{ currentReportDetail.relatedProject || '未关联项目' }}
									</div>
								</div>
								<el-form
									ref="reportCommentFormRef"
									:model="reportCommentForm"
									:rules="reportCommentRules"
									label-width="92px"
									@submit.prevent
								>
									<el-form-item label="批注内容" prop="leaderComment">
										<el-input
											v-model="reportCommentForm.leaderComment"
											type="textarea"
											:rows="5"
											placeholder="请输入对工作内容、问题和明日计划的反馈"
										/>
									</el-form-item>
									<el-form-item label="模拟评分">
										<el-select v-model="reportCommentForm.score" clearable placeholder="可选填写">
											<el-option
												v-for="score in reportScoreOptions"
												:key="score"
												:label="score"
												:value="score"
											/>
										</el-select>
									</el-form-item>
								</el-form>
								<template #footer>
									<div class="dialog-footer">
										<el-button @click="reportCommentVisible = false">取消</el-button>
										<el-button type="warning" @click="submitReportComment">保存批注</el-button>
									</div>
								</template>
							</el-dialog>
						</template>

						<template v-else-if="activeSection === 'settings'">
							<section class="settings-page">
								<div class="settings-layout">
									<el-card shadow="never" class="content-card settings-profile-card">
										<template #header>
											<div class="content-card__header">
												<span>个人资料</span>
												<el-tag size="small" effect="plain">{{ roleLabelMap[currentRole] }}</el-tag>
											</div>
										</template>
										<div class="settings-profile">
											<div class="settings-avatar-panel">
												<div class="settings-avatar">
													<img v-if="settingsAvatarPreview" :src="settingsAvatarPreview" alt="头像预览" class="settings-avatar__image" />
													<template v-else>{{ currentUser.name.slice(0, 1) }}</template>
												</div>
												<div class="settings-avatar__actions">
													<el-upload
														class="settings-avatar-upload"
														:show-file-list="false"
														:auto-upload="false"
														accept=".jpg,.jpeg,.png,.gif"
														:on-change="handleSettingsAvatarChange"
													>
														<el-button type="primary">更换头像</el-button>
													</el-upload>
													<el-button plain @click="resetSettingsAvatar">恢复默认</el-button>
												</div>
												<div class="settings-avatar__tip">支持 jpg/png/gif，最大 2MB，仅做前端模拟保存。</div>
											</div>
											<div class="settings-profile-meta">
												<div class="settings-profile-meta__name">{{ currentUser.name }}</div>
												<div class="settings-profile-meta__sub">{{ currentUser.department }} / {{ currentUser.position }}</div>
												<div class="settings-profile-meta__line">登录账号：{{ currentUser.userName }}</div>
												<div class="settings-profile-meta__line">当前状态：{{ currentUser.status }}</div>
											</div>
										</div>
										<div class="settings-readonly-grid">
											<div class="settings-readonly-item">
												<span>姓名</span>
												<strong>{{ currentUser.name }}</strong>
												<small>不可修改，如需调整请联系管理员</small>
											</div>
											<div class="settings-readonly-item">
												<span>部门</span>
												<strong>{{ currentUser.department }}</strong>
												<small>部门归属只读</small>
											</div>
											<div class="settings-readonly-item">
												<span>职位</span>
												<strong>{{ currentUser.position }}</strong>
												<small>职位信息只读</small>
											</div>
										</div>
									</el-card>

									<el-card shadow="never" class="content-card settings-form-card">
										<template #header>
											<div class="content-card__header">
												<span>基础信息修改</span>
												<el-tag size="small" type="success" effect="plain">保存后立即回显</el-tag>
											</div>
										</template>
										<el-form
											ref="settingsFormRef"
											:model="settingsForm"
											:rules="settingsRules"
											label-width="88px"
										>
											<div class="settings-form-grid">
												<el-form-item label="手机号" prop="phone">
													<el-input v-model="settingsForm.phone" maxlength="11" placeholder="请输入手机号" />
												</el-form-item>
												<el-form-item label="邮箱" prop="email">
													<el-input v-model="settingsForm.email" placeholder="请输入邮箱" />
												</el-form-item>
												<el-form-item class="settings-form-grid__full" label="说明">
													<div class="settings-form-note">
														当前页面仅开放联系方式与头像的前端模拟修改；姓名、部门、职位保持只读。
													</div>
												</el-form-item>
											</div>
										</el-form>
										<div class="dialog-footer dialog-footer--inline">
											<el-button @click="resetSettingsForm">重置</el-button>
											<el-button type="primary" @click="submitSettingsForm">保存设置</el-button>
										</div>
									</el-card>
								</div>
							</section>
						</template>

						<template v-else>
							<section class="metrics-grid">
								<el-card
									v-for="card in summaryCards"
									:key="card.key"
									shadow="hover"
									class="metric-card"
								>
									<div class="metric-card__label">{{ card.label }}</div>
									<div class="metric-card__value">{{ card.value }}</div>
									<div class="metric-card__hint">{{ card.hint }}</div>
								</el-card>
							</section>

							<section class="content-grid">
								<el-card shadow="never" class="content-card content-card--wide">
									<template #header>
										<div class="content-card__header">
											<span>基础数据模型</span>
											<el-tag size="small" effect="plain">{{ currentRoleSummary }}</el-tag>
										</div>
									</template>
									<div class="dataset-grid">
										<div class="dataset-block">
											<div class="dataset-block__title">模拟用户</div>
											<div class="dataset-block__body">
												<div>登录账号：{{ currentLoginName }}</div>
												<div>当前样本：{{ currentUser.userName }}</div>
												<div>姓名：{{ currentUser.name }}</div>
												<div>部门：{{ currentUser.department }}</div>
												<div>邮箱：{{ currentUser.email }}</div>
											</div>
										</div>
										<div class="dataset-block">
											<div class="dataset-block__title">角色枚举</div>
											<div class="dataset-block__body">
												<div v-for="(label, key) in roleLabelMap" :key="key">
													{{ key }} / {{ label }}
												</div>
											</div>
										</div>
										<div class="dataset-block">
											<div class="dataset-block__title">数据集规模</div>
											<div class="dataset-block__body">
												<div>员工：{{ scopedEmployees.length }} 人</div>
												<div>项目：{{ scopedProjects.length }} 个</div>
												<div>日报：{{ scopedReports.length }} 条</div>
												<div>部门：{{ departments.length }} 个</div>
											</div>
										</div>
									</div>
								</el-card>

								<el-card shadow="never" class="content-card">
									<template #header>
										<div class="content-card__header">
											<span>可见菜单</span>
											<el-tag size="small" type="primary" effect="light">{{ visibleSections.length }} 个</el-tag>
										</div>
									</template>
									<div class="menu-preview">
										<div
											v-for="item in visibleSections"
											:key="item.key"
											class="menu-preview__item"
											:class="{ 'is-active': item.key === activeSection }"
										>
											<div class="menu-preview__name">{{ item.label }}</div>
											<div class="menu-preview__desc">{{ item.description }}</div>
										</div>
									</div>
								</el-card>

								<el-card shadow="never" class="content-card">
									<template #header>
										<div class="content-card__header">
											<span>当前模块占位</span>
											<el-tag size="small" type="warning" effect="plain">待下一节点实现</el-tag>
										</div>
									</template>
									<div class="placeholder-panel">
										<div class="placeholder-panel__title">{{ currentSection.label }}</div>
										<div class="placeholder-panel__desc">{{ currentSection.placeholder }}</div>
										<el-empty :image-size="82" description="首页概览已完成，其他模块按后续节点实现" />
									</div>
								</el-card>
							</section>

							<section class="data-preview-grid">
								<el-card shadow="never" class="preview-card">
									<template #header>
										<div class="content-card__header">
											<span>员工样本</span>
											<el-tag size="small" effect="plain">{{ employeePreview.length }} 条预览</el-tag>
										</div>
									</template>
									<div class="preview-list">
										<div v-for="employee in employeePreview" :key="employee.id" class="preview-row">
											<div>
												<div class="preview-row__title">{{ employee.name }}</div>
												<div class="preview-row__meta">{{ employee.department }} / {{ employee.position }}</div>
											</div>
											<el-tag size="small" :type="employee.status === '在职' ? 'success' : 'info'">
												{{ employee.status }}
											</el-tag>
										</div>
									</div>
								</el-card>

								<el-card shadow="never" class="preview-card">
									<template #header>
										<div class="content-card__header">
											<span>项目样本</span>
											<el-tag size="small" effect="plain">{{ projectPreview.length }} 条预览</el-tag>
										</div>
									</template>
									<div class="preview-list">
										<div v-for="project in projectPreview" :key="project.id" class="preview-row">
											<div>
												<div class="preview-row__title">{{ project.projectName }}</div>
												<div class="preview-row__meta">{{ project.department }} / 截止 {{ project.deadline }}</div>
											</div>
											<el-tag size="small" :type="statusTagTypeMap[project.status] || 'info'">
												{{ project.status }}
											</el-tag>
										</div>
									</div>
								</el-card>

								<el-card shadow="never" class="preview-card">
									<template #header>
										<div class="content-card__header">
											<span>日报样本</span>
											<el-tag size="small" effect="plain">{{ reportPreview.length }} 条预览</el-tag>
										</div>
									</template>
									<div class="preview-list">
										<div v-for="report in reportPreview" :key="report.id" class="preview-row">
											<div>
												<div class="preview-row__title">{{ report.title }}</div>
												<div class="preview-row__meta">{{ report.employeeName }} / {{ report.submitDate }}</div>
											</div>
											<el-tag size="small" :type="reportStatusTagTypeMap[report.status] || 'info'">
												{{ report.status }}
											</el-tag>
										</div>
									</div>
								</el-card>
							</section>
						</template>
					</div>
				</el-scrollbar>
			</section>
		</div>
	</div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import * as echarts from 'echarts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { pinyin } from 'pinyin-pro';
import { getPersonalCenterFocusState, updatePersonalCenterFocusState } from '../../api/personalCenterFocus';
import {
	getCurrentUser,
	getOptions,
	getDepartments,
	getEmployees,
	createDepartment,
	createEmployee,
	updateEmployee,
	deleteEmployee,
	getDepartmentExecutors,
	getProjects,
	getProject,
	createProject,
	submitProjectProgress as apiSubmitProjectProgress,
	approveProject as apiApproveProject,
	rejectProject as apiRejectProject,
	getReports,
	getReport,
	createReport,
	getReportProjectOptions,
	commentReport,
	getSettings,
	updateSettings,
	uploadAvatar as apiUploadAvatar,
	deleteAvatar as apiDeleteAvatar,
	getOverview,
} from '../../api/personalCenter';
import focusPinOnIcon from '../../assets/图钉_on.png';
import focusPinOffIcon from '../../assets/图钉_off.png';
import {
	DataAnalysis,
	Download,
	Document,
	FolderOpened,
	SetUp,
	UploadFilled,
	User,
} from '@element-plus/icons-vue';
import {
	PROJECT_STAGE_DEFINITIONS,
	departments,
	employees,
	projects,
	reports,
	roleSwitchOptions,
	roleTestUserMap,
	overviewRangeOptions,
	employeeStatusOptions,
	employeeRoleOptions,
	projectStatusOptions,
	projectPriorityOptions,
	reportStatusOptions,
	reportScoreOptions,
	projectProgressFilterOptions,
} from './personal-center/mockData.js';

const props = defineProps({
	active: Boolean,
});

const ROLE_ENUM = Object.freeze({
	ADMIN: 'admin',
	MANAGER: 'manager',
	EMPLOYEE: 'employee',
});

const roleLabelMap = Object.freeze({
	[ROLE_ENUM.ADMIN]: '管理员',
	[ROLE_ENUM.MANAGER]: '部门主管',
	[ROLE_ENUM.EMPLOYEE]: '员工',
});

const ROLE_STORAGE_KEY = 'szkj:personal-center-role';
const REPORT_DRAFT_STORAGE_KEY = 'szkj:personal-center-report-draft';
const SETTINGS_AVATAR_STORAGE_KEY = 'szkj:personal-center-avatar';
const DASHBOARD_TODAY = '2026-06-22';
const REPORT_RUNTIME_TODAY = typeof window !== 'undefined' ? formatDate(new Date()) : DASHBOARD_TODAY;
const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_PROJECT_VISIBLE_COUNT = 8;
const ADMIN_PROGRESS_FEED_VISIBLE_COUNT = 5;
const ADMIN_PROGRESS_FEED_ROW_HEIGHT = 126;
const ADMIN_PROGRESS_FEED_GAP = 8;

const defaultUserName = typeof window !== 'undefined'
	? localStorage.getItem('userName') || 'admin'
	: 'admin';

const initialMatchedUser = employees.find((item) => item.userName === defaultUserName);
const currentLoginName = defaultUserName;
const currentRole = ref(readPersistedRole() || initialMatchedUser?.role || ROLE_ENUM.ADMIN);
const overviewRange = ref('7d');
const projectTrendMode = ref('new');
const projectStatusChartRef = ref(null);
const reportRateChartRef = ref(null);
const personalReportChartRef = ref(null);
const employeeDistributionChartRef = ref(null);
const employeeProjectProgressChartRef = ref(null);
const projectTrendChartRef = ref(null);
const focusState = reactive({
	upcomingProjectIds: [],
	adminProgressFeedIds: [],
});

// ==================== API 数据存储 ====================
const apiData = reactive({
	departments: [], // { id, name, employeeCount, managerId, managerName }
	employees: [], // 员工列表
	projects: [], // 项目列表
	reports: [], // 日报列表
	overview: null, // 首页概览数据
	options: null, // 字典选项
	settings: null, // 个人设置
});

// 标记是否已加载过API数据
const apiDataLoaded = reactive({
	departments: false,
	employees: false,
	projects: false,
	reports: false,
	overview: false,
	options: false,
	settings: false,
});

let projectStatusChartInstance = null;
let reportRateChartInstance = null;
let personalReportChartInstance = null;
let employeeDistributionChartInstance = null;
let employeeProjectProgressChartInstance = null;
let projectTrendChartInstance = null;
let sectionLoadingTimer = null;

// ==================== 安全获取函数 ====================

/**
 * 安全获取值，如果为空则返回默认值
 */
function safeGet(value, defaultValue = '') {
	if (value === null || value === undefined) return defaultValue;
	return value;
}

/**
 * 安全获取数组
 */
function safeArray(value) {
	if (!Array.isArray(value)) return [];
	return value;
}

const currentUserApiData = ref({
	id: '',
	userName: '',
	name: '',
	role: 'admin',
	department: '',
	position: '',
	phone: '',
	email: '',
	status: '在职',
	avatarUrl: '',
	permissions: [],
	visibleSections: [],
});

const currentUser = computed(() => currentUserApiData.value);

const sectionDefinitions = [
	{
		key: 'overview',
		label: '首页概览',
		description: '展示当前测试角色下的统计总览、项目状态、日报情况和快捷操作入口。',
		placeholder: '首页概览已完成，后续节点继续补齐二级业务页。',
		icon: DataAnalysis,
		roles: [ROLE_ENUM.ADMIN, ROLE_ENUM.MANAGER, ROLE_ENUM.EMPLOYEE],
	},
	{
		key: 'employees',
		label: '员工管理',
		description: '这里将承接员工列表、筛选器和新增编辑删除弹窗。',
		placeholder: '节点 4 将补齐员工管理列表与弹窗。',
		icon: User,
		roles: [ROLE_ENUM.ADMIN, ROLE_ENUM.MANAGER],
	},
	{
		key: 'projects',
		label: '项目管理',
		description: '展示项目列表、项目详情、下发项目、进度提交与审核闭环。',
		placeholder: '节点 5 已完成项目页与角色差异操作。',
		icon: FolderOpened,
		roles: [ROLE_ENUM.ADMIN, ROLE_ENUM.MANAGER, ROLE_ENUM.EMPLOYEE],
	},
	{
		key: 'reports',
		label: '日报管理',
		description: '展示日报列表、日报详情、填写日报、历史记录与主管批注。',
		placeholder: '节点 6 已完成日报页基础闭环。',
		icon: Document,
		roles: [ROLE_ENUM.ADMIN, ROLE_ENUM.MANAGER, ROLE_ENUM.EMPLOYEE],
	},
	{
		key: 'settings',
		label: '个人设置',
		description: '这里将承接头像、手机号和邮箱等个人信息编辑区。',
		placeholder: '节点 7 将补齐个人设置内容。',
		icon: SetUp,
		roles: [ROLE_ENUM.ADMIN, ROLE_ENUM.MANAGER, ROLE_ENUM.EMPLOYEE],
	},
];

const activeSection = ref('overview');
const sectionLoading = ref(false);
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
	role: 'employee',
	roleName: '员工',
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
	date: REPORT_RUNTIME_TODAY,
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
				if (Number(value) < projectProgressBaseline.value) {
					callback(new Error(`进度不能低于当前进度 ${projectProgressBaseline.value}%`));
					return;
				}
				if (Number(value) < projectProgressRange.value.min || Number(value) > projectProgressRange.value.max) {
					callback(new Error(`当前节点进度需在 ${projectProgressRange.value.min}% ~ ${projectProgressRange.value.max}% 之间`));
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

const visibleSections = computed(() => {
	if (currentUser.value.visibleSections?.length) {
		return sectionDefinitions.filter((item) => currentUser.value.visibleSections.includes(item.key));
	}
	return sectionDefinitions.filter((item) => item.roles.includes(currentRole.value));
});

const currentSection = computed(() => {
	return visibleSections.value.find((item) => item.key === activeSection.value) || visibleSections.value[0];
});
const employeeDepartmentOptions = computed(() => {
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return [currentUser.value.department];
	}
	// 优先使用API部门数据
	if (apiData.departments.length > 0) {
		return apiData.departments.map(d => d.name);
	}
	return departments;
});
const projectDepartmentOptions = computed(() => {
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return [currentUser.value.department];
	}
	// 优先使用API部门数据
	if (apiData.departments.length > 0) {
		return apiData.departments.map(d => d.name);
	}
	return departments;
});
const reportDepartmentOptions = computed(() => {
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return [currentUser.value.department];
	}
	// 优先使用API部门数据
	if (apiData.departments.length > 0) {
		return apiData.departments.map(d => d.name);
	}
	return departments;
});
const availableProjectExecutors = computed(() => {
	const department = projectForm.department || (currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '');
	return employees.filter((item) => {
		return item.role === ROLE_ENUM.EMPLOYEE
			&& item.status !== '离职'
			&& (!department || item.department === department);
	});
});
const canWriteReport = computed(() => [ROLE_ENUM.MANAGER, ROLE_ENUM.EMPLOYEE].includes(currentRole.value));
const reportProjectOptions = computed(() => {
	if (!canWriteReport.value) return [];
	return scopedProjects.value.map((item) => ({
		label: `${item.projectName} / 截止 ${item.deadline}`,
		value: item.id,
	}));
});
const reportProjectPlaceholder = computed(() => currentRole.value === ROLE_ENUM.MANAGER ? '可选关联本部门项目' : '可选关联我的项目');
const filteredEmployees = computed(() => {
	const keyword = employeeFilters.keyword.trim().toLowerCase();
	return scopedEmployees.value.filter((item) => {
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
const filteredProjects = computed(() => {
	const keyword = projectFilters.keyword.trim().toLowerCase();
	return scopedProjects.value.filter((item) => {
		const matchesKeyword = !keyword
			|| item.projectName.toLowerCase().includes(keyword)
			|| item.customerName.toLowerCase().includes(keyword)
			|| item.executor.toLowerCase().includes(keyword)
			|| item.leader.toLowerCase().includes(keyword);
		const matchesStatus = !projectFilters.status || item.status === projectFilters.status;
		const matchesPriority = !projectFilters.priority || item.priority === projectFilters.priority;
		const matchesProgress = !projectFilters.progress || isProjectProgressMatched(item.progress, Number(projectFilters.progress));
		const matchesDepartment = !projectFilters.department || item.department === projectFilters.department;
		return matchesKeyword && matchesStatus && matchesPriority && matchesProgress && matchesDepartment;
	});
});
const paginatedProjects = computed(() => {
	const start = (projectTablePage.value - 1) * projectTablePageSize.value;
	return filteredProjects.value.slice(start, start + projectTablePageSize.value);
});
const filteredPendingReviewProjects = computed(() => filteredProjects.value.filter((item) => item.status === '待审核'));
const filteredActiveProjects = computed(() => filteredProjects.value.filter((item) => item.status === '进行中'));
const filteredCompletedProjects = computed(() => filteredProjects.value.filter((item) => item.status === '已完成'));
const filteredAverageProjectProgress = computed(() => {
	if (!filteredProjects.value.length) return 0;
	const total = filteredProjects.value.reduce((sum, item) => sum + Number(item.progress || 0), 0);
	return Math.round(total / filteredProjects.value.length);
});
const filteredUpcomingProjects = computed(() => {
	return filteredProjects.value
		.filter((item) => item.status !== '已完成')
		.filter((item) => {
			const diff = getDaysDiff(item.deadline);
			return diff >= 0 && diff <= 7;
		})
		.sort((a, b) => getDaysDiff(a.deadline) - getDaysDiff(b.deadline));
});
const projectTableTitle = computed(() => {
	if (currentRole.value === ROLE_ENUM.ADMIN) return '项目列表';
	if (currentRole.value === ROLE_ENUM.MANAGER) return '部门项目列表';
	return '我的项目';
});
const currentProjectDetail = computed(() => {
	return projects.find((item) => item.id === activeProjectId.value) || null;
});
const currentProjectAttachments = computed(() => {
	return currentProjectDetail.value ? getProjectAttachmentList(currentProjectDetail.value) : [];
});
const currentUserAvatar = computed(() => settingsAvatarState[currentUser.value.id] || '');
const settingsAvatarPreview = computed(() => currentUserAvatar.value);
const currentReportDetail = computed(() => {
	return reports.find((item) => item.id === activeReportId.value) || null;
});
const currentReportAttachments = computed(() => {
	return currentReportDetail.value ? getReportAttachmentList(currentReportDetail.value) : [];
});
const progressTargetProject = computed(() => {
	return projectProgressForm.projectId
		? projects.find((item) => item.id === projectProgressForm.projectId) || null
		: null;
});
const projectProgressBaseline = computed(() => Number(progressTargetProject.value?.progress || 0));
const projectProgressCurrentStageKey = computed(() => getProjectCurrentStageKey(progressTargetProject.value));
const projectProgressStageOptions = computed(() => getAvailableProjectStageOptions(progressTargetProject.value));
const selectedProjectProgressStage = computed(() => {
	return PROJECT_STAGE_DEFINITIONS.find((item) => item.key === projectProgressForm.stageKey) || null;
});
const projectProgressRange = computed(() => {
	const stage = selectedProjectProgressStage.value;
	if (!stage) {
		return {
			min: projectProgressBaseline.value,
			max: Math.max(projectProgressBaseline.value, 100),
		};
	}
	const min = Math.max(stage.min, projectProgressBaseline.value);
	const max = stage.max;
	return {
		min,
		max: Math.max(min, max),
	};
});
const projectProgressStageHint = computed(() => {
	const stage = selectedProjectProgressStage.value;
	if (!stage) return '请先选择本次提交对应的固定节点。';
	if (stage.fixedProgress !== undefined) {
		return `${stage.label} 为固定节点，提交进度将锁定为 ${stage.fixedProgress}%。`;
	}
	return `${stage.label} 可在 ${projectProgressRange.value.min}% ~ ${projectProgressRange.value.max}% 之间调整进度。`;
});

const scopedEmployees = computed(() => {
	// 优先使用API数据
	const data = apiData.employees.length > 0 ? apiData.employees : employees;
	if (currentRole.value === ROLE_ENUM.ADMIN) {
		return data;
	}
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return data.filter((item) => item.department === currentUser.value.department);
	}
	return data.filter((item) => item.id === currentUser.value.id);
});

const scopedProjects = computed(() => {
	// 优先使用API数据
	const data = apiData.projects.length > 0 ? apiData.projects : projects;
	if (currentRole.value === ROLE_ENUM.ADMIN) {
		return data;
	}
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return data.filter((item) => item.department === currentUser.value.department);
	}
	return data.filter((item) => item.executor === currentUser.value.name);
});

const scopedReports = computed(() => {
	// 优先使用API数据
	const data = apiData.reports.length > 0 ? apiData.reports : reports;
	if (currentRole.value === ROLE_ENUM.ADMIN) {
		return data;
	}
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return data.filter((item) => item.department === currentUser.value.department);
	}
	return data.filter((item) => item.employeeId === currentUser.value.id);
});
const selectedReportDepartment = computed(() => {
	if (currentRole.value === ROLE_ENUM.MANAGER) return currentUser.value.department;
	if (currentRole.value === ROLE_ENUM.ADMIN) return reportFilters.department || '';
	return '';
});
const reportEligibleEmployees = computed(() => {
	if (currentRole.value === ROLE_ENUM.ADMIN) {
		return employees.filter((item) => {
			return [ROLE_ENUM.MANAGER, ROLE_ENUM.EMPLOYEE].includes(item.role)
				&& item.status !== '离职'
				&& (!selectedReportDepartment.value || item.department === selectedReportDepartment.value);
		});
	}
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return employees.filter((item) => {
			return [ROLE_ENUM.MANAGER, ROLE_ENUM.EMPLOYEE].includes(item.role)
				&& item.department === currentUser.value.department
				&& item.status !== '离职';
		});
	}
	return [currentUser.value];
});
const currentWeekDates = computed(() => {
	const today = normalizeDate(REPORT_RUNTIME_TODAY);
	const offset = (today.getDay() + 6) % 7;
	const startDate = new Date(today.getTime() - (offset * DAY_MS));
	return Array.from({ length: offset + 1 }, (_, index) => {
		return formatDate(new Date(startDate.getTime() + (index * DAY_MS)));
	});
});
const weeklyReportsInScope = computed(() => {
	return scopedReports.value.filter((item) => {
		return currentWeekDates.value.includes(item.submitDate)
			&& (!selectedReportDepartment.value || item.department === selectedReportDepartment.value);
	});
});
const reportMetricsScope = computed(() => {
	const keyword = reportFilters.keyword.trim().toLowerCase();
	const [startDate, endDate] = Array.isArray(reportFilters.dateRange) ? reportFilters.dateRange : [];
	return scopedReports.value
		.filter((item) => {
			const matchesKeyword = !keyword
				|| String(item.title || '').toLowerCase().includes(keyword)
				|| String(item.employeeName || '').toLowerCase().includes(keyword)
				|| String(item.relatedProject || '').toLowerCase().includes(keyword)
				|| String(item.workContent || item.content || '').toLowerCase().includes(keyword);
			const matchesDepartment = !reportFilters.department || item.department === reportFilters.department;
			const matchesDate = (!startDate || item.submitDate >= startDate) && (!endDate || item.submitDate <= endDate);
			return matchesKeyword && matchesDepartment && matchesDate;
		})
		.sort((a, b) => normalizeTimelineDate(b.submitTime || b.submitDate) - normalizeTimelineDate(a.submitTime || a.submitDate));
});
const filteredReports = computed(() => {
	if (!reportFilters.status) return reportMetricsScope.value;
	return reportMetricsScope.value.filter((item) => item.status === reportFilters.status);
});
const paginatedReports = computed(() => {
	const start = (reportTablePage.value - 1) * reportTablePageSize.value;
	return filteredReports.value.slice(start, start + reportTablePageSize.value);
});
const reportPendingCount = computed(() => reportMetricsScope.value.filter((item) => item.status === '已提交').length);
const reportCommentedCount = computed(() => reportMetricsScope.value.filter((item) => item.status === '已批注').length);
const reportTodayScope = computed(() => reportMetricsScope.value.filter((item) => item.submitDate === REPORT_RUNTIME_TODAY));
const todaySubmittedEmployeeCountInReports = computed(() => new Set(reportTodayScope.value.map((item) => item.employeeId)).size);
const reportWeeklySubmitRate = computed(() => {
	const expectedCount = reportEligibleEmployees.value.length * currentWeekDates.value.length;
	return toPercent(weeklyReportsInScope.value.length, expectedCount);
});
const currentEmployeeTodayReport = computed(() => {
	if (!canWriteReport.value) return null;
	return reports.find((item) => item.employeeId === currentUser.value.id && item.submitDate === REPORT_RUNTIME_TODAY) || null;
});
const reportSummaryCards = computed(() => {
	if (currentRole.value === ROLE_ENUM.EMPLOYEE) {
		return [
			{ key: 'today', label: '今日日报状态', value: currentEmployeeTodayReport.value ? currentEmployeeTodayReport.value.status : '待提交', hint: currentEmployeeTodayReport.value ? `已于 ${currentEmployeeTodayReport.value.submitTime} 提交，提交后不可修改` : '今天还没有提交日报' },
			{ key: 'history', label: '历史日报数', value: `${reportMetricsScope.value.length} 条`, hint: '仅展示当前员工可见的历史记录' },
			{ key: 'commented', label: '已批注日报', value: `${reportCommentedCount.value} 条`, hint: '主管批注后会在历史列表中同步显示' },
			{ key: 'rate', label: '本周提交率', value: `${reportWeeklySubmitRate.value}%`, hint: `按本周已过 ${currentWeekDates.value.length} 天统计提交情况` },
		];
	}
	return [
		{ key: 'today', label: '今日提交数', value: `${reportTodayScope.value.length} 条`, hint: `${todaySubmittedEmployeeCountInReports.value} 名员工今日已提交日报` },
		{ key: 'pending', label: '待批注', value: `${reportPendingCount.value} 条`, hint: '优先处理状态为已提交的日报' },
		{ key: 'commented', label: '已批注', value: `${reportCommentedCount.value} 条`, hint: '当前筛选范围内已完成批注的日报' },
		{ key: 'rate', label: '本周提交率', value: `${reportWeeklySubmitRate.value}%`, hint: `本周已提交 ${weeklyReportsInScope.value.length} / ${reportEligibleEmployees.value.length * currentWeekDates.value.length || 0} 次` },
	];
});
const reportTableTitle = computed(() => {
	if (currentRole.value === ROLE_ENUM.ADMIN) return '日报列表';
	if (currentRole.value === ROLE_ENUM.MANAGER) return '部门日报列表';
	return '我的日报记录';
});
const reportPrimaryActionLabel = computed(() => currentEmployeeTodayReport.value ? '今日日报已提交' : '写今日日报');

const dashboardTodayLabel = computed(() => DASHBOARD_TODAY);
const overviewRangeDays = computed(() => {
	if (overviewRange.value === '30d') return 30;
	if (overviewRange.value === 'month') return 31;
	return 7;
});
const overviewRangeLabel = computed(() => {
	const option = overviewRangeOptions.find((item) => item.value === overviewRange.value);
	return option?.label || '近 7 天';
});
const reportsInRange = computed(() => scopedReports.value.filter((item) => isWithinDays(item.submitDate, overviewRangeDays.value)));
const submittedEmployeeIdsToday = computed(() => {
	return new Set(
		scopedReports.value
			.filter((item) => item.submitDate === DASHBOARD_TODAY)
			.map((item) => item.employeeId)
	);
});
const todaySubmittedReportsCount = computed(() => submittedEmployeeIdsToday.value.size);
const todayReportRate = computed(() => toPercent(todaySubmittedReportsCount.value, scopedEmployees.value.length));
const pendingReviewProjects = computed(() => scopedProjects.value.filter((item) => item.status === '待审核'));
const activeProjects = computed(() => scopedProjects.value.filter((item) => item.status === '进行中'));
const completedProjects = computed(() => scopedProjects.value.filter((item) => item.status === '已完成'));
const averageProjectProgress = computed(() => {
	if (!scopedProjects.value.length) return 0;
	const total = scopedProjects.value.reduce((sum, item) => sum + Number(item.progress || 0), 0);
	return Math.round(total / scopedProjects.value.length);
});
const projectStatusItems = computed(() => {
	const total = scopedProjects.value.length;
	return [
				{ key: 'pending', label: '待审核', count: pendingReviewProjects.value.length, color: '#f59e0b', percent: toPercent(pendingReviewProjects.value.length, total) },
				{ key: 'active', label: '进行中', count: activeProjects.value.length, color: '#0ea5e9', percent: toPercent(activeProjects.value.length, total) },
				{ key: 'completed', label: '已完成', count: completedProjects.value.length, color: '#10b981', percent: toPercent(completedProjects.value.length, total) },
	];
});
const upcomingProjects = computed(() => {
	const projects = scopedProjects.value
		.filter((item) => item.status !== '已完成')
		.filter((item) => {
			const diff = getDaysDiff(item.deadline);
			return diff >= 0 && diff <= 7;
		})
		.sort((a, b) => getDaysDiff(a.deadline) - getDaysDiff(b.deadline));
	return prioritizeFocusedItems(projects, focusState.upcomingProjectIds, (item) => item.id);
});
const visibleUpcomingProjects = computed(() => upcomingProjects.value.slice(0, UPCOMING_PROJECT_VISIBLE_COUNT));
const upcomingProjectsTag = computed(() => {
	if (upcomingProjects.value.length <= UPCOMING_PROJECT_VISIBLE_COUNT) {
		return `${upcomingProjects.value.length} 个`;
	}
	return `${UPCOMING_PROJECT_VISIBLE_COUNT} / ${upcomingProjects.value.length} 个`;
});
const departmentEmployeeStats = computed(() => {
	const total = employees.length;
	return departments
		.map((department) => {
			const count = employees.filter((item) => item.department === department).length;
			return {
				department,
				count,
				percent: toPercent(count, total),
			};
		})
		.filter((item) => item.count > 0);
});
const personalReportStats = computed(() => {
	const submittedDays = new Set(reportsInRange.value.map((item) => item.submitDate)).size;
	const totalDays = overviewRangeDays.value;
	const pendingDays = Math.max(totalDays - submittedDays, 0);
	return {
		submittedDays,
		pendingDays,
		todayStatus: todaySubmittedReportsCount.value > 0 ? '已提交' : '待提交',
		rate: toPercent(submittedDays, totalDays),
	};
});
const trendDates = computed(() => buildDateRange(overviewRangeDays.value));
const newProjectTrend = computed(() => {
	const countMap = new Map(trendDates.value.map((date) => [date, 0]));
	scopedProjects.value.forEach((project) => {
		if (!countMap.has(project.createdAt)) return;
		countMap.set(project.createdAt, (countMap.get(project.createdAt) || 0) + 1);
	});
	let runningTotal = 0;
	const counts = trendDates.value.map((date) => {
		const value = countMap.get(date) || 0;
		runningTotal += value;
		return value;
	});
	let cumulative = 0;
	const cumulativeCounts = counts.map((value) => {
		cumulative += value;
		return cumulative;
	});
	return {
		labels: trendDates.value.map((date) => formatShortDate(date)),
		counts,
		cumulativeCounts,
	};
});
const progressTrend = computed(() => {
	const updateCountMap = new Map(trendDates.value.map((date) => [date, 0]));
	const progressSumMap = new Map(trendDates.value.map((date) => [date, 0]));
	scopedProjects.value.forEach((project) => {
		(project.progressHistory || []).forEach((record) => {
			if (!updateCountMap.has(record.date)) return;
			updateCountMap.set(record.date, (updateCountMap.get(record.date) || 0) + 1);
			progressSumMap.set(record.date, (progressSumMap.get(record.date) || 0) + Number(record.progress || 0));
		});
	});
	const updateCounts = trendDates.value.map((date) => updateCountMap.get(date) || 0);
	const averageProgress = trendDates.value.map((date) => {
		const count = updateCountMap.get(date) || 0;
		if (!count) return 0;
		return Math.round((progressSumMap.get(date) || 0) / count);
	});
	return {
		labels: trendDates.value.map((date) => formatShortDate(date)),
		updateCounts,
		averageProgress,
	};
});
const projectTrendDescription = computed(() => {
	if (projectTrendMode.value === 'new') {
		return `${overviewRangeLabel.value}内按日期统计新增项目数量，折线同步展示累计新增项目变化。`;
	}
	return `${overviewRangeLabel.value}内按日期统计项目推进次数，折线同步展示当日平均推进进度。`;
});
const overviewSummaryCards = computed(() => {
	if (currentRole.value === ROLE_ENUM.ADMIN) {
		return [
			{ key: 'employees', label: '员工总数', value: `${scopedEmployees.value.length} 人`, hint: `覆盖 ${departments.length} 个部门的测试样本` },
			{ key: 'projects', label: '项目总数', value: `${scopedProjects.value.length} 个`, hint: `其中 ${pendingReviewProjects.value.length} 个待审核项目` },
			{ key: 'active', label: '进行中项目', value: `${activeProjects.value.length} 个`, hint: `未来 7 天内 ${upcomingProjects.value.length} 个项目到期` },
			{ key: 'reports', label: '今日日报提交率', value: `${todayReportRate.value}%`, hint: `${todaySubmittedReportsCount.value} / ${scopedEmployees.value.length || 0} 人已提交日报` },
		];
	}
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return [
			{ key: 'employees', label: '部门员工数', value: `${scopedEmployees.value.length} 人`, hint: `当前部门：${currentUser.value.department}` },
			{ key: 'projects', label: '部门项目数', value: `${scopedProjects.value.length} 个`, hint: `本部门有 ${pendingReviewProjects.value.length} 个待审核项目` },
			{ key: 'completion', label: '项目完成率', value: `${toPercent(completedProjects.value.length, scopedProjects.value.length)}%`, hint: `${completedProjects.value.length} / ${scopedProjects.value.length || 0} 个项目已完成` },
			{ key: 'reports', label: '部门日报提交率', value: `${todayReportRate.value}%`, hint: `${todaySubmittedReportsCount.value} / ${scopedEmployees.value.length || 0} 人今日已提交日报` },
		];
	}
	return [
		{ key: 'projects', label: '我的项目数', value: `${scopedProjects.value.length} 个`, hint: `未来 7 天内 ${upcomingProjects.value.length} 个项目到期` },
		{ key: 'completed', label: '已完成项目', value: `${completedProjects.value.length} 个`, hint: `当前可见项目平均进度 ${averageProjectProgress.value}%` },
		{ key: 'reports', label: `${overviewRangeLabel.value}日报数`, value: `${reportsInRange.value.length} 条`, hint: `${personalReportStats.value.todayStatus} / 已提交 ${personalReportStats.value.submittedDays} 天` },
		{ key: 'rate', label: '个人提交率', value: `${personalReportStats.value.rate}%`, hint: `按 ${overviewRangeLabel.value} 统计日报提交情况` },
	];
});
const projectSummaryCards = computed(() => {
	if (currentRole.value === ROLE_ENUM.ADMIN) {
		return [
			{ key: 'total', label: '全部项目', value: `${filteredProjects.value.length} 个`, hint: `当前筛选结果覆盖 ${filteredProjects.value.length} 个项目` },
			{ key: 'pending', label: '待审核项目', value: `${filteredPendingReviewProjects.value.length} 个`, hint: '管理员可直接跨部门审核完成项目' },
			{ key: 'active', label: '进行中项目', value: `${filteredActiveProjects.value.length} 个`, hint: `当前筛选结果中 ${filteredUpcomingProjects.value.length} 个项目 7 天内到期` },
			{ key: 'completed', label: '已完成项目', value: `${filteredCompletedProjects.value.length} 个`, hint: `当前筛选项目平均进度 ${filteredAverageProjectProgress.value}%` },
		];
	}
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return [
			{ key: 'total', label: '本部门项目', value: `${filteredProjects.value.length} 个`, hint: `当前部门：${currentUser.value.department}` },
			{ key: 'pending', label: '待审核项目', value: `${filteredPendingReviewProjects.value.length} 个`, hint: '待管理员最终审核通过后才会结束任务' },
			{ key: 'active', label: '进行中项目', value: `${filteredActiveProjects.value.length} 个`, hint: `${availableProjectExecutors.value.length} 名可分配执行员工` },
			{ key: 'completed', label: '完成率', value: `${toPercent(filteredCompletedProjects.value.length, filteredProjects.value.length)}%`, hint: `${filteredCompletedProjects.value.length} / ${filteredProjects.value.length || 0} 个项目已完成` },
		];
	}
	return [
		{ key: 'total', label: '我的项目', value: `${filteredProjects.value.length} 个`, hint: `其中 ${filteredPendingReviewProjects.value.length} 个等待管理员审核` },
		{ key: 'active', label: '进行中项目', value: `${filteredActiveProjects.value.length} 个`, hint: '可继续提交阶段性进度' },
		{ key: 'completed', label: '已完成项目', value: `${filteredCompletedProjects.value.length} 个`, hint: `当前平均进度 ${filteredAverageProjectProgress.value}%` },
		{ key: 'upcoming', label: '即将到期', value: `${filteredUpcomingProjects.value.length} 个`, hint: '重点关注本周截止项目' },
	];
});
const summaryCards = computed(() => [
	{
		key: 'employees',
		label: '员工样本',
		value: `${scopedEmployees.value.length} 人`,
		hint: currentRole.value === ROLE_ENUM.ADMIN ? '当前角色可查看全部员工数据' : currentRole.value === ROLE_ENUM.MANAGER ? '当前角色仅查看本部门员工数据' : '当前角色仅查看本人数据',
	},
	{
		key: 'projects',
		label: '项目样本',
		value: `${scopedProjects.value.length} 个`,
		hint: currentRole.value === ROLE_ENUM.ADMIN ? '当前角色可查看全部项目数据' : currentRole.value === ROLE_ENUM.MANAGER ? '当前角色仅查看本部门项目数据' : '当前角色仅查看我的项目数据',
	},
	{
		key: 'reports',
		label: '日报样本',
		value: `${scopedReports.value.length} 条`,
		hint: currentRole.value === ROLE_ENUM.ADMIN ? '当前角色可查看全部日报数据' : currentRole.value === ROLE_ENUM.MANAGER ? '当前角色仅查看本部门日报数据' : '当前角色仅查看我的日报数据',
	},
	{
		key: 'sections',
		label: '可见菜单',
		value: `${visibleSections.value.length} 项`,
		hint: '作为节点 2 的权限切换展示基础',
	},
]);
const currentRoleSummary = computed(() => `${roleLabelMap[currentRole.value]}视角`);
const projectTimelineEntries = computed(() => {
	if (!currentProjectDetail.value) return [];
	return buildProjectTimeline(currentProjectDetail.value);
});

const adminProgressFeed = computed(() => {
	const feed = scopedProjects.value
		.flatMap((project) => buildProjectProgressFeedEntries(project).map((item) => ({
			...item,
			projectId: project.id,
			projectName: project.projectName,
			department: project.department,
			operator: item.operator || project.executor,
		})))
		.sort((a, b) => normalizeTimelineDate(b.date) - normalizeTimelineDate(a.date));
	return prioritizeFocusedItems(feed, focusState.adminProgressFeedIds, getAdminProgressFeedItemKey);
});
const visibleAdminProgressFeed = computed(() => {
	return adminProgressFeed.value.slice(0, ADMIN_PROGRESS_FEED_VISIBLE_COUNT);
});
const adminProgressFeedWindowStyle = computed(() => {
	const visibleCount = Math.min(Math.max(visibleAdminProgressFeed.value.length, 1), ADMIN_PROGRESS_FEED_VISIBLE_COUNT);
	const windowHeight = (visibleCount * ADMIN_PROGRESS_FEED_ROW_HEIGHT) + ((visibleCount - 1) * ADMIN_PROGRESS_FEED_GAP);
	return {
		'--progress-feed-window-height': `${windowHeight}px`,
		'--progress-feed-scroll-distance': `${ADMIN_PROGRESS_FEED_ROW_HEIGHT + ADMIN_PROGRESS_FEED_GAP}px`,
	};
});
const adminProgressFeedTag = computed(() => {
	if (!adminProgressFeed.value.length) return '暂无消息';
	return adminProgressFeed.value.length <= ADMIN_PROGRESS_FEED_VISIBLE_COUNT
		? `最新 ${adminProgressFeed.value.length} 条`
		: `最新 ${ADMIN_PROGRESS_FEED_VISIBLE_COUNT} / ${adminProgressFeed.value.length}`;
});

const employeePreview = computed(() => scopedEmployees.value.slice(0, 3));
const projectPreview = computed(() => scopedProjects.value.slice(0, 3));
const reportPreview = computed(() => scopedReports.value.slice(0, 3));
const quickActions = computed(() => {
	if (currentRole.value === ROLE_ENUM.ADMIN) {
		return [
			{ key: 'employees', title: '查看员工管理', description: '进入员工页继续补齐新增、编辑与删除流程。', cta: '打开员工管理', target: 'employees' },
			{ key: 'projects', title: '查看项目管理', description: '切换到项目页查看下发、审核和详情闭环。', cta: '打开项目管理', target: 'projects' },
			{ key: 'reports', title: '查看日报管理', description: '进入日报页查看全量日报、详情与部门批注情况。', cta: '打开日报管理', target: 'reports' },
		];
	}
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return [
			{ key: 'projects', title: '查看部门项目', description: '继续处理本部门项目下发、进度与审核流程。', cta: '打开项目', target: 'projects' },
			{ key: 'employees', title: '查看部门成员', description: '进入员工页查看本部门员工列表与筛选。', cta: '打开员工', target: 'employees' },
			{ key: 'reports', title: '查看部门日报', description: '进入日报页集中处理本部门待批注日报。', cta: '打开日报', target: 'reports' },
		];
	}
	return [
		{ key: 'projects', title: '查看我的项目', description: '进入项目页查看我的任务、进度和截止时间。', cta: '打开项目', target: 'projects' },
		{ key: 'reports', title: '填写日报', description: '进入日报页提交今日日报，并查看历史批注。', cta: '打开日报', target: 'reports' },
		{ key: 'settings', title: '查看个人设置', description: '进入个人设置页准备后续修改头像和联系方式。', cta: '打开设置', target: 'settings' },
	];
});
const statusTagTypeMap = {
	待审核: 'warning',
	进行中: 'primary',
	已完成: 'success',
};
const priorityTagTypeMap = {
	高: 'danger',
	中: 'warning',
	低: 'info',
};
const reportStatusTagTypeMap = {
	已提交: 'warning',
	已批注: 'success',
};
const employeeStatusTagTypeMap = {
	在职: 'success',
	试用: 'warning',
	离职: 'info',
};

watch(currentRole, (nextRole) => {
	writePersistedRole(nextRole);
	triggerSectionLoading();
	if (!visibleSections.value.some((item) => item.key === activeSection.value)) {
		activeSection.value = visibleSections.value[0]?.key || 'overview';
	}
	employeeFilters.department = currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '';
	employeeTablePage.value = 1;
	projectFilters.department = currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '';
	projectTablePage.value = 1;
	reportFilters.department = currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '';
	reportFilters.keyword = '';
	reportFilters.status = '';
	reportFilters.dateRange = [];
	reportTablePage.value = 1;
	projectDetailVisible.value = false;
	projectFormVisible.value = false;
	projectProgressVisible.value = false;
	reportDetailVisible.value = false;
	reportFormVisible.value = false;
	reportCommentVisible.value = false;
	activeProjectId.value = '';
	activeReportId.value = '';
});

watch(
	() => [employeeFilters.keyword, employeeFilters.department, employeeFilters.status, currentRole.value].join('|'),
	() => {
		employeeTablePage.value = 1;
	}
);
watch(
	() => [projectFilters.keyword, projectFilters.department, projectFilters.status, projectFilters.priority, projectFilters.progress, currentRole.value].join('|'),
	() => {
		projectTablePage.value = 1;
	}
);
watch(
	() => [reportFilters.keyword, reportFilters.department, reportFilters.status, JSON.stringify(reportFilters.dateRange || []), currentRole.value].join('|'),
	() => {
		reportTablePage.value = 1;
	}
);
watch(
	() => [projectProgressForm.stageKey, projectProgressBaseline.value].join('|'),
	() => {
		applyProjectStageProgressPreset();
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
	() => JSON.stringify({
		visible: reportFormVisible.value,
		canWrite: canWriteReport.value,
		userId: currentUser.value.id,
		date: reportForm.date,
		title: reportForm.title,
		relatedProjectId: reportForm.relatedProjectId,
		workContent: reportForm.workContent,
		tomorrowPlan: reportForm.tomorrowPlan,
		problems: reportForm.problems,
		attachmentNames: extractUploadFileNames(reportForm.attachmentFiles),
	}),
	() => {
		if (!reportFormVisible.value || !canWriteReport.value) return;
		writePersistedReportDraft(currentUser.value.id, buildReportDraftPayload());
	}
);
watch(
	() => currentEmployeeTodayReport.value?.id || '',
	(nextId) => {
		if (!nextId) return;
		clearPersistedReportDraft(currentUser.value.id, REPORT_RUNTIME_TODAY);
	}
);
watch(
	() => `${currentRole.value}|${currentUser.value.id}|${currentUser.value.phone}|${currentUser.value.email}`,
	() => {
		syncSettingsAvatarState(currentUser.value.id);
		resetSettingsForm();
	},
	{ immediate: true }
);

watch(
	[
		() => activeSection.value,
		() => sectionLoading.value,
		() => currentRole.value,
		() => overviewRange.value,
		() => projectTrendMode.value,
		() => props.active,
		scopedProjects,
		scopedEmployees,
		scopedReports,
		departmentEmployeeStats,
		personalReportStats,
	],
	() => {
		scheduleChartsRender();
	},
	{ deep: true, flush: 'post' }
);

onMounted(() => {
	// 调用真实用户接口，失败时静默降级到模拟数据
	fetchCurrentUserApi();
	// 初始化API数据（字典、部门等基础数据）
	initializeApiData();
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		employeeFilters.department = currentUser.value.department;
		projectFilters.department = currentUser.value.department;
		reportFilters.department = currentUser.value.department;
	}
	window.addEventListener('resize', resizeOverviewCharts);
	scheduleChartsRender();
	loadPersonalCenterFocusState();
});

onBeforeUnmount(() => {
	if (sectionLoadingTimer) {
		window.clearTimeout(sectionLoadingTimer);
		sectionLoadingTimer = null;
	}
	window.removeEventListener('resize', resizeOverviewCharts);
	disposeOverviewCharts();
});

function handleSectionSelect(key) {
	if (key === activeSection.value) return;
	triggerSectionLoading();
	activeSection.value = key;
}

function triggerSectionLoading(duration = 180) {
	if (sectionLoadingTimer) {
		window.clearTimeout(sectionLoadingTimer);
	}
	sectionLoading.value = true;
	sectionLoadingTimer = window.setTimeout(() => {
		sectionLoading.value = false;
		sectionLoadingTimer = null;
	}, duration);
}

function resetEmployeeFilters() {
	employeeFilters.keyword = '';
	employeeFilters.status = '';
	employeeFilters.department = currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '';
}

function resetSettingsForm() {
	Object.assign(settingsForm, {
		phone: currentUser.value.phone || '',
		email: currentUser.value.email || '',
	});
	nextTick(() => {
		settingsFormRef.value?.clearValidate();
	});
}

function openDepartmentDialog() {
	departmentForm.name = '';
	departmentDialogVisible.value = true;
	nextTick(() => {
		departmentFormRef.value?.clearValidate();
	});
}

function openCreateEmployeeDialog() {
	employeeDialogMode.value = 'create';
	resetEmployeeForm();
	// 部门主管新增员工时，角色强制为员工
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		employeeForm.role = 'employee';
		employeeForm.roleName = '员工';
	}
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
		// 获取部门ID
		let departmentId = '';
		if (currentRole.value === ROLE_ENUM.MANAGER) {
			const dept = apiData.departments.find(d => d.name === currentUser.value.department);
			departmentId = dept?.id || '';
		} else {
			const dept = apiData.departments.find(d => d.name === employeeForm.department);
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
					department: safeGet(res.data.department, currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : employeeForm.department),
					position: safeGet(res.data.position, employeeForm.position.trim()),
					phone: safeGet(res.data.phone, employeeForm.phone.trim()),
					email: safeGet(res.data.email, employeeForm.email.trim()),
					status: safeGet(res.data.status, employeeForm.status),
					createdAt: safeGet(res.data.createdAt, `${DASHBOARD_TODAY} 10:00`),
				};
				employees.unshift(newEmployee);
				if (apiData.employees.length > 0) {
					apiData.employees.unshift(newEmployee);
				}
				ElMessage.success('员工新增成功');
			} else {
				ElMessage.error(res?.message || '员工新增失败');
			}
		} catch (err) {
			ElMessage.error(err?.message || '员工新增失败');
		}
	} else {
		// 编辑员工
		let departmentId = '';
		if (currentRole.value === ROLE_ENUM.MANAGER) {
			const dept = apiData.departments.find(d => d.name === currentUser.value.department);
			departmentId = dept?.id || '';
		} else {
			const dept = apiData.departments.find(d => d.name === employeeForm.department);
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
				const target = employees.find((item) => item.id === employeeForm.id);
				if (target) {
					Object.assign(target, {
						name: safeGet(res.data.name, employeeForm.name.trim()),
						phone: safeGet(res.data.phone, employeeForm.phone.trim()),
						email: safeGet(res.data.email, employeeForm.email.trim()),
						department: safeGet(res.data.department, currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : employeeForm.department),
						position: safeGet(res.data.position, employeeForm.position.trim()),
						status: safeGet(res.data.status, employeeForm.status),
						role: safeGet(res.data.role, employeeForm.role),
						roleName: safeGet(res.data.roleName, employeeForm.roleName),
					});
				}
				ElMessage.success('员工信息已更新');
			} else {
				// 降级到本地更新
				const target = employees.find((item) => item.id === employeeForm.id);
				if (target) {
					Object.assign(target, {
						name: employeeForm.name.trim(),
						phone: employeeForm.phone.trim(),
						email: employeeForm.email.trim(),
						department: currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : employeeForm.department,
						position: employeeForm.position.trim(),
						status: employeeForm.status,
						role: employeeForm.role,
						roleName: employeeForm.roleName,
					});
				}
				ElMessage.success('员工信息已更新（本地）');
			}
		} catch {
			// 降级到本地更新
			const target = employees.find((item) => item.id === employeeForm.id);
			if (target) {
				Object.assign(target, {
					name: employeeForm.name.trim(),
					phone: employeeForm.phone.trim(),
					email: employeeForm.email.trim(),
					department: currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : employeeForm.department,
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
			apiData.departments.push(newDept);
			departments.push(newDept.name);
		} else {
			departments.push(nextDepartmentName);
		}
	} catch {
		departments.push(nextDepartmentName);
	}

	if (!employeeForm.department) {
		employeeForm.department = nextDepartmentName;
	}
	departmentDialogVisible.value = false;
	departmentForm.name = '';
	ElMessage.success('部门新增成功');
}

async function submitSettingsForm() {
	if (!settingsFormRef.value) return;
	await settingsFormRef.value.validate();

	const payload = {
		phone: settingsForm.phone.trim(),
		email: settingsForm.email.trim(),
	};

	try {
		const res = await updateSettings(payload);
		if (res && res.code === 0 && res.data) {
			currentUserApiData.value.phone = safeGet(res.data.phone, settingsForm.phone.trim());
			currentUserApiData.value.email = safeGet(res.data.email, settingsForm.email.trim());
			ElMessage.success('个人设置已保存');
		} else {
			// 降级到本地更新
			const target = employees.find((item) => item.id === currentUser.value.id);
			if (target) {
				target.phone = settingsForm.phone.trim();
				target.email = settingsForm.email.trim();
			}
			ElMessage.success('个人设置已保存（本地）');
		}
	} catch {
		// 降级到本地更新
		const target = employees.find((item) => item.id === currentUser.value.id);
		if (target) {
			target.phone = settingsForm.phone.trim();
			target.email = settingsForm.email.trim();
		}
		ElMessage.success('个人设置已保存（本地）');
	}
}

async function handleSettingsAvatarChange(uploadFile) {
	const rawFile = uploadFile?.raw || uploadFile;
	if (!rawFile) return;
	const isAllowedType = /^image\/(jpeg|png|gif)$/.test(String(rawFile.type || ''));
	if (!isAllowedType) {
		ElMessage.warning('头像仅支持 jpg、png、gif 格式');
		return;
	}
	if (Number(rawFile.size || 0) > 2 * 1024 * 1024) {
		ElMessage.warning('头像大小不能超过 2MB');
		return;
	}
	try {
		const formData = new FormData();
		formData.append('file', rawFile);
		const res = await apiUploadAvatar(formData);
		if (res && res.code === 0 && res.data?.avatarUrl) {
			currentUserApiData.value.avatarUrl = res.data.avatarUrl;
			writePersistedSettingsAvatar(currentUser.value.id, res.data.avatarUrl);
			ElMessage.success('头像已更新');
		} else {
			// 降级到本地预览
			const dataUrl = await readFileAsDataUrl(rawFile);
			writePersistedSettingsAvatar(currentUser.value.id, dataUrl);
			ElMessage.success('头像已更新（本地预览）');
		}
	} catch {
		// 降级到本地预览
		try {
			const dataUrl = await readFileAsDataUrl(rawFile);
			writePersistedSettingsAvatar(currentUser.value.id, dataUrl);
			ElMessage.success('头像已更新（本地预览）');
		} catch {
			ElMessage.error('头像读取失败，请重试');
		}
	}
}

async function resetSettingsAvatar() {
	try {
		const res = await apiDeleteAvatar();
		if (res && res.code === 0) {
			currentUserApiData.value.avatarUrl = '';
		}
	} catch {
		// 静默失败
	}
	clearPersistedSettingsAvatar(currentUser.value.id);
	ElMessage.success('已恢复默认头像');
}

async function removeEmployee(employee) {
	if (isProtectedEmployee(employee)) return;

	try {
		await deleteEmployee(employee.id);
	} catch {
		// API失败时继续执行本地删除
	}

	const index = employees.findIndex((item) => item.id === employee.id);
	if (index >= 0) {
		employees.splice(index, 1);
		// 同时从API数据中删除
		const apiIndex = apiData.employees.findIndex((item) => item.id === employee.id);
		if (apiIndex >= 0) {
			apiData.employees.splice(apiIndex, 1);
		}
		ElMessage.success('员工已删除');
		if ((employeeTablePage.value - 1) * employeeTablePageSize.value >= filteredEmployees.value.length && employeeTablePage.value > 1) {
			employeeTablePage.value -= 1;
		}
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
		department: currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '',
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

function resetProjectFilters() {
	projectFilters.keyword = '';
	projectFilters.status = '';
	projectFilters.priority = '';
	projectFilters.progress = '';
	projectFilters.department = currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '';
}

function resetReportFilters() {
	reportFilters.keyword = '';
	reportFilters.status = '';
	reportFilters.department = currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '';
	reportFilters.dateRange = [];
}

function openProjectDetail(project) {
	activeProjectId.value = project.id;
	projectDetailVisible.value = true;
}

function openReportDetail(report) {
	if (!report?.id) return;
	activeReportId.value = report.id;
	reportDetailVisible.value = true;
}

function openProjectFromOverview(project) {
	if (!project?.id) return;
	activeSection.value = 'projects';
	projectTablePage.value = 1;
	nextTick(() => {
		openProjectDetail(project);
	});
}

function openCreateProjectDialog() {
	resetProjectForm();
	projectFormVisible.value = true;
}

function openReportEditor() {
	if (!canWriteReport.value) return;
	if (currentEmployeeTodayReport.value) {
		ElMessage.warning('今日日报已提交，提交后不能修改。');
		return;
	}
	activeReportId.value = '';
	resetReportForm();
	reportFormVisible.value = true;
}

function openProjectProgressDialog(project) {
	if (!canSubmitProjectProgress(project)) return;
	activeProjectId.value = project.id;
	resetProjectProgressForm(project);
	projectProgressVisible.value = true;
}

function openReportCommentDialog(report) {
	if (!canCommentReport(report)) return;
	activeReportId.value = report.id;
	resetReportCommentForm(report);
	reportDetailVisible.value = false;
	reportCommentVisible.value = true;
}

async function fetchCurrentUserApi() {
	try {
		const res = await getCurrentUser();
		if (res && res.code === 0 && res.data) {
			currentUserApiData.value = res.data;
		}
	} catch {
		// 接口失败时静默降级，currentUser computed 会自动返回模拟数据
	}
}

async function loadPersonalCenterFocusState() {
	try {
		const state = await getPersonalCenterFocusState();
		focusState.upcomingProjectIds = Array.isArray(state?.upcomingProjectIds) ? state.upcomingProjectIds.map((item) => String(item || '')).filter(Boolean) : [];
		focusState.adminProgressFeedIds = Array.isArray(state?.adminProgressFeedIds) ? state.adminProgressFeedIds.map((item) => String(item || '')).filter(Boolean) : [];
	} catch {
		focusState.upcomingProjectIds = [];
		focusState.adminProgressFeedIds = [];
	}
}

// ==================== API 数据加载函数 ====================

/**
 * 加载字典选项
 */
async function loadOptions() {
	if (apiDataLoaded.options) return;
	try {
		const res = await getOptions();
		if (res && res.code === 0 && res.data) {
			apiData.options = res.data;
		}
	} catch {
		// 静默失败
	} finally {
		apiDataLoaded.options = true;
	}
}

/**
 * 加载部门列表
 */
async function loadDepartments() {
	if (apiDataLoaded.departments) return;
	try {
		const res = await getDepartments();
		if (res && res.code === 0 && Array.isArray(res.data)) {
			apiData.departments = res.data.map(item => ({
				id: safeGet(item.id),
				name: safeGet(item.name),
				employeeCount: Number(item.employeeCount) || 0,
				managerId: safeGet(item.managerId),
				managerName: safeGet(item.managerName),
			}));
		}
	} catch {
		// 静默失败
	} finally {
		apiDataLoaded.departments = true;
	}
}

/**
 * 加载员工列表
 */
async function loadEmployees(params = {}) {
	try {
		const res = await getEmployees(params);
		if (res && res.code === 0 && res.data) {
			const items = safeArray(res.data.items || res.data);
			apiData.employees = items.map(item => ({
				id: safeGet(item.id),
				userName: safeGet(item.userName),
				name: safeGet(item.name),
				role: safeGet(item.role, 'employee'),
				roleName: safeGet(item.roleName),
				departmentId: safeGet(item.departmentId),
				department: safeGet(item.department),
				position: safeGet(item.position),
				phone: safeGet(item.phone),
				email: safeGet(item.email),
				status: safeGet(item.status, '在职'),
				createdAt: safeGet(item.createdAt),
				avatarUrl: safeGet(item.avatarUrl),
				canEdit: Boolean(item.canEdit),
				canDelete: Boolean(item.canDelete),
			}));
		}
	} catch {
		// 静默失败
	}
}

/**
 * 加载项目列表
 */
async function loadProjects(params = {}) {
	try {
		const res = await getProjects(params);
		if (res && res.code === 0 && res.data) {
			const items = safeArray(res.data.items || res.data);
			apiData.projects = items.map(item => ({
				id: safeGet(item.id),
				projectName: safeGet(item.projectName),
				customerName: safeGet(item.customerName),
				customerContact: safeGet(item.customerContact),
				departmentId: safeGet(item.departmentId),
				department: safeGet(item.department),
				leaderId: safeGet(item.leaderId),
				leader: safeGet(item.leader),
				executorId: safeGet(item.executorId),
				executor: safeGet(item.executor),
				createdAt: safeGet(item.createdAt),
				progress: Number(item.progress) || 0,
				currentStageKey: safeGet(item.currentStageKey),
				currentStage: safeGet(item.currentStage),
				status: safeGet(item.status, '进行中'),
				deadline: safeGet(item.deadline),
				daysLeft: Number(item.daysLeft) || 0,
				attachments: Number(item.attachments) || 0,
				priority: safeGet(item.priority, '中'),
				projectDesc: safeGet(item.projectDesc),
				canViewDetail: Boolean(item.canViewDetail),
				canSubmitProgress: Boolean(item.canSubmitProgress),
				canAudit: Boolean(item.canAudit),
				progressHistory: [],
				progressSubmissions: [],
				attachmentList: [],
			}));
		}
	} catch {
		// 静默失败
	}
}

/**
 * 加载日报列表
 */
async function loadReports(params = {}) {
	try {
		const res = await getReports(params);
		if (res && res.code === 0 && res.data) {
			const items = safeArray(res.data.items || res.data);
			apiData.reports = items.map(item => ({
				id: safeGet(item.id),
				title: safeGet(item.title),
				employeeId: safeGet(item.employeeId),
				employeeName: safeGet(item.employeeName),
				departmentId: safeGet(item.departmentId),
				department: safeGet(item.department),
				submitDate: safeGet(item.submitDate),
				submitTime: safeGet(item.submitTime),
				relatedProjectId: safeGet(item.relatedProjectId),
				relatedProject: safeGet(item.relatedProject),
				content: safeGet(item.content),
				workContent: safeGet(item.workContent),
				tomorrowPlan: safeGet(item.tomorrowPlan),
				problems: safeGet(item.problems),
				status: safeGet(item.status, '已提交'),
				leaderComment: safeGet(item.leaderComment),
				commentAuthor: safeGet(item.commentAuthor),
				commentTime: safeGet(item.commentTime),
				score: safeGet(item.score),
				canViewDetail: Boolean(item.canViewDetail),
				canComment: Boolean(item.canComment),
				attachmentList: [],
			}));
		}
	} catch {
		// 静默失败
	}
}

/**
 * 加载首页概览数据
 */
async function loadOverviewData(params = {}) {
	try {
		const res = await getOverview(params);
		if (res && res.code === 0 && res.data) {
			apiData.overview = res.data;
		}
	} catch {
		// 静默失败
	}
}

/**
 * 加载项目详情
 */
async function loadProjectDetail(projectId) {
	try {
		const res = await getProject(projectId);
		if (res && res.code === 0 && res.data) {
			const item = res.data;
			const detail = {
				id: safeGet(item.id),
				projectName: safeGet(item.projectName),
				customerName: safeGet(item.customerName),
				customerContact: safeGet(item.customerContact),
				departmentId: safeGet(item.departmentId),
				department: safeGet(item.department),
				leaderId: safeGet(item.leaderId),
				leader: safeGet(item.leader),
				executorId: safeGet(item.executorId),
				executor: safeGet(item.executor),
				createdAt: safeGet(item.createdAt),
				deadline: safeGet(item.deadline),
				priority: safeGet(item.priority, '中'),
				progress: Number(item.progress) || 0,
				currentStageKey: safeGet(item.currentStageKey),
				currentStage: safeGet(item.currentStage),
				status: safeGet(item.status, '进行中'),
				projectDesc: safeGet(item.projectDesc),
				attachments: safeArray(item.attachments).map(a => ({
					id: safeGet(a.id),
					fileName: safeGet(a.fileName),
					fileExt: safeGet(a.fileExt),
					url: safeGet(a.url),
				})),
				timeline: safeArray(item.timeline).map(t => ({
					id: safeGet(t.id),
					type: safeGet(t.type),
					title: safeGet(t.title),
					content: safeGet(t.content),
					operator: safeGet(t.operator),
					time: safeGet(t.time),
					stageKey: safeGet(t.stageKey),
					stageLabel: safeGet(t.stageLabel),
					progress: Number(t.progress) || 0,
					attachments: safeArray(t.attachments).map(a => ({
						id: safeGet(a.id),
						fileName: safeGet(a.fileName),
						url: safeGet(a.url),
					})),
				})),
				reportHistory: safeArray(item.reportHistory).map(r => ({
					id: safeGet(r.id),
					title: safeGet(r.title),
					employeeName: safeGet(r.employeeName),
					submitDate: safeGet(r.submitDate),
					status: safeGet(r.status),
					content: safeGet(r.content),
				})),
				canSubmitProgress: Boolean(item.canSubmitProgress),
				canAudit: Boolean(item.canAudit),
				attachmentList: [],
				progressHistory: [],
				progressSubmissions: [],
			};
			return detail;
		}
	} catch {
		// 静默失败
	}
	return null;
}

/**
 * 加载日报详情
 */
async function loadReportDetail(reportId) {
	try {
		const res = await getReport(reportId);
		if (res && res.code === 0 && res.data) {
			const item = res.data;
			return {
				id: safeGet(item.id),
				title: safeGet(item.title),
				employeeId: safeGet(item.employeeId),
				employeeName: safeGet(item.employeeName),
				departmentId: safeGet(item.departmentId),
				department: safeGet(item.department),
				submitDate: safeGet(item.submitDate),
				submitTime: safeGet(item.submitTime),
				relatedProjectId: safeGet(item.relatedProjectId),
				relatedProject: safeGet(item.relatedProject),
				workContent: safeGet(item.workContent),
				tomorrowPlan: safeGet(item.tomorrowPlan),
				problems: safeGet(item.problems),
				content: safeGet(item.content),
				status: safeGet(item.status, '已提交'),
				leaderComment: safeGet(item.leaderComment),
				commentAuthor: safeGet(item.commentAuthor),
				commentTime: safeGet(item.commentTime),
				score: safeGet(item.score),
				canComment: Boolean(item.canComment),
				attachments: safeArray(item.attachments).map(a => ({
					id: safeGet(a.id),
					fileName: safeGet(a.fileName),
					fileExt: safeGet(a.fileExt),
					url: safeGet(a.url),
				})),
			};
		}
	} catch {
		// 静默失败
	}
	return null;
}

/**
 * 加载可关联项目选项
 */
async function loadReportProjectOptions() {
	try {
		const res = await getReportProjectOptions();
		if (res && res.code === 0 && Array.isArray(res.data)) {
			return res.data.map(item => ({
				id: safeGet(item.id),
				projectName: safeGet(item.projectName),
				departmentId: safeGet(item.departmentId),
				department: safeGet(item.department),
				executorId: safeGet(item.executorId),
				executor: safeGet(item.executor),
				status: safeGet(item.status),
			}));
		}
	} catch {
		// 静默失败
	}
	return [];
}

/**
 * 加载个人设置
 */
async function loadSettings() {
	if (apiDataLoaded.settings) return;
	try {
		const res = await getSettings();
		if (res && res.code === 0 && res.data) {
			apiData.settings = res.data;
		}
	} catch {
		// 静默失败
	} finally {
		apiDataLoaded.settings = true;
	}
}

/**
 * 加载部门执行人选项
 */
async function loadDepartmentExecutors(departmentId, keyword = '') {
	try {
		const res = await getDepartmentExecutors(departmentId, { keyword });
		if (res && res.code === 0 && Array.isArray(res.data)) {
			return res.data.map(item => ({
				id: safeGet(item.id),
				name: safeGet(item.name),
				userName: safeGet(item.userName),
				departmentId: safeGet(item.departmentId),
				department: safeGet(item.department),
				position: safeGet(item.position),
				status: safeGet(item.status),
			}));
		}
	} catch {
		// 静默失败
	}
	return [];
}

/**
 * 初始化所有数据
 */
async function initializeApiData() {
	await Promise.all([
		loadOptions(),
		loadDepartments(),
	]);
}

function isUpcomingProjectFocused(project) {
	return Boolean(project?.id) && focusState.upcomingProjectIds.includes(String(project.id));
}

function isAdminProgressFeedFocused(item) {
	return Boolean(item) && focusState.adminProgressFeedIds.includes(getAdminProgressFeedItemKey(item));
}

async function toggleUpcomingProjectFocus(project) {
	const projectId = String(project?.id || '');
	if (!projectId) return;
	const nextIds = isUpcomingProjectFocused(project)
		? focusState.upcomingProjectIds.filter((item) => item !== projectId)
		: [...focusState.upcomingProjectIds, projectId];
	const nextState = await updatePersonalCenterFocusState({
		upcomingProjectIds: nextIds,
	});
	focusState.upcomingProjectIds = Array.isArray(nextState?.upcomingProjectIds) ? nextState.upcomingProjectIds.map((item) => String(item || '')).filter(Boolean) : [];
}

async function toggleAdminProgressFeedFocus(item) {
	const itemKey = getAdminProgressFeedItemKey(item);
	if (!itemKey) return;
	const nextIds = isAdminProgressFeedFocused(item)
		? focusState.adminProgressFeedIds.filter((current) => current !== itemKey)
		: [...focusState.adminProgressFeedIds, itemKey];
	const nextState = await updatePersonalCenterFocusState({
		adminProgressFeedIds: nextIds,
	});
	focusState.adminProgressFeedIds = Array.isArray(nextState?.adminProgressFeedIds) ? nextState.adminProgressFeedIds.map((item) => String(item || '')).filter(Boolean) : [];
}

function handleProjectDepartmentChange() {
	if (!availableProjectExecutors.value.some((item) => item.name === projectForm.executor)) {
		projectForm.executor = '';
	}
}

async function submitProjectForm() {
	if (!projectFormRef.value) return;
	await projectFormRef.value.validate();

	// 获取部门ID
	let departmentId = '';
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		const dept = apiData.departments.find(d => d.name === currentUser.value.department);
		departmentId = dept?.id || '';
	} else {
		const dept = apiData.departments.find(d => d.name === projectForm.department);
		departmentId = dept?.id || '';
	}

	// 获取执行人ID
	const executorId = availableProjectExecutors.value.find(e => e.name === projectForm.executor)?.id || '';

	const payload = {
		departmentId,
		customerName: projectForm.customerName.trim(),
		customerContact: projectForm.customerContact.trim(),
		projectName: projectForm.projectName.trim(),
		projectDesc: projectForm.projectDesc.trim(),
		executorId,
		deadline: projectForm.deadline,
		priority: projectForm.priority,
	};

	try {
		const res = await createProject(payload);
		if (res && res.code === 0 && res.data) {
			const newProject = {
				id: safeGet(res.data.id),
				projectName: safeGet(res.data.projectName),
				customerName: safeGet(res.data.customerName),
				customerContact: safeGet(res.data.customerContact),
				departmentId: safeGet(res.data.departmentId),
				department: safeGet(res.data.department),
				leaderId: safeGet(res.data.leaderId),
				leader: safeGet(res.data.leader),
				executorId: safeGet(res.data.executorId),
				executor: safeGet(res.data.executor),
				createdAt: safeGet(res.data.createdAt),
				progress: Number(res.data.progress) || 0,
				currentStageKey: safeGet(res.data.currentStageKey),
				currentStage: safeGet(res.data.currentStage),
				status: safeGet(res.data.status, '进行中'),
				deadline: safeGet(res.data.deadline),
				attachments: 0,
				priority: safeGet(res.data.priority, '中'),
				projectDesc: safeGet(res.data.projectDesc),
				attachmentList: [],
				progressHistory: [],
				progressSubmissions: [],
			};
			// 添加到模拟数据以保持UI一致
			projects.unshift(newProject);
			// 同时更新API数据
			if (apiData.projects.length > 0) {
				apiData.projects.unshift(newProject);
			}
			ElMessage.success('项目已下发');
		} else {
			ElMessage.error(res?.message || '项目下发失败');
		}
	} catch (err) {
		ElMessage.error(err?.message || '项目下发失败');
	}

	projectFormVisible.value = false;
	projectTablePage.value = 1;
	resetProjectForm();
}

async function submitProjectProgress() {
	if (!projectProgressFormRef.value) return;
	await projectProgressFormRef.value.validate();
	const target = progressTargetProject.value;
	if (!target || !canSubmitProjectProgress(target)) return;
	const stage = selectedProjectProgressStage.value;
	if (!stage) return;
	const nextProgress = Math.max(projectProgressBaseline.value, Number(projectProgressForm.progress || 0));
	const attachments = extractUploadFileNames(projectProgressForm.attachmentFiles);
	const submitTime = formatDateTime(new Date());

	const payload = {
		stageKey: stage.key,
		progress: nextProgress,
		content: projectProgressForm.content.trim(),
	};

	try {
		const res = await apiSubmitProjectProgress(target.id, payload);
		if (res && res.code === 0 && res.data) {
			// 更新项目数据
			const updatedProject = res.data.project || res.data;
			target.progress = Number(updatedProject.progress) || nextProgress;
			target.currentStageKey = safeGet(updatedProject.currentStageKey, stage.key);
			target.status = safeGet(updatedProject.status, stage.key === 'payment_received' ? '待审核' : '进行中');
			ElMessage.success(stage.key === 'payment_received' ? '已提交回款完成节点，等待管理员审核' : '项目进度已更新');
		} else {
			// 降级到模拟更新
			target.progress = nextProgress;
			target.currentStageKey = stage.key;
			target.status = stage.key === 'payment_received' ? '待审核' : '进行中';
			if (!Array.isArray(target.progressHistory)) {
				target.progressHistory = [];
			}
			target.progressHistory.push({
				date: DASHBOARD_TODAY,
				progress: nextProgress,
				stageKey: stage.key,
			});
			if (!Array.isArray(target.progressSubmissions)) {
				target.progressSubmissions = [];
			}
			target.progressSubmissions.unshift({
				id: `progress-${Date.now()}`,
				date: submitTime,
				stageKey: stage.key,
				stageLabel: stage.label,
				progress: nextProgress,
				content: projectProgressForm.content.trim(),
				operator: currentUser.value.name,
				attachments,
			});
			if (attachments.length) {
				target.attachmentList = [...getProjectAttachmentList(target), ...attachments];
				target.attachments = target.attachmentList.length;
			}
			ElMessage.success(stage.key === 'payment_received' ? '已提交回款完成节点，等待管理员审核' : '项目进度已更新');
		}
	} catch {
		// 降级到模拟更新
		target.progress = nextProgress;
		target.currentStageKey = stage.key;
		target.status = stage.key === 'payment_received' ? '待审核' : '进行中';
		if (!Array.isArray(target.progressHistory)) {
			target.progressHistory = [];
		}
		target.progressHistory.push({
			date: DASHBOARD_TODAY,
			progress: nextProgress,
			stageKey: stage.key,
		});
		if (!Array.isArray(target.progressSubmissions)) {
			target.progressSubmissions = [];
		}
		target.progressSubmissions.unshift({
			id: `progress-${Date.now()}`,
			date: submitTime,
			stageKey: stage.key,
			stageLabel: stage.label,
			progress: nextProgress,
			content: projectProgressForm.content.trim(),
			operator: currentUser.value.name,
			attachments,
		});
		if (attachments.length) {
			target.attachmentList = [...getProjectAttachmentList(target), ...attachments];
			target.attachments = target.attachmentList.length;
		}
		ElMessage.success(stage.key === 'payment_received' ? '已提交回款完成节点，等待管理员审核' : '项目进度已更新');
	}

	projectProgressVisible.value = false;
	resetProjectProgressForm();
}

async function approveProject(project) {
	if (!canAuditProject(project)) return;
	const target = projects.find((item) => item.id === project.id);
	if (!target) return;

	try {
		const res = await apiApproveProject(target.id);
		if (res && res.code === 0 && res.data) {
			target.status = safeGet(res.data.status, '已完成');
			target.progress = Number(res.data.progress) || 100;
			target.currentStageKey = safeGet(res.data.currentStageKey, 'payment_received');
			appendProjectAuditLog(target, '审核通过', '项目验收通过，状态已更新为已完成。');
			ElMessage.success('项目已审核通过');
		} else {
			// 降级到模拟更新
			target.status = '已完成';
			target.progress = 100;
			target.currentStageKey = 'payment_received';
			if (!Array.isArray(target.progressHistory)) {
				target.progressHistory = [];
			}
			const latestProgress = target.progressHistory[target.progressHistory.length - 1];
			if (!latestProgress || latestProgress.progress !== 100 || latestProgress.date !== DASHBOARD_TODAY) {
				target.progressHistory.push({ date: DASHBOARD_TODAY, progress: 100, stageKey: 'payment_received' });
			}
			appendProjectAuditLog(target, '审核通过', '项目验收通过，状态已更新为已完成。');
			ElMessage.success('项目已审核通过');
		}
	} catch {
		// 降级到模拟更新
		target.status = '已完成';
		target.progress = 100;
		target.currentStageKey = 'payment_received';
		if (!Array.isArray(target.progressHistory)) {
			target.progressHistory = [];
		}
		const latestProgress = target.progressHistory[target.progressHistory.length - 1];
		if (!latestProgress || latestProgress.progress !== 100 || latestProgress.date !== DASHBOARD_TODAY) {
			target.progressHistory.push({ date: DASHBOARD_TODAY, progress: 100, stageKey: 'payment_received' });
		}
		appendProjectAuditLog(target, '审核通过', '项目验收通过，状态已更新为已完成。');
		ElMessage.success('项目已审核通过');
	}
}

async function rejectProject(project) {
	if (!canAuditProject(project)) return;
	try {
		const { value } = await ElMessageBox.prompt('请填写驳回原因，员工将继续补充后再次提交。', '驳回项目', {
			confirmButtonText: '确认驳回',
			cancelButtonText: '取消',
			inputPlaceholder: '请输入驳回原因',
			inputValidator: (inputValue) => Boolean(String(inputValue || '').trim()) || '请填写驳回原因',
		});
		const target = projects.find((item) => item.id === project.id);
		if (!target) return;
		const rollbackStage = getProjectRejectRollbackStage(target);

		try {
			const res = await apiRejectProject(target.id, { reason: String(value).trim() });
			if (res && res.code === 0 && res.data) {
				target.status = safeGet(res.data.status, '进行中');
				target.progress = Number(res.data.progress) || rollbackStage.fixedProgress;
				target.currentStageKey = safeGet(res.data.currentStageKey, rollbackStage.key);
			} else {
				target.status = '进行中';
				target.progress = rollbackStage.fixedProgress;
				target.currentStageKey = rollbackStage.key;
			}
		} catch {
			target.status = '进行中';
			target.progress = rollbackStage.fixedProgress;
			target.currentStageKey = rollbackStage.key;
		}
		appendProjectAuditLog(target, '驳回', String(value).trim());
		ElMessage.warning('项目已驳回，待员工继续补充');
	} catch {
		// Ignore cancel.
	}
}

function getProjectRejectRollbackStage(project) {
	const hasPrepaymentBranch = [
		...(project?.progressSubmissions || []),
		...(project?.progressHistory || []),
	].some((item) => item?.stageKey === 'final_invoice_completed' || item?.stageKey === 'prepayment_received' || item?.stageKey === 'prepayment_invoice');
	return PROJECT_STAGE_DEFINITIONS.find((item) => item.key === (hasPrepaymentBranch ? 'final_invoice_completed' : 'invoice_completed'))
		|| PROJECT_STAGE_DEFINITIONS.find((item) => item.key === 'invoice_completed');
}

function canAuditProject(project) {
	if (!project || currentRole.value !== ROLE_ENUM.ADMIN) return false;
	return project.status === '待审核'
		&& Number(project.progress) >= 100
		&& getProjectCurrentStageKey(project) === 'payment_received'
		&& scopedProjects.value.some((item) => item.id === project.id);
}

function canSubmitProjectProgress(project) {
	if (!project || currentRole.value !== ROLE_ENUM.EMPLOYEE) return false;
	return project.executor === currentUser.value.name && project.status === '进行中';
}

function canCommentReport(report) {
	if (!report || currentRole.value !== ROLE_ENUM.MANAGER) return false;
	return report.department === currentUser.value.department;
}

function resetProjectForm() {
	Object.assign(projectForm, {
		department: currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '',
		customerName: '',
		customerContact: '',
		projectName: '',
		projectDesc: '',
		executor: '',
		deadline: '',
		priority: '中',
		attachmentFiles: [],
	});
	nextTick(() => {
		projectFormRef.value?.clearValidate();
	});
}

function resetProjectProgressForm(project = null) {
	const target = project || progressTargetProject.value;
	const defaultStageKey = getAvailableProjectStageOptions(target)[0]?.key || '';
	Object.assign(projectProgressForm, {
		projectId: target?.id || '',
		stageKey: defaultStageKey,
		progress: Number(target?.progress || 0),
		content: '',
		attachmentFiles: [],
	});
	applyProjectStageProgressPreset();
	nextTick(() => {
		projectProgressFormRef.value?.clearValidate();
	});
}

function resetReportForm(report = null) {
	const draft = !report && canWriteReport.value
		? readPersistedReportDraft(currentUser.value.id, REPORT_RUNTIME_TODAY)
		: null;
	Object.assign(reportForm, {
		id: report?.id || '',
		date: report?.submitDate || draft?.date || REPORT_RUNTIME_TODAY,
		title: report?.title || draft?.title || '',
		relatedProjectId: report?.relatedProjectId || draft?.relatedProjectId || '',
		workContent: report?.workContent || draft?.workContent || '',
		tomorrowPlan: report?.tomorrowPlan || draft?.tomorrowPlan || '',
		problems: report?.problems || draft?.problems || '',
		attachmentFiles: report
			? toUploadFileList(getReportAttachmentList(report))
			: toUploadFileList(draft?.attachmentNames || []),
	});
	nextTick(() => {
		reportFormRef.value?.clearValidate();
	});
}

function resetReportCommentForm(report = null) {
	Object.assign(reportCommentForm, {
		leaderComment: report?.leaderComment || '',
		score: report?.score || '',
	});
	nextTick(() => {
		reportCommentFormRef.value?.clearValidate();
	});
}

function applyProjectStageProgressPreset() {
	const stage = selectedProjectProgressStage.value;
	if (!stage) return;
	if (stage.fixedProgress !== undefined) {
		projectProgressForm.progress = stage.fixedProgress;
		return;
	}
	const baseline = projectProgressBaseline.value;
	const min = projectProgressRange.value.min;
	const max = projectProgressRange.value.max;
	if (baseline < min || baseline > max) {
		projectProgressForm.progress = min;
		return;
	}
	projectProgressForm.progress = Math.min(max, Math.max(min, Number(projectProgressForm.progress || baseline || min)));
}

function getProjectCurrentStageKey(project) {
	if (!project) return 'task_issued';
	if (project.currentStageKey) return project.currentStageKey;
	if (Number(project.progress) >= 100) return 'payment_received';
	if (Number(project.progress) >= 95) return 'final_invoice_completed';
	if (Number(project.progress) >= 90) return 'invoice_completed';
	if (Number(project.progress) >= 85) return 'prepayment_invoice';
	if (Number(project.progress) > 10) return 'task_execution';
	if (Number(project.progress) === 10) return 'contract_signed';
	return 'task_issued';
}

function getAvailableProjectStageOptions(project) {
	const currentStageKey = getProjectCurrentStageKey(project);
	switch (currentStageKey) {
	case 'task_issued':
		return getProjectStageDefinitionsByKeys(['contract_signed']);
	case 'contract_signed':
		return getProjectStageDefinitionsByKeys(['task_execution']);
	case 'task_execution':
		return getProjectStageDefinitionsByKeys(
			Number(project?.progress || 0) >= 80
				? ['task_execution', 'prepayment_invoice', 'invoice_completed']
				: ['task_execution']
		);
	case 'prepayment_invoice':
		return getProjectStageDefinitionsByKeys(['prepayment_received']);
	case 'prepayment_received':
		return getProjectStageDefinitionsByKeys(['final_invoice_completed']);
	case 'final_invoice_completed':
		return getProjectStageDefinitionsByKeys(['payment_received']);
	case 'invoice_completed':
		return getProjectStageDefinitionsByKeys(['payment_received']);
	case 'payment_received':
	default:
		return [];
	}
}

async function submitReportForm() {
	if (!reportFormRef.value || !canWriteReport.value) return;
	await reportFormRef.value.validate();
	const employeeId = currentUser.value.id;
	const existingSameDayReport = reports.find((item) => item.employeeId === employeeId && item.submitDate === reportForm.date);
	if (existingSameDayReport) {
		ElMessage.warning('每位员工当天只能提交 1 篇日报，且提交后不能修改。');
		return;
	}
	const attachmentList = extractUploadFileNames(reportForm.attachmentFiles);
	const title = reportForm.title.trim() || buildReportDefaultTitle(reportForm.date);

	const payload = {
		date: reportForm.date,
		title,
		relatedProjectId: reportForm.relatedProjectId || undefined,
		workContent: reportForm.workContent.trim(),
		tomorrowPlan: reportForm.tomorrowPlan.trim(),
		problems: reportForm.problems.trim(),
	};

	try {
		const res = await createReport(payload);
		if (res && res.code === 0 && res.data) {
			const newReport = {
				id: safeGet(res.data.id),
				title: safeGet(res.data.title, title),
				employeeId: safeGet(res.data.employeeId, employeeId),
				employeeName: safeGet(res.data.employeeName, currentUser.value.name),
				departmentId: safeGet(res.data.departmentId),
				department: safeGet(res.data.department, currentUser.value.department),
				submitDate: safeGet(res.data.submitDate, reportForm.date),
				submitTime: safeGet(res.data.submitTime, formatDateTime(new Date())),
				relatedProjectId: safeGet(res.data.relatedProjectId),
				relatedProject: safeGet(res.data.relatedProject, getProjectNameById(reportForm.relatedProjectId)),
				workContent: safeGet(res.data.workContent, reportForm.workContent.trim()),
				tomorrowPlan: safeGet(res.data.tomorrowPlan, reportForm.tomorrowPlan.trim()),
				problems: safeGet(res.data.problems, reportForm.problems.trim()),
				content: safeGet(res.data.content, buildReportSummary(reportForm.workContent)),
				attachmentList,
				status: safeGet(res.data.status, '已提交'),
				leaderComment: '',
				commentAuthor: '',
				commentTime: '',
				score: '',
			};
			reports.unshift(newReport);
			if (apiData.reports.length > 0) {
				apiData.reports.unshift(newReport);
			}
			ElMessage.success('日报已提交');
		} else {
			ElMessage.error(res?.message || '日报提交失败');
		}
	} catch (err) {
		ElMessage.error(err?.message || '日报提交失败');
	}

	clearPersistedReportDraft(employeeId, reportForm.date);
	reportFormVisible.value = false;
	resetReportForm();
	reportTablePage.value = 1;
}

async function submitReportComment() {
	if (!reportCommentFormRef.value) return;
	await reportCommentFormRef.value.validate();
	const target = currentReportDetail.value;
	if (!canCommentReport(target)) return;

	const payload = {
		leaderComment: reportCommentForm.leaderComment.trim(),
		score: reportCommentForm.score,
	};

	try {
		const res = await commentReport(target.id, payload);
		if (res && res.code === 0 && res.data) {
			Object.assign(target, {
				status: safeGet(res.data.status, '已批注'),
				leaderComment: safeGet(res.data.leaderComment, reportCommentForm.leaderComment.trim()),
				score: safeGet(res.data.score, reportCommentForm.score),
				commentAuthor: safeGet(res.data.commentAuthor, currentUser.value.name),
				commentTime: safeGet(res.data.commentTime, formatDateTime(new Date())),
			});
		} else {
			Object.assign(target, {
				status: '已批注',
				leaderComment: reportCommentForm.leaderComment.trim(),
				score: reportCommentForm.score,
				commentAuthor: currentUser.value.name,
				commentTime: formatDateTime(new Date()),
			});
		}
	} catch {
		Object.assign(target, {
			status: '已批注',
			leaderComment: reportCommentForm.leaderComment.trim(),
			score: reportCommentForm.score,
			commentAuthor: currentUser.value.name,
			commentTime: formatDateTime(new Date()),
		});
	}
	reportCommentVisible.value = false;
	resetReportCommentForm();
	ElMessage.success('批注已保存');
}

function getProjectStageDefinitionsByKeys(keys) {
	return keys
		.map((key) => PROJECT_STAGE_DEFINITIONS.find((item) => item.key === key))
		.filter(Boolean);
}

function getProjectStageLabel(stageKey) {
	return PROJECT_STAGE_DEFINITIONS.find((item) => item.key === stageKey)?.label || '';
}

function createProjectId() {
	const maxId = projects.reduce((max, item) => {
		const numeric = Number(String(item.id).replace('proj-', ''));
		return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
	}, 0);
	return `proj-${String(maxId + 1).padStart(3, '0')}`;
}

function createReportId() {
	const maxId = reports.reduce((max, item) => {
		const numeric = Number(String(item.id).replace('rep-', ''));
		return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
	}, 0);
	return `rep-${String(maxId + 1).padStart(3, '0')}`;
}

function buildReportDefaultTitle(dateString) {
	return `${dateString || REPORT_RUNTIME_TODAY} 日报`;
}

function buildReportSummary(content) {
	return String(content || '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 50);
}

function getProjectNameById(projectId) {
	if (!projectId) return '';
	return projects.find((item) => item.id === projectId)?.projectName || '';
}

function findDepartmentLeaderName(department) {
	if (!department) return currentUser.value.name;
	const manager = employees.find((item) => item.department === department && item.role === ROLE_ENUM.MANAGER);
	return manager?.name || currentUser.value.name;
}

function appendProjectAuditLog(project, action, comment) {
	if (!Array.isArray(project.auditLogs)) {
		project.auditLogs = [];
	}
	project.auditLogs.unshift({
		id: `audit-${Date.now()}`,
		action,
		date: `${DASHBOARD_TODAY} 19:00`,
		operator: currentUser.value.name,
		comment,
	});
}

function getProjectAttachmentList(project) {
	if (Array.isArray(project?.attachmentList) && project.attachmentList.length) {
		return project.attachmentList;
	}
	const count = Number(project?.attachments || 0);
	return count > 0
		? Array.from({ length: count }, (_, index) => `项目附件 ${index + 1}`)
		: [];
}

function getProjectAttachmentCount(project) {
	return getProjectAttachmentList(project).length;
}

function getReportAttachmentList(report) {
	return Array.isArray(report?.attachmentList) ? report.attachmentList : [];
}

function toUploadFileList(attachments) {
	return Array.isArray(attachments)
		? attachments.map((name, index) => ({
			name,
			uid: `${name}-${index}`,
			status: 'success',
		}))
		: [];
}

function parseAttachmentNames(text) {
	return String(text || '')
		.split(/[\r\n,，、]+/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function extractUploadFileNames(fileList) {
	return Array.isArray(fileList)
		? fileList
			.map((item) => String(item?.name || item?.raw?.name || '').trim())
			.filter(Boolean)
		: [];
}

function downloadProjectAttachment(project, attachmentName, sourceLabel = '项目附件') {
	if (!project || !attachmentName || typeof window === 'undefined') return;
	const safeName = ensureDownloadFileName(attachmentName);
	const fileContent = [
		`文件名称：${safeName}`,
		`所属项目：${project.projectName || '-'}`,
		`来源位置：${sourceLabel}`,
		`客户名称：${project.customerName || '-'}`,
		`执行人：${project.executor || '-'}`,
		`下载时间：${new Date().toLocaleString('zh-CN')}`,
		'',
		'当前为前端模拟下载文件，用于展示附件下载交互。',
	].join('\n');
	const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
	const objectUrl = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = objectUrl;
	link.download = safeName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(objectUrl);
	ElMessage.success(`已开始下载：${safeName}`);
}

function downloadAllProjectAttachments(project) {
	if (!project || typeof window === 'undefined') return;
	const attachments = getProjectAttachmentList(project);
	if (!attachments.length) return;
	const bundleName = ensureDownloadFileName(`${project.projectName || '项目附件'}-全部附件清单.txt`);
	const fileContent = [
		`打包名称：${bundleName}`,
		`所属项目：${project.projectName || '-'}`,
		`附件数量：${attachments.length}`,
		`客户名称：${project.customerName || '-'}`,
		`执行人：${project.executor || '-'}`,
		`下载时间：${new Date().toLocaleString('zh-CN')}`,
		'',
		'附件列表：',
		...attachments.map((attachment, index) => `${index + 1}. ${ensureDownloadFileName(attachment)}`),
		'',
		'当前为前端模拟打包下载，用于展示一键下载全部附件交互。',
	].join('\n');
	const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
	const objectUrl = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = objectUrl;
	link.download = bundleName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(objectUrl);
	ElMessage.success(`已开始下载全部附件，共 ${attachments.length} 项`);
}

function downloadReportAttachment(report, attachmentName) {
	if (!report || !attachmentName || typeof window === 'undefined') return;
	const safeName = ensureDownloadFileName(attachmentName);
	const fileContent = [
		`文件名称：${safeName}`,
		`日报标题：${report.title || '-'}`,
		`提交人：${report.employeeName || '-'}`,
		`提交日期：${report.submitDate || '-'}`,
		`关联项目：${report.relatedProject || '-'}`,
		`下载时间：${new Date().toLocaleString('zh-CN')}`,
		'',
		'当前为前端模拟下载文件，用于展示日报附件下载交互。',
	].join('\n');
	const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
	const objectUrl = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = objectUrl;
	link.download = safeName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(objectUrl);
	ElMessage.success(`已开始下载：${safeName}`);
}

function downloadAllReportAttachments(report) {
	if (!report || typeof window === 'undefined') return;
	const attachments = getReportAttachmentList(report);
	if (!attachments.length) return;
	const bundleName = ensureDownloadFileName(`${report.title || '日报附件'}-全部附件清单.txt`);
	const fileContent = [
		`打包名称：${bundleName}`,
		`日报标题：${report.title || '-'}`,
		`提交人：${report.employeeName || '-'}`,
		`提交日期：${report.submitDate || '-'}`,
		`关联项目：${report.relatedProject || '-'}`,
		`附件数量：${attachments.length}`,
		`下载时间：${new Date().toLocaleString('zh-CN')}`,
		'',
		'附件列表：',
		...attachments.map((attachment, index) => `${index + 1}. ${ensureDownloadFileName(attachment)}`),
		'',
		'当前为前端模拟打包下载，用于展示日报附件一键下载全部交互。',
	].join('\n');
	const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
	const objectUrl = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = objectUrl;
	link.download = bundleName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(objectUrl);
	ElMessage.success(`已开始下载全部附件，共 ${attachments.length} 项`);
}

function ensureDownloadFileName(fileName) {
	const normalized = String(fileName || '').trim() || '项目附件.txt';
	return /\.[a-z0-9]{1,10}$/i.test(normalized) ? normalized : `${normalized}.txt`;
}

function getProjectDescription(project) {
	if (!project) return '';
	if (project.projectDesc) return project.projectDesc;
	return `${project.customerName} 相关项目，当前由 ${project.executor} 执行，计划于 ${project.deadline} 前完成。`;
}

function buildProjectProgressFeedEntries(project) {
	if (Array.isArray(project.progressSubmissions) && project.progressSubmissions.length) {
		return project.progressSubmissions.map((item) => ({
			id: item.id,
			type: 'progress',
			typeLabel: '进度更新',
			color: '#f59e0b',
			title: `${item.stageLabel || getProjectStageLabel(item.stageKey) || '进度更新'} ${item.progress}%`,
			stageLabel: item.stageLabel || getProjectStageLabel(item.stageKey) || '进度更新',
			date: withTimelineTime(item.date, '18:00'),
			content: item.content || `项目推进到 ${item.progress}%`,
			operator: item.operator || project.executor,
			progress: Number(item.progress || 0),
			attachments: Array.isArray(item.attachments) ? item.attachments : [],
		}));
	}
	return (project.progressHistory || []).map((item, index, list) => {
		const fallbackHour = String(Math.max(9, 18 - (list.length - index - 1))).padStart(2, '0');
		const stageLabel = getProjectStageLabel(item.stageKey) || '进度更新';
		return {
			id: `${project.id}-history-${index}`,
			type: 'progress',
			typeLabel: '进度更新',
			color: '#f59e0b',
			title: `${stageLabel} ${item.progress}%`,
			stageLabel,
			date: withTimelineTime(item.date, `${fallbackHour}:00`),
			content: `项目阶段进度已更新到 ${item.progress}%`,
			operator: project.executor,
			progress: Number(item.progress || 0),
			attachments: [],
		};
	});
}

function buildProjectTimeline(project) {
	const entries = [
		{
			key: `${project.id}-created`,
			type: 'create',
			typeLabel: '项目下发',
			color: '#0ea5e9',
			title: '项目下发',
			date: withTimelineTime(project.createdAt, '09:00'),
			content: `${project.leader} 已将项目分配给 ${project.executor}。`,
			attachments: getProjectAttachmentList(project),
		},
	];
	const submissions = Array.isArray(project.progressSubmissions) && project.progressSubmissions.length
		? project.progressSubmissions.map((item) => ({
			key: item.id,
			type: 'progress',
			typeLabel: '进度更新',
			color: '#f59e0b',
			title: `${item.stageLabel || getProjectStageLabel(item.stageKey) || '进度更新'} ${item.progress}%`,
			date: withTimelineTime(item.date, '18:00'),
			content: `${item.operator || project.executor}：${item.content || `项目推进到 ${item.progress}%`}`,
			attachments: Array.isArray(item.attachments) ? item.attachments : [],
		}))
		: (project.progressHistory || []).map((item, index) => ({
			key: `${project.id}-history-${index}`,
			type: 'progress',
			typeLabel: '进度更新',
			color: '#f59e0b',
			title: `${getProjectStageLabel(item.stageKey) || '进度更新'} ${item.progress}%`,
			date: withTimelineTime(item.date, '18:00'),
			content: `项目阶段进度已更新到 ${item.progress}%。`,
			attachments: [],
		}));
	const audits = (project.auditLogs || []).map((item) => ({
		key: item.id,
		type: 'audit',
		typeLabel: item.action,
		color: item.action === '驳回' ? '#ef4444' : '#10b981',
		title: item.action,
		date: withTimelineTime(item.date, '19:00'),
		content: `${item.operator}：${item.comment}`,
		attachments: [],
	}));
	return [...entries, ...submissions, ...audits]
		.sort((a, b) => normalizeTimelineDate(b.date) - normalizeTimelineDate(a.date));
}

function withTimelineTime(dateString, fallbackTime) {
	if (!dateString) return `${DASHBOARD_TODAY} ${fallbackTime}`;
	return String(dateString).includes(' ') ? String(dateString) : `${dateString} ${fallbackTime}`;
}

function formatProgressFeedDate(dateString) {
	return withTimelineTime(dateString, '18:00').slice(5, 16);
}

function normalizeTimelineDate(dateString) {
	return new Date(String(dateString).replace(' ', 'T')).getTime();
}

function prioritizeFocusedItems(list, focusedIds, getId) {
	if (!Array.isArray(list)) return [];
	if (!Array.isArray(focusedIds) || !focusedIds.length) return list;
	const focusedSet = new Set(focusedIds.map((item) => String(item || '')).filter(Boolean));
	const focused = [];
	const rest = [];
	list.forEach((item) => {
		if (focusedSet.has(String(getId(item)))) {
			focused.push(item);
			return;
		}
		rest.push(item);
	});
	return [...focused, ...rest];
}

function getAdminProgressFeedItemKey(item) {
	if (!item) return '';
	return `${item.projectId || item.id}|${item.id}|${item.date}`;
}

function handleQuickAction(action) {
	if (!action?.target) return;
	if (visibleSections.value.some((item) => item.key === action.target)) {
		if (activeSection.value !== action.target) {
			triggerSectionLoading();
		}
		activeSection.value = action.target;
	}
}

function getReportDraftStorageKey(userId, dateString = REPORT_RUNTIME_TODAY) {
	return `${REPORT_DRAFT_STORAGE_KEY}:${String(userId || 'anonymous')}:${String(dateString || REPORT_RUNTIME_TODAY)}`;
}

function buildReportDraftPayload() {
	return {
		date: reportForm.date || REPORT_RUNTIME_TODAY,
		title: reportForm.title || '',
		relatedProjectId: reportForm.relatedProjectId || '',
		workContent: reportForm.workContent || '',
		tomorrowPlan: reportForm.tomorrowPlan || '',
		problems: reportForm.problems || '',
		attachmentNames: extractUploadFileNames(reportForm.attachmentFiles),
	};
}

function readPersistedReportDraft(userId, dateString = REPORT_RUNTIME_TODAY) {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(getReportDraftStorageKey(userId, dateString));
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? parsed : null;
	} catch {
		return null;
	}
}

function writePersistedReportDraft(userId, payload) {
	if (typeof window === 'undefined' || !userId || !payload?.date) return;
	try {
		localStorage.setItem(getReportDraftStorageKey(userId, payload.date), JSON.stringify(payload));
	} catch {
		// Ignore storage quota or private mode failures.
	}
}

function clearPersistedReportDraft(userId, dateString = REPORT_RUNTIME_TODAY) {
	if (typeof window === 'undefined' || !userId) return;
	try {
		localStorage.removeItem(getReportDraftStorageKey(userId, dateString));
	} catch {
		// Ignore storage access failures.
	}
}

function readPersistedSettingsAvatar(userId) {
	if (typeof window === 'undefined' || !userId) return '';
	try {
		const raw = localStorage.getItem(`${SETTINGS_AVATAR_STORAGE_KEY}:${String(userId)}`) || '';
		return String(raw || '');
	} catch {
		return '';
	}
}

function syncSettingsAvatarState(userId) {
	if (!userId) return;
	settingsAvatarState[userId] = readPersistedSettingsAvatar(userId);
}

function writePersistedSettingsAvatar(userId, dataUrl) {
	if (typeof window === 'undefined' || !userId || !dataUrl) return;
	try {
		localStorage.setItem(`${SETTINGS_AVATAR_STORAGE_KEY}:${String(userId)}`, String(dataUrl));
		settingsAvatarState[userId] = String(dataUrl);
	} catch {
		// Ignore storage access failures.
	}
}

function clearPersistedSettingsAvatar(userId) {
	if (typeof window === 'undefined' || !userId) return;
	try {
		localStorage.removeItem(`${SETTINGS_AVATAR_STORAGE_KEY}:${String(userId)}`);
		settingsAvatarState[userId] = '';
	} catch {
		// Ignore storage access failures.
	}
}

function readFileAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ''));
		reader.onerror = () => reject(new Error('read-failed'));
		reader.readAsDataURL(file);
	});
}

function readPersistedRole() {
	if (typeof window === 'undefined') return '';
	try {
		const role = localStorage.getItem(ROLE_STORAGE_KEY) || '';
		return Object.values(ROLE_ENUM).includes(role) ? role : '';
	} catch {
		return '';
	}
}

function writePersistedRole(role) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(ROLE_STORAGE_KEY, role);
	} catch {
		// Ignore storage access failures in private mode.
	}
}

function toPercent(value, total) {
	if (!total) return 0;
	return Math.round((Number(value || 0) / Number(total)) * 100);
}

function isProjectProgressMatched(progress, filterValue) {
	const current = Number(progress || 0);
	switch (Number(filterValue)) {
	case 10:
		return current >= 10;
	case 30:
		return current >= 30;
	case 50:
		return current >= 50;
	case 70:
		return current >= 70;
	case 90:
		return current >= 90;
	case 100:
		return current >= 100;
	default:
		return true;
	}
}

function normalizeDate(dateString) {
	return new Date(`${dateString}T00:00:00`);
}

function isWithinDays(dateString, days) {
	const diff = Math.round((normalizeDate(DASHBOARD_TODAY).getTime() - normalizeDate(dateString).getTime()) / DAY_MS);
	return diff >= 0 && diff <= Math.max(days - 1, 0);
}

function getDaysDiff(dateString) {
	return Math.round((normalizeDate(dateString).getTime() - normalizeDate(DASHBOARD_TODAY).getTime()) / DAY_MS);
}

function formatDaysLeft(dateString) {
	const diff = getDaysDiff(dateString);
	if (diff <= 0) return '今天到期';
	return `剩余 ${diff} 天`;
}

function scheduleChartsRender() {
	nextTick(() => {
		if (!props.active || activeSection.value !== 'overview' || sectionLoading.value) {
			disposeOverviewCharts();
			return;
		}
		renderProjectStatusChart();
		renderReportCharts();
		renderProjectTrendChart();
		renderSecondaryCharts();
	});
}

function renderProjectStatusChart() {
	projectStatusChartInstance = ensureChart(projectStatusChartInstance, projectStatusChartRef.value);
	if (!projectStatusChartInstance) return;
	const data = projectStatusItems.value
		.filter((item) => item.count > 0)
		.map((item) => ({
			name: item.label,
			value: item.count,
			itemStyle: { color: item.color },
		}));
	projectStatusChartInstance.setOption({
		animation: false,
		tooltip: {
			trigger: 'item',
			formatter: '{b}<br/>{c} 个项目({d}%)',
		},
		legend: {
			bottom: 0,
			left: 'center',
			icon: 'circle',
			textStyle: { color: '#475569', fontSize: 12 },
		},
		graphic: [
			{
				type: 'text',
				left: 'center',
				top: '42%',
				style: {
					text: String(scopedProjects.value.length),
					fill: '#0f172a',
					fontSize: 30,
					fontWeight: 700,
					textAlign: 'center',
				},
			},
			{
				type: 'text',
				left: 'center',
				top: '54%',
				style: {
					text: '项目总数',
					fill: '#64748b',
					fontSize: 12,
					textAlign: 'center',
				},
			},
		],
		series: [
			{
				type: 'pie',
				radius: ['56%', '74%'],
				center: ['50%', '42%'],
				avoidLabelOverlap: true,
				label: { show: false },
				labelLine: { show: false },
				data: data.length ? data : [{ value: 1, name: '暂无数据', itemStyle: { color: '#e2e8f0' } }],
			},
		],
	});
}

function renderReportCharts() {
	if (currentRole.value !== ROLE_ENUM.EMPLOYEE) {
		personalReportChartInstance = disposeChart(personalReportChartInstance);
		reportRateChartInstance = ensureChart(reportRateChartInstance, reportRateChartRef.value);
		if (!reportRateChartInstance) return;
		const submitted = todaySubmittedReportsCount.value;
		const pending = Math.max(scopedEmployees.value.length - submitted, 0);
		reportRateChartInstance.setOption({
			animation: false,
			tooltip: {
				trigger: 'item',
				formatter: '{b}<br/>{c} 人({d}%)',
			},
			legend: {
				bottom: 0,
				left: 'center',
				icon: 'circle',
				textStyle: { color: '#475569', fontSize: 12 },
			},
			graphic: [
				{
					type: 'text',
					left: 'center',
					top: '38%',
					style: {
						text: `${todayReportRate.value}%`,
						fill: '#0f172a',
						fontSize: 28,
						fontWeight: 700,
						textAlign: 'center',
					},
				},
				{
					type: 'text',
					left: 'center',
					top: '52%',
					style: {
						text: '今日提交率',
						fill: '#64748b',
						fontSize: 12,
						textAlign: 'center',
					},
				},
			],
			series: [
				{
					type: 'pie',
					radius: ['56%', '74%'],
					center: ['50%', '42%'],
					label: { show: false },
					data: [
						{ name: '已提交', value: submitted, itemStyle: { color: '#14b8a6' } },
						{ name: '未提交', value: pending || 0.0001, itemStyle: { color: '#cbd5e1' } },
					],
				},
			],
		});
		return;
	}

	reportRateChartInstance = disposeChart(reportRateChartInstance);
	personalReportChartInstance = ensureChart(personalReportChartInstance, personalReportChartRef.value);
	if (!personalReportChartInstance) return;
	personalReportChartInstance.setOption({
		animation: false,
		tooltip: {
			trigger: 'item',
			formatter: '{b}<br/>{c} 天({d}%)',
		},
		legend: {
			bottom: 0,
			left: 'center',
			icon: 'circle',
			textStyle: { color: '#475569', fontSize: 12 },
		},
		series: [
			{
				type: 'pie',
				radius: ['50%', '74%'],
				center: ['50%', '42%'],
				label: {
					show: true,
					formatter: '{d}%',
					color: '#334155',
					fontSize: 12,
				},
				data: [
					{ name: '已提交', value: personalReportStats.value.submittedDays, itemStyle: { color: '#0ea5e9' } },
					{ name: '待提交', value: Math.max(personalReportStats.value.pendingDays, 0.0001), itemStyle: { color: '#cbd5e1' } },
				],
			},
		],
	});
}

function renderProjectTrendChart() {
	projectTrendChartInstance = ensureChart(projectTrendChartInstance, projectTrendChartRef.value);
	if (!projectTrendChartInstance) return;
	const isNewMode = projectTrendMode.value === 'new';
	projectTrendChartInstance.setOption({
		animation: false,
		grid: { left: 40, right: 40, top: 58, bottom: 56, containLabel: true },
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
		},
		legend: {
			bottom: 6,
			left: 'center',
			textStyle: { color: '#475569', fontSize: 12 },
		},
		xAxis: {
			type: 'category',
			data: isNewMode ? newProjectTrend.value.labels : progressTrend.value.labels,
			axisLabel: { color: '#64748b' },
			axisTick: { show: false },
			axisLine: { lineStyle: { color: '#d9e2ec' } },
		},
		yAxis: [
			{
				type: 'value',
				name: isNewMode ? '新增数量' : '推进次数',
				nameTextStyle: { color: '#64748b', padding: [0, 0, 0, 4] },
				nameGap: 12,
				axisLabel: { color: '#64748b' },
				splitLine: { lineStyle: { color: '#e2e8f0' } },
			},
			{
				type: 'value',
				name: isNewMode ? '累计数量' : '平均进度',
				nameTextStyle: { color: '#64748b', padding: [0, 4, 0, 0] },
				nameGap: 12,
				axisLabel: {
					color: '#64748b',
					formatter: isNewMode ? '{value}' : '{value}%',
				},
				splitLine: { show: false },
			},
		],
		series: isNewMode
			? [
				{
					name: '新增项目数',
					type: 'bar',
					barWidth: 16,
					itemStyle: { color: '#38bdf8', borderRadius: [6, 6, 0, 0] },
					data: newProjectTrend.value.counts,
				},
				{
					name: '累计新增项目',
					type: 'line',
					yAxisIndex: 1,
					smooth: true,
					symbol: 'circle',
					symbolSize: 7,
					itemStyle: { color: '#0f766e' },
					lineStyle: { width: 3, color: '#0f766e' },
					data: newProjectTrend.value.cumulativeCounts,
				},
			]
			: [
				{
					name: '推进项目数',
					type: 'bar',
					barWidth: 16,
					itemStyle: { color: '#60a5fa', borderRadius: [6, 6, 0, 0] },
					data: progressTrend.value.updateCounts,
				},
				{
					name: '平均进度',
					type: 'line',
					yAxisIndex: 1,
					smooth: true,
					symbol: 'circle',
					symbolSize: 7,
					itemStyle: { color: '#f97316' },
					lineStyle: { width: 3, color: '#f97316' },
					data: progressTrend.value.averageProgress,
				},
			],
	});
}

function renderSecondaryCharts() {
	if (currentRole.value === ROLE_ENUM.ADMIN) {
		employeeProjectProgressChartInstance = disposeChart(employeeProjectProgressChartInstance);
		employeeDistributionChartInstance = ensureChart(employeeDistributionChartInstance, employeeDistributionChartRef.value);
		if (!employeeDistributionChartInstance) return;
		employeeDistributionChartInstance.setOption({
			animation: false,
			grid: { left: 56, right: 20, top: 20, bottom: 30 },
			xAxis: {
				type: 'value',
				minInterval: 1,
				axisLabel: {
					color: '#64748b',
					formatter: (value) => String(Math.round(value)),
				},
				splitLine: { lineStyle: { color: '#e2e8f0' } },
			},
			yAxis: {
				type: 'category',
				data: departmentEmployeeStats.value.map((item) => item.department),
				axisLabel: { color: '#475569' },
				axisTick: { show: false },
				axisLine: { show: false },
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (params) => {
					const item = Array.isArray(params) ? params[0] : params;
					return `${item.name}<br/>${item.value} 人`;
				},
			},
			series: [
				{
					type: 'bar',
					data: departmentEmployeeStats.value.map((item) => item.count),
					barWidth: 16,
					itemStyle: {
						color: '#38bdf8',
						borderRadius: [0, 8, 8, 0],
					},
				},
			],
		});
		return;
	}

	employeeDistributionChartInstance = disposeChart(employeeDistributionChartInstance);
	if (currentRole.value === ROLE_ENUM.EMPLOYEE) {
		employeeProjectProgressChartInstance = ensureChart(employeeProjectProgressChartInstance, employeeProjectProgressChartRef.value);
		if (!employeeProjectProgressChartInstance) return;
		employeeProjectProgressChartInstance.setOption({
			animation: false,
			grid: { left: 24, right: 24, top: 20, bottom: 40, containLabel: true },
			xAxis: {
				type: 'value',
				max: 100,
				axisLabel: { color: '#64748b', formatter: '{value}%' },
				splitLine: { lineStyle: { color: '#e2e8f0' } },
			},
			yAxis: {
				type: 'category',
				data: scopedProjects.value.map((item) => item.projectName),
				axisLabel: {
					color: '#475569',
					width: 100,
					overflow: 'truncate',
				},
				axisTick: { show: false },
				axisLine: { show: false },
			},
			tooltip: {
				trigger: 'axis',
				axisPointer: { type: 'shadow' },
				formatter: (params) => {
					const item = Array.isArray(params) ? params[0] : params;
					return `${item.name}<br/>进度 ${item.value}%`;
				},
			},
			series: [
				{
					type: 'bar',
					data: scopedProjects.value.map((item) => item.progress),
					barWidth: 16,
					itemStyle: {
						color: '#0ea5e9',
						borderRadius: [0, 8, 8, 0],
					},
					label: {
						show: true,
						position: 'right',
						color: '#334155',
						formatter: '{c}%',
					},
				},
			],
		});
		return;
	}

	employeeProjectProgressChartInstance = disposeChart(employeeProjectProgressChartInstance);
}

function ensureChart(instance, dom) {
	if (!dom) return disposeChart(instance);
	if (instance && !instance.isDisposed()) {
		if (instance.getDom() === dom) {
			return instance;
		}
		instance.dispose();
	}
	return echarts.init(dom);
}

function resizeOverviewCharts() {
	[
		projectStatusChartInstance,
		reportRateChartInstance,
		personalReportChartInstance,
		projectTrendChartInstance,
		employeeDistributionChartInstance,
		employeeProjectProgressChartInstance,
	].forEach((instance) => {
		if (instance && !instance.isDisposed()) {
			instance.resize();
		}
	});
}

function disposeChart(instance) {
	if (instance && !instance.isDisposed()) {
		instance.dispose();
	}
	return null;
}

function disposeOverviewCharts() {
	projectStatusChartInstance = disposeChart(projectStatusChartInstance);
	reportRateChartInstance = disposeChart(reportRateChartInstance);
	personalReportChartInstance = disposeChart(personalReportChartInstance);
	projectTrendChartInstance = disposeChart(projectTrendChartInstance);
	employeeDistributionChartInstance = disposeChart(employeeDistributionChartInstance);
	employeeProjectProgressChartInstance = disposeChart(employeeProjectProgressChartInstance);
}

function buildDateRange(days) {
	return Array.from({ length: days }, (_, index) => {
		const targetDate = new Date(normalizeDate(DASHBOARD_TODAY).getTime() - (days - 1 - index) * DAY_MS);
		return formatDate(targetDate);
	});
}

function formatDate(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	return `${formatDate(date)} ${hours}:${minutes}`;
}

function formatShortDate(dateString) {
	return dateString.slice(5);
}
</script>

<style scoped lang="scss">
.personal-center {
	position: absolute;
	top: var(--map-topbar-height, 50px);
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 2;
	padding: 18px;
	box-sizing: border-box;
	background:
		radial-gradient(circle at top left, rgba(9, 153, 128, 0.16), transparent 30%),
		radial-gradient(circle at right 20%, rgba(6, 182, 212, 0.14), transparent 28%),
		linear-gradient(145deg, #eef6f8 0%, #f7fafc 58%, #eef3f9 100%);
}

.personal-center__shell {
	display: grid;
	grid-template-columns: 300px minmax(0, 1fr);
	gap: 18px;
	height: 100%;
}

.personal-center__aside,
.personal-center__main {
	min-height: 0;
}

.personal-center__aside {
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 20px;
	border-radius: 28px;
	background: rgba(7, 18, 28, 0.88);
	box-shadow: 0 22px 55px rgba(15, 23, 42, 0.18);
	color: #e2e8f0;
	overflow: hidden;
}

.brand-panel {
	padding: 4px 2px 2px;
}

.brand-panel__eyebrow,
.page-header__eyebrow {
	font-size: 12px;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: #5eead4;
}

.brand-panel__title {
	margin: 10px 0 8px;
	font-size: 28px;
	line-height: 1.2;
	color: #ffffff;
}

.brand-panel__desc {
	margin: 0;
	font-size: 13px;
	line-height: 1.7;
	color: rgba(226, 232, 240, 0.72);
}

.user-summary-card,
.role-switch-card,
.aside-tip-card {
	border: none;
	background: rgba(255, 255, 255, 0.08);
}

.user-summary {
	display: flex;
	align-items: center;
	gap: 12px;
}

.user-summary__avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 52px;
	height: 52px;
	border-radius: 18px;
	background: linear-gradient(135deg, #14b8a6 0%, #22d3ee 100%);
	color: #ffffff;
	font-size: 22px;
	font-weight: 700;
}

.user-summary__avatar-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.user-summary__name {
	font-size: 17px;
	font-weight: 600;
	color: #ffffff;
}

.user-summary__info {
	margin-top: 4px;
	font-size: 12px;
	color: rgba(226, 232, 240, 0.72);
}

.user-summary__tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 14px;
}

.user-summary__account {
	margin-top: 12px;
	font-size: 12px;
	color: rgba(226, 232, 240, 0.7);
}

.role-switch-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-weight: 600;
	color: #ffffff;
}

.role-switch-group {
	display: flex;
	flex-wrap: wrap;
	width: 100%;
}

.role-switch-group :deep(.el-radio-button) {
	flex: 1 1 0;
}

.role-switch-group :deep(.el-radio-button__inner) {
	width: 100%;
	background: rgba(255, 255, 255, 0.04);
	border-color: rgba(255, 255, 255, 0.12);
	color: rgba(226, 232, 240, 0.84);
}

.role-switch-group :deep(.el-radio-button:first-child .el-radio-button__inner) {
	border-left-color: rgba(255, 255, 255, 0.12);
}

.role-switch-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
	background: linear-gradient(135deg, #14b8a6 0%, #0891b2 100%);
	border-color: transparent;
	box-shadow: none;
	color: #ffffff;
}

.role-switch-card__tip {
	margin-top: 12px;
	font-size: 12px;
	line-height: 1.7;
	color: rgba(226, 232, 240, 0.72);
}

.section-menu {
	border-right: none;
	background: transparent;
}

.section-menu :deep(.el-menu-item) {
	height: 48px;
	margin-bottom: 6px;
	border-radius: 14px;
	color: rgba(226, 232, 240, 0.82);
}

.section-menu :deep(.el-menu-item:hover) {
	background: rgba(255, 255, 255, 0.08);
	color: #ffffff;
}

.section-menu :deep(.el-menu-item.is-active) {
	background: linear-gradient(135deg, rgba(20, 184, 166, 0.22), rgba(34, 211, 238, 0.16));
	color: #ffffff;
}

.aside-tip-card__header {
	font-weight: 600;
	color: #ffffff;
}

.aside-tip-list {
	margin: 0;
	padding-left: 18px;
	font-size: 13px;
	line-height: 1.9;
	color: rgba(226, 232, 240, 0.76);
}

.personal-center__main {
	display: flex;
	flex-direction: column;
	min-width: 0;
	border-radius: 30px;
	background: rgba(255, 255, 255, 0.84);
	backdrop-filter: blur(18px);
	box-shadow: 0 22px 60px rgba(15, 23, 42, 0.1);
	overflow: hidden;
}

.page-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
	padding: 24px 28px 20px;
	border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.page-header__title {
	margin: 8px 0 8px;
	font-size: 30px;
	line-height: 1.2;
	color: #0f172a;
}

.page-header__desc {
	margin: 0;
	font-size: 14px;
	line-height: 1.7;
	color: #475569;
}

.page-header__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.page-scroll {
	flex: 1;
	min-height: 0;
}

.page-content {
	padding: 24px 28px 28px;
}

.page-content--fill {
	height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.overview-toolbar {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 14px;
	padding: 18px 20px;
	border-radius: 24px;
	background: linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(14, 165, 233, 0.08));
	border: 1px solid rgba(125, 211, 252, 0.28);
}

.overview-toolbar__title {
	font-size: 18px;
	font-weight: 700;
	color: #0f172a;
}

.overview-toolbar__desc {
	margin-top: 6px;
	font-size: 13px;
	line-height: 1.7;
	color: #475569;
}

.overview-range-switch {
	flex-shrink: 0;
}

.trend-mode-switch {
	flex-shrink: 0;
}

.overview-main-grid,
.overview-secondary-grid {
	display: grid;
	gap: 14px;
	margin-top: 14px;
}

.overview-main-grid {
	grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr) minmax(260px, 1fr);
}

.overview-main-grid > .content-card {
	min-height: 430px;
}

.overview-secondary-grid {
	grid-template-columns: repeat(3, minmax(0, 1fr));
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

.content-grid,
.data-preview-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 14px;
	margin-top: 14px;
}

.content-card,
.preview-card {
	display: flex;
	flex-direction: column;
	height: 100%;
	border-radius: 22px;
	border: 1px solid rgba(226, 232, 240, 0.9);
}

.content-card :deep(.el-card__body),
.preview-card :deep(.el-card__body) {
	flex: 1;
	display: flex;
	flex-direction: column;
	height: 100%;
	box-sizing: border-box;
	background: linear-gradient(180deg, #f8fbfe 0%, #f0f5fb 100%);
}

.content-card--wide {
	grid-column: span 2;
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

.echart-panel {
	width: 100%;
	min-width: 0;
}

.echart-panel--lg {
	height: 250px;
}

.echart-panel--md {
	height: 260px;
}

.echart-panel--md-lg {
	height: 340px;
}

.echart-panel--sm {
	width: 100%;
	height: 220px;
}

.status-distribution {
	display: grid;
	grid-template-columns: 1fr;
	gap: 14px;
	align-items: stretch;
	height: 100%;
}

.status-legend__item,
.report-rate-row,
.distribution-list__head,
.progress-list__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.status-legend__meta {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	color: #334155;
}

.status-legend__dot {
	width: 10px;
	height: 10px;
	border-radius: 999px;
	flex-shrink: 0;
}

.status-legend__value {
	font-size: 12px;
	color: #64748b;
}

.status-distribution__aside {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.mini-stat {
	padding: 14px;
	border-radius: 18px;
	background: #f8fbfd;
	border: 1px solid #e5edf3;
}

.mini-stat__label {
	font-size: 13px;
	color: #64748b;
}

.mini-stat__value {
	margin-top: 8px;
	font-size: 26px;
	font-weight: 700;
	color: #0f172a;
}

.mini-stat__hint {
	margin-top: 6px;
	font-size: 12px;
	line-height: 1.5;
	color: #94a3b8;
}

.report-rate-panel {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 14px;
	height: 100%;
}

.report-rate-panel__stats {
	flex: 1;
	min-width: 0;
	display: grid;
	grid-template-columns: 1fr;
	gap: 12px;
}

.report-rate-row {
	padding: 10px 12px;
	border-radius: 16px;
	background: #f8fafc;
	font-size: 12px;
	color: #475569;
}

.report-rate-row strong,
.personal-report-item strong,
.distribution-list__head strong,
.progress-list__head strong {
	font-size: 14px;
	color: #0f172a;
}

.personal-report-panel {
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;
	height: 100%;
}

.personal-report-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
}

.personal-report-item {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 14px;
	border-radius: 16px;
	background: #f8fbfd;
	border: 1px solid #e5edf3;
	font-size: 12px;
	color: #64748b;
}

.dataset-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.dataset-block {
	padding: 16px;
	border-radius: 18px;
	background: #f8fbfd;
	border: 1px solid #e5edf3;
}

.dataset-block__title {
	margin-bottom: 10px;
	font-size: 13px;
	font-weight: 600;
	color: #0f172a;
}

.dataset-block__body {
	font-size: 13px;
	line-height: 1.9;
	color: #475569;
}

.menu-preview {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.menu-preview__item {
	padding: 14px 16px;
	border-radius: 16px;
	background: #f8fafc;
	border: 1px solid #e5edf4;
}

.menu-preview__item.is-active {
	background: linear-gradient(135deg, #f0fdfa 0%, #ecfeff 100%);
	border-color: #99f6e4;
}

.menu-preview__name,
.placeholder-panel__title,
.preview-row__title {
	font-size: 14px;
	font-weight: 600;
	color: #0f172a;
}

.menu-preview__desc,
.placeholder-panel__desc,
.preview-row__meta {
	margin-top: 6px;
	font-size: 12px;
	line-height: 1.7;
	color: #64748b;
}

.due-list,
.distribution-list,
.progress-list,
.quick-actions {
	display: grid;
	grid-template-columns: 1fr;
	gap: 10px;
}

.due-list__item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
	padding: 14px 16px;
	border-radius: 16px;
	background: #f8fafc;
	border: 1px solid #edf2f7;
}

.due-list__main {
	flex: 1;
	min-width: 0;
	overflow: hidden;
}

.due-list__item--action {
	width: 100%;
	max-width: 100%;
	box-sizing: border-box;
	text-align: left;
	cursor: pointer;
	transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.due-list__item--action:hover {
	transform: translateY(-1px);
	border-color: #cbd5e1;
	box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.due-list__item.is-focused {
	background: linear-gradient(135deg, #f8fbfe 0%, #e9f2fc 100%);
	border-color: #c2ddfd;
	// box-shadow: 0 14px 30px #b3d7ff;
}

.due-list__title {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 14px;
	font-weight: 600;
	color: #0f172a;
}

.due-list__focus-btn {
	flex-shrink: 0;
	padding: 0;
	margin-left: 2px;
}

.focus-pin-icon {
	display: block;
	width: 16px;
	height: 16px;
	object-fit: contain;
}

.due-list__meta,
.due-list__days,
.quick-action-card__desc,
.quick-action-card__footer {
	margin-top: 6px;
	font-size: 12px;
	line-height: 1.7;
	color: #64748b;
}

.due-list__meta {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.due-list__side {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex-shrink: 0;
	width: 200px;
	min-width: 200px;
	gap: 10px;
	flex-wrap: nowrap;
}

.due-list-move-move {
	transition: transform 0.28s ease;
}

.due-list__side-top {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	justify-content: center;
	gap: 6px;
	flex-shrink: 0;
	white-space: nowrap;
}

.due-list__progress {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
	flex-shrink: 0;
	flex-wrap: nowrap;
	margin-right: 8px;
}

.due-list__progress :deep(.el-progress) {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.due-list__progress :deep(.el-progress-circle) {
	width: 42px !important;
	height: 42px !important;
	position: relative;
}

.due-list__progress :deep(.el-progress__text) {
	position: absolute;
	top: 50%;
	left: 50%;
	display: block;
	width: max-content;
	margin: 0;
	padding: 0;
	transform: translate(-50%, -50%);
	font-size: 11px !important;
	font-weight: 700;
	line-height: 1;
	color: #0f172a;
}

.distribution-list__item,
.progress-list__item {
	padding: 14px 16px;
	border-radius: 16px;
	background: #f8fafc;
	border: 1px solid #edf2f7;
}

.progress-feed-board {
	--progress-feed-row-height: 126px;
	--progress-feed-gap: 8px;
	--progress-feed-window-height: 662px;
	--progress-feed-scroll-distance: 134px;
	display: flex;
	flex-direction: column;
	gap: 10px;
	height: 100%;
	min-height: 0;
}

.progress-feed-board__list {
	position: relative;
	display: grid;
	grid-template-columns: 1fr;
	grid-auto-rows: var(--progress-feed-row-height);
	gap: var(--progress-feed-gap);
	height: var(--progress-feed-window-height);
	overflow: hidden;
}

.progress-feed-board__item {
	box-sizing: border-box;
	height: var(--progress-feed-row-height);
	min-height: 0;
	width: 100%;
	padding: 10px 12px;
	border-radius: 14px;
	background: linear-gradient(145deg, #ffffff 0%, #f8fbff 100%);
	border: 1px solid #dbe7f2;
	box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.progress-feed-board__item--action {
	text-align: left;
	cursor: pointer;
	transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.progress-feed-board__item--action:hover {
	transform: translateY(-1px);
	border-color: #bfdbfe;
	box-shadow: 0 14px 30px rgba(14, 165, 233, 0.08);
}

.progress-feed-board__item.is-focused {
	background: linear-gradient(135deg, #f8fbfe 0%, #e9f2fc 100%);
	border-color: #c2ddfd;
}

.progress-feed-board__row,
.progress-feed-board__meta,
.progress-feed-board__footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.progress-feed-board__project {
	min-width: 0;
	font-size: 13px;
	font-weight: 700;
	color: #0f172a;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.progress-feed-board__time,
.progress-feed-board__meta,
.progress-feed-board__hint {
	font-size: 12px;
	line-height: 1.6;
	color: #64748b;
}

.progress-feed-board__time {
	flex-shrink: 0;
	white-space: nowrap;
}

.progress-feed-board__meta {
	flex-shrink: 0;
	margin-top: 4px;
	justify-content: flex-start;
	flex-wrap: wrap;
	gap: 6px 12px;
}

.progress-feed-board__meta span::before {
	content: '•';
	margin-right: 6px;
	color: #94a3b8;
}

.progress-feed-board__meta span:first-child::before {
	content: '';
	margin-right: 0;
}

.progress-feed-board__content {
	flex: 1;
	min-height: 0;
	margin-top: 6px;
	font-size: 12px;
	line-height: 1.7;
	color: #334155;
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.progress-feed-board__footer {
	flex-shrink: 0;
	margin-top: 8px;
	justify-content: space-between;
}

.progress-feed-board__hint {
	margin-top: auto;
	padding-top: 2px;
}

.progress-feed-board__focus-btn {
	flex-shrink: 0;
	padding: 0;
}

.feed-scroll-enter-active,
.feed-scroll-leave-active {
	transition: opacity 0.3s ease, transform 0.3s ease;
}

.feed-scroll-enter-active {
	z-index: 1;
}

.feed-scroll-leave-active {
	position: absolute;
	left: 0;
	right: 0;
	z-index: 0;
}

.feed-scroll-enter-from,
.feed-scroll-leave-to {
	opacity: 0;
}

.feed-scroll-enter-from {
	transform: translateY(calc(-1 * var(--progress-feed-scroll-distance)));
}

.feed-scroll-leave-to {
	transform: translateY(var(--progress-feed-scroll-distance));
}

.feed-scroll-move {
	transition: transform 0.3s ease;
}

.progress-list__head {
	margin-bottom: 10px;
	font-size: 13px;
	color: #334155;
}

.quick-action-card {
	padding: 16px;
	border-radius: 18px;
	border: 1px solid #d9e5ee;
	background: linear-gradient(145deg, #ffffff 0%, #f8fbff 100%);
	text-align: left;
	cursor: pointer;
	transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.quick-action-card:hover {
	transform: translateY(-1px);
	border-color: #7dd3fc;
	box-shadow: 0 12px 24px rgba(14, 165, 233, 0.12);
}

.section-loading-shell {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.section-loading-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 14px;
}

.section-loading-grid--secondary {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.section-loading-card,
.section-loading-panel {
	border-radius: 22px;
	background: #ffffff;
	border: 1px solid #e5edf4;
	padding: 14px;
}

.section-loading-card__rect,
.section-loading-panel__rect {
	width: 100%;
	border-radius: 18px;
}

.section-loading-card__rect {
	height: 104px;
}

.section-loading-card__rect--md {
	height: 220px;
}

.section-loading-panel__rect--lg {
	height: 280px;
}

.module-empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	min-height: 280px;
	padding: 12px 0;
}

.module-empty-state__actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
	margin-top: 4px;
}

.quick-action-card__title {
	font-size: 14px;
	font-weight: 700;
	color: #0f172a;
}

.quick-action-card__footer {
	color: #0284c7;
}

.trend-card__hint {
	margin-top: 8px;
	font-size: 12px;
	line-height: 1.7;
	color: #64748b;
}

.trend-card {
	display: grid;
	grid-template-columns: 1fr;
	align-content: center;
	padding-top: 10px;
	height: 100%;
}

.project-page,
.employee-page,
.report-page {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: 14px;
	min-height: 0;
	height: 100%;
}

.settings-page {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}

.settings-layout {
	display: grid;
	grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
	gap: 16px;
	align-items: start;
}

.settings-profile-card,
.settings-form-card {
	min-height: 100%;
}

.settings-profile {
	display: grid;
	grid-template-columns: 128px minmax(0, 1fr);
	gap: 18px;
	align-items: center;
}

.settings-avatar-panel {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
}

.settings-avatar {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 112px;
	height: 112px;
	border-radius: 32px;
	background: linear-gradient(135deg, #14b8a6 0%, #38bdf8 100%);
	color: #ffffff;
	font-size: 40px;
	font-weight: 700;
	box-shadow: 0 16px 30px rgba(20, 184, 166, 0.18);
	overflow: hidden;
}

.settings-avatar__image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.settings-avatar__actions {
	display: flex;
	flex-direction: column;
	gap: 10px;
	width: 100%;
}

.settings-avatar-upload,
.settings-avatar-upload :deep(.el-upload) {
	width: 100%;
}

.settings-avatar__actions :deep(.el-button) {
	width: 100%;
}

.settings-avatar__tip {
	font-size: 12px;
	line-height: 1.6;
	color: #64748b;
	text-align: center;
}

.settings-profile-meta__name {
	font-size: 22px;
	font-weight: 800;
	color: #0f172a;
}

.settings-profile-meta__sub,
.settings-profile-meta__line {
	margin-top: 8px;
	font-size: 13px;
	line-height: 1.7;
	color: #64748b;
}

.settings-readonly-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 12px;
	margin-top: 22px;
}

.settings-readonly-item {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 16px 18px;
	border-radius: 18px;
	background: linear-gradient(180deg, #ffffff 0%, #f8fbfe 100%);
	border: 1px solid #e4edf5;
}

.settings-readonly-item span {
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.03em;
	color: #64748b;
}

.settings-readonly-item strong {
	font-size: 16px;
	font-weight: 700;
	line-height: 1.6;
	color: #0f172a;
}

.settings-readonly-item small {
	font-size: 12px;
	line-height: 1.6;
	color: #94a3b8;
}

.settings-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 6px 16px;
}

.settings-form-grid__full {
	grid-column: 1 / -1;
}

.settings-form-note {
	width: 100%;
	padding: 14px 16px;
	border-radius: 16px;
	background: #f8fafc;
	border: 1px solid #e5edf4;
	font-size: 13px;
	line-height: 1.8;
	color: #64748b;
	box-sizing: border-box;
}

.dialog-footer--inline {
	justify-content: flex-end;
	margin-top: 8px;
}

.project-filter-card :deep(.el-card__body),
.employee-filter-card :deep(.el-card__body),
.report-filter-card :deep(.el-card__body) {
	padding-top: 18px;
}

.project-filter-actions,
.employee-filter-actions,
.report-filter-actions {
	display: inline-flex;
	gap: 10px;
	flex-wrap: wrap;
}

.project-filter-grid {
	display: grid;
	grid-template-columns: minmax(220px, 2fr) repeat(4, minmax(140px, 1fr));
	gap: 12px;
}

.employee-filter-grid {
	display: grid;
	grid-template-columns: 2fr 1fr 1fr;
	gap: 12px;
}

.report-filter-grid {
	display: grid;
	grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(160px, 1fr));
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

.project-table-card :deep(.el-card__body),
.employee-table-card :deep(.el-card__body),
.report-table-card :deep(.el-card__body) {
	min-height: 0;
}

.project-table-card,
.project-table-shell,
.employee-table-shell,
.report-table-card,
.report-table-shell {
	flex: 1;
	min-height: 0;
	height: 100%;
}

.project-table,
.employee-table,
.report-table {
	width: 100%;
}

.project-table :deep(.el-table__inner-wrapper),
.employee-table :deep(.el-table__inner-wrapper),
.report-table :deep(.el-table__inner-wrapper) {
	height: 100%;
}

.project-table :deep(td.el-table__cell),
.report-table :deep(td.el-table__cell) {
	padding-top: 15px;
	padding-bottom: 15px;
}

.project-table :deep(td.el-table__cell .cell),
.report-table :deep(td.el-table__cell .cell) {
	min-height: 28px;
	line-height: 1.5;
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

.project-row-actions {
	display: inline-flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px 8px;
}

.employee-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 4px 14px;
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

.employee-form-grid__full {
	grid-column: 1 / -1;
}

.project-detail-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 14px;
}

.project-detail-panel,
.report-detail-panel,
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

.report-detail-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 18px;
}

.report-detail-dialog :deep(.el-dialog) {
	width: min(920px, calc(100vw - 32px)) !important;
	max-width: calc(100vw - 32px);
	max-height: calc(100vh - 8vh);
	margin-bottom: 0;
}

.report-detail-dialog :deep(.el-dialog__body) {
	overflow: hidden;
	padding-top: 18px;
	padding-bottom: 18px;
}

.report-detail-scroll {
	height: calc(100vh - 220px);
	max-height: calc(100vh - 220px);
	padding-right: 8px;
}

.report-detail-scroll :deep(.el-scrollbar__wrap) {
	overflow-x: hidden;
}

.report-detail-grid .project-detail-section :deep(.el-empty) {
	padding: 0;
	max-height: 100px;
	min-height: 100px;
	overflow: hidden;
}

.report-detail-grid .project-detail-section :deep(.el-empty__image) {
	max-width: 72px;
	max-height: 52px;
	margin-bottom: 6px;
}

.report-detail-grid .project-detail-section :deep(.el-empty__description) {
	margin-top: 0;
}

.report-detail-grid .project-detail-section :deep(.el-empty__description p) {
	font-size: 12px;
	line-height: 1.5;
}

.report-detail-panel {
	padding: 22px 24px;
}

.report-meta-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14px;
	margin-top: 18px;
}

.report-meta-item {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 16px 18px;
	border-radius: 18px;
	background: linear-gradient(180deg, #ffffff 0%, #f8fbfe 100%);
	border: 1px solid #e4edf5;
}

.report-meta-item span {
	font-size: 13px;
	font-weight: 700;
	letter-spacing: 0.02em;
	color: #64748b;
}

.report-meta-item strong {
	font-size: 17px;
	font-weight: 700;
	line-height: 1.6;
	color: #0f172a;
}

.report-reading-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;
	margin-top: 18px;
}

.report-reading-card {
	padding: 22px 24px;
	border-radius: 22px;
	background: linear-gradient(180deg, #ffffff 0%, #f8fbfe 100%);
	border: 1px solid #dde8f2;
	min-height: 100px;
}

.report-reading-card--primary {
	min-height: 100px;
}

.report-reading-card__label {
	margin-bottom: 14px;
	font-size: 18px;
	font-weight: 800;
	line-height: 1.4;
	letter-spacing: 0.01em;
	color: #0f172a;
}

.report-reading-card__content {
	font-size: 17px;
	font-weight: 500;
	line-height: 2;
	color: #1e293b;
	white-space: pre-wrap;
}

.report-attachment-list {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
}

.report-comment-panel {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 20px 22px;
	border-radius: 20px;
	background: linear-gradient(180deg, #ffffff 0%, #f8fbfe 100%);
	border: 1px solid #e5edf4;
	margin-top: 10px;
}

.report-comment-panel__meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 8px 12px;
	font-size: 12px;
	line-height: 1.6;
	color: #64748b;
}

.report-comment-panel__content {
	font-size: 16px;
	font-weight: 500;
	line-height: 2;
	color: #334155;
	white-space: pre-wrap;
}

.placeholder-panel {
	display: flex;
	flex-direction: column;
	min-height: 100%;
	height: 100%;
}

.placeholder-panel :deep(.el-empty) {
	padding: 18px 0 0;
}

.preview-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
	height: 100%;
}

.preview-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 14px 16px;
	border-radius: 16px;
	background: #f8fafc;
	border: 1px solid #edf2f7;
}

@media (max-width: 1380px) {
	.metrics-grid,
	.overview-secondary-grid,
	.content-grid,
	.data-preview-grid,
	.dataset-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.overview-main-grid {
		grid-template-columns: 1fr;
	}

	.content-card--wide {
		grid-column: span 2;
	}

	.status-distribution__aside {
		grid-template-columns: 1fr;
	}

	.project-filter-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.report-filter-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.section-loading-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.report-meta-grid {
		grid-template-columns: 1fr;
	}

	.report-detail-scroll {
		height: calc(100vh - 210px);
		max-height: calc(100vh - 210px);
	}

	.settings-layout {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 1080px) {
	.personal-center__shell {
		grid-template-columns: 1fr;
	}

	.personal-center__aside {
		padding-bottom: 16px;
	}

	.overview-toolbar,
	.report-rate-panel {
		flex-direction: column;
		align-items: stretch;
	}
}

@media (max-width: 720px) {
	.personal-center {
		padding: 10px;
	}

	.page-header,
	.page-content {
		padding-left: 16px;
		padding-right: 16px;
	}

	.page-header {
		flex-direction: column;
	}

	.metrics-grid,
	.overview-secondary-grid,
	.content-grid,
	.data-preview-grid,
	.dataset-grid,
	.section-loading-grid,
	.section-loading-grid--secondary {
		grid-template-columns: 1fr;
	}

	.overview-main-grid {
		grid-template-columns: 1fr;
	}

	.content-card--wide {
		grid-column: span 1;
	}

	.personal-report-grid {
		grid-template-columns: 1fr;
	}

	.status-distribution__aside {
		grid-template-columns: 1fr;
	}

	.project-filter-grid,
	.report-filter-grid,
	.employee-filter-grid,
	.project-form-grid,
	.employee-form-grid,
	.settings-form-grid {
		grid-template-columns: 1fr;
	}

	.employee-department-field {
		grid-template-columns: 1fr;
	}

	.due-list__item {
		align-items: flex-start;
		flex-direction: column;
	}

	.due-list__side {
		align-items: flex-start;
		width: 100%;
	}

	.due-list__side-top,
	.due-list__progress {
		align-items: center;
		justify-content: flex-start;
	}

	.project-attachment-list {
		grid-template-columns: 1fr;
	}

	.report-attachment-list {
		grid-template-columns: 1fr;
	}

	.report-reading-card {
		padding: 18px 18px;
		min-height: 100px;
	}

	.report-reading-card--primary {
		min-height: 100px;
	}

	.report-detail-dialog :deep(.el-dialog) {
		width: calc(100vw - 20px) !important;
		max-width: calc(100vw - 20px);
	}

	.settings-profile {
		grid-template-columns: 1fr;
	}

	.settings-avatar-panel {
		align-items: stretch;
	}

	.settings-avatar {
		margin: 0 auto;
	}

	.report-detail-scroll {
		height: calc(100vh - 190px);
		max-height: calc(100vh - 190px);
		padding-right: 2px;
	}

	.project-detail-panel__header,
	.project-timeline__head {
		flex-direction: column;
	}
}
</style>
