import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { DppSimulatorService } from "@/services/dpp_simulator.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const dppSimulatorService = new DppSimulatorService();
  const items = await dppSimulatorService.getSimulatorList();
  return jsonOk(items);
}

export async function DELETE(req: NextRequest) {
  try {
    const { stockId, year } = await req.json();
    if (!stockId || !year) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const dppSimulatorService = new DppSimulatorService();
    await dppSimulatorService.deleteSimulatorData(stockId, year);

    return jsonOk(null);
  } catch (err: unknown) {
    console.error("Delete failed", err);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
