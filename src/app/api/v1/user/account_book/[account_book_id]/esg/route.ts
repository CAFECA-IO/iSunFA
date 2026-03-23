import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Prisma } from "@/generated/client";
import {
  EsgScope as ClientEsgScope,
  EsgIntensity as ClientEsgIntensity,
} from "@/interfaces/esg";
/**
 * Info: (20260312 - Julian) 新增 ESG 紀錄
 * POST /api/v1/user/account_book/:account_book_id/esg
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得建立者
    const creator = await prisma.user.findUnique({
      where: { address: sessionUser.address },
    });

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    });

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const body = await request.json();
    const { file } = body;

    // Info: (20260312 - Julian) 驗證 file 參數
    if (!file || !file.hash) {
      console.error("Missing file or file hash");
      return jsonFail(ApiCode.VALIDATION_ERROR, "File is required");
    }

    // Info: (20260312 - Julian) 建立空白 ESG 紀錄
    const newRecord = await prisma.esgRecord.create({
      data: {
        accountBookId: accountBook.id,
        userId: creator.id,
        fileId: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        dateTimestamp: 0,
        scope: "SCOPE_1",
        activityType: "",
        vendor: "",
        rawActivityData: "",
        unit: "",
        emissions: 0,
        intensity: "LOW",
        confidence: 0,
        isVerified: false,
      },
    });

    // Info: (20260312 - Julian) 新增 AuditLog
    await prisma.auditLog.create({
      data: {
        userId: creator.id,
        dataType: "ESG_RECORD",
        dataId: newRecord.id,
        accountBookId: accountBook.id,
        action: "CREATE",
      },
    });

    return jsonOk({ esgRecordId: newRecord.id });
  } catch (error) {
    console.error("Error creating esg record:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to create esg record",
    );
  }
}

/**
 * Info: (20260312 - Julian) 取得全部或指定範圍 ESG 紀錄
 * GET /api/v1/user/account_book/:account_book_id/esg
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    });

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260312 - Julian) 取得 ESG 紀錄
    const { searchParams } = new URL(request.url);
    const searchParam = searchParams.get("search");
    const intensity = searchParams.get("intensity");
    const scope = searchParams.get("scope");
    const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    let dateTimestampQuery: Prisma.IntFilter | undefined = undefined;
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      const month = monthParam ? parseInt(monthParam, 10) : null;
      let startDate: Date;
      let endDate: Date;

      if (month) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
      } else {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      }
      dateTimestampQuery = {
        gte: Math.floor(startDate.getTime() / 1000),
        lte: Math.floor(endDate.getTime() / 1000),
      };
    }

    // Info: (20260312 - Julian) 整理查詢條件
    const whereClause: Prisma.EsgRecordWhereInput = {
      accountBookId: accountBook.id,
      ...(searchParam && {
        OR: [
          { vendor: { contains: searchParam, mode: "insensitive" } },
          { activityType: { contains: searchParam, mode: "insensitive" } },
        ],
      }),
      ...(intensity && { intensity: intensity as ClientEsgIntensity }),
      ...(scope && { scope: scope as ClientEsgScope }),
      ...(dateTimestampQuery && { dateTimestamp: dateTimestampQuery }),
    };

    const esgDbRecords = await prisma.esgRecord.findMany({
      where: whereClause,
      include: { file: true },
      orderBy: { dateTimestamp: sort },
    });

    const esgRecords = esgDbRecords.map((r) => ({
      ...r,
      file: r.file ? {
        id: r.file.id,
        hash: r.file.hash,
        fileName: r.file.fileName || "Unknown"
      } : undefined
    }));

    return jsonOk({
      esgRecords,
      recordCount: esgRecords.length,
    });
  } catch (error) {
    console.error("Error fetching esg records:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch esg records",
    );
  }
}
