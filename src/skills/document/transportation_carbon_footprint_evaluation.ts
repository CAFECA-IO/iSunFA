import { ITaskSkill } from "@/skills/types";
import { IPseudoTask } from "@/skills/types";
import {
  calculateLogisticsPlan,
  calculateLogisticsPlanFromText,
} from "@/services/route.service";
import { parseMultipleRoutesFromText } from "@/services/route.smart.service";
import { MILEAGE_ACTION, ROUTE_MODE } from "@/constants/analysis";
import { MoneyUtil } from "@/lib/utils/money";

export class TransportationCarbonFootprintEvaluationSkill implements ITaskSkill {
  name = "TRANSPORTATION_CARBON_FOOTPRINT";
  description =
    "Calculate the transportation carbon footprint based on origin, destination, and weight.";
  parameters = {
    type: "object",
    properties: {},
    required: [],
  };

  async execute(task: IPseudoTask): Promise<string> {
    const payloadStr = (task.data?.context as string) || "{}";
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(payloadStr);
    } catch {}

    const action = payload.action;

    if (action === MILEAGE_ACTION.PARSE_MULTIPLE) {
      const text = payload.text as string;
      if (!text) throw new Error("Missing text for parsing.");
      const items = await parseMultipleRoutesFromText(text);
      return JSON.stringify(items, null, 2);
    }

    if (action === MILEAGE_ACTION.CALCULATE_BATCH) {
      const items = payload.items as Array<{
        origin: string | { lat: number; lng: number; name?: string };
        dest: string | { lat: number; lng: number; name?: string };
        weightKg?: number;
        waypoints?: string | Array<{ lat: number; lng: number; name?: string }>;
      }>;
      if (!items || !Array.isArray(items))
        throw new Error("Missing items for batch calculation.");

      const results = [];
      for (const item of items) {
        try {
          const weightKg = item.weightKg ? String(item.weightKg) : "1000";
          let plan;

          if (
            typeof item.origin === "object" &&
            item.origin !== null &&
            "lat" in item.origin &&
            "lng" in item.origin &&
            typeof item.dest === "object" &&
            item.dest !== null &&
            "lat" in item.dest &&
            "lng" in item.dest
          ) {
            plan = await calculateLogisticsPlan(
              Number(item.origin.lat),
              Number(item.origin.lng),
              Number(item.dest.lat),
              Number(item.dest.lng),
              weightKg,
              item.waypoints,
            );
          } else {
            const originStr =
              typeof item.origin === "string"
                ? item.origin
                : JSON.stringify(item.origin);
            const destStr =
              typeof item.dest === "string"
                ? item.dest
                : JSON.stringify(item.dest);
            const text = `Origin: ${originStr}, Dest: ${destStr}`;
            const res = await calculateLogisticsPlanFromText(
              text,
              weightKg,
              item.waypoints,
            );
            plan = res.plan;
          }

          const landPlan = plan.comparisonData.plans.landOnly;
          const seaPlan = plan.comparisonData.plans.sea_multimodal;
          const airPlan = plan.comparisonData.plans.air_multimodal;

          let selectedMode = "LAND";
          let totalDist = 0;
          let landDist = 0;
          let seaDist = 0;
          let airDist = 0;
          let landGeometry: unknown = null;
          let seaGeometry: unknown = null;
          let airGeometry: unknown = null;

          // Info: (20260629 - Tzuhan) Process custom multimodal plan if available
          const customPlan = plan.comparisonData.plans.custom_multimodal;

          if (customPlan) {
            selectedMode = "CUSTOM";
            totalDist = customPlan.total_distanceKm || 0;
            landDist = 0;
            seaDist = 0;

            const landGeoms: GeoJSON.Feature[] = [];
            const seaGeoms: GeoJSON.Feature[] = [];

            for (const seg of customPlan.segments) {
              if (seg.mode === "LAND") {
                landDist += seg.distanceKm || 0;
                if (seg.geometry)
                  landGeoms.push({
                    type: "Feature",
                    geometry: seg.geometry,
                    properties: {},
                  });
              } else if (seg.mode === "SEA") {
                seaDist += seg.distanceKm || 0;
                if (seg.geometry)
                  seaGeoms.push({
                    type: "Feature",
                    geometry: seg.geometry,
                    properties: {},
                  });
              }
            }

            if (landGeoms.length > 0)
              landGeometry = { type: "FeatureCollection", features: landGeoms };
            if (seaGeoms.length > 0)
              seaGeometry = { type: "FeatureCollection", features: seaGeoms };
          } else if (
            !item.waypoints &&
            landPlan.success &&
            !landPlan.isFallback
          ) {
            selectedMode = ROUTE_MODE.LAND;
            totalDist = landPlan.distanceKm || 0;
            landDist = totalDist;
            landGeometry = landPlan.geometry;
          } else if (
            !item.waypoints &&
            seaPlan.sea_port_to_port.success &&
            !seaPlan.sea_port_to_port.isFallback
          ) {
            selectedMode = ROUTE_MODE.SEA_LAND;
            landDist =
              (seaPlan.land_origin_to_port.distanceKm || 0) +
              (seaPlan.land_port_to_dest.distanceKm || 0);
            seaDist = seaPlan.sea_port_to_port.distanceKm || 0;
            totalDist = landDist + seaDist;
            seaGeometry = seaPlan.sea_port_to_port.geometry;
            // Info: (20260511 - Luphia) Combine land geometries
            landGeometry = {
              type: "FeatureCollection",
              features: [
                ...(seaPlan.land_origin_to_port.geometry
                  ? [
                      {
                        type: "Feature",
                        geometry: seaPlan.land_origin_to_port.geometry,
                      },
                    ]
                  : []),
                ...(seaPlan.land_port_to_dest.geometry
                  ? [
                      {
                        type: "Feature",
                        geometry: seaPlan.land_port_to_dest.geometry,
                      },
                    ]
                  : []),
              ],
            };
          } else if (
            !item.waypoints &&
            airPlan.air_airport_to_airport.success &&
            !airPlan.air_airport_to_airport.isFallback
          ) {
            selectedMode = ROUTE_MODE.AIR_LAND;
            landDist =
              (airPlan.land_origin_to_airport.distanceKm || 0) +
              (airPlan.land_airport_to_dest.distanceKm || 0);
            airDist = airPlan.air_airport_to_airport.distanceKm || 0;
            totalDist = landDist + airDist;
            airGeometry = airPlan.air_airport_to_airport.geometry;
            landGeometry = {
              type: "FeatureCollection",
              features: [
                ...(airPlan.land_origin_to_airport.geometry
                  ? [
                      {
                        type: "Feature",
                        geometry: airPlan.land_origin_to_airport.geometry,
                      },
                    ]
                  : []),
                ...(airPlan.land_airport_to_dest.geometry
                  ? [
                      {
                        type: "Feature",
                        geometry: airPlan.land_airport_to_dest.geometry,
                      },
                    ]
                  : []),
              ],
            };
          } else {
            // Info: (20260510 - Luphia) fallback to land
            selectedMode = ROUTE_MODE.LAND;
            totalDist = landPlan.distanceKm || 0;
            landDist = totalDist;
            landGeometry = landPlan.geometry;
          }

          results.push({
            origin: item.origin,
            dest: item.dest,
            // Info: (20260629 - Tzuhan) return waypoints back to UI
            waypoints: item.waypoints,
            // Info: (20260728 - Tzuhan) issue 08:回帶每列實際計算重量,CSV/檢視才能正確顯示與重算(plan 內 CO2e 以此重量計)
            weightKg: Number(weightKg),
            mode: selectedMode,
            distanceKm: totalDist,
            landDistanceKm: landDist,
            seaDistanceKm: seaDist,
            airDistanceKm: airDist,
            landGeometry: landGeometry
              ? JSON.stringify(landGeometry)
              : undefined,
            seaGeometry: seaGeometry ? JSON.stringify(seaGeometry) : undefined,
            airGeometry: airGeometry ? JSON.stringify(airGeometry) : undefined,
            plan,
          });
        } catch (err) {
          console.error("Batch item error", err);
          results.push({
            origin: item.origin,
            dest: item.dest,
            waypoints: item.waypoints,
            error: "Calculation failed",
          });
        }
      }
      return JSON.stringify(results, null, 2);
    }

    // Info: (20260510 - Luphia) fallback for older payloads
    const origin = payload.origin as
      | { lat: string | number; lng: string | number }
      | undefined;
    const dest = payload.dest as
      | { lat: string | number; lng: string | number }
      | undefined;
    const weightKg = payload.weightKg as string | number | undefined;

    if (
      !origin ||
      !dest ||
      origin.lat === undefined ||
      origin.lng === undefined ||
      dest.lat === undefined ||
      dest.lng === undefined
    ) {
      throw new Error("Missing required coordinates.");
    }

    const plan = await calculateLogisticsPlan(
      Number(origin.lat),
      Number(origin.lng),
      Number(dest.lat),
      Number(dest.lng),
      MoneyUtil.toDecimal(
        MoneyUtil.parseInput(String(weightKg || 1000)),
      ).toString(),
    );

    return JSON.stringify(plan, null, 2);
  }
}
