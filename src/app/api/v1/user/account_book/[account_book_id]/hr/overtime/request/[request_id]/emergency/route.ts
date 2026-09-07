import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { enforceRateLimit } from "@/lib/rate_limiter";
import {
  overtimeEmergencyDeclareSchema,
  overtimeEmergencyRevokeSchema,
} from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import { overtimeRequestService } from "@/services/overtime_request.service";

/**
 * Info: (20260819 - Julian) §32 IV 天災事變的認定（review B7）。
 * POST /api/v1/user/account_book/[account_book_id]/hr/overtime/request/:request_id/emergency
 *      body：`{ reportUrl, reportedAt }`，兩者皆必填
 *
 * ## 為什麼這是一支端點，而不是核准的一個欄位
 *
 * 核准要求「管得到他的主管」，認定要求 `HR_ADMIN` —— 一般組織裡沒有人
 * 同時是兩者，做成核准的欄位會讓 §32 IV 變成一條走不通的路。
 * 拆開之後順序也對了：HR 先去報備（通知工會，或報當地主管機關備查），
 * 拿到紀錄之後這張單才帶著加倍發給的性質進到主管手上。
 *
 * ## 這一支不是核准，也不算決行
 *
 * 它只改一件事：這張單是不是 §32 IV 的情形，以及那份報備的來歷。
 * 單子仍然停在 `PENDING`，仍然要由主管決行 —— 認定與核准是兩個人的兩件事，
 * 而職責分離的價值正在於此。
 *
 * 只在 `PENDING` 時可用：核准當下就依旗標切好了分段、算好了補休或折現，
 * 事後才蓋上旗標會讓一張已經按普通級距算完的單子突然變成加倍發給。
 *
 * ## 它不會讓例假日的加班過關
 *
 * §32 IV 是「報主管機關**備查**」，§40 是「報主管機關**核備**」，
 * 法律效果不同。例假日一律擋下，且擋在送出那一關（ADR 024 §4.5）。
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; request_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    // Info: (20260819 - Julian) DeWT 驗證之後、業務邏輯之前（限流規範 §2）
    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.LEAVE_WRITE,
    );
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const parsed = overtimeEmergencyDeclareSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId, request_id: requestId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await overtimeRequestService.declareEmergency({
        accountBookId,
        requestId,
        actorEmployeeId: actor.id,
        reportUrl: parsed.data.reportUrl,
        reportedAt: parsed.data.reportedAt,
        observedAt: new Date(),
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] overtime emergency declaration failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260820 - Julian) 撤回 §32 IV 的認定（review 第 3 輪第 2 條）。
 * DELETE /api/v1/user/account_book/[account_book_id]/hr/overtime/request/:request_id/emergency
 *        body：`{ reason }`，必填
 *
 * ## 為什麼需要它
 *
 * 認定原本是單向的：填錯連結、報備被主管機關退回、認錯了單子 —— 三種情形
 * 都沒有出口，而唯一的走法（把三個欄位清空）等於硬刪一份對外發生過的紀錄。
 * 現在認定與撤回都留在 `OvertimeEmergencyDeclaration`，這一支只改現況。
 *
 * ## 為什麼是 DELETE 而不是另一個 POST
 *
 * 它移除的是**這張單上的那份認定**，而 URL 指的就是它 —— 與同層
 * 「撤回加班單」用獨立路徑的差別在於：那一支改的是單子的狀態
 * （`WITHDRAWN` 是一個新狀態），這一支是把一個附加的宣告拿掉。
 * 帶 body 的 DELETE 在本 repo 已有先例，且理由必填不能靠 query string
 * ——那會讓撤回理由出現在存取紀錄裡。
 *
 * 閘門與認定完全相同（PENDING、HR_ADMIN、不得對自己的單子操作）：撤回會把
 * 整段工資從加倍發給降回普通級距，那個方向對雇主有利、對勞工不利。
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; request_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);

    const limited = enforceRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.LEAVE_WRITE,
    );
    if (limited) return limited;

    const body = await request.json().catch(() => ({}));
    const parsed = overtimeEmergencyRevokeSchema.safeParse(body);
    if (!parsed.success) return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);

    const { account_book_id: accountBookId, request_id: requestId } =
      await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    return jsonOk(
      await overtimeRequestService.revokeEmergency({
        accountBookId,
        requestId,
        actorEmployeeId: actor.id,
        reason: parsed.data.reason,
        observedAt: new Date(),
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] overtime emergency revocation failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
