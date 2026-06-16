import { nextTick, ref } from 'vue';

const HOME_SIDEBAR_COLLAPSE_MS = 360;
const HOME_ENTER_CAMERA_SECONDS = 1.6;
const MODULE_APPEAR_MS = 360;

export function useMapLayout({ activeTopTab, flyToOnLeaveHome, enterHomeScene }) {
	const topTabs = [
		{ key: 'home', label: '首页' },
		{ key: 'sy', label: '数治测绘' },
		{ key: 'djcx', label: '数治地价' },
		{ key: 'znfx', label: '智能分析' },
		{ key: 'sjgl', label: '数据管理' },
		{ key: 'grzx', label: '个人中心' },
	];
	const topTabsEl = ref(null);
	const indicatorStyle = ref({ left: '0px', width: '0px' });
	const homeSidebarCollapsing = ref(false);
	const homeSidebarEntering = ref(false);
	const homeUiVisible = ref(true);
	const moduleEnterKey = ref(null);
	const tabRefs = new Map();
	let moduleEnterTimer = null;
	let tabSwitchToken = 0;

	const waitMs = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

	function setTabRef(key, el) {
		if (el) tabRefs.set(key, el);
	}

	function updateIndicator() {
		const container = topTabsEl.value;
		const activeEl = tabRefs.get(activeTopTab.value);
		if (!container || !activeEl) return;
		const cRect = container.getBoundingClientRect();
		const tRect = activeEl.getBoundingClientRect();
		indicatorStyle.value = {
			left: `${tRect.left - cRect.left}px`,
			width: `${tRect.width}px`,
		};
	}

	function triggerModuleEnter(nextKey) {
		if (!nextKey || nextKey === 'home') return;
		moduleEnterKey.value = nextKey;
		if (moduleEnterTimer) window.clearTimeout(moduleEnterTimer);
		moduleEnterTimer = window.setTimeout(() => {
			if (moduleEnterKey.value === nextKey) moduleEnterKey.value = null;
		}, MODULE_APPEAR_MS);
	}

	async function requestTopTabChange(nextKey) {
		if (!nextKey || nextKey === activeTopTab.value) return;

		if (activeTopTab.value === 'home' && nextKey !== 'home') {
			const token = ++tabSwitchToken;
			homeSidebarCollapsing.value = true;
			flyToOnLeaveHome();
			await waitMs(HOME_SIDEBAR_COLLAPSE_MS);
			if (token !== tabSwitchToken) return;
			homeSidebarCollapsing.value = false;
			homeUiVisible.value = false;
			activeTopTab.value = nextKey;
			triggerModuleEnter(nextKey);
			return;
		}

		if (activeTopTab.value !== 'home' && nextKey === 'home') {
			const token = ++tabSwitchToken;
			activeTopTab.value = 'home';
			homeUiVisible.value = true;
			homeSidebarCollapsing.value = false;
			homeSidebarEntering.value = true;
			await waitMs(0);
			await enterHomeScene({ duration: HOME_ENTER_CAMERA_SECONDS });
			if (token !== tabSwitchToken) return;
			window.requestAnimationFrame(() => {
				if (token !== tabSwitchToken) return;
				homeSidebarEntering.value = false;
			});
			return;
		}

		activeTopTab.value = nextKey;
		triggerModuleEnter(nextKey);
	}

	function selectTopTab(tab) {
		requestTopTabChange(tab.key);
	}

	function enterModule(tabKey) {
		if (topTabs.some((tab) => tab.key === tabKey)) {
			requestTopTabChange(tabKey);
		}
	}

	async function syncIndicator() {
		await nextTick();
		updateIndicator();
	}

	return {
		topTabs,
		topTabsEl,
		indicatorStyle,
		homeSidebarCollapsing,
		homeSidebarEntering,
		homeUiVisible,
		moduleEnterKey,
		setTabRef,
		updateIndicator,
		syncIndicator,
		requestTopTabChange,
		selectTopTab,
		enterModule,
	};
}
