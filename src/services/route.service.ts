"use server";

import {
  parseSmartInput,
  ISmartParseResult,
} from "@/services/route.smart.service";
import {
  getNearestPort,
  getNearestAirport,
} from "@/services/logistics.service";
import { calculateSeaPath } from "@/lib/utils/route.sea";
import { calculateAirPath } from "@/lib/utils/route.air";
import { ILogisticsPlan, ITransportSegment } from "@/interfaces/logistics";

function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

function splitAtAntimeridian(
  geometry: GeoJSON.Geometry | null | undefined,
): GeoJSON.Geometry | null {
  if (!geometry) return null;
  if (geometry.type === "GeometryCollection") return geometry;
  if (!("coordinates" in geometry) || !geometry.coordinates) return geometry;

  if (geometry.type === "LineString") {
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
        const fraction =
          lngCont !== prevLng ? (-180 - prevLng) / (lngCont - prevLng) : 0.5;
        const latMid = prevLat + fraction * (lat - prevLat);

        currentLine.push([-180, latMid]);
        multiLines.push(currentLine);
        currentLine = [
          [180, latMid],
          [lng, lat],
        ];
      } else if (prevLng - lng > 180) {
        const lngCont = lng + 360;
        const fraction =
          lngCont !== prevLng ? (180 - prevLng) / (lngCont - prevLng) : 0.5;
        const latMid = prevLat + fraction * (lat - prevLat);

        currentLine.push([180, latMid]);
        multiLines.push(currentLine);
        currentLine = [
          [-180, latMid],
          [lng, lat],
        ];
      } else {
        currentLine.push([lng, lat]);
      }
    }

    if (currentLine.length > 0) {
      multiLines.push(currentLine);
    }

    if (multiLines.length > 1) {
      return {
        type: "MultiLineString",
        coordinates: multiLines,
      };
    } else {
      return {
        type: "LineString",
        coordinates: multiLines[0],
      };
    }
  }

  return geometry;
}

async function getLandRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
): Promise<ITransportSegment> {
  try {
    // Info: (20260501) 改用本地 Docker OSRM 伺服器，由環境變數注入
    const osrmUrl = process.env.OSRM_ROUTER_URL;
    const url = `${osrmUrl}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&steps=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();

    if (data.code === "Ok") {
      const routeData = data.routes[0];
      const distanceKm = routeData.distance / 1000;
      const directDistKm = calculateDistanceKm(
        start.lat,
        start.lng,
        end.lat,
        end.lng,
      );

      // Info: (20260502 - Luphia) 攔截異常：如果 OSRM 回傳極短距離（如 0）或駕駛距離不到直線距離的一半，代表座標被錯誤捕捉到地圖邊界
      if (
        distanceKm < directDistKm * 0.5 ||
        (distanceKm === 0 && directDistKm > 0.01)
      ) {
        throw new Error(
          "OSRM route is invalid due to out-of-bounds coordinate snapping.",
        );
      }

      let usesFerry = false;
      for (const leg of routeData.legs || []) {
        for (const step of leg.steps || []) {
          if (step.mode === "ferry") {
            usesFerry = true;
            break;
          }
        }
        if (usesFerry) break;
      }

      if (!usesFerry) {
        return {
          success: true,
          distanceKm,
          geometry: splitAtAntimeridian(routeData.geometry as GeoJSON.Geometry),
        };
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
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat],
      ],
    };
    return {
      success: true,
      distanceKm: distKm,
      geometry: splitAtAntimeridian(geometry),
      isFallback: true,
    };
  } catch {
    return { success: false, distanceKm: 0, geometry: null };
  }
}

export async function calculateLogisticsPlan(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  weightKg: number = 1000,
): Promise<ILogisticsPlan> {
  try {
    const [exportPort, importPort, exportAirport, importAirport] =
      await Promise.all([
        getNearestPort(originLat, originLng),
        getNearestPort(destLat, destLng),
        getNearestAirport(originLat, originLng),
        getNearestAirport(destLat, destLng),
      ]);

    if (!exportPort || !importPort || !exportAirport || !importAirport) {
      throw new Error("無法找到匹配的進出口節點 (海港或機場缺失)");
    }

    const factors = {
      SEA: 0.01045,
      AIR: 0.6023,
      LAND: 0.11289,
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
      sea_port_to_port: calculateSeaPath(exportPort, importPort),
      land_port_to_dest: await getLandRoute(importPort, dest),
      total_co2eKg: 0,
    };

    let seaCo2e = 0;
    if (seaPlan.land_origin_to_port.success) {
      const c =
        (seaPlan.land_origin_to_port.distanceKm || 0) *
        weightTonne *
        factors.LAND;
      seaPlan.land_origin_to_port.co2eKg = c;
      seaCo2e += c;
    }
    if (seaPlan.sea_port_to_port.success) {
      const seaDistKm = seaPlan.sea_port_to_port.distanceKm || 0;
      const c = seaDistKm * weightTonne * factors.SEA;
      seaPlan.sea_port_to_port.co2eKg = c;
      seaCo2e += c;
    }
    if (seaPlan.land_port_to_dest.success) {
      const c =
        (seaPlan.land_port_to_dest.distanceKm || 0) *
        weightTonne *
        factors.LAND;
      seaPlan.land_port_to_dest.co2eKg = c;
      seaCo2e += c;
    }
    seaPlan.total_co2eKg = seaCo2e;

    const airPlan = {
      land_origin_to_airport: await getLandRoute(origin, exportAirport),
      air_airport_to_airport: calculateAirPath(exportAirport, importAirport),
      land_airport_to_dest: await getLandRoute(importAirport, dest),
      total_co2eKg: 0,
    };

    let airCo2e = 0;
    if (airPlan.land_origin_to_airport.success) {
      const c =
        (airPlan.land_origin_to_airport.distanceKm || 0) *
        weightTonne *
        factors.LAND;
      airPlan.land_origin_to_airport.co2eKg = c;
      airCo2e += c;
    }
    if (airPlan.air_airport_to_airport.success) {
      const airDistKm = airPlan.air_airport_to_airport.distanceKm || 0;
      const c = airDistKm * weightTonne * factors.AIR;
      airPlan.air_airport_to_airport.co2eKg = c;
      airCo2e += c;
    }
    if (airPlan.land_airport_to_dest.success) {
      const c =
        (airPlan.land_airport_to_dest.distanceKm || 0) *
        weightTonne *
        factors.LAND;
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
          air_multimodal: airPlan,
        },
      },
    };

    return finalPlan;
  } catch (error) {
    console.error("[Action Error] calculateILogisticsPlan:", error);
    throw new Error("計算物流計畫時發生錯誤");
  }
}

export async function calculateLogisticsPlanFromText(
  text: string,
  externalWeight?: number | string,
): Promise<{ plan: ILogisticsPlan; parsed: ISmartParseResult }> {
  const parsed = await parseSmartInput(text);

  if (!parsed.origin || !parsed.dest) {
    throw new Error("Could not resolve origin or destination from text.");
  }

  const weight = Number(externalWeight || parsed.weightKg || 1000);
  const plan = await calculateLogisticsPlan(
    parsed.origin.lat,
    parsed.origin.lng,
    parsed.dest.lat,
    parsed.dest.lng,
    weight,
  );

  return { plan, parsed };
}
