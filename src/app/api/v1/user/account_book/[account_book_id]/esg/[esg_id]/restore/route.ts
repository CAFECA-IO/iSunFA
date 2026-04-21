import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { esgRepo } from "@/repositories/esg.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { journalRepo } from "@/repositories/journal.repo";

/**
 * Info: (20260404 - Luphia) 復原軟刪除的 ESG
 * POST /api/v1/user/account_book/:account_book_id/esg/:esg_id/restore
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string; esg_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const { account_book_id: accountBookId, esg_id: esgId } = await params;

    const restorer = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!restorer) {
      return jsonFail(API_ERRORS.NF_USER);
    }

    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) {
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const existingEsg = await esgRepo.getEsgRecordById(esgId);
    if (!existingEsg) {
      return jsonFail(API_ERRORS.NF_ESG);
    }

    await esgRepo.updateEsgRecord(esgId, { deletedAt: null });

    if (existingEsg.fileId) {
      await voucherRepo.updateManyVouchersByFile(
        existingEsg.fileId,
        accountBookId,
        { deletedAt: null },
      );
      await journalRepo.updateManyJournalsByFile(
        existingEsg.fileId,
        accountBookId,
        { deletedAt: null },
      );
    }

    await auditLogRepo.createAuditLog({
      userId: restorer.id,
      dataType: "ESG_RECORD",
      dataId: esgId,
      accountBookId: accountBook.id,
      action: "UPDATE",
    });

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Restore ESG record failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
