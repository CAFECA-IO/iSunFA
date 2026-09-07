import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { parsePositiveInt } from "@/lib/utils/pagination";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IAuditLog } from "@/interfaces/audit_log";
import { IAuditLogFilterOptions } from "@/interfaces/data_filter_option";
import { AuditLogAction, AuditLogDataType } from "@/constants/audit_log";

/**
 * Info: (20260306 - Julian) 取得日記帳的異動紀錄
 * GET /api/v1/user/account_book/:account_book_id/audit_log
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260306 - Julian) 驗證 session user
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), {
      fallback: 1,
    });
    const limit = parsePositiveInt(searchParams.get("limit"), {
      fallback: 20,
      max: 100,
    });

    const keyword = searchParams.get("keyword");
    const actionType = searchParams.get("actionType") as AuditLogAction;
    const dataType = searchParams.get("dataType") as AuditLogDataType;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const options: IAuditLogFilterOptions = {
      accountBookId: accountBook.id,
      keyword,
      actionType,
      dataType,
      startDate,
      endDate,
      page,
      limit,
    };

    const [totalItems, logs] = await Promise.all([
      auditLogRepo.countAuditLogs(options),
      auditLogRepo.getAuditLogs(options),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    // Info: (20260429 - Julian) 轉換成前端格式
    const result: IAuditLog[] = logs.map((log) => {
      return {
        id: log.id,
        action: log.action as AuditLogAction,
        dataType: log.dataType,
        dataId: log.dataId,
        user: {
          id: log.user.id,
          name: log.user.name,
          address: log.user.address,
        },
        createdAt: Math.floor(log.createdAt.getTime() / 1000),
      };
    });

    return jsonOk({ logs: result, totalItems, totalPages, currentPage: page });
  } catch (error) {
    console.error("Get audit logs failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
