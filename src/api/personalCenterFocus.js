import { request } from './request';

const STORAGE_KEY = 'szkj:personal-center-focus-v1';

function getDefaultState() {
	return {
		upcomingProjectIds: [],
		adminProgressFeedIds: [],
	};
}

function readLocalState() {
	if (typeof window === 'undefined') return getDefaultState();
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return getDefaultState();
		const parsed = { ...getDefaultState(), ...JSON.parse(raw) };
		return {
			upcomingProjectIds: Array.isArray(parsed.upcomingProjectIds)
				? parsed.upcomingProjectIds.map((item) => String(item || '')).filter(Boolean)
				: [],
			adminProgressFeedIds: Array.isArray(parsed.adminProgressFeedIds)
				? parsed.adminProgressFeedIds.map((item) => String(item || '')).filter(Boolean)
				: [],
		};
	} catch {
		return getDefaultState();
	}
}

function writeLocalState(state) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...getDefaultState(), ...state }));
	} catch {
		// Ignore storage access failures.
	}
}

/**
 * 获取重点关注状态
 */
export async function getPersonalCenterFocusState() {
	try {
		const res = await request('/api/PersonalCenter/focus-state', { method: 'GET' });
		if (res && res.data) {
			writeLocalState(res.data);
			return res.data;
		}
		return readLocalState();
	} catch {
		return readLocalState();
	}
}

/**
 * 更新重点关注状态
 * @param {object} patch - { upcomingProjectIds, adminProgressFeedIds }
 */
export async function updatePersonalCenterFocusState(patch) {
	try {
		const res = await request('/api/PersonalCenter/focus-state', {
			method: 'PUT',
			body: JSON.stringify(patch),
		});
		if (res && res.data) {
			writeLocalState(res.data);
			return res.data;
		}
		const nextState = { ...readLocalState(), ...(patch || {}) };
		writeLocalState(nextState);
		return nextState;
	} catch {
		const nextState = { ...readLocalState(), ...(patch || {}) };
		writeLocalState(nextState);
		return nextState;
	}
}
