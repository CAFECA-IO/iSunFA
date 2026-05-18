import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IVoucherFilterOptions } from "@/interfaces/data_filter_option";
import { VoucherSorting } from "@/constants/sort";

/**
 * Info: (20260310 - Julian) 新增傳票：將 AI 解析出的傳票存入 DB
 * POST /api/v1/user/account_book/:account_book_id/voucher
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

    // Info: (20260310 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260310 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const body = await request.json();
    const { fileId } = body;

    // Info: (20260311 - Julian) 驗證 file 參數
    if (!fileId) {
      console.error("Missing file or file hash");
      return jsonFail(API_ERRORS.VA_FILE_IS_REQUIRED);
    }

    // Info: (20260311 - Julian) 建立空白傳票
    const newVoucher = await voucherRepo.createVoucher({
      accountBookId: accountBook.id,
      fileId: fileId,
      userId: creator.id,
      tradingDate: new Date(),
      note: "",
      lines: { create: [] },
      confidence: 0,
      aiNote: "",
    });

    if (!newVoucher) {
      console.error("Voucher creation failed");
      return jsonFail(API_ERRORS.IS_DB_FAILED);
    }

    // Info: (20260311 - Julian) 新增 AuditLog
    await auditLogRepo.createAuditLog({
      userId: creator.id,
      dataType: "VOUCHER",
      dataId: newVoucher.newId,
      accountBookId: accountBook.id,
      action: "CREATE",
    });

    return jsonOk({ voucherId: newVoucher.newId });
  } catch (error) {
    console.error("Error creating voucher:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260310 - Julian) 取得全部或指定範圍傳票
 * GET /api/v1/user/account_book/:account_book_id/voucher
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260310 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260310 - Julian) 取得建立者
    const author = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!author) {
      console.error("Author not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260310 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const searchParams = request.nextUrl.searchParams;
    const verifyStatus = searchParams.get("verifyStatus");
    const keyWord = searchParams.get("keyWord");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : undefined;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!)
      : undefined;
    const type = searchParams.get("type");
    const hideDeleted = searchParams.get("hideDeleted") === "true";
    const sorting =
      (searchParams.get("sorting") as VoucherSorting) ??
      VoucherSorting.DATE_DESC;

    const options: IVoucherFilterOptions = {
      accountBookId: accountBook.id,
      verifyStatus,
      keyword: keyWord,
      startDate,
      endDate,
      page,
      limit: pageSize,
      type,
      hideDeleted,
      sorting,
    };

    // Info: (20260310 - Julian) 取得日記帳列表
    const vouchers = await voucherRepo.getVouchersByFilter(options);

    // Info: (20260324 - Julian) 總筆數
    const totalCount = await voucherRepo.countVouchersByFilter(options);

    return jsonOk({ data: vouchers, total: totalCount });
  } catch (error) {
    console.error("Get vouchers failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
