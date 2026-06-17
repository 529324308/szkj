const PROFILE_CACHE_KEY = 'szkj:device-profile:v1';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const TIER_TEXT = {
	flagship: '旗舰',
	high: '高性能',
	balanced: '均衡',
	conservative: '保守',
	low: '低配',
};

const TIER_MODE_TEXT = {
	flagship: '高性能模式',
	high: '高质量模式',
	balanced: '均衡模式',
	conservative: '流畅优先',
	low: '低负载模式',
};

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function wait(ms) {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nextFrame() {
	return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

function round(value, digits = 1) {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

function getConnectionInfo() {
	const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
	if (!connection) {
		return {
			supported: false,
			downlink: null,
			effectiveType: '',
			rtt: null,
		};
	}
	return {
		supported: true,
		downlink: typeof connection.downlink === 'number' ? connection.downlink : null,
		effectiveType: connection.effectiveType || '',
		rtt: typeof connection.rtt === 'number' ? connection.rtt : null,
	};
}

function collectBrowserInfo() {
	return {
		userAgent: navigator.userAgent || '',
		hardwareConcurrency: navigator.hardwareConcurrency || 0,
		deviceMemory: typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null,
		devicePixelRatio: window.devicePixelRatio || 1,
		viewportWidth: window.innerWidth || 0,
		viewportHeight: window.innerHeight || 0,
		screenWidth: window.screen?.width || 0,
		screenHeight: window.screen?.height || 0,
		connection: getConnectionInfo(),
	};
}

function createWebglContext() {
	const canvas = document.createElement('canvas');
	canvas.width = 192;
	canvas.height = 192;
	const contextOptions = {
		alpha: false,
		antialias: true,
		depth: true,
		stencil: false,
		preserveDrawingBuffer: false,
		powerPreference: 'high-performance',
	};
	const gl2 = canvas.getContext('webgl2', contextOptions);
	if (gl2) return { canvas, gl: gl2, version: 'WebGL2' };
	const gl = canvas.getContext('webgl', contextOptions) || canvas.getContext('experimental-webgl', contextOptions);
	return { canvas, gl, version: gl ? 'WebGL1' : '' };
}

function collectWebglInfo(gl, version) {
	if (!gl) {
		return {
			supported: false,
			version: '',
			renderer: '',
			vendor: '',
			maxTextureSize: 0,
			maxRenderbufferSize: 0,
			maxVertexTextureImageUnits: 0,
			antialias: false,
			softwareRenderer: false,
		};
	}

	const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
	const renderer = debugInfo
		? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
		: gl.getParameter(gl.RENDERER);
	const vendor = debugInfo
		? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
		: gl.getParameter(gl.VENDOR);
	const rendererText = String(renderer || '');
	const softwareRenderer = /swiftshader|software|llvmpipe|microsoft basic|mesa offscreen/i.test(rendererText);

	return {
		supported: true,
		version,
		renderer: rendererText,
		vendor: String(vendor || ''),
		maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0,
		maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 0,
		maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) || 0,
		antialias: !!gl.getContextAttributes()?.antialias,
		softwareRenderer,
	};
}

function compileShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function createGpuProgram(gl) {
	const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
		attribute vec2 position;
		uniform float angle;
		void main() {
			float c = cos(angle);
			float s = sin(angle);
			gl_Position = vec4(position.x * c - position.y * s, position.x * s + position.y * c, 0.0, 1.0);
		}
	`);
	const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
		precision mediump float;
		uniform float phase;
		void main() {
			gl_FragColor = vec4(0.05 + phase * 0.25, 0.75, 0.95, 1.0);
		}
	`);
	if (!vertexShader || !fragmentShader) return null;

	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		gl.deleteProgram(program);
		return null;
	}
	return program;
}

async function runCpuBenchmark(threadCount) {
	await nextFrame();
	const iterations = clamp((threadCount || 4) * 90000, 700000, 1700000);
	let value = 0;
	const startedAt = performance.now();
	for (let i = 0; i < iterations; i += 1) {
		value += Math.sqrt(i + 1) * Math.sin((i % 360) * 0.0174532925);
	}
	const payload = Array.from({ length: 700 }, (_, index) => ({
		index,
		value: value + index,
		label: `sample-${index}`,
	}));
	JSON.parse(JSON.stringify(payload));
	const costMs = performance.now() - startedAt;
	const score = clamp(35 + (threadCount || 2) * 2.2 + (90 - costMs * 0.65), 0, 100);
	return {
		costMs: round(costMs),
		iterations,
		score: round(score),
	};
}

async function runGpuBenchmark(canvas, gl, webgl) {
	if (!canvas || !gl) {
		return {
			fps: 0,
			frames: 0,
			drawCalls: 0,
			score: 0,
		};
	}

	await nextFrame();
	const program = createGpuProgram(gl);
	if (!program) {
		const fallbackStartedAt = performance.now();
		let frames = 0;
		while (performance.now() - fallbackStartedAt < 700) {
			frames += 1;
			await nextFrame();
		}
		const fps = frames / ((performance.now() - fallbackStartedAt) / 1000);
		const score = clamp((fps / 60) * 55 + (webgl.version === 'WebGL2' ? 15 : 5), 0, 100);
		return { fps: round(fps), frames, drawCalls: 0, score: round(score) };
	}

	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-0.85, -0.85,
		0.85, -0.85,
		-0.85, 0.85,
		0.85, 0.85,
	]), gl.STATIC_DRAW);

	const positionLocation = gl.getAttribLocation(program, 'position');
	const angleLocation = gl.getUniformLocation(program, 'angle');
	const phaseLocation = gl.getUniformLocation(program, 'phase');
	gl.useProgram(program);
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
	gl.viewport(0, 0, canvas.width, canvas.height);

	const startedAt = performance.now();
	let frames = 0;
	let drawCalls = 0;
	while (performance.now() - startedAt < 900) {
		const now = performance.now();
		const phase = ((now - startedAt) % 1000) / 1000;
		gl.clearColor(0.02, 0.04, 0.07, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
		for (let i = 0; i < 10; i += 1) {
			gl.uniform1f(angleLocation, phase * 6.283 + i * 0.11);
			gl.uniform1f(phaseLocation, phase);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			drawCalls += 1;
		}
		gl.flush();
		frames += 1;
		await nextFrame();
	}

	gl.deleteBuffer(buffer);
	gl.deleteProgram(program);

	const elapsedSeconds = (performance.now() - startedAt) / 1000;
	const fps = frames / elapsedSeconds;
	const textureScore = webgl.maxTextureSize >= 16384 ? 25 : webgl.maxTextureSize >= 8192 ? 18 : webgl.maxTextureSize >= 4096 ? 10 : 4;
	const renderbufferScore = webgl.maxRenderbufferSize >= 8192 ? 10 : webgl.maxRenderbufferSize >= 4096 ? 6 : 2;
	const versionScore = webgl.version === 'WebGL2' ? 12 : 4;
	const aaScore = webgl.antialias ? 3 : 0;
	const softwarePenalty = webgl.softwareRenderer ? 38 : 0;
	const score = clamp((fps / 60) * 50 + textureScore + renderbufferScore + versionScore + aaScore - softwarePenalty, 0, 100);
	return {
		fps: round(fps),
		frames,
		drawCalls,
		score: round(score),
	};
}

function getMemoryScore(deviceMemory) {
	if (typeof deviceMemory !== 'number') return 68;
	if (deviceMemory >= 16) return 96;
	if (deviceMemory >= 8) return 84;
	if (deviceMemory >= 4) return 64;
	return 38;
}

function getBrowserScore(browser, webgl) {
	let score = 0;
	if (webgl.supported) score += 35;
	if (webgl.version === 'WebGL2') score += 25;
	if (!webgl.softwareRenderer) score += 20;
	if ((browser.devicePixelRatio || 1) <= 2) score += 8;
	if ((browser.hardwareConcurrency || 0) >= 4) score += 7;
	if (browser.connection?.effectiveType && !/2g/.test(browser.connection.effectiveType)) score += 5;
	return clamp(score, 0, 100);
}

function getTier(totalScore, webgl) {
	if (!webgl.supported) return 'low';
	if (webgl.softwareRenderer && totalScore > 59) return 'conservative';
	if (totalScore >= 90) return 'flagship';
	if (totalScore >= 75) return 'high';
	if (totalScore >= 60) return 'balanced';
	if (totalScore >= 40) return 'conservative';
	return 'low';
}

function getEstimatedFps(totalScore, webgl, dpr) {
	if (!webgl.supported) return '0';
	const dprPressure = dpr > 2 ? 5 : dpr > 1.5 ? 2 : 0;
	const score = clamp(totalScore - dprPressure - (webgl.softwareRenderer ? 18 : 0), 0, 100);
	if (score >= 90) return '55-60';
	if (score >= 75) return '45-60';
	if (score >= 60) return '30-45';
	if (score >= 40) return '20-30';
	return '15-25';
}

function buildRenderPreset(profile) {
	const tier = profile.benchmark.tierKey;
	const base = {
		tier,
		tierText: profile.benchmark.tierText,
		modeText: profile.benchmark.modeText,
		pixelRatioLimit: 1,
		enableTerrainOnStart: false,
		enableShadows: false,
		enableHighDynamicRange: false,
		enableLighting: false,
		tilesetMaximumScreenSpaceError: 28,
		movingMaximumScreenSpaceError: 36,
		lazyLoadTerrain: true,
		lazyLoadTilesets: true,
	};

	if (tier === 'flagship') {
		return {
			...base,
			pixelRatioLimit: 2,
			enableTerrainOnStart: true,
			enableShadows: true,
			enableHighDynamicRange: true,
			enableLighting: true,
			tilesetMaximumScreenSpaceError: 12,
			movingMaximumScreenSpaceError: 28,
			lazyLoadTerrain: false,
			lazyLoadTilesets: false,
		};
	}
	if (tier === 'high') {
		return {
			...base,
			pixelRatioLimit: 1.75,
			enableTerrainOnStart: true,
			enableHighDynamicRange: true,
			enableLighting: true,
			tilesetMaximumScreenSpaceError: 16,
			movingMaximumScreenSpaceError: 28,
			lazyLoadTerrain: false,
			lazyLoadTilesets: false,
		};
	}
	if (tier === 'balanced') {
		return {
			...base,
			pixelRatioLimit: 1.5,
			tilesetMaximumScreenSpaceError: 20,
			movingMaximumScreenSpaceError: 32,
		};
	}
	if (tier === 'conservative') {
		return {
			...base,
			pixelRatioLimit: 1.25,
			tilesetMaximumScreenSpaceError: 28,
			movingMaximumScreenSpaceError: 40,
		};
	}
	return {
		...base,
		pixelRatioLimit: 1,
		tilesetMaximumScreenSpaceError: 32,
		movingMaximumScreenSpaceError: 44,
	};
}

function buildProfileSignature(profile) {
	return [
		profile.browser.userAgent,
		profile.browser.hardwareConcurrency,
		profile.browser.deviceMemory,
		profile.browser.devicePixelRatio,
		profile.webgl.renderer,
		profile.webgl.version,
	].join('|');
}

function readCachedProfile() {
	try {
		const raw = localStorage.getItem(PROFILE_CACHE_KEY);
		if (!raw) return null;
		const cached = JSON.parse(raw);
		if (!cached?.profile || !cached?.preset || !cached.cachedAt) return null;
		if (Date.now() - cached.cachedAt > CACHE_MAX_AGE_MS) return null;
		return cached;
	} catch {
		return null;
	}
}

function writeCachedProfile(profile, preset) {
	try {
		localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
			cachedAt: Date.now(),
			signature: buildProfileSignature(profile),
			profile,
			preset,
		}));
	} catch {
		// Ignore private-mode or quota failures.
	}
}

function releaseWebglContext(gl) {
	const loseContext = gl?.getExtension?.('WEBGL_lose_context');
	if (loseContext) loseContext.loseContext();
}

export function clearDeviceProfileCache() {
	try {
		localStorage.removeItem(PROFILE_CACHE_KEY);
	} catch {
		// Ignore.
	}
}

export function resolveRecommendedMapEngine(profile) {
	const tier = profile?.benchmark?.tierKey;
	const webglSupported = profile?.webgl?.supported !== false;
	if (!webglSupported) return 'openlayers';
	return ['balanced', 'high', 'flagship'].includes(tier) ? 'cesium' : 'openlayers';
}

export async function collectDeviceProfile(options = {}) {
	const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
	onProgress({ progress: 8, stage: '正在检测浏览器能力' });
	await wait(120);
	const browser = collectBrowserInfo();

	onProgress({ progress: 24, stage: '正在检测 WebGL 渲染能力' });
	await nextFrame();
	const { canvas, gl, version } = createWebglContext();
	const webgl = collectWebglInfo(gl, version);
	const currentSignature = buildProfileSignature({ browser, webgl });

	if (!options.force) {
		const cached = readCachedProfile();
		if (cached?.profile && cached?.preset && cached.signature === currentSignature) {
			releaseWebglContext(gl);
			onProgress({ progress: 90, stage: '已读取设备档案，正在生成地图版本推荐' });
			await wait(120);
			return {
				...cached,
				fromCache: true,
			};
		}
	}

	onProgress({ progress: 42, stage: '正在执行 CPU 跑分' });
	const cpu = await runCpuBenchmark(browser.hardwareConcurrency || 2);

	onProgress({ progress: 60, stage: '正在执行 GPU 跑分' });
	const gpu = await runGpuBenchmark(canvas, gl, webgl);

	releaseWebglContext(gl);

	onProgress({ progress: 76, stage: '正在汇总性能档位' });
	const memoryScore = getMemoryScore(browser.deviceMemory);
	const browserScore = getBrowserScore(browser, webgl);
	const totalScore = webgl.supported
		? clamp(cpu.score * 0.25 + gpu.score * 0.45 + memoryScore * 0.15 + browserScore * 0.15, 0, 100)
		: 0;
	const tierKey = getTier(totalScore, webgl);
	const benchmark = {
		cpuScore: round(cpu.score),
		gpuScore: round(gpu.score),
		memoryScore: round(memoryScore),
		browserScore: round(browserScore),
		totalScore: round(totalScore),
		tierKey,
		tierText: TIER_TEXT[tierKey],
		modeText: TIER_MODE_TEXT[tierKey],
		estimatedFps: getEstimatedFps(totalScore, webgl, browser.devicePixelRatio || 1),
		cpu,
		gpu,
	};

	const profile = {
		collectedAt: Date.now(),
		browser,
		webgl,
		benchmark,
	};
	const preset = buildRenderPreset(profile);

	onProgress({ progress: 84, stage: '正在生成地图版本推荐' });
	await wait(260);
	onProgress({ progress: 90, stage: '请选择进入的地图版本' });

	if (webgl.supported) {
		writeCachedProfile(profile, preset);
	}

	return {
		profile,
		preset,
		fromCache: false,
	};
}

export function buildConservativeRenderPreset() {
	const profile = {
		benchmark: {
			tierKey: 'conservative',
			tierText: TIER_TEXT.conservative,
			modeText: TIER_MODE_TEXT.conservative,
		},
	};
	return buildRenderPreset(profile);
}
