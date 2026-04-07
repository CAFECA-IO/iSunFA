import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IJournal } from "@/interfaces/journal";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { missionRepo } from "@/repositories/mission.repo";
import { missionGenerator } from "@/lib/worker/mission.generator";

/**
 * Info: (20260304 - Julian) 取得日記帳
 * GET /api/v1/user/account_book/:account_book_id/journal/:journal_id
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; journal_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
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

    // Info: (20260309 - Julian) 取得日記帳
    const { journal_id: journalId } = await params;
    if (!journalId) {
      console.error("Missing journalId");
      return jsonFail(ApiCode.VALIDATION_ERROR, "JournalId is required");
    }

    const journalDbRecord = await journalRepo.getJournalById(journalId);

    if (!journalDbRecord) {
      console.error("Journal not found");
      return jsonFail(ApiCode.NOT_FOUND, "Journal not found");
    }

    const journal = {
      ...journalDbRecord,
      file: journalDbRecord.file
        ? {
          id: journalDbRecord.file.id,
          hash: journalDbRecord.file.hash,
          fileName: journalDbRecord.file.fileName || "Unknown",
        }
        : undefined,
      voucherId: journalDbRecord.voucherId,
      esgRecordId: journalDbRecord.esgRecordId,
    };

    return jsonOk(journal);
  } catch (error) {
    console.error("Get journal failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Get journal failed");
  }
}

/**
 * Info: (20260304 - Julian) 編輯日記帳
 * PUT /api/v1/user/account_book/:account_book_id/journal/:journal_id
 */
export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; journal_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260306 - Julian) 驗證更新人員
    const updater = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!updater) {
      console.error("Updater not found");
      return jsonFail(ApiCode.NOT_FOUND, "Updater not found");
    }

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260309 - Julian) 取得日記帳
    const { journal_id: journalId } = await params;
    if (!journalId) {
      console.error("Missing journalId");
      return jsonFail(ApiCode.VALIDATION_ERROR, "JournalId is required");
    }

    const body = await request.json();
    const { text, isVerified } = body;

    // Info: (20260304 - Julian) Update journal
    const updatedJournal = await journalRepo.updateJournal(journalId, {
      text,
      isVerified: isVerified ?? false,
      analysisStatus: AIAnalysisStatus.COMPLETED, // Info: (20260326 - Julian) 用戶編輯日記帳後，將分析狀態設為已完成
    });

    if (!updatedJournal) {
      console.error("Journal update failed");
      return jsonFail(ApiCode.NOT_FOUND, "Journal update failed");
    }

    // Info: (20260306 - Julian) 新增 log
    await auditLogRepo.createAuditLog({
      userId: updater.id,
      dataType: "JOURNAL",
      dataId: updatedJournal.id,
      accountBookId: accountBook.id,
      action: "UPDATE",
    });

    // Info: (20260407 - Julian) 觸發 journal_correction 生成 Voucher 和 ESG
    const missionDef = missionGenerator.generateMission({
      category: "journal_correction",
      periodType: "N/A",
      periodValue: "N/A",
      year: new Date().getFullYear(),
      fileId: updatedJournal.fileId || undefined,
      journalId: updatedJournal.id,
      journalText: text,
      voucherId: updatedJournal.voucherId,
      esgRecordId: updatedJournal.esgRecordId,
      accountBookId: accountBook.id,
      prerequisiteData: { accountBook },
    });

    if (missionDef) {
      await missionRepo.createMission({
        userId: updater.id,
        name: missionDef.name,
        status: AIAnalysisStatus.PENDING,
        tasks: {
          create: missionDef.tasks.map((task) => ({
            type: task.type,
            order: task.order,
            data: task.data,
            status: AIAnalysisStatus.PENDING,
          })),
        },
      });

      // Info: (20260407 - Julian) 將現有傳票狀態更新為 PROCESSING
      if (updatedJournal.voucherId) {
        await voucherRepo.updateVoucher(updatedJournal.voucherId, {
          analysisStatus: AIAnalysisStatus.PROCESSING
        });
        // Info: (20260407 - Julian) 編輯傳票 log
        await auditLogRepo.createAuditLog({
          userId: updater.id,
          dataType: "VOUCHER",
          dataId: updatedJournal.voucherId,
          accountBookId: accountBook.id,
          action: "UPDATE",
        });
      }
      if (updatedJournal.esgRecordId) {
        // Info: (20260407 - Julian) 將現有碳盤查狀態更新為 PROCESSING
        await esgRepo.updateEsgRecord(updatedJournal.esgRecordId, {
          analysisStatus: AIAnalysisStatus.PROCESSING
        });
        // Info: (20260407 - Julian) 編輯碳盤查 log
        await auditLogRepo.createAuditLog({
          userId: updater.id,
          dataType: "ESG_RECORD",
          dataId: updatedJournal.esgRecordId,
          accountBookId: accountBook.id,
          action: "UPDATE",
        });
      }
    }

    const formattedJournal: IJournal = {
      id: updatedJournal.id,
      tradingTimestamp: Math.floor(updatedJournal.tradingDate.getTime() / 1000),
      text: updatedJournal.text,
      fileId: updatedJournal.fileId ?? "",
      file: updatedJournal.file
        ? {
          id: updatedJournal.file.id,
          hash: updatedJournal.file.hash,
          fileName: updatedJournal.file.fileName ?? "",
        }
        : undefined,
      voucherId: updatedJournal.voucherId,
      esgRecordId: updatedJournal.esgRecordId,
      analysisStatus: updatedJournal.analysisStatus as AIAnalysisStatus,
      confidence: updatedJournal.confidence,
      isVerified: updatedJournal.isVerified,
      aiNote: updatedJournal.aiNote,
    };

    return jsonOk(formattedJournal);
  } catch (error) {
    console.error("Put journal failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Put journal failed");
  }
}

/**
 * Info: (20260304 - Julian) 刪除日記帳
 * DELETE /api/v1/user/account_book/:account_book_id/journal/:journal_id
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; journal_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260306 - Julian) 驗證刪除人員
    const deleter = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!deleter) {
      console.error("Deleter not found");
      return jsonFail(ApiCode.NOT_FOUND, "Deleter not found");
    }

    const { journal_id: journalId } = await params;
    if (!journalId) {
      console.error("Missing journalId");
      return jsonFail(ApiCode.VALIDATION_ERROR, "JournalId is required");
    }

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const existingJournal = await journalRepo.getJournalById(journalId);
    if (!existingJournal) {
      return jsonFail(ApiCode.NOT_FOUND, "Journal not found");
    }

    // Info: (20260404 - Luphia) 將 Journal 標記刪除
    const deletedJournal = await journalRepo.updateJournal(journalId, { deletedAt: new Date() });

    if (!deletedJournal) {
      return jsonFail(ApiCode.NOT_FOUND, "Journal record not found to delete");
    }

    // Info: (20260404 - Luphia) 同步刪除關聯 Voucher 和 EsgRecord
    if (existingJournal.fileId) {
      await voucherRepo.updateManyVouchersByFile(
        existingJournal.fileId,
        accountBookId,
        { deletedAt: new Date() },
      );

      await esgRepo.updateManyEsgRecordsByFile(
        existingJournal.fileId,
        accountBookId,
        { deletedAt: new Date() },
      );
    }

    // Info: (20260306 - Julian) 新增 log
    await auditLogRepo.createAuditLog({
      userId: deleter.id,
      dataType: "JOURNAL",
      dataId: deletedJournal.id,
      accountBookId: accountBook.id,
      action: "DELETE",
    });

    return jsonOk({ success: true, journal: deletedJournal });
  } catch (error) {
    console.error("Delete journal failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Delete journal failed");
  }
}
