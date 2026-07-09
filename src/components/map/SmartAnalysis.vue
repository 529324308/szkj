<template>
	<div v-if="active" class="toolbar">
		<button
			:class="['tool-btn', { active: activeTool === 'ai' || aiChatVisible }]"
			@click="$emit('start-tool', 'ai')"
		>
			<img class="tool-icon" :src="icons.ai" alt="AI对话" />
			<span>AI对话</span>
		</button>
		<button
			:class="['tool-btn', { active: activeTool === 'drawPolygon' }]"
			@click="$emit('start-tool', 'drawPolygon')"
		>
			<img class="tool-icon" :src="icons.drawPolygon" alt="分析报告" />
			<span>分析报告</span>
		</button>
	</div>

	<div
		v-if="aiChatVisible"
		ref="aiChatPanelRef"
		class="ai-chat-panel"
		:class="{
			maximized: aiChatMaximized,
			minimized: !aiChatMaximized,
			dragging: aiChatDragging && !aiChatMaximized,
			'sidebar-open': historyVisible && aiChatMaximized && !isMobileView
		}"
		:style="panelInlineStyle"
		@click.stop
	>
		<!-- 历史对话列表侧边栏 -->
		<aside v-if="false" ref="chatHistorySidebarRef" class="chat-history-sidebar" :class="{ 'is-open': historyVisible, 'is-mobile': isMobileView }">
			<div class="sidebar-header">
				<span class="sidebar-title">历史对话</span>
				<button class="sidebar-close-btn" @click="toggleHistory" title="关闭">
					<img :src="icons.close" alt="关闭" />
				</button>
			</div>
			<div class="sidebar-actions">
				<button class="new-chat-btn" @click="createNewChat">
					<img :src="icons.add" alt="新建" />
					<span>新建对话</span>
				</button>
			</div>
			<div class="history-list">
				<div
					v-for="chat in chatHistoryList"
					:key="chat.id"
					:class="['history-item', { active: chat.id === currentChatId }]"
					@click="switchToChat(chat.id)"
				>
					<div class="history-item-icon">
						<img :src="icons.chat" alt="对话" />
					</div>
					<div class="history-item-content">
						<div class="history-item-title">{{ chat.title || '未命名对话' }}</div>
						<div class="history-item-time">{{ formatTime(chat.updatedAt) }}</div>
					</div>
					<button
						class="history-item-delete"
						@click.stop="deleteChat(chat.id)"
						title="删除"
					>
						<img :src="icons.delete" alt="删除" />
					</button>
				</div>
				<div v-if="chatHistoryList.length === 0" class="history-empty">
					暂无历史对话
				</div>
			</div>
		</aside>

		<div ref="aiChatMainRef" class="ai-chat-main">
			<div
				ref="aiChatHeaderRef"
				class="ai-chat-header"
				@mousedown="$emit('drag-start', $event)"
				@touchstart.prevent="$emit('drag-start', $event)"
			>
				<div class="header-left">
					<!-- 展开历史列表按钮 -->
					<button
						v-if="false"
						class="header-btn history-toggle-btn"
						title="显示历史对话"
						@mousedown.stop
						@touchstart.stop
						@click="toggleHistory"
					>
						<img :src="icons.menu" alt="历史" class="action-icon" />
					</button>

					<div class="ai-title">
						<img :src="icons.ai" alt="AI" class="ai-avatar" />
						<div class="ai-title-copy" v-if="false">
							<div class="ai-title-main">智能 AI 对话</div>
							<div class="ai-title-sub">{{ currentModelLabel }}</div>
						</div>
						<button
							v-if="aiChatMaximized"
							class="ai-title-toggle"
							:title="historyVisible ? '关闭历史对话' : '显示历史对话'"
							@mousedown.stop
							@touchstart.stop
							@click.stop="toggleHistory"
						>
							<img
								:src="historyVisible ? icons.sidebarClose : icons.sidebarOpen"
								:alt="historyVisible ? '关闭边栏' : '打开边栏'"
								class="action-icon"
							/>
						</button>
					</div>
				</div>

				<div class="ai-actions">
					<button
						class="header-btn"
						title="切换大小"
						@mousedown.stop
						@touchstart.stop
						@click="$emit('toggle-size')"
					>
						<img :src="aiChatMaximized ? icons.minimize : icons.maximize" alt="切换大小" class="action-icon" />
					</button>
					<button
						class="header-btn"
						title="关闭"
						@mousedown.stop
						@touchstart.stop
						@click="$emit('close-chat')"
					>
						<img :src="icons.close" alt="关闭" class="action-icon" />
					</button>
				</div>
			</div>

			<div class="ai-chat-body">
				<div v-if="noticeText" class="chat-notice" :class="noticeTone">
					{{ noticeText }}
				</div>

				<div v-if="visibleMessages.length === 0" class="chat-empty">
					<img :src="icons.ai" alt="AI" class="empty-avatar" />
					<h3>开始一段智能分析对话</h3>
					<p>你可以询问图层解读、业务分析、报告整理，或者让助手帮助你梳理下一步思路。</p>
				</div>

				<div v-else ref="aiChatBodyRef" class="chat-list">
					<div v-if="contextCompressionVisible" class="context-compression-indicator">
						<span>正在自动压缩上下文</span>
					</div>
					<div
						v-for="message in visibleMessages"
						:key="message.id"
						:class="['chat-row', message.role]"
					>
						<div v-if="message.role === 'assistant'" class="chat-avatar assistant">
							<img :src="icons.ai" alt="AI" />
						</div>

						<div v-if="message.role === 'user'" class="chat-bubble" :class="{ 'is-streaming': isStreamingAssistant(message) }">
							<div v-if="isStreamingAssistant(message) || hasThinkingText(message)" class="chat-thinking">
								<div class="chat-thinking-head">
									<div class="chat-thinking-label">
										<span class="thinking-dot"></span>
										<span>{{ getThinkingLabel(message) }}</span>
									</div>
									<button
										v-if="canToggleThinking(message)"
										class="thinking-toggle-btn"
										type="button"
										@click="toggleThinking(message)"
									>
										{{ isThinkingCollapsed(message) ? '展开' : '收起' }}
									</button>
								</div>
								<div v-if="hasThinkingText(message) && !isThinkingCollapsed(message)" class="chat-thinking-text">
									{{ message.thinking }}
								</div>
								<div v-if="showBubbleLoader(message)" class="chat-bubble-loader" aria-hidden="true">
									<span></span>
									<span></span>
									<span></span>
								</div>
							</div>

							<div v-if="message.content" class="chat-text">{{ message.content }}</div>
							<div v-if="hasMessageFiles(message)" class="message-file-list">
								<div v-for="(file, index) in message.files" :key="`${message.id}-file-${index}`" class="upload-file-item compact-file-card message-file-card">
									<div class="upload-file-icon">{{ getFileIconLabel(file) }}</div>
									<div class="upload-file-info">
										<div class="upload-file-name">{{ file.name }}</div>
										<div class="upload-file-meta">{{ getFileTypeLabel(file) }} · {{ formatFileSize(file.size) }}</div>
									</div>
								</div>
							</div>
							<div v-if="hasToolCalls(message)" class="tool-call-list">
								<div v-for="toolCall in message.toolCalls" :key="toolCall.name" class="tool-call-chip">
									<span class="tool-call-dot"></span>
									<span>{{ formatToolCall(toolCall) }}</span>
								</div>
							</div>
							<div v-if="hasExecutionFlow(message)" class="process-panel">
								<div class="process-panel-head">
									<div class="process-panel-title-wrap">
										<div class="process-panel-title">执行过程</div>
										<div class="process-panel-subtitle">{{ getExecutionFlowHeadline(message) }}</div>
									</div>
									<button
										v-if="canToggleProcessPanel(message)"
										class="process-toggle-btn"
										type="button"
										@click="toggleProcessPanel(message)"
									>
										{{ message.processCollapsed ? '展开' : '收起' }}
									</button>
								</div>
								<div v-if="!message.processCollapsed" class="process-panel-body">
									<div v-if="getProcessOverviewChips(message).length" class="process-chip-list">
										<span
											v-for="chip in getProcessOverviewChips(message)"
											:key="chip"
											class="process-chip"
										>
											{{ chip }}
										</span>
									</div>
									<div v-if="getProcessAgentStatuses(message).length" class="process-agent-list">
										<div
											v-for="agent in getProcessAgentStatuses(message)"
											:key="agent.role || agent.name"
											class="process-agent-card"
										>
											<div class="process-agent-name">{{ formatAgentRole(agent.role) }}</div>
											<div class="process-agent-meta">
												<span :class="['process-status-pill', getProcessStatusClass(agent.status)]">
													{{ getProcessStatusLabel(agent.status) }}
												</span>
											</div>
										</div>
									</div>
									<div v-if="getProcessPlanNodes(message).length" class="process-section">
										<div class="process-section-title">任务规划</div>
										<div class="process-step-list">
											<div
												v-for="(node, index) in getProcessPlanNodes(message)"
												:key="node.id || node.title || index"
												class="process-step"
											>
												<div class="process-step-head">
													<div class="process-step-title">{{ getProcessNodeTitle(node, index) }}</div>
													<span :class="['process-status-pill', getProcessStatusClass(inferPlanNodeStatus(message, node))]">
														{{ getProcessStatusLabel(inferPlanNodeStatus(message, node)) }}
													</span>
												</div>
												<div v-if="node.reason" class="process-step-detail">{{ node.reason }}</div>
												<div v-if="node.toolName || node.dependsOn?.length" class="process-step-meta">
													<span v-if="node.toolName">工具：{{ formatToolName(node.toolName) }}</span>
													<span v-if="node.dependsOn?.length">依赖：{{ node.dependsOn.join(' -> ') }}</span>
												</div>
											</div>
										</div>
									</div>
									<div v-if="getProcessExecutionBatches(message).length" class="process-section">
										<div class="process-section-title">执行批次</div>
										<div class="process-batch-list">
											<span
												v-for="batch in getProcessExecutionBatches(message)"
												:key="`batch-${batch.batch || batch.stepIds?.join('-')}`"
												class="process-batch-chip"
											>
												{{ formatExecutionBatch(batch) }}
											</span>
										</div>
									</div>
									<div v-if="getProcessExecutionSteps(message).length" class="process-section">
										<div class="process-section-title">执行步骤</div>
										<div class="process-step-list">
											<div
												v-for="(step, index) in getProcessExecutionSteps(message)"
												:key="step.id || step.title || index"
												class="process-step"
											>
												<div class="process-step-head">
													<div class="process-step-title">{{ getProcessStepTitle(step, index) }}</div>
													<span :class="['process-status-pill', getProcessStatusClass(step.status)]">
														{{ getProcessStatusLabel(step.status) }}
													</span>
												</div>
												<div v-if="getProcessStepDetail(step)" class="process-step-detail">{{ getProcessStepDetail(step) }}</div>
												<div v-if="getProcessStepMeta(step).length" class="process-step-meta">
													<span v-for="meta in getProcessStepMeta(step)" :key="meta">{{ meta }}</span>
												</div>
											</div>
										</div>
									</div>
									<div v-if="getProcessRepairTrace(message).length" class="process-section">
										<div class="process-section-title">自修复与重规划</div>
										<div class="process-step-list">
											<div
												v-for="(repair, index) in getProcessRepairTrace(message)"
												:key="`${repair.stepId || 'repair'}-${index}`"
												class="process-step"
											>
												<div class="process-step-head">
													<div class="process-step-title">{{ formatRepairTitle(repair, index) }}</div>
													<span :class="['process-status-pill', getProcessStatusClass(repair.status)]">
														{{ getProcessStatusLabel(repair.status) }}
													</span>
												</div>
												<div class="process-step-detail">{{ formatRepairDetail(repair) }}</div>
												<div v-if="getRepairMeta(repair).length" class="process-step-meta">
													<span v-for="meta in getRepairMeta(repair)" :key="meta">{{ meta }}</span>
												</div>
											</div>
										</div>
									</div>
									<div v-if="hasProcessMemory(message)" class="process-section">
										<div class="process-section-title">记忆与上下文</div>
										<div v-if="getProcessMemorySummary(message)" class="process-memory-card">
											<div class="process-memory-label">记忆摘要</div>
											<div class="process-memory-text">{{ getProcessMemorySummary(message) }}</div>
										</div>
										<div v-if="getProcessShortTermSummary(message)" class="process-memory-card">
											<div class="process-memory-label">短期上下文</div>
											<div class="process-memory-text">{{ getProcessShortTermSummary(message) }}</div>
										</div>
										<div v-if="getProcessRelevantMemories(message).length" class="process-memory-card">
											<div class="process-memory-label">命中记忆</div>
											<div class="process-memory-list">
												<div
													v-for="(memory, index) in getProcessRelevantMemories(message)"
													:key="memory.id || memory.summary || index"
													class="process-memory-item"
												>
													{{ formatRelevantMemory(memory) }}
												</div>
											</div>
										</div>
									</div>
									<div v-if="getProcessSuggestions(message).length" class="process-section">
										<div class="process-section-title">下一步建议</div>
										<div class="process-suggestion-list">
											<div
												v-for="(suggestion, index) in getProcessSuggestions(message)"
												:key="suggestion.id || suggestion.title || suggestion.action || index"
												class="process-suggestion-item"
											>
												<div class="process-suggestion-title">{{ getSuggestionTitle(suggestion, index) }}</div>
												<div v-if="getSuggestionDetail(suggestion)" class="process-suggestion-detail">{{ getSuggestionDetail(suggestion) }}</div>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div v-if="hasPolicyInventory(message)" class="policy-inventory-result">
								<div class="template-title">文件内政策文件清单</div>
								<div class="policy-inventory-list">
									<div
										v-for="(policy, index) in message.fileAnalysis.policyFiles"
										:key="`${message.id}-policy-${index}`"
										class="policy-inventory-item"
									>
										<div class="policy-inventory-main">
											<div class="policy-inventory-name">{{ policy.name }}</div>
											<div class="policy-inventory-meta">
												{{ policy.status === 'found' ? `知识库已命中 ${policy.citations?.length || 0} 条依据` : '知识库未命中，需要确认后补采' }}
											</div>
										</div>
										<span :class="['policy-status-pill', policy.status === 'found' ? 'found' : 'missing']">
											{{ policy.status === 'found' ? '已命中' : '待补采' }}
										</span>
									</div>
								</div>
							</div>
							<div v-if="hasFileReadSummary(message)" class="policy-inventory-result">
								<div class="template-title">文件读取与解析</div>
								<div class="policy-inventory-list">
									<div
										v-for="(file, index) in getFileReadSummaryItems(message)"
										:key="`${message.id}-reader-${index}`"
										class="policy-inventory-item"
									>
										<div class="policy-inventory-main">
											<div class="policy-inventory-name">{{ file.originalName || `文件 ${index + 1}` }}</div>
											<div class="policy-inventory-meta">
												{{ formatFileReadSummary(file) }}
											</div>
										</div>
										<span :class="['policy-status-pill', file.textLooksGarbled ? 'missing' : 'found']">
											{{ file.textLooksGarbled ? '需复核' : '已读取' }}
										</span>
									</div>
								</div>
							</div>
							<div v-if="hasPublicCollection(message)" class="public-collection-result">
								<div class="template-title">{{ getPublicCollectionTitle(message.publicCollection) }}</div>
								<div class="public-collection-summary">{{ message.publicCollection.message || getPublicCollectionStatusText(message.publicCollection) }}</div>
								<div class="public-collection-meta">
									<span v-if="message.publicCollection.crawlJobId">爬取任务 {{ message.publicCollection.crawlJobId }}</span>
									<span v-if="message.publicCollection.parseRunId">解析任务 {{ message.publicCollection.parseRunId }}</span>
									<span v-if="Number.isFinite(Number(message.publicCollection.reviewCandidateCount))">待审核 {{ message.publicCollection.reviewCandidateCount }} 条</span>
								</div>
								<button
									v-if="canCollectMissingPolicies(message.publicCollection)"
									class="public-collection-action"
									type="button"
									:disabled="isLoading"
									@click="confirmPolicyCollectionFromBubble(message.publicCollection)"
								>
									开始补采
								</button>
							</div>
							<div v-if="message.replicaResult" class="replica-result">
								<div class="template-title">{{ message.replicaResult.title || '工程文档复刻包' }}</div>
								<div v-if="message.replicaResult.outputRoot" class="template-output">
									已生成：{{ message.replicaResult.outputRoot }}
								</div>
								<div v-if="message.replicaResult.directoryTree?.length" class="replica-block">
									<div class="template-section-title">目录树</div>
									<div class="replica-tree">
										<div v-for="item in message.replicaResult.directoryTree" :key="item">{{ item }}</div>
									</div>
								</div>
								<div v-if="message.replicaResult.files?.length" class="replica-block">
									<div class="template-section-title">文件清单</div>
									<div class="replica-file-list">
										<div v-for="file in message.replicaResult.files" :key="file.path" class="replica-file-item">
											<div class="replica-file-path">{{ file.path }}</div>
											<div v-if="file.purpose" class="replica-file-purpose">{{ file.purpose }}</div>
										</div>
									</div>
								</div>
							</div>
							<div v-if="message.archiveResult" class="archive-result">
								<div class="template-title">{{ message.archiveResult.title || '项目资料归档包' }}</div>
								<div v-if="message.archiveResult.outputRoot" class="template-output">
									已生成：{{ message.archiveResult.outputRoot }}
								</div>
								<div v-if="message.archiveResult.categories?.length" class="replica-block">
									<div class="template-section-title">归档分类</div>
									<div class="replica-tree">
										<div v-for="item in message.archiveResult.categories" :key="item.path || item.name">
											{{ item.path }}{{ item.purpose ? ` · ${item.purpose}` : '' }}
										</div>
									</div>
								</div>
								<div v-if="message.archiveResult.files?.length" class="replica-block">
									<div class="template-section-title">文件清单</div>
									<div class="replica-file-list">
										<div v-for="file in message.archiveResult.files" :key="file.archivePath" class="replica-file-item">
											<div class="replica-file-path">{{ file.archivePath }}</div>
											<div v-if="file.category" class="replica-file-purpose">{{ file.category }}</div>
										</div>
									</div>
								</div>
							</div>
							<div v-if="message.compareResult" class="compare-result">
								<div
									v-for="section in getCompareSections(message.compareResult)"
									:key="section.key"
									class="compare-section"
								>
									<div class="compare-section-title">{{ section.title }}</div>
									<div v-if="section.items.length" class="compare-item-list">
										<div v-for="(item, index) in section.items" :key="`${section.key}-${index}`" class="compare-item">
											<div class="compare-item-head">
												<span class="compare-item-title">{{ item.title || section.fallback }}</span>
												<span v-if="item.severity" class="compare-severity">{{ item.severity }}</span>
											</div>
											<div v-if="item.detail" class="compare-item-detail">{{ item.detail }}</div>
											<div v-if="item.citationLabels?.length" class="compare-item-citations">
												<span v-for="label in item.citationLabels" :key="label">{{ label }}</span>
											</div>
										</div>
									</div>
									<div v-else class="compare-empty">暂无</div>
								</div>
							</div>
							<div v-if="message.role === 'user' && hasCitations(message)" class="citation-list">
								<button
									v-for="(citation, index) in message.citations"
									:key="citation.id || citation.documentId || citation.previewDocumentId || citation.chunkId || index"
									class="citation-card"
									type="button"
									@click="openCitationPreview(citation)"
								>
									<div class="citation-head">
										<span class="citation-label">{{ citation.citationLabel || `[${index + 1}]` }}</span>
										<span class="citation-title">{{ citation.title || '知识库资料' }}</span>
									</div>
									<div class="citation-meta">
										<span v-if="citation.sourceOrg">{{ citation.sourceOrg }}</span>
										<span v-if="citation.publishDate">{{ citation.publishDate }}</span>
										<span v-if="citation.score">匹配度 {{ formatCitationScore(citation.score) }}</span>
										<span v-if="citation.locator">{{ citation.locator }}</span>
									</div>
									<div v-if="citation.quote" class="citation-quote">{{ citation.quote }}</div>
								</button>
							</div>
							<div v-if="hasGraphKnowledge(message)" class="graph-result">
								<div class="graph-result-head">
									<span>图谱检索</span>
									<span v-if="message.queryMode">{{ getGraphModeLabel(message.queryMode) }}</span>
									<span v-if="message.indexJobId">索引任务 {{ message.indexJobId }}</span>
								</div>
								<div v-if="message.graphSummary" class="graph-summary">{{ message.graphSummary }}</div>
								<div v-if="message.entities?.length" class="graph-section">
									<div class="graph-section-title">实体</div>
									<div class="graph-chip-list">
										<span v-for="entity in message.entities.slice(0, 12)" :key="getGraphItemKey(entity, 'entity')">
											{{ entity.name || entity.title || entity.id }}
										</span>
									</div>
								</div>
								<div v-if="message.relationships?.length" class="graph-section">
									<div class="graph-section-title">关系</div>
									<div class="graph-line-list">
										<div v-for="relationship in message.relationships.slice(0, 8)" :key="getGraphItemKey(relationship, 'relationship')">
											{{ formatGraphRelationship(relationship) }}
										</div>
									</div>
								</div>
								<div v-if="message.communities?.length" class="graph-section">
									<div class="graph-section-title">社区</div>
									<div class="graph-line-list">
										<div v-for="community in message.communities.slice(0, 6)" :key="getGraphItemKey(community, 'community')">
											{{ community.title || community.name || community.summary || community.id }}
										</div>
									</div>
								</div>
							</div>
						</div>

						<div v-else class="assistant-timeline-card" :class="{ 'is-streaming': isStreamingAssistant(message) }">
							<button
								v-if="hasAssistantTimeline(message)"
								class="assistant-run-head"
								type="button"
								@click="toggleAssistantTimeline(message)"
							>
								<span class="assistant-run-title">{{ getAssistantRunLabel(message) }}</span>
								<span class="assistant-run-meta">{{ getAssistantDurationLabel(message) }}</span>
								<span class="assistant-run-chevron">{{ isAssistantTimelineCollapsed(message) ? '展开' : '收起' }}</span>
							</button>

							<div v-if="hasAssistantTimeline(message) && !isAssistantTimelineCollapsed(message)" class="codex-run-log">
								<div
									v-for="(item, index) in getCodexRunItems(message)"
									:key="item.id || `${item.kind}-${index}`"
									:class="['codex-run-item', `is-${item.kind}`]"
								>
									<div v-if="item.kind === 'tool'" class="codex-tool-row">
										<span class="codex-tool-icon">▹</span>
										<span class="codex-tool-label">{{ item.label }}</span>
										<code v-if="item.command" class="codex-tool-command">{{ item.command }}</code>
									</div>
									<div v-else-if="item.kind === 'edit'" class="codex-edit-row">
										<span class="codex-edit-icon">◇</span>
										<span>{{ item.text }}</span>
									</div>
									<p v-else class="codex-run-text">
										<span v-for="(part, partIndex) in item.parts" :key="`${item.id}-${partIndex}`">
											<code v-if="part.code">{{ part.text }}</code>
											<span v-else>{{ part.text }}</span>
										</span>
									</p>
									<div v-if="item.meta?.length" class="codex-run-meta">
										<span v-for="meta in item.meta" :key="meta">{{ meta }}</span>
									</div>
									<div v-if="item.detail" class="codex-run-detail">
										{{ item.detail }}
									</div>
										</div>
							</div>

							<div v-if="isStreamingAssistant(message) || hasThinkingText(message)" class="assistant-thinking">
								<div class="chat-thinking-head">
									<div class="chat-thinking-label">
										<span class="thinking-dot"></span>
										<span>{{ getThinkingLabel(message) }}</span>
									</div>
									<button
										v-if="canToggleThinking(message)"
										class="thinking-toggle-btn"
										type="button"
										@click="toggleThinking(message)"
									>
										{{ isThinkingCollapsed(message) ? '展开' : '收起' }}
									</button>
								</div>
								<div v-if="hasThinkingText(message) && !isThinkingCollapsed(message)" class="chat-thinking-text">
									{{ message.thinking }}
								</div>
								<div v-if="showBubbleLoader(message)" class="chat-bubble-loader" aria-hidden="true">
									<span></span>
									<span></span>
									<span></span>
								</div>
							</div>

							<div v-if="message.content" class="assistant-final-answer">{{ message.content }}</div>
							<div v-if="hasRelatedFiles(message)" class="related-file-section">
								<div class="related-file-title">关联文件</div>
								<div class="related-file-list">
									<button
										v-for="(file, index) in getRelatedFiles(message)"
										:key="file.id || file.documentId || file.previewDocumentId || file.chunkId || index"
										class="related-file-card"
										type="button"
										@click="openCitationPreview(file)"
									>
										<span class="related-file-label">{{ file.citationLabel || `[${index + 1}]` }}</span>
										<span class="related-file-main">
											<span class="related-file-name">{{ getRelatedFileTitle(file, index) }}</span>
											<span v-if="getRelatedFileMeta(file)" class="related-file-meta">{{ getRelatedFileMeta(file) }}</span>
										</span>
									</button>
								</div>
							</div>
						</div>

						<div v-if="message.role === 'user'" class="chat-avatar user">
							<img :src="icons.me" alt="用户" />
						</div>
					</div>
				</div>

				<div class="composer-wrap">
					<div class="composer">
						<div v-if="uploadPanelVisible" class="upload-panel">
							<div class="upload-panel-head">
								<div>
									<div class="upload-panel-title">上传材料</div>
									<div class="upload-panel-subtitle">支持 txt、md、csv、html 等文本材料，PDF/DOCX 会先作为附件保存。</div>
								</div>
								<button class="upload-close-btn" type="button" @click="uploadPanelVisible = false">关闭</button>
							</div>
							<input
								class="upload-input"
								type="file"
								multiple
								@change="handleTemplateFilesChange"
							/>
							<div v-if="templateFiles.length" class="upload-file-list">
								<div v-for="(file, index) in templateFiles" :key="`${file.name}-${index}`" class="upload-file-item">
									<span>{{ file.name }}</span>
									<button type="button" @click="removeTemplateFile(index)">移除</button>
								</div>
							</div>
						</div>
						<input
							ref="fileInputRef"
							class="upload-input direct-upload-input"
							type="file"
							multiple
							@change="handleTemplateFilesChange"
						/>
						<div
							v-if="templateFiles.length"
							:class="['upload-file-strip', { 'can-left': fileStripCanScrollLeft, 'can-right': fileStripCanScrollRight }]"
						>
							<button
								v-if="fileStripCanScrollLeft"
								class="file-strip-nav left"
								type="button"
								aria-label="向左查看更多文件"
								@click="scrollFileStrip('left')"
							>
								‹
							</button>
							<div ref="fileStripRef" class="upload-file-list compact-file-list" @scroll="updateFileStripScrollState">
							<div v-for="(file, index) in templateFiles" :key="`${file.name}-${index}`" class="upload-file-item compact-file-card">
								<div class="upload-file-icon">{{ getFileIconLabel(file) }}</div>
								<div class="upload-file-info">
									<div class="upload-file-name">{{ file.name }}</div>
									<div class="upload-file-meta">{{ getFileTypeLabel(file) }} · {{ formatFileSize(file.size) }}</div>
								</div>
								<button class="upload-file-remove" type="button" title="移除" @click="removeTemplateFile(index)">×</button>
							</div>
							</div>
							<button
								v-if="fileStripCanScrollRight"
								class="file-strip-nav right"
								type="button"
								aria-label="向右查看更多文件"
								@click="scrollFileStrip('right')"
							>
								›
							</button>
						</div>
						<textarea
							v-model="draft"
							class="composer-input"
							placeholder="给智能分析助手发送消息"
							:disabled="isLoading"
							@keydown="onComposerKeydown"
						></textarea>

						<div class="composer-footer">
							<div class="composer-left">
								<div v-if="false" class="mode-toggle" role="group" aria-label="AI模式">
									<button
										type="button"
										:class="['mode-toggle-btn', { active: chatMode === 'chat' }]"
										:disabled="isLoading"
										@click="chatMode = 'chat'"
									>
										问答
									</button>
									<button
										type="button"
										:class="['mode-toggle-btn', { active: chatMode === 'compare' }]"
										:disabled="isLoading"
										@click="chatMode = 'compare'"
									>
										依据比对
									</button>
									<button
										type="button"
										:class="['mode-toggle-btn', { active: chatMode === 'replicate' }]"
										:disabled="isLoading"
										@click="chatMode = 'replicate'"
									>
										复刻
									</button>
									<button
										type="button"
										:class="['mode-toggle-btn', { active: chatMode === 'archive' }]"
										:disabled="isLoading"
										@click="chatMode = 'archive'"
									>
										归档
									</button>
								</div>
								<select
									v-if="false"
									v-model="graphQueryMode"
									class="graph-mode-select"
									:disabled="isLoading"
									aria-label="GraphRAG 查询模式"
								>
									<option value="auto">自动</option>
									<option value="local">Local Search</option>
									<option value="global">Global Search</option>
								</select>
								<select
									v-if="false"
									v-model="openClawProvider"
									class="graph-mode-select"
									:disabled="isLoading"
									aria-label="OpenClaw 方案"
								>
									<option value="local">本地智能体</option>
									<option value="gateway">Gateway OpenClaw</option>
								</select>

								<button class="upload-toggle-btn" type="button" :disabled="isLoading" @click="openTemplateFilePicker">
									上传材料{{ templateFiles.length ? `(${templateFiles.length})` : '' }}
								</button>
								<!-- <select
									v-model="selectedModel"
									class="model-select"
									:disabled="isLoading"
									@change="applySelectedModel"
								>
									<option v-for="model in availableModels" :key="model" :value="model">
										{{ model }}
									</option>
								</select> -->

								<!-- <button class="secondary-btn" :disabled="isLoading" @click="resetConversation">
									新建对话
								</button> -->
							</div>

							<div
								class="token-usage-ring"
								:class="getTokenUsageTone(tokenUsage)"
								:style="getTokenUsageRingStyle(tokenUsage)"
								:title="getTokenUsageLabel(tokenUsage)"
								:aria-label="getTokenUsageLabel(tokenUsage)"
								role="meter"
								:aria-valuenow="tokenUsage.used"
								:aria-valuemin="0"
								:aria-valuemax="tokenUsage.budget"
							></div>
							<button
								v-if="isLoading"
								class="stop-btn"
								type="button"
								aria-label="停止本次对话"
								title="停止本次对话"
								@click="stopCurrentResponse"
							>
								停止
							</button>
							<button v-else class="primary-btn" :disabled="!canSend" type="button" @click="sendDraft">
								发送
							</button>
							<button v-if="false" class="primary-btn" :disabled="!canSend" @click="sendDraft">
								{{ isLoading ? '思考中...' : '发送' }}
							</button>
						</div>
					</div>

					<div class="composer-tip">
						当前使用 GraphRAG / Neo4j 知识图谱后端，支持 Local / Global Search、图谱引用和原文预览。
					</div>
				</div>
			</div>

			<div v-if="previewVisible" class="preview-backdrop" @click.self="closePreview">
				<section class="preview-panel" role="dialog" aria-modal="true">
					<header class="preview-header">
						<div class="preview-title-wrap">
							<div class="preview-title">{{ previewDocument?.item?.title || activeCitation?.title || '原文预览' }}</div>
							<div class="preview-meta">
								<span v-if="previewDocument?.item?.sourceOrg">{{ previewDocument.item.sourceOrg }}</span>
								<span v-if="previewDocument?.item?.publishDate">{{ previewDocument.item.publishDate }}</span>
								<a
									v-if="previewDocument?.item?.sourceUrl"
									class="preview-source-link"
									:href="previewDocument.item.sourceUrl"
									target="_blank"
									rel="noopener noreferrer"
								>
									打开原网页
								</a>
							</div>
						</div>
						<button class="preview-close" type="button" title="关闭" @click="closePreview">
							<img :src="icons.close" alt="关闭" class="action-icon" />
						</button>
					</header>
					<div v-if="previewLoading" class="preview-state">正在读取原文...</div>
					<div v-else-if="previewError" class="preview-state warning">{{ previewError }}</div>
					<div v-else class="preview-content">
						<div v-if="activeCitation?.quote" class="preview-quote">
							<div class="preview-quote-label">引用摘录</div>
							<div class="preview-quote-text">{{ activeCitation.quote }}</div>
						</div>
						<pre>{{ previewDocument?.preview?.content || '暂无可预览内容' }}</pre>
					</div>
				</section>
			</div>

			<!--
			<aside ref="chatHistorySidebarRef" class="chat-history-sidebar" :class="{ 'is-open': historyVisible, 'is-mobile': isMobileView }">
				<div class="sidebar-header">
					<span class="sidebar-title">鍘嗗彶瀵硅瘽</span>
					<button class="sidebar-close-btn" @click="toggleHistory" title="鍏抽棴">
						<img :src="icons.close" alt="鍏抽棴" />
					</button>
				</div>
				<div class="sidebar-actions">
					<button class="new-chat-btn" @click="createNewChat">
						<img :src="icons.add" alt="鏂板缓" />
						<span>鏂板缓瀵硅瘽</span>
					</button>
				</div>
				<div class="history-list">
					<div
						v-for="chat in chatHistoryList"
						:key="chat.id"
						:class="['history-item', { active: chat.id === currentChatId }]"
						@click="switchToChat(chat.id)"
					>
						<div class="history-item-icon">
							<img :src="icons.chat" alt="瀵硅瘽" />
						</div>
						<div class="history-item-content">
							<div class="history-item-title">{{ chat.title || '鏈懡鍚嶅璇? }}</div>
							<div class="history-item-time">{{ formatTime(chat.updatedAt) }}</div>
						</div>
						<button
							class="history-item-delete"
							@click.stop="deleteChat(chat.id)"
							title="鍒犻櫎"
						>
							<img :src="icons.delete" alt="鍒犻櫎" />
						</button>
					</div>
					<div v-if="chatHistoryList.length === 0" class="history-empty">
						鏆傛棤鍘嗗彶瀵硅瘽
					</div>
				</div>
			</aside>
			-->
			<aside ref="chatHistorySidebarRef" class="chat-history-sidebar" :class="{ 'is-open': historyVisible, 'is-mobile': isMobileView }">
				<div class="sidebar-header">
					<span class="sidebar-title">历史对话</span>
					<button class="sidebar-close-btn" @click="toggleHistory" title="关闭">
						<img :src="icons.close" alt="关闭" />
					</button>
				</div>
				<div class="sidebar-actions">
					<button class="new-chat-btn" @click="createNewChat">
						<img :src="icons.add" alt="新建" />
						<span>新建对话</span>
					</button>
				</div>
				<div class="history-list">
					<div
						v-for="chat in chatHistoryList"
						:key="chat.id"
						:class="['history-item', { active: chat.id === currentChatId }]"
						@click="switchToChat(chat.id)"
					>
						<div class="history-item-icon">
							<img :src="icons.chat" alt="对话" />
						</div>
						<div class="history-item-content">
							<div class="history-item-title">{{ chat.title || '未命名对话' }}</div>
							<div class="history-item-time">{{ formatTime(chat.updatedAt) }}</div>
						</div>
						<button
							class="history-item-delete"
							@click.stop="deleteChat(chat.id)"
							title="删除"
						>
							<img :src="icons.delete" alt="删除" />
						</button>
					</div>
					<div v-if="chatHistoryList.length === 0" class="history-empty">暂无历史对话</div>
				</div>
			</aside>
		</div>
	</div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { analyzeKnowledgeFileStream, archiveDocuments, chatWithKnowledge, chatWithKnowledgeStream, collectMissingPolicyFiles, compareKnowledgeEvidence, deleteChatSession, getKnowledgeDocumentPreview, getKnowledgeModels, listChatSessions, replicateDocuments, routeKnowledgeFileFollowup, saveChatSession, understandKnowledgeTurn } from '../../api/knowledge';

const MODEL_STORAGE_KEY = 'smart-analysis-ollama-model';
const MODEL_LIST_STORAGE_KEY = 'smart-analysis-ollama-model-list';
const CHAT_LIST_STORAGE_KEY = 'smart-analysis-ollama-chat-list';
const DEFAULT_MODELS = ['qwen2.5:7b', 'qwen3.5:9b', 'deepseek-r1:8b', 'vuemaster:latest'];
const CACHED_MODEL_LIST = loadCachedModelList();
const DEFAULT_MODEL = localStorage.getItem(MODEL_STORAGE_KEY) || CACHED_MODEL_LIST[0] || DEFAULT_MODELS[0];
const CONNECTION_ERROR_TEXT = '当前无法连接知识库后端，请确认 knowledge-server 已启动。';
const CURRENT_CHAT_ID_KEY = 'smart-analysis-ollama-current-chat-id';
const MOBILE_BREAKPOINT = 768;
const COMPACT_PANEL_BREAKPOINT = 960;
const MAXIMIZED_PANEL_WIDTH_RATIO = 0.92;
const MAXIMIZED_PANEL_HEIGHT_RATIO = 0.82;
const MOBILE_PANEL_WIDTH_RATIO = 0.94;
const MOBILE_PANEL_HEIGHT_RATIO = 0.84;
const MAXIMIZED_PANEL_MAX_WIDTH = 1600;
const MAXIMIZED_PANEL_MAX_HEIGHT = 1060;
const MINIMIZED_PANEL_WIDTH = 420;
const MINIMIZED_PANEL_HEIGHT = 620;
const MINIMIZED_PANEL_RIGHT_GAP = 10;
const MINIMIZED_PANEL_BOTTOM_GAP = 80;
const MIN_PANEL_TOP_GAP = 70;
const PANEL_VIEWPORT_GAP = 10;
const TOKEN_USAGE_BUDGET = 150000;
const CONTEXT_COMPRESSION_THRESHOLD_PERCENT = 80;
const CONTEXT_COMPRESSION_RECENT_MESSAGES = 6;
const PANEL_SCROLL_SYNC_DELAY = 420;

const props = defineProps({
	active: Boolean,
	icons: {
		type: Object,
		default: () => ({})
	},
	activeTool: String,
	aiChatVisible: Boolean,
	aiChatMaximized: Boolean,
	aiChatDragging: Boolean,
	aiChatTop: Number,
	aiChatLeft: Number,
	aiChatMessages: {
		type: Array,
		default: () => []
	},
	aiChatInput: {
		type: String,
		default: ''
	}
});

defineEmits(['start-tool', 'drag-start', 'toggle-size', 'close-chat', 'send-message', 'update:aiChatInput']);

const aiChatPanelRef = ref(null);
const aiChatBodyRef = ref(null);
const chatHistorySidebarRef = ref(null);
const aiChatMainRef = ref(null);
const aiChatHeaderRef = ref(null);
const fileInputRef = ref(null);
const fileStripRef = ref(null);
const draft = ref('');
const selectedModel = ref(DEFAULT_MODEL);
const availableModels = ref(CACHED_MODEL_LIST.length ? CACHED_MODEL_LIST : [...new Set([DEFAULT_MODEL, ...DEFAULT_MODELS])]);
const statusText = ref('正在连接知识库智能体...');
const statusTone = ref('neutral');
const userError = ref('');
const loadingModels = ref(false);
const isLoading = ref(false);
const activeAssistantMessageId = ref(null);
const messages = ref([]);
const chatMode = ref('chat');
const graphQueryMode = ref('auto');
const openClawProvider = ref('local');
const uploadPanelVisible = ref(false);
const templateFiles = ref([]);
const fileStripCanScrollLeft = ref(false);
const fileStripCanScrollRight = ref(false);
const pendingPolicyCollection = ref(null);
const contextCompressionVisible = ref(false);
const lastFileAnalysisRequest = ref(null);
const fileAnalysisRequestByChat = new Map();
const previewVisible = ref(false);
const previewLoading = ref(false);
const previewError = ref('');
const previewDocument = ref(null);
const activeCitation = ref(null);

// 历史对话相关状态
const chatHistoryList = ref(loadChatList());
const currentChatId = ref(null);
const draftChatId = ref(createSessionId());
const historyVisible = ref(true);
const isMobileView = ref(false);
const viewportSize = ref(getViewportSize());
let resizeObserver = null;
let scrollSyncTimer = null;
let activeRequestController = null;
let activeDurationTimer = null;
let chatSyncTimer = null;
let loadingChatSessions = false;

// 如果有当前对话ID但没有对应的对话记录，则重置
clearPersistedCurrentChatId();

watch(
	messages,
	() => {
	},
	{ deep: true }
);

watch(templateFiles, () => {
	nextTick(updateFileStripScrollState);
});

const visibleMessages = computed(() => messages.value);
const canSend = computed(() => (Boolean(draft.value.trim()) || templateFiles.value.length > 0) && !isLoading.value);
const showModelPicker = computed(() => import.meta.env.DEV && availableModels.value.length > 1);
const currentModelLabel = computed(() => selectedModel.value || '未选择模型');
const noticeText = computed(() => userError.value || statusText.value);
const noticeTone = computed(() => (userError.value ? 'warning' : statusTone.value));
const tokenUsage = computed(() => {
	const fileText = templateFiles.value
		.map((file) => `${file.name} ${file.size || 0}`)
		.join('\n');
	const persisted = buildContextWindowTokenUsage(messages.value);
	const pendingUsed = estimateTokenUsage([draft.value, fileText].filter(Boolean).join('\n\n'));
	const used = Number(persisted.totalTokens) + pendingUsed;
	const budget = TOKEN_USAGE_BUDGET;
	return {
		used,
		budget,
		percent: Math.min(100, Math.round((used / budget) * 100)),
		source: persisted.source
	};
});
const panelInlineStyle = computed(() => {
	const metrics = props.aiChatMaximized || isMobileView.value
		? getMaximizedPanelMetrics()
		: getMinimizedPanelMetrics();

	return {
		top: `${metrics.top}px`,
		left: `${metrics.left}px`,
		width: `${metrics.width}px`,
		height: `${metrics.height}px`
	};
});

function estimateTokenUsage(value = '') {
	const text = String(value || '');
	const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
	const asciiText = text.replace(/[\u4e00-\u9fff]/g, '');
	return Math.max(0, Math.ceil(cjkCount + asciiText.length / 4));
}

function getTokenUsageRingStyle(usage = {}) {
	const percent = Math.max(0, Math.min(100, Number(usage.percent) || 0));
	const color = percent >= 90 ? '#ef4444' : (percent >= 70 ? '#f59e0b' : '#9ca3af');
	return {
		background: `conic-gradient(${color} ${percent}%, #e5e7eb 0)`
	};
}

function getTokenUsageTone(usage = {}) {
	const percent = Number(usage.percent) || 0;
	if (percent >= 90) return 'is-danger';
	if (percent >= 70) return 'is-warning';
	return 'is-normal';
}

function getTokenUsageLabel(usage = {}) {
	const used = Number(usage.used) || 0;
	const budget = Number(usage.budget) || TOKEN_USAGE_BUDGET;
	const percent = Math.max(0, Math.min(100, Number(usage.percent) || 0));
	return `Tokens ${formatCompactTokenCount(used)}/${formatCompactTokenCount(budget)} (${percent}%)`;
}

function formatCompactTokenCount(value = 0) {
	const count = Math.max(0, Number(value) || 0);
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1)}k`;
	}
	return String(Math.round(count));
}

function getCurrentUserId() {
	return localStorage.getItem('userName') || 'local-user';
}

function buildMessageTokenUsage(message = {}) {
	const inputText = [
		message.role,
		message.content,
		message.thinking,
		message.contextText
	].filter(Boolean).join('\n');
	const total = estimateTokenUsage(inputText);
	return {
		...(message.tokenUsage || {}),
		estimatedInputTokens: message.role === 'user' ? total : Number(message.tokenUsage?.estimatedInputTokens) || 0,
		estimatedOutputTokens: message.role === 'assistant' ? total : Number(message.tokenUsage?.estimatedOutputTokens) || 0,
		totalTokens: Number(message.tokenUsage?.totalTokens) || total,
		budget: Number(message.tokenUsage?.budget) || TOKEN_USAGE_BUDGET,
		source: message.tokenUsage?.source || 'estimated'
	};
}

function attachMessageTokenUsage(message = {}) {
	return {
		...message,
		tokenUsage: buildMessageTokenUsage(message)
	};
}

function buildSessionTokenUsage(messageList = []) {
	const usageItems = (Array.isArray(messageList) ? messageList : []).map((message) => message?.tokenUsage || {});
	const estimatedInputTokens = usageItems.reduce((sum, usage) => sum + (Number(usage.estimatedInputTokens) || 0), 0);
	const estimatedOutputTokens = usageItems.reduce((sum, usage) => sum + (Number(usage.estimatedOutputTokens) || 0), 0);
	const actualInputTokens = usageItems.reduce((sum, usage) => sum + (Number(usage.actualInputTokens) || 0), 0);
	const actualOutputTokens = usageItems.reduce((sum, usage) => sum + (Number(usage.actualOutputTokens) || 0), 0);
	const total = usageItems.reduce((sum, usage) => sum + Number(usage.totalTokens || 0), 0);
	const hasActual = actualInputTokens > 0 || actualOutputTokens > 0;
	return {
		estimatedInputTokens,
		estimatedOutputTokens,
		actualInputTokens,
		actualOutputTokens,
		totalTokens: total,
		budget: TOKEN_USAGE_BUDGET,
		source: hasActual ? 'model_usage' : 'estimated'
	};
}

function buildNormalizedConversationMessages(messageList = messages.value) {
	return (Array.isArray(messageList) ? messageList : [])
		.filter((message) => (message.role === 'user' || message.role === 'assistant') && String(message.content || '').trim())
		.map((message) => ({
			role: message.role,
			content: String(message.content || '').trim()
		}));
}

function getConversationCompressionState(messageList = messages.value, normalized = null) {
	const normalizedMessages = Array.isArray(normalized) ? normalized : buildNormalizedConversationMessages(messageList);
	const textTokens = estimateTokenUsage(normalizedMessages.map((message) => `${message.role}: ${message.content}`).join('\n\n'));
	const sessionTokens = Number(buildSessionTokenUsage((Array.isArray(messageList) ? messageList : []).map(attachMessageTokenUsage)).totalTokens) || 0;
	const triggerTokens = Math.max(textTokens, sessionTokens);
	return {
		shouldCompress: normalizedMessages.length > CONTEXT_COMPRESSION_RECENT_MESSAGES &&
			triggerTokens >= TOKEN_USAGE_BUDGET * (CONTEXT_COMPRESSION_THRESHOLD_PERCENT / 100),
		textTokens,
		sessionTokens,
		triggerTokens
	};
}

function buildCompressedConversationContext(normalized = []) {
	const recent = normalized.slice(-CONTEXT_COMPRESSION_RECENT_MESSAGES);
	const older = normalized.slice(0, -CONTEXT_COMPRESSION_RECENT_MESSAGES);
	const summary = older
		.map((message, index) => `${index + 1}. ${message.role === 'user' ? '用户' : 'AI'}：${clipContextSummaryText(message.content, 220)}`)
		.join('\n');
	return [
		{
			role: 'assistant',
			content: [
				'【历史上下文已自动压缩】',
				'以下是较早对话的摘要，用于保持连续性；最近对话仍保留原文。',
				summary
			].filter(Boolean).join('\n')
		},
		...recent
	];
}

function buildContextWindowTokenUsage(messageList = []) {
	const normalized = buildNormalizedConversationMessages(messageList);
	const compression = getConversationCompressionState(messageList, normalized);
	if (compression.shouldCompress) {
		const compressedContext = buildCompressedConversationContext(normalized);
		const compressedTokens = estimateTokenUsage(compressedContext.map((message) => `${message.role}: ${message.content}`).join('\n\n'));
		return {
			estimatedInputTokens: compressedTokens,
			estimatedOutputTokens: 0,
			actualInputTokens: 0,
			actualOutputTokens: 0,
			totalTokens: compressedTokens,
			budget: TOKEN_USAGE_BUDGET,
			source: 'compressed_context'
		};
	}
	return buildSessionTokenUsage((Array.isArray(messageList) ? messageList : []).map(attachMessageTokenUsage));
}

async function showContextCompressionNoticeIfNeeded(assistantMessage = null, signal = null) {
	const normalized = buildNormalizedConversationMessages(messages.value);
	const compression = getConversationCompressionState(messages.value, normalized);
	if (!compression.shouldCompress) {
		return false;
	}

	contextCompressionVisible.value = true;
	const alreadyNotified = Boolean(assistantMessage?.contextCompressionNotified);
	if (assistantMessage && !alreadyNotified) {
		assistantMessage.contextCompressionNotified = true;
		applyKnowledgeStreamEvent(assistantMessage, {
			type: 'context_compression_started',
			title: '正在自动压缩上下文',
			message: `当前上下文 ${formatCompactTokenCount(compression.triggerTokens)}/${formatCompactTokenCount(TOKEN_USAGE_BUDGET)}，正在压缩较早对话并保留最近内容。`,
			toolName: 'context.compress'
		});
		messages.value = [...messages.value];
	}

	await nextTick();
	scheduleScrollToBottom();
	if (!alreadyNotified) {
		await waitForMinimumAnswerDelay(Date.now(), 600, signal);
	}
	return true;
}

function clearAssistantDurationTimer() {
	if (activeDurationTimer) {
		window.clearInterval(activeDurationTimer);
		activeDurationTimer = null;
	}
}

function updateAssistantDuration(message, nowMs = Date.now()) {
	if (!message?.requestStartedAtMs) return;
	message.durationMs = Math.max(1, nowMs - Number(message.requestStartedAtMs));
}

function startAssistantDurationTimer(message, startedAtMs = Date.now()) {
	clearAssistantDurationTimer();
	if (!message) return;
	message.requestStartedAtMs = Number(startedAtMs) || Date.now();
	message.startedAt = message.startedAt || new Date(message.requestStartedAtMs).toISOString();
	message.completedAt = '';
	updateAssistantDuration(message);
	messages.value = [...messages.value];
	activeDurationTimer = window.setInterval(() => {
		if (!message || message.id !== activeAssistantMessageId.value || !isLoading.value) {
			clearAssistantDurationTimer();
			return;
		}
		updateAssistantDuration(message);
		messages.value = [...messages.value];
	}, 1000);
}

function finalizeAssistantDuration(message, completedAtMs = Date.now()) {
	clearAssistantDurationTimer();
	if (!message) return;
	if (message.requestStartedAtMs) {
		updateAssistantDuration(message, completedAtMs);
	}
	message.completedAt = new Date(completedAtMs).toISOString();
}

watch(
	() => [props.aiChatVisible, props.active, visibleMessages.value.length, isLoading.value],
	() => {
		scheduleScrollToBottom();
	},
	{ flush: 'post' }
);

watch(
	() => props.aiChatVisible,
	(visible) => {
		if (visible) {
			loadModels();
		}
	}
);

// 监听最大化状态变化，缩小面板时关闭历史侧边栏
watch(
	() => props.aiChatMaximized,
	(maximized) => {
		if (!maximized) {
			historyVisible.value = false;
		}
		scheduleScrollToBottom();
	}
);

onMounted(() => {
	loadModels();
	loadChatSessionsFromServer();
	scrollToBottom();
	initResizeObserver();
	checkMobileView();
	window.addEventListener('resize', checkMobileView);
});

onUnmounted(() => {
	stopCurrentResponse();
	clearAssistantDurationTimer();
	if (resizeObserver) {
		resizeObserver.disconnect();
		resizeObserver = null;
	}
	if (scrollSyncTimer) {
		clearTimeout(scrollSyncTimer);
		scrollSyncTimer = null;
	}
	if (chatSyncTimer) {
		clearTimeout(chatSyncTimer);
		chatSyncTimer = null;
	}
	window.removeEventListener('resize', checkMobileView);
});

function initResizeObserver() {
	if (typeof ResizeObserver !== 'undefined') {
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				checkMobileView(entry.contentRect.width);
				scheduleScrollToBottom();
			}
		});
		if (aiChatPanelRef.value) {
			resizeObserver.observe(aiChatPanelRef.value);
		}
	}
}

function checkMobileView() {
	viewportSize.value = getViewportSize();
	isMobileView.value = window.innerWidth < MOBILE_BREAKPOINT;
	nextTick(updateFileStripScrollState);
}

function getViewportSize() {
	if (typeof window === 'undefined') {
		return { width: 1440, height: 900 };
	}

	return {
		width: window.innerWidth,
		height: window.innerHeight
	};
}

function getMaximizedPanelMetrics() {
	const { width: viewportWidth, height: viewportHeight } = viewportSize.value;
	const compactLayout = viewportWidth < COMPACT_PANEL_BREAKPOINT;
	const width = compactLayout
		? viewportWidth * MOBILE_PANEL_WIDTH_RATIO
		: Math.min(MAXIMIZED_PANEL_MAX_WIDTH, viewportWidth * MAXIMIZED_PANEL_WIDTH_RATIO);
	const height = compactLayout
		? viewportHeight * MOBILE_PANEL_HEIGHT_RATIO
		: Math.min(MAXIMIZED_PANEL_MAX_HEIGHT, viewportHeight * MAXIMIZED_PANEL_HEIGHT_RATIO);
	const left = Math.max(PANEL_VIEWPORT_GAP, (viewportWidth - width) / 2);
	const top = Math.max(140, (viewportHeight - height) / 2); // 修改默认对话框距离头部高度

	return roundPanelMetrics({ width, height, left, top });
}

function getDefaultMinimizedPanelMetrics() {
	const { width: viewportWidth, height: viewportHeight } = viewportSize.value;
	const width = Math.min(MINIMIZED_PANEL_WIDTH, viewportWidth - PANEL_VIEWPORT_GAP * 2);
	const height = Math.min(MINIMIZED_PANEL_HEIGHT, viewportHeight - MIN_PANEL_TOP_GAP - PANEL_VIEWPORT_GAP);
	const left = Math.max(PANEL_VIEWPORT_GAP, viewportWidth - width - MINIMIZED_PANEL_RIGHT_GAP);
	const top = Math.max(MIN_PANEL_TOP_GAP, viewportHeight - height - MINIMIZED_PANEL_BOTTOM_GAP);

	return roundPanelMetrics({ width, height, left, top });
}

function getMinimizedPanelMetrics() {
	const defaults = getDefaultMinimizedPanelMetrics();
	const maxLeft = Math.max(PANEL_VIEWPORT_GAP, viewportSize.value.width - defaults.width - PANEL_VIEWPORT_GAP);
	const maxTop = Math.max(MIN_PANEL_TOP_GAP, viewportSize.value.height - defaults.height - PANEL_VIEWPORT_GAP);

	return {
		...defaults,
		left: clampPanelValue(props.aiChatLeft, PANEL_VIEWPORT_GAP, maxLeft, defaults.left),
		top: clampPanelValue(props.aiChatTop, MIN_PANEL_TOP_GAP, maxTop, defaults.top)
	};
}

function clampPanelValue(value, min, max, fallback) {
	const resolved = Number.isFinite(value) ? value : fallback;
	return Math.min(Math.max(resolved, min), max);
}

function roundPanelMetrics(metrics) {
	return {
		width: Math.round(metrics.width),
		height: Math.round(metrics.height),
		left: Math.round(metrics.left),
		top: Math.round(metrics.top)
	};
}

function scrollToBottom() {
	nextTick(() => {
		const element = aiChatBodyRef.value;
		if (element) {
			element.scrollTop = element.scrollHeight;
		}
	});
}

function scheduleScrollToBottom() {
	scrollToBottom();

	if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
		window.requestAnimationFrame(() => {
			scrollToBottom();
		});
	}

	if (scrollSyncTimer) {
		clearTimeout(scrollSyncTimer);
	}

	scrollSyncTimer = setTimeout(() => {
		scrollToBottom();
		scrollSyncTimer = null;
	}, PANEL_SCROLL_SYNC_DELAY);
}

function applySelectedModel() {
	localStorage.setItem(MODEL_STORAGE_KEY, selectedModel.value);
	userError.value = '';
	statusText.value = `已切换到 ${selectedModel.value}`;
	statusTone.value = 'success';
}

function loadCachedModelList() {
	try {
		const raw = localStorage.getItem(MODEL_LIST_STORAGE_KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		return Array.isArray(list) ? [...new Set(list.filter(Boolean))] : [];
	} catch {
		localStorage.removeItem(MODEL_LIST_STORAGE_KEY);
		return [];
	}
}

function saveCachedModelList(list) {
	const normalized = Array.isArray(list) ? [...new Set(list.filter(Boolean))] : [];
	if (normalized.length) {
		localStorage.setItem(MODEL_LIST_STORAGE_KEY, JSON.stringify(normalized));
		return;
	}

	localStorage.removeItem(MODEL_LIST_STORAGE_KEY);
}

async function loadModels() {
	if (loadingModels.value) return;
	loadingModels.value = true;
	userError.value = '';

	try {
		const result = await getKnowledgeModels();
		const models = Array.isArray(result?.models)
			? result.models.map((item) => item?.name || item?.model).filter(Boolean)
			: [];
		saveCachedModelList(models);
		availableModels.value = models.length ? models : [...DEFAULT_MODELS];

		if (!availableModels.value.includes(selectedModel.value)) {
			selectedModel.value = availableModels.value[0];
			applySelectedModel();
		}

		statusText.value = models.length
			? '知识库智能体已连接，可以开始提问'
			: 'GraphRAG 后端已连接，可以开始图谱问答';
		statusTone.value = 'success';
	} catch {
		const cachedModels = loadCachedModelList();
		availableModels.value = cachedModels.length
			? cachedModels
			: [...new Set([selectedModel.value, ...DEFAULT_MODELS])];
		statusText.value = '未检测到知识库后端，请确认 knowledge-server 已启动';
		statusTone.value = 'warning';
	} finally {
		loadingModels.value = false;
	}
}

function resetConversation() {
	createNewChat();
}

// 历史对话管理
function loadChatList() {
	try {
		const raw = localStorage.getItem(CHAT_LIST_STORAGE_KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		return Array.isArray(list) ? list : [];
	} catch {
		localStorage.removeItem(CHAT_LIST_STORAGE_KEY);
		return [];
	}
}

function saveChatList(list) {
	if (list.length === 0) {
		localStorage.removeItem(CHAT_LIST_STORAGE_KEY);
	} else {
		localStorage.setItem(CHAT_LIST_STORAGE_KEY, JSON.stringify(list));
	}
}

function normalizeChatForStorage(chat = {}) {
	const messagesWithUsage = (Array.isArray(chat.messages) ? chat.messages : []).map(attachMessageTokenUsage);
	return {
		...chat,
		id: chat.id || createSessionId(),
		userId: getCurrentUserId(),
		title: chat.title || '',
		model: chat.model || selectedModel.value,
		messages: messagesWithUsage,
		updatedAt: chat.updatedAt || new Date().toISOString(),
		lastMessageAt: getLastAssistantReplyTime(messagesWithUsage) || chat.updatedAt || new Date().toISOString(),
		anchorDocuments: Array.isArray(chat.anchorDocuments) ? chat.anchorDocuments : buildAnchorDocumentsFromMessages(messagesWithUsage),
		uploadedDocuments: Array.isArray(chat.uploadedDocuments) ? chat.uploadedDocuments : buildAnchorDocumentsFromMessages(messagesWithUsage),
		conversationMemory: chat.conversationMemory || {},
		tokenUsage: buildSessionTokenUsage(messagesWithUsage)
	};
}

function buildAnchorDocumentsFromMessages(messageList = []) {
	const map = new Map();
	for (const message of Array.isArray(messageList) ? messageList : []) {
		const files = [
			...(Array.isArray(message.files) ? message.files : []),
			...(Array.isArray(message.relatedFiles) ? message.relatedFiles : [])
		];
		for (const file of files) {
			const documentId = file.documentId || file.previewDocumentId || file.id;
			if (!documentId || map.has(documentId)) continue;
			map.set(documentId, {
				documentId,
				role: file.role || 'uploaded_file',
				originalName: file.originalName || file.name || file.title || documentId,
				title: file.title || file.name || file.originalName || documentId
			});
		}
	}
	return [...map.values()];
}

function schedulePersistChatToServer(chat) {
	if (!chat?.id) return;
	if (chatSyncTimer) {
		window.clearTimeout(chatSyncTimer);
		chatSyncTimer = null;
	}
	chatSyncTimer = window.setTimeout(() => {
		persistChatToServer(chat);
	}, 500);
}

async function persistChatToServer(chat) {
	try {
		await saveChatSession(normalizeChatForStorage(chat));
	} catch {
		// Keep localStorage as the offline fallback. The next message change will retry.
	}
}

async function loadChatSessionsFromServer() {
	if (loadingChatSessions) return;
	loadingChatSessions = true;
	try {
		const result = await listChatSessions(getCurrentUserId());
		const items = Array.isArray(result?.items) ? result.items : [];
		if (items.length > 0) {
			chatHistoryList.value = items;
			saveChatList(items);
			const currentId = localStorage.getItem(CURRENT_CHAT_ID_KEY);
			const current = currentId ? items.find((item) => item.id === currentId) : items[0];
			if (current && !messages.value.length) {
				switchToChat(current.id);
			}
		}
	} catch {
		// Local cache remains the fallback when the backend is unavailable.
	} finally {
		loadingChatSessions = false;
	}
}

function clearPersistedCurrentChatId() {
	try {
		localStorage.removeItem(CURRENT_CHAT_ID_KEY);
	} catch {
		// Ignore cleanup failures so the chat can still work in-memory.
	}
}

function createSessionId() {
	return createMessageId();
}

function getActiveFileAnalysisChatId() {
	return currentChatId.value || draftChatId.value || '';
}

function getLastFileAnalysisRequestForActiveChat() {
	const chatId = getActiveFileAnalysisChatId();
	if (!chatId) return null;
	const request = fileAnalysisRequestByChat.get(chatId) || null;
	lastFileAnalysisRequest.value = request;
	return request;
}

function setLastFileAnalysisRequestForActiveChat(request = null) {
	const chatId = getActiveFileAnalysisChatId();
	if (!chatId) {
		lastFileAnalysisRequest.value = null;
		return;
	}
	if (!request?.files?.length && !request?.documentIds?.length) {
		fileAnalysisRequestByChat.delete(chatId);
		lastFileAnalysisRequest.value = null;
		return;
	}
	const next = {
		...request,
		chatId,
		updatedAt: new Date().toISOString()
	};
	fileAnalysisRequestByChat.set(chatId, next);
	lastFileAnalysisRequest.value = next;
}

function syncLastFileAnalysisRequestForActiveChat() {
	const chatId = getActiveFileAnalysisChatId();
	lastFileAnalysisRequest.value = chatId ? (fileAnalysisRequestByChat.get(chatId) || null) : null;
}

function extractDocumentIdsFromFileAnalysisResult(result = {}) {
	const ids = [
		...(Array.isArray(result?.fileAnalysis?.files) ? result.fileAnalysis.files : []),
		...(Array.isArray(result?.relatedFiles) ? result.relatedFiles : []),
		...(Array.isArray(result?.references) ? result.references : []),
		...(Array.isArray(result?.citations) ? result.citations : [])
	]
		.map((item) => item?.documentId || item?.previewDocumentId || item?.id)
		.filter(Boolean);
	return [...new Set(ids)];
}

function extractRecentUploadedDocumentIdsFromFileAnalysisResult(result = {}, count = 0) {
	const files = Array.isArray(result?.fileAnalysis?.files) ? result.fileAnalysis.files : [];
	const safeCount = Math.max(0, Number(count) || 0);
	const selected = safeCount > 0 ? files.slice(-safeCount) : files;
	const ids = selected
		.map((item) => item?.documentId || item?.previewDocumentId || item?.id)
		.filter(Boolean);
	return [...new Set(ids)];
}

function enterDraftChat() {
	clearAssistantDurationTimer();
	currentChatId.value = null;
	draftChatId.value = createSessionId();
	messages.value = [];
	activeAssistantMessageId.value = null;
	draft.value = '';
	userError.value = '';
	statusText.value = '已创建新的空白对话';
	statusTone.value = 'success';
	clearPersistedCurrentChatId();
	syncLastFileAnalysisRequestForActiveChat();
	scrollToBottom();
}

function persistDraftChat() {
	const now = new Date().toISOString();
	const newChat = {
		id: draftChatId.value || createSessionId(),
		userId: getCurrentUserId(),
		title: '',
		messages: [],
		model: selectedModel.value,
		createdAt: now,
		updatedAt: now,
		lastMessageAt: now,
		anchorDocuments: [],
		uploadedDocuments: [],
		conversationMemory: {},
		tokenUsage: buildSessionTokenUsage([])
	};

	chatHistoryList.value = [newChat, ...chatHistoryList.value];
	currentChatId.value = newChat.id;
	draftChatId.value = null;
	localStorage.setItem(CURRENT_CHAT_ID_KEY, newChat.id);
	saveChatList(chatHistoryList.value);
	schedulePersistChatToServer(newChat);

	return newChat;
}

function createNewChat() {
	if (!historyVisible.value) {
		historyVisible.value = true;
	}
	enterDraftChat();

	statusText.value = `新对话已创建`;
	statusTone.value = 'success';
	if (!historyVisible.value) {
		historyVisible.value = true;
	}
	saveChatList(chatHistoryList.value);
	scrollToBottom();
}

function switchToChat(chatId) {
	const chat = chatHistoryList.value.find((c) => c.id === chatId);
	if (!chat) return;
	clearAssistantDurationTimer();
	currentChatId.value = chatId;
	draftChatId.value = null;
	localStorage.setItem(CURRENT_CHAT_ID_KEY, chatId);
	messages.value = chat.messages ? [...chat.messages] : [];
	syncLastFileAnalysisRequestForActiveChat();
	activeAssistantMessageId.value = null;
	draft.value = '';
	userError.value = '';
	statusText.value = `已加载对话: ${chat.title || '未命名'}`;
	statusTone.value = 'success';
	scrollToBottom();
}

function deleteChat(chatId) {
	const chatToDelete = chatHistoryList.value.find((c) => c.id === chatId);
	if (chatToDelete) {
		// 清除该对话的消息记忆
		chatToDelete.messages = [];
	}
	fileAnalysisRequestByChat.delete(chatId);
	chatHistoryList.value = chatHistoryList.value.filter((c) => c.id !== chatId);
	if (currentChatId.value === chatId) {
		if (chatHistoryList.value.length > 0) {
			switchToChat(chatHistoryList.value[0].id);
		} else {
			enterDraftChat();
		}
	}
	saveChatList(chatHistoryList.value);
	deleteChatSession(chatId, getCurrentUserId()).catch(() => {});
}

function toggleHistory() {
	historyVisible.value = !historyVisible.value;
}

function formatTime(isoString) {
	if (!isoString) return '';
	const date = new Date(isoString);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const oneDay = 24 * 60 * 60 * 1000;
	const oneWeek = 7 * oneDay;

	if (diff < oneDay) {
		return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
	} else if (diff < oneWeek) {
		const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
		return days[date.getDay()];
	} else {
		return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
	}
}

function getLastAssistantReplyTime(messageList) {
	if (!Array.isArray(messageList)) {
		return null;
	}

	for (let index = messageList.length - 1; index >= 0; index -= 1) {
		const message = messageList[index];
		if (message?.role !== 'assistant') {
			continue;
		}

		if ((message.content || message.thinking) && message.timestamp) {
			return message.timestamp;
		}
	}

	return null;
}

// 监听消息变化，自动保存到当前对话
watch(
	messages,
	(newMessages) => {
		if (currentChatId.value) {
			const chat = chatHistoryList.value.find((c) => c.id === currentChatId.value);
			if (chat) {
				chat.messages = newMessages.map(attachMessageTokenUsage);
				chat.model = selectedModel.value;
				chat.updatedAt = getLastAssistantReplyTime(newMessages) || chat.updatedAt || null;
				chat.lastMessageAt = chat.updatedAt || chat.lastMessageAt || new Date().toISOString();
				chat.userId = chat.userId || getCurrentUserId();
				chat.anchorDocuments = buildAnchorDocumentsFromMessages(chat.messages);
				chat.uploadedDocuments = buildAnchorDocumentsFromMessages(chat.messages);
				chat.tokenUsage = buildSessionTokenUsage(chat.messages);
				if (!chat.title && newMessages.length > 0) {
					const firstUserMsg = newMessages.find((m) => m.role === 'user');
					if (firstUserMsg) {
						chat.title = firstUserMsg.content.slice(0, 30);
					}
				}
				saveChatList(chatHistoryList.value);
				schedulePersistChatToServer(chat);
			}
		}
	},
	{ deep: true }
);

async function sendDraft() {
	if (!canSend.value) return;

	const text = draft.value.trim();
	const requestStartedAt = Date.now();
	const minimumAnswerDelayMs = 3000 + Math.floor(Math.random() * 2000);
	const filesForRequest = [...templateFiles.value];
	const sentFiles = filesForRequest.map(toMessageFile);
	const displayText = buildUserMessageContent(text, filesForRequest);
	const requestController = new AbortController();
	const requestedPolicyFiles = extractRequestedPolicyCollectionFiles(text);
	contextCompressionVisible.value = false;

	// 如果没有当前对话，创建一个新的
	if (!currentChatId.value) {
		persistDraftChat();
	}

	const userMessage = createMessage('user', displayText, undefined, undefined, {
		files: sentFiles
	});
	const assistantMessage = createMessage('assistant', '', undefined, undefined, {
		thinking: '',
		isThinking: true,
		thinkingCollapsed: false,
		processCollapsed: false,
		timelineCollapsed: false,
		pendingFlow: [],
		startedAt: new Date(requestStartedAt).toISOString(),
		requestStartedAtMs: requestStartedAt,
		durationMs: 1
	});

	draft.value = '';
	templateFiles.value = [];
	fileStripCanScrollLeft.value = false;
	fileStripCanScrollRight.value = false;
	if (fileInputRef.value) {
		fileInputRef.value.value = '';
	}
	userError.value = '';
	isLoading.value = true;
	activeAssistantMessageId.value = assistantMessage.id;
	activeRequestController = requestController;
	messages.value = [...messages.value, userMessage, assistantMessage];
	startAssistantDurationTimer(assistantMessage, requestStartedAt);

	try {
		let result;
		let turnUnderstanding = null;
		try {
			const understood = await understandCurrentTurn(text, filesForRequest, assistantMessage, requestController.signal);
			turnUnderstanding = understood.understanding || null;
		} catch (error) {
			if (requestController.signal.aborted || error?.name === 'AbortError') {
				throw error;
			}
			turnUnderstanding = null;
		}
		if (requestedPolicyFiles.length > 0) {
			result = await collectMissingPolicyFiles({
				query: text,
				policyFiles: requestedPolicyFiles
			}, { signal: requestController.signal });
		} else if (shouldConfirmPolicyCollection(text)) {
			result = await collectMissingPolicyFiles({
				query: pendingPolicyCollection.value?.query || '',
				policyFiles: pendingPolicyCollection.value?.missingPolicyFiles || []
			}, { signal: requestController.signal });
		} else if (!turnUnderstanding && await shouldContinueLastFileAnalysis(text, filesForRequest, assistantMessage, requestController.signal)) {
			const lastRequest = getLastFileAnalysisRequestForActiveChat();
			const instruction = text || lastRequest.instruction || '请继续结合最新知识库分析这个文件。';
			result = await analyzeKnowledgeFileStream({
				instruction,
				topK: 4,
				userId: getCurrentUserId(),
				convId: currentChatId.value || draftChatId.value || createSessionId(),
				files: lastRequest.documentIds?.length ? [] : (lastRequest.files || []),
				documentIds: lastRequest.documentIds || []
			}, {
				onStatus: (event) => applyKnowledgeStreamEvent(assistantMessage, event),
				onProgress: (event) => applyKnowledgeStreamEvent(assistantMessage, event),
				onResult: (payload) => applyKnowledgeChatResult(assistantMessage, payload, { collapseProcess: true })
			}, { signal: requestController.signal });
			const documentIds = lastRequest.documentIds?.length
				? lastRequest.documentIds
				: extractRecentUploadedDocumentIdsFromFileAnalysisResult(result, lastRequest.files?.length || 0);
			setLastFileAnalysisRequestForActiveChat({
				...lastRequest,
				instruction,
				documentIds: documentIds.length ? documentIds : lastRequest.documentIds
			});
		} else if (chatMode.value === 'replicate') {
			result = await replicateDocuments({
				instruction: text || '请根据上传材料复刻一套工程项目文档目录和文件草案。',
				projectText: text,
				files: filesForRequest
			}, { signal: requestController.signal });
		} else if (chatMode.value === 'archive') {
			result = await archiveDocuments({
				instruction: text || '请根据上传材料整理项目资料归档清单。',
				projectText: text,
				files: filesForRequest
			}, { signal: requestController.signal });
		} else if (chatMode.value === 'compare') {
			result = await compareKnowledgeEvidence({
				question: '请对以下项目材料进行政策依据比对。',
				projectText: text,
				topK: 4
			}, { signal: requestController.signal });
		} else if (filesForRequest.length > 0) {
			const instruction = text || '请帮我分析一下这个文件。';
			const previousRequest = getLastFileAnalysisRequestForActiveChat();
			const shouldIncludePrevious = Boolean(turnUnderstanding?.includePreviousUploads);
			const previousDocumentIds = Array.isArray(previousRequest?.documentIds) ? previousRequest.documentIds.filter(Boolean) : [];
			const previousFiles = Array.isArray(previousRequest?.files) ? previousRequest.files : [];
			const analysisPlan = shouldIncludePrevious
				? {
					files: previousDocumentIds.length ? filesForRequest : [...previousFiles, ...filesForRequest],
					documentIds: previousDocumentIds,
					instruction: [
						instruction,
						'',
						'文件分组说明：',
						`上一批上传文件：\n${fileDisplayNames(previousFiles)}`,
						`本次上传文件：\n${fileDisplayNames(filesForRequest)}`,
						'请只在用户明确要求跨批对比或关联时比较两组文件，并分别说明来源。'
					].join('\n')
				}
				: {
					instruction,
					files: filesForRequest,
					documentIds: []
				};
			setLastFileAnalysisRequestForActiveChat({
				instruction,
				files: filesForRequest
			});
			result = await analyzeKnowledgeFileStream({
				instruction: analysisPlan.instruction,
				topK: 4,
				userId: getCurrentUserId(),
				convId: currentChatId.value || draftChatId.value || createSessionId(),
				files: analysisPlan.files,
				documentIds: analysisPlan.documentIds || []
			}, {
				onStatus: (event) => applyKnowledgeStreamEvent(assistantMessage, event),
				onProgress: (event) => applyKnowledgeStreamEvent(assistantMessage, event),
				onResult: (payload) => applyKnowledgeChatResult(assistantMessage, payload, { collapseProcess: true })
			}, { signal: requestController.signal });
			const documentIds = extractRecentUploadedDocumentIdsFromFileAnalysisResult(result, analysisPlan.files?.length || filesForRequest.length);
			if (documentIds.length > 0) {
				setLastFileAnalysisRequestForActiveChat({
					instruction,
					files: filesForRequest,
					documentIds
				});
			}
		} else {
			await showContextCompressionNoticeIfNeeded(assistantMessage, requestController.signal);
			const conversationContext = buildConversationContext();
			result = await chatWithKnowledgeStream({
				question: text,
				messages: conversationContext,
				mode: graphQueryMode.value,
				chatProfile: 'expert',
				useOpenClaw: true,
				openClawProvider: openClawProvider.value,
				userId: localStorage.getItem('userName') || 'local-user',
				convId: currentChatId.value || draftChatId.value || createSessionId(),
				topK: 6
			}, {
				onStatus: (event) => applyKnowledgeStreamEvent(assistantMessage, event),
				onProgress: (event) => applyKnowledgeStreamEvent(assistantMessage, event),
				onReconnect: (event) => applyKnowledgeStreamEvent(assistantMessage, event)
			}, { signal: requestController.signal, maxReconnectAttempts: 5, inactivityTimeoutMs: 120000 });
		}

		await waitForMinimumAnswerDelay(requestStartedAt, minimumAnswerDelayMs, requestController.signal);
		applyKnowledgeChatResult(assistantMessage, result, { collapseProcess: true });
		ensureAssistantMessageHasVisibleResult(assistantMessage);
		assistantMessage.timestamp = new Date().toISOString();
		assistantMessage.isThinking = false;
		assistantMessage.thinkingCollapsed = true;
		finalizeAssistantDuration(assistantMessage);
		if (chatMode.value === 'replicate' || chatMode.value === 'archive') {
			templateFiles.value = [];
			uploadPanelVisible.value = false;
			if (fileInputRef.value) {
				fileInputRef.value.value = '';
			}
		}
		messages.value = [...messages.value];
		contextCompressionVisible.value = false;
	} catch (error) {
		contextCompressionVisible.value = false;
		if (error?.name === 'AbortError') {
			assistantMessage.content = assistantMessage.content || '已停止本次对话。';
			assistantMessage.timestamp = new Date().toISOString();
			assistantMessage.isThinking = false;
			assistantMessage.thinkingCollapsed = true;
			assistantMessage.processCollapsed = true;
			finalizeAssistantDuration(assistantMessage);
			messages.value = [...messages.value];
			return;
		}
		assistantMessage.content = assistantMessage.content || (error?.message || '本次请求已中断，未返回可展示结果。');
		assistantMessage.timestamp = new Date().toISOString();
		assistantMessage.isThinking = false;
		assistantMessage.thinkingCollapsed = true;
		assistantMessage.processCollapsed = false;
		finalizeAssistantDuration(assistantMessage);
		messages.value = [...messages.value];
		userError.value = error?.message || CONNECTION_ERROR_TEXT;
		statusText.value = error?.message ? '知识库请求失败' : '本地模型暂不可用';
		statusTone.value = 'warning';
	} finally {
		if (activeRequestController === requestController) {
			activeRequestController = null;
			isLoading.value = false;
			activeAssistantMessageId.value = null;
		}
		assistantMessage.isThinking = false;
	}
}

function stopCurrentResponse() {
	if (activeRequestController) {
		activeRequestController.abort();
	}

	const assistantMessage = messages.value.find((message) => message.id === activeAssistantMessageId.value);
	if (assistantMessage) {
		assistantMessage.content = assistantMessage.content || '已停止本次对话。';
		assistantMessage.isThinking = false;
		assistantMessage.thinkingCollapsed = true;
		assistantMessage.processCollapsed = true;
		assistantMessage.timestamp = new Date().toISOString();
		finalizeAssistantDuration(assistantMessage);
		messages.value = [...messages.value];
	}

	clearAssistantDurationTimer();
	activeRequestController = null;
	isLoading.value = false;
	activeAssistantMessageId.value = null;
}

function waitForMinimumAnswerDelay(startedAt = Date.now(), minimumMs = 0, signal = null) {
	const remaining = Math.max(0, Number(minimumMs) - (Date.now() - Number(startedAt || Date.now())));
	if (remaining <= 0 || signal?.aborted) {
		return Promise.resolve();
	}
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, remaining);
		if (signal) {
			signal.addEventListener('abort', () => {
				clearTimeout(timer);
				const error = new DOMException('Aborted', 'AbortError');
				reject(error);
			}, { once: true });
		}
	});
}

function openTemplateFilePicker() {
	if (fileInputRef.value) {
		fileInputRef.value.value = '';
	}
	fileInputRef.value?.click();
}

function handleTemplateFilesChange(event) {
	const selected = Array.from(event?.target?.files || []);
	if (selected.length === 0) return;

	const existing = new Set(templateFiles.value.map((file) => `${file.name}|${file.size}|${file.lastModified}`));
	const nextFiles = [...templateFiles.value];
	for (const file of selected) {
		const key = `${file.name}|${file.size}|${file.lastModified}`;
		if (!existing.has(key)) {
			existing.add(key);
			nextFiles.push(file);
		}
	}
	templateFiles.value = nextFiles;
	nextTick(updateFileStripScrollState);
}

function removeTemplateFile(index) {
	templateFiles.value = templateFiles.value.filter((_, itemIndex) => itemIndex !== index);
	nextTick(updateFileStripScrollState);
}

function toMessageFile(file) {
	return {
		name: file?.name || '未命名文件',
		size: Number(file?.size) || 0,
		type: file?.type || '',
		lastModified: file?.lastModified || 0
	};
}

function updateFileStripScrollState() {
	const element = fileStripRef.value;
	if (!element) {
		fileStripCanScrollLeft.value = false;
		fileStripCanScrollRight.value = false;
		return;
	}

	const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
	fileStripCanScrollLeft.value = element.scrollLeft > 2;
	fileStripCanScrollRight.value = element.scrollLeft < maxScrollLeft - 2;
}

function scrollFileStrip(direction) {
	const element = fileStripRef.value;
	if (!element) return;

	const delta = Math.max(180, Math.round(element.clientWidth * 0.6));
	element.scrollBy({
		left: direction === 'left' ? -delta : delta,
		behavior: 'smooth'
	});
	window.setTimeout(updateFileStripScrollState, 260);
}

function getFileIconLabel(file) {
	const name = String(file?.name || '').toLowerCase();
	if (name.endsWith('.doc') || name.endsWith('.docx')) return 'W';
	if (name.endsWith('.pdf')) return 'P';
	if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'X';
	return 'F';
}

function getFileTypeLabel(file) {
	const name = String(file?.name || '').toLowerCase();
	if (name.endsWith('.doc') || name.endsWith('.docx')) return 'Word';
	if (name.endsWith('.pdf')) return 'PDF';
	if (name.endsWith('.xls') || name.endsWith('.xlsx')) return 'Excel';
	if (name.endsWith('.csv')) return 'CSV';
	if (name.endsWith('.md')) return 'Markdown';
	if (name.endsWith('.txt')) return 'Text';
	return 'File';
}

function formatFileSize(size) {
	const value = Number(size) || 0;
	if (value >= 1024 * 1024) {
		return `${Math.round(value / 1024 / 1024)}MB`;
	}
	if (value >= 1024) {
		return `${Math.round(value / 1024)}KB`;
	}
	return `${value}B`;
}

function buildUserMessageContent(text, files = []) {
	if (text) return text;
	if (files.length > 0) return '请分析上传材料。';
	return '';
	const fileLines = files.map((file) => `- ${file.name}`);
	if (fileLines.length === 0) {
		return text;
	}
	return [text || '请分析上传材料。', '', '上传材料:', ...fileLines].join('\n');
}

function fileDisplayNames(files = []) {
	return (Array.isArray(files) ? files : [])
		.map((file, index) => `${index + 1}. ${file?.name || `上传文件 ${index + 1}`}`)
		.join('\n');
}

function buildCurrentFileMetas(files = []) {
	return (Array.isArray(files) ? files : []).map((file) => ({
		name: file?.name || '',
		originalName: file?.name || '',
		fileName: file?.name || '',
		size: Number(file?.size || 0) || 0,
		type: file?.type || ''
	}));
}

async function understandCurrentTurn(text = '', filesForRequest = [], assistantMessage = null, signal = null) {
	const result = await understandKnowledgeTurn({
		question: text,
		messages: buildConversationContext(8),
		userId: getCurrentUserId(),
		convId: currentChatId.value || draftChatId.value || createSessionId(),
		currentFiles: buildCurrentFileMetas(filesForRequest)
	}, { signal });
	const understanding = result?.conversationUnderstanding || null;
	if (understanding && assistantMessage) {
		applyKnowledgeStreamEvent(assistantMessage, {
			type: 'conversation_understood',
			title: '理解对话对象',
			message: understanding.reason || understanding.intent || '',
			intent: understanding.intent || '',
			confidence: Number(understanding.confidence) || 0,
			targetFiles: Array.isArray(understanding.targetFiles) ? understanding.targetFiles : [],
			uploadedDocumentCount: Number(understanding.state?.uploadedDocumentCount) || 0
		});
	}
	return {
		understanding,
		executionPlan: result?.executionPlan || null
	};
}

function shouldIncludePreviousUploadByRule(text = '') {
	const normalized = String(text || '').trim();
	if (!normalized) return false;
	const mentionsPrevious = /(上次|上一个|上一份|上一批|之前|前一个|前一份|前一批|刚才|刚刚|上回)/.test(normalized);
	const mentionsCurrent = /(现在|当前|本次|这次|这个|这份|新上传|刚上传)/.test(normalized);
	const crossFileIntent = /(对比|比较|区别|差别|不同|差异|变化|哪里不一样|有什么不一样|关联|关系|联系|相关|对应|引用|依据|冲突|一致|匹配|能否互相印证)/.test(normalized);
	return crossFileIntent && (mentionsPrevious || mentionsCurrent);
}

async function shouldIncludePreviousUploadContext(instruction, currentFiles = [], previousRequest = null, assistantMessage = null, signal = null) {
	const current = Array.isArray(currentFiles) ? currentFiles : [];
	const previous = Array.isArray(previousRequest?.files) ? previousRequest.files : [];
	if (!current.length || !previous.length) return false;

	if (assistantMessage) {
		applyKnowledgeStreamEvent(assistantMessage, {
			id: 'previous-upload-context-route',
			type: 'file_followup_route',
			title: '判断跨批文件上下文',
			message: '正在判断本轮问题是否需要读取同一对话上一批上传文件。'
		});
	}

	try {
		await showContextCompressionNoticeIfNeeded(assistantMessage, signal);
		const conversationContext = buildConversationContext(8);
		const decision = await routeKnowledgeFileFollowup({
			question: [
				String(instruction || '').trim(),
				'',
				`本次新上传文件：${fileDisplayNames(current) || '无'}`,
				'请判断用户这个问题是否需要同时读取“上一批上传文件”和“本次新上传文件”才能回答。'
			].join('\n'),
			lastInstruction: previousRequest?.instruction || '',
			fileNames: previous.map((file) => file?.name || '').filter(Boolean),
			messages: conversationContext
		}, { signal });
		const aiDecision = decision?.route === 'file_analysis' || decision?.shouldUseFileAnalysis === true;
		const shouldInclude = aiDecision || (decision?.usedFallback && shouldIncludePreviousUploadByRule(instruction));
		if (assistantMessage) {
			applyKnowledgeStreamEvent(assistantMessage, {
				id: 'previous-upload-context-route',
				type: 'file_followup_routed',
				title: '完成跨批上下文判断',
				message: shouldInclude
					? `需要读取上一批文件：${decision?.reason || '问题依赖同一对话中的上一批上传文件。'}`
					: `只读取本次文件：${decision?.reason || '问题不依赖上一批上传文件。'}`
			});
		}
		return shouldInclude;
	} catch (error) {
		if (signal?.aborted || error?.name === 'AbortError') {
			throw error;
		}
		const shouldInclude = shouldIncludePreviousUploadByRule(instruction);
		if (assistantMessage) {
			applyKnowledgeStreamEvent(assistantMessage, {
				id: 'previous-upload-context-route',
				type: 'file_followup_routed',
				title: '完成跨批上下文判断',
				message: shouldInclude
					? 'AI 判断暂时不可用，已根据跨批文件关系表达读取上一批上传文件。'
					: 'AI 判断暂时不可用，未发现必须读取上一批上传文件的表达。'
			});
		}
		return shouldInclude;
	}
}

async function buildCurrentFileAnalysisPlan(instruction, currentFiles = [], previousRequest = null, assistantMessage = null, signal = null) {
	const current = Array.isArray(currentFiles) ? currentFiles : [];
	const previous = Array.isArray(previousRequest?.files) ? previousRequest.files : [];
	const includePrevious = await shouldIncludePreviousUploadContext(instruction, current, previousRequest, assistantMessage, signal);
	if (!includePrevious) {
		return {
			instruction,
			files: current,
			documentIds: []
		};
	}

	const previousDocumentIds = Array.isArray(previousRequest?.documentIds) ? previousRequest.documentIds.filter(Boolean) : [];
	return {
		files: previousDocumentIds.length ? current : [...previous, ...current],
		documentIds: previousDocumentIds,
		instruction: [
			instruction,
			'',
			'文件分组说明：',
			'下面会同时提供两组对话框上传文件，请严格按分组理解，不要把它们混成同一个文件。',
			`上一批上传文件（用于“上次/上一个/之前文件”）：\n${fileDisplayNames(previous)}`,
			`本次上传文件（用于“现在/这个/本次文件”）：\n${fileDisplayNames(current)}`,
			'回答时请分别说明两组文件的来源，并重点比较两组文件的区别。'
		].join('\n')
	};
}

function buildConversationContext(limit = 8) {
	const normalized = buildNormalizedConversationMessages(messages.value);
	const compression = getConversationCompressionState(messages.value, normalized);
	if (!compression.shouldCompress) {
		return normalized.slice(-limit);
	}
	contextCompressionVisible.value = true;
	return buildCompressedConversationContext(normalized);
}

function clipContextSummaryText(value = '', maxLength = 220) {
	const text = String(value || '').replace(/\s+/g, ' ').trim();
	return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function onComposerKeydown(event) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		sendDraft();
	}
}

function createMessage(role, content, id, timestamp, extra = {}) {
	return {
		id: id || createMessageId(),
		role,
		content,
		thinking: typeof extra.thinking === 'string' ? extra.thinking : '',
		isThinking: Boolean(extra.isThinking),
		thinkingCollapsed: Boolean(extra.thinkingCollapsed),
		citations: Array.isArray(extra.citations) ? extra.citations : [],
		sourcePreview: extra.sourcePreview || null,
		queryMode: extra.queryMode || '',
		entities: Array.isArray(extra.entities) ? extra.entities : [],
		relationships: Array.isArray(extra.relationships) ? extra.relationships : [],
		communities: Array.isArray(extra.communities) ? extra.communities : [],
		documentIds: Array.isArray(extra.documentIds) ? extra.documentIds : [],
		graphSummary: extra.graphSummary || '',
		indexJobId: extra.indexJobId || '',
		contextText: extra.contextText || '',
		model: extra.model || '',
		openClaw: extra.openClaw || null,
		agentTrace: extra.agentTrace || null,
		memoryContext: extra.memoryContext || null,
		conversationUnderstanding: extra.conversationUnderstanding || null,
		proactiveSuggestions: Array.isArray(extra.proactiveSuggestions) ? extra.proactiveSuggestions : [],
		processCollapsed: Boolean(extra.processCollapsed),
		pendingFlow: Array.isArray(extra.pendingFlow) ? extra.pendingFlow : [],
		compareResult: extra.compareResult || null,
		replicaResult: extra.replicaResult || null,
		archiveResult: extra.archiveResult || null,
		fileAnalysis: extra.fileAnalysis || null,
		publicCollection: extra.publicCollection || null,
		toolCalls: Array.isArray(extra.toolCalls) ? extra.toolCalls : [],
		executionTrace: extra.executionTrace || null,
		durationMs: Number.isFinite(Number(extra.durationMs)) ? Number(extra.durationMs) : 0,
		startedAt: extra.startedAt || '',
		completedAt: extra.completedAt || '',
		requestStartedAtMs: Number.isFinite(Number(extra.requestStartedAtMs)) ? Number(extra.requestStartedAtMs) : 0,
		relatedFiles: Array.isArray(extra.relatedFiles) ? extra.relatedFiles : [],
		timelineCollapsed: extra.timelineCollapsed !== undefined ? Boolean(extra.timelineCollapsed) : true,
		files: Array.isArray(extra.files) ? extra.files : [],
		tokenUsage: extra.tokenUsage || null,
		timestamp: timestamp || new Date().toISOString()
	};
}

function applyKnowledgeChatResult(message, result = {}, options = {}) {
	if (!message || !result) return;

	message.thinking = normalizeThinkingText(result?.thinking || '');
	message.content = result?.answer || result?.summary || '';
	message.replicaResult = result?.replica || null;
	message.archiveResult = result?.archive || null;
	message.compareResult = shouldShowCompareResult(result) ? normalizeCompareResult(result) : null;
	message.fileAnalysis = result?.fileAnalysis || null;
	message.publicCollection = result?.publicCollection || null;
	updatePendingPolicyCollection(result?.publicCollection);
	message.citations = normalizeReferences(result);
	message.toolCalls = Array.isArray(result?.toolCalls) ? result.toolCalls : [];
	message.executionTrace = normalizeExecutionTrace(result?.executionTrace, message);
	if (message.requestStartedAtMs) {
		updateAssistantDuration(message);
		message.startedAt = message.startedAt || new Date(message.requestStartedAtMs).toISOString();
	} else {
		message.durationMs = Number(result?.durationMs) || Number(message.executionTrace?.durationMs) || 0;
		message.startedAt = result?.startedAt || message.executionTrace?.startedAt || '';
		message.completedAt = result?.completedAt || message.executionTrace?.completedAt || '';
	}
	message.relatedFiles = normalizeRelatedFiles(result?.relatedFiles || result?.references || result?.citations || []);
	message.sourcePreview = result?.sourcePreview || null;
	message.queryMode = result?.queryMode || result?.mode || '';
	message.entities = Array.isArray(result?.entities) ? result.entities : [];
	message.relationships = Array.isArray(result?.relationships) ? result.relationships : [];
	message.communities = Array.isArray(result?.communities) ? result.communities : [];
	message.documentIds = Array.isArray(result?.documentIds) ? result.documentIds : [];
	message.graphSummary = result?.graphSummary || '';
	message.indexJobId = result?.indexJobId || '';
	message.contextText = result?.contextText || '';
	message.model = result?.model || selectedModel.value;
	message.openClaw = result?.openClaw || null;
	message.agentTrace = result?.agentTrace || null;
	message.memoryContext = result?.memoryContext || null;
	message.conversationUnderstanding = result?.conversationUnderstanding || message.conversationUnderstanding || null;
	message.proactiveSuggestions = Array.isArray(result?.proactiveSuggestions) ? result.proactiveSuggestions : [];
	if (result?.tokenUsage) {
		message.tokenUsage = {
			...result.tokenUsage,
			budget: Number(result.tokenUsage.budget) || TOKEN_USAGE_BUDGET,
			source: result.tokenUsage.source || 'model_usage'
		};
	}
	if (Array.isArray(message.pendingFlow) && message.pendingFlow.length > 0) {
		message.pendingFlow = message.pendingFlow.map((step) => {
			if (step.status === 'running') {
				return {
					...step,
					status: 'completed'
				};
			}
			return step;
		});
	}
	if (options?.collapseProcess) {
		message.processCollapsed = true;
		message.timelineCollapsed = true;
	}
}

function applyKnowledgeStreamEvent(message, event = {}) {
	if (!message || !event) return;

	const type = String(event.type || event.stage || '').trim();
	const planning = event.plan || null;
	const step = event.step || null;
	const repair = event.repair || null;
	const memory = event.memory || null;
	const validation = event.validation || null;

	if (type === 'assistant_delta') {
		const delta = typeof event.delta === 'string' ? event.delta : '';
		if (delta) {
			message.content = `${message.content || ''}${delta}`;
		} else if (typeof event.content === 'string') {
			message.content = event.content;
		}
		if (event.model) {
			message.model = event.model;
		}
		message.timestamp = new Date().toISOString();
		messages.value = [...messages.value];
		scrollToBottom();
		return;
	}

	if (type === 'assistant_thinking_delta') {
		const delta = typeof event.delta === 'string' ? event.delta : '';
		if (delta) {
			message.thinking = `${message.thinking || ''}${delta}`;
		} else if (typeof event.thinking === 'string') {
			message.thinking = event.thinking;
		}
		if (event.model) {
			message.model = event.model;
		}
		message.timestamp = new Date().toISOString();
		messages.value = [...messages.value];
		scrollToBottom();
		return;
	}

	if (type && type !== 'assistant_message' && !step) {
		upsertStreamStep(message, buildTimelineStepFromStreamEvent(event), false);
	}

	if (type === 'assistant_message' && event.message) {
		upsertStreamStep(message, buildAssistantMessageStreamStep(event), false);
		const content = typeof event.message === 'string'
			? event.message
			: String(event.message.content || event.message.text || '');
		if (content) {
			message.content = content;
		}
		if (event.message.model) {
			message.model = event.message.model;
		}
		message.timestamp = new Date().toISOString();
		messages.value = [...messages.value];
		return;
	}

	if (type === 'planning_completed' && planning) {
		message.openClaw = {
			...(message.openClaw || {}),
			selectedTool: planning.toolName || message.openClaw?.selectedTool || '',
			reason: planning.reason || message.openClaw?.reason || '',
			orchestration: {
				...(message.openClaw?.orchestration || {}),
				plan: {
					...(message.openClaw?.orchestration?.plan || {}),
					toolName: planning.toolName || '',
					reason: planning.reason || '',
					strategy: planning.strategy || '',
					confidence: planning.confidence || 0,
					dag: {
						nodes: Array.isArray(planning.nodes) ? planning.nodes : []
					}
				}
			}
		};
	}

	if (type === 'memory_loaded' && event.memoryContext) {
		message.memoryContext = {
			...(message.memoryContext || {}),
			shortTermSummary: event.memoryContext.shortTermSummary || '',
			userProfile: {
				...(message.memoryContext?.userProfile || {}),
				preferredTools: event.memoryContext.preferredTools || message.memoryContext?.userProfile?.preferredTools || []
			}
		};
	}

	if (type === 'memory_saved' && memory) {
		message.memoryContext = {
			...(message.memoryContext || {}),
			summary: memory.summary || message.memoryContext?.summary || '',
			shortTermSummary: memory.shortTermSummary || message.memoryContext?.shortTermSummary || ''
		};
		message.proactiveSuggestions = Array.isArray(memory.proactiveSuggestions) ? memory.proactiveSuggestions : [];
	}

	if (type === 'conversation_understood') {
		message.conversationUnderstanding = {
			...(message.conversationUnderstanding || {}),
			intent: event.intent || message.conversationUnderstanding?.intent || '',
			confidence: Number(event.confidence) || message.conversationUnderstanding?.confidence || 0,
			reason: event.message || event.reason || message.conversationUnderstanding?.reason || '',
			targetFiles: Array.isArray(event.targetFiles) ? event.targetFiles : (message.conversationUnderstanding?.targetFiles || []),
			state: {
				...(message.conversationUnderstanding?.state || {}),
				uploadedDocumentCount: Number(event.uploadedDocumentCount) || message.conversationUnderstanding?.state?.uploadedDocumentCount || 0
			}
		};
	}

	if (type === 'validation_completed' && validation) {
		message.openClaw = {
			...(message.openClaw || {}),
			orchestration: {
				...(message.openClaw?.orchestration || {}),
				validation: validation
			}
		};
	}

	if (type === 'execution_batch_started' && event.batch) {
		message.agentTrace = {
			...(message.agentTrace || {}),
			executionBatches: [
				...(Array.isArray(message.agentTrace?.executionBatches) ? message.agentTrace.executionBatches : []),
				event.batch
			]
		};
	}

	if (type === 'repair_trace' && repair) {
		message.agentTrace = {
			...(message.agentTrace || {}),
			repairTrace: [
				...(Array.isArray(message.agentTrace?.repairTrace) ? message.agentTrace.repairTrace : []),
				repair
			]
		};
	}

	if (step) {
		const normalizedStep = normalizeStreamExecutionStep(event, step);
		if (type === 'execution_step_started') {
			upsertStreamStep(message, normalizedStep, false);
		} else if (['execution_step_completed', 'execution_step_failed', 'execution_step_blocked'].includes(type)) {
			upsertStreamStep(message, normalizedStep, false);
			if (Array.isArray(event.repairs) && event.repairs.length > 0) {
				message.agentTrace = {
					...(message.agentTrace || {}),
					repairTrace: [
						...(Array.isArray(message.agentTrace?.repairTrace) ? message.agentTrace.repairTrace : []),
						...event.repairs
					]
				};
			}
		}
	}

	message.timestamp = new Date().toISOString();
	messages.value = [...messages.value];
}

function buildTimelineStepFromStreamEvent(event = {}) {
	const type = String(event.type || event.stage || 'status').trim() || 'status';
	const attempt = Number(event.attempt) || 0;
	const id = attempt > 0 ? `${type}-${attempt}` : type;
	return {
		id,
		type: event.type || event.stage || 'status',
		title: getStreamEventTitle(event) || event.title || formatStreamEventType(type),
		status: mapStreamEventStatus(type),
		detail: event.message || event.detail || event.reason || '',
		toolName: event.plan?.toolName || event.toolName || ''
	};
}

function normalizeStreamExecutionStep(event = {}, rawStep = {}) {
	const eventType = String(event.type || event.stage || '').trim();
	const id = rawStep.id || event.id || eventType || createMessageId();
	const status = rawStep.status || inferStreamStepStatus(eventType);
	const title = rawStep.title || event.title || getOpenClawStepTitle(id, rawStep.type || eventType);
	return {
		...rawStep,
		id,
		type: rawStep.type || eventType || 'execution_step',
		title,
		status,
		detail: rawStep.detail || rawStep.message || event.message || event.detail || '',
		toolName: rawStep.toolName || event.toolName || getOpenClawToolName(id, rawStep.type || eventType),
		sourceEventType: eventType
	};
}

function buildAssistantMessageStreamStep(event = {}) {
	const content = typeof event.message === 'string'
		? event.message
		: String(event.message?.content || event.message?.text || '');
	return {
		id: 'openclaw-answer-stream',
		type: 'assistant_message',
		title: '接收 OpenClaw 回复',
		status: 'running',
		detail: content ? 'OpenClaw 正在返回回答内容。' : '',
		toolName: 'assistant.message',
		sourceEventType: 'assistant_message'
	};
}

function inferStreamStepStatus(type = '') {
	const normalized = String(type || '').toLowerCase();
	if (normalized.includes('failed') || normalized.includes('error')) return 'failed';
	if (normalized.includes('blocked')) return 'blocked';
	if (normalized.includes('started') || normalized.includes('running')) return 'running';
	if (normalized.includes('completed') || normalized.includes('done')) return 'completed';
	return mapStreamEventStatus(type);
}

function getOpenClawStepTitle(id = '', type = '') {
	const key = String(id || type || '').toLowerCase();
	if (key.includes('openclaw-connect')) return '连接 OpenClaw Gateway';
	if (key.includes('sessions-create')) return '创建 OpenClaw 会话';
	if (key.includes('sessions-subscribe')) return '订阅 OpenClaw 消息流';
	if (key.includes('sessions-send')) return '发送问题给 OpenClaw';
	if (key.includes('openclaw-answer-stream') || key.includes('assistant_message')) return '接收 OpenClaw 回复';
	return formatStreamEventType(id || type || 'execution_step');
}

function getOpenClawToolName(id = '', type = '') {
	const key = String(id || type || '').toLowerCase();
	if (key.includes('openclaw-connect')) return 'gateway.connect';
	if (key.includes('sessions-create')) return 'sessions.create';
	if (key.includes('sessions-subscribe')) return 'sessions.messages.subscribe';
	if (key.includes('sessions-send')) return 'sessions.send';
	if (key.includes('openclaw-answer-stream') || key.includes('assistant_message')) return 'assistant.message';
	return '';
}

function upsertStreamStep(message, step = {}, finalize = false) {
	const current = Array.isArray(message.pendingFlow) ? [...message.pendingFlow] : [];
	const id = step.id || createMessageId();
	const index = current.findIndex((item) => item.id === id);
	const nextStep = {
		...(index >= 0 ? current[index] : {}),
		...step,
		id
	};
	if (index >= 0) {
		current.splice(index, 1, nextStep);
	} else {
		current.push(nextStep);
	}
	if (finalize) {
		for (let itemIndex = 0; itemIndex < current.length; itemIndex += 1) {
			if (current[itemIndex].id !== id && current[itemIndex].status === 'running') {
				current[itemIndex] = {
					...current[itemIndex],
					status: 'completed'
				};
			}
		}
	}
	message.pendingFlow = current;
	message.agentTrace = {
		...(message.agentTrace || {}),
		executionSteps: current
	};
}

function getStreamEventTitle(event = {}) {
	const labels = {
		accepted: '接收问题',
		ai_route_judging: '判断是否需要 OpenClaw',
		ai_route_decided: '完成能力判断',
		file_followup_route: '判断问题归属',
		file_followup_routed: '完成问题归属判断',
		conversation_understood: '理解对话对象',
		query_routed: 'Route query',
		ordinary_chat: 'Use ordinary chat model',
		fast_knowledge_check: 'Check local knowledge',
		fast_knowledge_answered: 'Fast knowledge answered',
		fast_knowledge_miss: 'Fast knowledge missed',
		knowledge_context_answer: 'Use knowledge context',
		uploaded_file_context_answer: '使用上传文件上下文',
		openclaw_connected: 'Connected to OpenClaw Gateway',
		openclaw_connection_error: 'OpenClaw connection error',
		openclaw_connection_closed: 'OpenClaw connection closed',
		openclaw_reconnecting: event.message || 'Reconnecting...',
		openclaw_session_ready: 'OpenClaw session ready',
		memory_started: '加载记忆',
		memory_loaded: '完成记忆加载',
		planning_started: '开始规划',
		planning_completed: '完成规划',
		execution_started: '准备执行',
		validation_completed: '完成校验',
		memory_saved: '写入记忆'
	};
	return labels[event.type] || '';
}

function formatStreamEventType(type = '') {
	return String(type || 'status')
		.split(/[_-]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function mapStreamEventStatus(type = '') {
	const statusMap = {
		accepted: 'completed',
		ai_route_judging: 'running',
		ai_route_decided: 'completed',
		file_followup_route: 'running',
		file_followup_routed: 'completed',
		context_compression_started: 'running',
		conversation_understood: 'completed',
		query_routed: 'completed',
		ordinary_chat: 'running',
		fast_knowledge_check: 'running',
		fast_knowledge_answered: 'completed',
		fast_knowledge_miss: 'completed',
		knowledge_context_answer: 'running',
		uploaded_file_context_answer: 'running',
		openclaw_connected: 'completed',
		openclaw_connection_error: 'failed',
		openclaw_connection_closed: 'warning',
		openclaw_reconnecting: 'running',
		openclaw_session_ready: 'completed',
		memory_started: 'running',
		memory_loaded: 'completed',
		planning_started: 'running',
		planning_completed: 'completed',
		execution_started: 'running',
		validation_completed: 'completed',
		memory_saved: 'completed'
	};
	return statusMap[type] || 'completed';
}

function createMessageId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeThinkingText(value) {
	return typeof value === 'string' ? value : '';
}

function ensureAssistantMessageHasVisibleResult(message) {
	if (!message) return;
	const hasContent = Boolean(String(message.content || '').trim());
	const hasThinking = Boolean(String(message.thinking || '').trim());
	const hasToolCalls = Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
	const hasCitations = Array.isArray(message.citations) && message.citations.length > 0;
	if (hasContent || hasThinking || hasToolCalls || hasCitations) {
		return;
	}
	message.content = '本次请求已结束，但没有返回最终结果。请重试，或换一种问法。';
}

function isStreamingAssistant(message) {
	return message?.role === 'assistant' && isLoading.value && message.id === activeAssistantMessageId.value;
}

function hasThinkingText(message) {
	return Boolean(message?.thinking && message.thinking.trim());
}

function getThinkingLabel(message) {
	return hasThinkingText(message) ? '思考过程' : '思考中...';
}

function canToggleThinking(message) {
	return hasThinkingText(message) && !message?.isThinking;
}

function isThinkingCollapsed(message) {
	return Boolean(message?.thinkingCollapsed) && canToggleThinking(message);
}

function toggleThinking(message) {
	if (!canToggleThinking(message)) {
		return;
	}

	message.thinkingCollapsed = !message.thinkingCollapsed;
	messages.value = [...messages.value];
}

function showBubbleLoader(message) {
	return isStreamingAssistant(message) && !message.content && !hasThinkingText(message);
}

function hasCitations(message) {
	return Array.isArray(message?.citations) && message.citations.length > 0;
}

function normalizeExecutionTrace(trace = null, message = null) {
	if (trace && Array.isArray(trace.steps)) {
		return {
			...trace,
			steps: trace.steps.map((step, index) => ({
				...step,
				id: step?.id || `timeline-step-${index + 1}`
			}))
		};
	}

	const fallbackSteps = getProcessExecutionSteps(message);
	if (fallbackSteps.length === 0) {
		return null;
	}

	return {
		kind: 'codex-vertical-timeline',
		collapsedByDefault: true,
		startedAt: message?.startedAt || '',
		completedAt: message?.completedAt || '',
		durationMs: Number(message?.durationMs) || 0,
		status: 'completed',
		summary: '',
		steps: fallbackSteps
	};
}

function normalizeRelatedFiles(items = []) {
	if (!Array.isArray(items)) {
		return [];
	}

	return items
		.map((item, index) => ({
			...item,
			citationLabel: item?.citationLabel || `[${index + 1}]`,
			previewDocumentId: item?.previewDocumentId || item?.documentId || item?.id || ''
		}))
		.filter((item) => item.previewDocumentId || item.title || item.name || item.documentId);
}

function normalizeReferences(result = {}) {
	const references = Array.isArray(result?.references)
		? result.references
		: (Array.isArray(result?.citations) ? result.citations : []);
	return references.map((item, index) => ({
		...item,
		citationLabel: item?.citationLabel || `[${index + 1}]`,
		previewDocumentId: item?.previewDocumentId || item?.documentId || item?.id || ''
	}));
}

function hasGraphKnowledge(message) {
	return Boolean(
		message?.queryMode
		|| message?.graphSummary
		|| message?.indexJobId
		|| message?.entities?.length
		|| message?.relationships?.length
		|| message?.communities?.length
	);
}

function getGraphModeLabel(mode = '') {
	const labels = {
		auto: '自动',
		local: 'Local Search',
		global: 'Global Search',
		not_used: '未触发检索'
	};
	const normalized = String(mode || '').toLowerCase();
	const extraLabels = {
		conversation_upload_inventory: '对话上传清单',
		uploaded_file_analysis: '上传文件分析',
		uploaded_file_qa: '上传文件问答',
		uploaded_file_compare: '上传文件对比',
		knowledge_qa: '知识库问答'
	};
	return extraLabels[normalized] || labels[normalized] || mode;
}

function getConversationIntentLabel(intent = '') {
	const labels = {
		upload_inventory: '上传清单',
		uploaded_file_qa: '上传文件问答',
		uploaded_file_compare: '上传文件对比',
		knowledge_qa: '知识库问答',
		ordinary_chat: '普通对话'
	};
	return labels[String(intent || '').toLowerCase()] || intent;
}

function getGraphItemKey(item = {}, prefix = 'graph') {
	return `${prefix}-${item.id || item.name || item.title || JSON.stringify(item).slice(0, 80)}`;
}

function formatGraphRelationship(relationship = {}) {
	const source = relationship.source || relationship.sourceName || relationship.from || relationship.head || '';
	const target = relationship.target || relationship.targetName || relationship.to || relationship.tail || '';
	const type = relationship.type || relationship.label || relationship.name || '关联';
	if (source || target) {
		return `${source || '实体'} -[${type}]- ${target || '实体'}`;
	}
	return relationship.description || relationship.summary || type;
}

function hasToolCalls(message) {
	return Array.isArray(message?.toolCalls) && message.toolCalls.length > 0;
}

function hasExecutionFlow(message) {
	return Boolean(
		isStreamingAssistant(message)
		|| message?.openClaw
		|| message?.agentTrace
		|| message?.memoryContext
		|| message?.conversationUnderstanding
		|| (Array.isArray(message?.toolCalls) && message.toolCalls.length > 0)
		|| Array.isArray(message?.fileAnalysis?.files) && message.fileAnalysis.files.some((file) => file?.readerSkill || Array.isArray(file?.readerAttempts))
		|| (Array.isArray(message?.proactiveSuggestions) && message.proactiveSuggestions.length > 0)
		|| (Array.isArray(message?.pendingFlow) && message.pendingFlow.length > 0)
	);
}

function hasAssistantTimeline(message) {
	return getAssistantTimelineSteps(message).length > 0;
}

function getAssistantTimelineSteps(message) {
	const pendingFlow = Array.isArray(message?.pendingFlow) ? message.pendingFlow : [];
	if (pendingFlow.length > 0) {
		return pendingFlow;
	}
	const traceSteps = Array.isArray(message?.executionTrace?.steps) ? message.executionTrace.steps : [];
	if (traceSteps.length > 0) {
		return traceSteps;
	}
	return getProcessExecutionSteps(message);
}

function getCodexRunItems(message) {
	const steps = getAssistantTimelineSteps(message);
	const items = [];
	for (const [index, step] of steps.entries()) {
		const narrative = buildCodexNarrativeItem(step, index, message);
		if (narrative) items.push(narrative);
		const toolItem = buildCodexToolItem(step, index);
		if (toolItem) items.push(toolItem);
	}
	if (items.length === 0 && isStreamingAssistant(message)) {
		items.push(makeCodexTextItem('waiting', '我已经收到问题，正在等待后端返回下一步进展。'));
	}
	return items;
}

function makeCodexTextItem(id, text, extra = {}) {
	return {
		id,
		kind: 'text',
		parts: splitInlineCode(text),
		...extra
	};
}

function splitInlineCode(text = '') {
	const parts = [];
	const pattern = /`([^`]+)`/g;
	let lastIndex = 0;
	let match;
	while ((match = pattern.exec(String(text || ''))) !== null) {
		if (match.index > lastIndex) {
			parts.push({ text: text.slice(lastIndex, match.index), code: false });
		}
		parts.push({ text: match[1], code: true });
		lastIndex = match.index + match[0].length;
	}
	if (lastIndex < String(text || '').length) {
		parts.push({ text: String(text || '').slice(lastIndex), code: false });
	}
	return parts.length ? parts : [{ text: String(text || ''), code: false }];
}

function buildCodexNarrativeItem(step = {}, index = 0, message = {}) {
	const type = String(step.type || step.id || '').toLowerCase();
	const id = String(step.id || '').toLowerCase();
	const toolName = String(step.toolName || '').toLowerCase();
	const eventKey = `${id} ${type} ${toolName}`;
	const detail = String(step.detail || '').trim();
	const title = String(step.title || '').trim();
	const route = detail.split(':')[0] || '';
	const routeLabel = getGraphModeLabel(route);

	if (eventKey.includes('openclaw-connect')) {
		const text = step.status === 'failed'
			? '连接 OpenClaw Gateway 失败。'
			: (step.status === 'running' ? '我正在连接 OpenClaw Gateway。' : '我已经连接到 OpenClaw Gateway。');
		return makeCodexTextItem(step.id || `openclaw-connect-${index}`, text, {
			detail: detail && detail !== title ? detail : ''
		});
	}
	if (eventKey.includes('sessions-create')) {
		return makeCodexTextItem(step.id || `sessions-create-${index}`, step.status === 'running'
			? '我正在创建 OpenClaw 会话。'
			: 'OpenClaw 会话已经创建完成。', {
			detail: detail && detail !== title ? detail : ''
		});
	}
	if (eventKey.includes('sessions-subscribe')) {
		return makeCodexTextItem(step.id || `sessions-subscribe-${index}`, step.status === 'running'
			? '我正在订阅 OpenClaw 的消息流。'
			: '我已经订阅 OpenClaw 消息流，后续过程会继续显示在这里。', {
			detail: detail && detail !== title ? detail : ''
		});
	}
	if (eventKey.includes('sessions-send')) {
		return makeCodexTextItem(step.id || `sessions-send-${index}`, step.status === 'running'
			? '我正在把问题发送给 OpenClaw。'
			: '问题已经发送给 OpenClaw，正在等待它的处理过程和结果。', {
			detail: detail && detail !== title ? detail : ''
		});
	}
	if (eventKey.includes('openclaw-answer-stream') || eventKey.includes('assistant_message')) {
		return makeCodexTextItem(step.id || `assistant-message-${index}`, step.status === 'completed'
			? 'OpenClaw 已经返回回答内容。'
			: 'OpenClaw 正在返回回答内容。');
	}

	if (type.includes('query_routed')) {
		return makeCodexTextItem(step.id || `route-${index}`, `我先判断这次问题该怎么处理：路由到 \`${route || message.queryMode || 'auto'}\`。`);
	}
	if (type.includes('conversation_understood')) {
		const understanding = message?.conversationUnderstanding || {};
		const intent = getConversationIntentLabel(understanding.intent || route || '');
		const targetCount = Array.isArray(understanding.targetFiles) ? understanding.targetFiles.length : 0;
		const suffix = targetCount > 0 ? `，目标文件 ${targetCount} 个` : '';
		return makeCodexTextItem(step.id || `conversation-understood-${index}`, `已完成对话对象识别：${intent || '自动识别'}${suffix}。`);
	}
	if (type.includes('uploaded_file_context_answer')) {
		return makeCodexTextItem(step.id || `uploaded-file-context-${index}`, '已定位到会话中的上传文件，正在依据对应文件内容生成回答。');
	}
	if (type.includes('ordinary_chat')) {
		return makeCodexTextItem(step.id || `ordinary-${index}`, '这个问题不需要查知识库，我改用普通对话模型直接处理。');
	}
	if (type.includes('fast_knowledge_check')) {
		return makeCodexTextItem(step.id || `fast-check-${index}`, '我先查本地知识库，看看能不能用已有证据快速回答。');
	}
	if (type.includes('fast_knowledge_answered')) {
		return makeCodexTextItem(step.id || `fast-answer-${index}`, '本地知识库已经命中明确证据，我会基于这些来源回答。');
	}
	if (type.includes('fast_knowledge_miss')) {
		return makeCodexTextItem(step.id || `fast-miss-${index}`, '本地快答没有足够证据，我把问题转给 OpenClaw 做深度处理。');
	}
	if (type.includes('knowledge_context_answer')) {
		return makeCodexTextItem(step.id || `context-${index}`, '我找到了相关片段，正在让模型结合知识库上下文生成答案。');
	}
	if (type.includes('openclaw_reconnecting')) {
		return makeCodexTextItem(step.id || `reconnect-${index}`, detail || 'Reconnecting...');
	}
	if (type.includes('openclaw_connected')) {
		return makeCodexTextItem(step.id || `connected-${index}`, '已经连接到 OpenClaw Gateway。');
	}
	if (type.includes('openclaw_session_ready')) {
		return makeCodexTextItem(step.id || `session-ready-${index}`, 'OpenClaw 会话已经准备好，我开始等待它返回过程和结果。');
	}
	if (type.includes('openclaw_waiting')) {
		return makeCodexTextItem(step.id || `waiting-${index}`, 'OpenClaw 正在运行，我会继续接收后续消息。');
	}
	if (type.includes('connection') || type.includes('session') || type.includes('message')) {
		if (!title && !detail) return null;
	}
	if (title || detail) {
		return makeCodexTextItem(step.id || `step-${index}`, detail || title, {
			detail: title && detail && title !== detail ? title : ''
		});
	}
	return null;
}

function buildCodexToolItem(step = {}, index = 0) {
	const toolName = String(step.toolName || '').trim();
	if (!toolName) return null;
	const label = String(step.status || '').toLowerCase() === 'running' ? '正在运行' : '已运行';
	const command = compactToolCommand(step);
	return {
		id: `tool-${step.id || index}`,
		kind: 'tool',
		label,
		command
	};
}

function compactToolCommand(step = {}) {
	const toolName = String(step.toolName || '').trim();
	const detail = String(step.detail || '').replace(/\s+/g, ' ').trim();
	if (!detail) return toolName;
	const clipped = detail.length > 88 ? `${detail.slice(0, 88)}...` : detail;
	return `${toolName} ${clipped}`.trim();
}

function isAssistantTimelineCollapsed(message) {
	if (!hasAssistantTimeline(message)) {
		return true;
	}
	return Boolean(message?.timelineCollapsed);
}

function toggleAssistantTimeline(message) {
	if (!hasAssistantTimeline(message)) {
		return;
	}
	message.timelineCollapsed = !message.timelineCollapsed;
	messages.value = [...messages.value];
}

function getAssistantRunLabel(message) {
	const duration = getAssistantElapsedDuration(message);
	if (isStreamingAssistant(message)) {
		return `处理中 ${formatDuration(duration)}`;
	}
	if (duration > 0) {
		return `已处理 ${formatDuration(duration)}`;
	}
	const summary = String(message?.executionTrace?.summary || '').trim();
	if (summary) {
		return summary;
	}
	return '已完成处理';
}

function getAssistantDurationLabel(message) {
	if (isStreamingAssistant(message)) {
		return '进行中';
	}
	return '';
}

function getAssistantElapsedDuration(message) {
	if (!message) return 0;
	if (isStreamingAssistant(message) && message.requestStartedAtMs) {
		return Math.max(Number(message.durationMs) || 0, Date.now() - Number(message.requestStartedAtMs));
	}
	return Number(message?.durationMs) || Number(message?.executionTrace?.durationMs) || 0;
}

function formatDuration(durationMs = 0) {
	const totalSeconds = Math.max(0, Math.round(Number(durationMs) / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	}
	return `${Math.max(1, seconds)}s`;
}

function formatTimelineStepTitle(step = {}, index = 0) {
	return step?.title || step?.toolName || `步骤 ${index + 1}`;
}

function formatTimelineStepDetail(step = {}) {
	return step?.detail || step?.reason || step?.error || '';
}

function shouldShowTimelineStatus(step = {}) {
	const status = String(step?.status || '').toLowerCase();
	return Boolean(status && !['completed', 'complete', 'success', 'done'].includes(status));
}

function getTimelineStepMeta(step = {}) {
	const meta = [];
	if (step?.toolName) meta.push(`工具：${formatToolName(step.toolName)}`);
	if (Number.isFinite(Number(step?.durationMs)) && Number(step.durationMs) > 0) meta.push(`耗时：${formatDuration(step.durationMs)}`);
	if (Number.isFinite(Number(step?.citationCount)) && Number(step.citationCount) > 0) meta.push(`引用：${step.citationCount}`);
	if (step?.fileName) meta.push(`文件：${step.fileName}`);
	return meta;
}

function hasRelatedFiles(message) {
	return getRelatedFiles(message).length > 0;
}

function getRelatedFiles(message) {
	if (Array.isArray(message?.relatedFiles) && message.relatedFiles.length > 0) {
		return message.relatedFiles;
	}
	if (Array.isArray(message?.citations) && message.citations.length > 0) {
		return message.citations;
	}
	return [];
}

function getRelatedFileTitle(file = {}, index = 0) {
	return file.title || file.name || file.fileName || `关联文件 ${index + 1}`;
}

function getRelatedFileMeta(file = {}) {
	const parts = [];
	if (file.sourceOrg) parts.push(file.sourceOrg);
	if (file.publishDate) parts.push(file.publishDate);
	if (file.locator) parts.push(file.locator);
	return parts.join(' · ');
}

function canToggleProcessPanel(message) {
	return hasExecutionFlow(message);
}

function toggleProcessPanel(message) {
	if (!canToggleProcessPanel(message)) {
		return;
	}

	message.processCollapsed = !message.processCollapsed;
	messages.value = [...messages.value];
}

function getExecutionFlowHeadline(message) {
	if (isStreamingAssistant(message)) {
		return '已接收问题，正在规划与执行智能体流程';
	}

	const executionSteps = getProcessExecutionSteps(message);
	if (executionSteps.some((step) => step.status === 'failed' || step.status === 'blocked')) {
		return '本轮回答已返回，并保留失败与阻塞步骤供排查';
	}
	if (getProcessRepairTrace(message).length > 0 || executionSteps.some((step) => step.status === 'recovered')) {
		return '本轮回答已完成，过程中触发过自动修复与重规划';
	}

	const selectedTool = message?.openClaw?.selectedTool;
	if (selectedTool) {
		return `已通过 ${formatToolName(selectedTool)} 完成本轮处理`;
	}
	if (message?.conversationUnderstanding?.intent) {
		return `已识别会话对象：${getConversationIntentLabel(message.conversationUnderstanding.intent)}`;
	}
	if (Array.isArray(message?.toolCalls) && message.toolCalls.length > 0) {
		return `本轮已执行 ${message.toolCalls.length} 个工具/技能步骤`;
	}

	return '本轮执行轨迹已记录';
}

function getProcessOverviewChips(message) {
	const chips = [];
	const selectedTool = message?.openClaw?.selectedTool;
	const strategy = message?.openClaw?.orchestration?.plan?.strategy;
	const confidence = Number(message?.openClaw?.orchestration?.plan?.confidence);
	const memoryCount = Number(message?.memoryContext?.userProfile?.memoryCount);
	const understanding = message?.conversationUnderstanding || null;
	const understandingConfidence = Number(understanding?.confidence);
	const targetFileCount = Array.isArray(understanding?.targetFiles) ? understanding.targetFiles.length : 0;
	const uploadedDocumentCount = Number(understanding?.state?.uploadedDocumentCount);

	if (selectedTool) chips.push(`工具：${formatToolName(selectedTool)}`);
	if (message?.queryMode) chips.push(`检索：${getGraphModeLabel(message.queryMode)}`);
	if (strategy) chips.push(`策略：${strategy}`);
	if (Number.isFinite(confidence) && confidence > 0) chips.push(`置信度：${Math.round(confidence * 100)}%`);
	if (message?.indexJobId) chips.push(`索引任务：${message.indexJobId}`);
	if (Number.isFinite(memoryCount) && memoryCount > 0) chips.push(`历史记忆：${memoryCount}`);
	if (Number.isFinite(Number(message?.fileAnalysis?.fileCount)) && Number(message.fileAnalysis.fileCount) > 0) chips.push(`文件：${message.fileAnalysis.fileCount}`);
	if (Array.isArray(message?.fileAnalysis?.missingPolicyFiles) && message.fileAnalysis.missingPolicyFiles.length > 0) chips.push(`待补采：${message.fileAnalysis.missingPolicyFiles.length}`);
	if (understanding?.intent) chips.unshift(`意图：${getConversationIntentLabel(understanding.intent)}`);
	if (Number.isFinite(understandingConfidence) && understandingConfidence > 0 && !(Number.isFinite(confidence) && confidence > 0)) chips.push(`置信度：${Math.round(understandingConfidence * 100)}%`);
	if (targetFileCount > 0) chips.push(`目标文件：${targetFileCount}`);
	if (Number.isFinite(uploadedDocumentCount) && uploadedDocumentCount > 0) chips.push(`会话上传：${uploadedDocumentCount}`);
	return chips;
}

function getProcessAgentStatuses(message) {
	const agents = message?.openClaw?.orchestration?.agents;
	return Array.isArray(agents) ? agents : [];
}

function getProcessPlanNodes(message) {
	const plan = message?.openClaw?.orchestration?.plan;
	if (Array.isArray(plan?.dag?.nodes) && plan.dag.nodes.length > 0) {
		return plan.dag.nodes;
	}
	if (Array.isArray(plan?.steps) && plan.steps.length > 0) {
		return plan.steps;
	}
	return [];
}

function getProcessExecutionBatches(message) {
	const batches = message?.agentTrace?.executionBatches;
	if (Array.isArray(batches) && batches.length > 0) {
		return batches;
	}
	const executionAgent = getProcessAgentStatuses(message).find((agent) => agent?.role === 'execution_agent');
	return Array.isArray(executionAgent?.executionBatches) ? executionAgent.executionBatches : [];
}

function getProcessExecutionSteps(message) {
	const merged = [];
	const seen = new Set();
	const append = (step) => {
		if (!step) return;
		const id = step.id || `${step.toolName || step.title || 'step'}-${merged.length}`;
		if (seen.has(id)) return;
		seen.add(id);
		merged.push({
			...step,
			id
		});
	};

	const executionSteps = Array.isArray(message?.agentTrace?.executionSteps) ? message.agentTrace.executionSteps : [];
	const pendingFlow = Array.isArray(message?.pendingFlow) ? message.pendingFlow : [];
	const toolCallSteps = buildToolCallProcessSteps(message);
	const fileReadSteps = buildFileReadProcessSteps(message);

	executionSteps.forEach(append);
	fileReadSteps.forEach(append);
	toolCallSteps.forEach(append);
	pendingFlow.forEach(append);

	return merged;
}

function getProcessRepairTrace(message) {
	const trace = message?.agentTrace?.repairTrace;
	return Array.isArray(trace) ? trace : [];
}

function hasProcessMemory(message) {
	return Boolean(
		getProcessMemorySummary(message)
		|| getProcessShortTermSummary(message)
		|| getProcessRelevantMemories(message).length
	);
}

function getProcessMemorySummary(message) {
	return message?.memoryContext?.summary || message?.agentTrace?.memorySummary || '';
}

function getProcessShortTermSummary(message) {
	return message?.memoryContext?.shortTermSummary || message?.agentTrace?.shortTermSummary || '';
}

function getProcessRelevantMemories(message) {
	const relevant = message?.memoryContext?.relevantMemories;
	return Array.isArray(relevant) ? relevant : [];
}

function getProcessSuggestions(message) {
	const suggestions = Array.isArray(message?.proactiveSuggestions) && message.proactiveSuggestions.length > 0
		? message.proactiveSuggestions
		: message?.agentTrace?.proactiveSuggestions;
	return Array.isArray(suggestions) ? suggestions : [];
}

function getProcessNodeTitle(node = {}, index = 0) {
	return node.title || node.id || `计划步骤 ${index + 1}`;
}

function inferPlanNodeStatus(message, node = {}) {
	const stepId = node.id;
	const matchedStep = getProcessExecutionSteps(message).find((step) => step?.id && step.id === stepId);
	if (matchedStep?.status) {
		return matchedStep.status;
	}
	if (isStreamingAssistant(message)) {
		return 'running';
	}
	return 'pending';
}

function getProcessStepTitle(step = {}, index = 0) {
	if (step.title) return step.title;
	if (step.toolName) return formatToolName(step.toolName);
	return `执行步骤 ${index + 1}`;
}

function getProcessStepDetail(step = {}) {
	return step.error || step.reason || step.detail || '';
}

function getProcessStepMeta(step = {}) {
	const meta = [];
	if (step.toolName) meta.push(`工具：${formatToolName(step.toolName)}`);
	if (step.fileName) meta.push(`文件：${step.fileName}`);
	if (step.dependsOn?.length) meta.push(`依赖：${step.dependsOn.join(' -> ')}`);
	if (Number.isFinite(Number(step.citationCount)) && Number(step.citationCount) > 0) meta.push(`引用：${step.citationCount}`);
	if (Number.isFinite(Number(step.attemptCount)) && Number(step.attemptCount) > 1) meta.push(`尝试：${step.attemptCount}次`);
	if (Number.isFinite(Number(step.qualityScore)) && Number(step.qualityScore) > 0) meta.push(`质量：${Math.round(Number(step.qualityScore) * 100)}%`);
	if (step.fallbackUsed) meta.push('已回退');
	if (step.repairStrategy) meta.push(`修复：${formatRepairStrategy(step.repairStrategy)}`);
	if (step.replannedToTool) meta.push(`改派：${formatToolName(step.replannedToTool)}`);
	return meta;
}

function formatExecutionBatch(batch = {}) {
	const stepCount = Array.isArray(batch?.stepIds) ? batch.stepIds.length : 0;
	const prefix = batch?.parallel ? '并行' : '串行';
	return `批次 ${batch.batch || '-'} · ${prefix} · ${stepCount} 步`;
}

function formatRepairTitle(repair = {}, index = 0) {
	return repair?.stepId ? `步骤 ${repair.stepId}` : `修复记录 ${index + 1}`;
}

function formatRepairDetail(repair = {}) {
	const strategy = formatRepairStrategy(repair?.strategy);
	const error = repair?.error ? `，错误：${repair.error}` : '';
	return `${strategy}${error}`;
}

function getRepairMeta(repair = {}) {
	const meta = [];
	if (repair?.fromTool) meta.push(`原工具：${formatToolName(repair.fromTool)}`);
	if (repair?.toTool) meta.push(`目标工具：${formatToolName(repair.toTool)}`);
	if (repair?.mode) meta.push(`模式：${repair.mode}`);
	if (Number.isFinite(Number(repair.citationCount)) && Number(repair.citationCount) > 0) meta.push(`引用：${repair.citationCount}`);
	return meta;
}

function formatRelevantMemory(memory = {}) {
	const summary = String(memory?.summary || memory?.question || '').trim();
	const tags = Array.isArray(memory?.tags) && memory.tags.length > 0 ? ` [${memory.tags.join(', ')}]` : '';
	return `${summary || '已命中历史记忆'}${tags}`;
}

function getSuggestionTitle(suggestion = {}, index = 0) {
	return suggestion?.title || suggestion?.action || `建议 ${index + 1}`;
}

function getSuggestionDetail(suggestion = {}) {
	return suggestion?.detail || suggestion?.reason || suggestion?.description || '';
}

function getProcessStatusLabel(status = '') {
	const labels = {
		completed: '已完成',
		recovered: '已恢复',
		running: '进行中',
		pending: '待执行',
		failed: '失败',
		blocked: '阻塞',
		warning: '需关注',
		passed: '已通过',
		stored: '已写入',
		queued: '排队中'
	};
	return labels[String(status || '').toLowerCase()] || (status || '已记录');
}

function getProcessStatusClass(status = '') {
	const normalized = String(status || '').toLowerCase();
	if (['completed', 'passed', 'stored'].includes(normalized)) return 'is-success';
	if (normalized === 'recovered') return 'is-recovered';
	if (normalized === 'running') return 'is-running';
	if (['failed', 'blocked'].includes(normalized)) return 'is-danger';
	if (['warning', 'queued', 'pending'].includes(normalized)) return 'is-warning';
	return 'is-muted';
}

function formatAgentRole(role = '') {
	const labels = {
		planning_agent: '规划 Agent',
		execution_agent: '执行 Agent',
		validation_agent: '校验 Agent',
		memory_agent: '记忆 Agent'
	};
	return labels[role] || role || 'Agent';
}

function buildPendingProcessFlow({ chatMode = 'chat', hasFiles = false, queryMode = 'auto', requiresPublicCollect = false } = {}) {
	const executionTitle = getPendingExecutionTitle({ chatMode, hasFiles, requiresPublicCollect });
	const executionDetail = getPendingExecutionDetail({ chatMode, hasFiles, queryMode, requiresPublicCollect });

	return [
		{
			id: 'accepted',
			title: '接收问题',
			status: 'completed',
			detail: '已接收当前提问，并整理最近对话上下文。'
		},
		{
			id: 'planning',
			title: '规划 Agent',
			status: 'running',
			detail: '正在选择本轮最合适的智能体工具、检索模式与执行路径。'
		},
		{
			id: 'execution',
			title: executionTitle,
			status: 'pending',
			detail: executionDetail
		},
		{
			id: 'validation',
			title: '校验 Agent',
			status: 'pending',
			detail: '执行完成后会检查是否有证据支撑，并在必要时自动重试或重规划。'
		},
		{
			id: 'memory',
			title: '记忆 Agent',
			status: 'pending',
			detail: '最终会总结本轮上下文，沉淀短期记忆并给出下一步建议。'
		}
	];
}

function getPendingExecutionTitle({ chatMode = 'chat', hasFiles = false, requiresPublicCollect = false } = {}) {
	if (requiresPublicCollect) return '公开资料补采';
	if (chatMode === 'compare') return '依据比对';
	if (chatMode === 'replicate') return '文档复刻';
	if (chatMode === 'archive') return '材料归档';
	if (hasFiles) return '文件解析';
	return 'GraphRAG 检索与工具执行';
}

function getPendingExecutionDetail({ chatMode = 'chat', hasFiles = false, queryMode = 'auto', requiresPublicCollect = false } = {}) {
	if (requiresPublicCollect) {
		return '准备调用公开资料补采流程，并在需要时加入图谱索引队列。';
	}
	if (chatMode === 'compare') {
		return '准备检索知识库依据，并对命中材料执行合规比对。';
	}
	if (chatMode === 'replicate') {
		return '准备根据当前输入生成复刻目录、文件草案与交付结构。';
	}
	if (chatMode === 'archive') {
		return '准备整理项目材料分类，并生成归档结果。';
	}
	if (hasFiles) {
		return '准备解析上传文件，提取 Markdown、元数据与图谱线索。';
	}
	return `准备执行 ${getGraphModeLabel(queryMode)} / 自动路由检索，并结合工具结果生成答案。`;
}

function formatRepairStrategy(strategy = '') {
	const labels = {
		retry_same_tool: '重试当前工具',
		retry_global_search: '切换到 Global Search 重试',
		replan_to_public_collect: '重规划到公开资料补采',
		compare_replan_to_public_collect: '比对失败后转公开资料补采',
		fallback_direct_chat: '回退到直接对话',
		fallback_direct_chat_failed: '回退直接对话失败',
		tool_execution_failed: '工具执行失败',
		empty_answer: '答案为空',
		transient_tool_failure: '瞬时故障恢复'
	};
	return labels[strategy] || strategy || '自动修复';
}

function hasPublicCollection(message) {
	return Boolean(message?.publicCollection?.status);
}

function hasPolicyInventory(message) {
	return Array.isArray(message?.fileAnalysis?.policyFiles) && message.fileAnalysis.policyFiles.length > 0;
}

function hasFileReadSummary(message) {
	return getFileReadSummaryItems(message).length > 0;
}

function getFileReadSummaryItems(message) {
	const files = Array.isArray(message?.fileAnalysis?.files) ? message.fileAnalysis.files : [];
	return files.filter((file) => file?.readerSkill || file?.parserStrategy || Number.isFinite(Number(file?.textQualityScore)));
}

function formatFileReadSummary(file = {}) {
	const parts = [];
	if (file.readerSkill) parts.push(`技能：${formatToolName(file.readerSkill)}`);
	if (file.parserStrategy) parts.push(`策略：${file.parserStrategy}`);
	if (file.businessTypeLabel || file.businessType) parts.push(`类型：${file.businessTypeLabel || file.businessType}`);
	if (Number.isFinite(Number(file.textQualityScore)) && Number(file.textQualityScore) > 0) parts.push(`质量：${Math.round(Number(file.textQualityScore) * 100)}%`);
	if (file.readerFallbackUsed) parts.push('已回退');
	return parts.join(' · ') || '已完成读取';
}

function hasMessageFiles(message) {
	return Array.isArray(message?.files) && message.files.length > 0;
}

function shouldShowCompareResult(result = {}) {
	return ['matchedItems', 'missingItems', 'risks', 'suggestions'].some((key) => Array.isArray(result?.[key]));
}

function shouldConfirmPolicyCollection(text = '') {
	if (!pendingPolicyCollection.value?.missingPolicyFiles?.length) {
		return false;
	}

	return /^(同意|可以|确认|开始|去爬取|爬取|补采|开始补采|继续补采|是的|好)$/i.test(String(text || '').trim());
}

function extractRequestedPolicyCollectionFiles(text = '') {
	const value = String(text || '').trim();
	if (!/(补采|爬取|采集|收集|抓取|下载|导入|入库|同步)/.test(value)) {
		return [];
	}

	const candidates = [];
	for (const match of value.matchAll(/[《<](.*?)[》>]/g)) {
		candidates.push(match[1]);
	}

	const actionMatch = value.match(/(?:请|帮我|麻烦)?(?:自动)?(?:去)?(?:补采|爬取|采集|收集|抓取|下载|导入|入库|同步)(?:一下|下)?(.+)/);
	if (actionMatch?.[1]) {
		const tail = actionMatch[1]
			.replace(/^(这些|以下|这个|该|相关|缺失的|没有的)/, '')
			.replace(/(到知识库|进知识库|入库|并解析|然后解析|自动解析|审核|审核入库|这个文件|这些文件|文件|资料|政策|政策文件|公开文件|公开资料)[。.!！?？]*$/g, '')
			.trim();
		for (const item of tail.split(/[、,，;；\n\r]+|(?:和|以及|还有)/)) {
			candidates.push(item);
		}
	}

	const seen = new Set();
	return candidates
		.map(cleanRequestedPolicyFileName)
		.filter((item) => {
			if (!item || seen.has(item)) return false;
			seen.add(item);
			return true;
		})
		.slice(0, 20);
}

function cleanRequestedPolicyFileName(value = '') {
	const text = String(value || '')
		.replace(/[《》“”‘’"'`]/g, '')
		.replace(/\s+/g, ' ')
		.replace(/^[：:，,、;；\s]+|[：:，,、;；。\s]+$/g, '')
		.trim();
	if (text.length < 3 || text.length > 140) return '';
	if (!/[\u4e00-\u9fff]/.test(text)) return '';
	if (/^(一下|下|这些|以下|这个|文件|资料|政策文件|公开资料)$/.test(text)) return '';
	return text;
}

async function shouldContinueLastFileAnalysis(text = '', filesForRequest = [], assistantMessage = null, signal = null) {
	const lastRequest = getLastFileAnalysisRequestForActiveChat();
	if (filesForRequest.length > 0 || (!lastRequest?.files?.length && !lastRequest?.documentIds?.length)) {
		return false;
	}

	const normalized = String(text || '').trim();
	if (!normalized) {
		return false;
	}

	if (assistantMessage) {
		applyKnowledgeStreamEvent(assistantMessage, {
			id: 'file-followup-route',
			type: 'file_followup_route',
			title: '判断问题归属',
			message: '正在判断这个问题是否需要继续读取最近上传的文件。'
		});
	}

	try {
		await showContextCompressionNoticeIfNeeded(assistantMessage, signal);
		const conversationContext = buildConversationContext(8);
		const decision = await routeKnowledgeFileFollowup({
			question: normalized,
			lastInstruction: lastRequest.instruction || '',
			fileNames: (lastRequest.files || []).map((file) => file?.name || '').filter(Boolean),
			messages: conversationContext
		}, { signal });
		const shouldUseFileAnalysis = decision?.route === 'file_analysis' || decision?.shouldUseFileAnalysis === true;
		if (assistantMessage) {
			applyKnowledgeStreamEvent(assistantMessage, {
				id: 'file-followup-route',
				type: 'file_followup_routed',
				title: '完成问题归属判断',
				message: shouldUseFileAnalysis
					? `判断为上传文件追问：${decision?.reason || '需要继续读取最近上传的文件。'}`
					: `判断为普通对话：${decision?.reason || '不依赖最近上传的文件。'}`
			});
		}
		return shouldUseFileAnalysis;
	} catch (error) {
		if (signal?.aborted || error?.name === 'AbortError') {
			throw error;
		}
		if (assistantMessage) {
			applyKnowledgeStreamEvent(assistantMessage, {
				id: 'file-followup-route',
				type: 'file_followup_routed',
				title: '完成问题归属判断',
				message: 'AI 路由暂时不可用，已使用本地兜底判断。'
			});
		}
		return shouldContinueLastFileAnalysisByRule(normalized);
	}
}

function shouldContinueLastFileAnalysisByRule(text = '') {
	const normalized = String(text || '').trim();
	const explicitContinuation = /(继续|接着|重新|再)(分析|回答|看|判断)|基于最新知识库|审核.*(完成|通过|好了)|补采.*(完成|好了)/.test(normalized);
	const uploadedFileReference = /(这个|这份|该|上述|上面|刚才|刚刚|我上传的|上传的).{0,12}(文件|文档|报告|材料|附件|资料|表格)|文件(里|里面|中|内容|正文)|报告(里|里面|中|内容|正文)|附件(里|里面|中|内容)|这(里面|其中)/.test(normalized);
	const fileQuestionIntent = /(是什么|是谁|哪个|哪家|哪个公司|哪家公司|多少|几|什么时候|为什么|怎么|如何|是否|有没有|依据|来源|章节|条款|内容|结论|方法|单位|金额|日期|项目|总结|概括|提取|列出|找出|分析|判断|评价|风险|问题)/.test(normalized);
	const domainFollowUp = /(受托|委托|估价|评估|报告|正文|章节|条款|依据|结论|摘要|方法|单位|公司|机构|金额|日期|项目|地块|面积|用途|权利人|坐落|政策|规范|条例)/.test(normalized)
		&& /(是什么|是谁|哪个|哪家|哪个公司|哪家公司|多少|几|什么时候|为什么|怎么|如何|是否|有没有|列出|找出|提取|总结|概括|分析|判断|评价|吗|？|\?)/.test(normalized);

	return explicitContinuation || (uploadedFileReference && fileQuestionIntent) || domainFollowUp;
}

function updatePendingPolicyCollection(publicCollection = null) {
	if (publicCollection?.status === 'awaiting_user_consent' && Array.isArray(publicCollection.missingPolicyFiles) && publicCollection.missingPolicyFiles.length > 0) {
		pendingPolicyCollection.value = {
			query: publicCollection.query || '',
			missingPolicyFiles: publicCollection.missingPolicyFiles
		};
		return;
	}

	if (publicCollection?.status && publicCollection.status !== 'awaiting_user_consent') {
		pendingPolicyCollection.value = null;
	}
}

function canCollectMissingPolicies(publicCollection = {}) {
	return publicCollection?.status === 'awaiting_user_consent'
		&& Array.isArray(publicCollection.missingPolicyFiles)
		&& publicCollection.missingPolicyFiles.length > 0;
}

function confirmPolicyCollectionFromBubble(publicCollection = {}) {
	if (isLoading.value || !canCollectMissingPolicies(publicCollection)) {
		return;
	}

	pendingPolicyCollection.value = {
		query: publicCollection.query || '',
		missingPolicyFiles: publicCollection.missingPolicyFiles
	};
	draft.value = '开始补采';
	sendDraft();
}

function formatToolName(name = '') {
	const labels = {
		direct_chat: '直接对话',
		knowledge_search: '知识库检索',
		policy_compare: '依据比对',
		document_replicate: '文档复刻',
		material_archive: '资料归档',
		file_analyze: '文件分析',
		public_collect: '公开资料补采',
		file_reader_skill_router: '文件读取路由',
		office_document_reader_skill: 'Office 读取技能',
		pdf_document_reader_skill: 'PDF 读取技能',
		text_document_reader_skill: '文本读取技能',
		image_ocr_reader_skill: 'OCR 读取技能',
		archive_reader_skill: '压缩包读取技能',
		generic_binary_reader_skill: '通用读取技能',
		structured_extract: '结构化提取'
	};
	return labels[name] || name || '工具';
}

function formatToolCall(toolCall = {}) {
	const label = formatToolName(toolCall.name);
	const count = Number(toolCall.citationCount);
	const attempts = Number(toolCall.attempts);
	const quality = Number(toolCall.qualityScore);
	const suffix = [];
	if (Number.isFinite(count) && count > 0) suffix.push(`${count} 条依据`);
	if (Number.isFinite(attempts) && attempts > 1) suffix.push(`尝试 ${attempts} 次`);
	if (Number.isFinite(quality) && quality > 0) suffix.push(`质量 ${Math.round(quality * 100)}%`);
	if (toolCall.fallbackUsed) suffix.push('已回退');
	return suffix.length > 0 ? `${label} · ${suffix.join(' · ')}` : label;
}

function buildToolCallProcessSteps(message) {
	const toolCalls = Array.isArray(message?.toolCalls) ? message.toolCalls : [];
	return toolCalls.map((toolCall, index) => ({
		id: `tool-call-${toolCall.name || index}`,
		title: formatToolName(toolCall.name),
		toolName: toolCall.name || '',
		status: normalizeToolCallStatus(toolCall.status),
		detail: toolCall.reason || '',
		citationCount: toolCall.citationCount,
		attemptCount: toolCall.attempts,
		qualityScore: toolCall.qualityScore,
		fallbackUsed: toolCall.fallbackUsed === true,
		fileName: toolCall.fileName || ''
	}));
}

function buildFileReadProcessSteps(message) {
	const files = getFileReadSummaryItems(message);
	const steps = [];
	files.forEach((file, fileIndex) => {
		if (Array.isArray(file.readerAttempts) && file.readerAttempts.length > 0) {
			file.readerAttempts.forEach((attempt, attemptIndex) => {
				steps.push({
					id: `file-reader-${fileIndex}-${attempt.skillName || attemptIndex}`,
					title: `${file.originalName || `文件 ${fileIndex + 1}`} · ${formatToolName(attempt.skillName)}`,
					toolName: attempt.skillName || '',
					status: normalizeToolCallStatus(attempt.status || (attempt.acceptable ? 'completed' : 'warning')),
					detail: attempt.note || attempt.error || (attempt.acceptable ? '已完成文本读取' : '本次读取质量不足，继续尝试后备技能'),
					attemptCount: attemptIndex + 1,
					qualityScore: attempt.qualityScore,
					fileName: file.originalName || ''
				});
			});
			return;
		}

		steps.push({
			id: `file-reader-${fileIndex}`,
			title: `${file.originalName || `文件 ${fileIndex + 1}`} · ${formatToolName(file.readerSkill)}`,
			toolName: file.readerSkill || '',
			status: file.textLooksGarbled ? 'warning' : 'completed',
			detail: formatFileReadSummary(file),
			qualityScore: file.textQualityScore,
			fileName: file.originalName || ''
		});
	});
	return steps;
}

function normalizeToolCallStatus(status = '') {
	const value = String(status || '').toLowerCase();
	if (['completed', 'success', 'done'].includes(value)) return 'completed';
	if (['failed', 'error'].includes(value)) return 'failed';
	if (['pending'].includes(value)) return 'pending';
	if (['running', 'processing'].includes(value)) return 'running';
	if (['warning', 'skipped'].includes(value)) return 'warning';
	return value || 'completed';
}

function getPublicCollectionTitle(publicCollection = {}) {
	const titles = {
		not_required: '正式库已命中',
		awaiting_user_consent: '等待确认补采',
		auto_approved: 'AI自动审核入库',
		pending_review: '公开资料待审核',
		required: '需要公开补采',
		skipped: '公开补采未形成候选',
		failed: '公开补采失败'
	};
	return titles[publicCollection.status] || '公开资料补采';
}

function getPublicCollectionStatusText(publicCollection = {}) {
	const texts = {
		not_required: 'GraphRAG / Neo4j 知识图谱已找到相关依据，本次无需补采。',
		awaiting_user_consent: '文件中有政策资料未在知识库命中，等待你确认后再公开补采。',
		auto_approved: '公开政策资料已由 AI 自动审核入库，并已加入图谱索引队列。',
		pending_review: '已自动补采公开资料，等待管理员审核后加入 GraphRAG 构建队列。',
		required: '正式知识库没有直接依据，需要启动公开资料补采。',
		skipped: '已尝试公开资料补采，但暂未形成新的候选资料。',
		failed: '公开资料补采未完成，请检查公开源配置或网络状态。'
	};
	return texts[publicCollection.status] || '公开资料补采状态已更新。';
}

function normalizeCompareResult(result = {}) {
	return {
		matchedItems: Array.isArray(result?.matchedItems) ? result.matchedItems : [],
		missingItems: Array.isArray(result?.missingItems) ? result.missingItems : [],
		risks: Array.isArray(result?.risks) ? result.risks : [],
		suggestions: Array.isArray(result?.suggestions) ? result.suggestions : []
	};
}

function getCompareSections(result = {}) {
	return [
		{ key: 'matched', title: '符合项', fallback: '符合项', items: result.matchedItems || [] },
		{ key: 'missing', title: '缺失项', fallback: '缺失项', items: result.missingItems || [] },
		{ key: 'risks', title: '风险提示', fallback: '风险', items: result.risks || [] },
		{ key: 'suggestions', title: '补充建议', fallback: '建议', items: result.suggestions || [] }
	];
}

function formatCitationScore(score) {
	const value = Number(score);
	if (!Number.isFinite(value)) return '-';
	return `${Math.round(value * 100)}%`;
}

async function openCitationPreview(citation) {
	const documentId = citation?.previewDocumentId || citation?.documentId || citation?.id;
	if (!documentId) return;

	activeCitation.value = citation;
	previewVisible.value = true;
	previewLoading.value = true;
	previewError.value = '';
	previewDocument.value = null;

	try {
		previewDocument.value = await getKnowledgeDocumentPreview(documentId, {
			limit: 20000
		});
		hydrateCitationFromPreview(citation, previewDocument.value);
	} catch {
		previewError.value = '原文预览读取失败，请确认该资料已完成入库同步。';
	} finally {
		previewLoading.value = false;
	}
}

function closePreview() {
	previewVisible.value = false;
	previewLoading.value = false;
	previewError.value = '';
	previewDocument.value = null;
	activeCitation.value = null;
}

function hydrateCitationFromPreview(citation, preview) {
	const item = preview?.item;
	if (!citation || !item) return;

	citation.documentId = item.id || citation.documentId;
	citation.title = item.title || citation.title;
	citation.sourceOrg = item.sourceOrg || citation.sourceOrg;
	citation.publishDate = item.publishDate || citation.publishDate;
	citation.sourceUrl = item.sourceUrl || citation.sourceUrl;
	citation.citationLabel = citation.citationLabel || resolveCitationLabel(citation);
	citation.previewDocumentId = item.id || citation.previewDocumentId;
	messages.value = [...messages.value];
}

function resolveCitationLabel(citation) {
	for (const message of messages.value) {
		if (!Array.isArray(message?.citations)) continue;
		const index = message.citations.indexOf(citation);
		if (index >= 0) return `[${index + 1}]`;
	}
	return '[1]';
}

defineExpose({
	aiChatBodyRef,
	aiChatPanelRef,
	chatHistorySidebarRef,
	aiChatMainRef,
	aiChatHeaderRef
});
</script>

<style scoped>
.toolbar {
	position: absolute;
	top: 50px;
	left: 0;
	right: 0;
	height: 60px;
	background: #f3f5f7;
	border-bottom: 1px solid #e0e3e6;
	display: flex;
	align-items: center;
	padding: 0 16px;
	gap: 16px;
	z-index: 2;
}

.tool-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-width: 56px;
	padding: 6px 10px;
	background: transparent;
	border: 1px solid transparent;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.tool-btn:hover {
	background: #e9edef;
}

.tool-btn.active {
	background: #e1eefd;
	border-color: #8ebcff;
	color: #007bff;
}

.tool-icon {
	width: 20px;
	height: 20px;
	margin-bottom: 2px;
}

.ai-chat-panel {
	position: fixed;
	top: 0;
	left: 0;
	background: #ffffff;
	border: 1px solid #d9dee3;
	border-radius: 18px;
	box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18);
	z-index: 22;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	will-change: top, left, width, height, border-radius, box-shadow;
	transition:
		top 0.36s cubic-bezier(0.22, 1, 0.36, 1),
		left 0.36s cubic-bezier(0.22, 1, 0.36, 1),
		width 0.36s cubic-bezier(0.22, 1, 0.36, 1),
		height 0.36s cubic-bezier(0.22, 1, 0.36, 1),
		border-radius 0.3s ease,
		box-shadow 0.3s ease,
		opacity 0.22s ease;
}

.ai-chat-panel.maximized {
	border-radius: 22px;
	box-shadow: 0 26px 64px rgba(15, 23, 42, 0.2);
}

.ai-chat-panel.minimized {
	border-radius: 18px;
	box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
}

.ai-chat-panel.minimized.dragging {
	box-shadow: 0 0 20px 5px rgba(54, 155, 250, 0.2), 0 18px 35px rgba(15, 23, 42, 0.28);
	transition: none;
}

.ai-chat-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 16px;
	background: #ffffff;
	cursor: move;
	flex-shrink: 0;
	overflow: hidden;
	align-self: center;
	width: 100%;
	box-sizing: border-box;
}
.ai-chat-panel.maximized .ai-chat-header {
	cursor: default;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
}

.header-model-picker {
	width: 220px;
	flex-shrink: 0;
	position: absolute;
	right: 200px;
}

.header-model-picker :deep(.el-select) {
	width: 100%;
}

.header-model-picker :deep(.el-select__wrapper) {
	min-height: 32px;
	border-radius: 999px;
	background: #f8fafc;
	box-shadow: inset 0 0 0 1px #d8dee6;
}

.header-model-picker :deep(.el-select__wrapper.is-focused) {
	box-shadow: inset 0 0 0 1px #111827;
}

.header-model-picker :deep(.el-select__placeholder),
.header-model-picker :deep(.el-select__selected-item) {
	font-size: 12px;
	color: #1f2937;
}

.header-model-picker :deep(.el-select__caret) {
	color: #64748b;
}

.history-toggle-btn {
	margin-right: 4px;
}

.ai-chat-main {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	min-height: 0;
	position: relative;
}

.ai-title {
	display: flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
	cursor: pointer;
	position: relative;
}

.ai-title-toggle {
	width: 28px;
	height: 28px;
	padding: 0;
	border: 1px solid #d5dbe3;
	border-radius: 8px;
	background: #fff;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.ai-title:hover .ai-title-toggle,
.ai-title:focus-within .ai-title-toggle {
	opacity: 1;
	pointer-events: auto;
}

.ai-title-toggle:hover {
	border-color: #94a3b8;
	background: #f8fafc;
}

.ai-avatar {
	width: 26px;
	height: 26px;
}

.ai-title-copy {
	min-width: 0;
}

.ai-title-main {
	font-size: 14px;
	font-weight: 600;
	color: #111827;
}

.ai-title-sub {
	margin-top: 2px;
	font-size: 12px;
	color: #6b7280;
}

.ai-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.header-btn {
	width: 30px;
	height: 30px;
	border: 1px solid #d5dbe3;
	border-radius: 9px;
	background: #fff;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
}

.action-icon {
	width: 16px;
	height: 16px;
}

.ai-chat-body {
	display: flex;
	flex: 1;
	min-height: 0;
	flex-direction: column;
	background: #f7f7f8;
	overflow: hidden;
	transition: padding-left 0.26s ease;
}

.ai-chat-panel.sidebar-open .ai-chat-body {
	padding-left: 200px;
}

.chat-notice {
	width: min(760px, calc(100% - 32px));
	margin: 14px auto 0;
	padding: 10px 14px;
	border-radius: 14px;
	font-size: 12px;
	line-height: 1.5;
}

.chat-notice.success,
.chat-notice.neutral {
	background: #f3f7fb;
	color: #526173;
	border: 1px solid #e4ebf3;
}

.chat-notice.warning {
	background: #fff7ed;
	color: #9a3412;
	border: 1px solid #fed7aa;
}

.chat-empty {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 24px;
	text-align: center;
	color: #4b5563;
}

.empty-avatar {
	width: 56px;
	height: 56px;
	margin-bottom: 16px;
}

.chat-empty h3 {
	margin: 0 0 10px;
	font-size: 24px;
	font-weight: 600;
	color: #111827;
}

.chat-empty p {
	max-width: 560px;
	margin: 0;
	font-size: 14px;
	line-height: 1.7;
}

.chat-list {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: 22px 0 8px;
}

.chat-row {
	width: min(760px, calc(100% - 32px));
	margin: 0 auto 18px;
	display: flex;
	align-items: flex-start;
	gap: 12px;
}

.chat-row.user {
	justify-content: flex-end;
}

.chat-avatar {
	width: 30px;
	height: 30px;
	border-radius: 999px;
	overflow: hidden;
	flex-shrink: 0;
	/* background: #f3f4f6; */
	/* border: 1px solid #e5e7eb; */
}

.chat-avatar img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.chat-bubble {
	max-width: min(680px, calc(100% - 84px));
	padding: 14px 16px;
	border-radius: 18px;
	background: #ffffff;
	border: 1px solid #eceff3;
	box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}

.chat-bubble.is-streaming {
	border-color: #d8e5f8;
	box-shadow: 0 10px 24px rgba(59, 130, 246, 0.08);
}

.chat-row.user .chat-bubble {
	background: #f3f4f6;
	border-color: #e5e7eb;
}

.assistant-timeline-card {
	flex: 1;
	max-width: min(720px, calc(100% - 52px));
	padding: 6px 0 0;
}

.assistant-timeline-card.is-streaming {
	opacity: 0.98;
}

.assistant-activity-log {
	display: grid;
	gap: 12px;
	margin-top: 12px;
	padding: 2px 0;
}

.assistant-log-entry {
	display: grid;
	grid-template-columns: 16px minmax(0, 1fr);
	gap: 8px;
	align-items: start;
	color: #6b7280;
}

.assistant-log-icon {
	width: 16px;
	height: 20px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: #9ca3af;
	font-size: 13px;
	line-height: 1;
}

.assistant-log-content {
	min-width: 0;
	display: grid;
	gap: 4px;
}

.assistant-log-title {
	font-size: 13px;
	line-height: 1.6;
	color: #6b7280;
	word-break: break-word;
}

.assistant-log-detail {
	font-size: 12px;
	line-height: 1.7;
	color: #94a3b8;
	white-space: pre-wrap;
	word-break: break-word;
}

.codex-run-log {
	display: grid;
	gap: 12px;
	margin-top: 16px;
	color: #111827;
}

.codex-run-item {
	min-width: 0;
}

.codex-run-text {
	margin: 0;
	font-size: 14px;
	line-height: 1.9;
	color: #1f2937;
	white-space: pre-wrap;
	word-break: break-word;
}

.codex-run-text code,
.codex-tool-command {
	padding: 2px 6px;
	border-radius: 5px;
	background: #f4f4f5;
	color: #374151;
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
	font-size: 12px;
	line-height: 1.5;
}

.codex-tool-row,
.codex-edit-row {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	color: #8b949e;
	font-size: 13px;
	line-height: 1.7;
}

.codex-tool-icon,
.codex-edit-icon {
	width: 14px;
	flex: 0 0 14px;
	color: #9ca3af;
	text-align: center;
}

.codex-tool-label,
.codex-edit-row span:last-child {
	flex: 0 0 auto;
	color: #6b7280;
}

.codex-tool-command {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	background: transparent;
	color: #9ca3af;
	padding: 0;
}

.codex-run-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 4px;
	font-size: 12px;
	line-height: 1.5;
	color: #64748b;
}

.codex-run-detail {
	margin-top: 4px;
	font-size: 12px;
	line-height: 1.7;
	color: #94a3b8;
	white-space: pre-wrap;
	word-break: break-word;
}

.assistant-run-head {
	width: 100%;
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto auto;
	align-items: center;
	gap: 10px;
	padding: 0;
	border: none;
	background: transparent;
	text-align: left;
	cursor: pointer;
}

.assistant-run-title {
	font-size: 13px;
	font-weight: 700;
	line-height: 1.5;
	color: #111827;
}

.assistant-run-meta,
.assistant-run-chevron {
	font-size: 12px;
	line-height: 1.5;
	color: #64748b;
	white-space: nowrap;
}

.assistant-timeline {
	position: relative;
	margin-top: 12px;
	padding-left: 18px;
	display: grid;
	gap: 12px;
}

.assistant-timeline::before {
	content: "";
	position: absolute;
	left: 5px;
	top: 2px;
	bottom: 2px;
	width: 1px;
	background: #dbe4ee;
}

.assistant-timeline-step {
	position: relative;
	display: grid;
	grid-template-columns: 12px minmax(0, 1fr);
	gap: 10px;
}

.assistant-timeline-dot {
	position: relative;
	z-index: 1;
	width: 12px;
	height: 12px;
	margin-top: 4px;
	border-radius: 999px;
	border: 2px solid #ffffff;
	box-shadow: 0 0 0 1px #dbe4ee;
	background: #94a3b8;
}

.assistant-timeline-dot.is-success {
	background: #10b981;
}

.assistant-timeline-dot.is-recovered,
.assistant-timeline-dot.is-running {
	background: #2563eb;
}

.assistant-timeline-dot.is-warning {
	background: #f59e0b;
}

.assistant-timeline-dot.is-danger {
	background: #ef4444;
}

.assistant-timeline-content {
	display: grid;
	gap: 4px;
	padding-bottom: 2px;
}

.assistant-timeline-row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;
}

.assistant-timeline-title {
	min-width: 0;
	font-size: 13px;
	font-weight: 600;
	line-height: 1.6;
	color: #111827;
	word-break: break-word;
}

.assistant-timeline-detail {
	font-size: 12px;
	line-height: 1.7;
	color: #475569;
	white-space: pre-wrap;
	word-break: break-word;
}

.assistant-timeline-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 10px;
	font-size: 11px;
	line-height: 1.5;
	color: #64748b;
}

.assistant-thinking {
	margin-top: 14px;
	padding: 10px 12px;
	border-radius: 12px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
}

.assistant-final-answer {
	margin-top: 14px;
	font-size: 14px;
	line-height: 1.8;
	color: #1f2937;
	white-space: pre-wrap;
	word-break: break-word;
}

.related-file-section {
	margin-top: 16px;
	display: grid;
	gap: 10px;
}

.related-file-title {
	font-size: 12px;
	font-weight: 700;
	line-height: 1.5;
	color: #111827;
}

.related-file-list {
	display: grid;
	gap: 8px;
}

.related-file-card {
	width: 100%;
	display: grid;
	grid-template-columns: 44px minmax(0, 1fr);
	align-items: flex-start;
	gap: 10px;
	padding: 10px 12px;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	background: #ffffff;
	text-align: left;
	cursor: pointer;
	transition: border-color 0.18s ease, background 0.18s ease;
}

.related-file-card:hover {
	border-color: #bfd3ea;
	background: #f8fbff;
}

.related-file-label {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 24px;
	padding: 0 8px;
	border-radius: 999px;
	background: #eef2f7;
	color: #334155;
	font-size: 11px;
	font-weight: 700;
	line-height: 1;
}

.related-file-main {
	min-width: 0;
	display: grid;
	gap: 4px;
}

.related-file-name {
	font-size: 13px;
	font-weight: 600;
	line-height: 1.6;
	color: #111827;
	word-break: break-word;
}

.related-file-meta {
	font-size: 11px;
	line-height: 1.6;
	color: #64748b;
	word-break: break-word;
}

.chat-thinking {
	margin-bottom: 10px;
	padding: 10px 12px;
	border-radius: 14px;
	background: #f7faff;
	border: 1px solid #e3edf9;
}

.chat-thinking-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.chat-thinking-label {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	line-height: 1.4;
	color: #64748b;
}

.thinking-toggle-btn {
	border: none;
	background: transparent;
	padding: 0;
	font-size: 12px;
	line-height: 1.4;
	color: #2563eb;
	cursor: pointer;
	flex-shrink: 0;
}

.thinking-toggle-btn:hover {
	color: #1d4ed8;
}

.thinking-dot {
	width: 6px;
	height: 6px;
	border-radius: 999px;
	background: #3b82f6;
	box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.28);
	animation: thinkingPulse 1.4s ease-in-out infinite;
}

.chat-thinking-text {
	margin-top: 8px;
	font-size: 12px;
	line-height: 1.7;
	color: #475569;
	white-space: pre-wrap;
	word-break: break-word;
}

.chat-bubble-loader {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-top: 10px;
	padding: 2px 0;
}

.chat-bubble-loader span {
	width: 7px;
	height: 7px;
	border-radius: 999px;
	background: #7aa2e3;
	animation: bubbleBounce 1s ease-in-out infinite;
}

.chat-bubble-loader span:nth-child(2) {
	animation-delay: 0.16s;
}

.chat-bubble-loader span:nth-child(3) {
	animation-delay: 0.32s;
}

.chat-text {
	font-size: 14px;
	line-height: 1.75;
	color: #1f2937;
	white-space: pre-wrap;
	word-break: break-word;
}

.compare-result {
	margin-top: 12px;
	display: grid;
	gap: 10px;
}

.template-result {
	margin-top: 12px;
	display: grid;
	gap: 10px;
}

.template-title {
	font-size: 14px;
	font-weight: 700;
	color: #111827;
}

.template-output {
	padding: 8px 10px;
	border-radius: 8px;
	background: #f0fdf4;
	color: #166534;
	font-size: 12px;
	word-break: break-all;
}

.template-section {
	padding: 10px 12px;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	background: #ffffff;
}

.template-section-title {
	font-size: 12px;
	font-weight: 700;
	color: #111827;
	margin-bottom: 6px;
}

.template-section-content {
	white-space: pre-wrap;
	word-break: break-word;
	font-size: 13px;
	line-height: 1.7;
	color: #374151;
}

.replica-result {
	margin-top: 12px;
	display: grid;
	gap: 10px;
}

.replica-block {
	padding: 10px 12px;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	background: #ffffff;
}

.replica-tree {
	display: grid;
	gap: 5px;
	font-size: 12px;
	color: #475569;
}

.replica-tree div::before {
	content: "└ ";
	color: #94a3b8;
}

.replica-file-list {
	display: grid;
	gap: 8px;
}

.replica-file-item {
	padding: 8px;
	border-radius: 8px;
	background: #f8fafc;
}

.replica-file-path {
	font-size: 12px;
	font-weight: 700;
	color: #1f2937;
	word-break: break-all;
}

.replica-file-purpose {
	margin-top: 4px;
	font-size: 12px;
	line-height: 1.5;
	color: #64748b;
}

.tool-call-list {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 10px;
}

.tool-call-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: 24px;
	padding: 0 9px;
	border: 1px solid #dbeafe;
	border-radius: 999px;
	background: #eff6ff;
	color: #1d4ed8;
	font-size: 12px;
	line-height: 1;
}

.tool-call-dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: #2563eb;
}

.process-panel {
	margin-top: 12px;
	padding: 12px;
	border: 1px solid #dbe7f5;
	border-radius: 10px;
	background: #f8fbff;
	display: grid;
	gap: 12px;
}

.process-panel-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
}

.process-panel-title-wrap {
	min-width: 0;
}

.process-panel-title {
	font-size: 13px;
	font-weight: 700;
	line-height: 1.5;
	color: #0f172a;
}

.process-panel-subtitle {
	margin-top: 2px;
	font-size: 12px;
	line-height: 1.6;
	color: #475569;
}

.process-toggle-btn {
	border: none;
	background: transparent;
	padding: 0;
	font-size: 12px;
	line-height: 1.4;
	color: #2563eb;
	cursor: pointer;
	flex-shrink: 0;
}

.process-toggle-btn:hover {
	color: #1d4ed8;
}

.process-panel-body {
	display: grid;
	gap: 12px;
}

.process-chip-list,
.process-batch-list {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.process-chip,
.process-batch-chip {
	padding: 2px 8px;
	border-radius: 999px;
	background: #e8f1ff;
	color: #1d4ed8;
	font-size: 11px;
	line-height: 1.5;
}

.process-agent-list {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	gap: 8px;
}

.process-agent-card {
	padding: 8px 10px;
	border-radius: 8px;
	background: #ffffff;
	border: 1px solid #e2e8f0;
}

.process-agent-name {
	font-size: 12px;
	font-weight: 700;
	line-height: 1.5;
	color: #1f2937;
}

.process-agent-meta {
	margin-top: 6px;
}

.process-section {
	display: grid;
	gap: 8px;
}

.process-section-title {
	font-size: 12px;
	font-weight: 700;
	line-height: 1.5;
	color: #0f172a;
}

.process-step-list,
.process-suggestion-list,
.process-memory-list {
	display: grid;
	gap: 8px;
}

.process-step,
.process-suggestion-item,
.process-memory-card {
	padding: 10px;
	border-radius: 8px;
	background: #ffffff;
	border: 1px solid #e2e8f0;
}

.process-step-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;
}

.process-step-title,
.process-suggestion-title {
	font-size: 12px;
	font-weight: 700;
	line-height: 1.55;
	color: #1f2937;
}

.process-step-detail,
.process-suggestion-detail,
.process-memory-text,
.process-memory-item {
	margin-top: 4px;
	font-size: 12px;
	line-height: 1.7;
	color: #475569;
	white-space: pre-wrap;
	word-break: break-word;
}

.process-step-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 6px;
}

.process-step-meta span {
	padding: 1px 6px;
	border-radius: 999px;
	background: #f1f5f9;
	color: #475569;
	font-size: 11px;
	line-height: 1.5;
}

.process-status-pill {
	flex: 0 0 auto;
	padding: 2px 7px;
	border-radius: 999px;
	font-size: 11px;
	line-height: 1.5;
}

.process-status-pill.is-success {
	background: #ecfdf5;
	color: #047857;
}

.process-status-pill.is-recovered {
	background: #eff6ff;
	color: #1d4ed8;
}

.process-status-pill.is-running {
	background: #dbeafe;
	color: #1d4ed8;
}

.process-status-pill.is-warning {
	background: #fff7ed;
	color: #c2410c;
}

.process-status-pill.is-danger {
	background: #fef2f2;
	color: #b91c1c;
}

.process-status-pill.is-muted {
	background: #f1f5f9;
	color: #64748b;
}

.process-memory-label {
	font-size: 11px;
	font-weight: 700;
	line-height: 1.5;
	color: #1d4ed8;
}

.policy-inventory-result {
	margin-top: 12px;
	padding: 10px 12px;
	border: 1px solid #dbeafe;
	border-radius: 8px;
	background: #f8fbff;
}

.policy-inventory-list {
	display: grid;
	gap: 8px;
	margin-top: 8px;
}

.policy-inventory-item {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;
	padding: 8px 10px;
	border-radius: 8px;
	background: #ffffff;
}

.policy-inventory-main {
	min-width: 0;
}

.policy-inventory-name {
	font-size: 12px;
	font-weight: 700;
	line-height: 1.5;
	color: #111827;
	word-break: break-word;
}

.policy-inventory-meta {
	margin-top: 2px;
	font-size: 11px;
	line-height: 1.5;
	color: #64748b;
}

.policy-status-pill {
	flex: 0 0 auto;
	padding: 2px 7px;
	border-radius: 999px;
	font-size: 11px;
	line-height: 1.5;
}

.policy-status-pill.found {
	background: #ecfdf5;
	color: #047857;
}

.policy-status-pill.missing {
	background: #fff7ed;
	color: #c2410c;
}

.public-collection-result {
	margin-top: 12px;
	padding: 10px 12px;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	background: #ffffff;
}

.public-collection-summary {
	margin-top: 6px;
	font-size: 12px;
	line-height: 1.7;
	color: #475569;
	white-space: pre-wrap;
	word-break: break-word;
}

.public-collection-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 8px;
}

.public-collection-meta span {
	padding: 2px 7px;
	border-radius: 999px;
	background: #f1f5f9;
	color: #475569;
	font-size: 11px;
	line-height: 1.5;
}

.public-collection-action {
	margin-top: 10px;
	min-height: 28px;
	padding: 0 12px;
	border: 0;
	border-radius: 6px;
	background: #2563eb;
	color: #ffffff;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
}

.public-collection-action:disabled {
	cursor: not-allowed;
	opacity: 0.55;
}

.compare-section {
	padding: 10px 12px;
	border: 1px solid #e2e8f0;
	border-radius: 8px;
	background: #ffffff;
}

.compare-section-title {
	font-size: 12px;
	font-weight: 700;
	color: #111827;
	margin-bottom: 8px;
}

.compare-item-list {
	display: grid;
	gap: 8px;
}

.compare-item {
	padding: 8px 10px;
	border-radius: 8px;
	background: #f8fafc;
}

.compare-item-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 10px;
}

.compare-item-title {
	font-size: 12px;
	font-weight: 600;
	line-height: 1.5;
	color: #1f2937;
}

.compare-severity {
	padding: 1px 6px;
	border-radius: 999px;
	background: #fff7ed;
	color: #9a3412;
	font-size: 11px;
	line-height: 1.5;
	flex-shrink: 0;
}

.compare-item-detail {
	margin-top: 4px;
	font-size: 12px;
	line-height: 1.65;
	color: #475569;
	white-space: pre-wrap;
	word-break: break-word;
}

.compare-item-citations {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin-top: 6px;
}

.compare-item-citations span {
	padding: 1px 6px;
	border-radius: 999px;
	background: #e6f0ff;
	color: #1d4ed8;
	font-size: 11px;
	font-weight: 700;
}

.compare-empty {
	font-size: 12px;
	color: #94a3b8;
}

.citation-list {
	margin-top: 12px;
	display: grid;
	gap: 8px;
}

.citation-card {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid #dbe7f5;
	border-radius: 8px;
	background: #f8fbff;
	text-align: left;
	cursor: pointer;
	transition: border-color 0.18s ease, background 0.18s ease;
}

.citation-card:hover {
	border-color: #8ebcff;
	background: #f1f7ff;
}

.citation-head {
	display: flex;
	align-items: flex-start;
	gap: 8px;
}

.citation-label {
	min-width: 28px;
	padding: 1px 6px;
	border-radius: 999px;
	background: #e6f0ff;
	color: #1d4ed8;
	font-size: 11px;
	font-weight: 700;
	line-height: 1.5;
	text-align: center;
	flex-shrink: 0;
}

.citation-title {
	font-size: 12px;
	font-weight: 600;
	line-height: 1.5;
	color: #1f2937;
	min-width: 0;
}

.citation-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 4px;
	font-size: 11px;
	line-height: 1.4;
	color: #64748b;
}

.citation-quote {
	margin-top: 6px;
	font-size: 12px;
	line-height: 1.6;
	color: #475569;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.graph-result {
	margin-top: 12px;
	display: grid;
	gap: 10px;
	padding: 10px 12px;
	border: 1px solid #d6e4d4;
	border-radius: 8px;
	background: #f7fbf5;
}

.graph-result-head,
.graph-chip-list {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.graph-result-head span,
.graph-chip-list span {
	padding: 2px 8px;
	border-radius: 999px;
	background: #e8f5e4;
	color: #2f6b2f;
	font-size: 11px;
	line-height: 1.5;
}

.graph-result-head span:first-child {
	background: #21442b;
	color: #ffffff;
	font-weight: 700;
}

.graph-summary {
	font-size: 12px;
	line-height: 1.7;
	color: #38523c;
	white-space: pre-wrap;
	word-break: break-word;
}

.graph-section {
	display: grid;
	gap: 6px;
}

.graph-section-title {
	font-size: 12px;
	font-weight: 700;
	color: #17351f;
}

.graph-line-list {
	display: grid;
	gap: 5px;
	font-size: 12px;
	line-height: 1.6;
	color: #496150;
}

.preview-backdrop {
	position: absolute;
	inset: 0;
	z-index: 20;
	background: rgba(15, 23, 42, 0.28);
	display: flex;
	justify-content: flex-end;
}

.preview-panel {
	width: min(560px, 92%);
	height: 100%;
	background: #ffffff;
	box-shadow: -18px 0 42px rgba(15, 23, 42, 0.2);
	display: flex;
	flex-direction: column;
}

.preview-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	padding: 14px 16px;
	border-bottom: 1px solid #e5eaf0;
}

.preview-title-wrap {
	min-width: 0;
}

.preview-title {
	font-size: 14px;
	font-weight: 600;
	line-height: 1.5;
	color: #111827;
	word-break: break-word;
}

.preview-meta {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 4px;
	font-size: 12px;
	color: #64748b;
}

.preview-source-link {
	color: #2563eb;
	text-decoration: none;
}

.preview-source-link:hover {
	text-decoration: underline;
}

.preview-close {
	width: 30px;
	height: 30px;
	border: 1px solid #d5dbe3;
	border-radius: 8px;
	background: #fff;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	flex-shrink: 0;
}

.preview-state {
	padding: 18px 16px;
	font-size: 13px;
	color: #64748b;
}

.preview-state.warning {
	color: #9a3412;
}

.preview-content {
	flex: 1;
	min-height: 0;
	overflow: auto;
	padding: 16px;
	background: #f8fafc;
}

.preview-quote {
	margin-bottom: 14px;
	padding: 12px;
	border: 1px solid #dbe7f5;
	border-radius: 8px;
	background: #ffffff;
}

.preview-quote-label {
	margin-bottom: 6px;
	font-size: 12px;
	font-weight: 600;
	color: #1f2937;
}

.preview-quote-text {
	font-size: 12px;
	line-height: 1.7;
	color: #475569;
	white-space: pre-wrap;
	word-break: break-word;
}

.preview-content pre {
	margin: 0;
	font-size: 13px;
	line-height: 1.8;
	color: #1f2937;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
}

@keyframes thinkingPulse {
	0%,
	100% {
		box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.28);
		opacity: 0.9;
	}

	50% {
		box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
		opacity: 1;
	}
}

@keyframes bubbleBounce {
	0%,
	80%,
	100% {
		transform: translateY(0);
		opacity: 0.45;
	}

	40% {
		transform: translateY(-4px);
		opacity: 1;
	}
}

.composer-wrap {
	padding: 14px 16px 18px;
	background: linear-gradient(180deg, rgba(247, 247, 248, 0) 0%, #ffffff 18%);
}

.composer {
	width: min(760px, 100%);
	box-sizing: border-box;
	margin: 0 auto;
	padding: 12px 14px 10px;
	background: #ffffff;
	border: 1px solid #dfe4ea;
	border-radius: 24px;
	box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}

.upload-panel {
	margin-bottom: 10px;
	padding: 10px;
	border: 1px solid #dbeafe;
	border-radius: 8px;
	background: #f8fbff;
}

.upload-panel-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 8px;
}

.upload-panel-title {
	font-size: 13px;
	font-weight: 700;
	color: #111827;
}

.upload-panel-subtitle {
	margin-top: 2px;
	font-size: 11px;
	color: #64748b;
}

.upload-close-btn,
.upload-toggle-btn {
	border: none;
	border-radius: 999px;
	background: #eff6ff;
	color: #1d4ed8;
	font-size: 12px;
	cursor: pointer;
}

.upload-close-btn {
	height: 26px;
	padding: 0 10px;
}

.upload-toggle-btn {
	height: 32px;
	padding: 0 12px;
}

.upload-toggle-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.upload-input {
	width: 100%;
	font-size: 12px;
	color: #334155;
}

.upload-file-list {
	display: grid;
	gap: 6px;
	margin-top: 8px;
}

.upload-file-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 6px 8px;
	border-radius: 8px;
	background: #ffffff;
	font-size: 12px;
	color: #334155;
}

.upload-file-item span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.upload-file-item button {
	flex: 0 0 auto;
	border: none;
	background: transparent;
	color: #dc2626;
	font-size: 12px;
	cursor: pointer;
}

.direct-upload-input {
	position: absolute;
	width: 1px;
	height: 1px;
	opacity: 0;
	pointer-events: none;
}

.upload-file-strip {
	position: relative;
	margin: 0 0 10px;
}

.upload-file-strip::before,
.upload-file-strip::after {
	content: "";
	position: absolute;
	top: 0;
	bottom: 0;
	z-index: 2;
	width: 34px;
	pointer-events: none;
	opacity: 0;
	transition: opacity 0.16s ease;
}

.upload-file-strip::before {
	left: 0;
	background: linear-gradient(90deg, #ffffff 0%, rgba(255, 255, 255, 0) 100%);
}

.upload-file-strip::after {
	right: 0;
	background: linear-gradient(270deg, #ffffff 0%, rgba(255, 255, 255, 0) 100%);
}

.upload-file-strip.can-left::before,
.upload-file-strip.can-right::after {
	opacity: 1;
}

.compact-file-list {
	display: flex;
	flex-wrap: nowrap;
	gap: 8px;
	margin: 0;
	overflow-x: auto;
	overflow-y: hidden;
	padding: 8px 20px 4px 2px;
	scrollbar-width: none;
	-ms-overflow-style: none;
}

.compact-file-list::-webkit-scrollbar {
	display: none;
}

.compact-file-card {
	position: relative;
	display: grid;
	grid-template-columns: 24px minmax(0, 1fr);
	align-items: center;
	gap: 8px;
	flex: 0 0 200px;
	width: 200px;
	min-height: 52px;
	padding: 8px 28px 8px 10px;
	border-radius: 8px;
	background: #f3f4f6;
	color: #111827;
}

.message-file-list {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 10px;
}

.message-file-card {
	flex: 0 1 200px;
	width: min(200px, 100%);
	padding-right: 10px;
}

.file-strip-nav {
	position: absolute;
	top: 50%;
	z-index: 3;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	padding: 0;
	border: 1px solid #e5e7eb;
	border-radius: 50%;
	background: #ffffff;
	color: #9ca3af;
	box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
	cursor: pointer;
	transform: translateY(-50%);
	font-size: 20px;
	line-height: 1;
}

.file-strip-nav.left {
	left: 2px;
}

.file-strip-nav.right {
	right: 2px;
}

.file-strip-nav:hover {
	color: #4b5563;
	background: #f9fafb;
}

.upload-file-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	border-radius: 5px;
	background: #dbeafe;
	color: #2563eb;
	font-size: 11px;
	font-weight: 800;
	line-height: 1;
}

.upload-file-info {
	min-width: 0;
}

.upload-file-name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 13px;
	line-height: 1.25;
	color: #111827;
}

.upload-file-meta {
	margin-top: 3px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 11px;
	line-height: 1.2;
	color: #9ca3af;
}

.compact-file-card .upload-file-remove {
	position: absolute;
	top: -6px;
	right: -6px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	padding: 0;
	border: none;
	border-radius: 50%;
	background: #1f2937;
	color: #ffffff;
	font-size: 12px;
	font-weight: 700;
	line-height: 16px;
	cursor: pointer;
}

.composer-input {
	width: 100%;
	min-height: 68px;
	max-height: 180px;
	padding: 4px 2px 10px;
	border: none;
	outline: none;
	resize: none;
	background: transparent;
	font-size: 14px;
	line-height: 1.7;
	color: #111827;
	font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
}

.composer-footer {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 8px;
}

.composer-left {
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	flex: 1;
	min-width: 0;
}

.mode-toggle {
	display: none;
	padding: 2px;
	border: 1px solid #d8dee6;
	border-radius: 999px;
	background: #f8fafc;
}

.mode-toggle-btn {
	height: 28px;
	padding: 0 12px;
	border: none;
	border-radius: 999px;
	background: transparent;
	font-size: 12px;
	color: #64748b;
	cursor: pointer;
}

.mode-toggle-btn.active {
	background: #111827;
	color: #ffffff;
}

.mode-toggle-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.graph-mode-select {
	height: 32px;
	padding: 0 10px;
	border: 1px solid #d8dee6;
	border-radius: 999px;
	background: #f8fafc;
	color: #1f2937;
	font-size: 12px;
	outline: none;
}

.graph-mode-select:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.token-usage-ring {
	position: relative;
	width: 16px;
	height: 16px;
	min-width: 16px;
	margin-left: auto;
	border-radius: 50%;
	background: conic-gradient(#9ca3af 0%, #e5e7eb 0);
	box-shadow: inset 0 0 0 1px rgba(17, 24, 39, 0.06);
}

.token-usage-ring::after {
	content: "";
	position: absolute;
	inset: 3px;
	border-radius: 50%;
	background: #ffffff;
}

.token-usage-ring.is-warning {
	box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.16);
}

.token-usage-ring.is-danger {
	box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.18);
}

.context-compression-indicator {
	display: flex;
	align-items: center;
	gap: 8px;
	width: min(92%, 760px);
	margin: 8px auto 14px;
	color: #9ca3af;
	font-size: 13px;
	line-height: 1.4;
}

.context-compression-indicator::before,
.context-compression-indicator::after {
	content: "";
	flex: 1;
	height: 1px;
	background: #d9dde3;
}

.context-compression-indicator span {
	flex: 0 0 auto;
	white-space: nowrap;
}

.model-select {
	height: 34px;
	padding: 0 12px;
	border: 1px solid #d8dee6;
	border-radius: 999px;
	background: #f8fafc;
	font-size: 12px;
	color: #1f2937;
	outline: none;
}

.secondary-btn {
	height: 34px;
	padding: 0 12px;
	border: none;
	border-radius: 999px;
	background: transparent;
	font-size: 12px;
	color: #4b5563;
	cursor: pointer;
}

.primary-btn {
	height: 38px;
	min-width: 82px;
	padding: 0 16px;
	border: none;
	border-radius: 999px;
	background: #111827;
	color: #fff;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
}

.stop-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	min-width: 32px;
	padding: 0;
	border: none;
	border-radius: 50%;
	background: #111827;
	color: transparent;
	cursor: pointer;
	font-size: 0;
	line-height: 0;
}

.stop-btn::before {
	content: "";
	width: 10px;
	height: 10px;
	border-radius: 2px;
	background: #ffffff;
	display: block;
}

.stop-btn:hover {
	background: #020617;
}

.primary-btn:disabled,
.secondary-btn:disabled,
.header-model-select:disabled,
.model-select:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.composer-tip {
	width: min(760px, 100%);
	margin: 8px auto 0;
	text-align: center;
	font-size: 11px;
	color: #94a3b8;
}

@media (max-width: 960px) {
	.ai-chat-panel.maximized,
	.ai-chat-panel.minimized {
		width: 94vw;
		height: 84vh;
	}

	.chat-notice,
	.chat-row,
	.composer,
	.composer-tip {
		width: calc(100% - 20px);
	}

	.chat-bubble {
		max-width: calc(100% - 56px);
	}

	.chat-empty h3 {
		font-size: 20px;
	}
}

/* 历史对话侧边栏样式 */
.chat-history-sidebar {
	position: absolute;
	left: 0;
	top: 54px;
	bottom: 0;
	z-index: 4;
	width: 200px;
	background: #fff;
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	overflow: hidden;
	opacity: 0;
	transform: translateX(-18px);
	pointer-events: none;
	transition: width 0.26s ease, transform 0.26s ease, opacity 0.22s ease;
}

.chat-history-sidebar:not(.is-open) {
	width: 0;
	border-right-width: 0;
}

.chat-history-sidebar.is-open {
	opacity: 1;
	transform: translateX(0);
	pointer-events: auto;
}

.sidebar-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 12px 10px;
	border-bottom: 1px solid #e8ecf0;
}

.sidebar-title {
	font-size: 13px;
	font-weight: 600;
	color: #374151;
}

.sidebar-close-btn {
	width: 22px;
	height: 22px;
	border: none;
	background: transparent;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border-radius: 6px;
	transition: background 0.15s;
}

.sidebar-close-btn:hover {
	background: #e9edef;
}

.sidebar-close-btn img {
	width: 14px;
	height: 14px;
}

.sidebar-actions {
	padding: 10px 12px;
}

.new-chat-btn {
	width: 100%;
	height: 36px;
	border: 1px dashed #c9d1d9;
	border-radius: 10px;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	cursor: pointer;
	font-size: 12px;
	color: #4b5563;
	transition: all 0.2s;
}

.new-chat-btn:hover {
	border-color: #8ebcff;
	background: #f0f7ff;
	color: #0066ff;
}

.new-chat-btn img {
	width: 14px;
	height: 14px;
}

.history-list {
	flex: 1;
	overflow-y: auto;
	padding: 6px 8px;
}

.history-list::-webkit-scrollbar {
	width: 4px;
}

.history-list::-webkit-scrollbar-track {
	background: transparent;
}

.history-list::-webkit-scrollbar-thumb {
	background: #d1d5db;
	border-radius: 4px;
}

.history-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 8px;
	border-radius: 10px;
	cursor: pointer;
	transition: background 0.15s;
	position: relative;
	margin-bottom: 2px;
}

.history-item:hover {
	background: #eef2f6;
}

.history-item.active {
	background: #e1eefd;
}

.history-item-icon {
	width: 28px;
	height: 28px;
	border-radius: 8px;
	/* background: #f3f4f6; */
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.history-item-icon img {
	width: 16px;
	height: 16px;
}

.history-item-content {
	flex: 1;
	min-width: 0;
}

.history-item-title {
	font-size: 12px;
	color: #374151;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.4;
}

.history-item-time {
	font-size: 10px;
	color: #9ca3af;
	margin-top: 2px;
}

.history-item-delete {
	width: 22px;
	height: 22px;
	border: none;
	background: transparent;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border-radius: 6px;
	opacity: 0;
	transition: all 0.15s;
	position: absolute;
	right: 6px;
	top: 50%;
	transform: translateY(-50%);
}

.history-item:hover .history-item-delete {
	opacity: 1;
}

.history-item-delete:hover {
	background: #fee2e2;
}

.history-item-delete img {
	width: 12px;
	height: 12px;
}

.history-empty {
	padding: 24px 12px;
	text-align: center;
	font-size: 12px;
	color: #9ca3af;
}

/* 响应式适配 */
@media (max-width: 768px) {
	.chat-history-sidebar {
		top: 58px;
		z-index: 10;
		width: 260px;
		box-shadow: 4px 0 20px rgba(0, 0, 0, 0.12);
	}

	.chat-history-sidebar:not(.is-open) {
		width: 0;
	}

	.chat-history-sidebar.is-open {
		width: 260px;
	}

	.ai-chat-panel.sidebar-open .ai-chat-body {
		padding-left: 0;
	}
}
</style>
