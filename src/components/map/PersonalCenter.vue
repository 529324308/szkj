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
						<el-tag :type="reportReminderSocketTagType" effect="plain">{{ reportReminderSocketLabel }}</el-tag>
						<el-tag
							v-if="messageCount"
							type="warning"
							effect="light"
							class="message-reminder-tag"
							@click="openMessageDrawer"
						>
							{{ messageCount }} 条消息提醒
						</el-tag>
					</div>
				</header>

				<el-drawer
					v-model="messageDrawerVisible"
					direction="rtl"
					size="420px"
					class="message-drawer"
				>
					<template #header>
						<div class="message-drawer__header">
							<span>消息提醒</span>
							<el-button
								v-if="visibleMessageList.length"
								type="danger"
								link
								@click="handleClearMessages"
							>
								清除所有通知
							</el-button>
						</div>
					</template>
					<el-scrollbar class="message-drawer__scroll">
						<div v-if="visibleMessageList.length" class="message-list">
							<div
								v-for="item in visibleMessageList"
								:key="item.__key || item.Id"
								class="message-list__item"
							>
								<el-button
									class="message-list__delete"
									:icon="Close"
									circle
									text
									aria-label="删除通知"
									@click.stop="handleDeleteMessage(item)"
								/>
								<div class="message-list__row">
									<div :class="['message-list__icon', `message-list__icon--${getMessageCategory(item)}`]">
										<el-icon><component :is="getMessageIcon(item)" /></el-icon>
									</div>
									<div class="message-list__body">
										<div class="message-list__item-head">
											<div class="message-list__title">
												<span>{{ getMessageSender(item) }}</span>
												<el-tag size="small" :type="getMessageTagType(item)" effect="plain">
													{{ getMessageTypeLabel(item) }}
												</el-tag>
											</div>
											<span class="message-list__time">{{ formatMessageTime(item.CreateTime) }}</span>
										</div>
										<div class="message-list__content">{{ item.Message || '您有一条新的消息提醒。' }}</div>
									</div>
								</div>
							</div>
						</div>
						<el-empty v-else description="暂无消息提醒" />
					</el-scrollbar>
				</el-drawer>

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
											<el-tag size="small" effect="plain">{{ overviewProjectTotal }} 个项目</el-tag>
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
												<strong>{{ overviewTodaySubmittedReportsCount }} / {{ overviewReportExpectedCount }}</strong>
											</div>
											<div class="report-rate-row">
												<span>未提交</span>
												<strong>{{ overviewPendingReportsCount }}</strong>
											</div>
											<div class="report-rate-row">
												<span>近周期日报</span>
												<strong>{{ overviewRangeReportCount }} 条</strong>
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
							<EmployeeManagement
								:current-role="currentRole"
								:current-user="currentUser"
								:api-data="apiData"
								:scoped-employees="scopedEmployees"
								@update:api-data="handleApiDataUpdate"
							/>
						</template>

						<template v-else-if="activeSection === 'projects'">
							<ProjectManagement
								ref="projectManagementRef"
								:current-role="currentRole"
								:role-enum="ROLE_ENUM"
								:project-filters="projectFilters"
								:project-form="projectForm"
								:project-progress-form="projectProgressForm"
								:project-rules="projectRules"
								:project-progress-rules="projectProgressRules"
								:project-department-options="projectDepartmentOptions"
								:available-project-executors="availableProjectExecutors"
								:filtered-projects="filteredProjects"
								:project-table-page="projectTablePage"
								:project-table-page-size="projectTablePageSize"
								:project-total="projectTableTotal"
								:project-detail-visible="projectDetailVisible"
								:project-form-visible="projectFormVisible"
								:project-progress-visible="projectProgressVisible"
								:project-upload-progress-visible="projectUploadProgressVisible"
								:project-upload-progress="projectUploadProgress"
								:project-upload-progress-text="projectUploadProgressText"
								:project-form-ref="projectFormRef"
								:project-progress-form-ref="projectProgressFormRef"
								:current-project-detail="currentProjectDetail"
								:current-project-attachments="currentProjectAttachments"
								:project-timeline-entries="projectTimelineEntries"
								:progress-target-project="progressTargetProject"
								:project-progress-baseline="projectProgressBaseline"
								:project-progress-current-stage-key="projectProgressCurrentStageKey"
								:project-progress-stage-options="projectProgressStageOptions"
								:selected-project-progress-stage="selectedProjectProgressStage"
								:project-progress-range="projectProgressRange"
								:project-progress-stage-hint="projectProgressStageHint"
								:project-table-title="projectTableTitle"
								:project-summary-cards="projectSummaryCards"
								:scoped-projects="scopedProjects"
								:current-user="currentUser"
								:get-project-attachment-count="getProjectAttachmentCount"
								:get-project-current-stage-key="getProjectCurrentStageKey"
								:get-project-stage-label="getProjectStageLabel"
								:get-project-description="getProjectDescription"
								:can-audit-project="canAuditProject"
								:can-submit-project-progress="canSubmitProjectProgress"
								@update-filter="handleProjectFilterUpdate"
								@reset-filters="resetProjectFilters"
								@open-detail="openProjectDetail"
								@open-create-dialog="openCreateProjectDialog"
								@open-progress="openProjectProgressDialog"
								@approve="approveProject"
								@reject="rejectProject"
								@update-detail-visible="projectDetailVisible = $event"
								@update-form-visible="projectFormVisible = $event"
								@reset-form="resetProjectFormAndClose"
								@update-progress-visible="projectProgressVisible = $event"
								@department-change="handleProjectDepartmentChange"
								@executor-change="handleProjectExecutorChange"
								@submit-form="submitProjectForm"
								@submit-progress="submitProjectProgress"
								@download-attachment="downloadProjectAttachment"
								@download-all-attachments="downloadAllProjectAttachments"
								@update:project-table-page="projectTablePage = $event"
								@update:project-table-page-size="projectTablePageSize = $event"
							/>
						</template>

						<template v-else-if="activeSection === 'reports'">
							<section class="report-page">
								<section class="metrics-grid report-metrics-grid">
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
											<el-tag type="primary" effect="plain">{{ reportTableTotal }} 条</el-tag>
										</div>
									</template>
									<div class="report-table-shell">
										<el-table
											v-if="reportTableData.length"
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
													<div class="report-row-actions">
														<el-button link type="primary" @click="openReportDetail(row)">详情</el-button>
														<el-button
															v-if="canCommentReport(row)"
															link
															type="warning"
															@click="openReportCommentDialog(row)"
														>
															{{ row.status === '已批注' ? '修改批注' : '写批注' }}
														</el-button>
														<el-popconfirm
															v-if="canDeleteReport(row)"
															title="确认删除这篇今日日报吗？删除后可重新填写。"
															confirm-button-text="删除"
															cancel-button-text="取消"
															@confirm="removeReport(row)"
														>
															<template #reference>
																<el-button link type="danger">删除</el-button>
															</template>
														</el-popconfirm>
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
										<div class="employee-pagination__total">共 {{ reportTableTotal }} 条</div>
										<el-pagination
											v-model:current-page="reportTablePage"
											v-model:page-size="reportTablePageSize"
											background
											layout="prev, pager, next, sizes"
											:page-sizes="[10, 20, 50]"
											:total="reportTableTotal"
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
											<div class="report-detail-panel__header">
												<div>
													<div class="report-detail-panel__title">{{ currentReportDetail.title }}</div>
													<div class="report-detail-panel__meta">
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
													<div v-if="currentReportRelatedProjects.length" class="report-project-links">
														<button
															v-for="project in currentReportRelatedProjects"
															:key="project.id"
															type="button"
															class="report-project-link"
															@click="openReportRelatedProject(project)"
														>
															{{ project.name }}
														</button>
													</div>
													<strong v-else>-</strong>
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

										<div class="report-detail-section">
											<div class="report-detail-section__header">
												<div class="report-detail-section__title">附件列表</div>
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
													:key="attachment?.key || attachment?.fileId || `${currentReportDetail.id}-${index}`"
													type="button"
													class="report-attachment-item"
													@click="downloadReportAttachment(currentReportDetail, attachment)"
												>
													<el-icon><Download /></el-icon>
													<span>{{ attachment?.fileName || attachment }}</span>
												</button>
											</div>
											<el-empty v-else :image-size="72" description="当前日报暂无附件" />
										</div>

										<div class="report-detail-section">
											<div class="report-detail-section__title">主管批注</div>
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
								v-model="projectDetailVisible"
								title="项目详情"
								width="920px"
								top="4vh"
								class="report-detail-dialog"
								append-to-body
							>
								<el-scrollbar v-if="currentProjectDetail" class="report-detail-scroll">
									<div class="project-detail-grid">
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
																		{{ attachment?.fileName || attachment }}
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
													v-if="currentProjectAttachments.length"
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
													:key="attachment?.key || `${currentProjectDetail.id}-${index}`"
													type="button"
													class="project-attachment-item"
													@click="downloadProjectAttachment(currentProjectDetail, attachment, '项目详情附件')"
												>
													<el-icon><Download /></el-icon>
													<span>{{ attachment?.fileName || attachment }}</span>
												</button>
											</div>
											<el-empty v-else :image-size="72" description="当前项目暂无附件" />
										</div>
									</div>
								</el-scrollbar>
								<template #footer>
									<div class="dialog-footer">
										<el-button @click="projectDetailVisible = false">关闭</el-button>
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
									<div class="report-form-grid">
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
											<el-select
												v-model="reportForm.relatedProjectIds"
												multiple
												collapse-tags
												collapse-tags-tooltip
												clearable
												:placeholder="reportProjectPlaceholder"
											>
												<el-option
													v-for="option in reportProjectOptions"
													:key="option.value"
													:label="option.label"
													:value="option.value"
												/>
											</el-select>
										</el-form-item>
										<el-form-item class="report-form-grid__full" label="日报标题">
											<el-input v-model="reportForm.title" placeholder="默认自动生成 YYYY-MM-DD 日报，可手动覆盖" />
										</el-form-item>
										<el-form-item class="report-form-grid__full" label="今日工作" prop="workContent">
											<el-input
												v-model="reportForm.workContent"
												type="textarea"
												:rows="4"
												placeholder="请输入今日工作内容"
											/>
										</el-form-item>
										<el-form-item class="report-form-grid__full" label="明日计划" prop="tomorrowPlan">
											<el-input
												v-model="reportForm.tomorrowPlan"
												type="textarea"
												:rows="3"
												placeholder="请输入明日计划"
											/>
										</el-form-item>
										<el-form-item class="report-form-grid__full" label="遇到的问题">
											<el-input
												v-model="reportForm.problems"
												type="textarea"
												:rows="3"
												placeholder="如无问题可留空"
											/>
										</el-form-item>
										<el-form-item class="report-form-grid__full" label="附件">
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
														支持 jpg、png、pdf、doc、docx、xls、xlsx，单个不超过 10MB，最多 10 个。
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
												<div class="settings-avatar__tip">支持 jpg/png/gif，最大 2MB</div>
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
														当前页面仅开放联系方式与头像修改；姓名、部门、职位保持只读。
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
import { getPersonalCenterFocusState, updatePersonalCenterFocusState } from '../../api/personalCenterFocus';
import { useChatWebSocket } from '../../composables/useChatWebSocket';
import {
	getCurrentUser,
	getOptions,
	getDepartments,
	getEmployees,
	getDepartmentExecutors,
	getProjects,
	getProject,
	createProject,
	uploadFilesWithProgress as apiUploadFilesWithProgress,
	downloadFile as apiDownloadFile,
	downloadProjectAttachments as apiDownloadProjectAttachments,
	downloadReportAttachments as apiDownloadReportAttachments,
	resolveAttachmentUrl,
	submitProjectProgress as apiSubmitProjectProgress,
	approveProject as apiApproveProject,
	rejectProject as apiRejectProject,
	getReports,
	getReport,
	createReport,
	deleteReport,
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
	Bell,
	Close,
	DataAnalysis,
	Download,
	Document,
	FolderOpened,
	SetUp,
	UploadFilled,
	User,
} from '@element-plus/icons-vue';
import EmployeeManagement from './EmployeeManagement.vue';
import ProjectManagement from './ProjectManagement.vue';
import {
	departments,
	employees,
	projects,
	reports,
	roleSwitchOptions,
	roleTestUserMap,
	overviewRangeOptions,
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
const REPORT_RUNTIME_TODAY = formatDate(new Date());
const DAY_MS = 24 * 60 * 60 * 1000;
const PROJECT_ATTACHMENT_MAX_COUNT = 10;
const PROJECT_ATTACHMENT_MAX_SIZE = 50 * 1024 * 1024;
const PROJECT_ATTACHMENT_MAX_TOTAL_SIZE = 200 * 1024 * 1024;
const PROJECT_ATTACHMENT_ACCEPTED_EXTENSIONS = ['.jpg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip'];
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
const projectListState = reactive({
	items: [],
	total: 0,
	pageIndex: 1,
	pageSize: 10,
	metrics: null,
	cache: [],
});
const reportListState = reactive({
	items: [],
	total: 0,
	pageIndex: 1,
	pageSize: 10,
	totalPages: 0,
	metrics: null,
	todayReport: null,
	canWriteToday: null,
});
const overviewRealtimeStats = reactive({
	todaySubmitted: null,
	expectedCount: null,
});
const {
	connectionStatus: reportReminderSocketStatus,
	lastRefreshSignal,
	messageList,
	removeChatMessage,
	clearChatMessages,
} = useChatWebSocket();
const visibleMessageList = computed(() => (
	messageList.value
		.filter((item) => item?.Type && !['Pong', 'Ping'].includes(item.Type))
		.slice()
		.sort((a, b) => getSocketMessageTime(b) - getSocketMessageTime(a))
));
const messageCount = computed(() => visibleMessageList.value.length);
const reportReminderSocketLabel = computed(() => {
	if (reportReminderSocketStatus.value === 'connected') return '提醒通道已连接';
	if (['connecting', 'reconnecting'].includes(reportReminderSocketStatus.value)) return '提醒通道连接中';
	if (reportReminderSocketStatus.value === 'error') return '提醒通道异常';
	return '提醒通道未连接';
});
const reportReminderSocketTagType = computed(() => {
	if (reportReminderSocketStatus.value === 'connected') return 'success';
	if (['connecting', 'reconnecting'].includes(reportReminderSocketStatus.value)) return 'warning';
	if (reportReminderSocketStatus.value === 'error') return 'danger';
	return 'info';
});
const messageDrawerVisible = ref(false);

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

// 标记API数据是否正在加载中
const apiDataLoading = reactive({
	departments: false,
	employees: false,
	projects: false,
	reports: false,
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

function normalizeOptionalBoolean(value) {
	if (value === true || value === false) return value;
	if (value === 'true') return true;
	if (value === 'false') return false;
	return undefined;
}

function looksLikeIsoDateString(value) {
	if (typeof value !== 'string') return false;
	const normalized = value.trim();
	return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(normalized);
}

function normalizeApiDateLike(value, { withTime = false } = {}) {
	const raw = String(safeGet(value, '')).trim();
	if (!raw) return '';
	if (!looksLikeIsoDateString(raw)) return raw;
	const [datePart, timePart = ''] = raw.split('T');
	const normalizedTime = timePart.slice(0, 5);
	if (!withTime) return datePart;
	if (!normalizedTime || normalizedTime === '00:00') return datePart;
	return `${datePart} ${normalizedTime}`;
}

/**
 * 处理 API 调用错误，显示友好的错误提示
 * @param {Error} error 错误对象
 * @param {string} fallbackMsg 默认错误提示
 * @returns {boolean} 是否已处理错误（返回true表示错误已被处理）
 */
function handleApiError(error, fallbackMsg = '操作失败，请稍后重试') {
	// 业务错误码错误（已在 request.js 中处理）
	if (error.isBusinessError) {
		ElMessage.error(error.message);
		return true;
	}

	// HTTP 错误
	if (error.status === 401) {
		// 401 已在 request.js 中处理跳转，此处不重复提示
		return false;
	}

	if (error.status === 403) {
		ElMessage.error('您没有权限执行此操作');
		return true;
	}

	if (error.status === 404) {
		ElMessage.error('请求的数据不存在');
		return true;
	}

	if (error.status === 0) {
		ElMessage.error('网络异常，请检查网络连接后重试');
		return true;
	}

	// 其他错误
	ElMessage.error(error.message || fallbackMsg);
	return true;
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
		description: '展示统计总览、项目状态、日报情况和快捷操作入口。',
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
const projectTablePage = ref(1);
const projectTablePageSize = ref(10);
const projectDetailVisible = ref(false);
const projectFormVisible = ref(false);
const projectProgressVisible = ref(false);
const projectUploadProgressVisible = ref(false);
const projectUploadProgress = ref(0);
const projectUploadProgressText = ref('准备上传附件...');
const reportTablePage = ref(1);
const reportTablePageSize = ref(10);
const reportDetailVisible = ref(false);
const reportFormVisible = ref(false);
const reportCommentVisible = ref(false);
const projectFormRef = ref(null);
const projectProgressFormRef = ref(null);
const reportFormRef = ref(null);
const reportCommentFormRef = ref(null);

// 子组件 ref
const projectManagementRef = ref(null);
const settingsFormRef = ref(null);
const activeProjectId = ref('');
const activeReportId = ref('');
const settingsAvatarState = reactive({});
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
	relatedProjectIds: [],
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

// 用于项目管理表单联动的部门选项
const projectDepartmentOptions = computed(() => {
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return [currentUser.value.department];
	}
	// 只使用API部门数据
	if (apiData.departments.length === 0) {
		return [];
	}
	const apiDepartments = apiData.departments.map(d => d.name);

	// 如果选择了执行人，只显示该执行人所属的部门
	if (projectForm.executor) {
		const executorEmployee = projectExecutorEmployees.value.find(e => e.name === projectForm.executor);
		if (executorEmployee) {
			return apiDepartments.filter(dept => dept === executorEmployee.department);
		}
	}

	return apiDepartments;
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

// 用于项目管理表单的执行人选项，只使用API员工数据
const projectExecutorEmployees = computed(() => {
	// 只使用API员工数据
	return apiData.employees;
});

const availableProjectExecutors = computed(() => {
	// 只使用API员工数据
	const employeeList = projectExecutorEmployees.value;
	if (employeeList.length === 0) {
		return [];
	}

	// 如果选择了部门，只显示该部门的员工
	const department = projectForm.department || (currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '');

	return employeeList.filter((item) => {
		// 允许部门主管(ROLE_ENUM.MANAGER)和员工(ROLE_ENUM.EMPLOYEE)作为执行人
		const isValidRole = item.role === ROLE_ENUM.MANAGER || item.role === ROLE_ENUM.EMPLOYEE;
		return isValidRole
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
const filteredProjects = computed(() => {
	const keyword = projectFilters.keyword.trim().toLowerCase();
	return (projectListState.items.length ? projectListState.items : scopedProjects.value).filter((item) => {
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
const projectStatusDistributionMap = computed(() => {
	const distribution = safeArray(apiData.overview?.projectStatusDistribution);
	return distribution.reduce((map, item) => {
		const name = String(safeGet(item?.name || item?.label, '')).trim();
		if (!name) return map;
		map[name] = {
			count: Number(item?.value) || 0,
			percent: Number(item?.percent) || 0,
		};
		return map;
	}, {});
});
const overviewReportStats = computed(() => {
	return apiData.overview?.reportStats
		|| apiData.overview?.reports
		|| apiData.overview?.reportOverviewStats
		|| null;
});
const overviewProjectTotal = computed(() => {
	if (apiData.overview?.summaryCards?.length) {
		const projectCard = findOverviewSummaryCard(['totalProjects', 'deptProjects', 'myProjects', 'projects']);
		const cardValue = parseMetricNumber(projectCard?.value ?? projectCard?.count);
		if (cardValue !== null) return cardValue;
	}
	const distributionTotal = Object.values(projectStatusDistributionMap.value).reduce((sum, item) => {
		return sum + Number(item?.count || 0);
	}, 0);
	if (distributionTotal > 0) return distributionTotal;
	return scopedProjects.value.length;
});
const paginatedProjects = computed(() => filteredProjects.value);
const filteredPendingReviewProjects = computed(() => filteredProjects.value.filter((item) => item.status === '待审核'));
const filteredActiveProjects = computed(() => filteredProjects.value.filter((item) => item.status === '进行中'));
const filteredCompletedProjects = computed(() => filteredProjects.value.filter((item) => item.status === '已完成'));
const projectMetrics = computed(() => projectListState.metrics || null);
const projectTableTotal = computed(() => {
	if (projectListState.total > 0) return projectListState.total;
	return filteredProjects.value.length;
});
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
	// 优先从API数据中查找，如果没有则从模拟数据中查找
	return apiData.projects.find((item) => item.id === activeProjectId.value)
		|| projects.find((item) => item.id === activeProjectId.value)
		|| null;
});
const currentProjectAttachments = computed(() => {
	return currentProjectDetail.value ? getProjectAttachmentList(currentProjectDetail.value) : [];
});
const currentUserAvatar = computed(() => settingsAvatarState[currentUser.value.id] || '');
const settingsAvatarPreview = computed(() => currentUserAvatar.value);
const currentReportDetail = computed(() => {
	return apiData.reports.find((item) => item.id === activeReportId.value)
		|| reports.find((item) => item.id === activeReportId.value)
		|| null;
});
const currentReportAttachments = computed(() => {
	return currentReportDetail.value ? getReportAttachmentList(currentReportDetail.value) : [];
});
const currentReportRelatedProjects = computed(() => {
	if (!currentReportDetail.value) return [];
	const projectIds = normalizeReportRelatedProjectIds(currentReportDetail.value);
	const relatedNames = splitRelatedProjectNames(currentReportDetail.value.relatedProject);
	return projectIds.map((projectId, index) => {
		const project = findProjectById(projectId);
		return {
			id: projectId,
			name: project?.projectName || relatedNames[index] || projectId,
			project,
		};
	});
});
const progressTargetProject = computed(() => {
	if (!projectProgressForm.projectId) return null;
	// 优先从API数据中查找
	return apiData.projects.find((item) => item.id === projectProgressForm.projectId)
		|| projects.find((item) => item.id === projectProgressForm.projectId)
		|| null;
});
const projectProgressBaseline = computed(() => Number(progressTargetProject.value?.progress || 0));
const projectProgressCurrentStageKey = computed(() => getProjectCurrentStageKey(progressTargetProject.value));
const projectProgressStageOptions = computed(() => getAvailableProjectStageOptions(progressTargetProject.value));
const selectedProjectProgressStage = computed(() => {
	return projectProgressStageOptions.value.find((item) => item.key === projectProgressForm.stageKey) || null;
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
const reportTableData = computed(() => {
	return reportListState.items.length ? reportListState.items : filteredReports.value;
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
	if (reportListState.items.length) return reportListState.items;
	const start = (reportTablePage.value - 1) * reportTablePageSize.value;
	return filteredReports.value.slice(start, start + reportTablePageSize.value);
});
const reportMetrics = computed(() => reportListState.metrics || null);
const reportTableTotal = computed(() => {
	if (reportListState.total > 0 || reportListState.items.length) return reportListState.total;
	return filteredReports.value.length;
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
	if (reportListState.todayReport?.id && isReportOwnedByCurrentUser(reportListState.todayReport)) {
		return reportListState.todayReport;
	}
	const matchesCurrentUserToday = (item) => isReportOwnedByCurrentUser(item) && getReportSubmitDate(item) === REPORT_RUNTIME_TODAY;
	return apiData.reports.find(matchesCurrentUserToday) || reports.find(matchesCurrentUserToday) || null;
});
const reportSummaryCards = computed(() => {
	if (reportMetrics.value) {
		const todaySubmitted = Number(reportMetrics.value.todaySubmitted || 0);
		const pendingCommentCount = Number(reportMetrics.value.pendingCommentCount || 0);
		const commentedCount = Number(reportMetrics.value.commentedCount || 0);
		const submitRate = Number(reportMetrics.value.submitRate || 0);
		const actualSubmitCount = Number(reportMetrics.value.actualSubmitCount || 0);
		const expectedSubmitCount = Number(reportMetrics.value.expectedSubmitCount || 0);
		if (currentRole.value === ROLE_ENUM.EMPLOYEE) {
			return [
				{ key: 'today', label: '今日日报状态', value: currentEmployeeTodayReport.value ? currentEmployeeTodayReport.value.status : '待提交', hint: currentEmployeeTodayReport.value ? `已于 ${currentEmployeeTodayReport.value.submitTime} 提交，提交后不可修改` : '今天还没有提交日报' },
				{ key: 'history', label: '历史日报数', value: `${reportTableTotal.value} 条`, hint: '仅展示当前员工可见的历史记录' },
				{ key: 'commented', label: '已批注日报', value: `${commentedCount} 条`, hint: '主管批注后会在历史列表中同步显示' },
				{ key: 'rate', label: '本周提交率', value: `${submitRate}%`, hint: `本周已提交 ${actualSubmitCount} / ${expectedSubmitCount || 0} 次` },
			];
		}
		return [
			{ key: 'today', label: '今日提交数', value: `${todaySubmitted} 条`, hint: `${todaySubmitted} 名员工今日已提交日报` },
			{ key: 'pending', label: '待批注', value: `${pendingCommentCount} 条`, hint: '优先处理状态为已提交的日报' },
			{ key: 'commented', label: '已批注', value: `${commentedCount} 条`, hint: '当前筛选范围内已完成批注的日报' },
			{ key: 'rate', label: '本周提交率', value: `${submitRate}%`, hint: `本周已提交 ${actualSubmitCount} / ${expectedSubmitCount || 0} 次` },
		];
	}
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

const dashboardTodayLabel = computed(() => REPORT_RUNTIME_TODAY);
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
const overviewRangeReportCount = computed(() => {
	const statsValue = parseMetricNumber(overviewReportStats.value?.rangeReportCount);
	return statsValue !== null ? statsValue : reportsInRange.value.length;
});
const submittedEmployeeIdsToday = computed(() => {
	return new Set(
		scopedReports.value
			.filter((item) => getReportSubmitDate(item) === REPORT_RUNTIME_TODAY)
			.map((item) => item.employeeId)
	);
});
const todaySubmittedReportsCount = computed(() => submittedEmployeeIdsToday.value.size);
const overviewTodaySubmittedReportsCount = computed(() => {
	if (overviewRealtimeStats.todaySubmitted !== null) return overviewRealtimeStats.todaySubmitted;
	const statsValue = parseMetricNumber(overviewReportStats.value?.todaySubmitted);
	if (statsValue !== null) return statsValue;
	const card = findOverviewSummaryCard(['todayReports']);
	const cardValue = parseMetricFraction(card?.hint)?.current ?? null;
	return cardValue !== null ? cardValue : todaySubmittedReportsCount.value;
});
const overviewPendingReportsCount = computed(() => {
	if (overviewRealtimeStats.todaySubmitted !== null && overviewRealtimeStats.expectedCount !== null) {
		return Math.max(0, overviewRealtimeStats.expectedCount - overviewRealtimeStats.todaySubmitted);
	}
	const statsValue = parseMetricNumber(overviewReportStats.value?.pending);
	if (statsValue !== null) return statsValue;
	const card = findOverviewSummaryCard(['todayReports', 'deptReports']);
	const cardFraction = parseMetricFraction(card?.hint);
	if (cardFraction?.total !== null && cardFraction?.current !== null) {
		return Math.max(0, cardFraction.total - cardFraction.current);
	}
	return Math.max(scopedEmployees.value.length - todaySubmittedReportsCount.value, 0);
});
const overviewReportExpectedCount = computed(() => {
	if (overviewRealtimeStats.expectedCount !== null) return overviewRealtimeStats.expectedCount;
	const fromStats = overviewTodaySubmittedReportsCount.value + overviewPendingReportsCount.value;
	if (fromStats > 0) return fromStats;
	const card = findOverviewSummaryCard(['todayReports', 'deptReports']);
	const cardTotal = parseMetricFraction(card?.hint)?.total ?? null;
	return cardTotal !== null ? cardTotal : scopedEmployees.value.length;
});
const todayReportRate = computed(() => {
	if (overviewRealtimeStats.todaySubmitted !== null && overviewRealtimeStats.expectedCount) {
		return toPercent(overviewRealtimeStats.todaySubmitted, overviewRealtimeStats.expectedCount);
	}
	const statsRate = normalizePercentValue(overviewReportStats.value?.submitRate);
	if (statsRate !== null) return statsRate;
	const card = findOverviewSummaryCard(['deptReports', 'submissionRate']) || findOverviewSummaryCard(['todayReports']);
	const cardRate = String(card?.value || '').includes('%') ? normalizePercentValue(card?.value) : null;
	if (cardRate !== null) return cardRate;
	return toPercent(overviewTodaySubmittedReportsCount.value, overviewReportExpectedCount.value);
});
const pendingReviewProjects = computed(() => scopedProjects.value.filter((item) => item.status === '待审核'));
const activeProjects = computed(() => scopedProjects.value.filter((item) => item.status === '进行中'));
const completedProjects = computed(() => scopedProjects.value.filter((item) => item.status === '已完成'));
const averageProjectProgress = computed(() => {
	if (!scopedProjects.value.length) return 0;
	const total = scopedProjects.value.reduce((sum, item) => sum + Number(item.progress || 0), 0);
	return Math.round(total / scopedProjects.value.length);
});
const projectStatusItems = computed(() => {
	const total = overviewProjectTotal.value;
	const distributionMap = projectStatusDistributionMap.value;
	if (Object.keys(distributionMap).length > 0) {
		return [
			{ key: 'pending', label: '待审核', count: Number(distributionMap['待审核']?.count || 0), color: '#f59e0b', percent: Number(distributionMap['待审核']?.percent || toPercent(distributionMap['待审核']?.count || 0, total)) },
			{ key: 'active', label: '进行中', count: Number(distributionMap['进行中']?.count || 0), color: '#0ea5e9', percent: Number(distributionMap['进行中']?.percent || toPercent(distributionMap['进行中']?.count || 0, total)) },
			{ key: 'completed', label: '已完成', count: Number(distributionMap['已完成']?.count || 0), color: '#10b981', percent: Number(distributionMap['已完成']?.percent || toPercent(distributionMap['已完成']?.count || 0, total)) },
		];
	}
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
	if (overviewReportStats.value) {
		const submittedDays = parseMetricNumber(overviewReportStats.value.submittedDays);
		const pendingDays = parseMetricNumber(overviewReportStats.value.pendingDays);
		const rangeReportCount = parseMetricNumber(overviewReportStats.value.rangeReportCount);
		const submitRate = normalizePercentValue(overviewReportStats.value.submitRate);
		return {
			submittedDays: submittedDays ?? rangeReportCount ?? 0,
			pendingDays: pendingDays ?? Math.max(overviewRangeDays.value - (submittedDays ?? rangeReportCount ?? 0), 0),
			todayStatus: safeGet(overviewReportStats.value.todayStatus, todaySubmittedReportsCount.value > 0 ? '已提交' : '待提交'),
			rate: submitRate ?? toPercent(submittedDays ?? rangeReportCount ?? 0, overviewRangeDays.value),
		};
	}
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
	// 接口返回真实数据时优先使用
	if (apiData.overview?.summaryCards?.length) {
		return apiData.overview.summaryCards;
	}

	if (currentRole.value === ROLE_ENUM.ADMIN) {
		return [
			{ key: 'employees', label: '员工总数', value: `${scopedEmployees.value.length} 人`, hint: `覆盖 ${departments.length} 个部门的测试样本` },
			{ key: 'projects', label: '项目总数', value: `${overviewProjectTotal.value} 个`, hint: `其中 ${pendingReviewProjects.value.length} 个待审核项目` },
			{ key: 'active', label: '进行中项目', value: `${activeProjects.value.length} 个`, hint: `未来 7 天内 ${upcomingProjects.value.length} 个项目到期` },
			{ key: 'reports', label: '今日日报提交率', value: `${todayReportRate.value}%`, hint: `${overviewTodaySubmittedReportsCount.value} / ${overviewReportExpectedCount.value || 0} 人已提交日报` },
		];
	}
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		return [
			{ key: 'employees', label: '部门员工数', value: `${scopedEmployees.value.length} 人`, hint: `当前部门：${currentUser.value.department}` },
			{ key: 'projects', label: '部门项目数', value: `${overviewProjectTotal.value} 个`, hint: `本部门有 ${pendingReviewProjects.value.length} 个待审核项目` },
			{ key: 'completion', label: '项目完成率', value: `${toPercent(completedProjects.value.length, scopedProjects.value.length)}%`, hint: `${completedProjects.value.length} / ${scopedProjects.value.length || 0} 个项目已完成` },
			{ key: 'reports', label: '部门日报提交率', value: `${todayReportRate.value}%`, hint: `${overviewTodaySubmittedReportsCount.value} / ${overviewReportExpectedCount.value || 0} 人今日已提交日报` },
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
	if (projectMetrics.value) {
		const totalProjects = Number(projectMetrics.value.totalProjects || projectTableTotal.value || 0);
		const pendingReviewCount = Number(projectMetrics.value.pendingReviewProjects || 0);
		const activeCount = Number(projectMetrics.value.activeProjects || 0);
		const completedCount = Number(projectMetrics.value.completedProjects || 0);
		const upcomingCount = Number(projectMetrics.value.upcomingProjects || 0);
		if (currentRole.value === ROLE_ENUM.ADMIN) {
			return [
				{ key: 'total', label: '全部项目', value: `${totalProjects} 个`, hint: `当前筛选结果覆盖 ${totalProjects} 个项目` },
				{ key: 'pending', label: '待审核项目', value: `${pendingReviewCount} 个`, hint: '管理员可直接跨部门审核完成项目' },
				{ key: 'active', label: '进行中项目', value: `${activeCount} 个`, hint: `当前筛选结果中 ${upcomingCount} 个项目 7 天内到期` },
				{ key: 'completed', label: '已完成项目', value: `${completedCount} 个`, hint: `当前筛选完成率 ${toPercent(completedCount, totalProjects)}%` },
			];
		}
		if (currentRole.value === ROLE_ENUM.MANAGER) {
			return [
				{ key: 'total', label: '本部门项目', value: `${totalProjects} 个`, hint: `当前部门：${currentUser.value.department}` },
				{ key: 'pending', label: '待审核项目', value: `${pendingReviewCount} 个`, hint: '待管理员最终审核通过后才会结束任务' },
				{ key: 'active', label: '进行中项目', value: `${activeCount} 个`, hint: `${availableProjectExecutors.value.length} 名可分配执行员工` },
				{ key: 'completed', label: '完成率', value: `${toPercent(completedCount, totalProjects)}%`, hint: `${completedCount} / ${totalProjects} 个项目已完成` },
			];
		}
		return [
			{ key: 'total', label: '我的项目', value: `${totalProjects} 个`, hint: `其中 ${pendingReviewCount} 个等待管理员审核` },
			{ key: 'active', label: '进行中项目', value: `${activeCount} 个`, hint: '可继续提交阶段性进度' },
			{ key: 'completed', label: '已完成项目', value: `${completedCount} 个`, hint: `当前完成率 ${toPercent(completedCount, totalProjects)}%` },
			{ key: 'upcoming', label: '即将到期', value: `${upcomingCount} 个`, hint: '重点关注本周截止项目' },
		];
	}
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
const socketMessageTypeLabelMap = {
	report_submit_reminder: '日报提醒',
	report_submitted: '日报提交',
	report_commented: '日报批注',
	project_assigned: '项目下发',
	project_updated: '项目更新',
	project_progress_updated: '进度更新',
	project_due_soon: '项目到期',
	project_approved: '审核通过',
	project_rejected: '审核驳回',
	Message: '消息',
};
const socketMessageTagTypeMap = {
	report_submit_reminder: 'warning',
	project_due_soon: 'danger',
	project_rejected: 'danger',
	project_assigned: 'primary',
	project_progress_updated: 'primary',
	project_updated: 'primary',
	report_submitted: 'success',
	report_commented: 'success',
	project_approved: 'success',
};

function openMessageDrawer() {
	messageDrawerVisible.value = true;
}

function getSocketMessageTime(item) {
	const parsed = Date.parse(item?.CreateTime || '');
	return Number.isFinite(parsed) ? parsed : Number(item?.__receivedAt || 0);
}

function getMessageSender(item) {
	return item?.SenderRealName || item?.SenderName || '系统提醒';
}

function getMessageTypeLabel(item) {
	return socketMessageTypeLabelMap[item?.Type] || item?.Type || '消息';
}

function getMessageTagType(item) {
	return socketMessageTagTypeMap[item?.Type] || 'info';
}

function getMessageCategory(item) {
	const type = item?.Type || '';
	const bizType = item?.BizType || '';
	if (type.startsWith('employee_') || bizType === 'employee') return 'employee';
	if (type.startsWith('project_') || bizType === 'project' || bizType === 'projectProgress') return 'project';
	if (type.startsWith('report_') || bizType === 'report') return 'report';
	return 'system';
}

function getMessageIcon(item) {
	const category = getMessageCategory(item);
	if (category === 'employee') return User;
	if (category === 'project') return FolderOpened;
	if (category === 'report') return Document;
	if (category === 'system') return SetUp;
	return Bell;
}

function formatMessageTime(dateString) {
	const date = new Date(dateString || '');
	if (Number.isNaN(date.getTime())) return '--';
	return formatDateTime(date);
}

function handleDeleteMessage(item) {
	removeChatMessage(item?.__key);
}

function handleClearMessages() {
	clearChatMessages();
}

watch(currentRole, (nextRole) => {
	writePersistedRole(nextRole);
	triggerSectionLoading();
	if (!visibleSections.value.some((item) => item.key === activeSection.value)) {
		activeSection.value = visibleSections.value[0]?.key || 'overview';
	}
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
	() => [projectFilters.keyword, projectFilters.department, projectFilters.status, projectFilters.priority, projectFilters.progress, currentRole.value].join('|'),
	() => {
		projectTablePage.value = 1;
	}
);
watch(
	() => [activeSection.value, projectTablePage.value, projectTablePageSize.value, projectFilters.keyword, projectFilters.department, projectFilters.status, projectFilters.priority, projectFilters.progress, currentRole.value].join('|'),
	() => {
		if (activeSection.value === 'projects') {
			loadProjects();
		}
	}
);
watch(
	() => [reportFilters.keyword, reportFilters.department, reportFilters.status, JSON.stringify(reportFilters.dateRange || []), currentRole.value].join('|'),
	() => {
		reportTablePage.value = 1;
	}
);
watch(
	() => [activeSection.value, reportTablePage.value, reportTablePageSize.value, reportFilters.keyword, reportFilters.department, reportFilters.status, JSON.stringify(reportFilters.dateRange || []), currentRole.value].join('|'),
	() => {
		if (activeSection.value === 'reports') {
			loadReports();
		}
	}
);
watch(
	() => activeReportId.value,
	async (nextId) => {
		if (nextId) {
			const detail = await loadReportDetail(nextId);
			await preloadReportRelatedProjects(detail || currentReportDetail.value);
		}
	}
);
watch(
	() => [projectProgressForm.stageKey, projectProgressBaseline.value].join('|'),
	() => {
		applyProjectStageProgressPreset();
	}
);

watch(
	() => JSON.stringify({
		visible: reportFormVisible.value,
		canWrite: canWriteReport.value,
		userId: currentUser.value.id,
		date: reportForm.date,
		title: reportForm.title,
		relatedProjectIds: reportForm.relatedProjectIds,
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
		if (activeSection.value === 'overview') {
			loadOverviewRealtimeStats();
		}
	},
	{ immediate: true }
);

// 监听切换到项目管理页时加载项目数据
watch(
	() => activeSection.value,
	(nextSection) => {
	if (nextSection === 'projects') {
		loadDepartments();
		loadEmployees();
	} else if (nextSection === 'reports') {
		loadReports();
		if (canWriteReport.value) {
			loadReportProjectOptions();
		}
	} else if (nextSection === 'overview') {
		loadOverviewData({ range: overviewRange.value, trendMode: projectTrendMode.value });
		loadOverviewRealtimeStats();
	}
}
);

watch(
	() => lastRefreshSignal.value?.eventId || '',
	async (eventId) => {
		if (!eventId || !props.active) return;

		const signal = lastRefreshSignal.value;
		const targets = new Set((signal?.refreshHints || []).map((item) => item.target).filter(Boolean));
		if (!signal?.needRefresh && targets.size === 0) return;
		const shouldRefreshAll = Boolean(signal?.needRefresh) || targets.size === 0;

		if ((shouldRefreshAll || targets.has('overview')) && activeSection.value === 'overview') {
			await loadOverviewData({ range: overviewRange.value, trendMode: projectTrendMode.value });
			await loadOverviewRealtimeStats();
		}
		if ((shouldRefreshAll || targets.has('projects')) && activeSection.value === 'projects') {
			await loadProjects();
		}
		if ((shouldRefreshAll || targets.has('projectDetail')) && projectDetailVisible.value && activeProjectId.value) {
			await loadProjectDetail(activeProjectId.value);
		}
		if ((shouldRefreshAll || targets.has('reports')) && activeSection.value === 'reports') {
			await loadReports();
		}
		if ((shouldRefreshAll || targets.has('reportDetail')) && reportDetailVisible.value && activeReportId.value) {
			await loadReportDetail(activeReportId.value);
		}
	},
);

// 监听首页概览参数变化时重新加载数据
watch(
	[() => overviewRange.value, () => projectTrendMode.value],
	() => {
		if (activeSection.value === 'overview' && !sectionLoading.value) {
			loadOverviewData({ range: overviewRange.value, trendMode: projectTrendMode.value });
		}
	}
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
		() => JSON.stringify(apiData.overview || {}),
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
	// 加载管理中心概览数据
	loadOverviewData({ range: overviewRange.value, trendMode: projectTrendMode.value });
	loadOverviewRealtimeStats();
	if (currentRole.value === ROLE_ENUM.MANAGER) {
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

function handleApiDataUpdate(newApiData) {
	Object.assign(apiData, newApiData);
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
	console.log(uploadFile)
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
		const res = await apiUploadAvatar(rawFile, currentUser.value.id);
		if (res && res.code === 0 && res.data?.files?.[0]?.url) {
			const avatarUrl = res.data.files[0].url;
			currentUserApiData.value.avatarUrl = avatarUrl;
			writePersistedSettingsAvatar(currentUser.value.id, avatarUrl);
			ElMessage.success('头像已更新');
		} else {
			const dataUrl = await readFileAsDataUrl(rawFile);
			writePersistedSettingsAvatar(currentUser.value.id, dataUrl);
			ElMessage.success('头像已更新（本地预览）');
		}
	} catch {
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

function handleProjectFilterUpdate(key, value) {
	if (key in projectFilters) {
		projectFilters[key] = value;
	}
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
	if (!project?.id) return;
	activeProjectId.value = project.id;
	projectDetailVisible.value = true;
	refreshProjectDetail(project.id);
}

function openReportRelatedProject(projectLink) {
	const projectId = String(projectLink?.id || '').trim();
	if (!projectId) return;
	const project = projectLink?.project || findProjectById(projectId) || { id: projectId, projectName: projectLink?.name || projectId };
	openProjectDetail(project);
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
	if (!projectForm.department) {
		projectForm.department = currentRole.value === ROLE_ENUM.MANAGER ? currentUser.value.department : '';
	}
	// 确保员工数据已加载
	if (!apiDataLoaded.employees) {
		loadEmployees();
	}
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

async function openProjectProgressDialog(project) {
	if (!canSubmitProjectProgress(project)) return;
	activeProjectId.value = project.id;
	const detail = await refreshProjectDetail(project.id);
	resetProjectProgressForm(detail || project);
	projectProgressVisible.value = true;
}

function openReportCommentDialog(report) {
	if (!canCommentReport(report)) return;
	activeReportId.value = report.id;
	resetReportCommentForm(report);
	reportDetailVisible.value = false;
	reportCommentVisible.value = true;
}

function removeReportFromState(report) {
	if (!report?.id) return;
	const reportId = String(report.id);
	const matchesReport = (item) => String(item?.id || '') === reportId;
	const wasTodayReport = getReportSubmitDate(report) === REPORT_RUNTIME_TODAY && isReportOwnedByCurrentUser(report);
	const wasListed = apiData.reports.some(matchesReport) || reportListState.items.some(matchesReport);

	apiData.reports = apiData.reports.filter((item) => !matchesReport(item));
	reportListState.items = reportListState.items.filter((item) => !matchesReport(item));

	if (wasListed && reportListState.total > 0) {
		reportListState.total = Math.max(0, Number(reportListState.total || 0) - 1);
	}
	if (wasTodayReport || matchesReport(reportListState.todayReport)) {
		reportListState.todayReport = null;
		reportListState.canWriteToday = true;
	}
	if (matchesReport(currentReportDetail.value)) {
		activeReportId.value = '';
		reportDetailVisible.value = false;
		reportCommentVisible.value = false;
	}
}

async function removeReport(report) {
	if (!canDeleteReport(report)) return;
	try {
		await deleteReport(report.id);
		removeReportFromState(report);
		clearPersistedReportDraft(currentUser.value.id, REPORT_RUNTIME_TODAY);
		await loadReports({ pageIndex: reportTablePage.value });
		ElMessage.success('今日日报已删除，可以重新填写');
	} catch (err) {
		handleApiError(err, '日报删除失败');
	}
}

async function fetchCurrentUserApi() {
	try {
		const res = await getCurrentUser();
		if (res && res.code === 0 && res.data) {
			console.log(res.data)
			currentUserApiData.value = res.data;
			// 自动同步真实用户权限到模拟角色
			const realUserRole = res.data.role;
			if (realUserRole && Object.values(ROLE_ENUM).includes(realUserRole)) {
				// 仅在从未手动切换过角色时自动同步（通过 localStorage 判断）
				const hasManualSwitch = localStorage.getItem(ROLE_STORAGE_KEY);
				if (!hasManualSwitch) {
					currentRole.value = realUserRole;
				}
			}
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
	apiDataLoading.employees = true;
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
	} finally {
		apiDataLoaded.employees = true;
		apiDataLoading.employees = false;
	}
}

/**
 * 加载项目列表
 */
async function loadProjects(params = {}) {
	apiDataLoading.projects = true;
	try {
		const query = {
			keyword: projectFilters.keyword || undefined,
			status: projectFilters.status || undefined,
			priority: projectFilters.priority || undefined,
			progressMin: projectFilters.progress || undefined,
			pageIndex: projectTablePage.value,
			pageSize: projectTablePageSize.value,
			...params,
		};
		if (currentRole.value === ROLE_ENUM.MANAGER) {
			const currentDepartmentId = currentUser.value.departmentId
				|| apiData.departments.find((item) => item.name === currentUser.value.department)?.id;
			query.departmentId = currentDepartmentId || query.departmentId;
		} else if (projectFilters.department) {
			const matchedDepartment = apiData.departments.find((item) => item.name === projectFilters.department);
			query.departmentId = matchedDepartment?.id || query.departmentId;
		}
		const res = await getProjects(query);
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
				createdAt: normalizeApiDateLike(item.createdAt),
				progress: Number(item.progress) || 0,
				currentStageKey: safeGet(item.currentStageKey),
				currentStage: safeGet(item.currentStage),
				status: safeGet(item.status, '进行中'),
				deadline: normalizeApiDateLike(item.deadline),
				daysLeft: Number(item.daysLeft) || 0,
				attachments: Number(item.attachments) || 0,
				priority: safeGet(item.priority, '中'),
				projectDesc: safeGet(item.projectDesc),
				canViewDetail: Boolean(item.canViewDetail),
				canSubmitProgress: normalizeOptionalBoolean(item.canSubmitProgress),
				canAudit: Boolean(item.canAudit),
				progressHistory: [],
				progressSubmissions: [],
				attachmentList: [],
			}));
			projectListState.items = apiData.projects;
			projectListState.total = Number(res.data.total) || items.length;
			projectListState.pageIndex = Number(res.data.pageIndex) || query.pageIndex || 1;
			projectListState.pageSize = Number(res.data.pageSize) || query.pageSize || projectTablePageSize.value;
			projectListState.metrics = res.data.metrics || null;
		} else {
			apiData.projects = [];
			projectListState.items = [];
			projectListState.total = 0;
			projectListState.metrics = null;
		}
	} catch (err) {
		handleApiError(err, '项目列表加载失败');
	} finally {
		apiDataLoaded.projects = true;
		apiDataLoading.projects = false;
	}
}

/**
 * 加载日报列表
 */
async function loadReports(params = {}) {
	apiDataLoading.reports = true;
	try {
		const query = {
			keyword: reportFilters.keyword || undefined,
			status: reportFilters.status || undefined,
			pageIndex: reportTablePage.value,
			pageSize: reportTablePageSize.value,
			...params,
		};
		const [startDate, endDate] = Array.isArray(reportFilters.dateRange) ? reportFilters.dateRange : [];
		if (startDate) query.startDate = startDate;
		if (endDate) query.endDate = endDate;
		if (currentRole.value === ROLE_ENUM.MANAGER) {
			const currentDepartmentId = currentUser.value.departmentId
				|| apiData.departments.find((item) => item.name === currentUser.value.department)?.id;
			query.DepartmentId = currentDepartmentId || query.departmentId;
		} else if (reportFilters.department) {
			const matchedDepartment = apiData.departments.find((item) => item.name === reportFilters.department);
			query.DepartmentId = matchedDepartment?.id || query.departmentId;
		}
		const res = await getReports(query);
		if (res && res.code === 0 && res.data) {
			const items = safeArray(res.data.items || res.data);
			apiData.reports = items.map(item => ({
				id: safeGet(item.id),
				title: safeGet(item.title),
				employeeId: safeGet(item.employeeId),
				employeeName: safeGet(item.employeeName),
				departmentId: safeGet(item.departmentId),
				department: safeGet(item.department),
				submitDate: normalizeApiDateLike(item.submitDate),
				submitTime: normalizeApiDateLike(item.submitTime, { withTime: true }),
				relatedProjectId: safeGet(item.relatedProjectId),
				relatedProjectIds: normalizeReportRelatedProjectIds(item),
				relatedProject: safeGet(item.relatedProject),
				content: safeGet(item.content),
				workContent: safeGet(item.workContent),
				tomorrowPlan: safeGet(item.tomorrowPlan),
				problems: safeGet(item.problems),
				status: safeGet(item.status, '已提交'),
				leaderComment: safeGet(item.leaderComment),
				commentAuthor: safeGet(item.commentAuthor),
				commentTime: normalizeApiDateLike(item.commentTime, { withTime: true }),
				score: safeGet(item.score),
				canViewDetail: Boolean(item.canViewDetail),
				canComment: Boolean(item.canComment),
				attachmentList: safeArray(item.attachments).map((attachment, index) => normalizeReportAttachment(attachment, `${safeGet(item.id)}-${index}`)),
			}));
			reportListState.items = apiData.reports;
			reportListState.total = Number(res.data.total) || items.length;
			reportListState.pageIndex = Number(res.data.pageIndex) || query.pageIndex || 1;
			reportListState.pageSize = Number(res.data.pageSize) || query.pageSize || reportTablePageSize.value;
			reportListState.totalPages = Number(res.data.totalPages) || 0;
			reportListState.metrics = res.data.metrics || null;
			reportListState.todayReport = res.data.todayReport
				? {
					id: safeGet(res.data.todayReport.id),
					title: safeGet(res.data.todayReport.title),
					employeeId: safeGet(res.data.todayReport.employeeId),
					employeeName: safeGet(res.data.todayReport.employeeName),
					departmentId: safeGet(res.data.todayReport.departmentId),
					department: safeGet(res.data.todayReport.department),
					submitDate: normalizeApiDateLike(res.data.todayReport.submitDate),
					submitTime: normalizeApiDateLike(res.data.todayReport.submitTime, { withTime: true }),
					relatedProjectId: safeGet(res.data.todayReport.relatedProjectId),
					relatedProjectIds: normalizeReportRelatedProjectIds(res.data.todayReport),
					relatedProject: safeGet(res.data.todayReport.relatedProject),
					content: safeGet(res.data.todayReport.content),
					workContent: safeGet(res.data.todayReport.workContent),
					tomorrowPlan: safeGet(res.data.todayReport.tomorrowPlan),
					problems: safeGet(res.data.todayReport.problems),
					status: safeGet(res.data.todayReport.status, '已提交'),
					leaderComment: safeGet(res.data.todayReport.leaderComment),
					commentAuthor: safeGet(res.data.todayReport.commentAuthor),
					commentTime: normalizeApiDateLike(res.data.todayReport.commentTime, { withTime: true }),
					score: safeGet(res.data.todayReport.score),
					canViewDetail: Boolean(res.data.todayReport.canViewDetail),
					canComment: Boolean(res.data.todayReport.canComment),
					attachmentList: safeArray(res.data.todayReport.attachments).map((attachment, index) => normalizeReportAttachment(attachment, `today-${index}`)),
				}
				: null;
			reportListState.canWriteToday = res.data.canWriteToday;
		} else {
			apiData.reports = [];
			reportListState.items = [];
			reportListState.total = 0;
			reportListState.totalPages = 0;
			reportListState.metrics = null;
			reportListState.todayReport = null;
			reportListState.canWriteToday = null;
		}
	} catch (err) {
		handleApiError(err, '日报列表加载失败');
	} finally {
		apiDataLoaded.reports = true;
		apiDataLoading.reports = false;
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

async function loadOverviewRealtimeStats() {
	try {
		await loadEmployees();
		const query = {
			startDate: REPORT_RUNTIME_TODAY,
			endDate: REPORT_RUNTIME_TODAY,
			pageIndex: 1,
			pageSize: 1,
		};
		if (currentRole.value === ROLE_ENUM.MANAGER) {
			const currentDepartmentId = currentUser.value.departmentId
				|| apiData.departments.find((item) => item.name === currentUser.value.department)?.id;
			query.DepartmentId = currentDepartmentId || query.departmentId;
		}
		const res = await getReports(query);
		if (res && res.code === 0 && res.data) {
			const total = Number(res.data.total);
			overviewRealtimeStats.todaySubmitted = Number.isFinite(total)
				? total
				: safeArray(res.data.items || res.data).length;
			overviewRealtimeStats.expectedCount = scopedEmployees.value.length;
			return;
		}
	} catch {
		// 静默失败
	}
	overviewRealtimeStats.todaySubmitted = null;
	overviewRealtimeStats.expectedCount = scopedEmployees.value.length || null;
}

/**
 * 加载项目详情
 */
async function loadProjectDetail(projectId) {
	try {
		const res = await getProject(projectId);
		if (res && res.code === 0 && res.data) {
			const item = res.data;
			const issuedAttachments = safeArray(item.attachments).map((attachment, index) => ({
				id: safeGet(attachment?.fileId || attachment?.id || attachment?.attachmentId),
				fileName: safeGet(attachment?.fileName || attachment?.name),
				url: resolveAttachmentUrl(
					safeGet(attachment?.url),
					safeGet(attachment?.fileId || attachment?.id || attachment?.attachmentId),
				),
				key: safeGet(attachment?.id || attachment?.fileId || attachment?.attachmentId, `${projectId}-issued-${index}`),
			})).filter((attachment) => Boolean(attachment.fileName));
			const timeline = safeArray(item.timeline).map((entry, index) => ({
				key: safeGet(entry.id, `${projectId}-timeline-${index}`),
				type: safeGet(entry.type, 'progress'),
				typeLabel: safeGet(entry.typeLabel || entry.title, '动态'),
				color: safeGet(entry.color, '#0ea5e9'),
				title: safeGet(entry.title, '项目动态'),
				date: withTimelineTime(safeGet(entry.time), '18:00'),
				content: safeGet(entry.content, ''),
				attachments: safeArray(entry.attachments).map((attachment, attachmentIndex) => ({
					id: safeGet(attachment?.fileId || attachment?.id || attachment?.attachmentId, `${projectId}-timeline-${index}-${attachmentIndex}`),
					fileName: safeGet(attachment?.fileName || attachment?.name),
					url: resolveAttachmentUrl(
						safeGet(attachment?.url),
						safeGet(attachment?.fileId || attachment?.id || attachment?.attachmentId),
					),
				})).filter((attachment) => Boolean(attachment.fileName)),
			}));
			const timelineAttachmentList = timeline
				.flatMap((entry) => safeArray(entry.attachments))
				.filter(Boolean);
			const detailAttachments = [...issuedAttachments, ...timelineAttachmentList].filter(Boolean);
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
				createdAt: normalizeApiDateLike(item.createdAt),
				deadline: normalizeApiDateLike(item.deadline),
				priority: safeGet(item.priority, '中'),
				progress: Number(item.progress) || 0,
				currentStageKey: safeGet(item.currentStageKey),
				currentStage: safeGet(item.currentStage),
				status: safeGet(item.status, '进行中'),
				projectDesc: safeGet(item.projectDesc),
				attachments: detailAttachments.length,
				timeline,
				reportHistory: safeArray(item.reportHistory).map(r => ({
					id: safeGet(r.id),
					title: safeGet(r.title),
					employeeName: safeGet(r.employeeName),
					submitDate: normalizeApiDateLike(r.submitDate),
					status: safeGet(r.status),
					content: safeGet(r.content),
				})),
				availableProgressStages: safeArray(item.availableProgressStages).map((stage) => normalizeProjectStage(stage)).filter(Boolean),
				canSubmitProgress: normalizeOptionalBoolean(item.canSubmitProgress),
				canAudit: Boolean(item.canAudit),
				attachmentList: detailAttachments,
				progressHistory: [],
				progressSubmissions: [],
				auditLogs: [],
			};
			return detail;
		}
	} catch {
		// 静默失败
	}
	return null;
}

async function refreshProjectDetail(projectId) {
	if (!projectId) return null;
	const detail = await loadProjectDetail(projectId);
	if (!detail) return null;
	const targetIndex = apiData.projects.findIndex((item) => item.id === detail.id);
	if (targetIndex >= 0) {
		apiData.projects[targetIndex] = {
			...apiData.projects[targetIndex],
			...detail,
		};
		return apiData.projects[targetIndex];
	}
	apiData.projects.unshift(detail);
	return detail;
}

async function ensureProjectLoadedById(projectId) {
	const normalizedId = String(projectId || '').trim();
	if (!normalizedId) return null;
	const existing = findProjectById(normalizedId);
	if (existing?.projectName && existing?.customerName) return existing;
	const detail = await loadProjectDetail(normalizedId);
	if (!detail) return existing;
	const targetIndex = apiData.projects.findIndex((item) => String(item.id) === String(detail.id));
	if (targetIndex >= 0) {
		apiData.projects[targetIndex] = {
			...apiData.projects[targetIndex],
			...detail,
		};
		return apiData.projects[targetIndex];
	}
	apiData.projects.unshift(detail);
	return detail;
}

async function preloadReportRelatedProjects(report) {
	const projectIds = normalizeReportRelatedProjectIds(report);
	if (!projectIds.length) return;
	await Promise.all(projectIds.map((projectId) => ensureProjectLoadedById(projectId)));
}

/**
 * 加载日报详情
 */
async function loadReportDetail(reportId) {
	try {
		const res = await getReport(reportId);
		if (res && res.code === 0 && res.data) {
			const item = res.data;
			const detail = {
				id: safeGet(item.id),
				title: safeGet(item.title),
				employeeId: safeGet(item.employeeId),
				employeeName: safeGet(item.employeeName),
				departmentId: safeGet(item.departmentId),
				department: safeGet(item.department),
				submitDate: normalizeApiDateLike(item.submitDate),
				submitTime: normalizeApiDateLike(item.submitTime, { withTime: true }),
				relatedProjectId: safeGet(item.relatedProjectId),
				relatedProjectIds: normalizeReportRelatedProjectIds(item),
				relatedProject: safeGet(item.relatedProject),
				workContent: safeGet(item.workContent),
				tomorrowPlan: safeGet(item.tomorrowPlan),
				problems: safeGet(item.problems),
				content: safeGet(item.content),
				status: safeGet(item.status, '已提交'),
				leaderComment: safeGet(item.leaderComment),
				commentAuthor: safeGet(item.commentAuthor),
				commentTime: normalizeApiDateLike(item.commentTime, { withTime: true }),
				score: safeGet(item.score),
				canComment: Boolean(item.canComment),
				attachmentList: safeArray(item.attachments).map((attachment, index) => normalizeReportAttachment(attachment, `${reportId}-${index}`)),
			};
			const targetIndex = apiData.reports.findIndex((report) => report.id === detail.id);
			if (targetIndex >= 0) {
				apiData.reports[targetIndex] = {
					...apiData.reports[targetIndex],
					...detail,
				};
				return apiData.reports[targetIndex];
			}
			apiData.reports.unshift(detail);
			return detail;
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
			const options = res.data.map(item => ({
				id: safeGet(item.id),
				projectName: safeGet(item.projectName),
				departmentId: safeGet(item.departmentId),
				department: safeGet(item.department),
				executorId: safeGet(item.executorId),
				executor: safeGet(item.executor),
				status: safeGet(item.status),
			}));
			apiData.projects = mergeReportProjectOptions(apiData.projects, options);
			return options;
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

function handleProjectExecutorChange(executorName) {
	if (!executorName) return;
	// 根据选择的执行人，自动设置对应的部门
	const executorEmployee = projectExecutorEmployees.value.find(e => e.name === executorName);
	if (executorEmployee && executorEmployee.department) {
		// 如果当前选择的部门与执行人部门不一致，更新部门选择
		if (projectForm.department !== executorEmployee.department) {
			projectForm.department = executorEmployee.department;
		}
	}
}

async function submitProjectForm() {
	// 获取子组件暴露的表单 ref
	const childFormRef = projectManagementRef.value?.projectFormRef;
	if (!childFormRef) return;
	await childFormRef.validate();

	// 获取部门ID
	let departmentId = '';
	if (currentRole.value === ROLE_ENUM.MANAGER) {
		const dept = apiData.departments.find(d => d.name === currentUser.value.department);
		departmentId = dept?.id || '';
	} else {
		const dept = apiData.departments.find(d => d.name === projectForm.department);
		departmentId = dept?.id || '';
	}

	// 获取执行人ID（使用完整列表，不受部门过滤影响）
	const executorId = projectExecutorEmployees.value.find(e => e.name === projectForm.executor)?.id || '';
	const attachmentFiles = extractUploadRawFiles(projectForm.attachmentFiles);
	let attachmentIds = [];
	const attachmentValidation = validateProjectAttachmentFiles(attachmentFiles);
	if (!attachmentValidation.valid) {
		ElMessage.warning(attachmentValidation.message);
		return;
	}

	try {
		if (attachmentFiles.length) {
			projectUploadProgressVisible.value = true;
			projectUploadProgress.value = 0;
			projectUploadProgressText.value = `正在上传附件（0/${attachmentFiles.length}）`;
			await nextTick();
			const formData = new FormData();
			formData.append('bizType', 'project');
			attachmentFiles.forEach((file) => {
				formData.append('files', file);
			});
			const uploadRes = await apiUploadFilesWithProgress(formData, (event) => {
				const total = Number(event?.total || 0);
				const loaded = Number(event?.loaded || 0);
				const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
				projectUploadProgress.value = percent;
				projectUploadProgressText.value = `正在上传附件（${percent}%）`;
			});
			attachmentIds = extractAttachmentIds(uploadRes);
			if (!attachmentIds.length) {
				throw new Error('项目附件上传失败，请重试');
			}
			projectUploadProgress.value = 100;
			projectUploadProgressText.value = '附件上传完成';
			await new Promise((resolve) => setTimeout(resolve, 500));
			projectUploadProgressVisible.value = false;
		} else {
			projectUploadProgressVisible.value = false;
			projectUploadProgress.value = 0;
			projectUploadProgressText.value = '准备上传附件...';
		}

		const payload = {
			departmentId,
			customerName: projectForm.customerName.trim(),
			customerContact: projectForm.customerContact.trim(),
			projectName: projectForm.projectName.trim(),
			projectDesc: projectForm.projectDesc.trim(),
			executorId,
			deadline: projectForm.deadline,
			priority: projectForm.priority,
			attachmentIds,
		};

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
				createdAt: normalizeApiDateLike(res.data.createdAt),
				progress: Number(res.data.progress) || 0,
				currentStageKey: safeGet(res.data.currentStageKey),
				currentStage: safeGet(res.data.currentStage),
				status: safeGet(res.data.status, '进行中'),
				deadline: normalizeApiDateLike(res.data.deadline),
				attachments: attachmentIds.length,
				priority: safeGet(res.data.priority, '中'),
				projectDesc: safeGet(res.data.projectDesc),
				attachmentList: extractUploadFileNames(projectForm.attachmentFiles),
				progressHistory: [],
				progressSubmissions: [],
			};
			// 添加到模拟数据以保持UI一致
			projects.unshift(newProject);
			// 同时更新API数据
			if (apiData.projects.length > 0) {
				apiData.projects.unshift(newProject);
			}
			projectUploadProgressVisible.value = false;
			projectUploadProgress.value = 0;
			projectUploadProgressText.value = '准备上传附件...';
			projectFormVisible.value = false;
			projectTablePage.value = 1;
			resetProjectForm();
			ElMessage.success('项目已下发');
		} else {
			ElMessage.error(res?.message || '项目下发失败');
			return;
		}
	} catch (err) {
		projectUploadProgressVisible.value = false;
		projectUploadProgress.value = 0;
		projectUploadProgressText.value = '准备上传附件...';
		handleApiError(err, '项目下发失败');
		return;
	}
}

async function submitProjectProgress() {
	// 获取子组件暴露的表单 ref
	const childFormRef = projectManagementRef.value?.projectProgressFormRef;
	if (!childFormRef) return;
	await childFormRef.validate();
	const target = progressTargetProject.value;
	if (!target || !canSubmitProjectProgress(target)) return;
	const stage = selectedProjectProgressStage.value;
	if (!stage) return;
	const nextProgress = Math.max(projectProgressBaseline.value, Number(projectProgressForm.progress || 0));
	const attachmentFiles = extractUploadRawFiles(projectProgressForm.attachmentFiles);
	let attachmentIds = [];
	const attachmentValidation = validateProjectAttachmentFiles(attachmentFiles);
	if (!attachmentValidation.valid) {
		ElMessage.warning(attachmentValidation.message);
		return;
	}

	try {
		if (attachmentFiles.length) {
			projectUploadProgressVisible.value = true;
			projectUploadProgress.value = 0;
			projectUploadProgressText.value = `正在上传进度附件（0/${attachmentFiles.length}）`;
			await nextTick();
			const formData = new FormData();
			formData.append('bizType', 'projectProgress');
			attachmentFiles.forEach((file) => {
				formData.append('files', file);
			});
			const uploadRes = await apiUploadFilesWithProgress(formData, (event) => {
				const total = Number(event?.total || 0);
				const loaded = Number(event?.loaded || 0);
				const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
				projectUploadProgress.value = percent;
				projectUploadProgressText.value = `正在上传进度附件（${percent}%）`;
			});
			attachmentIds = extractAttachmentIds(uploadRes);
			if (!attachmentIds.length) {
				throw new Error('进度附件上传失败，请重试');
			}
			projectUploadProgress.value = 100;
			projectUploadProgressText.value = '进度附件上传完成';
			await new Promise((resolve) => setTimeout(resolve, 500));
			projectUploadProgressVisible.value = false;
		} else {
			projectUploadProgressVisible.value = false;
			projectUploadProgress.value = 0;
			projectUploadProgressText.value = '准备上传附件...';
		}
	} catch (err) {
		projectUploadProgressVisible.value = false;
		projectUploadProgress.value = 0;
		projectUploadProgressText.value = '准备上传附件...';
		handleApiError(err, '进度附件上传失败');
		return;
	}

	const payload = {
		stageKey: stage.key,
		progress: nextProgress,
		content: projectProgressForm.content.trim(),
		attachmentIds,
	};

	try {
		const res = await apiSubmitProjectProgress(target.id, payload);
		if (res && res.code === 0 && res.data) {
			// 更新项目数据
			const updatedProject = res.data.project || res.data;
			target.progress = Number(updatedProject.progress) || nextProgress;
			target.currentStageKey = safeGet(updatedProject.currentStageKey);
			target.status = safeGet(updatedProject.status);
			target.canAudit = Boolean(updatedProject.canAudit);
			target.canSubmitProgress = normalizeOptionalBoolean(updatedProject.canSubmitProgress);
			await refreshProjectDetail(target.id);
			ElMessage.success(stage.key === 'payment_received' ? '已提交回款完成节点，等待管理员审核' : '项目进度已更新');
		} else {
			handleApiError({ message: res?.message || '项目进度提交失败', isBusinessError: res && res.code !== 0, code: res?.code }, '项目进度提交失败');
			return;
		}
	} catch (err) {
		projectUploadProgressVisible.value = false;
		projectUploadProgress.value = 0;
		projectUploadProgressText.value = '准备上传附件...';
		handleApiError(err, '项目进度提交失败');
		return;
	}

	projectUploadProgressVisible.value = false;
	projectUploadProgress.value = 0;
	projectUploadProgressText.value = '准备上传附件...';
	projectProgressVisible.value = false;
	resetProjectProgressForm();
}

async function approveProject(project) {
	if (!canAuditProject(project)) return;
	const target = apiData.projects.find((item) => item.id === project.id) || projects.find((item) => item.id === project.id);
	if (!target) return;

	try {
		const res = await apiApproveProject(target.id);
		if (res && res.code === 0 && res.data) {
			target.status = safeGet(res.data.status, '已完成');
			target.progress = Number(res.data.progress) || 100;
			target.currentStageKey = safeGet(res.data.currentStageKey, 'payment_received');
			target.canAudit = Boolean(res.data.canAudit);
			target.canSubmitProgress = normalizeOptionalBoolean(res.data.canSubmitProgress);
			await refreshProjectDetail(target.id);
			ElMessage.success('项目已审核通过');
		} else {
			handleApiError({ message: res?.message || '项目审核失败', isBusinessError: res && res.code !== 0, code: res?.code }, '项目审核失败');
		}
	} catch (err) {
		handleApiError(err, '项目审核失败');
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
		const target = apiData.projects.find((item) => item.id === project.id) || projects.find((item) => item.id === project.id);
		if (!target) return;
		const rollbackStage = getProjectRejectRollbackStage(target);

		try {
			const res = await apiRejectProject(target.id, { reason: String(value).trim() });
			if (res && res.code === 0 && res.data) {
				target.status = safeGet(res.data.status, '进行中');
				target.progress = Number(res.data.progress) || rollbackStage.fixedProgress;
				target.currentStageKey = safeGet(res.data.currentStageKey, rollbackStage.key);
				target.canAudit = Boolean(res.data.canAudit);
				target.canSubmitProgress = normalizeOptionalBoolean(res.data.canSubmitProgress);
				await refreshProjectDetail(target.id);
			} else {
				handleApiError({ message: res?.message || '项目驳回失败', isBusinessError: res && res.code !== 0, code: res?.code }, '项目驳回失败');
				return;
			}
		} catch (err) {
			handleApiError(err, '项目驳回失败');
			return;
		}
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
	const rollbackKey = hasPrepaymentBranch ? 'final_invoice_completed' : 'invoice_completed';
	return findProjectStageByKey(rollbackKey) || {
		key: rollbackKey,
		label: rollbackKey,
		min: Number(project?.progress || 0),
		max: Number(project?.progress || 0),
		fixedProgress: Number(project?.progress || 0),
		selectable: false,
	};
}

function canAuditProject(project) {
	if (!project || currentRole.value !== ROLE_ENUM.ADMIN) return false;
	return Boolean(project.canAudit) && scopedProjects.value.some((item) => item.id === project.id);
}

function canSubmitProjectProgress(project) {
	if (!project || ![ROLE_ENUM.MANAGER, ROLE_ENUM.EMPLOYEE].includes(currentRole.value)) return false;
	if (!scopedProjects.value.some((item) => item.id === project.id)) return false;
	if (Boolean(project.canSubmitProgress)) return true;
	if (!isProjectOwnedByCurrentUser(project)) return false;
	return safeGet(project.status) !== '已完成';
}

function canCommentReport(report) {
	if (!report || currentRole.value !== ROLE_ENUM.MANAGER) return false;
	return report.department === currentUser.value.department;
}

function isReportOwnedByCurrentUser(report) {
	if (!report) return false;
	const currentUserIds = [currentUser.value.id, currentUser.value.employeeId, currentUser.value.userId]
		.map((item) => String(item || '').trim())
		.filter(Boolean);
	const reportEmployeeId = String(report.employeeId || report.userId || '').trim();
	if (reportEmployeeId && currentUserIds.includes(reportEmployeeId)) return true;
	const currentName = String(currentUser.value.name || '').trim();
	return Boolean(currentName && String(report.employeeName || '').trim() === currentName);
}

function getReportSubmitDate(report) {
	return String(normalizeApiDateLike(report?.submitDate || '') || '').slice(0, 10);
}

function canDeleteReport(report) {
	if (!report?.id || !canWriteReport.value) return false;
	return isReportOwnedByCurrentUser(report) && getReportSubmitDate(report) === REPORT_RUNTIME_TODAY;
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
		projectManagementRef.value?.projectFormRef?.clearValidate();
	});
}

function resetProjectFormAndClose() {
	resetProjectForm();
	projectFormVisible.value = false;
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
		projectManagementRef.value?.projectProgressFormRef?.clearValidate();
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
		relatedProjectIds: normalizeReportRelatedProjectIds(report || draft),
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
	return safeGet(project?.currentStageKey);
}

function getAllowedNextProjectStageKeys(project) {
	const currentStageKey = getProjectCurrentStageKey(project);
	const progress = Number(project?.progress || 0);
	switch (currentStageKey) {
	case 'task_issued':
		return ['contract_signed'];
	case 'contract_signed':
		return ['task_execution'];
	case 'task_execution':
		return progress < 80 ? ['task_execution'] : ['prepayment_invoice', 'invoice_completed'];
	case 'prepayment_invoice':
		return ['prepayment_received'];
	case 'prepayment_received':
		return ['final_invoice_completed'];
	case 'final_invoice_completed':
	case 'invoice_completed':
		return ['payment_received'];
	case 'payment_received':
		return [];
	default:
		return [];
	}
}

function getAvailableProjectStageOptions(project) {
	const projectStages = safeArray(project?.availableProgressStages)
		.map((item) => normalizeProjectStage(item))
		.filter((item) => Boolean(item?.key) && item.selectable !== false);
	const stageCatalog = getProjectStageCatalog().filter((item) => Boolean(item?.key) && item.selectable !== false);
	const allowedKeys = getAllowedNextProjectStageKeys(project);
	if (allowedKeys.length) {
		return allowedKeys
			.map((key) => projectStages.find((item) => item.key === key) || stageCatalog.find((item) => item.key === key))
			.filter(Boolean);
	}
	if (projectStages.length) return projectStages;
	const currentStageKey = getProjectCurrentStageKey(project);
	if (!stageCatalog.length) return [];
	const currentStageIndex = stageCatalog.findIndex((item) => item.key === currentStageKey);
	if (currentStageIndex >= 0) {
		return stageCatalog.slice(currentStageIndex + 1);
	}
	return stageCatalog.filter((item) => Number(item.min) >= Number(project?.progress || 0));
}

function isProjectOwnedByCurrentUser(project) {
	if (!project || !currentUser.value?.id) return false;
	const executorId = String(safeGet(project.executorId, '')).trim();
	const leaderId = String(safeGet(project.leaderId, '')).trim();
	const userId = String(safeGet(currentUser.value.id, '')).trim();
	const executorName = String(safeGet(project.executor, '')).trim();
	const leaderName = String(safeGet(project.leader, '')).trim();
	const userName = String(safeGet(currentUser.value.name, '')).trim();
	const loginName = String(safeGet(currentUser.value.userName, '')).trim();
	return [executorId, leaderId, executorName, leaderName]
		.some((value) => Boolean(value) && [userId, userName, loginName].includes(value));
}

async function submitReportForm() {
	if (!reportFormRef.value || !canWriteReport.value) return;
	await reportFormRef.value.validate();
	const employeeId = currentUser.value.id;
	const existingSameDayReport = scopedReports.value.find((item) => item.employeeId === employeeId && item.submitDate === reportForm.date);
	if (existingSameDayReport) {
		ElMessage.warning('每位员工当天只能提交 1 篇日报，且提交后不能修改。');
		return;
	}
	const attachmentFiles = extractUploadRawFiles(reportForm.attachmentFiles);
	let attachmentIds = [];
	const attachmentList = extractUploadFileNames(reportForm.attachmentFiles);
	const attachmentValidation = validateReportAttachmentFiles(attachmentFiles);
	if (!attachmentValidation.valid) {
		ElMessage.warning(attachmentValidation.message);
		return;
	}
	const title = reportForm.title.trim() || buildReportDefaultTitle(reportForm.date);

	try {
		if (attachmentFiles.length) {
			projectUploadProgressVisible.value = true;
			projectUploadProgress.value = 0;
			projectUploadProgressText.value = `正在上传日报附件（0/${attachmentFiles.length}）`;
			await nextTick();
			const formData = new FormData();
			formData.append('bizType', 'report');
			attachmentFiles.forEach((file) => {
				formData.append('files', file);
			});
			const uploadRes = await apiUploadFilesWithProgress(formData, (event) => {
				const total = Number(event?.total || 0);
				const loaded = Number(event?.loaded || 0);
				const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
				projectUploadProgress.value = percent;
				projectUploadProgressText.value = `正在上传日报附件（${percent}%）`;
			});
			attachmentIds = extractAttachmentIds(uploadRes);
			if (!attachmentIds.length) {
				throw new Error('日报附件上传失败，请重试');
			}
			projectUploadProgress.value = 100;
			projectUploadProgressText.value = '日报附件上传完成';
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	} catch (err) {
		projectUploadProgressVisible.value = false;
		projectUploadProgress.value = 0;
		projectUploadProgressText.value = '准备上传附件...';
		handleApiError(err, '日报附件上传失败');
		return;
	}

	const payload = {
		date: reportForm.date,
		title,
		relatedProjectIds: reportForm.relatedProjectIds.length ? reportForm.relatedProjectIds : undefined,
		relatedProjectId: reportForm.relatedProjectIds.length ? reportForm.relatedProjectIds.join(',') : undefined,
		workContent: reportForm.workContent.trim(),
		tomorrowPlan: reportForm.tomorrowPlan.trim(),
		problems: reportForm.problems.trim(),
		attachmentIds,
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
				relatedProjectId: safeGet(res.data.relatedProjectId, payload.relatedProjectId),
				relatedProjectIds: normalizeReportRelatedProjectIds(res.data, reportForm.relatedProjectIds),
				relatedProject: safeGet(res.data.relatedProject, getProjectNamesByIds(reportForm.relatedProjectIds)),
				workContent: safeGet(res.data.workContent, reportForm.workContent.trim()),
				tomorrowPlan: safeGet(res.data.tomorrowPlan, reportForm.tomorrowPlan.trim()),
				problems: safeGet(res.data.problems, reportForm.problems.trim()),
				content: safeGet(res.data.content, buildReportSummary(reportForm.workContent)),
				attachmentList: safeArray(res.data.attachments).length
					? safeArray(res.data.attachments).map((attachment, index) => normalizeReportAttachment(attachment, `created-${index}`))
					: attachmentList.map((name, index) => normalizeReportAttachment({ fileName: name }, `created-local-${index}`)),
				status: safeGet(res.data.status, '已提交'),
				leaderComment: safeGet(res.data.leaderComment),
				commentAuthor: safeGet(res.data.commentAuthor),
				commentTime: normalizeApiDateLike(res.data.commentTime, { withTime: true }),
				score: safeGet(res.data.score),
				canViewDetail: Boolean(res.data.canViewDetail ?? true),
				canComment: Boolean(res.data.canComment),
			};
			apiData.reports.unshift(newReport);
			reportListState.todayReport = newReport;
			reportListState.canWriteToday = false;
			await loadReports({ pageIndex: 1 });
			ElMessage.success('日报已提交');
		} else {
			handleApiError({ message: res?.message || '日报提交失败', isBusinessError: res && res.code !== 0, code: res?.code }, '日报提交失败');
			return;
		}
	} catch (err) {
		handleApiError(err, '日报提交失败');
		return;
	}

	projectUploadProgressVisible.value = false;
	projectUploadProgress.value = 0;
	projectUploadProgressText.value = '准备上传附件...';
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
			reportListState.metrics = reportListState.metrics
				? {
					...reportListState.metrics,
					pendingCommentCount: Math.max(0, Number(reportListState.metrics.pendingCommentCount || 0) - 1),
					commentedCount: Number(reportListState.metrics.commentedCount || 0) + 1,
				}
				: reportListState.metrics;
		} else {
			Object.assign(target, {
				status: '已批注',
				leaderComment: reportCommentForm.leaderComment.trim(),
				score: reportCommentForm.score,
				commentAuthor: currentUser.value.name,
				commentTime: formatDateTime(new Date()),
			});
		}
	} catch (err) {
		handleApiError(err, '批注保存失败');
		return;
	}
	reportCommentVisible.value = false;
	resetReportCommentForm();
	ElMessage.success('批注已保存');
}

function getProjectStageDefinitionsByKeys(keys) {
	return keys
		.map((key) => findProjectStageByKey(key))
		.filter(Boolean);
}

function getProjectStageLabel(stageKey) {
	return findProjectStageByKey(stageKey)?.label || '';
}

function normalizeProjectStage(stage) {
	if (!stage) return null;
	const key = safeGet(stage.key || stage.stageKey);
	if (!key) return null;
	const fixedProgress = stage.fixedProgress;
	return {
		key,
		label: safeGet(stage.label),
		min: Number(stage.min) || 0,
		max: Number(stage.max) || 0,
		fixedProgress: fixedProgress === null || fixedProgress === undefined ? undefined : Number(fixedProgress),
		selectable: stage.selectable !== false,
	};
}

function getProjectStageCatalog() {
	return safeArray(apiData.options?.projectStages)
		.map((item) => normalizeProjectStage(item))
		.filter(Boolean);
}

function findProjectStageByKey(stageKey) {
	if (!stageKey) return null;
	const detailStage = safeArray(currentProjectDetail.value?.availableProgressStages)
		.map((item) => normalizeProjectStage(item))
		.find((item) => item?.key === stageKey);
	if (detailStage) return detailStage;
	const progressStage = safeArray(progressTargetProject.value?.availableProgressStages)
		.map((item) => normalizeProjectStage(item))
		.find((item) => item?.key === stageKey);
	if (progressStage) return progressStage;
	return getProjectStageCatalog().find((item) => item.key === stageKey) || null;
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

function splitRelatedProjectNames(value) {
	return String(value || '')
		.split(/[,，、]/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function splitRelatedProjectIds(value) {
	return String(value || '')
		.split(/[,，、]/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function findProjectById(projectId) {
	if (!projectId) return null;
	const normalizedId = String(projectId).trim();
	return apiData.projects.find((item) => String(item.id) === normalizedId)
		|| projectListState.items.find((item) => String(item.id) === normalizedId)
		|| projects.find((item) => String(item.id) === normalizedId)
		|| null;
}

function getProjectNameById(projectId) {
	if (!projectId) return '';
	return findProjectById(projectId)?.projectName || '';
}

function getProjectNamesByIds(projectIds) {
	return safeArray(projectIds)
		.map((projectId) => getProjectNameById(projectId))
		.filter(Boolean)
		.join('、');
}

function normalizeReportRelatedProjectIds(source, fallbackIds = []) {
	const explicitIdSource = Array.isArray(source?.relatedProjectIds)
		? source.relatedProjectIds
		: [source?.relatedProjectIds];
	const explicitIds = explicitIdSource
		.flatMap((item) => splitRelatedProjectIds(item))
		.filter(Boolean);
	if (explicitIds.length) return explicitIds;
	const relatedProjectIds = splitRelatedProjectIds(safeGet(source?.relatedProjectId, ''));
	if (relatedProjectIds.length) return relatedProjectIds;
	const fallbackIdSource = Array.isArray(fallbackIds) ? fallbackIds : [fallbackIds];
	return fallbackIdSource
		.flatMap((item) => splitRelatedProjectIds(item))
		.filter(Boolean);
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
		date: `${REPORT_RUNTIME_TODAY} 19:00`,
		operator: currentUser.value.name,
		comment,
	});
}

function getProjectAttachmentList(project) {
	const directAttachments = Array.isArray(project?.attachmentList) ? project.attachmentList : [];
	const timelineAttachments = Array.isArray(project?.timeline)
		? project.timeline.flatMap((entry) => safeArray(entry?.attachments)).filter(Boolean)
		: [];
	const normalizedAttachments = [...directAttachments, ...timelineAttachments]
		.map((attachment, index) => {
			if (!attachment) return null;
			if (typeof attachment === 'string') {
				return {
					id: '',
					fileName: attachment,
					url: '',
					key: `project-attachment-${index}-${attachment}`,
				};
			}
			return {
				id: safeGet(attachment.fileId || attachment.id || attachment.attachmentId),
				fileName: safeGet(attachment.fileName || attachment.name),
				url: safeGet(attachment.url),
				key: safeGet(attachment.key || attachment.id || attachment.fileId || attachment.attachmentId, `project-attachment-${index}`),
			};
		})
		.filter((attachment) => Boolean(attachment?.fileName));
	const dedupedAttachments = [];
	const seenAttachmentKeys = new Set();
	normalizedAttachments.forEach((attachment) => {
		const dedupeKey = String(attachment.id || attachment.url || attachment.fileName).trim();
		if (!dedupeKey || seenAttachmentKeys.has(dedupeKey)) return;
		seenAttachmentKeys.add(dedupeKey);
		dedupedAttachments.push(attachment);
	});
	if (dedupedAttachments.length) {
		return dedupedAttachments;
	}
	const count = Number(project?.attachments || 0);
	return count > 0
		? Array.from({ length: count }, (_, index) => ({
			id: '',
			fileName: `项目附件 ${index + 1}`,
			url: '',
			key: `project-attachment-fallback-${index + 1}`,
		}))
		: [];
}

function getProjectAttachmentCount(project) {
	return getProjectAttachmentList(project).length;
}

function getReportAttachmentList(report) {
	return safeArray(report?.attachmentList)
		.map((attachment, index) => normalizeReportAttachment(attachment, `${safeGet(report?.id, 'report')}-${index}`))
		.filter((attachment) => Boolean(attachment?.fileName));
}

function toUploadFileList(attachments) {
	return Array.isArray(attachments)
		? attachments.map((attachment, index) => {
			const normalized = typeof attachment === 'string'
				? normalizeReportAttachment({ fileName: attachment }, `upload-${index}`)
				: normalizeReportAttachment(attachment, `upload-${index}`);
			return {
				name: normalized.fileName,
				uid: String(normalized.uid || normalized.id || normalized.key || `upload-${index}`),
				url: normalized.url,
			status: 'success',
			};
		})
		: [];
}

function normalizeReportAttachment(attachment, fallbackKey = '') {
	if (!attachment) return null;
	if (typeof attachment === 'string') {
		const fileName = String(attachment).trim();
		if (!fileName) return null;
		return {
			id: '',
			fileId: '',
			fileName,
			fileExt: getFileExtension(fileName),
			url: '',
			key: fallbackKey || fileName,
			uid: fallbackKey || fileName,
		};
	}
	const fileId = String(safeGet(attachment.fileId || attachment.id || attachment.attachmentId, '')).trim();
	const fileName = String(safeGet(attachment.fileName || attachment.name, '')).trim();
	if (!fileName && !fileId) return null;
	return {
		id: String(safeGet(attachment.id, fileId)).trim(),
		fileId,
		fileName: fileName || `附件${fileId ? `-${fileId}` : ''}`,
		fileExt: safeGet(attachment.fileExt, getFileExtension(fileName)),
		url: resolveAttachmentUrl(
			safeGet(attachment.url),
			fileId,
		),
		key: String(safeGet(attachment.key, fileId || fileName || fallbackKey)).trim() || fallbackKey,
		uid: String(safeGet(attachment.uid, fileId || fileName || fallbackKey)).trim() || fallbackKey,
	};
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

function extractUploadRawFiles(fileList) {
	return Array.isArray(fileList)
		? fileList
			.map((item) => item?.raw || item)
			.filter((file) => file instanceof File)
		: [];
}

function getFileExtension(fileName) {
	const normalized = String(fileName || '').trim().toLowerCase();
	const lastDotIndex = normalized.lastIndexOf('.');
	return lastDotIndex >= 0 ? normalized.slice(lastDotIndex) : '';
}

function getExtensionFromMimeType(contentType) {
	switch (String(contentType || '').toLowerCase()) {
	case 'image/jpeg':
		return '.jpg';
	case 'image/png':
		return '.png';
	case 'image/gif':
		return '.gif';
	case 'image/webp':
		return '.webp';
	case 'application/pdf':
		return '.pdf';
	case 'application/zip':
	case 'application/x-zip-compressed':
		return '.zip';
	default:
		return '';
	}
}

function resolveDownloadFileName(preferredName, responseFileName, blob) {
	const normalizedPreferred = ensureDownloadFileName(preferredName || '');
	const normalizedResponse = ensureDownloadFileName(responseFileName || '');
	const preferredExtension = getFileExtension(normalizedPreferred);
	const responseExtension = getFileExtension(normalizedResponse);
	const mimeExtension = getExtensionFromMimeType(blob?.type);

	if (preferredExtension) {
		if (responseExtension === '.txt' && mimeExtension && mimeExtension !== '.txt') {
			return normalizedPreferred;
		}
		return normalizedPreferred;
	}

	if (normalizedResponse) {
		if (responseExtension === '.txt' && mimeExtension && mimeExtension !== '.txt') {
			return ensureDownloadFileName(`${normalizedResponse.slice(0, -4)}${mimeExtension}`);
		}
		return normalizedResponse;
	}

	return ensureDownloadFileName(`download${mimeExtension || ''}`);
}

function validateProjectAttachmentFiles(files) {
	if (!Array.isArray(files)) return { valid: true, message: '' };
	if (files.length > PROJECT_ATTACHMENT_MAX_COUNT) {
		return { valid: false, message: `最多只能上传 ${PROJECT_ATTACHMENT_MAX_COUNT} 个附件` };
	}
	const totalSize = files.reduce((sum, file) => sum + Number(file?.size || 0), 0);
	if (totalSize > PROJECT_ATTACHMENT_MAX_TOTAL_SIZE) {
		return { valid: false, message: '附件总大小不能超过 200MB' };
	}
	for (const file of files) {
		const extension = getFileExtension(file?.name);
		if (!PROJECT_ATTACHMENT_ACCEPTED_EXTENSIONS.includes(extension)) {
			return { valid: false, message: `仅支持上传 ${PROJECT_ATTACHMENT_ACCEPTED_EXTENSIONS.join('、')} 格式的文件` };
		}
		if (Number(file?.size || 0) > PROJECT_ATTACHMENT_MAX_SIZE) {
			return { valid: false, message: '单个附件不能超过 50MB' };
		}
	}
	return { valid: true, message: '' };
}

function validateReportAttachmentFiles(files) {
	if (!Array.isArray(files)) return { valid: true, message: '' };
	const maxCount = 10;
	const maxSize = 10 * 1024 * 1024;
	const acceptedExtensions = ['.jpg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
	if (files.length > maxCount) {
		return { valid: false, message: `最多只能上传 ${maxCount} 个日报附件` };
	}
	for (const file of files) {
		const extension = getFileExtension(file?.name);
		if (!acceptedExtensions.includes(extension)) {
			return { valid: false, message: `日报附件仅支持 ${acceptedExtensions.join('、')} 格式` };
		}
		if (Number(file?.size || 0) > maxSize) {
			return { valid: false, message: '单个日报附件不能超过 10MB' };
		}
	}
	return { valid: true, message: '' };
}

function extractAttachmentIds(uploadRes) {
	const candidates = [
		...safeArray(uploadRes?.data?.files),
		...safeArray(uploadRes?.files),
		...safeArray(uploadRes?.data),
		...safeArray(uploadRes?.result?.files),
	];
	const fileIds = candidates
		.map((item) => String(item?.id || item?.fileId || item?.attachmentId || '').trim())
		.filter(Boolean);
	if (fileIds.length) return [...new Set(fileIds)];
	const singleFileId = String(uploadRes?.data?.id || uploadRes?.data?.fileId || uploadRes?.id || uploadRes?.fileId || '').trim();
	return singleFileId ? [singleFileId] : [];
}

async function downloadProjectAttachment(project, attachment, sourceLabel = '项目附件') {
	if (!project || !attachment || typeof window === 'undefined') return;
	const attachmentObject = typeof attachment === 'string'
		? getProjectAttachmentList(project).find((item) => item?.fileName === attachment) || null
		: attachment;
	const fileId = String(attachmentObject?.fileId || attachmentObject?.id || '').trim();
	const fileName = ensureDownloadFileName(safeGet(attachmentObject?.fileName || attachment, '项目附件'));
	if (!fileId) {
		ElMessage.warning(`${sourceLabel}缺少附件标识，暂时无法下载`);
		return;
	}
	try {
		const { blob, fileName: responseFileName } = await apiDownloadFile(fileId);
		const objectUrl = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = objectUrl;
		link.download = resolveDownloadFileName(fileName, responseFileName, blob);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(objectUrl);
		ElMessage.success(`已开始下载：${fileName}`);
	} catch (err) {
		handleApiError(err, '附件下载失败');
	}
}

async function downloadAllProjectAttachments(project) {
	if (!project || typeof window === 'undefined') return;
	const attachments = getProjectAttachmentList(project);
	if (!attachments.length) return;
	try {
		const { blob, fileName } = await apiDownloadProjectAttachments(project.id);
		const objectUrl = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = objectUrl;
		link.download = ensureDownloadFileName(fileName || `${project.projectName || '项目附件'}-全部附件.zip`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(objectUrl);
		ElMessage.success(`已开始下载全部附件，共 ${attachments.length} 项`);
	} catch (err) {
		handleApiError(err, '全部附件下载失败');
	}
}

async function downloadReportAttachment(report, attachment) {
	if (!report || !attachment || typeof window === 'undefined') return;
	const attachmentObject = typeof attachment === 'string'
		? normalizeReportAttachment({ fileName: attachment }, `report-${safeGet(report.id)}`)
		: normalizeReportAttachment(attachment, `report-${safeGet(report.id)}`);
	const fileId = String(safeGet(attachmentObject?.fileId || attachmentObject?.id, '')).trim();
	const fileName = ensureDownloadFileName(safeGet(attachmentObject?.fileName, '日报附件'));
	if (!fileId) {
		ElMessage.warning('当前附件缺少附件标识，暂时无法下载');
		return;
	}
	try {
		const { blob, fileName: responseFileName } = await apiDownloadFile(fileId);
		const objectUrl = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = objectUrl;
		link.download = resolveDownloadFileName(fileName, responseFileName, blob);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(objectUrl);
		ElMessage.success(`已开始下载：${fileName}`);
	} catch (err) {
		handleApiError(err, '日报附件下载失败');
	}
}

async function downloadAllReportAttachments(report) {
	if (!report || typeof window === 'undefined') return;
	const attachments = getReportAttachmentList(report);
	if (!attachments.length) return;
	try {
		const { blob, fileName } = await apiDownloadReportAttachments(report.id);
		const objectUrl = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = objectUrl;
		link.download = ensureDownloadFileName(fileName || `${report.title || '日报附件'}-全部附件.zip`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(objectUrl);
		ElMessage.success(`已开始下载全部附件，共 ${attachments.length} 项`);
	} catch (err) {
		handleApiError(err, '日报全部附件下载失败');
	}
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
	if (Array.isArray(project?.timeline) && project.timeline.length) {
		return [...project.timeline]
			.sort((a, b) => normalizeTimelineDate(b.date) - normalizeTimelineDate(a.date));
	}
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
	if (!dateString) return `${REPORT_RUNTIME_TODAY} ${fallbackTime}`;
	const normalized = normalizeApiDateLike(dateString, { withTime: true });
	return String(normalized).includes(' ') ? String(normalized) : `${normalized} ${fallbackTime}`;
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
		relatedProjectIds: safeArray(reportForm.relatedProjectIds),
		workContent: reportForm.workContent || '',
		tomorrowPlan: reportForm.tomorrowPlan || '',
		problems: reportForm.problems || '',
		attachmentNames: extractUploadFileNames(reportForm.attachmentFiles),
	};
}

function mergeReportProjectOptions(currentProjects, reportProjects) {
	const currentList = safeArray(currentProjects);
	const optionList = safeArray(reportProjects);
	if (!optionList.length) return currentList;
	const merged = [...currentList];
	const existingIds = new Set(currentList.map((item) => String(safeGet(item?.id, '')).trim()).filter(Boolean));
	optionList.forEach((item) => {
		const id = String(safeGet(item?.id, '')).trim();
		if (!id || existingIds.has(id)) return;
		existingIds.add(id);
		merged.push({
			id,
			projectName: safeGet(item.projectName),
			departmentId: safeGet(item.departmentId),
			department: safeGet(item.department),
			executorId: safeGet(item.executorId),
			executor: safeGet(item.executor),
			status: safeGet(item.status),
			deadline: '',
			leader: '',
			priority: '中',
			progress: 0,
		});
	});
	return merged;
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

function parseMetricNumber(value) {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	const normalized = String(value).replace(/,/g, '').trim();
	const matched = normalized.match(/-?\d+(?:\.\d+)?/);
	if (!matched) return null;
	const parsed = Number(matched[0]);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizePercentValue(value) {
	const parsed = parseMetricNumber(value);
	if (parsed === null) return null;
	const percent = parsed > 0 && parsed <= 1 ? parsed * 100 : parsed;
	return Math.round(percent);
}

function parseMetricFraction(value) {
	const normalized = String(value || '').replace(/,/g, '');
	const matched = normalized.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
	if (!matched) return { current: null, total: null };
	return {
		current: Number(matched[1]),
		total: Number(matched[2]),
	};
}

function findOverviewSummaryCard(keys = []) {
	const keySet = new Set(keys.map((key) => String(key)));
	return safeArray(apiData.overview?.summaryCards).find((item) => keySet.has(String(item?.key || ''))) || null;
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
	const normalized = normalizeApiDateLike(dateString);
	return new Date(`${normalized}T00:00:00`);
}

function isWithinDays(dateString, days) {
	const diff = Math.round((normalizeDate(REPORT_RUNTIME_TODAY).getTime() - normalizeDate(dateString).getTime()) / DAY_MS);
	return diff >= 0 && diff <= Math.max(days - 1, 0);
}

function getDaysDiff(dateString) {
	return Math.round((normalizeDate(dateString).getTime() - normalizeDate(REPORT_RUNTIME_TODAY).getTime()) / DAY_MS);
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
					text: String(overviewProjectTotal.value),
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
		const submitted = overviewTodaySubmittedReportsCount.value;
		const pending = overviewPendingReportsCount.value;
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
		const targetDate = new Date(normalizeDate(REPORT_RUNTIME_TODAY).getTime() - (days - 1 - index) * DAY_MS);
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

.message-reminder-tag {
	cursor: pointer;
	user-select: none;
}

.message-reminder-tag:hover {
	filter: brightness(0.98);
}

.message-drawer :deep(.el-drawer__body) {
	display: flex;
	flex-direction: column;
	min-height: 0;
	padding: 0 20px 20px;
}

.message-drawer__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	gap: 16px;
	font-weight: 700;
	color: #0f172a;
}

.message-drawer__scroll {
	flex: 1;
	min-height: 0;
}

.message-list {
	display: grid;
	gap: 12px;
}

.message-list__item {
	position: relative;
	padding: 14px 16px 14px 14px;
	border-radius: 12px;
	border: 1px solid #e5edf4;
	background: #ffffff;
}

.message-list__delete {
	position: absolute;
	top: 6px;
	left: 6px;
	z-index: 1;
	opacity: 0;
	transform: scale(0.92);
	transition: opacity 0.16s ease, transform 0.16s ease;
	color: #ef4444;
	background: #ffffff;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
}

.message-list__item:hover .message-list__delete,
.message-list__delete:focus-visible {
	opacity: 1;
	transform: scale(1);
}

.message-list__row {
	display: flex;
	align-items: flex-start;
	gap: 12px;
}

.message-list__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: none;
	width: 36px;
	height: 36px;
	border-radius: 10px;
	font-size: 18px;
	background: #eff6ff;
	color: #2563eb;
}

.message-list__icon--project {
	background: #ecfeff;
	color: #0891b2;
}

.message-list__icon--report {
	background: #f0fdf4;
	color: #16a34a;
}

.message-list__icon--employee {
	background: #fff7ed;
	color: #ea580c;
}

.message-list__icon--system {
	background: #f8fafc;
	color: #64748b;
}

.message-list__body {
	min-width: 0;
	flex: 1;
}

.message-list__item-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.message-list__title {
	display: inline-flex;
	align-items: center;
	min-width: 0;
	gap: 8px;
	font-size: 14px;
	font-weight: 700;
	color: #0f172a;
}

.message-list__time {
	flex: none;
	font-size: 12px;
	color: #64748b;
}

.message-list__content {
	margin-top: 10px;
	font-size: 14px;
	line-height: 1.7;
	color: #334155;
	word-break: break-word;
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

.report-page {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: 14px;
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

.report-filter-card :deep(.el-card__body) {
	padding-top: 18px;
}

.report-filter-card,
.report-table-card {
	min-height: auto;
}

.report-table-card {
	flex: 1;
	min-height: 460px;
}

.report-table-card :deep(.el-card__body) {
	min-height: 0;
	gap: 14px;
}

.report-filter-actions {
	display: inline-flex;
	gap: 10px;
	flex-wrap: wrap;
}

.report-filter-grid {
	display: grid;
	grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(160px, 1fr));
	gap: 12px;
	align-items: center;
}

.report-filter-grid :deep(.el-input),
.report-filter-grid :deep(.el-select),
.report-filter-grid :deep(.el-date-editor) {
	width: 100%;
}

.report-table-shell {
	flex: 1;
	min-height: 360px;
	overflow: hidden;
	border-radius: 16px;
	border: 1px solid #dbe7f2;
	background: #ffffff;
}

.report-table {
	width: 100%;
	height: 100%;
}

.report-table :deep(.el-table__inner-wrapper::before) {
	display: none;
}

.report-table :deep(.el-table__header th.el-table__cell) {
	background: #f6f9fc;
	color: #334155;
	font-weight: 700;
}

.report-table :deep(.el-table__cell) {
	padding: 12px 0;
}

.report-row-actions {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	flex-wrap: wrap;
}

.report-detail-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 18px;
}

.report-detail-panel {
	padding: 16px 18px;
	border-radius: 18px;
	background: #f8fafc;
	border: 1px solid #e5edf4;
}

.report-detail-panel__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
}

.report-detail-panel__title {
	font-size: 16px;
	font-weight: 700;
	color: #0f172a;
}

.report-detail-panel__meta {
	margin-top: 6px;
	font-size: 12px;
	line-height: 1.7;
	color: #64748b;
}

.report-detail-section {
	padding: 16px 18px;
	border-radius: 18px;
	background: #f8fafc;
	border: 1px solid #e5edf4;
}

.report-detail-section__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 12px;
}

.report-detail-section__title {
	font-size: 16px;
	font-weight: 700;
	color: #0f172a;
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

.report-detail-grid .report-detail-section :deep(.el-empty) {
	padding: 0;
	max-height: 100px;
	min-height: 100px;
	overflow: hidden;
}

.report-detail-grid .report-detail-section :deep(.el-empty__image) {
	max-width: 72px;
	max-height: 52px;
	margin-bottom: 6px;
}

.report-detail-grid .report-detail-section :deep(.el-empty__description) {
	margin-top: 0;
}

.report-detail-grid .report-detail-section :deep(.el-empty__description p) {
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

.report-project-links {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.report-project-link {
	display: inline-flex;
	align-items: center;
	max-width: 100%;
	padding: 5px 10px;
	border: 1px solid #bfdbfe;
	border-radius: 999px;
	background: #eff6ff;
	color: #0369a1;
	font: inherit;
	font-size: 13px;
	font-weight: 700;
	line-height: 1.5;
	cursor: pointer;
	transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.report-project-link:hover {
	border-color: #38bdf8;
	background: #e0f2fe;
	color: #075985;
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

.report-attachment-item {
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	min-width: 0;
	padding: 12px 14px;
	border: 1px solid #dbe7f2;
	border-radius: 14px;
	background: #ffffff;
	color: #334155;
	text-align: left;
	cursor: pointer;
	transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.report-attachment-item:hover {
	transform: translateY(-1px);
	border-color: #93c5fd;
	box-shadow: 0 12px 24px rgba(14, 165, 233, 0.1);
}

.report-attachment-item span {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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

.report-form-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 6px 16px;
}

.report-form-grid__full {
	grid-column: 1 / -1;
}

.report-form-grid :deep(.el-date-editor),
.report-form-grid :deep(.el-select),
.report-form-grid :deep(.el-input),
.report-form-grid :deep(.el-textarea),
.report-form-grid :deep(.el-upload),
.report-form-grid :deep(.el-upload-dragger) {
	width: 100%;
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
.employee-pagination {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-top: 16px;
	flex-wrap: wrap;
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
	.report-form-grid,
	.settings-form-grid {
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

	.report-detail-panel__header,
	.project-timeline__head {
		flex-direction: column;
	}
}
</style>
