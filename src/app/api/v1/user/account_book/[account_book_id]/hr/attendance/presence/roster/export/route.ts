import { NextRequest } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { AppError } from "@/lib/utils/error";
import { fileOk, jsonFail } from "@/lib/utils/response";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { AuditLogAction, AuditLogDataType } from "@/constants/audit_log";
import {
  DEMO_TIME_ZONE,
  ROSTER_CSV_LABELS_ZH_TW,
} from "@/constants/attendance";
import { attendanceRosterExportSchema } from "@/validators";
import { attendanceIdentityService } from "@/services/attendance_identity.service";
import {
  attendancePresenceService,
  rosterActorLabel,
} from "@/services/attendance_presence.service";
import { buildRosterCsv } from "@/lib/utils/attendance_roster_csv";
import { auditLogRepo } from "@/repositories/audit_log.repo";

/**
 * Info: (20260813 - Julian) 緊急疏散點名名單匯出。
 * POST /api/v1/user/account_book/:account_book_id/hr/attendance/presence/roster/export
 * body: `{ workLocationId?: string }`（不給即全帳本）
 *
 * ## 這是本模組正當性的核心，不是一個附加功能
 *
 * 母文件 §D10.5：職安場景下「現場有幾個人、分別是誰」是必須在事故當下
 * 答得出來的問題。§D5 對地圖的隱私質疑也是靠這個場景回答的 ——
 * 現場名單不是為了讓主管知道誰在座位上，是為了火災時知道樓裡還有誰。
 *
 * ## 為什麼是 POST 而不是 GET
 *
 * 它會寫稽核軌跡。GET 在語意上是可重試、可被快取、可被預抓的 ——
 * 而一個會留痕的動作被瀏覽器預抓一次，稽核紀錄就開始說謊。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260813 - Julian) 空 body 也算合法（全帳本匯出），因此解析失敗即視為沒帶條件
    const body = await request.json().catch(() => ({}));
    const parsed = attendanceRosterExportSchema.safeParse(body);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    const { account_book_id: accountBookId } = await params;
    const actor = await attendanceIdentityService.resolveEmployee(
      sessionUser,
      accountBookId,
    );

    const observedAt = new Date();
    const rosters = await attendancePresenceService.getExportRosters({
      accountBookId,
      workLocationId: parsed.data.workLocationId,
      observedAt,
    });

    /**
     * Info: (20260813 - Julian) 每一位被列出的員工各寫一筆 `READ` 稽核。
     *
     * `AuditLogDataType.EMPLOYEE_PII` 的契約是「`dataId` 一律填所屬的
     * `Employee.id`」，理由寫在那個 enum 上：**個資外洩事故的調查軸線是
     * 「哪些人受影響」，不是「哪張表被讀」。** 只寫一筆、把操作者填進 `dataId`，
     * 會讓「這名員工的資料被誰看過」這個最常問的問題完全答不出來。
     *
     * 「某人在某時間在某工地」正是本模組最敏感的一項資訊（ADR 018 Tier 2），
     * 因此一次讀走整份名單必須留痕。
     */
    const listed = rosters.flatMap((roster) => roster.entries);
    if (listed.length > 0) {
      await auditLogRepo.createManyAuditLogs(
        listed.map((entry) => ({
          userId: sessionUser.id,
          accountBookId,
          dataType: AuditLogDataType.EMPLOYEE_PII,
          dataId: entry.employeeId,
          action: AuditLogAction.READ,
        })),
      );
    }

    const generatedAt = observedAt.toLocaleString("zh-TW", {
      timeZone: DEMO_TIME_ZONE,
      hourCycle: "h23",
    });

    const csv = buildRosterCsv({
      rosters,
      labels: ROSTER_CSV_LABELS_ZH_TW,
      generatedAt,
      generatedBy: rosterActorLabel(actor),
      timeZone: DEMO_TIME_ZONE,
    });

    logger.info(
      `[attendance] roster exported by ${actor.employeeNo}: ${listed.length} people across ${rosters.length} locations`,
    );

    /**
     * Info: (20260813 - Julian) 檔名帶產出時刻。
     *
     * 事故現場會連續匯出好幾份，全部叫 `roster.csv` 的話，
     * 下載資料夾裡會出現 `roster (3).csv` —— 而「哪一份是最新的」
     * 正是那個當下最不該用猜的。
     */
    const stamp = observedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    return fileOk(csv, `attendance-roster-${stamp}.csv`, "text/csv");
  } catch (error) {
    if (error instanceof AppError) {
      return jsonFail({
        code: error.apiCode,
        message: error.message,
        status: error.code,
      });
    }
    logger.error("[API] attendance roster export failed", {
      message: (error as Error).message,
    });
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
