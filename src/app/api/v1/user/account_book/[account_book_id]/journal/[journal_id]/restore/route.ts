import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { journalRepo } from "@/repositories/journal.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { esgRepo } from "@/repositories/esg.repo";

/**
 * Info: (20260404 - Luphia) 復原軟刪除的傳票與同步復原 ESG
 * POST /api/v1/user/account_book/:account_book_id/journal/:journal_id/restore
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; journal_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const { account_book_id: accountBookId, journal_id: journalId } =
      await params;

    const restorer = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!restorer) {
      return jsonFail(ApiCode.NOT_FOUND, "Restorer not found");
    }

    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) {
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260404 - Luphia) 取得現有 Journal
    const existingJournal = await journalRepo.getJournalById(journalId);
    if (!existingJournal) {
      return jsonFail(ApiCode.NOT_FOUND, "Journal not found");
    }

    // Info: (20260404 - Luphia) 將 Journal 復原
    // Info: (20260404 - Luphia) 將 Journal 復原
    await journalRepo.updateJournal(journalId, { deletedAt: null });

    // Info: (20260404 - Luphia) 同步復原 Voucher 和 ESG
    if (existingJournal.fileId) {
      await voucherRepo.updateManyVouchersByFile(
        existingJournal.fileId,
        accountBookId,
        { deletedAt: null },
      );
      await esgRepo.updateManyEsgRecordsByFile(
        existingJournal.fileId,
        accountBookId,
        { deletedAt: null },
      );
    }

    // Info: (20260404 - Luphia) 紀錄復原動作
    await auditLogRepo.createAuditLog({
      userId: restorer.id,
      dataType: "JOURNAL",
      dataId: journalId,
      accountBookId: accountBook.id,
      action: "UPDATE",
    });

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Restore journal failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Restore journal failed");
  }
}
