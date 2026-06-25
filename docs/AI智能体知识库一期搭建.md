# AI智能体知识库一期搭建

## 1. 一期目标

一期目标是建设一套部署在本地、可通过外网服务器采集政策的企业工程政策知识库系统，作为当前前端 AI 对话窗口的后端能力中心。

一期优先解决的问题：

- 如何稳定采集政策原文与附件
- 如何完成原文解析、OCR 增强、AI 辅助抽取、审核、入库
- 如何向前端提供带引用的政策问答
- 如何实现原文追溯、依据比对、资料归档、模板生成和工程文档复刻

一期不以“控制地图和网页”为主目标，该能力在二期扩展。

## 2. 一期施工图

```text
┌──────────────────────────────────────────────────────────────┐
│ 接入层：当前 Vue 前端 + SmartAnalysis 对话窗口               │
│ → 统一知识问答入口                                           │
│ → 展示回答 / 引用卡片 / 原文预览 / 比对结果 / 模板输出       │
├──────────────────────────────────────────────────────────────┤
│ API中台层：Node.js 统一业务接口                              │
│ → /api/knowledge/chat                                        │
│ → /api/knowledge/search                                      │
│ → /api/knowledge/document/:id                                │
│ → /api/knowledge/document/:id/preview                        │
│ → /api/template/generate                                     │
│ → /api/archive/save                                          │
│ → /api/crawler/sources                                       │
│ → /api/crawler/jobs                                          │
│ → /api/crawler/parse-runs                                    │
├──────────────────────────────────────────────────────────────┤
│ 调度层：OpenClaw Agent                                       │
│ → 知识库检索编排                                             │
│ → 长文阅读与引用拼装                                         │
│ → 政策依据比对                                               │
│ → 模板生成编排                                               │
│ → 工程文档复刻编排                                           │
│ → 资料归档编排                                               │
├──────────────────────────────────────────────────────────────┤
│ 能力工具层                                                   │
│ → RAGFlow 检索工具                                           │
│ → 原文读取工具                                               │
│ → 引用抽取工具                                               │
│ → 模板渲染工具                                               │
│ → 文档生成工具                                               │
│ → 归档写入工具                                               │
│ → OCR 工具                                                   │
│ → AI 结构化抽取工具                                          │
├──────────────────────────────────────────────────────────────┤
│ 知识库层：RAGFlow                                            │
│ ① 工程样例库                                                 │
│ ② 自然资源政策库                                             │
│ ③ 平台功能库                                                 │
├──────────────────────────────────────────────────────────────┤
│ 采集入库层：政策爬虫 + 审核入库 + 元数据管理                 │
│ → 外网政策站点采集                                           │
│ → 正文/附件下载                                              │
│ → 规则解析 + OCR + AI 辅助抽取                               │
│ → 去重、审核、时效标注、版本关系                             │
│ → 入 RAGFlow / 入 PostgreSQL / 入 MinIO                      │
├──────────────────────────────────────────────────────────────┤
│ 推理层：本地大模型                                           │
│ → 知识问答                                                   │
│ → 条款摘要                                                   │
│ → 引用生成                                                   │
│ → 比对分析                                                   │
│ → 模板草拟                                                   │
│ → OCR / 视觉理解                                             │
│ → 文档结构化抽取                                             │
├──────────────────────────────────────────────────────────────┤
│ 存储层：Obsidian + MinIO + PostgreSQL/空间数据库             │
│ → Obsidian：知识笔记、双向链接、归档目录                     │
│ → MinIO：PDF/DOC/DOCX/HTML 原文与附件                        │
│ → PostgreSQL：元数据、审核状态、版本关系、任务记录           │
└──────────────────────────────────────────────────────────────┘
```

## 3. 一期核心能力清单

### 3.1 政策采集与入库

- 配置政策来源站点
- 定时抓取政策列表与详情页
- 下载正文与附件
- 解析 PDF、DOC、DOCX、HTML、图片类文件
- 去重、审核、版本管理、时效标注

### 3.2 文档解析增强链

一期解析链已明确升级为：

```text
原始文件
  -> 文件类型识别
  -> 规则解析
  -> OCR 提取
  -> AI 结构化抽取
  -> Markdown 标准化
  -> 审核入库
```

当前解析增强目标包括：

- 扫描版 PDF
- 图片附件
- 公文截图
- 表格截图
- HTML 页面正文与元数据

### 3.3 知识库建设

- 工程样例库
- 自然资源政策库
- 平台功能库

### 3.4 智能问答

- 政策问答
- 条款引用
- 原文预览
- 相关文档追溯

### 3.5 业务输出能力

- 依据比对
- 资料归档
- 模板生成
- 工程文档复刻

## 4. 一期数据流

```text
政策网站
  -> 爬虫采集
  -> 原文下载
  -> 规则解析
  -> OCR 增强
  -> AI 辅助结构化抽取
  -> 审核入库
  -> 写入 MinIO / PostgreSQL / RAGFlow / Obsidian

用户在 SmartAnalysis 提问
  -> Node.js API中台
  -> OpenClaw 调度
  -> 调 RAGFlow 检索
  -> 调本地模型生成回答
  -> 返回回答 + 引用 + 原文预览 + 比对结果
  -> 前端展示
```

## 5. 一期当前模型分工

结合当前局域网 Ollama 模型现状，一期默认分工如下：

- 基础问答模型：`qwen2.5:32b-instruct-q4_K_M`
- 结构化抽取模型：`qwen2.5:32b-instruct-q4_K_M`
- 复杂推理预留模型：`qwen3.6:35b-a3b-q4_K_M`
- 视觉/OCR 模型：`qwen2.5vl:7b`
- Embedding 模型：`bge-m3:latest`

对应运行时环境变量：

- `OLLAMA_CHAT_MODEL`
- `OLLAMA_EXTRACT_MODEL`
- `OLLAMA_REASONING_MODEL`
- `OLLAMA_VISION_MODEL`
- `OLLAMA_EMBEDDING_MODEL`

## 6. 一期已完成骨架能力

截至当前，一期后端已完成以下骨架和基础链路：

### 6.1 基础后端

- `knowledge-server` 后端骨架
- `/api/health`
- `/api/knowledge/health`
- 日志、配置、目录初始化

### 6.2 基础存储

- PostgreSQL 已接入
- MinIO 已接入
- 本地 `storage` 目录已接入

### 6.3 本地模型接入

- 已切到局域网 Ollama
- 已完成模型角色化分工
- `/api/knowledge/models` 可用
- `/api/knowledge/chat` 已具备基础问答能力

### 6.4 政策来源配置

- `/api/crawler/sources`
- 来源配置持久化到 `storage/config/policy-sources.json`

### 6.5 采集任务

- `/api/crawler/jobs`
- 能创建真实采集任务
- 能抓取列表页与详情页
- 原始 HTML 已能落盘

### 6.6 文档解析

- `/api/crawler/parse-runs`
- HTML 已能规则解析
- 已能生成 Markdown
- 已接入 AI 辅助结构化抽取
- 已具备 OCR 层接口和视觉模型调用结构

### 6.7 审核入库基础版

- `/api/review/policies/from-parse-run`
- `/api/review/policies`
- `/api/review/policies/:id`
- `/api/review/policies/:id/approve`
- `/api/review/policies/:id/reject`
- `/api/review/policies/:id/mark-duplicate`
- `/api/review/documents`
- `/api/review/documents/:id`

当前已支持：

- 从 `parseRun` 生成待审核候选
- 基础去重判断
- 审核通过 / 驳回 / 标记重复
- 审核通过后形成正式文档记录
- 将最终 Markdown 复制到 `storage/markdown/approved`

当前状态说明：

- `T7` 已完成基础入库版
- 已能完成 `parseRun -> review candidate -> approved document` 的状态流转
- 已补充人工修订元数据接口
- 已补充 `T7` 烟测脚本
- 但当前仍不应视为“企业级完整审核台已全部完成”

### 6.8 RAGFlow 三套知识库

当前已完成三套知识库的真实创建：

- 工程样例库
- 自然资源政策库
- 平台功能库

当前已具备：

- `/api/ragflow/health`
- `/api/ragflow/datasets`
- `/api/ragflow/remote-datasets`
- `/api/ragflow/ensure-datasets`
- `/api/ragflow/sync-preview`

RAGFlow dataset id 已回填配置：

- `RAGFLOW_ENGINEERING_DATASET_ID`
- `RAGFLOW_POLICY_DATASET_ID`
- `RAGFLOW_PLATFORM_DATASET_ID`

### 6.9 RAGFlow 文档同步基础版

当前已完成文档从正式文档库同步到 RAGFlow 指定知识库的基础链路，已具备：

- `/api/ragflow/sync-documents`
- `/api/ragflow/sync-records`
- `knowledge-server/scripts/sync-ragflow.js`

当前已实现能力：

- 选择目标 dataset
- 上传 approved Markdown 到 RAGFlow
- 触发 RAGFlow parse
- 记录同步结果
- 对明显乱码文档自动跳过

## 7. 一期尚未完全做到的部分

下面这些内容已经有方向或代码入口，但还未完全完成，需要继续推进：

### 7.1 文档解析层未完全完成

- PDF 真实解析器尚未接入
- DOCX 真实解析器尚未接入
- 图片 OCR 还未用真实图片样本做系统化验收
- 部分站点中文编码仍需要进一步增强策略
- 条款级切分和锚点结构还未正式完成

### 7.2 采集层未完全完成

- 列表页抽取仍较通用，尚未按站点规则精细化
- 详情页正文识别还未引入按站点配置的选择器优先策略
- 附件下载链路尚未系统化覆盖 PDF / DOCX / 图片附件

### 7.3 审核入库未完成

- 去重目前仍是基础版，主要基于 `title + sourceOrg + publishDate` 和 `sourceUrl`
- 暂无批量审核能力
- 暂无更细的时效状态流转和版本关系处理
- 暂无完整审核台前端
- 暂无批量导入 `parseRun` 到待审核队列的流程编排优化
- 暂无审核通过后自动触发知识库同步的后处理任务

### 7.4 RAGFlow 集成未完全完成

- 已完成三套 dataset 创建，但尚未实现 dataset id 自动写回配置文件
- 已完成基础同步链，但尚未实现按文档类别自动分流到三套知识库的更细规则
- 已同步真实文档到自然资源政策库，但工程样例库和平台功能库尚未有正式文档样本
- 暂无同步失败重试策略
- 暂无同步状态前端可视化界面

### 7.5 问答链未完成

- 仍以本地模型直答为主
- 尚未正式接入 RAGFlow 检索结果
- 引用卡片和原文追溯尚未对接真实入库文档

## 8. 一期 T6 解析链验收方式

为了确保文档解析链不是只“能跑”，而是可重复验证，当前已增加一期解析烟测脚本：

- `knowledge-server/scripts/smoke-test-t6.js`

烟测内容包括：

1. 创建一条只抓 1 个详情页的采集任务
2. 创建一条解析任务
3. 验证：
   - 至少解析出 1 个文件
   - 已生成 Markdown
   - AI 抽取成功
   - 标题不再明显乱码

当前该烟测已通过。

## 9. 一期实施顺序

### 第一步：搭 Node.js API 中台

- 对前端提供统一 API
- 对接 OpenClaw
- 对接 RAGFlow
- 对接本地模型
- 对接 MinIO、PostgreSQL、Obsidian

### 第二步：搭采集入库层

- 政策来源配置
- 采集任务
- 原文下载
- 规则解析
- OCR 增强
- AI 结构化抽取
- 审核与去重
- 入库存储

### 第三步：建设三套知识库

1. 工程样例库
2. 自然资源政策库
3. 平台功能库

### 第四步：打通知识问答

- `/api/knowledge/chat`
- `/api/knowledge/search`
- `/api/knowledge/document/:id`
- `/api/knowledge/document/:id/preview`

### 第五步：实现依据比对与原文追溯

- 政策标题
- 来源机构
- 发布时间
- 条款位置
- 摘录内容
- 原文预览入口

### 第六步：实现模板生成、资料归档、文档复刻

- 政策依据清单生成
- 模板文件渲染
- 项目资料归档
- 工程文档目录和内容复刻

## 10. 一期建议目录结构

```text
szkj/
  src/
    api/
    components/
    composables/
    utils/
  docs/
    AI智能体知识库总预览.md
    AI智能体知识库一期搭建.md
    AI智能体知识库二期扩展.md
  knowledge-server/
    src/
      app.js
      config/
        env.js
      routes/
        knowledge.js
        crawler.js
        review.js
        ragflow.js
      controllers/
        knowledgeController.js
        crawlerController.js
        crawlJobController.js
        parseRunController.js
        reviewController.js
        ragflowController.js
      services/
        llmService.js
        ocrService.js
        aiParseService.js
        crawlerJobService.js
        parseRunService.js
        reviewIngestService.js
        ragflowService.js
      parsers/
        htmlParser.js
        imageParser.js
        pdfParser.js
        docxParser.js
        markdownNormalizer.js
      prompts/
        knowledgeChatPrompt.js
        ocrPrompt.js
        documentExtractPrompt.js
      repositories/
        policySourceRepository.js
        crawlJobRepository.js
        parseRunRepository.js
        reviewPolicyRepository.js
        policyDocumentRepository.js
        ragflowSyncRecordRepository.js
      models/
        policySourceModel.js
        crawlJobModel.js
        parseRunModel.js
        reviewPolicyModel.js
        policyDocumentModel.js
        ragflowSyncRecordModel.js
      utils/
        http.js
        logger.js
        requestBody.js
        json.js
    scripts/
      smoke-test-t6.js
      smoke-test-t7.js
      sync-ragflow.js
    storage/
      config/
      raw/
      markdown/
      exports/
    package.json
    .env
```

## 11. 一期接口清单

### 11.1 知识问答接口

- `POST /api/knowledge/chat`
- `GET /api/knowledge/models`
- `GET /api/knowledge/health`

### 11.2 采集与解析接口

- `GET /api/crawler/sources`
- `POST /api/crawler/sources`
- `GET /api/crawler/sources/:id`
- `GET /api/crawler/jobs`
- `POST /api/crawler/jobs`
- `GET /api/crawler/jobs/:id`
- `GET /api/crawler/parse-runs`
- `POST /api/crawler/parse-runs`
- `GET /api/crawler/parse-runs/:id`

### 11.3 审核入库接口

- `POST /api/review/policies/from-parse-run`
- `GET /api/review/policies`
- `GET /api/review/policies/:id`
- `PATCH /api/review/policies/:id/metadata`
- `POST /api/review/policies/:id/approve`
- `POST /api/review/policies/:id/reject`
- `POST /api/review/policies/:id/mark-duplicate`
- `GET /api/review/documents`
- `GET /api/review/documents/:id`

### 11.4 RAGFlow 接口

- `GET /api/ragflow/health`
- `GET /api/ragflow/datasets`
- `POST /api/ragflow/datasets`
- `GET /api/ragflow/remote-datasets`
- `POST /api/ragflow/ensure-datasets`
- `GET /api/ragflow/sync-preview`
- `POST /api/ragflow/sync-documents`
- `GET /api/ragflow/sync-records`

### 11.5 后续预留接口

- `GET /api/knowledge/search`
- `GET /api/knowledge/document/:id`
- `GET /api/knowledge/document/:id/preview`
- `POST /api/knowledge/compare`
- `POST /api/template/generate`
- `POST /api/archive/save`

## 12. 一期开发任务表

| 阶段 | 任务编号 | 任务名称 | 当前状态 | 说明 |
|---|---|---|---|---|
| M1 | T1 | 建后端骨架 | 已完成 | 服务可启动，健康检查可访问 |
| M1 | T2 | 接基础存储 | 已完成 | PostgreSQL、MinIO、本地目录已接入 |
| M1 | T3 | 接模型能力 | 已完成 | 已切到局域网 Ollama，模型角色化配置已落地 |
| M2 | T4 | 建政策来源配置 | 已完成 | 来源配置接口和持久化已落地 |
| M2 | T5 | 做采集任务 | 已完成基础版 | 已能抓取真实列表页与详情页 HTML |
| M2 | T6 | 做文档解析 | 已完成基础增强版 | HTML 解析 + OCR 接口 + AI 抽取已接入，烟测通过 |
| M2 | T7 | 做审核入库 | 已完成增强版基础入库 | 已支持待审核、通过、驳回、标记重复、metadata 修订和正式文档落库，企业化细节仍待增强 |
| M3 | T8 | 建 RAGFlow 三库 | 已完成 | 三套知识库已在 RAGFlow 中真实创建完成 |
| M3 | T9 | 做同步脚本 | 已完成基础同步版 | 已审核文档可同步到自然资源政策库，乱码文档可自动跳过 |
| M4 | T10 | 做知识问答接口 | 部分完成 | 基础问答可用，尚未接入 RAGFlow 检索 |
| M4 | T11 | 做原文预览 | 未完成 | 待和正式入库文档联动 |
| M4 | T12 | 做引用返回 | 未完成 | 待和 RAGFlow 检索结果联动 |
| M5 | T13 | 做依据比对 | 未完成 | 待实现 |
| M5 | T14 | 做模板生成 | 未完成 | 待实现 |
| M5 | T15 | 做文档复刻 | 未完成 | 待实现 |
| M5 | T16 | 做资料归档 | 未完成 | 待实现 |
| M6 | T17 | 改前端接入 | 未完成 | 待对接 SmartAnalysis |
| M6 | T18 | 联调验收 | 未完成 | 待一期链路整体联调 |

## 13. 一期验收标准

- 能采集至少一批真实政策站点数据
- 能完整保留原文和附件
- 能按关键词、标题、机构、地区、年份检索
- 能在 AI 问答中返回原文依据
- 能打开原文预览
- 能做至少一种依据比对
- 能生成至少一种模板输出
- 能完成基础资料归档
- 文档解析链应具备：
  - 规则解析
  - OCR 接口
  - AI 辅助抽取
  - 可重复烟测
- 审核入库链应具备：
  - parseRun 进入待审核
  - 审核通过形成正式文档
  - 可驳回
  - 可标记重复
  - 正式 Markdown 可落入 approved 目录
- RAGFlow 集成链应具备：
  - 三套 dataset 已创建
  - 已审核文档可同步到目标 dataset
  - 可查询同步记录
  - 明显乱码文档可跳过

## 14. T7 当前完成情况说明

当前 `M2 / T7` 应理解为“审核入库基础版已完成”，而不是“企业级完整审核台已全部完成”。

### 14.1 当前已完成

- 从解析任务生成待审核候选
- 基础去重判断
- 审核通过
- 审核驳回
- 标记重复
- 正式文档记录落库
- 正式 Markdown 复制到 approved 目录

### 14.2 当前仍待增强

- 更强的去重策略
- 人工修订元数据接口
- 批量审核能力
- 更细的时效状态和版本关系
- 与 RAGFlow 的正式同步
- 审核前端工作台
- 审核通过后的自动后处理任务
- 待审核与正式文档之间更清晰的版本链路

### 14.3 T9 当前状态说明

当前 `M3 / T9` 已完成基础同步版，已经能够：

- 将 approved Markdown 同步到 RAGFlow 指定 dataset
- 触发 RAGFlow 解析
- 记录同步结果
- 对明显乱码文档自动跳过

当前仍待增强：

- 同步失败重试
- 同步前的内容清洗与质量评分
- 已同步文档的更新/覆盖策略
- 同步状态前端展示

## 15. 一期完成后的状态

一期完成后，项目应具备一个真正可用的企业工程政策知识库后端，当前前端对话窗口不再是单纯的本地模型聊天，而是带有知识、引用、原文追溯和归档能力的工作台入口。
