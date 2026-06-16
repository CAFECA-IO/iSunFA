import { NextRequest } from "next/server";
import { jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { GenerateDppSchema } from "@/validators/dpp.validator";
import { DppSimulatorService } from "@/services/dpp_simulator.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = GenerateDppSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }

    const { stockId, year, productCount, mode, productId } = parsed.data;

    const dppSimulatorService = new DppSimulatorService();
    const stream = dppSimulatorService.createGenerateStream({
      stockId,
      year,
      productCount,
      mode,
      productId,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    console.error("Generate API Error:", err);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
