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
    <button :class="['tool-btn', { active: activeAction === 'knowledgeBase' }]" @click="openKnowledgeBase">
      <img class="tool-icon" :src="icons.zhineng || inspectionIcon" alt="知识库" />
      <span>知识库</span>
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

  <section v-if="active && knowledgePanelVisible" class="knowledge-layout">
    <el-card class="knowledge-panel" shadow="always">
      <template #header>
        <div class="panel-header">
          <div>
            <div class="panel-header__title">知识库</div>
            <div class="panel-header__subtitle">正式索引、上传待入库、聊天临时与网络待审核</div>
          </div>
          <div class="panel-header__actions">
            <el-button type="primary" :loading="knowledgeImporting" @click="openKnowledgeFileImport">导入文件</el-button>
            <el-button :loading="knowledgeImporting" @click="openKnowledgeFolderImport">导入文件夹</el-button>
            <el-button @click="refreshKnowledgePanel">刷新</el-button>
            <el-button @click="closeKnowledgePanel">关闭</el-button>
            <input
              ref="knowledgeFileInputRef"
              class="knowledge-import-input"
              type="file"
              multiple
              @change="handleKnowledgeImportChange"
            />
            <input
              ref="knowledgeFolderInputRef"
              class="knowledge-import-input"
              type="file"
              webkitdirectory
              directory
              multiple
              @change="handleKnowledgeImportChange"
            />
          </div>
        </div>
      </template>

      <el-tabs v-model="knowledgeTab" class="knowledge-tabs" @tab-change="handleKnowledgeTabChange">
        <el-tab-pane label="正式索引" name="formal">
          <el-alert
            v-if="knowledgeImportSummary"
            class="knowledge-import-summary"
            type="success"
            show-icon
            :closable="true"
            title="已上传到待入库"
            :description="knowledgeImportSummary"
            @close="knowledgeImportSummary = ''"
          />
          <div class="knowledge-index-toolbar">
            <div>
              <div class="knowledge-section-title">正式索引文件</div>
              <div class="cell-sub">这里仅显示 GraphRAG / Neo4j 全链路完成的文件；处理中和失败状态保留在上传待入库。</div>
            </div>
            <el-button type="primary" :loading="indexJobCreating" @click="createManualGraphIndexJob">
              手动触发全量重建
            </el-button>
          </div>
          <div class="knowledge-browse-grid knowledge-browse-grid--files-only">
            <div class="knowledge-document-table">
              <div class="knowledge-section-title">正式知识库文件列表</div>
              <el-table v-loading="documentLoading" :data="knowledgeDocuments" border height="100%">
                <el-table-column label="文件" min-width="260">
                  <template #default="{ row }">
                    <div class="cell-title">{{ row.title || row.originalName || row.fileName || row.id }}</div>
                    <div class="cell-sub">{{ row.relativePath || row.fileName || row.id }}</div>
                    <div class="cell-sub">ID：{{ row.id }}</div>
                  </template>
                </el-table-column>
                <el-table-column label="入图状态" width="130" align="center">
                  <template #default="{ row }">
                    <el-tag :type="knowledgeGraphStatusType(row.graphStatus)" effect="plain">
                      {{ knowledgeGraphStatusLabel(row.graphStatus) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="来源" min-width="150" show-overflow-tooltip>
                  <template #default="{ row }">{{ row.sourceOrg || row.sourceName || row.parser || '--' }}</template>
                </el-table-column>
                <el-table-column label="入库时间" width="180">
                  <template #default="{ row }">{{ formatDateTime(row.approvedAt || row.createdAt) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="160" fixed="right">
                  <template #default="{ row }">
                    <el-button link type="primary" @click="showKnowledgeDocumentInfo(row)">详情</el-button>
                    <el-button
                      link
                      type="danger"
                      :loading="deletingDocumentId === row.id"
                      @click="confirmDeleteKnowledgeDocument(row)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="上传待入库" name="pending">
          <div class="knowledge-index-toolbar">
            <div>
              <div class="knowledge-section-title">上传待入库</div>
              <div class="cell-sub">这里的文件已上传但尚未进入正式知识库；手动入库或每天 00:00 自动入库后，会执行解析、转 Markdown、写入 stateStore、生成 Passage / Relation，并启动 GraphRAG / Neo4j；全链路完成后才进入正式索引。</div>
            </div>
            <div class="knowledge-toolbar-actions">
              <el-button
                type="primary"
                :disabled="!pendingStagingItems.some((item) => item.stagingStatus === 'uploaded_pending') || Boolean(stagingActionId)"
                :loading="stagingActionId === 'ingest-all'"
                @click="ingestAllPendingStagingItems"
              >
                一键入库
              </el-button>
              <el-button
                :disabled="pendingStagingItems.length < 2 || Boolean(stagingActionId)"
                :loading="stagingActionId === 'dedupe'"
                @click="openDedupeDialog('pending')"
              >
                一键查重
              </el-button>
            </div>
          </div>
          <div v-if="pendingIngestProgress" class="knowledge-ingest-progress">
            <div class="knowledge-ingest-progress__head">
              <span>{{ pendingIngestProgress.message }}</span>
              <span>{{ pendingIngestProgress.percentage }}%</span>
            </div>
            <el-progress
              :percentage="pendingIngestProgress.percentage"
              :status="pendingIngestProgress.status === 'active' ? '' : pendingIngestProgress.status"
              :stroke-width="10"
              striped
              striped-flow
            />
          </div>
          <div class="knowledge-document-table knowledge-document-table--fill">
            <el-table v-loading="stagingLoading" :data="pendingStagingItems" border height="100%">
              <el-table-column label="文件" min-width="300">
                <template #default="{ row }">
                  <div class="cell-title">{{ row.originalName || row.fileName || row.id }}</div>
                  <div class="cell-sub">{{ row.relativePath || row.id }}</div>
                  <div class="cell-sub">ID：{{ row.id }}</div>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="120" align="center">
                <template #default="{ row }">
                  <el-tag :type="stagingStatusType(row.stagingStatus)" effect="plain">
                    {{ stagingStatusLabel(row.stagingStatus) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="大小" width="120" align="right">
                <template #default="{ row }">{{ formatFileSize(row.size) }}</template>
              </el-table-column>
              <el-table-column label="上传人" min-width="130" show-overflow-tooltip>
                <template #default="{ row }">{{ row.uploadedBy || '--' }}</template>
              </el-table-column>
              <el-table-column label="上传时间" width="180">
                <template #default="{ row }">{{ formatDateTime(row.uploadedAt || row.createdAt) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <el-button
                    link
                    type="primary"
                    :disabled="row.stagingStatus !== 'uploaded_pending'"
                    :loading="stagingActionId === row.id"
                    @click="ingestStagingItem(row)"
                  >
                    入库
                  </el-button>
                  <el-button link type="primary" @click="showStagingItemInfo(row)">详情</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="聊天临时" name="chat">
          <div class="knowledge-index-toolbar">
            <div>
              <div class="knowledge-section-title">聊天临时文件</div>
              <div class="cell-sub">这里的文件已解析但只服务当前对话和历史追问；一键上传只会批量加入上传待入库，不会直接解析成正式知识库。</div>
            </div>
            <div class="knowledge-toolbar-actions">
              <el-button
                type="primary"
                :disabled="!chatTemporaryDocuments.length || Boolean(chatTemporaryActionId)"
                :loading="chatTemporaryActionId === 'stage-all'"
                @click="stageAllChatTemporaryDocuments"
              >
                一键上传
              </el-button>
              <el-button
                :disabled="chatTemporaryDocuments.length < 2 || Boolean(chatTemporaryActionId)"
                :loading="chatTemporaryActionId === 'dedupe'"
                @click="openDedupeDialog('chat')"
              >
                一键查重
              </el-button>
            </div>
          </div>
          <div class="knowledge-document-table knowledge-document-table--fill">
            <el-table v-loading="chatTemporaryLoading" :data="chatTemporaryDocuments" border height="100%">
              <el-table-column label="文件" min-width="300">
                <template #default="{ row }">
                  <div class="cell-title">{{ row.title || row.originalName || row.fileName || row.id }}</div>
                  <div class="cell-sub">{{ row.relativePath || row.fileName || row.id }}</div>
                  <div class="cell-sub">ID：{{ row.id }}</div>
                </template>
              </el-table-column>
              <el-table-column label="解析状态" width="130" align="center">
                <template #default="{ row }">
                  <el-tag :type="knowledgeDocumentStatusType(row.inventoryStatus || row.status)" effect="plain">
                    {{ knowledgeDocumentStatusLabel(row.inventoryStatus || row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="上传时间" width="180">
                <template #default="{ row }">{{ formatDateTime(row.createdAt || row.convertedAt) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="260" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" @click="showKnowledgeDocumentInfo(row)">详情</el-button>
                  <el-button
                    link
                    type="success"
                    :loading="chatTemporaryActionId === `stage:${row.id}`"
                    @click="stageChatTemporaryDocument(row)"
                  >
                    上传到待入库
                  </el-button>
                  <el-button
                    link
                    type="danger"
                    :loading="chatTemporaryActionId === `remove:${row.id}`"
                    @click="removeChatTemporaryFile(row)"
                  >
                    移除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="网络待审核" name="network">
          <div class="knowledge-review-head">
            <el-radio-group v-model="reviewStatusFilter" size="small" @change="loadReviewPolicies">
              <el-radio-button label="">全部</el-radio-button>
              <el-radio-button label="pending_review">未审核</el-radio-button>
              <el-radio-button label="approved">已通过</el-radio-button>
              <el-radio-button label="rejected">未通过</el-radio-button>
              <el-radio-button label="duplicate">重复</el-radio-button>
            </el-radio-group>
            <div class="knowledge-review-count">共 {{ reviewPolicies.length }} 条</div>
          </div>
          <div class="knowledge-document-table knowledge-document-table--fill">
          <el-table v-loading="reviewLoading" :data="reviewPolicies" border height="100%">
            <el-table-column label="资料" min-width="280">
              <template #default="{ row }">
                <div class="cell-title">{{ row.title || '未命名资料' }}</div>
                <div class="cell-sub">{{ row.sourceOrg || row.sourceName || '未知来源' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="reviewStatusType(row.reviewStatus)" effect="dark">{{ reviewStatusLabel(row.reviewStatus) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="审核人" min-width="130">
              <template #default="{ row }">{{ row.reviewer?.name || getLastReviewer(row)?.name || '--' }}</template>
            </el-table-column>
            <el-table-column label="审核记录" min-width="220">
              <template #default="{ row }">
                <div v-if="getLastReviewLog(row)" class="cell-sub">
                  {{ reviewActionLabel(getLastReviewLog(row).action) }} · {{ formatDateTime(getLastReviewLog(row).createdAt) }}
                </div>
                <div v-else class="cell-sub">暂无记录</div>
              </template>
            </el-table-column>
            <el-table-column label="来源类型" width="130" align="center">
              <template #default="{ row }">
                <el-tag :type="sourceTrustType(row.sourceTrust)" effect="plain">{{ sourceTrustLabel(row.sourceTrust) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sourceUrl" label="公开来源" min-width="260" show-overflow-tooltip />
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openKnowledgeReview(row)">查看</el-button>
                <el-button
                  v-if="row.reviewStatus === 'pending_review' || row.reviewStatus === 'rejected'"
                  link
                  type="success"
                  :loading="reviewActionId === row.id"
                  @click="submitKnowledgeReview(row, 'approve')"
                >
                  通过
                </el-button>
                <el-button
                  v-if="row.reviewStatus === 'pending_review' || row.reviewStatus === 'approved'"
                  link
                  type="danger"
                  :loading="reviewActionId === row.id"
                  @click="openKnowledgeReject(row)"
                >
                  不通过
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </section>

  <el-dialog
    v-model="knowledgeImportPreviewVisible"
    title="上传到待入库预览"
    width="860px"
    append-to-body
    :close-on-click-modal="!knowledgeImporting"
    :close-on-press-escape="!knowledgeImporting"
    :show-close="!knowledgeImporting"
  >
    <div class="knowledge-import-preview-head">
      <span>待导入 {{ knowledgeImportPendingFiles.length }} 个文件</span>
      <span>总大小 {{ formatFileSize(knowledgeImportTotalSize) }}</span>
    </div>
    <el-alert
      class="knowledge-import-summary"
      type="warning"
      show-icon
      :closable="false"
      title="上传只会进入临时数据库和“上传待入库”，不会立即成为 AI 可用的正式知识库。"
      description="后续需要手动点击入库，或等待每天 00:00 自动入库；完成解析和 GraphRAG / Neo4j 索引后才会进入正式索引。"
    />
    <el-table :data="knowledgeImportPendingFiles" border height="420">
      <el-table-column label="文件" min-width="320">
        <template #default="{ row }">
          <div class="cell-title">{{ row.name }}</div>
          <div class="cell-sub">{{ row.relativePath }}</div>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90" align="center">
        <template #default="{ row }">
          <el-tag effect="plain">{{ row.extension || '文件' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="大小" width="120" align="right">
        <template #default="{ row }">{{ formatFileSize(row.size) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="90" align="center">
        <template #default="{ row }">
          <el-button link type="danger" :disabled="knowledgeImporting" @click="removeKnowledgeImportFile(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button :disabled="knowledgeImporting" @click="clearKnowledgeImportPendingFiles">取消</el-button>
      <el-button
        type="primary"
        :disabled="!knowledgeImportPendingFiles.length"
        :loading="knowledgeImporting"
        @click="confirmKnowledgeImport"
      >
        上传到待入库
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="knowledgeImportProgressVisible"
    title="正在导入知识库"
    width="620px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="knowledge-import-progress">
      <el-progress
        :percentage="Math.max(0, Math.min(100, Number(knowledgeImportJob?.progress || 0)))"
        :stroke-width="14"
        :status="knowledgeImportJob?.status === 'failed' ? 'exception' : undefined"
      />
      <div class="knowledge-import-progress__message">{{ knowledgeImportJob?.message || '正在处理导入任务。' }}</div>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="阶段">{{ knowledgeImportJob?.stage || '--' }}</el-descriptions-item>
        <el-descriptions-item label="总文件">{{ knowledgeImportJob?.totalFiles ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="待解析">{{ knowledgeImportJob?.activeFiles ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="重复跳过">{{ knowledgeImportJob?.duplicateFilesCount ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="已解析">{{ knowledgeImportJob?.parsedFiles ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="已入库">{{ knowledgeImportJob?.approvedFiles ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="当前文件" :span="2">{{ knowledgeImportJob?.currentFile || '--' }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="knowledgeImportJob?.duplicateFiles?.length" class="knowledge-import-duplicates">
        <div class="knowledge-section-title">重复文件已跳过</div>
        <div v-for="item in knowledgeImportJob.duplicateFiles.slice(0, 5)" :key="item.contentHash" class="cell-sub">
          {{ item.relativePath || item.originalName }}：{{ item.reason }}
        </div>
      </div>
    </div>
  </el-dialog>

  <el-dialog
    v-model="dedupeDialogVisible"
    :title="dedupeDialogTitle"
    width="920px"
    append-to-body
    :close-on-click-modal="!dedupeSubmitting"
    :close-on-press-escape="!dedupeSubmitting"
    :show-close="!dedupeSubmitting"
  >
    <div class="knowledge-import-summary">
      将剔除下列重复文件。点击“保留”可把文件从剔除清单中移除。
    </div>
    <el-table :data="dedupeCandidates" border height="420">
      <el-table-column label="将剔除的文件" min-width="320">
        <template #default="{ row }">
          <div class="cell-title">{{ row.title || row.originalName || row.fileName || row.id }}</div>
          <div class="cell-sub">{{ row.relativePath || row.fileName || row.id }}</div>
        </template>
      </el-table-column>
      <el-table-column label="保留依据" min-width="280">
        <template #default="{ row }">
          <div class="cell-title">{{ row.keepTitle || row.keepOriginalName || row.keepId }}</div>
          <div class="cell-sub">与该文件内容重复</div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag effect="plain">{{ row.statusLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" align="center">
        <template #default="{ row }">
          <el-button link type="primary" :disabled="dedupeSubmitting" @click="keepDedupeCandidate(row)">保留</el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button :disabled="dedupeSubmitting" @click="dedupeDialogVisible = false">取消</el-button>
      <el-button
        type="primary"
        :disabled="!dedupeCandidates.length"
        :loading="dedupeSubmitting"
        @click="confirmDedupeRemoval"
      >
        确认剔除 {{ dedupeCandidates.length }} 个
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="knowledgeDocumentPreviewVisible"
    :title="knowledgeDocumentPreviewTitle"
    width="920px"
    append-to-body
    class="knowledge-document-preview-dialog"
  >
    <div v-loading="knowledgeDocumentPreviewLoading" class="knowledge-document-preview">
      <div class="knowledge-document-preview__meta">
        <span>{{ knowledgeDocumentPreviewMeta.sourceOrg || knowledgeDocumentPreviewMeta.sourceName || 'knowledge' }}</span>
        <span v-if="knowledgeDocumentPreviewMeta.graphStatus">图谱状态：{{ knowledgeGraphStatusLabel(knowledgeDocumentPreviewMeta.graphStatus) }}</span>
        <span v-if="knowledgeDocumentPreviewMeta.updatedAt || knowledgeDocumentPreviewMeta.createdAt">
          {{ formatDateTime(knowledgeDocumentPreviewMeta.updatedAt || knowledgeDocumentPreviewMeta.createdAt) }}
        </span>
      </div>
      <pre class="knowledge-document-preview__content">{{ knowledgeDocumentPreviewContent || '暂无可预览内容' }}</pre>
    </div>
  </el-dialog>

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
                  <el-table-column label="操作" width="160" fixed="right">
                    <template #default="{ row: task }">
                      <el-button type="primary" link @click="viewTaskDetail(task)">详情</el-button>
                      <el-button
                        type="danger"
                        link
                        :loading="deletingTaskId === String(task.id)"
                        @click="handleDeleteTask(row, task)"
                      >
                        删除
                      </el-button>
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
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="toggleProjectExpanded(row)">
                {{ expandedProjectIds.includes(row.projectId) ? '收起任务' : '展开任务' }}
              </el-button>
              <el-button
                link
                type="danger"
                :loading="deletingProjectId === row.projectId"
                @click="handleDeleteProject(row)"
              >
                删除
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
    <el-form label-width="100px" class="dialog-form" @submit.prevent>
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

        <el-form class="review-form" @submit.prevent>
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

  <el-dialog v-model="knowledgeReviewDialogVisible" :title="knowledgeReviewDialogTitle" width="860px" append-to-body>
    <template v-if="selectedReviewPolicy">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="标题">{{ selectedReviewPolicy.title || '未命名资料' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="reviewStatusType(selectedReviewPolicy.reviewStatus)" effect="dark">{{ reviewStatusLabel(selectedReviewPolicy.reviewStatus) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="来源">{{ selectedReviewPolicy.sourceOrg || selectedReviewPolicy.sourceName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="来源类型">
          <el-tag :type="sourceTrustType(selectedReviewPolicy.sourceTrust)" effect="plain">{{ sourceTrustLabel(selectedReviewPolicy.sourceTrust) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发布时间">{{ selectedReviewPolicy.publishDate || '--' }}</el-descriptions-item>
        <el-descriptions-item label="匹配政策" :span="2">{{ selectedReviewPolicy.matchedPolicyName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="公开地址" :span="2">
          <a v-if="selectedReviewPolicy.sourceUrl" :href="selectedReviewPolicy.sourceUrl" target="_blank" rel="noopener noreferrer">{{ selectedReviewPolicy.sourceUrl }}</a>
          <span v-else>--</span>
        </el-descriptions-item>
        <el-descriptions-item label="AI验证" :span="2">
          {{ selectedReviewPolicy.validation?.reason || selectedReviewPolicy.sourceTrustReason || '--' }}
        </el-descriptions-item>
        <el-descriptions-item label="摘要" :span="2">{{ selectedReviewPolicy.summary || '--' }}</el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">文件内容</el-divider>
      <div v-loading="selectedReviewPolicyContentLoading" class="knowledge-review-content">
        <pre v-if="selectedReviewPolicyContent">{{ selectedReviewPolicyContent }}</pre>
        <el-empty v-else description="暂无可预览正文" />
      </div>

      <el-divider content-position="left">审核记录</el-divider>
      <el-timeline v-if="selectedReviewPolicy.reviewHistory?.length">
        <el-timeline-item
          v-for="record in selectedReviewPolicy.reviewHistory"
          :key="record.id"
          :timestamp="formatDateTime(record.createdAt)"
        >
          <div class="knowledge-review-log-title">{{ reviewActionLabel(record.action) }} · {{ record.reviewer?.name || '--' }}</div>
          <div class="cell-sub">{{ record.note || '无审核意见' }}</div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无审核记录" />

      <el-form v-if="selectedReviewPolicy.reviewStatus !== 'duplicate'" class="review-form" @submit.prevent>
        <el-form-item label="审核意见" label-width="90px">
          <el-input
            ref="knowledgeReviewNoteRef"
            v-model.trim="knowledgeReviewNote"
            type="textarea"
            :rows="4"
            :placeholder="knowledgeReviewMode === 'reject' ? '请填写审核不通过原因' : '通过可选填，不通过请填写原因'"
          />
        </el-form-item>
        <div v-if="knowledgeReviewMode === 'reject' && !knowledgeReviewNote.trim()" class="knowledge-review-required-tip">
          审核不通过必须填写原因，填写后即可提交。
        </div>
      </el-form>
    </template>
    <template #footer>
      <el-button @click="knowledgeReviewDialogVisible = false">关闭</el-button>
      <el-button
        v-if="selectedReviewPolicy?.reviewStatus === 'pending_review' || selectedReviewPolicy?.reviewStatus === 'approved'"
        type="danger"
        :disabled="!knowledgeReviewNote.trim() || reviewActionId === selectedReviewPolicy.id"
        @click="submitKnowledgeReview(selectedReviewPolicy, 'reject')"
      >
        审核不通过
      </el-button>
      <el-button
        v-if="selectedReviewPolicy?.reviewStatus === 'pending_review' || selectedReviewPolicy?.reviewStatus === 'rejected'"
        type="primary"
        :loading="reviewActionId === selectedReviewPolicy.id"
        @click="submitKnowledgeReview(selectedReviewPolicy, 'approve')"
      >
        审核通过
      </el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus';
import InspectionPlaybackWindow from './InspectionPlaybackWindow.vue';
import {
  createInspectionTask,
  deleteInspectionTask,
  deleteImportedFile,
  getImportedFilePage,
  getInspectionRouteCatalog,
  getInspectionTaskPagedList,
  getInspectionTaskRouteIssues,
  getInspectionTaskRouteTracks,
  prepareInspectionProjectImport,
  resetInspectionTaskMockData,
  reviewInspectionTaskRoute,
} from '../../api/inspectionTask';
import {
  approveReviewPolicy,
  createGraphRagIndexJob,
  deleteKnowledgeDocument,
  deleteKnowledgeStagingItem,
  getGraphRagIndexJobs,
  getKnowledgeDocumentPreview,
  getKnowledgeDocuments,
  getKnowledgeStagingItems,
  getReviewPolicies,
  getReviewPolicyContent,
  ingestKnowledgeStagingItems,
  removeChatTemporaryDocument,
  rejectReviewPolicy,
  stageKnowledgeDocumentsFromSource,
  uploadKnowledgeStagingFiles,
} from '../../api/knowledge';

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
const deletingProjectId = ref('');
const deletingTaskId = ref('');
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
let projectImportToken = 0;
let preserveImportedFileOnClose = false;

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
const knowledgePanelVisible = ref(false);
const knowledgeTab = ref('formal');
const documentLoading = ref(false);
const knowledgeDocuments = ref([]);
const pendingStagingItems = ref([]);
const chatTemporaryDocuments = ref([]);
const graphIndexJobs = ref([]);
const stagingLoading = ref(false);
const chatTemporaryLoading = ref(false);
const stagingActionId = ref('');
const chatTemporaryActionId = ref('');
const dedupeDialogVisible = ref(false);
const dedupeSubmitting = ref(false);
const dedupeMode = ref('');
const dedupeCandidates = ref([]);
const deletingDocumentId = ref('');
const indexJobCreating = ref(false);
const reviewLoading = ref(false);
const reviewPolicies = ref([]);
const reviewStatusFilter = ref('pending_review');
const reviewActionId = ref('');
const knowledgeFileInputRef = ref(null);
const knowledgeFolderInputRef = ref(null);
const knowledgeImporting = ref(false);
const knowledgeImportSummary = ref('');
const knowledgeImportPreviewVisible = ref(false);
const knowledgeImportPendingFiles = ref([]);
const knowledgeImportProgressVisible = ref(false);
const knowledgeImportJob = ref(null);
const knowledgeDocumentPreviewVisible = ref(false);
const knowledgeDocumentPreviewLoading = ref(false);
const knowledgeDocumentPreviewTitle = ref('知识库文件内容');
const knowledgeDocumentPreviewContent = ref('');
const knowledgeDocumentPreviewMeta = ref({});
const knowledgeReviewDialogVisible = ref(false);
const selectedReviewPolicy = ref(null);
const selectedReviewPolicyContent = ref('');
const selectedReviewPolicyContentLoading = ref(false);
const knowledgeReviewNote = ref('');
const knowledgeReviewMode = ref('view');
const knowledgeReviewNoteRef = ref(null);
const detailPanelVisible = ref(false);
const playbackPanelVisible = ref(false);
const playbackLoading = ref(false);
const playbackTrack = ref(null);
const playbackTask = ref(null);
const playbackRoute = ref(null);
const playbackProgress = ref(0);
const trackPlaying = ref(false);
let playbackTimer = null;
let knowledgeImportPollTimer = null;
let pendingIngestPollTimer = null;

const flatTaskList = computed(() => projectList.value.flatMap((project) => project.tasks || []));
const knowledgeImportTotalSize = computed(() => knowledgeImportPendingFiles.value.reduce((total, item) => total + (item.size || 0), 0));
const knowledgeReviewDialogTitle = computed(() => (knowledgeReviewMode.value === 'reject' ? '审核不通过' : '知识库资料审核'));
const dedupeDialogTitle = computed(() => (dedupeMode.value === 'chat' ? '聊天临时一键查重' : '上传待入库一键查重'));
const activeGraphJobStatuses = new Set(['queued', 'running']);
const failedGraphJobStatuses = new Set(['failed']);
const graphJobMap = computed(() => new Map(graphIndexJobs.value.map((job) => [job.id, job])));
function graphJobStatusForItem(item) {
  const job = item?.graphIndexJobId ? graphJobMap.value.get(item.graphIndexJobId) : null;
  return String(job?.status || '').toLowerCase();
}
function isActivePendingIngestItem(item) {
  const status = String(item?.stagingStatus || '').toLowerCase();
  const jobStatus = graphJobStatusForItem(item);
  if (['importing', 'indexing', 'index_failed'].includes(status)) return true;
  if (status !== 'imported') return false;
  return activeGraphJobStatuses.has(jobStatus) || failedGraphJobStatuses.has(jobStatus);
}
const pendingIngestItems = computed(() => pendingStagingItems.value.filter(isActivePendingIngestItem));
const pendingIngestProgress = computed(() => {
  const items = pendingIngestItems.value;
  if (!items.length) return null;
  const jobIds = [...new Set(items.map((item) => item.graphIndexJobId).filter(Boolean))];
  const jobs = graphIndexJobs.value.filter((job) => jobIds.includes(job.id));
  const failedCount = items.filter((item) => {
    const status = String(item.stagingStatus || '').toLowerCase();
    return status === 'index_failed' || failedGraphJobStatuses.has(graphJobStatusForItem(item));
  }).length;
  const importingCount = items.filter((item) => String(item.stagingStatus || '').toLowerCase() === 'importing').length;
  const indexingCount = items.filter((item) => {
    const status = String(item.stagingStatus || '').toLowerCase();
    if (status === 'indexing') return true;
    return status === 'imported' && activeGraphJobStatuses.has(graphJobStatusForItem(item));
  }).length;
  const runningJobs = jobs.filter((job) => activeGraphJobStatuses.has(String(job.status || '').toLowerCase()));
  const failedJobs = jobs.filter((job) => failedGraphJobStatuses.has(String(job.status || '').toLowerCase()));
  const completedJobs = jobs.filter((job) => String(job.status || '').toLowerCase() === 'completed');
  let percentage = 8;
  if (jobs.length) {
    percentage = Math.round(jobs.reduce((sum, job) => sum + (Number(job.progress) || 0), 0) / jobs.length);
  } else if (importingCount) {
    percentage = 25;
  } else if (indexingCount) {
    percentage = 65;
  }
  if (failedCount || failedJobs.length) percentage = Math.max(percentage, 100);
  const active = importingCount > 0 || indexingCount > 0 || runningJobs.length > 0;
  return {
    total: items.length,
    importingCount,
    indexingCount,
    failedCount,
    jobCount: jobs.length,
    completedJobCount: completedJobs.length,
    status: failedCount || failedJobs.length ? 'exception' : (active ? 'active' : 'success'),
    percentage: Math.max(0, Math.min(100, percentage)),
    message: failedCount || failedJobs.length
      ? `有 ${failedCount || failedJobs.length} 项入库失败，请查看列表状态`
      : `正在检测入库链路：解析中 ${importingCount}，建图中 ${indexingCount}，任务 ${runningJobs.length || jobs.length}`
  };
});
const playbackMax = computed(() => Math.max(0, (playbackTrack.value?.points?.length || 1) - 1));
const awaitingReviewCount = computed(() => flatTaskList.value.filter((task) => task.routes?.some((route) => route.status === 'AWAITING_REVIEW')).length);
const completedTaskCount = computed(() => flatTaskList.value.filter((task) => task.status === 'COMPLETED').length);

function setActiveAction(action) {
  if (inspectionPanelVisible.value && action !== 'inspectionTask') {
    closeInspectionPanel({ preserveActiveAction: true });
  }
  if (knowledgePanelVisible.value && action !== 'knowledgeBase') {
    closeKnowledgePanel({ preserveActiveAction: true });
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

function openKnowledgeBase() {
  if (knowledgePanelVisible.value && activeAction.value === 'knowledgeBase') {
    closeKnowledgePanel();
    return;
  }
  activeAction.value = 'knowledgeBase';
  knowledgePanelVisible.value = true;
  refreshKnowledgePanel();
}

function closeKnowledgePanel(options = {}) {
  const { preserveActiveAction = false } = options;
  knowledgePanelVisible.value = false;
  stopPendingIngestPolling();
  knowledgeReviewDialogVisible.value = false;
  selectedReviewPolicy.value = null;
  knowledgeReviewMode.value = 'view';
  if (!preserveActiveAction && activeAction.value === 'knowledgeBase') {
    activeAction.value = '';
  }
}

function handleKnowledgeTabChange() {
  if (knowledgeTab.value !== 'pending') {
    stopPendingIngestPolling();
  }
  refreshKnowledgePanel();
}

async function refreshKnowledgePanel() {
  if (knowledgeTab.value === 'formal') {
    await loadKnowledgeDocuments();
  } else if (knowledgeTab.value === 'pending') {
    await loadPendingStagingItems();
  } else if (knowledgeTab.value === 'chat') {
    await loadChatTemporaryDocuments();
  } else if (knowledgeTab.value === 'network') {
    await loadReviewPolicies();
  }
}

function openKnowledgeFileImport() {
  if (knowledgeImporting.value) return;
  if (knowledgeFileInputRef.value) {
    knowledgeFileInputRef.value.value = '';
    knowledgeFileInputRef.value.click();
  }
}

function openKnowledgeFolderImport() {
  if (knowledgeImporting.value) return;
  if (knowledgeFolderInputRef.value) {
    knowledgeFolderInputRef.value.value = '';
    knowledgeFolderInputRef.value.click();
  }
}

function handleKnowledgeImportChange(event) {
  const input = event?.target;
  const files = Array.from(input?.files || []);
  if (input) {
    input.value = '';
  }
  if (!files.length) return;

  knowledgeImportPendingFiles.value = files.map((file, index) => ({
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    name: file.name,
    relativePath: file.webkitRelativePath || file.name,
    size: file.size,
    type: file.type || '',
    extension: getFileExtension(file.name)
  }));
  knowledgeImportPreviewVisible.value = true;
}

function removeKnowledgeImportFile(row) {
  knowledgeImportPendingFiles.value = knowledgeImportPendingFiles.value.filter((item) => item.id !== row.id);
  if (!knowledgeImportPendingFiles.value.length) {
    knowledgeImportPreviewVisible.value = false;
  }
}

function clearKnowledgeImportPendingFiles() {
  knowledgeImportPendingFiles.value = [];
  knowledgeImportPreviewVisible.value = false;
}

async function confirmKnowledgeImport() {
  const pendingFiles = [...knowledgeImportPendingFiles.value];
  if (!pendingFiles.length || knowledgeImporting.value) return;

  knowledgeImporting.value = true;
  knowledgeImportSummary.value = '';
  knowledgeImportPreviewVisible.value = false;
  knowledgeImportProgressVisible.value = false;
  knowledgeImportJob.value = {
    status: 'queued',
    stage: 'queued',
    progress: 0,
    totalFiles: pendingFiles.length,
    activeFiles: pendingFiles.length,
    duplicateFilesCount: 0,
    parsedFiles: 0,
    approvedFiles: 0,
    currentFile: '',
    message: '正在上传文件到临时数据库。'
  };
  try {
    const response = await uploadKnowledgeStagingFiles({
      files: pendingFiles.map((item) => item.file),
      relativePaths: pendingFiles.map((item) => item.relativePath),
      reviewer: getCurrentReviewer(),
    });
    const summary = response?.summary || {};
    knowledgeImportSummary.value = formatKnowledgeStagingSummary(summary);
    ElMessage.success(knowledgeImportSummary.value || '上传成功，已进入上传待入库；尚未解析，AI 暂不可作为正式知识库使用');
    knowledgeTab.value = 'pending';
    await loadPendingStagingItems();
  } catch (error) {
    ElMessage.error(error?.message || '知识库文件导入失败');
  } finally {
    knowledgeImportPendingFiles.value = [];
    knowledgeImporting.value = false;
    knowledgeImportProgressVisible.value = false;
  }
}

function startKnowledgeImportPolling(jobId) {
  stopKnowledgeImportPolling();
  pollKnowledgeImportJob(jobId);
  knowledgeImportPollTimer = window.setInterval(() => {
    pollKnowledgeImportJob(jobId);
  }, 1200);
}

function stopKnowledgeImportPolling() {
  if (knowledgeImportPollTimer) {
    window.clearInterval(knowledgeImportPollTimer);
    knowledgeImportPollTimer = null;
  }
}

async function pollKnowledgeImportJob(jobId) {
  return jobId;
}

function formatKnowledgeImportSummary(summary = {}) {
  return [
    `共选择 ${summary.totalFiles ?? 0} 个文件`,
    summary.duplicateFiles ? `跳过重复 ${summary.duplicateFiles} 个` : '',
    `成功解析 ${summary.parsedFiles ?? 0} 个`,
    `自动入库 ${summary.approvedFiles ?? 0} 个`,
    `已加入图谱索引队列 ${summary.graphIndexed ?? summary.indexedFiles ?? 0} 个`,
    summary.unsupportedFiles ? `不支持 ${summary.unsupportedFiles} 个` : '',
    summary.failedFiles ? `失败 ${summary.failedFiles} 个` : '',
  ].filter(Boolean).join('，');
}

function formatKnowledgeStagingSummary(summary = {}) {
  return [
    `共选择 ${summary.totalFiles ?? 0} 个文件`,
    `进入上传待入库 ${summary.uploadedFiles ?? 0} 个`,
    summary.duplicateFiles ? `重复 ${summary.duplicateFiles} 个` : '',
    summary.failedFiles ? `失败 ${summary.failedFiles} 个` : '',
    '尚未解析，尚未进入正式知识库'
  ].filter(Boolean).join('，');
}

function normalizeDedupeText(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
}

function getDedupeKey(item = {}, mode = '') {
  if (item.contentHash) return `hash:${item.contentHash}`;
  if (mode === 'chat') {
    const text = normalizeDedupeText(item.previewContent || '');
    if (text.length >= 20) return `preview:${text.length}:${text}`;
  }
  const name = String(item.originalName || item.fileName || item.title || '').trim().toLowerCase();
  const size = Number(item.size) || 0;
  if (name && size > 0) return `name-size:${name}:${size}`;
  return '';
}

function buildDedupeCandidates(items = [], mode = '') {
  const groups = new Map();
  const candidates = [];
  for (const item of items) {
    if (mode === 'pending' && item.stagingStatus === 'duplicate') {
      candidates.push({
        ...item,
        keepId: item.duplicateOf || '已有文件',
        keepTitle: item.duplicateOf || '已有文件',
        keepOriginalName: item.duplicateOf || '已有文件',
        statusLabel: stagingStatusLabel(item.stagingStatus)
      });
      continue;
    }
    const key = getDedupeKey(item, mode);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const keep = group.find((item) => item.stagingStatus !== 'duplicate') || group[0];
    for (const item of group) {
      if (item.id === keep.id) continue;
      candidates.push({
        ...item,
        keepId: keep.id,
        keepTitle: keep.title || keep.originalName || keep.fileName || keep.id,
        keepOriginalName: keep.originalName || keep.fileName || keep.title || keep.id,
        statusLabel: mode === 'pending'
          ? stagingStatusLabel(item.stagingStatus)
          : knowledgeDocumentStatusLabel(item.inventoryStatus || item.status)
      });
    }
  }

  const seen = new Set();
  return candidates.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function openDedupeDialog(mode) {
  const items = mode === 'chat' ? chatTemporaryDocuments.value : pendingStagingItems.value;
  const candidates = buildDedupeCandidates(items, mode);
  if (!candidates.length) {
    ElMessage.success('当前列表没有发现可剔除的重复文件');
    return;
  }
  dedupeMode.value = mode;
  dedupeCandidates.value = candidates;
  dedupeDialogVisible.value = true;
}

function keepDedupeCandidate(row = {}) {
  dedupeCandidates.value = dedupeCandidates.value.filter((item) => item.id !== row.id);
}

async function confirmDedupeRemoval() {
  const candidates = [...dedupeCandidates.value];
  if (!candidates.length || dedupeSubmitting.value) return;
  dedupeSubmitting.value = true;
  const mode = dedupeMode.value;
  try {
    if (mode === 'chat') {
      chatTemporaryActionId.value = 'dedupe';
      for (const item of candidates) {
        await removeChatTemporaryDocument(item.id);
      }
      await loadChatTemporaryDocuments();
    } else {
      stagingActionId.value = 'dedupe';
      for (const item of candidates) {
        await deleteKnowledgeStagingItem(item.id);
      }
      await loadPendingStagingItems();
    }
    ElMessage.success(`已剔除 ${candidates.length} 个重复文件`);
    dedupeDialogVisible.value = false;
    dedupeCandidates.value = [];
  } catch (error) {
    ElMessage.error(error?.message || '重复文件剔除失败');
  } finally {
    dedupeSubmitting.value = false;
    stagingActionId.value = '';
    chatTemporaryActionId.value = '';
  }
}

function getFileExtension(fileName = '') {
  const index = String(fileName || '').lastIndexOf('.');
  return index >= 0 ? String(fileName).slice(index + 1).toLowerCase() : '';
}

function formatFileSize(size = 0) {
  const value = Number(size) || 0;
  if (value >= 1024 * 1024 * 1024) return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

async function loadKnowledgeDocuments() {
  documentLoading.value = true;
  try {
    const response = await getKnowledgeDocuments({ bucket: 'formal' });
    knowledgeDocuments.value = Array.isArray(response?.items) ? response.items : [];
  } catch (error) {
    knowledgeDocuments.value = [];
    ElMessage.error(error?.message || '上传文件列表加载失败');
  } finally {
    documentLoading.value = false;
  }
}

async function loadGraphIndexJobs() {
  try {
    const response = await getGraphRagIndexJobs();
    graphIndexJobs.value = Array.isArray(response?.items) ? response.items : [];
  } catch {
    graphIndexJobs.value = [];
  }
}

function stopPendingIngestPolling() {
  if (pendingIngestPollTimer) {
    window.clearInterval(pendingIngestPollTimer);
    pendingIngestPollTimer = null;
  }
}

function syncPendingIngestPolling() {
  const shouldPoll = knowledgePanelVisible.value &&
    knowledgeTab.value === 'pending' &&
    pendingIngestItems.value.some((item) => {
      const status = String(item.stagingStatus || '').toLowerCase();
      return status === 'importing' ||
        status === 'indexing' ||
        (status === 'imported' && activeGraphJobStatuses.has(graphJobStatusForItem(item)));
    });
  if (!shouldPoll) {
    stopPendingIngestPolling();
    return;
  }
  if (pendingIngestPollTimer) return;
  pendingIngestPollTimer = window.setInterval(() => {
    loadPendingStagingItems({ silent: true });
  }, 3000);
}

async function loadPendingStagingItems(options = {}) {
  const silent = Boolean(options.silent);
  if (!silent) stagingLoading.value = true;
  try {
    const [response] = await Promise.all([
      getKnowledgeStagingItems({ bucket: 'pending' }),
      loadGraphIndexJobs(),
    ]);
    pendingStagingItems.value = Array.isArray(response?.items) ? response.items : [];
    syncPendingIngestPolling();
  } catch (error) {
    pendingStagingItems.value = [];
    stopPendingIngestPolling();
    if (!silent) ElMessage.error(error?.message || '上传待入库列表加载失败');
  } finally {
    if (!silent) stagingLoading.value = false;
  }
}

async function loadChatTemporaryDocuments() {
  chatTemporaryLoading.value = true;
  try {
    const response = await getKnowledgeDocuments({ bucket: 'chat' });
    chatTemporaryDocuments.value = Array.isArray(response?.items) ? response.items : [];
  } catch (error) {
    chatTemporaryDocuments.value = [];
    ElMessage.error(error?.message || '聊天临时文件加载失败');
  } finally {
    chatTemporaryLoading.value = false;
  }
}

function knowledgeDocumentStatusLabel(status = '') {
  switch (status) {
    case 'approved':
      return '已入库';
    case 'converted':
      return '已转换';
    case 'chat_uploaded':
      return '聊天临时';
    case 'chat_upload':
      return '聊天临时';
    case 'chat_upload_needs_review':
      return '需复核';
    case 'pending_review':
      return '待审核';
    case 'duplicate':
      return '重复跳过';
    case 'rejected':
      return '已驳回';
    case 'parsing':
      return '解析中';
    case 'parsed':
      return '已解析';
    case 'ai_extract_failed':
      return 'AI抽取失败';
    case 'parse_failed':
    case 'failed':
      return '解析失败';
    case 'unsupported':
      return '不支持';
    default:
      return status || '待处理';
  }
}

function knowledgeGraphStatusLabel(status = '') {
  switch (status) {
    case 'pending_graph':
      return '待建图';
    case 'indexing':
      return '建图中';
    case 'graph_built':
    case 'indexed':
      return '已建图';
    case 'index_failed':
      return '建图失败';
    case 'not_indexed':
      return '未建图';
    default:
      return status || '--';
  }
}

function knowledgeGraphStatusType(status = '') {
  switch (status) {
    case 'graph_built':
    case 'indexed':
      return 'success';
    case 'pending_graph':
    case 'indexing':
      return 'warning';
    case 'index_failed':
      return 'danger';
    default:
      return 'info';
  }
}

function stagingStatusLabel(status = '') {
  switch (status) {
    case 'uploaded_pending':
      return '已上传';
    case 'importing':
      return '解析中';
    case 'indexing':
      return '建图中';
    case 'index_failed':
      return '建图失败';
    case 'imported':
      return '等待建图';
    case 'duplicate':
      return '重复';
    case 'failed':
      return '失败';
    case 'needs_review':
      return '需复核';
    default:
      return status || '待处理';
  }
}

function stagingStatusType(status = '') {
  switch (status) {
    case 'uploaded_pending':
    case 'importing':
    case 'indexing':
    case 'imported':
      return 'warning';
    case 'duplicate':
      return 'info';
    case 'failed':
    case 'needs_review':
    case 'index_failed':
      return 'danger';
    default:
      return 'info';
  }
}

function knowledgeDocumentStatusType(status = '') {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending_review':
    case 'parsing':
    case 'parsed':
      return 'warning';
    case 'duplicate':
    case 'unsupported':
      return 'info';
    case 'rejected':
    case 'ai_extract_failed':
    case 'parse_failed':
    case 'failed':
      return 'danger';
    default:
      return 'info';
  }
}

function buildKnowledgeDocumentMetaText(row = {}) {
  return [
    `文件：${row.title || row.originalName || row.fileName || row.id || '--'}`,
    `文档 ID：${row.id || '--'}`,
    row.documentId ? `正式文档 ID：${row.documentId}` : '',
    row.reviewCandidateId ? `审核记录 ID：${row.reviewCandidateId}` : '',
    row.parseRunId ? `解析任务 ID：${row.parseRunId}` : '',
    `来源：${row.sourceOrg || row.sourceName || row.parser || '--'}`,
    `状态：${knowledgeDocumentStatusLabel(row.status || row.inventoryStatus)}`,
    `入图状态：${row.graphStatus || '--'}`,
    `时间：${formatDateTime(row.approvedAt || row.createdAt || row.updatedAt)}`,
    row.error ? `错误：${row.error}` : '',
    row.sourceUrl ? `公开地址：${row.sourceUrl}` : '',
  ].filter(Boolean).join('\n');
}

async function showKnowledgeDocumentInfo(row = {}) {
  if (!row?.id) return;
  knowledgeDocumentPreviewTitle.value = row.title || row.originalName || row.fileName || row.id || '知识库文件内容';
  knowledgeDocumentPreviewMeta.value = row;
  knowledgeDocumentPreviewContent.value = '';
  knowledgeDocumentPreviewVisible.value = true;
  knowledgeDocumentPreviewLoading.value = true;
  try {
    const response = await getKnowledgeDocumentPreview(row.id);
    const previewContent = String(response?.preview?.content || response?.content || row.previewContent || '').trim();
    knowledgeDocumentPreviewMeta.value = {
      ...row,
      ...(response?.item || {}),
    };
    knowledgeDocumentPreviewContent.value = previewContent || [
      buildKnowledgeDocumentMetaText(row),
      '',
      '暂无可预览内容。'
    ].join('\n');
  } catch (error) {
    knowledgeDocumentPreviewContent.value = [
      buildKnowledgeDocumentMetaText(row),
      '',
      `预览加载失败：${error?.message || '未知错误'}`
    ].join('\n');
  } finally {
    knowledgeDocumentPreviewLoading.value = false;
  }
}

function showStagingItemInfo(row = {}) {
  const content = [
    `文件：${row.originalName || row.fileName || row.id || '--'}`,
    `暂存 ID：${row.id || '--'}`,
    `相对路径：${row.relativePath || '--'}`,
    `状态：${stagingStatusLabel(row.stagingStatus)}`,
    `大小：${formatFileSize(row.size)}`,
    `上传人：${row.uploadedBy || '--'}`,
    `上传时间：${formatDateTime(row.uploadedAt || row.createdAt)}`,
    row.duplicateOf ? `重复对象：${row.duplicateOf}` : '',
    row.error ? `错误：${row.error}` : '',
    `原始文件：${row.rawUri || row.rawPath || row.rawObjectKey || '--'}`,
  ].filter(Boolean).join('\n');
  ElMessageBox.alert(content, '上传待入库文件详情', {
    confirmButtonText: '知道了',
    customClass: 'knowledge-document-info-dialog',
  });
}

async function ingestStagingItem(row = {}) {
  if (!row?.id || stagingActionId.value) return;
  try {
    await ElMessageBox.confirm(
      `确定将“${row.originalName || row.fileName || row.id}”正式入库吗？系统会开始解析、转 Markdown、生成 Passage / Relation，并启动 GraphRAG / Neo4j 建图；建图完成前 AI 仍不会把它作为正式知识库来源。`,
      '确认正式入库',
      {
        type: 'warning',
        confirmButtonText: '开始入库',
        cancelButtonText: '取消',
      }
    );
  } catch {
    return;
  }

  stagingActionId.value = row.id;
  try {
    pendingStagingItems.value = pendingStagingItems.value.map((item) => (
      item.id === row.id ? { ...item, stagingStatus: 'importing' } : item
    ));
    syncPendingIngestPolling();
    const response = await ingestKnowledgeStagingItems({
      stagingIds: [row.id],
      trigger: 'manual',
    });
    const importedFiles = response?.summary?.importedFiles ?? response?.items?.length ?? 0;
    if (importedFiles > 0) {
      ElMessage.success('已启动入库和建图任务；完成 GraphRAG / Neo4j 后才会进入正式索引');
      await loadPendingStagingItems();
    } else {
      ElMessage.warning(response?.warnings?.[0] || '入库任务未启动，请查看详情');
      await loadPendingStagingItems();
    }
  } catch (error) {
    ElMessage.error(error?.message || '入库任务启动失败');
    await loadPendingStagingItems();
  } finally {
    stagingActionId.value = '';
  }
}

async function ingestAllPendingStagingItems() {
  if (stagingActionId.value) return;
  const eligibleItems = pendingStagingItems.value.filter((item) => item.stagingStatus === 'uploaded_pending');
  if (!eligibleItems.length) {
    ElMessage.warning('当前没有可入库的待上传文件');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定一键入库 ${eligibleItems.length} 个待入库文件吗？系统会逐个解析并启动 GraphRAG / Neo4j 建图；建图完成前这些文件不会出现在正式索引，也不会作为 AI 默认知识库来源。`,
      '确认一键入库',
      {
        type: 'warning',
        confirmButtonText: '开始入库',
        cancelButtonText: '取消',
      }
    );
  } catch {
    return;
  }

  stagingActionId.value = 'ingest-all';
  try {
    const eligibleIds = new Set(eligibleItems.map((item) => item.id));
    pendingStagingItems.value = pendingStagingItems.value.map((item) => (
      eligibleIds.has(item.id) ? { ...item, stagingStatus: 'importing' } : item
    ));
    syncPendingIngestPolling();
    const response = await ingestKnowledgeStagingItems({
      stagingIds: [...eligibleIds],
      trigger: 'manual_batch',
    });
    const importedFiles = response?.summary?.importedFiles ?? response?.items?.length ?? 0;
    if (importedFiles > 0) {
      ElMessage.success(`已启动 ${importedFiles} 个文件的入库和建图任务；完成 GraphRAG / Neo4j 后才会进入正式索引`);
    } else {
      ElMessage.warning(response?.warnings?.[0] || '没有文件进入入库链路');
    }
    await loadPendingStagingItems();
  } catch (error) {
    ElMessage.error(error?.message || '一键入库任务启动失败');
    await loadPendingStagingItems();
  } finally {
    stagingActionId.value = '';
  }
}

async function stageChatTemporaryDocument(row = {}) {
  if (!row?.id || chatTemporaryActionId.value) return;
  try {
    await ElMessageBox.confirm(
      `确定将聊天临时文件“${row.title || row.originalName || row.fileName || row.id}”上传到待入库吗？这一步只会进入“上传待入库”，不会直接解析成正式知识库。`,
      '上传到待入库',
      {
        type: 'warning',
        confirmButtonText: '上传到待入库',
        cancelButtonText: '取消',
      }
    );
  } catch {
    return;
  }

  chatTemporaryActionId.value = `stage:${row.id}`;
  try {
    const response = await stageKnowledgeDocumentsFromSource({
      sourceIds: [row.id],
      source: 'chat_upload',
      reviewer: getCurrentReviewer(),
    });
    const stagedCount = response?.summary?.uploadedFiles ?? response?.items?.length ?? 0;
    if (stagedCount > 0) {
      ElMessage.success('已上传到待入库；尚未解析，尚未成为 AI 可用的正式知识库');
      knowledgeTab.value = 'pending';
      await loadPendingStagingItems();
    } else {
      ElMessage.warning(response?.warnings?.[0] || '未能上传到待入库');
    }
    await loadChatTemporaryDocuments();
  } catch (error) {
    ElMessage.error(error?.message || '上传到待入库失败');
  } finally {
    chatTemporaryActionId.value = '';
  }
}

async function stageAllChatTemporaryDocuments() {
  if (!chatTemporaryDocuments.value.length || chatTemporaryActionId.value) return;
  try {
    await ElMessageBox.confirm(
      `确定将 ${chatTemporaryDocuments.value.length} 个聊天临时文件上传到待入库吗？这一步不会正式入库，也不会让 AI 默认使用这些文件。`,
      '一键上传到待入库',
      {
        type: 'warning',
        confirmButtonText: '上传到待入库',
        cancelButtonText: '取消',
      }
    );
  } catch {
    return;
  }

  chatTemporaryActionId.value = 'stage-all';
  try {
    const response = await stageKnowledgeDocumentsFromSource({
      sourceIds: chatTemporaryDocuments.value.map((item) => item.id).filter(Boolean),
      source: 'chat_upload',
      reviewer: getCurrentReviewer(),
    });
    const stagedCount = response?.summary?.uploadedFiles ?? response?.items?.filter((item) => item.stagingStatus === 'uploaded_pending').length ?? 0;
    const duplicateCount = response?.summary?.duplicateFiles ?? response?.items?.filter((item) => item.stagingStatus === 'duplicate').length ?? 0;
    if (stagedCount > 0 || duplicateCount > 0) {
      ElMessage.success(`已处理 ${stagedCount + duplicateCount} 个聊天临时文件，其中 ${stagedCount} 个已上传到待入库；尚未正式入库`);
      knowledgeTab.value = 'pending';
      await loadPendingStagingItems();
    } else {
      ElMessage.warning(response?.warnings?.[0] || '没有可上传到待入库的聊天临时文件');
    }
    await loadChatTemporaryDocuments();
  } catch (error) {
    ElMessage.error(error?.message || '一键上传失败');
  } finally {
    chatTemporaryActionId.value = '';
  }
}

async function removeChatTemporaryFile(row = {}) {
  if (!row?.id || chatTemporaryActionId.value) return;
  try {
    await ElMessageBox.confirm(
      `确定移除聊天临时文件“${row.title || row.originalName || row.fileName || row.id}”吗？这只会移除聊天临时文件，不会删除正式索引文件。`,
      '移除聊天临时文件',
      {
        type: 'warning',
        confirmButtonText: '移除',
        cancelButtonText: '取消',
      }
    );
  } catch {
    return;
  }

  chatTemporaryActionId.value = `remove:${row.id}`;
  try {
    await removeChatTemporaryDocument(row.id);
    ElMessage.success('聊天临时文件已移除');
    await loadChatTemporaryDocuments();
  } catch (error) {
    ElMessage.error(error?.message || '聊天临时文件移除失败');
  } finally {
    chatTemporaryActionId.value = '';
  }
}

async function confirmDeleteKnowledgeDocument(row = {}) {
  if (!row?.id || deletingDocumentId.value) return;
  try {
    await ElMessageBox.confirm(
      `确定删除正式索引文件“${row.title || row.originalName || row.fileName || row.id}”吗？删除后 AI 将不再把它作为正式知识库来源，并会触发 GraphRAG / Neo4j 重建。`,
      '删除知识库文件',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      }
    );
  } catch {
    return;
  }

  deletingDocumentId.value = row.id;
  try {
    const response = await deleteKnowledgeDocument(row.id);
    ElMessage.success(response?.indexJob?.id ? '已删除文件，并加入图谱索引重建队列' : '已从上传文件列表删除');
    await loadKnowledgeDocuments();
  } catch (error) {
    ElMessage.error(error?.message || '文件删除失败');
  } finally {
    deletingDocumentId.value = '';
  }
}

async function createManualGraphIndexJob() {
  if (indexJobCreating.value) return;
  try {
    await ElMessageBox.confirm(
      '确定手动触发正式索引全量重建吗？重建过程中正式知识库仍可查看，但图谱状态和检索结果可能需要等待任务完成后更新。',
      '手动触发全量重建',
      {
        type: 'warning',
        confirmButtonText: '触发重建',
        cancelButtonText: '取消',
      }
    );
  } catch {
    return;
  }

  indexJobCreating.value = true;
  try {
    const response = await createGraphRagIndexJob({
      trigger: 'manual',
      scope: 'full_rebuild',
      documentIds: [],
      reason: 'Manual rebuild from UI',
      executionMode: 'immediate',
    });
    const job = response?.item || response?.job;
    ElMessage.success('已加入图谱索引队列');
    await loadKnowledgeDocuments();
  } catch (error) {
    ElMessage.error(error?.message || '图谱索引任务创建失败');
  } finally {
    indexJobCreating.value = false;
  }
}

async function loadReviewPolicies() {
  reviewLoading.value = true;
  try {
    const response = await getReviewPolicies({
      status: reviewStatusFilter.value,
    });
    reviewPolicies.value = Array.isArray(response?.items) ? response.items : [];
  } catch (error) {
    reviewPolicies.value = [];
    ElMessage.error(error?.message || '审核列表加载失败');
  } finally {
    reviewLoading.value = false;
  }
}

async function openKnowledgeReview(row) {
  selectedReviewPolicy.value = row;
  knowledgeReviewNote.value = row.reviewNote || '';
  knowledgeReviewMode.value = 'view';
  knowledgeReviewDialogVisible.value = true;
  await loadReviewPolicyContent(row);
}

function openKnowledgeReject(row) {
  selectedReviewPolicy.value = row;
  knowledgeReviewNote.value = '';
  knowledgeReviewMode.value = 'reject';
  knowledgeReviewDialogVisible.value = true;
  loadReviewPolicyContent(row);
  nextTick(() => {
    knowledgeReviewNoteRef.value?.focus?.();
  });
}

async function loadReviewPolicyContent(row) {
  if (!row?.id) {
    selectedReviewPolicyContent.value = '';
    return;
  }

  selectedReviewPolicyContentLoading.value = true;
  try {
    const response = await getReviewPolicyContent(row.id);
    selectedReviewPolicy.value = response?.item || row;
    selectedReviewPolicyContent.value = response?.content || '';
  } catch (error) {
    selectedReviewPolicyContent.value = '';
    ElMessage.warning(error?.message || '资料正文加载失败');
  } finally {
    selectedReviewPolicyContentLoading.value = false;
  }
}

async function submitKnowledgeReview(row, action) {
  if (!row?.id) return;
  if (action === 'reject' && !knowledgeReviewNote.value.trim()) {
    selectedReviewPolicy.value = row;
    knowledgeReviewDialogVisible.value = true;
    ElMessage.warning('审核不通过请填写原因');
    return;
  }
  if (action === 'approve') {
    try {
      await ElMessageBox.confirm(
        `确定审核通过“${row.title || row.id}”吗？审核通过只代表资料可信，后续会进入“上传待入库”，不会直接进入正式索引。`,
        '网络资料审核通过',
        {
          type: 'warning',
          confirmButtonText: '审核通过',
          cancelButtonText: '取消',
        }
      );
    } catch {
      return;
    }
  }

  reviewActionId.value = row.id;
  try {
    const payload = {
      reviewNote: knowledgeReviewNote.value,
      reviewer: getCurrentReviewer(),
    };
    if (action === 'approve') {
      const response = await approveReviewPolicy(row.id, payload);
      const stagedCount = response?.staging?.summary?.uploadedFiles ?? 0;
      const duplicateCount = response?.staging?.summary?.duplicateFiles ?? 0;
      if (stagedCount > 0) {
        ElMessage.success('审核通过，已进入上传待入库；尚未正式入库');
        knowledgeTab.value = 'pending';
        await loadPendingStagingItems();
      } else if (duplicateCount > 0) {
        ElMessage.warning('审核通过，但资料与已有文件重复，已在上传待入库中标记为重复');
        knowledgeTab.value = 'pending';
        await loadPendingStagingItems();
      } else {
        ElMessage.warning(response?.staging?.warnings?.[0] || '审核通过，但未生成待入库文件，请检查资料正文');
      }
    } else {
      await rejectReviewPolicy(row.id, payload);
      ElMessage.success('已审核不通过');
    }
    knowledgeReviewDialogVisible.value = false;
    selectedReviewPolicy.value = null;
    knowledgeReviewNote.value = '';
    knowledgeReviewMode.value = 'view';
    await loadReviewPolicies();
  } catch (error) {
    ElMessage.error(error?.message || '审核操作失败');
  } finally {
    reviewActionId.value = '';
  }
}

function getCurrentReviewer() {
  const name = localStorage.getItem('userName') || '当前账号';
  return {
    id: name,
    name,
    type: 'user',
  };
}

function reviewStatusLabel(status) {
  const labels = {
    pending_review: '未审核',
    approved: '已通过',
    rejected: '未通过',
    duplicate: '重复',
  };
  return labels[status] || status || '未知';
}

function reviewStatusType(status) {
  if (status === 'approved') return 'success';
  if (status === 'pending_review') return 'warning';
  if (status === 'rejected') return 'danger';
  if (status === 'duplicate') return 'info';
  return 'info';
}

function sourceTrustLabel(value) {
  if (value === 'government_official') return '政府官方';
  if (value === 'non_official') return '非官方';
  return '未知来源';
}

function sourceTrustType(value) {
  if (value === 'government_official') return 'success';
  if (value === 'non_official') return 'warning';
  return 'info';
}

function getLastReviewLog(row = {}) {
  const history = Array.isArray(row.reviewHistory) ? row.reviewHistory : [];
  return history.length ? history[history.length - 1] : null;
}

function getLastReviewer(row = {}) {
  return getLastReviewLog(row)?.reviewer || null;
}

function reviewActionLabel(action) {
  if (action === 'approved_to_rejected') return '改为不通过';
  const labels = {
    created: '创建待审核',
    auto_approved: 'AI自动通过',
    approved: '审核通过',
    rejected: '审核不通过',
    duplicate: '标记重复',
  };
  return labels[action] || action || '审核记录';
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
      isContainTask: true,
    });
    projectList.value = list.map((item) => ({
      ...item,
      projectId: String(item.projectId ?? item.id ?? item.fileId ?? ''),
      fileId: String(item.fileId ?? item.id ?? item.projectId ?? ''),
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

async function reloadExpandedProjectTasks(projectId) {
  const target = projectList.value.find((item) => item.projectId === projectId);
  if (!target) {
    expandedProjectIds.value = expandedProjectIds.value.filter((item) => item !== projectId);
    return;
  }

  expandedProjectIds.value = [projectId];
  await nextTick();
  await loadProjectTasks(projectId, target.fileId);
}

async function handleDeleteProject(project) {
  const projectId = String(project?.projectId || '').trim();
  const fileId = String(project?.fileId || '').trim();
  if (!projectId || !fileId) {
    ElMessage.error('当前工程缺少必要标识，无法删除');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定删除工程“${project.projectName || projectId}”吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch {
    return;
  }

  deletingProjectId.value = projectId;
  try {
    await deleteImportedFile(fileId);
    expandedProjectIds.value = expandedProjectIds.value.filter((item) => item !== projectId);
    delete taskPaginationMap[projectId];
    delete taskLoadingMap[projectId];

    if (detailTask.value?.projectId === projectId) {
      detailTask.value = null;
      detailPanelVisible.value = false;
      selectedTaskId.value = '';
    }

    if (projectList.value.length === 1 && projectPagination.page > 1) {
      projectPagination.page -= 1;
    }

    await loadTasks();
    ElMessage.success('工程已删除');
  } catch (error) {
    ElMessage.error(error?.message || '删除工程失败');
  } finally {
    deletingProjectId.value = '';
  }
}

async function handleDeleteTask(project, task) {
  const projectId = String(project?.projectId || '').trim();
  const fileId = String(project?.fileId || '').trim();
  const taskId = String(task?.id ?? '').trim();
  if (!projectId || !fileId) {
    ElMessage.error('当前工程缺少必要标识，无法删除任务');
    return;
  }
  if (!taskId) {
    ElMessage.error('当前任务缺少任务 ID，无法删除');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定删除任务“${task.taskName || taskId}”吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch {
    return;
  }

  deletingTaskId.value = taskId;
  try {
    await deleteInspectionTask(taskId);

    if (selectedTaskId.value === taskId) {
      selectedTaskId.value = '';
      detailTask.value = null;
      detailPanelVisible.value = false;
    }

    if (playbackTask.value?.id === taskId) {
      closePlaybackPanel();
    }

    const pageState = getTaskPageState(projectId);
    const currentTotal = Number(pageState.total || project.taskCount || 0);
    const nextTotal = Math.max(0, currentTotal - 1);
    const maxPage = Math.max(1, Math.ceil(nextTotal / pageState.pageSize));
    if (pageState.page > maxPage) {
      pageState.page = maxPage;
    }

    await loadTasks();
    await reloadExpandedProjectTasks(projectId);
    ElMessage.success('任务已删除');
  } catch (error) {
    ElMessage.error(error?.message || '删除任务失败');
  } finally {
    deletingTaskId.value = '';
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
  preserveImportedFileOnClose = false;
  createDialogVisible.value = true;
}

async function resetProjectUpload() {
  projectUploadRef.value?.clearFiles?.();
  projectUploadKey.value += 1;
  await nextTick();
}

async function resetProjectZipState() {
  createSubmitting.value = false;
  createForm.zipFile = null;
  createForm.zipFileName = '';
  createForm.importedFileId = '';
  await resetProjectUpload();
}

async function clearProjectZip(options = {}) {
  const {
    removeImportedFile = true,
    silent = false,
    preserveStateOnDeleteFailure = !silent,
  } = options;
  const importedFileId = String(createForm.importedFileId || '').trim();
  projectImportToken += 1;

  if (removeImportedFile && importedFileId) {
    try {
      await deleteImportedFile(importedFileId);
    } catch (error) {
      if (silent) {
        console.error('Failed to delete imported file:', error);
      } else {
        ElMessage.error(error?.message || '移除工程文件失败');
      }
      if (preserveStateOnDeleteFailure) {
        return false;
      }
    }
  }

  await resetProjectZipState();
  if (!silent && removeImportedFile && importedFileId) {
    ElMessage.success('工程文件已移除');
  }
  return true;
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

  const uploadToken = ++projectImportToken;
  createSubmitting.value = true;
  try {
    createForm.zipFile = rawFile;
    createForm.zipFileName = rawFile.name;
    if (!createForm.projectName.trim()) {
      createForm.projectName = String(rawFile.name || '').replace(/\.zip$/i, '');
    }

    const { fileId } = await prepareInspectionProjectImport(rawFile);
    if (uploadToken !== projectImportToken) {
      try {
        await deleteImportedFile(fileId);
      } catch (cleanupError) {
        console.error('Failed to delete stale imported file:', cleanupError);
      }
      return;
    }
    createForm.importedFileId = fileId;
    ElMessage.success(`工程文件解析并导入成功，FileId：${fileId}`);
  } catch (error) {
    if (uploadToken !== projectImportToken) {
      return;
    }
    await resetProjectZipState();
    ElMessage.error(error?.message || '工程文件导入失败');
  } finally {
    if (uploadToken === projectImportToken) {
      createSubmitting.value = false;
    }
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
    const importedFileId = createForm.importedFileId;
    const result = await createInspectionTask({
      projectName: createForm.projectName,
      fileName: createForm.zipFileName,
      fileId: importedFileId,
      deadline: createForm.deadline,
      remark: createForm.remark,
    });
    preserveImportedFileOnClose = true;
    createDialogVisible.value = false;
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
      const shouldPreserveImportedFile = preserveImportedFileOnClose;
      preserveImportedFileOnClose = false;
      createForm.projectName = '';
      createForm.deadline = '';
      createForm.remark = '';
      await clearProjectZip({
        removeImportedFile: !shouldPreserveImportedFile,
        silent: true,
        preserveStateOnDeleteFailure: false,
      });
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

watch(
  () => knowledgeReviewDialogVisible.value,
  (value) => {
    if (!value) {
      selectedReviewPolicy.value = null;
      selectedReviewPolicyContent.value = '';
      selectedReviewPolicyContentLoading.value = false;
      knowledgeReviewNote.value = '';
      knowledgeReviewMode.value = 'view';
    }
  }
);

onMounted(async () => {
  await ensureBaseData();
});

onBeforeUnmount(() => {
  stopPlaybackTimer();
  stopKnowledgeImportPolling();
  stopPendingIngestPolling();
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

.knowledge-layout {
  position: fixed;
  top: calc(var(--map-topbar-height, 50px) + var(--map-module-toolbar-height, 60px));
  right: 0;
  bottom: 0;
  left: 0;
  width: 100vw;
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

.knowledge-panel {
  width: 100%;
  height: 100%;
  max-height: 100%;
  border-radius: 0;
  border: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.95));
  box-shadow: none;
  overflow: hidden;
}

.knowledge-tabs {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

:deep(.knowledge-tabs .el-tabs__header) {
  flex: 0 0 auto;
  order: 0;
  margin: 0 0 12px;
}

:deep(.knowledge-panel > .el-card__header) {
  padding: 14px 22px;
  border-bottom: 1px solid #e5edf7;
  background: linear-gradient(180deg, #f8fbff, #ffffff);
}

:deep(.knowledge-panel > .el-card__body) {
  height: calc(100% - 78px);
  min-height: 0;
  padding: 14px 18px 18px;
  box-sizing: border-box;
}

:deep(.knowledge-tabs .el-tabs__content) {
  flex: 1;
  min-height: 0;
  order: 1;
  overflow: hidden;
}

:deep(.knowledge-tabs .el-tab-pane) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.knowledge-import-input {
  display: none;
}

.knowledge-import-summary {
  flex: 0 0 auto;
  margin-bottom: 12px;
}

.knowledge-ingest-progress {
  flex: 0 0 auto;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
}

.knowledge-ingest-progress__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: #334155;
  font-size: 13px;
}

.knowledge-import-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #475569;
  font-size: 13px;
}

.knowledge-import-progress {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.knowledge-import-progress__message {
  min-height: 22px;
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
}

.knowledge-import-duplicates {
  max-height: 120px;
  overflow: auto;
  padding: 10px 12px;
  border: 1px solid #fde68a;
  border-radius: 8px;
  background: #fffbeb;
}

.knowledge-document-preview {
  min-height: 420px;
}

.knowledge-document-preview__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-bottom: 12px;
  color: #64748b;
  font-size: 12px;
}

.knowledge-document-preview__content {
  height: 62vh;
  max-height: 680px;
  min-height: 360px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #1e293b;
  font-family: Consolas, "Microsoft YaHei", monospace;
  font-size: 13px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.knowledge-index-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.knowledge-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.knowledge-browse-grid {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(420px, 0.95fr) minmax(0, 1.35fr);
  gap: 14px;
  height: auto;
  min-height: 0;
}

.knowledge-dataset-list,
.knowledge-document-table {
  min-height: 0;
  padding: 14px;
  border: 1px solid #e3ebf5;
  border-radius: 8px;
  background: #ffffff;
}

.knowledge-document-table {
  display: flex;
  flex-direction: column;
}

.knowledge-document-table--fill {
  flex: 1;
  min-height: 0;
}

.knowledge-document-table :deep(.el-table) {
  flex: 1;
  min-height: 0;
}

.knowledge-dataset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.knowledge-browse-grid--files-only {
  grid-template-columns: minmax(0, 1fr);
}

.knowledge-section-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.knowledge-review-head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.knowledge-review-count {
  color: #64748b;
  font-size: 12px;
}

.knowledge-review-log-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.knowledge-review-content {
  min-height: 160px;
  max-height: 320px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  padding: 12px;
}

.knowledge-review-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  color: #334155;
}

.knowledge-review-required-tip {
  margin: -10px 0 0 90px;
  color: #dc2626;
  font-size: 12px;
  line-height: 1.6;
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
  flex-wrap: wrap;
  justify-content: flex-end;
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
