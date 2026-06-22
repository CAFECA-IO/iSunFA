import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { parseMultipleRoutesFromText } from "@/services/route.smart.service";
import { calculateBatchLogisticsPlan } from "@/services/route.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "parse_multiple") {
      if (!body.text) {
        return jsonFail({
          ...API_ERRORS.VL_MISSING_PARAMS,
          message: "Missing text.",
        });
      }
      const routes = await parseMultipleRoutesFromText(body.text);
      return jsonOk(routes);
    }

    if (body.action === "calculate_batch") {
      if (!Array.isArray(body.items)) {
        return jsonFail({
          ...API_ERRORS.VL_MISSING_PARAMS,
          message: "Missing items array.",
        });
      }
      const results = await Promise.all(
        body.items.map(async (item: { origin: string; dest: string }) => {
          try {
            const { plan } = await calculateBatchLogisticsPlan(
              item.origin,
              item.dest,
            );
            return { ...item, plan, success: true };
          } catch (e) {
            return { ...item, success: false, error: String(e) };
          }
        }),
      );

      return jsonOk(results);
    }

    return jsonFail({
      ...API_ERRORS.VL_MISSING_PARAMS,
      message: "Invalid action.",
    });
  } catch (error) {
    console.error("Mileage API error:", error);
    return jsonFail({
      ...API_ERRORS.IS_UNKNOWN,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
