<template>
	<div
		v-if="active"
		class="portal-home"
		:class="{
			'portal-home--collapsing': collapsing,
			'portal-home--entering': entering,
			'portal-home--stats-expanded': statsExpanded,
		}"
	>
		<section class="portal-home__top-metrics" aria-label="首页概览指标" v-show="!statsExpanded">
			<article
				v-for="metric in overviewMetrics"
				:key="metric.label"
				class="portal-home__top-metric-card"
			>
				<div class="portal-home__top-metric-head">
					<div class="portal-home__top-metric-title">{{ metric.label }}</div>
				</div>
				<div class="portal-home__top-metric-value">{{ metric.value }}</div>
				<div class="portal-home__top-metric-trend" :class="`portal-home__top-metric-trend--${metric.trendTheme}`">
					<span class="portal-home__top-metric-trend-arrow">{{ metric.trendArrow }}</span>
					<span>{{ metric.trend }}</span>
				</div>
			</article>
		</section>
		<div class="portal-home__layout">
			<aside class="portal-home__sidebar">
				<div class="portal-home__brand">
					<img class="portal-home__brand-logo" :src="logoUrl" alt="平台标识" />
					<div class="portal-home__brand-text">
						<div class="portal-home__brand-name">平台总览</div>
						<div class="portal-home__brand-version">Spatial Workbench</div>
					</div>
				</div>

				<div class="portal-home__nav-title">快捷入口</div>
				<div class="portal-home__nav">
					<button
						v-for="item in entries"
						:key="item.key"
						type="button"
						class="portal-home__nav-item"
						:class="{ active: item.key === activeNavKey }"
						@click="emit('enter-module', item.key)"
					>
						<div class="portal-home__nav-icon-wrap">
							<img
								class="portal-home__nav-icon"
								:class="{ 'portal-home__nav-icon--25': ['djcx', 'znfx'].includes(item.key) }"
								:src="item.icon"
								:alt="item.label"
							/>
						</div>
						<div class="portal-home__nav-main">
							<div class="portal-home__nav-label">{{ item.label }}</div>
						</div>
					</button>
				</div>
			</aside>

			<aside class="portal-home__stats" :class="{ 'portal-home__stats--expanded': statsExpanded }">
				<div class="portal-home__stats-header">
					<div class="portal-home__badge" @click="statsExpanded = !statsExpanded">{{ statsToggleLabel }}</div>
				</div>

				<div class="portal-home__stats-body">
					<!-- 展开状态：顶部渲染概览卡片 + 下方表格 -->
					<template v-if="statsExpanded">
						<div class="portal-home__expanded-header">
							<div class="portal-home__expanded-title">概览指标</div>
						</div>
						<div class="portal-home__expanded-metrics">
							<article
								v-for="metric in overviewMetrics"
								:key="metric.label"
								class="portal-home__expanded-metric-card"
							>
								<div class="portal-home__expanded-metric-label">{{ metric.label }}</div>
								<div class="portal-home__expanded-metric-value">{{ metric.value }}</div>
								<div class="portal-home__expanded-metric-trend" :class="`portal-home__expanded-metric-trend--${metric.trendTheme}`">
									<span>{{ metric.trendArrow }} {{ metric.trend }}</span>
								</div>
							</article>
						</div>

						<!-- 展开状态图表区域 -->
						<div class="portal-home__expanded-charts">
							<div class="portal-home__chart-card portal-home__chart-card--compact">
								<div class="portal-home__chart-head">
									<div>
										<div class="portal-home__chart-title">基准地价指数变化趋势</div>
										<div class="portal-home__chart-subtitle">2025-2026</div>
									</div>
									<div class="portal-home__chart-value">{{ stats.visits }}</div>
								</div>
								<svg class="portal-home__line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
									<defs>
										<linearGradient id="lineGradientExp" x1="0%" y1="0%" x2="0%" y2="100%">
											<stop offset="0%" stop-color="#1187ff" stop-opacity="0.4"/>
											<stop offset="100%" stop-color="#1187ff" stop-opacity="0"/>
										</linearGradient>
									</defs>
									<g class="portal-home__line-chart-grid">
										<line v-for="i in 5" :key="'h'+i" x1="0" :y1="i*20" x2="100" :y2="i*20" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
									</g>
									<polygon :points="areaPoints" fill="url(#lineGradientExp)"/>
									<polyline :points="chartPoints" fill="none" stroke="#28daff" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
									<circle v-for="(point, index) in lineChartPoints" :key="'p'+index" :cx="point.x" :cy="point.y" r="1.2" fill="#23d7ff"/>
								</svg>
							</div>

							<div class="portal-home__chart-card portal-home__chart-card--compact">
								<div class="portal-home__chart-head">
									<div>
										<div class="portal-home__chart-title">实时业务量</div>
										<div class="portal-home__chart-subtitle">近7时段</div>
									</div>
									<div class="portal-home__chart-value portal-home__chart-value--green">{{ stats.amount }}</div>
								</div>
								<div class="portal-home__bar-chart">
									<div
										v-for="(bar, index) in barChartValues"
										:key="`bar-${index}`"
										class="portal-home__bar-item"
									>
										<span class="portal-home__bar" :style="{ height: `${bar}%` }"></span>
									</div>
								</div>
							</div>

							<!-- 土地用途分布饼图 -->
							<div class="portal-home__chart-card portal-home__chart-card--compact">
								<div class="portal-home__chart-head">
									<div>
										<div class="portal-home__chart-title">土地用途分布</div>
										<div class="portal-home__chart-subtitle">占比统计</div>
									</div>
								</div>
								<div class="portal-home__pie-chart">
									<svg viewBox="0 0 100 100">
										<g v-for="(item, index) in landUseDistribution" :key="'pie'+index">
											<circle
												cx="50" cy="50" r="30"
												:stroke="item.color"
												stroke-width="12"
												fill="none"
												:stroke-dasharray="`${item.value * 1.884} ${100 * 1.884 - item.value * 1.884}`"
												:stroke-dashoffset="-landUseDistribution.slice(0, index).reduce((sum, d) => sum + d.value, 0) * 1.884"
												class="portal-home__pie-slice"
											/>
										</g>
									</svg>
									<div class="portal-home__pie-legend">
										<div v-for="item in landUseDistribution" :key="'leg'+item.label" class="portal-home__pie-legend-item">
											<span class="portal-home__pie-legend-color" :style="{ background: item.color }"></span>
											<span class="portal-home__pie-legend-label">{{ item.label }}</span>
											<span class="portal-home__pie-legend-value">{{ item.value }}%</span>
										</div>
									</div>
								</div>
							</div>

							<!-- 综合评估雷达图 -->
							<div class="portal-home__chart-card portal-home__chart-card--compact">
								<div class="portal-home__chart-head">
									<div>
										<div class="portal-home__chart-title">综合评估指标</div>
										<div class="portal-home__chart-subtitle">多维度分析</div>
									</div>
								</div>
								<svg class="portal-home__radar-chart" viewBox="0 0 100 100">
									<!-- 背景网格 -->
									<g class="portal-home__radar-grid">
										<polygon v-for="i in 5" :key="'rg'+i"
											:points="getRadarPolygon(i * 20)"
											fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"
										/>
									</g>
									<!-- 轴线 -->
									<line v-for="(item, index) in radarIndicators" :key="'rax'+index"
										x1="50" y1="50"
										:x2="50 + 40 * Math.cos((Math.PI * 2 * index) / radarIndicators.length - Math.PI / 2)"
										:y2="50 + 40 * Math.sin((Math.PI * 2 * index) / radarIndicators.length - Math.PI / 2)"
										stroke="rgba(255,255,255,0.08)" stroke-width="0.5"
									/>
									<!-- 数据区域 -->
									<polygon :points="radarPointsStr" fill="rgba(96, 165, 250, 0.25)" stroke="#60a5fa" stroke-width="0.8"/>
									<!-- 数据点 -->
									<circle v-for="(point, index) in radarPoints" :key="'rdp'+index"
										:cx="point.x" :cy="point.y" r="2" fill="#60a5fa"
									/>
									<!-- 标签 -->
									<text v-for="(item, index) in radarIndicators" :key="'rl'+index"
										:transform="`rotate(${(360 / radarIndicators.length) * index - 90}, ${50 + 48 * Math.cos((Math.PI * 2 * index) / radarIndicators.length - Math.PI / 2)}, ${50 + 48 * Math.sin((Math.PI * 2 * index) / radarIndicators.length - Math.PI / 2)})`"
										:x="50 + 48 * Math.cos((Math.PI * 2 * index) / radarIndicators.length - Math.PI / 2)"
										:y="50 + 48 * Math.sin((Math.PI * 2 * index) / radarIndicators.length - Math.PI / 2)"
										fill="rgba(191, 207, 237, 0.7)" font-size="4" text-anchor="middle" dominant-baseline="middle"
									>{{ item.label.substring(0, 3) }}</text>
								</svg>
							</div>
						</div>

						<div class="portal-home__expanded-table-section">
							<div class="portal-home__table-section-header">
								<div class="portal-home__table-section-title">近期地价评估任务</div>
								<div class="portal-home__table-section-count">{{ landPriceTasks.length }} 条记录</div>
							</div>
							<div class="portal-home__table-wrapper">
								<table class="portal-home__table">
									<thead>
										<tr>
											<th>任务编号</th>
											<th>地块名称</th>
											<th>土地用途</th>
											<th>评估价格(元/m²)</th>
											<th>评估时间</th>
											<th>状态</th>
											<th>操作</th>
										</tr>
									</thead>
									<tbody>
										<tr v-for="task in landPriceTasks" :key="task.id">
											<td class="portal-home__td-id">{{ task.id }}</td>
											<td>{{ task.landName }}</td>
											<td>
												<span class="portal-home__land-use-tag">{{ task.landUse }}</span>
											</td>
											<td class="portal-home__td-price">{{ task.price.toLocaleString() }}</td>
											<td>{{ task.evaluateTime }}</td>
											<td>
												<span class="portal-home__status-tag" :class="`portal-home__status-tag--${task.statusKey}`">
													{{ task.status }}
												</span>
											</td>
											<td>
												<div class="portal-home__action-group">
													<button
														class="portal-home__action-btn portal-home__action-btn--view"
														@click="handleViewTask(task)"
													>查看</button>
													<button
														class="portal-home__action-btn portal-home__action-btn--audit"
														v-if="task.statusKey === 'pending'"
														@click="handleAuditTask(task)"
													>审核</button>
												</div>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</template>

					<!-- 收起状态：原布局 -->
					<template v-else>
						<div class="portal-home__chart-card">
							<div class="portal-home__chart-head">
								<div>
									<div class="portal-home__chart-title">基准地价指数变化趋势 </div>
									<div class="portal-home__chart-subtitle">2025-2026</div>
								</div>
								<div class="portal-home__chart-value">{{ stats.visits }}</div>
							</div>
							<svg class="portal-home__line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
								<defs>
									<linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
										<stop offset="0%" stop-color="#1187ff" stop-opacity="0.4"/>
										<stop offset="100%" stop-color="#1187ff" stop-opacity="0"/>
									</linearGradient>
								</defs>
								<!-- 背景网格 -->
								<g class="portal-home__line-chart-grid">
									<line v-for="i in 5" :key="'h'+i" x1="0" :y1="i*20" x2="100" :y2="i*20" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
								</g>
								<!-- 填充区域 -->
								<polygon :points="areaPoints" fill="url(#lineGradient)"/>
								<!-- 折线 -->
								<polyline :points="chartPoints" fill="none" stroke="#28daff" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>
								<!-- 数据点 -->
								<circle v-for="(point, index) in lineChartPoints" :key="'p'+index" :cx="point.x" :cy="point.y" r="1.2" fill="#23d7ff"/>
							</svg>
						</div>

						<div class="portal-home__chart-card">
							<div class="portal-home__chart-head">
								<div>
									<div class="portal-home__chart-title">实时业务量</div>
									<div class="portal-home__chart-subtitle">近7时段</div>
								</div>
								<div class="portal-home__chart-value portal-home__chart-value--green">{{ stats.amount }}</div>
							</div>
							<div class="portal-home__bar-chart">
								<div
									v-for="(bar, index) in barChartValues"
									:key="`bar-${index}`"
									class="portal-home__bar-item"
								>
									<span class="portal-home__bar" :style="{ height: `${bar}%` }"></span>
								</div>
							</div>
						</div>
						<div class="pgrw_title">近期地价评估任务</div>
						<div class="portal-home__metric-grid">
							<div v-for="metric in metrics" :key="metric.label" class="portal-home__metric-card">
								<div class="portal-home__metric-label">{{ metric.label }}</div>
								<div class="portal-home__metric-value">{{ metric.value }}</div>
								<div class="portal-home__metric-trend" :class="metric.trendClass">{{ metric.trend }}</div>
							</div>
						</div>
					</template>
				</div>
			</aside>
		</div>

		<section class="portal-home__bottom-bar" aria-label="首页提醒信息">
			<div class="portal-home__bottom-alerts">
				<div class="portal-home__bottom-alert-head">
					<span class="portal-home__bottom-alert-icon"></span>
					<span class="portal-home__bottom-alert-title">智能检测已开启</span>
				</div>
				<div class="portal-home__bottom-alert-track">
					<div
						v-for="item in reminders"
						:key="`${item.time}-${item.source}-${item.text}`"
						class="portal-home__bottom-alert"
					>
						<span class="portal-home__bottom-alert-time">{{ item.time }}</span>
						<span class="portal-home__bottom-alert-source">[{{ item.source }}]</span>
						<span class="portal-home__bottom-alert-text">{{ item.text }}</span>
					</div>
				</div>
			</div>

			<div class="portal-home__bottom-meta">
				<div class="portal-home__bottom-status">
					<span class="portal-home__bottom-status-label">当前时间</span>
					<span class="portal-home__bottom-status-value">{{ currentTimeText }}</span>
					<span class="portal-home__bottom-status-extra">{{ currentDateText }}</span>
				</div>
				<div class="portal-home__bottom-status">
					<span class="portal-home__bottom-status-label">今日天气</span>
					<span class="portal-home__bottom-status-value">{{ weatherInfo.location }} {{ weatherInfo.text }}</span>
					<span class="portal-home__bottom-status-extra">{{ weatherInfo.temperature }} {{ weatherInfo.range }}</span>
				</div>
			</div>
		</section>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
	active: Boolean,
	collapsing: {
		type: Boolean,
		default: false,
	},
	entering: {
		type: Boolean,
		default: false,
	},
	userName: {
		type: String,
		default: '未知用户',
	},
	icons: {
		type: Object,
		default: () => ({}),
	},
	activeNavKey: {
		type: String,
		default: 'home',
	},
});

const emit = defineEmits(['enter-module']);
const statsExpanded = ref(false);
const statsToggleLabel = computed(() => (statsExpanded.value ? '收起' : '展开'));

const landPriceTasks = [
	{ id: 'PG-2026-0589', landName: '钱江新城A-12地块', landUse: '住宅用地', price: 28560, evaluateTime: '2026-05-28', status: '待审核', statusKey: 'pending' },
	{ id: 'PG-2026-0588', landName: '西湖区文三路商业地块', landUse: '商服用地', price: 18200, evaluateTime: '2026-05-27', status: '已完成', statusKey: 'completed' },
	{ id: 'PG-2026-0587', landName: '滨江高新区工业用地', landUse: '工业用地', price: 4200, evaluateTime: '2026-05-26', status: '已驳回', statusKey: 'rejected' },
	{ id: 'PG-2026-0586', landName: '余杭区未来科技城C-3', landUse: '住宅用地', price: 24800, evaluateTime: '2026-05-25', status: '已完成', statusKey: 'completed' },
	{ id: 'PG-2026-0585', landName: '萧山区市北单元地块', landUse: '商住用地', price: 21050, evaluateTime: '2026-05-24', status: '已完成', statusKey: 'completed' },
	{ id: 'PG-2026-0584', landName: '拱墅区运河新城A-5', landUse: '住宅用地', price: 26500, evaluateTime: '2026-05-23', status: '已驳回', statusKey: 'rejected' },
	{ id: 'PG-2026-0583', landName: '上城区望江新城B-8', landUse: '商服用地', price: 15800, evaluateTime: '2026-05-22', status: '已完成', statusKey: 'completed' },
	{ id: 'PG-2026-0582', landName: '临平区乔司商贸地块', landUse: '商服用地', price: 9800, evaluateTime: '2026-05-21', status: '待审核', statusKey: 'pending' },
	{ id: 'PG-2026-0581', landName: '富阳区银湖科技园', landUse: '工业用地', price: 3800, evaluateTime: '2026-05-20', status: '已完成', statusKey: 'completed' },
	{ id: 'PG-2026-0580', landName: '桐庐县分水镇住宅地块', landUse: '住宅用地', price: 6500, evaluateTime: '2026-05-19', status: '已完成', statusKey: 'completed' },
];

const handleViewTask = (task) => {
	console.log('查看任务:', task.id);
};

const handleAuditTask = (task) => {
	console.log('审核任务:', task.id);
};
const logoUrl = new URL('../../assets/logo.png', import.meta.url).href;
const syIcon = new URL('../../assets/首页.png', import.meta.url).href;
const chIcon = new URL('../../assets/测绘.png', import.meta.url).href;
const djIcon = new URL('../../assets/地价.png', import.meta.url).href;
const znIcon = new URL('../../assets/智能.png', import.meta.url).href;
const sjIcon = new URL('../../assets/数据.png', import.meta.url).href;
const grIcon = new URL('../../assets/个人.png', import.meta.url).href;

const entries = [
	{
		key: 'home',
		label: '首页',
		desc: '进入平台首页总览，查看快捷入口与统计信息。',
		shortDesc: '当前页面',
		icon: syIcon,
	},
	{
		key: 'sy',
		label: '数治测绘',
		desc: '进入地图测绘、标绘、测量与地形加载工作区。',
		shortDesc: '地图生产',
		icon: chIcon,
	},
	{
		key: 'djcx',
		label: '数治地价',
		desc: '进入地价查询、圈选分析与样本信息查看模块。',
		shortDesc: '价格查询',
		icon: djIcon,
	},
	{
		key: 'znfx',
		label: '智能分析',
		desc: '进入智能问答与空间业务辅助分析模块。',
		shortDesc: '智能辅助',
		icon: znIcon,
	},
	{
		key: 'sjgl',
		label: '数据管理',
		desc: '进入图层管理、数据上传与本地查看模块。',
		shortDesc: '资源治理',
		icon: sjIcon,
	},
	{
		key: 'grzx',
		label: '个人中心',
		desc: '进入个人信息、账户配置与常用设置模块。',
		shortDesc: '账户配置',
		icon: grIcon,
	},
];

const stats = {
	visits: '24,592',
	amount: '842.5k',
	todayTasks: '128 项',
};

const metrics = [
	{ label: '已完成', value: '16', trend: '+2', trendClass: 'up' },
	{ label: '未完成', value: '2', trend: '+2', trendClass: 'flat' },
	{ label: '任务完成率', value: '89%', trend: '+6%', trendClass: 'up' },
	{ label: '审核中', value: '3', trend: '-1', trendClass: 'down' },
];

const overviewMetrics = [
	{
		label: '基准地价平均值',
		value: '¥8,425/m²',
		trend: '环比增长 2.3%',
		trendArrow: '↑',
		trendTheme: 'up',
		iconText: 'Y',
		iconTheme: 'blue',
	},
	{
		label: '监测地块数量',
		value: '1,247',
		trend: '本月新增 38 个',
		trendArrow: '↑',
		trendTheme: 'up',
		iconText: 'P',
		iconTheme: 'orange',
	},
	{
		label: '评估完成率',
		value: '94.7%',
		trend: '较上月提升 3.2%',
		trendArrow: '↑',
		trendTheme: 'up',
		iconText: 'OK',
		iconTheme: 'green',
	},
	{
		label: '预警地块数',
		value: '12',
		trend: '较上月减少 4 个',
		trendArrow: '↓',
		trendTheme: 'down',
		iconText: '!',
		iconTheme: 'indigo',
	},
];

const lineChartPoints = [
	{ x: '4', y: '76' },
	{ x: '20', y: '62' },
	{ x: '36', y: '46' },
	{ x: '52', y: '32' },
	{ x: '68', y: '28' },
	{ x: '84', y: '44' },
	{ x: '96', y: '60' },
];

const chartPoints = computed(() =>
	lineChartPoints.map((p) => `${p.x},${p.y}`).join(' ')
);

const areaPoints = computed(() => {
	const pts = lineChartPoints.map((p) => `${p.x},${p.y}`);
	return `0,100 ${pts.join(' ')} 100,100`;
});

// 饼图数据 - 土地用途分布
const landUseDistribution = [
	{ label: '住宅用地', value: 42, color: '#60a5fa' },
	{ label: '商服用地', value: 28, color: '#34d399' },
	{ label: '工业用地', value: 18, color: '#fbbf24' },
	{ label: '商住用地', value: 12, color: '#f472b6' },
];

// 雷达图数据 - 综合评估指标
const radarIndicators = [
	{ label: '价格准确性', value: 85 },
	{ label: '评估效率', value: 72 },
	{ label: '数据覆盖', value: 90 },
	{ label: '响应速度', value: 68 },
	{ label: '可视化程度', value: 95 },
];

const radarPoints = computed(() => {
	const center = 50;
	const radius = 35;
	const count = radarIndicators.length;
	return radarIndicators.map((item, i) => {
		const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
		const value = (item.value / 100) * radius;
		return {
			x: center + value * Math.cos(angle),
			y: center + value * Math.sin(angle),
		};
	});
});

const radarPointsStr = computed(() =>
	radarPoints.value.map((p) => `${p.x},${p.y}`).join(' ')
);

const getRadarPolygon = (scale) => {
	const center = 50;
	const radius = (scale / 100) * 40;
	const count = radarIndicators.length;
	return radarIndicators.map((_, i) => {
		const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
		return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
	}).join(' ');
};

const buildLineSegments = (points) => {
	return points.slice(0, -1).map((point, index) => {
		const nextPoint = points[index + 1];
		const x1 = Number.parseFloat(point.x);
		const y1 = Number.parseFloat(point.y);
		const x2 = Number.parseFloat(nextPoint.x);
		const y2 = Number.parseFloat(nextPoint.y);
		const dx = x2 - x1;
		const dy = y2 - y1;
		const length = Math.sqrt(dx * dx + dy * dy);
		const angle = Math.atan2(dy, dx);
		return {
			left: `${x1}%`,
			bottom: `${y1}%`,
			width: `${length}%`,
			transform: `rotate(${angle}rad)`,
		};
	});
};

const lineChartSegments = buildLineSegments(lineChartPoints);
const barChartValues = [18, 44, 70, 76, 58, 26];
const reminders = [
	{ time: '10:23', source: '数据管理', text: '新增报告已入库' },
	{ time: '10:22', source: '智能分析', text: '报告分析已完成请查看' },
	{ time: '10:18', source: '数治地价', text: '重点地块价格波动' },
];
const weekdayLabels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const weatherCodeMap = {
	0: '晴',
	1: '晴间多云',
	2: '多云',
	3: '阴',
	45: '雾',
	48: '雾凇',
	51: '小毛雨',
	53: '毛雨',
	55: '强毛雨',
	56: '冻毛雨',
	57: '强冻毛雨',
	61: '小雨',
	63: '中雨',
	65: '大雨',
	66: '冻雨',
	67: '强冻雨',
	71: '小雪',
	73: '中雪',
	75: '大雪',
	77: '阵雪',
	80: '阵雨',
	81: '强阵雨',
	82: '暴雨',
	85: '阵雪',
	86: '强阵雪',
	95: '雷阵雨',
	96: '雷暴夹冰雹',
	99: '强雷暴夹冰雹',
};
const now = ref(new Date());
const weatherInfo = ref({
	location: '杭州',
	text: '天气加载中',
	temperature: '--',
	range: '--',
});
let nowTimer = null;

const padNumber = (value) => String(value).padStart(2, '0');
const currentTimeText = computed(() => {
	const date = now.value;
	return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;
});
const currentDateText = computed(() => {
	const date = now.value;
	return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${weekdayLabels[date.getDay()]}`;
});

async function loadTodayWeather() {
	try {
		const geocodingResponse = await fetch(
			'https://geocoding-api.open-meteo.com/v1/search?name=%E6%9D%AD%E5%B7%9E&count=1&language=zh&format=json'
		);
		if (!geocodingResponse.ok) {
			throw new Error(`geocoding failed: ${geocodingResponse.status}`);
		}
		const geocodingData = await geocodingResponse.json();
		const location = geocodingData?.results?.[0];
		if (!location?.latitude || !location?.longitude) {
			throw new Error('location missing');
		}

		const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
		forecastUrl.searchParams.set('latitude', String(location.latitude));
		forecastUrl.searchParams.set('longitude', String(location.longitude));
		forecastUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
		forecastUrl.searchParams.set('current', 'temperature_2m');
		forecastUrl.searchParams.set('timezone', 'Asia/Shanghai');
		const forecastResponse = await fetch(forecastUrl.toString());
		if (!forecastResponse.ok) {
			throw new Error(`forecast failed: ${forecastResponse.status}`);
		}
		const forecastData = await forecastResponse.json();
		const weatherCode = forecastData?.daily?.weather_code?.[0];
		const maxTemp = forecastData?.daily?.temperature_2m_max?.[0];
		const minTemp = forecastData?.daily?.temperature_2m_min?.[0];
		const currentTemp = forecastData?.current?.temperature_2m;

		weatherInfo.value = {
			location: location.name || '杭州',
			text: weatherCodeMap[weatherCode] || '天气良好',
			temperature: Number.isFinite(currentTemp) ? `${Math.round(currentTemp)}°C` : '--',
			range:
				Number.isFinite(minTemp) && Number.isFinite(maxTemp)
					? `${Math.round(minTemp)}°C ~ ${Math.round(maxTemp)}°C`
					: '--',
		};
	} catch (error) {
		weatherInfo.value = {
			location: '杭州',
			text: '天气信息暂不可用',
			temperature: '--',
			range: '--',
		};
	}
}

onMounted(() => {
	now.value = new Date();
	nowTimer = window.setInterval(() => {
		now.value = new Date();
	}, 1000);
	loadTodayWeather();
});

onBeforeUnmount(() => {
	if (nowTimer) {
		window.clearInterval(nowTimer);
		nowTimer = null;
	}
});
</script>

<style scoped>
.portal-home {
	position: absolute;
	top: 50px;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 4;
	pointer-events: none;
	--portal-home-side-width: min(23vw, 330px);
	--portal-home-side-gap: 20px;
	--portal-home-top-metric-width: minmax(0, 300px);
	--portal-home-top-metrics-max-width: 900px;
	--portal-home-bottom-bar-height: 50px;
	--portal-home-horizontal-inset: 0px;
}

.portal-home__layout {
	position: relative;
	height: calc(100% - var(--portal-home-bottom-bar-height));
	width: 100%;
	box-sizing: border-box;
}

.portal-home__bottom-bar {
	position: absolute;
	left: calc(-1 * var(--portal-home-horizontal-inset));
	right: calc(-1 * var(--portal-home-horizontal-inset));
	bottom: 0;
	height: var(--portal-home-bottom-bar-height);
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	gap: 18px;
	padding: 0 18px;
	border-radius: 0;
	background: rgba(0, 0, 0, 0.58);
	border-top: 1px solid rgba(255, 255, 255, 0.18);
	box-shadow: 0 -12px 36px rgba(0, 0, 0, 0.28);
	backdrop-filter: blur(18px) saturate(160%);
	-webkit-backdrop-filter: blur(18px) saturate(160%);
	box-sizing: border-box;
	pointer-events: auto;
	z-index: 2;
	transform: translate3d(0, 0, 0);
	opacity: 1;
	transition: transform 360ms ease, opacity 360ms ease;
}

.portal-home__bottom-alerts {
	display: flex;
	align-items: center;
	gap: 16px;
	min-width: 0;
	overflow: hidden;
}

.portal-home__bottom-alert-head {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	flex-shrink: 0;
	padding-right: 16px;
	border-right: 1px solid rgba(255, 255, 255, 0.12);
}

.portal-home__bottom-alert-icon {
	position: relative;
	width: 10px;
	height: 10px;
	background-color: #2fe989;
	border-radius: 50%;
}

.portal-home__bottom-alert-title {
	font-size: 14px;
	font-weight: 700;
	letter-spacing: 1px;
	color: #2fe989;
	white-space: nowrap;
}

.portal-home__bottom-alert-track {
	overflow: hidden;
}

.portal-home__bottom-alert {
	position: relative;
	flex: 1 1 0;
	display: inline-flex;
	/* align-items: center; */
	gap: 10px;
	min-width: 0;
	padding: 0 18px;
}

.portal-home__bottom-alert:not(:last-child)::after {
	content: '';
	position: absolute;
	right: 0;
	top: 50%;
	width: 1px;
	height: 18px;
	background: rgba(255, 255, 255, 0.12);
	transform: translateY(-50%);
}

.portal-home__bottom-alert-time {
	display: inline-flex;
	align-items: center;
	font-size: 12px;
	font-weight: 600;
	line-height: 1.2;
	color: rgba(179, 187, 205, 0.78);
	white-space: nowrap;
	flex-shrink: 0;
}

.portal-home__bottom-alert-source {
	font-size: 13px;
	font-weight: 700;
	line-height: 1.2;
	color: rgba(229, 235, 246, 0.92);
	white-space: nowrap;
	flex-shrink: 0;
}

.portal-home__bottom-alert-text {
	font-size: 13px;
	line-height: 1.4;
	color: rgba(214, 221, 236, 0.92);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.portal-home__bottom-meta {
	display: flex;
	align-items: center;
	gap: 18px;
	flex-shrink: 0;
	padding-left: 18px;
	border-left: 1px solid rgba(255, 255, 255, 0.14);
}

.portal-home__bottom-status {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	white-space: nowrap;
}

.portal-home__bottom-status-label {
	font-size: 12px;
	color: rgba(191, 207, 237, 0.72);
}

.portal-home__bottom-status-value {
	font-size: 14px;
	font-weight: 700;
	color: #ffffff;
}

.portal-home__bottom-status-extra {
	font-size: 12px;
	color: rgba(214, 225, 245, 0.78);
}

.portal-home--stats-expanded .portal-home__top-metrics {
	display: none;
}

.portal-home__top-metrics {
	position: absolute;
	top: 18px;
	left: 50%;
	transform: translate3d(-50%, 0, 0);
	width: 95%;
	max-width: var(--portal-home-top-metrics-max-width);
	display: grid;
	grid-template-columns: repeat(4, var(--portal-home-top-metric-width));
	gap: 16px;
	justify-content: center;
	z-index: 2;
	pointer-events: none;
	opacity: 1;
	transition: transform 360ms ease, opacity 360ms ease;
	/* will-change: transform, opacity; */
}

.portal-home__top-metric-card {
	position: relative;
	min-width: 0;
	max-width: 300px;
	width: 100%;
	padding: 24px 22px 22px;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(255, 255, 255, 0.18);
	box-shadow: 0 22px 70px rgba(93, 93, 93, 0.45);
	backdrop-filter: blur(18px) saturate(160%);
	-webkit-backdrop-filter: blur(18px) saturate(160%);
	box-sizing: border-box;
	overflow: hidden;
}

.portal-home__top-metric-card::before {
	content: '';
	position: absolute;
	inset: 0;
	/* background:
		radial-gradient(1100px 520px at 18% 8%, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 60%),
		radial-gradient(900px 700px at 88% 105%, rgba(6, 182, 212, 0.22), rgba(6, 182, 212, 0) 62%),
		radial-gradient(650px 450px at 70% 20%, rgba(13, 148, 135, 0.12), rgba(13, 148, 135, 0) 55%); */
	opacity: 0.95;
	pointer-events: none;
}

.portal-home__top-metric-card::after {
	content: '';
	position: absolute;
	inset: -60% -60%;
	background: linear-gradient(115deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.26) 50%, rgba(255, 255, 255, 0) 60%);
	filter: blur(10px);
	opacity: 0.35;
	pointer-events: none;
	transform: translateX(-18%) rotate(12deg);
}

.portal-home__top-metric-head,
.portal-home__top-metric-value,
.portal-home__top-metric-trend {
	position: relative;
	z-index: 1;
}

.portal-home__top-metric-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
}

.portal-home__top-metric-title {
	font-size: 14px;
	font-weight: 600;
	line-height: 1.5;
	color: #ffffff;
}

.portal-home__top-metric-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 48px;
	height: 48px;
	padding: 0 12px;
	border-radius: 14px;
	font-size: 20px;
	font-weight: 700;
	line-height: 1;
	flex-shrink: 0;
}

.portal-home__top-metric-icon--blue {
	background: rgba(72, 143, 255, 0.2);
	color: #d2e4ff;
}

.portal-home__top-metric-icon--orange {
	background: rgba(255, 160, 71, 0.18);
	color: #ffb36a;
}

.portal-home__top-metric-icon--green {
	background: rgba(64, 204, 140, 0.2);
	color: #83f0bd;
	font-size: 16px;
}

.portal-home__top-metric-icon--indigo {
	background: rgba(135, 159, 204, 0.2);
	color: #d7e3ff;
}

.portal-home__top-metric-value {
	margin-top: 16px;
	font-size: 24px;
	font-weight: 700;
	line-height: 1.2;
	color: #ffffff;
	word-break: break-word;
}

.portal-home__top-metric-trend {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	margin-top: 18px;
	font-size: 13px;
	line-height: 1.4;
}

.portal-home__top-metric-trend-arrow {
	font-size: 18px;
	line-height: 1;
}

.portal-home__top-metric-trend--up {
	color: #37dd85;
}

.portal-home__top-metric-trend--down {
	color: #ff6e7a;
}

.portal-home__sidebar {
	position: absolute;
	top: 0;
	left: 0;
	width: var(--portal-home-side-width);
	height: 100%;
	border-radius: 0 4px 4px 0;
	border: 1px solid rgba(255, 255, 255, 0.18);
	box-shadow: 0 22px 70px rgba(93, 93, 93, 0.45);
	backdrop-filter: blur(18px) saturate(160%);
	-webkit-backdrop-filter: blur(18px) saturate(160%);
	transition: transform 360ms ease, opacity 360ms ease;
	will-change: transform, opacity;
	pointer-events: auto;
	padding: 18px 14px;
	display: flex;
	flex-direction: column;
}

.portal-home__sidebar::before {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background:
		radial-gradient(1100px 520px at 18% 8%, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 60%),
		radial-gradient(900px 700px at 88% 105%, rgba(6, 182, 212, 0.22), rgba(6, 182, 212, 0) 62%),
		radial-gradient(650px 450px at 70% 20%, rgba(13, 148, 135, 0.12), rgba(13, 148, 135, 0) 55%);
	opacity: 0.95;
	pointer-events: none;
}

.portal-home__sidebar::after {
	content: '';
	position: absolute;
	inset: -60% -60%;
	border-radius: inherit;
	background: linear-gradient(115deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.26) 50%, rgba(255, 255, 255, 0) 60%);
	filter: blur(10px);
	opacity: 0.35;
	pointer-events: none;
	transform: translateX(-18%) rotate(12deg);
}

.portal-home__stats::before {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background:
		radial-gradient(1100px 520px at 18% 8%, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 60%),
		radial-gradient(900px 700px at 88% 105%, rgba(6, 182, 212, 0.22), rgba(6, 182, 212, 0) 62%),
		radial-gradient(650px 450px at 70% 20%, rgba(13, 148, 135, 0.12), rgba(13, 148, 135, 0) 55%);
	opacity: 0.95;
	pointer-events: none;
}

.portal-home__stats::after {
	content: '';
	position: absolute;
	inset: -60% -60%;
	border-radius: inherit;
	background: linear-gradient(115deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.26) 50%, rgba(255, 255, 255, 0) 60%);
	filter: blur(10px);
	opacity: 0.35;
	pointer-events: none;
	transform: translateX(-18%) rotate(12deg);
}

.portal-home--collapsing .portal-home__sidebar {
	transform: translateX(-110%);
	opacity: 0;
}

.portal-home--collapsing .portal-home__stats {
	transform: translateX(110%);
	opacity: 0;
}

.portal-home--collapsing .portal-home__top-metrics {
	transform: translate3d(-50%, -110%, 0);
	opacity: 0;
}

.portal-home--collapsing .portal-home__bottom-bar {
	transform: translate3d(0, 100%, 0);
	opacity: 0;
}

.portal-home--entering .portal-home__sidebar {
	transform: translateX(-110%);
	opacity: 0;
}

.portal-home--entering .portal-home__stats {
	transform: translateX(110%);
	opacity: 0;
}

.portal-home--entering .portal-home__top-metrics {
	transform: translate3d(-50%, -110%, 0);
	opacity: 0;
}

.portal-home--entering .portal-home__bottom-bar {
	transform: translate3d(0, 100%, 0);
	opacity: 0;
}

.portal-home__brand {
	position: relative;
	z-index: 1;
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 10px 18px;
}

.portal-home__brand-logo {
	display: flex;
	width: 38px;
	height: 38px;
	object-fit: contain;
	flex-shrink: 0;
}

.portal-home__brand-name {
	font-size: 16px;
	font-weight: 600;
	color: #ffffff;
}

.portal-home__brand-version {
	margin-top: 4px;
	font-size: 12px;
	color: rgba(208, 222, 255, 0.6);
}

.portal-home__nav-title {
	position: relative;
	z-index: 1;
	padding: 10px;
	font-size: 12px;
	letter-spacing: 1px;
	text-transform: uppercase;
	color: rgba(191, 207, 237, 0.65);
}

.portal-home__nav {
	position: relative;
	z-index: 1;
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.portal-home__nav-item {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	border: 4px solid #ffffff00;
	border-radius: 4px;
	background: rgba(255, 255, 255, 0.04);
	color: #dfdfdf;
	text-align: left;
	cursor: pointer;
	transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.portal-home__nav-item:hover {
	transform: translatey(-1px);
	border-right-color: rgba(84, 201, 255, 0.4);
}

.portal-home__nav-item.active {
	color: #fff;
	border-right-color: rgb(0, 174, 255);
	/* box-shadow: 0 1px 10px rgba(197, 197, 197, 0.28); */
}

.portal-home__nav-icon-wrap {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 42px;
	border-radius: 12px;
	/* background: rgba(255, 255, 255, 0.08); */
	flex-shrink: 0;
}

.portal-home__nav-icon {
	width: 18px;
	height: 18px;
	object-fit: contain;
}

.portal-home__nav-icon--25 {
	width: 25px;
	height: 25px;
}

.portal-home__nav-main {
	flex: 1;
	min-width: 0;
}

.portal-home__nav-label {
	font-size: 15px;
}

.portal-home__nav-desc {
	margin-top: 4px;
	font-size: 12px;
	color: rgba(196, 211, 239, 0.74);
}

.portal-home__nav-arrow {
	color: rgba(140, 236, 255, 0.9);
	font-size: 14px;
}

.portal-home__sidebar-footer {
	position: relative;
	z-index: 1;
	margin-top: auto;
	padding: 16px 12px 6px;
}

.portal-home__sidebar-footer-title {
	font-size: 12px;
	color: rgba(191, 207, 237, 0.65);
}

.portal-home__sidebar-footer-value {
	margin-top: 8px;
	font-size: 18px;
	font-weight: 600;
	color: #ffffff;
}

.portal-home__badge {
	display: inline-flex;
	align-items: center;
	height: 30px;
	padding: 0 14px;
	border-radius: 999px;
	background: rgba(69, 239, 255, 0.14);
	border: 1px solid rgba(69, 239, 255, 0.36);
	color: #8cecff;
	font-size: 13px;
	cursor: pointer;
}

.portal-home__logo {
	width: 64px;
	height: 64px;
	object-fit: contain;
	flex-shrink: 0;
	filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.28));
}

.portal-home__stats {
	position: absolute;
	top: 0;
	right: 0;
	width: var(--portal-home-side-width);
	height: 100%;
	border-radius: 4px 0 0 4px;
	border: 1px solid rgba(255, 255, 255, 0.18);
	box-shadow: 0 22px 70px rgba(93, 93, 93, 0.45);
	backdrop-filter: blur(18px) saturate(160%);
	-webkit-backdrop-filter: blur(18px) saturate(160%);
	box-sizing: border-box;
	transition: width 360ms cubic-bezier(0.22, 1, 0.36, 1), transform 360ms ease, opacity 360ms ease;
	will-change: width, transform, opacity;
	pointer-events: auto;
	padding: 18px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.portal-home__stats::before {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background:
		radial-gradient(1100px 520px at 18% 8%, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 60%),
		radial-gradient(900px 700px at 88% 105%, rgba(6, 182, 212, 0.22), rgba(6, 182, 212, 0) 62%),
		radial-gradient(650px 450px at 70% 20%, rgba(13, 148, 135, 0.12), rgba(13, 148, 135, 0) 55%);
	opacity: 0.95;
	pointer-events: none;
}

.portal-home__stats::after {
	content: '';
	position: absolute;
	inset: -60% -60%;
	border-radius: inherit;
	background: linear-gradient(115deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.26) 50%, rgba(255, 255, 255, 0) 60%);
	filter: blur(10px);
	opacity: 0.35;
	pointer-events: none;
	transform: translateX(-18%) rotate(12deg);
}

.portal-home__stats--expanded {
	width: min(90vw, calc(100vw - var(--portal-home-side-width) - 40px));
}

@media (max-width: 1400px) {
	.portal-home__stats--expanded {
		width: min(78vw, calc(100vw - var(--portal-home-side-width) - 20px));
	}
}

@media (max-width: 900px) {
	.portal-home__stats--expanded {
		width: 100%;
		left: 0;
		border-radius: 0;
	}
}

.portal-home__stats-header {
	position: relative;
	z-index: 1;
	padding: 2px 2px 6px;
}

.portal-home__stats-brand {
	margin-top: 14px;
}

.portal-home__stats-title {
	font-size: 22px;
	font-weight: 700;
	color: #ffffff;
	line-height: 1.3;
}

.portal-home__stats-desc {
	margin-top: 8px;
	font-size: 13px;
	line-height: 1.7;
	color: rgba(214, 225, 245, 0.74);
}

.portal-home__chart-card,
.portal-home__metric-card {
	position: relative;
	z-index: 1;
	border-radius: 18px;
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.06);
}

.portal-home__chart-card {
	padding: 18px;
	margin-top: 20px;
}

.portal-home__chart-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
}

.portal-home__chart-title {
	font-size: 14px;
	font-weight: 600;
	color: #ffffff;
}

.portal-home__chart-subtitle {
	margin-top: 6px;
	font-size: 12px;
	color: rgba(191, 207, 237, 0.65);
}

.portal-home__chart-value {
	font-size: 18px;
	font-weight: 700;
	color: #ffffff;
}

.portal-home__chart-value--green {
	color: #34d87d;
}

.portal-home__line-chart {
	width: 100%;
	height: 126px;
	margin-top: 18px;
	border-radius: 14px;
	background: linear-gradient(180deg, rgba(31, 94, 205, 0.14), rgba(31, 94, 205, 0));
	overflow: visible;
}

.portal-home__line-point,
.portal-home__line-segment {
	display: none;
}

.portal-home__bar-chart {
	display: flex;
	align-items: flex-end;
	gap: 12px;
	height: 126px;
	margin-top: 18px;
	padding: 14px 8px 0;
	border-radius: 14px;
	background:
		repeating-linear-gradient(to top, rgba(255, 255, 255, 0.05) 0, rgba(255, 255, 255, 0.05) 1px, transparent 1px, transparent 28px);
}

.portal-home__bar-item {
	flex: 1;
	height: 100%;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.portal-home__bar {
	width: 18px;
	min-height: 12px;
	border-radius: 8px 8px 4px 4px;
	background: linear-gradient(180deg, #2fe989 0%, #23b85f 100%);
	box-shadow: 0 8px 16px rgba(43, 226, 114, 0.22);
}

.pgrw_title{
	color: #fff;
	margin-top: 20px;
	font-style: italic;
}

.portal-home__metric-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
	margin-top: 20px;
}

.portal-home__metric-card {
	padding: 16px 14px;
}

.portal-home__metric-label {
	font-size: 12px;
	color: rgba(191, 207, 237, 0.65);
}

.portal-home__metric-value {
	margin-top: 10px;
	font-size: 24px;
	font-weight: 700;
	color: #ffffff;
}

.portal-home__metric-trend {
	margin-top: 8px;
	font-size: 12px;
}

.portal-home__metric-trend.up {
	color: #37dd85;
}

.portal-home__metric-trend.down {
	color: #ff7d8f;
}

.portal-home__metric-trend.flat {
	color: #8cecff;
}

@media (max-width: 1680px) {
	.portal-home__top-metrics {
		grid-template-columns: repeat(4, minmax(0, 220px));
	}
}

@media (min-width: 1800px) and (min-aspect-ratio: 21/9) {
	.portal-home {
		--portal-home-side-width: 500px;
		--portal-home-top-metric-width: 300px;
		--portal-home-top-metrics-max-width: 1248px;
	}
}

@media (max-width: 1280px) {
	.portal-home {
		--portal-home-side-width: min(20vw, 260px);
	}

	.portal-home__layout {
		grid-template-columns: minmax(220px, 20vw) minmax(220px, 20vw);
	}

	.portal-home__top-metrics {
		width: calc(100% - ((var(--portal-home-side-width) + var(--portal-home-side-gap) + 12px) * 2));
	}

	.portal-home__bottom-alert:nth-child(3) {
		display: none;
	}

	.portal-home__bottom-alert {
		padding: 0 12px;
	}

	.portal-home__bottom-meta {
		gap: 12px;
		padding-left: 12px;
	}

	.portal-home__bottom-status-extra {
		display: none;
	}
}

@media (max-width: 900px) {
	.portal-home {
		--portal-home-horizontal-inset: 12px;
		left: var(--portal-home-horizontal-inset);
		right: var(--portal-home-horizontal-inset);
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding-bottom: var(--portal-home-bottom-bar-height);
		box-sizing: border-box;
		overflow: hidden;
	}

	.portal-home__top-metrics {
		position: relative;
		top: 0;
		left: 0;
		right: 0;
		transform: translate3d(0, 0, 0);
		grid-template-columns: 1fr;
		margin-bottom: 12px;
		flex-shrink: 0;
	}

	.portal-home__bottom-bar {
		grid-template-columns: minmax(0, 1fr);
		gap: 10px;
		padding: 0 12px;
	}

	.portal-home--collapsing .portal-home__top-metrics,
	.portal-home--entering .portal-home__top-metrics {
		transform: translate3d(0, -110%, 0);
	}

	.portal-home__layout {
		flex: 1;
		min-height: 0;
		height: auto;
		grid-template-columns: 1fr;
		overflow: auto;
	}

	.portal-home__bottom-alert:nth-child(2),
	.portal-home__bottom-alert:nth-child(3) {
		display: none;
	}

	.portal-home__bottom-alert-head {
		padding-right: 12px;
	}

	.portal-home__bottom-meta {
		display: none;
	}

	.portal-home__metric-grid {
		grid-template-columns: 1fr;
	}
}

/* ========== 新增样式 ========== */

/* 右侧栏滚动条 */
.portal-home__stats-body {
	height: calc(100% - 50px);
	overflow-y: auto;
	overflow-x: hidden;
	padding-right: 4px;
	box-sizing: border-box;
	scrollbar-width: thin;
	scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.portal-home__stats-body::-webkit-scrollbar {
	width: 6px;
}

.portal-home__stats-body::-webkit-scrollbar-track {
	background: transparent;
}

.portal-home__stats-body::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.2);
	border-radius: 999px;
}

.portal-home__stats-body::-webkit-scrollbar-thumb:hover {
	background: rgba(255, 255, 255, 0.35);
}

/* 展开提示 */
.portal-home__stats-collapse-hint {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-left: auto;
	margin-right: 2px;
}

.portal-home__stats-collapse-icon {
	width: 16px;
	height: 16px;
	background: rgba(69, 239, 255, 0.15);
	border: 1px solid rgba(69, 239, 255, 0.3);
	border-radius: 50%;
	position: relative;
	flex-shrink: 0;
}

.portal-home__stats-collapse-icon::after {
	content: '';
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 6px;
	height: 6px;
	background: #8cecff;
	border-radius: 50%;
}

.portal-home__stats-collapse-text {
	font-size: 11px;
	color: rgba(140, 236, 255, 0.65);
	white-space: nowrap;
}

/* 展开状态 - 概览卡片（紧凑横排） */
.portal-home__expanded-header {
	margin-bottom: 12px;
}

.portal-home__expanded-title {
	font-size: 13px;
	font-weight: 700;
	color: rgba(191, 207, 237, 0.85);
	letter-spacing: 1px;
	text-transform: uppercase;
}

.portal-home__expanded-metrics {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 10px;
	margin-bottom: 18px;
}

/* 展开状态图表区域 */
.portal-home__expanded-charts {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 14px;
	margin-bottom: 18px;
}

/* 带鱼屏/超宽屏：4个图表同一行 */
@media (min-width: 2000px) {
	.portal-home__expanded-charts {
		grid-template-columns: repeat(4, 1fr);
	}
}

.portal-home__chart-card--compact {
	padding: 14px;
}

.portal-home__chart-card--compact .portal-home__line-chart {
	height: 100px;
}

.portal-home__chart-card--compact .portal-home__bar-chart {
	height: 100px;
	margin-top: 12px;
}

/* 饼图样式 */
.portal-home__pie-chart {
	display: flex;
	align-items: center;
	gap: 12px;
	height: 100px;
	margin-top: 8px;
}

.portal-home__pie-chart svg {
	width: 80px;
	height: 80px;
	flex-shrink: 0;
}

.portal-home__pie-slice {
	transition: opacity 0.2s ease;
}

.portal-home__pie-legend {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
	min-width: 0;
}

.portal-home__pie-legend-item {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 11px;
}

.portal-home__pie-legend-color {
	width: 8px;
	height: 8px;
	border-radius: 2px;
	flex-shrink: 0;
}

.portal-home__pie-legend-label {
	color: rgba(191, 207, 237, 0.7);
	flex: 1;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.portal-home__pie-legend-value {
	color: #ffffff;
	font-weight: 600;
	flex-shrink: 0;
}

/* 雷达图样式 */
.portal-home__radar-chart {
	width: 100%;
	height: 100px;
	margin-top: 8px;
}

.portal-home__expanded-metric-card {
	padding: 14px 12px;
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.08);
}

.portal-home__expanded-metric-label {
	font-size: 11px;
	color: rgba(191, 207, 237, 0.6);
	line-height: 1.4;
}

.portal-home__expanded-metric-value {
	margin-top: 8px;
	font-size: 18px;
	font-weight: 700;
	color: #ffffff;
	line-height: 1.2;
}

.portal-home__expanded-metric-trend {
	margin-top: 8px;
	font-size: 11px;
	color: rgba(191, 207, 237, 0.55);
}

.portal-home__expanded-metric-trend--up {
	color: #37dd85;
}

.portal-home__expanded-metric-trend--down {
	color: #ff6e7a;
}

/* 表格区域 */
.portal-home__expanded-table-section {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.portal-home__table-section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;
}

.portal-home__table-section-title {
	font-size: 13px;
	font-weight: 700;
	color: rgba(191, 207, 237, 0.85);
}

.portal-home__table-section-count {
	font-size: 11px;
	color: rgba(140, 236, 255, 0.55);
}

.portal-home__table-wrapper {
	flex: 1;
	min-height: 0;
	overflow: auto;
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 12px;
	background: rgba(255, 255, 255, 0.22);
	backdrop-filter: blur(8px);
	scrollbar-width: thin;
	scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.portal-home__table-wrapper::-webkit-scrollbar {
	width: 5px;
	height: 5px;
}

.portal-home__table-wrapper::-webkit-scrollbar-track {
	background: transparent;
}

.portal-home__table-wrapper::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.15);
	border-radius: 999px;
}

.portal-home__table-wrapper::-webkit-scrollbar-thumb:hover {
	background: rgba(255, 255, 255, 0.25);
}

.portal-home__table {
	width: 100%;
	border-collapse: collapse;
	font-size: 12px;
	min-width: 600px;
}

.portal-home__table thead tr {
	background: rgba(255, 255, 255, 0.05);
}

.portal-home__table th {
	padding: 10px 12px;
	text-align: left;
	font-weight: 600;
	color: rgb(255, 255, 255);
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	white-space: nowrap;
}

.portal-home__table tbody tr {
	transition: background 0.15s ease;
}

.portal-home__table tbody tr:hover {
	background: rgba(255, 255, 255, 0.04);
}

.portal-home__table td {
	padding: 10px 12px;
	color: rgb(255, 255, 255);
	border-bottom: 1px solid rgba(255, 255, 255, 0.04);
	vertical-align: middle;
}

.portal-home__td-id {
	font-family: 'Consolas', 'Monaco', monospace;
	font-size: 15px;
	color: rgba(140, 236, 255, 0.9) !important;
	white-space: nowrap;
}

.portal-home__td-price {
	font-weight: 600;
	color: #ffffff !important;
	white-space: nowrap;
}

.portal-home__land-use-tag {
	display: inline-block;
	padding: 2px 8px;
	border-radius: 999px;
	background: rgba(99, 102, 241, 0.2);
	color: #c7d2fe;
	font-size: 11px;
	border: 1px solid rgba(99, 102, 241, 0.25);
}

.portal-home__status-tag {
	display: inline-block;
	padding: 2px 10px;
	border-radius: 999px;
	font-size: 11px;
	font-weight: 600;
}

.portal-home__status-tag--pending {
	background: rgba(251, 191, 36, 0.15);
	color: #fcd34d;
	border: 1px solid rgba(251, 191, 36, 0.3);
}

.portal-home__status-tag--completed {
	background: rgba(52, 211, 153, 0.15);
	color: #6ee7b7;
	border: 1px solid rgba(52, 211, 153, 0.3);
}

.portal-home__status-tag--rejected {
	background: rgba(248, 113, 113, 0.15);
	color: #fca5a5;
	border: 1px solid rgba(248, 113, 113, 0.3);
}

.portal-home__action-group {
	display: flex;
	align-items: center;
	gap: 6px;
}

.portal-home__action-btn {
	padding: 3px 10px;
	border-radius: 6px;
	font-size: 11px;
	font-weight: 500;
	border: 1px solid;
	cursor: pointer;
	transition: all 0.15s ease;
}

.portal-home__action-btn--view {
	background: rgba(96, 165, 250, 0.12);
	border-color: rgba(96, 165, 250, 0.3);
	color: #93c5fd;
}

.portal-home__action-btn--view:hover {
	background: rgba(96, 165, 250, 0.22);
	border-color: rgba(96, 165, 250, 0.5);
}

.portal-home__action-btn--audit {
	background: rgba(52, 211, 153, 0.12);
	border-color: rgba(52, 211, 153, 0.3);
	color: #6ee7b7;
}

.portal-home__action-btn--audit:hover {
	background: rgba(52, 211, 153, 0.22);
	border-color: rgba(52, 211, 153, 0.5);
}

/* 展开状态宽度过渡 - .portal-home__stats--expanded 在上方 .portal-home__stats 块中已定义 */

@media (max-width: 1400px) {
	.portal-home__stats--expanded {
		width: min(78vw, calc(100vw - 320px));
		max-width: min(78vw, calc(100vw - 320px));
	}

	.portal-home__expanded-metrics {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (max-width: 900px) {
	.portal-home__stats--expanded {
		width: 100%;
		max-width: 100%;
	}

	.portal-home__expanded-metrics {
		grid-template-columns: repeat(2, 1fr);
	}
}
</style>
