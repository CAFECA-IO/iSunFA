import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import {
  EsgScope as ClientEsgScope,
  EsgIntensity as ClientEsgIntensity,
} from "@/interfaces/esg";
import { MeasurementUnit } from "@/constants/enums";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { IEsgRecordDetail } from "@/interfaces/esg";

/**
 * Info: (20260312 - Julian) 取得單一 ESG 紀錄
 * GET /api/v1/user/account_book/:account_book_id/esg/:esg_id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string; esg_id: string }> },
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
    const { account_book_id: accountBookId, esg_id: esgId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260312 - Julian) 取得 ESG 紀錄
    const esgRecord = await esgRepo.getEsgRecordById(esgId);

    if (!esgRecord) {
      console.error("Esg record not found");
      return jsonFail(API_ERRORS.NF_ESG);
    }

    return jsonOk(esgRecord);
  } catch (error) {
    console.error("Error fetching esg record:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_FETCH_ESG_RECORD);
  }
}

/**
 * Info: (20260312 - Julian) 編輯單一 ESG 紀錄
 * PUT /api/v1/user/account_book/:account_book_id/esg/:esg_id
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string; esg_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得更新人員
    const updater = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!updater) {
      console.error("Updater not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId, esg_id: esgId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    // Info: (20260312 - Julian) 取得 ESG 紀錄
    const esgRecord = await esgRepo.getEsgRecordById(esgId);

    if (!esgRecord) {
      console.error("Esg record not found");
      return jsonFail(API_ERRORS.NF_ESG);
    }

    const reqBody: Partial<IEsgRecordDetail> = await request.json();

    // Info: (20260312 - Julian) 更新 ESG 紀錄
    const updatedRecord = await esgRepo.updateEsgRecord(esgId, {
      ...(reqBody.tradingDate && {
        tradingDate: new Date(reqBody.tradingDate * 1000),
      }),
      ...(reqBody.scope && {
        scope: reqBody.scope.toUpperCase() as ClientEsgScope,
      }),
      ...(reqBody.activityType && { activityType: reqBody.activityType }),
      ...(reqBody.vendor && { vendor: reqBody.vendor }),
      ...(reqBody.amount !== undefined && {
        amount: reqBody.amount,
      }),
      ...(reqBody.unit && {
        unit: reqBody.unit.toUpperCase() as MeasurementUnit,
      }),
      ...(reqBody.emissions && { emissions: reqBody.emissions }),
      ...(reqBody.intensity && {
        intensity: reqBody.intensity.toUpperCase() as ClientEsgIntensity,
      }),
      ...(reqBody.confidence !== undefined && {
        confidence: reqBody.confidence,
      }),
      ...(reqBody.isVerified !== undefined && {
        isVerified: reqBody.isVerified,
      }),
      ...(reqBody.analysisStatus && {
        // Info: (20260326 - Julian) 如果使用者手動修改，就將 analysisStatus 的 FAILED 設為 COMPLETED
        analysisStatus:
          reqBody.analysisStatus === AIAnalysisStatus.FAILED
            ? AIAnalysisStatus.COMPLETED
            : reqBody.analysisStatus,
      }),
      ...(reqBody.coefficient !== undefined && {
        coefficientId: reqBody.coefficient?.id ?? null,
      }),
      ...(reqBody.emissionSource !== undefined && {
        emissionSourceId: reqBody.emissionSource?.id ?? null,
      }),
    });

    if (!updatedRecord) {
      console.error("Record update failed");
      return jsonFail(API_ERRORS.IS_DB_FAILED);
    }

    // Info: (20260312 - Julian) 新增 log
    await auditLogRepo.createAuditLog({
      userId: updater.id,
      dataType: "ESG_RECORD",
      dataId: updatedRecord.id,
      accountBookId: accountBook.id,
      action: "UPDATE",
    });

    return jsonOk(updatedRecord);
  } catch (error) {
    console.error("Error updating esg record:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_UPDATE_ESG_RECORD);
  }
}

/**
 * Info: (20260404 - Luphia) 刪除單一 ESG 紀錄與同步刪除
 * DELETE /api/v1/user/account_book/:account_book_id/esg/:esg_id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string; esg_id: string }> },
) {
  try {
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    const deleter = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!deleter) {
      console.error("Deleter not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    const { account_book_id: accountBookId, esg_id: esgId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const existingEsg = await esgRepo.getEsgRecordById(esgId);

    if (!existingEsg) {
      console.error("Esg record not found");
      return jsonFail(API_ERRORS.NF_ESG);
    }

    const deletedEsg = await esgRepo.updateEsgRecord(esgId, {
      deletedAt: new Date(),
    });

    if (!deletedEsg) {
      return jsonFail(API_ERRORS.NF_ESG);
    }

    if (existingEsg.fileId) {
      await voucherRepo.updateManyVouchersByFile(
        existingEsg.fileId,
        accountBookId,
        { deletedAt: new Date() },
      );

      await journalRepo.updateManyJournalsByFile(
        existingEsg.fileId,
        accountBookId,
        { deletedAt: new Date() },
      );
    }

    await auditLogRepo.createAuditLog({
      userId: deleter.id,
      dataType: "ESG_RECORD",
      dataId: deletedEsg.id,
      accountBookId: accountBook.id,
      action: "DELETE",
    });

    return jsonOk({ success: true, esgRecord: deletedEsg });
  } catch (error) {
    console.error("Delete ESG record failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
