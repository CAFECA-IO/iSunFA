import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { AuditLogDataType } from "@/generated/enums";
import { Prisma } from "@/generated/browser";

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
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const { searchParams } = new URL(request.url);
    const take = searchParams.get("take")
      ? parseInt(searchParams.get("take")!, 10)
      : 100;
    const dataType = searchParams.get("dataType") as AuditLogDataType;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.AuditLogWhereInput = {
      accountBookId: accountBook.id,
    };

    // Info: (20260407 - Julian) 篩選資料類型
    if (dataType) {
      where.dataType = dataType;
    }

    // Info: (20260407 - Julian) 篩選時間區間
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const logs = await auditLogRepo.getAuditLogs({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return jsonOk({ logs });
  } catch (error) {
    console.error("Get audit logs failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Get audit logs failed");
  }
}
