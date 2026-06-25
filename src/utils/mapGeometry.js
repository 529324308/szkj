import { getArea as getSphereArea, getLength as getSphereLength } from 'ol/sphere';
import { fromLonLat, toLonLat } from 'ol/proj';
import Polygon from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import CircleGeom from 'ol/geom/Circle';

const EARTH_RADIUS_METERS = 6378137;

export function coordinateToLonLat(coordinate) {
	if (!Array.isArray(coordinate)) return { lon: null, lat: null, height: 0 };
	const [lon, lat] = toLonLat(coordinate);
	return {
		lon,
		lat,
		height: 0,
	};
}

export function formatMeasureLength(geometry) {
	const length = getLengthMeters(geometry);
	return length >= 1000 ? `${(length / 1000).toFixed(2)} km` : `${length.toFixed(2)} m`;
}

export function formatMeasureArea(geometry) {
	const area = getAreaSqMeters(geometry);
	return area >= 1000000 ? `${(area / 1000000).toFixed(2)} km²` : `${area.toFixed(2)} m²`;
}

export function getLengthMeters(geometry) {
	if (!geometry) return 0;
	const type = geometry.getType?.();
	if (type === 'Circle') {
		return 2 * Math.PI * Number(geometry.getRadius() || 0);
	}
	try {
		return Math.max(0, getSphereLength(geometry, { projection: 'EPSG:3857' }));
	} catch {
		return 0;
	}
}

export function getAreaSqMeters(geometry) {
	if (!geometry) return 0;
	const type = geometry.getType?.();
	if (type === 'Circle') {
		const radius = Number(geometry.getRadius() || 0);
		return Math.PI * radius * radius;
	}
	try {
		return Math.max(0, getSphereArea(geometry, { projection: 'EPSG:3857' }));
	} catch {
		return 0;
	}
}

export function geometryToPointRows(geometry) {
	if (!geometry) return [];
	const type = geometry.getType?.();
	let coordinates = [];
	if (type === 'Point') coordinates = [geometry.getCoordinates()];
	else if (type === 'LineString') coordinates = geometry.getCoordinates();
	else if (type === 'Polygon') coordinates = geometry.getCoordinates()?.[0] || [];
	else if (type === 'Circle') coordinates = circleToPolygon(geometry).getCoordinates()?.[0] || [];
	return coordinates.map((coordinate) => coordinateToLonLat(coordinate));
}

export function triangulatePointRows(rows = []) {
	const cleanRows = normalizePolygonRows(rows);
	if (cleanRows.length < 3) return [];
	if (cleanRows.length === 3) return [{ index: 0, points: cleanRows.map((point, sourceIndex) => ({ ...point, role: 'vertex', sourceIndex })) }];
	const projected = projectRowsToLocalPlane(cleanRows);
	const indices = projected.map((_, index) => index);
	if (signedArea2d(projected) < 0) indices.reverse();
	const triangles = [];
	let guard = 0;
	while (indices.length > 3 && guard < cleanRows.length * cleanRows.length) {
		guard += 1;
		let earIndex = -1;
		for (let i = 0; i < indices.length; i += 1) {
			const prevIndex = indices[(i - 1 + indices.length) % indices.length];
			const currIndex = indices[i];
			const nextIndex = indices[(i + 1) % indices.length];
			if (!isConvex(projected[prevIndex], projected[currIndex], projected[nextIndex])) continue;
			const hasPointInside = indices.some((candidateIndex) => {
				if (candidateIndex === prevIndex || candidateIndex === currIndex || candidateIndex === nextIndex) return false;
				return pointInTriangle(projected[candidateIndex], projected[prevIndex], projected[currIndex], projected[nextIndex]);
			});
			if (!hasPointInside) {
				earIndex = i;
				triangles.push(buildTriangleRows(cleanRows, [prevIndex, currIndex, nextIndex], triangles.length));
				break;
			}
		}
		if (earIndex < 0) return triangulatePointRowsByFan(cleanRows);
		indices.splice(earIndex, 1);
	}
	if (indices.length === 3) triangles.push(buildTriangleRows(cleanRows, indices, triangles.length));
	return triangles;
}

export function calculateTriangulatedEarthwork(rows = []) {
	const triangles = triangulatePointRows(rows)
		.map((triangle) => {
			const [a, b, c] = triangle.points;
			const areaSqMeters = heronTriangleAreaMeters(a, b, c);
			const averageHeightMeters = averageFinite([a.height, b.height, c.height]);
			const volumeCubicMeters = areaSqMeters * averageHeightMeters;
			return {
				...triangle,
				areaSqMeters,
				averageHeightMeters,
				volumeCubicMeters,
			};
		})
		.filter((triangle) => triangle.areaSqMeters > 0);
	const areaSqMeters = triangles.reduce((sum, triangle) => sum + triangle.areaSqMeters, 0);
	const volumeCubicMeters = triangles.reduce((sum, triangle) => sum + triangle.volumeCubicMeters, 0);
	const averageHeightMeters = areaSqMeters > 0 ? volumeCubicMeters / areaSqMeters : 0;
	return {
		triangles,
		areaSqMeters,
		averageHeightMeters,
		volumeCubicMeters,
	};
}

export function heronTriangleAreaMeters(a, b, c) {
	const sideA = lonLatDistanceMeters(b, c);
	const sideB = lonLatDistanceMeters(a, c);
	const sideC = lonLatDistanceMeters(a, b);
	if (![sideA, sideB, sideC].every((side) => Number.isFinite(side) && side > 0)) return 0;
	const p = (sideA + sideB + sideC) / 2;
	const value = p * (p - sideA) * (p - sideB) * (p - sideC);
	return value > 0 ? Math.sqrt(value) : 0;
}

export function segmentStatsFromRows(rows = []) {
	const segmentsMeters = [];
	const cumulativeMeters = [];
	let cumulative = 0;
	for (let i = 0; i < rows.length; i += 1) {
		let segment = 0;
		if (i > 0) {
			const a = fromLonLat([rows[i - 1].lon, rows[i - 1].lat]);
			const b = fromLonLat([rows[i].lon, rows[i].lat]);
			segment = getSphereLength(new LineString([a, b]), { projection: 'EPSG:3857' });
		}
		cumulative += Number(segment) || 0;
		segmentsMeters.push(Number(segment) || 0);
		cumulativeMeters.push(cumulative);
	}
	return { segmentsMeters, cumulativeMeters };
}

export function bearingDegrees(startLonLat, endLonLat) {
	const [lon1, lat1] = startLonLat.map((value) => Number(value));
	const [lon2, lat2] = endLonLat.map((value) => Number(value));
	if (![lon1, lat1, lon2, lat2].every(Number.isFinite)) return 0;
	const phi1 = toRad(lat1);
	const phi2 = toRad(lat2);
	const deltaLambda = toRad(lon2 - lon1);
	const y = Math.sin(deltaLambda) * Math.cos(phi2);
	const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
	return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function angleDegrees(a, b, c) {
	if (![a, b, c].every(Array.isArray)) return 0;
	const v1 = [a[0] - b[0], a[1] - b[1]];
	const v2 = [c[0] - b[0], c[1] - b[1]];
	const mag1 = Math.hypot(v1[0], v1[1]);
	const mag2 = Math.hypot(v2[0], v2[1]);
	if (!mag1 || !mag2) return 0;
	const cos = Math.min(1, Math.max(-1, (v1[0] * v2[0] + v1[1] * v2[1]) / (mag1 * mag2)));
	return toDeg(Math.acos(cos));
}

export function circleToPolygon(circle, segments = 96) {
	const center = circle.getCenter();
	const radius = Number(circle.getRadius() || 0);
	const ring = [];
	for (let i = 0; i <= segments; i += 1) {
		const angle = (Math.PI * 2 * i) / segments;
		ring.push([
			center[0] + Math.cos(angle) * radius,
			center[1] + Math.sin(angle) * radius,
		]);
	}
	return new Polygon([ring]);
}

export function geometryExtentCenterLonLat(geometry) {
	const extent = geometry?.getExtent?.();
	if (!extent) return null;
	const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
	return coordinateToLonLat(center);
}

export function safeFileName(name, fallback = 'map-object') {
	const safe = String(name || '').trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
	return safe || fallback;
}

export function buildOpenLayersKmlPlacemark(feature, name, description) {
	const geometry = resolveFeatureExportGeometry(feature);
	if (!geometry) return '';
	const safeName = escapeXml(name || '测绘对象');
	const safeDescription = escapeXml(description || '');
	const styleMap = {
		Point: `
		<Style>
			<IconStyle>
				<scale>1.1</scale>
				<Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon>
			</IconStyle>
			<LabelStyle><scale>1</scale></LabelStyle>
		</Style>`,
		LineString: `
		<Style>
			<LineStyle>
				<color>ffffffff</color>
				<width>3</width>
			</LineStyle>
		</Style>`,
		Polygon: `
		<Style>
			<LineStyle>
				<color>ffffffff</color>
				<width>2</width>
			</LineStyle>
			<PolyStyle>
				<color>66000000</color>
				<fill>1</fill>
				<outline>1</outline>
			</PolyStyle>
		</Style>`,
	};
	const geometryXml = geometry.type === 'Point'
		? `<Point><coordinates>${geometry.coordinates}</coordinates></Point>`
		: geometry.type === 'LineString'
			? `<LineString><tessellate>1</tessellate><coordinates>${geometry.coordinates}</coordinates></LineString>`
			: `<Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>${geometry.coordinates}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
	return `
	<Placemark>
		<name>${safeName}</name>
		<description>${safeDescription}</description>${styleMap[geometry.type] || ''}
		${geometryXml}
	</Placemark>`;
}

function resolveFeatureExportGeometry(feature) {
	const geometry = feature?.getGeometry?.();
	if (!geometry) return null;
	if (geometry instanceof Point) {
		return { type: 'Point', coordinates: formatKmlCoordinate(geometry.getCoordinates()) };
	}
	if (geometry instanceof LineString) {
		const coordinates = formatKmlCoordinates(geometry.getCoordinates());
		return coordinates ? { type: 'LineString', coordinates } : null;
	}
	if (geometry instanceof Polygon) {
		const ring = ensureClosedCoordinateRing(geometry.getCoordinates()?.[0] || []);
		const coordinates = formatKmlCoordinates(ring);
		return coordinates ? { type: 'Polygon', coordinates } : null;
	}
	if (geometry instanceof CircleGeom) {
		const ring = ensureClosedCoordinateRing(circleToPolygon(geometry).getCoordinates()?.[0] || []);
		const coordinates = formatKmlCoordinates(ring);
		return coordinates ? { type: 'Polygon', coordinates } : null;
	}
	return null;
}

function formatKmlCoordinates(coordinates = []) {
	return coordinates.map(formatKmlCoordinate).filter(Boolean).join(' ');
}

function formatKmlCoordinate(coordinate) {
	if (!Array.isArray(coordinate)) return '';
	const [lon, lat] = toLonLat(coordinate);
	if (![lon, lat].every(Number.isFinite)) return '';
	return `${lon},${lat},0`;
}

function ensureClosedCoordinateRing(ring = []) {
	if (!ring.length) return [];
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first?.[0] === last?.[0] && first?.[1] === last?.[1]) return ring;
	return [...ring, [...first]];
}

function escapeXml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function toRad(value) {
	return (Number(value) * Math.PI) / 180;
}

function toDeg(value) {
	return (Number(value) * 180) / Math.PI;
}

function normalizePolygonRows(rows = []) {
	const normalized = rows
		.map((point) => ({
			lon: Number(point?.lon),
			lat: Number(point?.lat),
			height: Number.isFinite(Number(point?.height)) ? Number(point.height) : 0,
		}))
		.filter((point) => Number.isFinite(point.lon) && Number.isFinite(point.lat));
	if (normalized.length > 1) {
		const first = normalized[0];
		const last = normalized[normalized.length - 1];
		if (Math.abs(first.lon - last.lon) < 1e-12 && Math.abs(first.lat - last.lat) < 1e-12) {
			normalized.pop();
		}
	}
	return normalized;
}

function calculateRowsCentroid(rows = []) {
	const count = rows.length || 1;
	const summed = rows.reduce((acc, point) => {
		acc.lon += point.lon;
		acc.lat += point.lat;
		acc.height += Number(point.height) || 0;
		return acc;
	}, { lon: 0, lat: 0, height: 0 });
	return {
		lon: summed.lon / count,
		lat: summed.lat / count,
		height: summed.height / count,
	};
}

function triangulatePointRowsByFan(rows = []) {
	const center = calculateRowsCentroid(rows);
	return rows.map((point, index) => ({
		index,
		points: [
			{ ...center, role: 'center' },
			{ ...rows[index], role: 'vertex', sourceIndex: index },
			{ ...rows[(index + 1) % rows.length], role: 'vertex', sourceIndex: (index + 1) % rows.length },
		],
	}));
}

function buildTriangleRows(rows, indices, index) {
	return {
		index,
		points: indices.map((sourceIndex) => ({ ...rows[sourceIndex], role: 'vertex', sourceIndex })),
	};
}

function projectRowsToLocalPlane(rows = []) {
	const center = calculateRowsCentroid(rows);
	const lat0 = toRad(center.lat);
	return rows.map((point) => ({
		...point,
		x: toRad(point.lon - center.lon) * EARTH_RADIUS_METERS * Math.cos(lat0),
		y: toRad(point.lat - center.lat) * EARTH_RADIUS_METERS,
	}));
}

function signedArea2d(points = []) {
	let area = 0;
	for (let i = 0; i < points.length; i += 1) {
		const a = points[i];
		const b = points[(i + 1) % points.length];
		area += (a.x * b.y) - (b.x * a.y);
	}
	return area / 2;
}

function isConvex(a, b, c) {
	return cross2d(a, b, c) > 1e-9;
}

function pointInTriangle(point, a, b, c) {
	const c1 = cross2d(a, b, point);
	const c2 = cross2d(b, c, point);
	const c3 = cross2d(c, a, point);
	return c1 >= -1e-9 && c2 >= -1e-9 && c3 >= -1e-9;
}

function cross2d(a, b, c) {
	return ((b.x - a.x) * (c.y - a.y)) - ((b.y - a.y) * (c.x - a.x));
}

function lonLatDistanceMeters(a, b) {
	const lon1 = toRad(a?.lon);
	const lat1 = toRad(a?.lat);
	const lon2 = toRad(b?.lon);
	const lat2 = toRad(b?.lat);
	if (![lon1, lat1, lon2, lat2].every(Number.isFinite)) return 0;
	const dLat = lat2 - lat1;
	const dLon = lon2 - lon1;
	const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function averageFinite(values = []) {
	const finite = values.map(Number).filter(Number.isFinite);
	if (!finite.length) return 0;
	return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}
