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
      const items = payload.items as Array<{ origin: string; dest: string }>;
      if (!items || !Array.isArray(items))
        throw new Error("Missing items for batch calculation.");

      const results = [];
      for (const item of items) {
        try {
          const text = `Origin: ${item.origin}, Dest: ${item.dest}`;
          const { plan } = await calculateLogisticsPlanFromText(text);

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

          const forceMode = (item as { mode?: string }).mode;

          if (
            forceMode === ROUTE_MODE.LAND ||
            (!forceMode && landPlan.success && !landPlan.isFallback)
          ) {
            selectedMode = ROUTE_MODE.LAND;
            totalDist = landPlan.distanceKm || 0;
            landDist = totalDist;
            landGeometry = landPlan.geometry;
          } else if (
            forceMode === ROUTE_MODE.SEA_LAND ||
            (!forceMode &&
              seaPlan.sea_port_to_port.success &&
              !seaPlan.sea_port_to_port.isFallback)
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
            forceMode === ROUTE_MODE.AIR_LAND ||
            (!forceMode &&
              airPlan.air_airport_to_airport.success &&
              !airPlan.air_airport_to_airport.isFallback)
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
          } else if (forceMode === ROUTE_MODE.SEA_LAND_AIR) {
            selectedMode = ROUTE_MODE.SEA_LAND_AIR;
            if (seaPlan.sea_port_to_port.success) {
              landDist =
                (seaPlan.land_origin_to_port.distanceKm || 0) +
                (seaPlan.land_port_to_dest.distanceKm || 0);
              seaDist = (seaPlan.sea_port_to_port.distanceKm || 0) * 0.5;
              airDist = (seaPlan.sea_port_to_port.distanceKm || 0) * 0.5;
              totalDist = landDist + seaDist + airDist;
              seaGeometry = seaPlan.sea_port_to_port.geometry;
              // Info: (20260511 - Luphia) Approximation
              airGeometry = seaPlan.sea_port_to_port.geometry;
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
            } else {
              totalDist = landPlan.distanceKm || 0;
              landDist = totalDist;
              landGeometry = landPlan.geometry;
            }
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
          });
        } catch (err) {
          console.error("Batch item error", err);
          results.push({
            origin: item.origin,
            dest: item.dest,
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
