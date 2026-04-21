import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Prisma } from "@/generated/client";
import {
  IEsgRecord,
  EsgScope as ClientEsgScope,
  EsgIntensity as ClientEsgIntensity,
} from "@/interfaces/esg";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { VerifyStatus } from "@/constants/verify_status";
import { CoefficientCategory } from "@/interfaces/coefficient";
import { EsgActivityTypeKey } from "@/constants/esg_activity_type";

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
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

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
    const newRecord = await esgRepo.createEsgRecord({
      accountBookId: accountBook.id,
      userId: creator.id,
      fileId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      tradingDate: new Date(),
      activityType: "",
      vendor: "",
      amount: 0,
      unit: "",
      emissions: 0,
      dqiScore: 0,
      confidence: 0,
      isVerified: false,
      aiNote: "",
    });

    // Info: (20260312 - Julian) 新增 AuditLog
    await auditLogRepo.createAuditLog({
      userId: creator.id,
      dataType: "ESG_RECORD",
      dataId: newRecord.id,
      accountBookId: accountBook.id,
      action: "CREATE",
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
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260312 - Julian) 取得 ESG 紀錄
    const { searchParams } = new URL(request.url);
    const searchParam = searchParams.get("search");
    const verifyStatus = searchParams.get("verifyStatus");
    const intensity = searchParams.get("intensity");
    const scope = searchParams.get("scope");
    const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : undefined;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!)
      : undefined;

    let recordDateQuery: Prisma.StringFilter | undefined = undefined;
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (yearParam) {
      const year = parseInt(yearParam, 10);
      const month = monthParam ? parseInt(monthParam, 10) : null;

      if (month) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
      } else {
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      }
      recordDateQuery = {
        gte: startDate.toISOString(),
        lte: endDate.toISOString(),
      };
    }

    const hideDeleted = searchParams.get("hideDeleted") === "true";

    // Info: (20260312 - Luphia) 整理查詢條件
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const andConditions: Prisma.EsgRecordWhereInput[] = [];

    // Info: (20260406 - Luphia) 軟刪除過濾邏輯
    if (hideDeleted) {
      andConditions.push({ deletedAt: null });
    }

    // Info: (20260406 - Luphia) 搜尋字串過濾邏輯
    if (searchParam) {
      andConditions.push({
        OR: [
          { vendor: { contains: searchParam, mode: "insensitive" } },
          { activityType: { contains: searchParam, mode: "insensitive" } },
        ],
      });
    }

    if (verifyStatus) {
      andConditions.push({
        isVerified: verifyStatus === VerifyStatus.VERIFIED,
      });
    }

    if (intensity) {
      andConditions.push({ intensity: intensity as ClientEsgIntensity });
    }

    if (scope) {
      andConditions.push({ scope: scope as ClientEsgScope });
    }

    // Info: (20260407 - Julian) 日期過濾邏輯
    if (recordDateQuery && startDate && endDate) {
      andConditions.push({
        OR: [
          { tradingDate: recordDateQuery },
          {
            AND: [{ tradingDate: { gte: startDate, lte: endDate } }],
          },
        ],
      });
    }

    const whereClause: Prisma.EsgRecordWhereInput = {
      accountBookId: accountBook.id,
      AND: andConditions.length > 0 ? andConditions : undefined,
    };

    const totalEsgCount = await esgRepo.countEsgRecords(whereClause);

    const esgDbRecords = await esgRepo.getEsgRecords({
      where: whereClause,
      include: { file: true, coefficient: true },
      orderBy: { tradingDate: sort },
      ...(page && pageSize
        ? { skip: (page - 1) * pageSize, take: pageSize }
        : {}),
    });

    const esgRecords: IEsgRecord[] = esgDbRecords.map((r) => ({
      ...r,
      tradingDate: r.tradingDate.toString(),
      fileId: r.fileId ?? "",
      file: r.file
        ? {
            id: r.file.id,
            hash: r.file.hash,
            fileName: r.file.fileName || "Unknown",
          }
        : undefined,
      scope: r.scope as ClientEsgScope,
      activityType: r.activityType as unknown as EsgActivityTypeKey,
      amount: Number(r.amount),
      emissions: r.emissions.toString(),
      intensity: r.intensity as ClientEsgIntensity,
      analysisStatus: r.analysisStatus as AIAnalysisStatus,
      journalId: r.journalId,
      voucherId: r.voucherId,
      isDeleted: !!r.deletedAt,
      dqiScore: Number(r.dqiScore) ?? 0,
      coefficient: r.coefficient
        ? {
            ...r.coefficient,
            category: !!r.coefficient.accountBookId
              ? CoefficientCategory.CUSTOM
              : CoefficientCategory.STANDARD,
            createdAt: new Date(r.coefficient.createdAt).getTime() / 1000,
            updatedAt: new Date(r.coefficient.updatedAt).getTime() / 1000,
            emissionFactor: Number(r.coefficient.emissionFactor),
          }
        : null,
      emissionSourceTag: r.emissionSourceTag ?? "",
    }));

    return jsonOk({
      esgRecords,
      recordCount: totalEsgCount,
    });
  } catch (error) {
    console.error("Error fetching esg records:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch esg records",
    );
  }
}
