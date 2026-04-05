import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { fileRepo } from "@/repositories/file.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { missionRepo } from "@/repositories/mission.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { missionGenerator } from "@/lib/worker/mission.generator";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

/**
 * Info: (20260318 - Julian) AI 分析：生成日記帳、傳票、碳排查
 * POST /api/v1/user/account_book/:account_book_id/ai_analysis
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

    // Info: (20260310 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260318 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const body = await request.json();
    const { file } = body;

    // Info: (20260318 - Julian) 驗證 file 參數
    if (!file) {
      console.error("Missing file or file hash");
      return jsonFail(ApiCode.VALIDATION_ERROR, "File is required");
    }

    // Info: (20260318 - Julian) 將 file 存入 DB
    const uploadedFile = await fileRepo.createFile({
      hash: file.hash,
      fileName: file.file.name,
    });

    if (!uploadedFile) {
      console.error("File upload failed");
      return jsonFail(ApiCode.NOT_FOUND, "File upload failed");
    }

    // Info: (20260318 - Julian) 建立日記帳
    const newJournal = await journalRepo.createJournal({
      accountBookId: accountBook.id,
      fileId: uploadedFile.id,
      text: "",
      tradingDate: new Date(),
      confidence: 0,
      isVerified: false,
      aiNote: "",
    });

    if (!newJournal) {
      console.error("Journal creation failed");
      return jsonFail(ApiCode.NOT_FOUND, "Journal creation failed");
    }

    // Info: (20260318 - Julian) 建立空白傳票
    const newVoucher = await voucherRepo.createVoucher({
      accountBookId: accountBook.id,
      fileId: uploadedFile.id,
      userId: creator.id,
      tradingDate: new Date(),
      note: "",
      lines: { create: [] },
      aiNote: "",
      confidence: 0,
      isVerified: false,
    });

    if (!newVoucher) {
      console.error("Voucher creation failed");
      return jsonFail(ApiCode.NOT_FOUND, "Voucher creation failed");
    }

    // Info: (20260318 - Julian) 建立空白 ESG 紀錄
    const newRecord = await esgRepo.createEsgRecord({
      accountBookId: accountBook.id,
      userId: creator.id,
      fileId: uploadedFile.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      dateTimestamp: 0,
      activityType: "",
      vendor: "",
      rawActivityData: "",
      unit: "",
      emissions: 0,
      aiNote: "",
      confidence: 0,
      isVerified: false,
    });

    if (!newRecord) {
      console.error("ESG record creation failed");
      return jsonFail(ApiCode.NOT_FOUND, "ESG record creation failed");
    }

    // Info: (20260318 - Julian) 新增 AuditLog
    await auditLogRepo.createManyAuditLogs([
      {
        userId: creator.id,
        dataType: "JOURNAL",
        dataId: newJournal.id,
        accountBookId: accountBook.id,
        action: "CREATE",
      },
      {
        userId: creator.id,
        dataType: "VOUCHER",
        dataId: newVoucher.id,
        accountBookId: accountBook.id,
        action: "CREATE",
      },
      {
        userId: creator.id,
        dataType: "ESG_RECORD",
        dataId: newRecord.id,
        accountBookId: accountBook.id,
        action: "CREATE",
      },
    ]);

    // Info: (20260320 - Julian) 觸發 Mission Generator 寫入任務
    const missionDef = missionGenerator.generateMission({
      category: "document_parsing",
      periodType: "N/A", // Info: (20260320 - Julian) 憑證解析可不用
      periodValue: "N/A",
      year: new Date().getFullYear(),
      fileId: uploadedFile.id,
      fileBase64: file.base64,
      fileMimeType: file.file.type,
      accountBookId: accountBook.id,
      prerequisiteData: { accountBook },
    });

    if (missionDef) {
      await missionRepo.createMission({
        userId: creator.id,
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
    }

    return jsonOk({
      journalId: newJournal.id,
      voucherId: newVoucher.id,
      recordId: newRecord.id,
    });
  } catch (error) {
    console.error("Error creating AI analysis:", error);
    return jsonFail(
      ApiCode.INTERNAL_SERVER_ERROR,
      "Failed to create AI analysis",
    );
  }
}
