import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IEsgRecordFilterOptions } from "@/interfaces/data_filter_option";
import { MeasurementUnit } from "@/constants/enums";

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
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const body = await request.json();
    const { file } = body;

    // Info: (20260312 - Julian) 驗證 file 參數
    if (!file || !file.hash) {
      console.error("Missing file or file hash");
      return jsonFail({
        code: "VA000099",
        message: "File is required",
        status: ApiCode.VALIDATION_ERROR,
      });
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
      unit: MeasurementUnit.PIECE,
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
      dataId: newRecord.newId,
      accountBookId: accountBook.id,
      action: "CREATE",
    });

    return jsonOk({ esgRecordId: newRecord.newId });
  } catch (error) {
    console.error("Error creating esg record:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to create esg record",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
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
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
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

    const options: IEsgRecordFilterOptions = {
      accountBookId,
      keyword: searchParam,
      verifyStatus,
      intensity,
      scope,
      sort,
      year: yearParam ? parseInt(yearParam, 10) : null,
      month: monthParam ? parseInt(monthParam, 10) : null,
      hideDeleted: searchParams.get("hideDeleted") === "true",
      page,
      limit: pageSize,
    };

    const [totalEsgCount, esgRecords] = await Promise.all([
      esgRepo.countEsgRecordsByFilter(options),
      esgRepo.getEsgRecordsByFilter(options),
    ]);

    return jsonOk({
      esgRecords,
      recordCount: totalEsgCount,
    });
  } catch (error) {
    console.error("Error fetching esg records:", error);
    return jsonFail({
      code: "IN000099",
      message: "Failed to fetch esg records",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
