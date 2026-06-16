import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import path from "path";
import { DppSimulatorService } from "@/services/dpp_simulator.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  const cwd = process.cwd();
  const dppSimulatorService = new DppSimulatorService();

  if (action === "list") {
    const stockId = searchParams.get("stockId");
    const year = searchParams.get("year");
    if (!stockId || !year) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const targetDir = path.join(cwd, "data", stockId, year, "outputs");
    try {
      const tree = await dppSimulatorService.getFileTree(targetDir, cwd);
      return jsonOk(tree);
    } catch {
      return jsonFail(API_ERRORS.NF_FILE);
    }
  } else if (action === "serve" || action === "download") {
    const filePath = searchParams.get("path");
    if (!filePath) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const absolutePath = path.resolve(cwd, filePath);

    try {
      const { buffer, headers } = await dppSimulatorService.getFileDetails(
        absolutePath,
        cwd,
      );

      if (action === "download") {
        headers["Content-Disposition"] =
          `attachment; filename="${path.basename(absolutePath)}"`;
      }

      return new Response(buffer as unknown as BodyInit, { headers });
    } catch {
      return jsonFail(API_ERRORS.NF_FILE);
    }
  }

  return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
}
