import { calculateDistanceKm, splitAtAntimeridian } from '@/lib/utils/geo';
import { ITransportSegment } from '@/interfaces/logistics';

type Coordinate = [number, number];

/**
 * Info: (20260501 - Luphia) 產生大圓航線的插值點，讓地圖上的飛行路線能如實呈現地球曲率造成的弧線
 */
function interpolateGreatCircle(lat1: number, lon1: number, lat2: number, lon2: number, numPoints: number = 100): Coordinate[] {

	const d2r = Math.PI / 180;
	const r2d = 180 / Math.PI;

	const phi1 = lat1 * d2r;
	const lam1 = lon1 * d2r;
	const phi2 = lat2 * d2r;
	const lam2 = lon2 * d2r;

	// Info: (20260501 - Luphia) 使用 Haversine 算出弦距
	const d = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin((phi1 - phi2) / 2), 2) + Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sin((lam1 - lam2) / 2), 2)));

	if (d === 0) return [[lon1, lat1], [lon2, lat2]];

	const coords: Coordinate[] = [];
	for (let i = 0; i <= numPoints; i++) {
		const f = i / numPoints;
		const A = Math.sin((1 - f) * d) / Math.sin(d);
		const B = Math.sin(f * d) / Math.sin(d);

		const x = A * Math.cos(phi1) * Math.cos(lam1) + B * Math.cos(phi2) * Math.cos(lam2);
		const y = A * Math.cos(phi1) * Math.sin(lam1) + B * Math.cos(phi2) * Math.sin(lam2);
		const z = A * Math.sin(phi1) + B * Math.sin(phi2);

		const phi = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
		const lam = Math.atan2(y, x);

		coords.push([lam * r2d, phi * r2d]);
	}

	return coords;
}

export function calculateAirPath(start: { lat: number, lng: number }, end: { lat: number, lng: number }): ITransportSegment {
	try {
		const distKm = calculateDistanceKm(start.lat, start.lng, end.lat, end.lng);
		
		const coordinates = interpolateGreatCircle(start.lat, start.lng, end.lat, end.lng, 100);

		const geometry: GeoJSON.LineString = {
			type: "LineString",
			coordinates
		};

		return { 
			success: true, 
			distanceKm: distKm, 
			geometry: splitAtAntimeridian(geometry),
			isFallback: false
		};
	} catch (e) {
		console.error("[AirPath] Error:", e);
		return { success: false, distanceKm: 0, geometry: null };
	}
}
