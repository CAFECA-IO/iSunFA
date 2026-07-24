"use server";

import {
  parseSmartInput,
  ISmartParseResult,
} from "@/services/route.smart.service";
import { parseWaypointsToCoordinates } from "@/services/route.waypoints.service";
import {
  getNearestPort,
  getNearestAirport,
} from "@/services/logistics.service";
import { calculateSeaPath } from "@/lib/utils/route.sea";
import { calculateAirPath } from "@/lib/utils/route.air";
import { ILogisticsPlan, ITransportSegment } from "@/interfaces/logistics";
import { getRouteApplicability } from "@/lib/utils/route_applicability";
import { EMISSION_FACTORS } from "@/constants/logistics";
import { MoneyUtil } from "@/lib/utils/money";

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
  weightKg: string | number = "1000",
  waypointsDesc?: string | Array<{ lat: number; lng: number; name?: string }>,
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

    // Info: (20260724 - Tzuhan) 排放係數改用 EMISSION_FACTORS 單一來源(需求三:消除多處硬編碼版本不一致)
    const factors = EMISSION_FACTORS;

    const weightTonne = MoneyUtil.toDecimal(weightKg)
      .dividedBy(1000)
      .toString();
    const origin = { lat: originLat, lng: originLng };
    const dest = { lat: destLat, lng: destLng };

    const landOnly = await getLandRoute(origin, dest);
    if (landOnly.success && !landOnly.isFallback) {
      landOnly.co2eKg = MoneyUtil.toDecimal(landOnly.distanceKm || 0)
        .times(weightTonne)
        .times(factors.LAND)
        .toString();
    } else {
      landOnly.success = false;
      landOnly.co2eKg = "0";
    }

    const seaPlan = {
      land_origin_to_port: await getLandRoute(origin, exportPort),
      sea_port_to_port: calculateSeaPath(exportPort, importPort),
      land_port_to_dest: await getLandRoute(importPort, dest),
      total_co2eKg: "0",
    };

    let seaCo2e = MoneyUtil.toDecimal(0);
    if (seaPlan.land_origin_to_port.success) {
      const c = MoneyUtil.toDecimal(seaPlan.land_origin_to_port.distanceKm || 0)
        .times(weightTonne)
        .times(factors.LAND);
      seaPlan.land_origin_to_port.co2eKg = c.toString();
      seaCo2e = seaCo2e.plus(c);
    }
    if (seaPlan.sea_port_to_port.success) {
      const seaDistKm = seaPlan.sea_port_to_port.distanceKm || 0;
      const c = MoneyUtil.toDecimal(seaDistKm)
        .times(weightTonne)
        .times(factors.SEA);
      seaPlan.sea_port_to_port.co2eKg = c.toString();
      seaCo2e = seaCo2e.plus(c);
    }
    if (seaPlan.land_port_to_dest.success) {
      const c = MoneyUtil.toDecimal(seaPlan.land_port_to_dest.distanceKm || 0)
        .times(weightTonne)
        .times(factors.LAND);
      seaPlan.land_port_to_dest.co2eKg = c.toString();
      seaCo2e = seaCo2e.plus(c);
    }
    seaPlan.total_co2eKg = seaCo2e.toString();

    const airPlan = {
      land_origin_to_airport: await getLandRoute(origin, exportAirport),
      air_airport_to_airport: calculateAirPath(exportAirport, importAirport),
      land_airport_to_dest: await getLandRoute(importAirport, dest),
      total_co2eKg: "0",
    };

    let airCo2e = MoneyUtil.toDecimal(0);
    if (airPlan.land_origin_to_airport.success) {
      const c = MoneyUtil.toDecimal(
        airPlan.land_origin_to_airport.distanceKm || 0,
      )
        .times(weightTonne)
        .times(factors.LAND);
      airPlan.land_origin_to_airport.co2eKg = c.toString();
      airCo2e = airCo2e.plus(c);
    }
    if (airPlan.air_airport_to_airport.success) {
      const airDistKm = airPlan.air_airport_to_airport.distanceKm || 0;
      const c = MoneyUtil.toDecimal(airDistKm)
        .times(weightTonne)
        .times(factors.AIR);
      airPlan.air_airport_to_airport.co2eKg = c.toString();
      airCo2e = airCo2e.plus(c);
    }
    if (airPlan.land_airport_to_dest.success) {
      const c = MoneyUtil.toDecimal(
        airPlan.land_airport_to_dest.distanceKm || 0,
      )
        .times(weightTonne)
        .times(factors.LAND);
      airPlan.land_airport_to_dest.co2eKg = c.toString();
      airCo2e = airCo2e.plus(c);
    }
    airPlan.total_co2eKg = airCo2e.toString();

    // eslint-disable-next-line @typescript-eslint/naming-convention
    let custom_multimodal:
      | {
          segments: Array<
            ITransportSegment & { mode: "LAND" | "SEA"; name?: string }
          >;
          total_co2eKg: string;
          total_distanceKm: number;
        }
      | undefined = undefined;

    if (waypointsDesc) {
      let wps: Array<{ lat: number; lng: number; name?: string }> = [];
      if (typeof waypointsDesc === "string") {
        wps = await parseWaypointsToCoordinates(waypointsDesc);
      } else {
        wps = waypointsDesc;
      }

      if (wps.length > 0) {
        const nodes = [
          { lat: originLat, lng: originLng, name: "Origin" },
          ...wps,
          { lat: destLat, lng: destLng, name: "Destination" },
        ];

        let totalCustomCo2e = MoneyUtil.toDecimal(0);
        let totalCustomDist = 0;
        const segments: Array<
          ITransportSegment & { mode: "LAND" | "SEA"; name?: string }
        > = [];

        for (let i = 0; i < nodes.length - 1; i++) {
          const p1 = nodes[i];
          const p2 = nodes[i + 1];

          const segmentRoute = await getLandRoute(p1, p2);

          if (!segmentRoute.success || segmentRoute.isFallback) {
            const p1Port = await getNearestPort(p1.lat, p1.lng);
            const p2Port = await getNearestPort(p2.lat, p2.lng);

            if (p1Port && p2Port) {
              const p1ToPort = await getLandRoute(p1, p1Port);
              const portToPort = calculateSeaPath(p1Port, p2Port);
              const portToP2 = await getLandRoute(p2Port, p2);

              if (p1ToPort.success) {
                const c = MoneyUtil.toDecimal(p1ToPort.distanceKm || 0)
                  .times(weightTonne)
                  .times(factors.LAND);
                segments.push({
                  ...p1ToPort,
                  co2eKg: c.toString(),
                  name: `Land: ${p1.name || "Point"} -> Port`,
                  mode: "LAND",
                });
                totalCustomCo2e = totalCustomCo2e.plus(c);
                totalCustomDist += p1ToPort.distanceKm || 0;
              }
              if (portToPort.success) {
                const c = MoneyUtil.toDecimal(portToPort.distanceKm || 0)
                  .times(weightTonne)
                  .times(factors.SEA);
                segments.push({
                  ...portToPort,
                  co2eKg: c.toString(),
                  name: `Sea: Port -> Port`,
                  mode: "SEA",
                });
                totalCustomCo2e = totalCustomCo2e.plus(c);
                totalCustomDist += portToPort.distanceKm || 0;
              }
              if (portToP2.success) {
                const c = MoneyUtil.toDecimal(portToP2.distanceKm || 0)
                  .times(weightTonne)
                  .times(factors.LAND);
                segments.push({
                  ...portToP2,
                  co2eKg: c.toString(),
                  name: `Land: Port -> ${p2.name || "Point"}`,
                  mode: "LAND",
                });
                totalCustomCo2e = totalCustomCo2e.plus(c);
                totalCustomDist += portToP2.distanceKm || 0;
              }
              continue;
            }
          }

          const c = MoneyUtil.toDecimal(segmentRoute.distanceKm || 0)
            .times(weightTonne)
            .times(factors.LAND);
          segments.push({
            ...segmentRoute,
            co2eKg: c.toString(),
            name: `Land: ${p1.name || "Point"} -> ${p2.name || "Point"}`,
            mode: "LAND",
          });
          totalCustomCo2e = totalCustomCo2e.plus(c);
          totalCustomDist += segmentRoute.distanceKm || 0;
        }

        custom_multimodal = {
          segments,
          total_co2eKg: totalCustomCo2e.toString(),
          total_distanceKm: totalCustomDist,
        };
      }
    }

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
          custom_multimodal,
        },
      },
    };

    // Info: (20260724 - Tzuhan) 決定論適用性判斷:陸運可直達且更短(如國內路線)時屏蔽海運/空運方案
    // Info: (20260724 - Tzuhan) 旗標為單一真實來源,前端據此隱藏選項;判斷規則見 route_applicability.ts
    const applicability = getRouteApplicability(finalPlan);
    finalPlan.comparisonData.plans.sea_multimodal.isApplicable =
      applicability.sea;
    finalPlan.comparisonData.plans.air_multimodal.isApplicable =
      applicability.air;

    return finalPlan;
  } catch (error) {
    console.error("[Action Error] calculateILogisticsPlan:", error);
    throw new Error("計算物流計畫時發生錯誤");
  }
}

export async function calculateLogisticsPlanFromText(
  text: string,
  externalWeight?: number | string,
  waypointsDesc?: string | Array<{ lat: number; lng: number; name?: string }>,
): Promise<{ plan: ILogisticsPlan; parsed: ISmartParseResult }> {
  const parsed = await parseSmartInput(text);

  if (!parsed.origin || !parsed.dest) {
    throw new Error("Could not resolve origin or destination from text.");
  }

  const weightStr = String(externalWeight || parsed.weightKg || 1000);
  const weight = MoneyUtil.toDecimal(
    MoneyUtil.parseInput(weightStr),
  ).toString();
  const plan = await calculateLogisticsPlan(
    parsed.origin.lat,
    parsed.origin.lng,
    parsed.dest.lat,
    parsed.dest.lng,
    weight,
    waypointsDesc,
  );

  return { plan, parsed };
}

export async function calculateMileageFromStrings(
  originDesc: string,
  destDesc: string,
): Promise<{ distanceKm: number }> {
  try {
    const text = `Origin: ${originDesc}, Dest: ${destDesc}`;
    const parsed = await parseSmartInput(text);
    if (!parsed.origin || !parsed.dest)
      throw new Error("Could not parse coordinates");
    const landRoute = await getLandRoute(parsed.origin, parsed.dest);
    if (landRoute.success && landRoute.distanceKm) {
      return { distanceKm: landRoute.distanceKm };
    }
    // Fallback direct distance
    const dist = calculateDistanceKm(
      parsed.origin.lat,
      parsed.origin.lng,
      parsed.dest.lat,
      parsed.dest.lng,
    );
    return { distanceKm: dist * 1.2 };
  } catch (err) {
    console.error("Mileage calc error:", err);
    throw err;
  }
}

export async function calculateBatchLogisticsPlan(
  originDesc: string,
  destDesc: string,
): Promise<{ plan: ILogisticsPlan }> {
  try {
    const text = `Origin: ${originDesc}, Dest: ${destDesc}`;
    const { plan } = await calculateLogisticsPlanFromText(text, 1000);
    return { plan };
  } catch (err) {
    console.error("Batch plan calc error:", err);
    throw err;
  }
}
