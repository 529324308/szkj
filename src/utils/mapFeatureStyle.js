import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import Text from 'ol/style/Text';

const COLORS = {
	normal: '#45efff',
	fill: 'rgba(69, 239, 255, 0.22)',
	selected: '#f59e0b',
	measure: '#45efff',
	markPoint: '#f97316',
	query: '#334155',
	import: '#38bdf8',
	kml: '#a78bfa',
	cad: '#39b8ff',
	landPrice: '#22c55e',
	inspection: '#2563eb',
	issue: '#ef4444',
};

export function createVectorStyle(feature) {
	const kind = feature?.get?.('syKind') || feature?.get?.('layerKind') || 'default';
	const selected = feature?.get?.('selected') === true;
	const visible = feature?.get?.('visible') !== false;
	if (!visible) return null;
	const label = buildFeatureLabel(feature);
	const color = resolveColor(kind, feature);
	const fillColor = resolveFill(kind, feature);
	const baseStyle = new Style({
		image: new CircleStyle({
			radius: 5,
			fill: new Fill({ color }),
			stroke: new Stroke({ color: '#ffffff', width: 2 }),
		}),
		stroke: new Stroke({
			color,
			width: 2.5,
			lineDash: kind === 'query' ? [10, 8] : undefined,
		}),
		fill: new Fill({ color: fillColor }),
		text: label
			? new Text({
				text: String(label),
				font: '13px Microsoft YaHei, sans-serif',
				offsetY: -16,
				fill: new Fill({ color: '#ffffff' }),
				stroke: new Stroke({ color: kind === 'landPrice' ? '#000000' : '#0f172a', width: 3 }),
				backgroundFill: kind === 'landPrice' ? undefined : new Fill({ color: 'rgba(15, 23, 42, 0.68)' }),
				padding: kind === 'landPrice' ? undefined : [3, 6, 3, 6],
			})
			: undefined,
		zIndex: 0,
	});
	if (!selected) return baseStyle;
	return [
		baseStyle,
		new Style({
			image: new CircleStyle({
				radius: 7,
				fill: new Fill({ color }),
				stroke: new Stroke({ color: COLORS.normal, width: 3 }),
			}),
			stroke: new Stroke({
				color: COLORS.normal,
				width: 4,
			}),
			zIndex: 10000,
		}),
	];
}

export function createBaseTextStyle(text, color = '#45efff') {
	return new Style({
		text: new Text({
			text: String(text || ''),
			font: 'bold 13px Microsoft YaHei, sans-serif',
			fill: new Fill({ color: '#ffffff' }),
			stroke: new Stroke({ color: '#0f172a', width: 3 }),
			backgroundFill: new Fill({ color: 'rgba(15, 23, 42, 0.72)' }),
			padding: [3, 6, 3, 6],
			offsetY: -18,
		}),
		image: new CircleStyle({
			radius: 4,
			fill: new Fill({ color }),
		}),
	});
}

function resolveColor(kind, feature) {
	if (feature?.get?.('color')) return feature.get('color');
	if (kind === 'markPoint') return COLORS.markPoint;
	if (['measure', 'distance', 'area', 'volume', 'azimuth', 'angle'].includes(kind)) return COLORS.measure;
	if (kind === 'landPrice') return COLORS.landPrice;
	if (kind === 'import' || kind === 'shp') return COLORS.import;
	if (kind === 'kml') return COLORS.kml;
	if (kind === 'cad') return COLORS.cad;
	if (kind === 'query') return COLORS.query;
	if (kind === 'inspectionRoute') return COLORS.inspection;
	if (kind === 'inspectionIssue') return COLORS.issue;
	return COLORS.normal;
}

function resolveFill(kind, feature) {
	if (feature?.get?.('fillColor')) return feature.get('fillColor');
	if (kind === 'landPrice') return 'rgba(34, 197, 94, 0.22)';
	if (kind === 'markPoint') return 'rgba(249, 115, 22, 0.22)';
	if (['measure', 'distance', 'area', 'volume', 'azimuth', 'angle'].includes(kind)) return 'rgba(69, 239, 255, 0.2)';
	if (kind === 'import' || kind === 'shp') return 'rgba(56, 189, 248, 0.18)';
	if (kind === 'kml') return 'rgba(167, 139, 250, 0.18)';
	if (kind === 'cad') return 'rgba(57, 184, 255, 0.12)';
	if (kind === 'query') return 'rgba(51, 65, 85, 0.3)';
	if (kind === 'inspectionRoute') return 'rgba(37, 99, 235, 0.16)';
	return COLORS.fill;
}

function buildFeatureLabel(feature) {
	const title = feature?.get?.('label') || feature?.get?.('name') || '';
	const measure = feature?.get?.('measureLabel') || '';
	if (title && measure && title !== measure) return `${title}\n${measure}`;
	return title || measure || '';
}
