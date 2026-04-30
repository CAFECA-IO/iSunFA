'use server';

import { getNearestPort, getNearestAirport } from '@/lib/actions/logistics';
import searoute from 'searoute-js';
import { logisticsRepo } from "@/repositories/logistics.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { ILogisticsPlan, ITransportSegment } from '@/interfaces/logistics';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
}

function calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number) {
    return calculateDistanceKm(lat1, lon1, lat2, lon2) / 1.852;
}

function splitAtAntimeridian(geometry: GeoJSON.Geometry | null | undefined): GeoJSON.Geometry | null {
    if (!geometry) return null;
    if (geometry.type === 'GeometryCollection') return geometry;
    if (!('coordinates' in geometry) || !geometry.coordinates) return geometry;

    if (geometry.type === 'LineString') {
        const coords = geometry.coordinates;
        const multiLines: number[][][] = [];
        let currentLine: number[][] = [];

        for (let i = 0; i < coords.length; i++) {
            const [lng, lat] = coords[i];
            if (i === 0) {
                currentLine.push([lng, lat]);
                continue;
            }

            const [prevLng, prevLat] = currentLine[currentLine.length - 1];

            if (lng - prevLng > 180) {
                const lngCont = lng - 360;
                const fraction = lngCont !== prevLng ? (-180 - prevLng) / (lngCont - prevLng) : 0.5;
                const latMid = prevLat + fraction * (lat - prevLat);

                currentLine.push([-180, latMid]);
                multiLines.push(currentLine);
                currentLine = [[180, latMid], [lng, lat]];
            } else if (prevLng - lng > 180) {
                const lngCont = lng + 360;
                const fraction = lngCont !== prevLng ? (180 - prevLng) / (lngCont - prevLng) : 0.5;
                const latMid = prevLat + fraction * (lat - prevLat);

                currentLine.push([180, latMid]);
                multiLines.push(currentLine);
                currentLine = [[-180, latMid], [lng, lat]];
            } else {
                currentLine.push([lng, lat]);
            }
        }

        if (currentLine.length > 0) {
            multiLines.push(currentLine);
        }

        if (multiLines.length > 1) {
            return {
                type: 'MultiLineString',
                coordinates: multiLines
            };
        } else {
            return {
                type: 'LineString',
                coordinates: multiLines[0]
            };
        }
    }

    return geometry;
}

async function getLandRoute(start: { lat: number, lng: number }, end: { lat: number, lng: number }): Promise<ITransportSegment> {
    try {
        const url = `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&steps=true`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();

        if (data.code === 'Ok') {
            const routeData = data.routes[0];
            let usesFerry = false;
            for (const leg of routeData.legs || []) {
                for (const step of leg.steps || []) {
                    if (step.mode === 'ferry') {
                        usesFerry = true;
                        break;
                    }
                }
                if (usesFerry) break;
            }

            if (!usesFerry) {
                const distanceKm = routeData.distance / 1000;
                return { success: true, distanceKm, geometry: splitAtAntimeridian(routeData.geometry as GeoJSON.Geometry) };
            }
        }
    } catch {
        // Info: (20260430 - Tzuhan) Fallback
    }

    try {
        let distKm = calculateDistanceKm(start.lat, start.lng, end.lat, end.lng);
        distKm *= 1.2; // Info: (20260430 - Tzuhan) Tortuosity Factor
        const geometry: GeoJSON.LineString = {
            type: "LineString",
            coordinates: [[start.lng, start.lat], [end.lng, end.lat]]
        };
        return { success: true, distanceKm: distKm, geometry: splitAtAntimeridian(geometry), isFallback: true };
    } catch {
        return { success: false, distanceKm: 0, geometry: null };
    }
}

function getSeaRoute(start: { lat: number, lng: number }, end: { lat: number, lng: number }): ITransportSegment {
    try {
        // Info: (20260430 - Tzuhan) searoute requires [lng, lat]
        const origin = [start.lng, start.lat];
        const destination = [end.lng, end.lat];
        const route = searoute(origin, destination);

        return { success: true, distanceNm: route.properties.length, geometry: splitAtAntimeridian(route.geometry as GeoJSON.Geometry) };
    } catch {
        return { success: false, distanceNm: 0, geometry: null };
    }
}

function getAirRoute(start: { lat: number, lng: number }, end: { lat: number, lng: number }): ITransportSegment {
    try {
        const distNm = calculateDistanceNm(start.lat, start.lng, end.lat, end.lng);
        const geometry: GeoJSON.LineString = {
            type: "LineString",
            coordinates: [[start.lng, start.lat], [end.lng, end.lat]]
        };
        return { success: true, distanceNm: distNm, geometry: splitAtAntimeridian(geometry) };
    } catch {
        return { success: false, distanceNm: 0, geometry: null };
    }
}

export async function calculateLogisticsPlan(
    originLat: number, originLng: number,
    destLat: number, destLng: number,
    weightKg: number = 1000
): Promise<ILogisticsPlan> {
    try {
        // Info: (20260430 - Tzuhan) 檢查資料庫快取，避免重複呼叫 OSRM 與重新繪製路徑
        const cachedPlan = await logisticsRepo.getCachedPlan(originLat, originLng, destLat, destLng, weightKg);

        if (cachedPlan && cachedPlan.planData) {
            console.log("[Logistics] Cache hit! Returning cached logistics plan.");
            return cachedPlan.planData as unknown as ILogisticsPlan;
        }

        const [exportPort, importPort, exportAirport, importAirport] = await Promise.all([
            getNearestPort(originLat, originLng),
            getNearestPort(destLat, destLng),
            getNearestAirport(originLat, originLng),
            getNearestAirport(destLat, destLng)
        ]);

        if (!exportPort || !importPort || !exportAirport || !importAirport) {
            throw new Error("無法找到匹配的進出口節點 (海港或機場缺失)");
        }

        // Info: (20260430 - Tzuhan) 取得 DB 中碳排係數
        const coefficients = await esgRepo.getEsgCoefficients({
            where: { name: { in: ['SEA', 'AIR', 'LAND'] }, accountBookId: null }
        });
        const coeffSea = coefficients.find(c => c.name === 'SEA');
        const coeffAir = coefficients.find(c => c.name === 'AIR');
        const coeffLand = coefficients.find(c => c.name === 'LAND');

        const factors = {
            SEA: coeffSea ? Number(coeffSea.emissionFactor) : 0.01045,
            AIR: coeffAir ? Number(coeffAir.emissionFactor) : 0.6023,
            LAND: coeffLand ? Number(coeffLand.emissionFactor) : 0.11289
        };

        const weightTonne = weightKg / 1000.0;
        const origin = { lat: originLat, lng: originLng };
        const dest = { lat: destLat, lng: destLng };

        const landOnly = await getLandRoute(origin, dest);
        if (landOnly.success) {
            landOnly.co2eKg = (landOnly.distanceKm || 0) * weightTonne * factors.LAND;
        } else {
            landOnly.co2eKg = 0;
        }

        const seaPlan = {
            land_origin_to_port: await getLandRoute(origin, exportPort),
            sea_port_to_port: getSeaRoute(exportPort, importPort),
            land_port_to_dest: await getLandRoute(importPort, dest),
            total_co2eKg: 0
        };

        let seaCo2e = 0;
        if (seaPlan.land_origin_to_port.success) {
            const c = (seaPlan.land_origin_to_port.distanceKm || 0) * weightTonne * factors.LAND;
            seaPlan.land_origin_to_port.co2eKg = c;
            seaCo2e += c;
        }
        if (seaPlan.sea_port_to_port.success) {
            const seaDistKm = (seaPlan.sea_port_to_port.distanceNm || 0) * 1.852;
            const c = seaDistKm * weightTonne * factors.SEA;
            seaPlan.sea_port_to_port.co2eKg = c;
            seaCo2e += c;
        }
        if (seaPlan.land_port_to_dest.success) {
            const c = (seaPlan.land_port_to_dest.distanceKm || 0) * weightTonne * factors.LAND;
            seaPlan.land_port_to_dest.co2eKg = c;
            seaCo2e += c;
        }
        seaPlan.total_co2eKg = seaCo2e;

        const airPlan = {
            land_origin_to_airport: await getLandRoute(origin, exportAirport),
            air_airport_to_airport: getAirRoute(exportAirport, importAirport),
            land_airport_to_dest: await getLandRoute(importAirport, dest),
            total_co2eKg: 0
        };

        let airCo2e = 0;
        if (airPlan.land_origin_to_airport.success) {
            const c = (airPlan.land_origin_to_airport.distanceKm || 0) * weightTonne * factors.LAND;
            airPlan.land_origin_to_airport.co2eKg = c;
            airCo2e += c;
        }
        if (airPlan.air_airport_to_airport.success) {
            const airDistKm = (airPlan.air_airport_to_airport.distanceNm || 0) * 1.852;
            const c = airDistKm * weightTonne * factors.AIR;
            airPlan.air_airport_to_airport.co2eKg = c;
            airCo2e += c;
        }
        if (airPlan.land_airport_to_dest.success) {
            const c = (airPlan.land_airport_to_dest.distanceKm || 0) * weightTonne * factors.LAND;
            airPlan.land_airport_to_dest.co2eKg = c;
            airCo2e += c;
        }
        airPlan.total_co2eKg = airCo2e;

        const finalPlan: ILogisticsPlan = {
            exportPort,
            importPort,
            exportAirport,
            importAirport,
            comparisonData: {
                success: true,
                plans: {
                    landOnly,
                    sea_multimodal: seaPlan,
                    air_multimodal: airPlan
                }
            }
        };

        // Info: (20260430 - Tzuhan) 將算出的結果非同步寫入快取 (不阻塞回傳)
        logisticsRepo.saveCachedPlan({
            originLat,
            originLng,
            destLat,
            destLng,
            weightKg,
            planData: JSON.parse(JSON.stringify(finalPlan))
        }).catch(err => console.error("[Logistics] Failed to write cache:", err));

        return finalPlan;

    } catch (error) {
        console.error("[Action Error] calculateILogisticsPlan:", error);
        throw new Error("計算物流計畫時發生錯誤");
    }
}
