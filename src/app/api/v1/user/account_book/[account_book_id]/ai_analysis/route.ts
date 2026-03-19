import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";

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
    const creator = await prisma.user.findUnique({
      where: { address: sessionUser.address },
    });

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260318 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    });

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
    const uploadedFile = await prisma.file.create({
      data: {
        hash: file.hash,
        fileName: file.name,
      },
    });

    if (!uploadedFile) {
      console.error("File upload failed");
      return jsonFail(ApiCode.NOT_FOUND, "File upload failed");
    }

    // Info: (20260318 - Julian) 建立日記帳
    const newJournal = await prisma.journal.create({
      data: {
        accountBookId: accountBook.id,
        fileId: uploadedFile.id,
        text: "",
      },
    });

    if (!newJournal) {
      console.error("Journal creation failed");
      return jsonFail(ApiCode.NOT_FOUND, "Journal creation failed");
    }

    // Info: (20260318 - Julian) 建立空白傳票
    const newVoucher = await prisma.voucher.create({
      data: {
        accountBookId: accountBook.id,
        fileId: uploadedFile.id,
        userId: creator.id,
        tradingDate: new Date(),
        tradingType: "INCOME",
        note: "",
        lines: { create: [] },
        confidence: 0,
        isVerified: false,
        // aiAnalysisStatus: AIAnalysisStatus.PENDING,
      },
    });

    if (!newVoucher) {
      console.error("Voucher creation failed");
      return jsonFail(ApiCode.NOT_FOUND, "Voucher creation failed");
    }

    // Info: (20260318 - Julian) 建立空白 ESG 紀錄
    const newRecord = await prisma.esgRecord.create({
      data: {
        accountBookId: accountBook.id,
        userId: creator.id,
        fileId: uploadedFile.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        dateTimestamp: 0,
        scope: "SCOPE_1",
        activityType: "",
        vendor: "",
        rawActivityData: "",
        unit: "",
        emissions: 0,
        intensity: "LOW",
        confidence: 0,
        isVerified: false,
        // aiAnalysisStatus: AIAnalysisStatus.PENDING,
      },
    });

    if (!newRecord) {
      console.error("ESG record creation failed");
      return jsonFail(ApiCode.NOT_FOUND, "ESG record creation failed");
    }

    // Info: (20260318 - Julian) 新增 AuditLog
    await prisma.auditLog.createMany({
      data: [
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
      ],
    });

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
