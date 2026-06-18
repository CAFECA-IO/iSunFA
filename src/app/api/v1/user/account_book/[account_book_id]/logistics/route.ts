import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { logisticsRecordRepo } from "@/repositories/logistics_record.repo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const { account_book_id: accountBookId } = await params;
    if (!accountBookId) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    // Info: (20260618 - Tzuhan) 撈取該帳本下前 1000 筆物流紀錄 (依建立時間倒序)
    const records = await logisticsRecordRepo.findMany({
      where: {
        accountBookId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1000,
    });

    return jsonOk({ payload: records });
  } catch (error) {
    console.error("Fetch logistics error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
