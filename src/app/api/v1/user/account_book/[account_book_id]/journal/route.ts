import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Prisma } from "@/generated/browser";
import { IJournal } from "@/interfaces/journal";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { VerifyStatus } from "@/constants/verify_status";

/**
 * Info: (20260304 - Julian) 將檔案傳給 AI 進行解析
 * POST /api/v1/user/account_book/:account_book_id/journal
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

    // Info: (20260306 - Julian) 驗證建立人員
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    const body = await request.json();
    const { fileId } = body;

    // Info: (20260304 - Julian) 驗證 file 參數
    if (!fileId) {
      console.error("Missing file or file hash");
      return jsonFail(ApiCode.VALIDATION_ERROR, "File is required");
    }

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260304 - Julian) 使用 AI 生成日記帳
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Server configuration error",
      );
    }

    // Info: (20260304 - Julian) 先建立空白的日記帳
    const journal = await journalRepo.createJournal({
      accountBookId: accountBook.id,
      fileId,
      tradingDate: new Date(),
      text: "",
      aiNote: "",
    });

    // Info: (20260306 - Julian) 新增 log
    await auditLogRepo.createAuditLog({
      userId: creator.id,
      dataType: "JOURNAL",
      dataId: journal.id,
      accountBookId: accountBook.id,
      action: "CREATE",
    });

    return jsonOk({ journalId: journal.id });
  } catch (error) {
    console.error("Upload failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Upload failed");
  }
}

/**
 * Info: (20260304 - Julian) 取得全部或指定日記帳列表
 * GET /api/v1/user/account_book/:account_book_id/journal
 */
export async function GET(
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

    const author = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!author) {
      console.error("Author not found");
      return jsonFail(ApiCode.NOT_FOUND, "Author not found");
    }

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const searchParams = request.nextUrl.searchParams;
    const keyWord = searchParams.get("keyWord");
    const verifyStatus = searchParams.get("verifyStatus");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : undefined;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!)
      : undefined;
    const orderByParams = searchParams.get("orderBy");

    const filteredConditions: Prisma.JournalFindManyArgs & {
      include: { file: true };
    } = {
      where: { accountBookId: accountBook.id },
      include: { file: true },
    };

    // Info: (20260304 - Julian) 關鍵字篩選：支援 text 與 ID 搜尋
    if (keyWord) {
      filteredConditions.where!.OR = [
        { text: { contains: keyWord } },
        { id: { contains: keyWord } },
      ];
    }

    // Info: (20260324 - Julian) 建立審核狀態篩選
    if (verifyStatus) {
      filteredConditions.where!.isVerified = verifyStatus === VerifyStatus.VERIFIED;
    }

    // Info: (20260304 - Julian) 建立時間區間篩選
    if (startDate || endDate) {
      filteredConditions.where!.createdAt = {};
      if (startDate) {
        filteredConditions.where!.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        filteredConditions.where!.createdAt.lte = new Date(endDate);
      }
    }

    // Info: (20260324 - Julian) 取得符合條件的總筆數
    const totalCount = await journalRepo.countJournals(filteredConditions.where || {});

    // Info: (20260304 - Julian) 分頁
    if (page && pageSize) {
      filteredConditions.skip = (page - 1) * pageSize;
      filteredConditions.take = pageSize;
    }

    // Info: (20260304 - Julian) 排序
    if (orderByParams) {
      try {
        filteredConditions.orderBy = JSON.parse(orderByParams);
      } catch {
        console.warn("Invalid orderBy param format, ignoring");
      }
    }

    // Info: (20260304 - Julian) 取得日記帳列表
    const journals = await journalRepo.getJournals(filteredConditions);

    // Info: (20260323 - Julian) 格式化日記帳列表
    const formattedJournals: IJournal[] = journals.map((j) => {
      return {
        id: j.id,
        tradingTimestamp: Math.floor(j.tradingDate.getTime() / 1000),
        text: j.text,
        fileId: j.fileId ?? "",
        file: j.file
          ? {
            id: j.file.id,
            hash: j.file.hash,
            fileName: j.file.fileName ?? "",
          }
          : undefined,
        analysisStatus: j.analysisStatus as AIAnalysisStatus,
        confidence: j.confidence,
        isVerified: j.isVerified,
        aiNote: j.aiNote,
      };
    });

    return jsonOk({ data: formattedJournals, total: totalCount });
  } catch (error) {
    console.error("Get journals failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Get journals failed");
  }
}
