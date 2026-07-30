// Info: (20260716 - Tzuhan) 決定論 CO2e 計算端點(#6519):活動明細 → 計算總表(含係數快照與待補清單)
// Info: (20260716 - Tzuhan) 純端口:授權 → 限流(READ,無 LLM 呼叫) → 驗證 → facade;
// Info: (20260716 - Tzuhan) 計算為無狀態決定論(冪等),結果由前端合併進 E2EE state,server 不落地明文
// Info: (20260720 - Tzuhan) #6520 同請求附帶庫存紀錄時一併執行質量守恆勾稽,結果掛 ledger.articulation

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { describeError } from "@/lib/utils/error_message";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { CarbonCalculateRequestSchema } from "@/validators";
import { CarbonCalculationService } from "@/services/carbon_calculation.service";
import { CarbonArticulationService } from "@/services/carbon_articulation.service";

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const limited = enforceCarbonRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonFail(API_ERRORS.VL_INVALID_JSON);
    }

    const parsed = CarbonCalculateRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }

    const service = new CarbonCalculationService();
    const ledger = await service.computeLedger(parsed.data.activities);
    // Info: (20260720 - Tzuhan) #6520 守恆勾稽(純決定性,無額外 I/O):violation 不擋計算,凍結交由步驟機/報告端裁決
    ledger.articulation = new CarbonArticulationService().check(
      parsed.data.activities,
      parsed.data.stockRecords ?? [],
    );
    return jsonOk({ ledger });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(
      `[API] /chat/carbon/calculate POST error: ${describeError(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
