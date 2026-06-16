import { reactive, ref } from 'vue';

export function useImportLayers({ terrainInputStorageKey, terrainNameStorageKey }) {
	const terrainActive = ref(false);
	const terrainPanelVisible = ref(false);
	const terrainInputUrl = ref(localStorage.getItem(terrainInputStorageKey) || '');
	const terrainInputName = ref(localStorage.getItem(terrainNameStorageKey) || '');
	const terrainModelItems = ref([]);
	const terrainNetworkVisible = ref(false);
	const selectedTerrainItemKey = ref('');

	const shpImportItems = ref([]);
	const selectedShpItemKey = ref('');
	const kmlImportItems = ref([]);
	const selectedKmlItemKey = ref('');
	const cadImportItems = ref([]);
	const selectedCadItemKey = ref('');

	const shpFeaturePopupVisible = ref(false);
	const shpFeaturePopupMinimized = ref(false);
	const shpFeaturePopup = reactive({
		itemKey: '',
		featureIndex: null,
		featureIndexDisplay: '-',
		title: '',
		subtitle: '',
		layerName: '',
		sourceFileName: '',
		geometryType: '',
		properties: {},
	});
	const shpFeaturePanelPosition = reactive({ left: 0, top: 120 });
	const shpFeaturePanelSize = reactive({ width: 420, height: 520 });
	const shpFeatureHeaderDrag = reactive({ active: false, pointerId: null, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
	const shpFeatureFloatDock = reactive({ side: 'right', top: 120 });
	const shpFeatureFloatOrigin = reactive({ side: 'right', top: 120 });
	const shpFeatureFloat = reactive({ x: 0, y: 120 });
	const shpFeatureFloatSnapped = ref(true);
	const shpFeatureFloatDrag = reactive({ active: false, pointerId: null, startX: 0, startY: 0, startLeft: 0, startTop: 0, moved: false });
	const shpFeatureFloatSize = 46;
	const shpFeatureFloatDockWidth = 76;
	const shpFeatureFloatMargin = 0;
	const shpFeatureFloatTopMin = 60;

	const terrainTilesetMap = new Map();
	const shpDataSourceMap = new Map();
	const kmlDataSourceMap = new Map();
	const kmlObjectUrlMap = new Map();
	const cadDataSourceMap = new Map();

	return {
		terrainActive,
		terrainPanelVisible,
		terrainInputUrl,
		terrainInputName,
		terrainModelItems,
		terrainNetworkVisible,
		selectedTerrainItemKey,
		shpImportItems,
		selectedShpItemKey,
		kmlImportItems,
		selectedKmlItemKey,
		cadImportItems,
		selectedCadItemKey,
		shpFeaturePopupVisible,
		shpFeaturePopupMinimized,
		shpFeaturePopup,
		shpFeaturePanelPosition,
		shpFeaturePanelSize,
		shpFeatureHeaderDrag,
		shpFeatureFloatDock,
		shpFeatureFloatOrigin,
		shpFeatureFloat,
		shpFeatureFloatSnapped,
		shpFeatureFloatDrag,
		shpFeatureFloatSize,
		shpFeatureFloatDockWidth,
		shpFeatureFloatMargin,
		shpFeatureFloatTopMin,
		terrainTilesetMap,
		shpDataSourceMap,
		kmlDataSourceMap,
		kmlObjectUrlMap,
		cadDataSourceMap,
	};
}
