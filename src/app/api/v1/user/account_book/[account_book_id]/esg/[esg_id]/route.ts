import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { EsgScope, EsgIntensity } from "@/generated/client";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import {
  IEsgRecord,
  EsgScope as ClientEsgScope,
  EsgIntensity as ClientEsgIntensity,
} from "@/interfaces/esg";

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
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId, esg_id: esgId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260312 - Julian) 取得 ESG 紀錄
    const esgRecord = await esgRepo.getEsgRecordById(esgId);

    if (!esgRecord) {
      console.error("Esg record not found");
      return jsonFail(ApiCode.NOT_FOUND, "Esg record not found");
    }

    const formattedRecord: IEsgRecord = {
      id: esgRecord.id,
      tradingDate: esgRecord.tradingDate.toISOString(),
      fileId: esgRecord.fileId ?? "",
      file: esgRecord.file
        ? {
            id: esgRecord.file.id,
            hash: esgRecord.file.hash,
            fileName: esgRecord.file.fileName || "Unknown",
          }
        : undefined,
      scope: esgRecord.scope as unknown as ClientEsgScope,
      activityType: esgRecord.activityType,
      vendor: esgRecord.vendor,
      rawActivityData: esgRecord.rawActivityData,
      unit: esgRecord.unit,
      emissions: esgRecord.emissions.toString(),
      dqiScore: Number(esgRecord.dqiScore) ?? 0,
      coefficient: esgRecord.coefficient,
      coefficientSource: esgRecord.coefficientSource,
      intensity: esgRecord.intensity as unknown as ClientEsgIntensity,
      confidence: esgRecord.confidence,
      isVerified: esgRecord.isVerified,
      analysisStatus: esgRecord.analysisStatus as unknown as AIAnalysisStatus,
      aiNote: esgRecord.aiNote ?? "",
      journalId: esgRecord.journalId,
      voucherId: esgRecord.voucherId,
    };

    return jsonOk(formattedRecord);
  } catch (error) {
    console.error("Error fetching esg record:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to fetch esg record",
    );
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
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260312 - Julian) 取得更新人員
    const updater = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!updater) {
      console.error("Updater not found");
      return jsonFail(ApiCode.NOT_FOUND, "Updater not found");
    }

    // Info: (20260312 - Julian) 取得帳簿
    const { account_book_id: accountBookId, esg_id: esgId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260312 - Julian) 取得 ESG 紀錄
    const esgRecord = await esgRepo.getEsgRecordById(esgId);

    if (!esgRecord) {
      console.error("Esg record not found");
      return jsonFail(ApiCode.NOT_FOUND, "Esg record not found");
    }

    const reqBody: Partial<IEsgRecord> = await request.json();

    // Info: (20260312 - Julian) 更新 ESG 紀錄
    const updatedRecord = await esgRepo.updateEsgRecord(esgId, {
      ...(reqBody.tradingDate && { tradingDate: reqBody.tradingDate }),
      ...(reqBody.scope && {
        scope: reqBody.scope.toUpperCase() as EsgScope,
      }),
      ...(reqBody.activityType && { activityType: reqBody.activityType }),
      ...(reqBody.vendor && { vendor: reqBody.vendor }),
      ...(reqBody.rawActivityData !== undefined && {
        rawActivityData: reqBody.rawActivityData,
      }),
      ...(reqBody.unit && { unit: reqBody.unit }),
      ...(reqBody.emissions && { emissions: reqBody.emissions }),
      ...(reqBody.intensity && {
        intensity: reqBody.intensity.toUpperCase() as EsgIntensity,
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
    });

    if (!updatedRecord) {
      console.error("Record update failed");
      return jsonFail(ApiCode.NOT_FOUND, "Record update failed");
    }

    const formattedRecord: IEsgRecord = {
      id: updatedRecord.id,
      tradingDate: updatedRecord.tradingDate.toISOString(),
      fileId: updatedRecord.fileId ?? "",
      scope: updatedRecord.scope as unknown as ClientEsgScope,
      activityType: updatedRecord.activityType,
      vendor: updatedRecord.vendor,
      rawActivityData: updatedRecord.rawActivityData,
      unit: updatedRecord.unit,
      emissions: updatedRecord.emissions.toString(),
      dqiScore: Number(updatedRecord.dqiScore) ?? 0,
      coefficient: updatedRecord.coefficient,
      coefficientSource: updatedRecord.coefficientSource,
      intensity: updatedRecord.intensity as unknown as ClientEsgIntensity,
      confidence: updatedRecord.confidence,
      isVerified: updatedRecord.isVerified,
      analysisStatus:
        updatedRecord.analysisStatus as unknown as AIAnalysisStatus,
      aiNote: updatedRecord.aiNote ?? "",
      journalId: updatedRecord.journalId,
      voucherId: updatedRecord.voucherId,
    };

    // Info: (20260312 - Julian) 新增 log
    await auditLogRepo.createAuditLog({
      userId: updater.id,
      dataType: "ESG_RECORD",
      dataId: formattedRecord.id,
      accountBookId: accountBook.id,
      action: "UPDATE",
    });

    return jsonOk(formattedRecord);
  } catch (error) {
    console.error("Error updating esg record:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to update esg record",
    );
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
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    const deleter = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!deleter) {
      console.error("Deleter not found");
      return jsonFail(ApiCode.NOT_FOUND, "Deleter not found");
    }

    const { account_book_id: accountBookId, esg_id: esgId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const existingEsg = await esgRepo.getEsgRecordById(esgId);

    if (!existingEsg) {
      console.error("Esg record not found");
      return jsonFail(ApiCode.NOT_FOUND, "Esg record not found");
    }

    const deletedEsg = await esgRepo.updateEsgRecord(esgId, {
      deletedAt: new Date(),
    });

    if (!deletedEsg) {
      return jsonFail(ApiCode.NOT_FOUND, "Esg record not found to delete");
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
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Delete ESG record failed");
  }
}
