import { reactive, ref } from 'vue';

export function useMeasurement() {
	const mouseCoords = ref({ longitude: null, latitude: null, height: null });
	const headingDeg = ref(0);
	const scaleBar = reactive({ metersPerPixel: 0, widthPx: 100, label: '100 m', zoom: 0 });

	const measurePanelVisible = ref(false);
	const measureActiveTab = ref('info');
	const DEFAULT_MEASURE_FORM = {
		name: '',
		unit: 'auto',
		path: '测绘/默认',
		desc: '',
		lengthMeters: 0,
		areaSqMeters: 0,
		heightMeters: 0,
		volumeCubicMeters: 0,
		longitude: null,
		latitude: null,
		elevationMeters: null,
		kind: '',
	};
	const measureForm = reactive({ ...DEFAULT_MEASURE_FORM });
	const lastMeasure = reactive({ points: [], segmentsMeters: [], cumulativeMeters: [] });
	const selectedMarkPointEntityId = ref('');
	const syInfoListVersion = ref(0);

	return {
		mouseCoords,
		headingDeg,
		scaleBar,
		measurePanelVisible,
		measureActiveTab,
		DEFAULT_MEASURE_FORM,
		measureForm,
		lastMeasure,
		selectedMarkPointEntityId,
		syInfoListVersion,
	};
}
