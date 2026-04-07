import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { esgRepo } from "@/repositories/esg.repo";

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
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const { account_book_id: accountBookId, esg_id: esgId } = await params;

    const restorer = await webAuthnRepo.findUserByAddress(sessionUser.address);
    if (!restorer) {
      return jsonFail(ApiCode.NOT_FOUND, "Restorer not found");
    }

    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
    if (!accountBook) {
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const existingEsg = await esgRepo.getEsgRecordById(esgId);
    if (!existingEsg) {
      return jsonFail(ApiCode.NOT_FOUND, "ESG record not found");
    }

    await prisma.esgRecord.update({
      where: { id: esgId },
      data: { deletedAt: null },
    });

    if (existingEsg.fileId) {
      await prisma.voucher.updateMany({
        where: {
          fileId: existingEsg.fileId,
          accountBookId: accountBookId,
        },
        data: { deletedAt: null },
      });
      await prisma.journal.updateMany({
        where: {
          fileId: existingEsg.fileId,
          accountBookId: accountBookId,
        },
        data: { deletedAt: null },
      });
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
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Restore ESG record failed");
  }
}
