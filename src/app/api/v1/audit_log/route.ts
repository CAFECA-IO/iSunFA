import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { AuditLogDataType } from "@/generated/enums";

/**
 * Info: (20260306 - Julian) 取得日記帳的異動紀錄
 * GET /api/v1/audit_log
 */
export async function GET(request: NextRequest) {
  try {
    // Info: (20260306 - Julian) 驗證 session user
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // ToDo: (20260305 - Julian) 補上取得帳簿 ID 的邏輯
    const accountBookId = "1";

    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    });

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const { searchParams } = new URL(request.url);
    const take = searchParams.get("take")
      ? parseInt(searchParams.get("take")!, 10)
      : 100;
    const dataType = searchParams.get("dataType") as AuditLogDataType;

    const logs = await prisma.auditLog.findMany({
      where: { dataType, accountBookId: accountBook.id },
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
