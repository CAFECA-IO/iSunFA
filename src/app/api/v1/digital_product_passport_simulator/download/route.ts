import { NextRequest } from "next/server";
import { jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { DppSimulatorService } from "@/services/dpp_simulator.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stockId, year, skuId } = body;

    if (!stockId || !year || !skuId) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const cwd = process.cwd();
    const dppSimulatorService = new DppSimulatorService();

    const { buffer, filename } = await dppSimulatorService.generateDownloadZip(
      stockId,
      year,
      skuId,
      cwd,
    );

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Download generation error:", error);
    if (
      error instanceof Error &&
      error.message.includes("Company data not found")
    ) {
      return jsonFail(API_ERRORS.NF_FILE);
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
