import { NextRequest } from "next/server";
import { jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { DppService } from "@/services/dpp.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sku_id: string; batch_number: string }> },
) {
  try {
    const { sku_id: skuId, batch_number: batchNumber } = await params;

    if (!skuId || !batchNumber) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    const dppService = new DppService();
    const { buffer, filename } = await dppService.generateBatchPdf(
      skuId,
      batchNumber,
    );

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="' + filename + '"',
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
