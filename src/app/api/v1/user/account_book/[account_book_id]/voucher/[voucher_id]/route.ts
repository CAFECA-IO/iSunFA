import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { esgRepo } from "@/repositories/esg.repo";
import { IVoucherLineUI } from "@/interfaces/voucher";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

/**
 * Info: (20260311 - Julian) 取得傳票
 * GET /api/v1/user/account_book/:account_book_id/voucher/:voucher_id
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; voucher_id: string }> },
) {
  try {
    // Info: (20260311 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260311 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260311 - Julian) 取得傳票
    const { voucher_id: voucherId } = await params;
    if (!voucherId) {
      console.error("Missing voucherId");
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    const voucher = await voucherRepo.getVoucherById(voucherId);

    if (!voucher) {
      console.error("Voucher not found");
      return jsonFail(API_ERRORS.NF_VOUCHER);
    }

    return jsonOk(voucher);
  } catch (error) {
    console.error("Get voucher failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260304 - Julian) 編輯傳票
 * PUT /api/v1/user/account_book/:account_book_id/voucher/:voucher_id
 */
export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; voucher_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260306 - Julian) 驗證更新人員
    const updater = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!updater) {
      console.error("Updater not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260309 - Julian) 取得傳票
    const { voucher_id: voucherId } = await params;
    if (!voucherId) {
      console.error("Missing voucherId");
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    // Info: (20260311 - Julian) 取得更新的內容
    const body = await request.json();
    const { id, inputDate, voucherType, note, isVerified } = body;
    const rows = body.rows as IVoucherLineUI[];

    if (
      !inputDate ||
      !voucherType ||
      !rows ||
      !Array.isArray(rows) ||
      isVerified === undefined
    ) {
      console.error("Invalid input data");
      return jsonFail(API_ERRORS.VA_INVALID_INPUT_DATA);
    }

    // Info: (20260516 - Luphia) 驗證借貸平衡
    let totalDebit = BigInt(0);
    let totalCredit = BigInt(0);
    for (const row of rows) {
      if (row.isDebit) {
        totalDebit += BigInt(row.amount || 0);
      } else {
        totalCredit += BigInt(row.amount || 0);
      }
    }

    if (totalDebit !== totalCredit) {
      console.error("Voucher is imbalanced");
      return jsonFail(API_ERRORS.VL_VOUCHER_IMBALANCED);
    }

    // Info: (20260311 - Julian) Update voucher
    const updatedVoucher = await voucherRepo.updateVoucher(voucherId, {
      id,
      tradingDate: new Date(inputDate),
      tradingType: voucherType.toUpperCase(),
      note: note || "",
      isVerified: isVerified ?? false,
      lines: {
        deleteMany: {}, // Info: (20260311 - Julian) 刪除所有 line 再重新加入
        create: rows.map((row) => ({
          accountingCode: row.accounting?.code || "",
          particular: row.particular || "",
          amount: BigInt(row.amount || 0),
          isDebit: row.isDebit ?? false,
        })),
      },
      analysisStatus: AIAnalysisStatus.COMPLETED, // Info: (20260326 - Julian) 更新傳票後，將 analysisStatus 設為 COMPLETED
    });

    if (!updatedVoucher) {
      console.error("Voucher update failed");
      return jsonFail(API_ERRORS.IS_DB_FAILED);
    }

    // Info: (20260311 - Julian) 新增 log
    await auditLogRepo.createAuditLog({
      userId: updater.id,
      dataType: "VOUCHER",
      dataId: updatedVoucher.id,
      accountBookId: accountBook.id,
      action: "UPDATE",
    });

    return jsonOk(updatedVoucher);
  } catch (error) {
    console.error("Put voucher failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260404 - Luphia) 軟刪除傳票與同步刪除 ESG
 * DELETE /api/v1/user/account_book/:account_book_id/voucher/:voucher_id
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; voucher_id: string }> },
) {
  try {
    // Info: (20260404 - Luphia) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    const { account_book_id: accountBookId, voucher_id: voucherId } =
      await params;

    // Info: (20260404 - Luphia) 確認操作者權限與存在性
    const deleter = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!deleter) {
      console.error("Deleter not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260404 - Luphia) 驗證帳簿
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260404 - Luphia) 取出現有傳票進行檢查
    const existingVoucher = await voucherRepo.getVoucherById(voucherId);
    if (!existingVoucher) {
      return jsonFail(API_ERRORS.NF_VOUCHER);
    }

    const now = new Date();

    // Info: (20260404 - Luphia) 更新 Voucher 的 deletedAt
    await voucherRepo.updateVoucher(voucherId, { deletedAt: now });

    // Info: (20260404 - Luphia) 同步軟刪除對應的 ESG (透過 fileId 原有依賴綁定)
    if (existingVoucher.fileId) {
      await esgRepo.updateManyEsgRecordsByFile(
        existingVoucher.fileId,
        accountBookId,
        {
          deletedAt: now,
        },
      );
    }

    // Info: (20260404 - Luphia) 紀錄刪除動作
    await auditLogRepo.createAuditLog({
      userId: deleter.id,
      dataType: "VOUCHER",
      dataId: voucherId,
      accountBookId: accountBook.id,
      action: "DELETE",
    });

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Delete voucher failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
