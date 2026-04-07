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

// Info: (20260327 - Luphia) 內部共用 Helper：抽離重複的權限與帳簿驗證邏輯
async function validateRequestAndGetContext(
  request: NextRequest,
  accountBookId: string,
) {
  const authHeader = request.headers.get("Authorization");
  const sessionUser = await getIdentityFromDeWT(authHeader);

  if (!sessionUser)
    return { error: jsonFail(ApiCode.NOT_FOUND, "User not found") };

  const user = await webAuthnRepo.findUserByAddress(sessionUser.address);
  if (!user) return { error: jsonFail(ApiCode.NOT_FOUND, "User not found") };

  const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
  if (!accountBook)
    return { error: jsonFail(ApiCode.NOT_FOUND, "Accountbook not found") };

  return { user, accountBook };
}

/**
 * Info: (20260304 - Julian) 將檔案傳給 AI 進行解析
 * POST /api/v1/user/account_book/:account_book_id/journal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    const { account_book_id: accountBookId } = await params;
    const {
      user: creator,
      accountBook,
      error,
    } = await validateRequestAndGetContext(request, accountBookId);
    if (error) return error;

    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      console.error("Missing fileId");
      return jsonFail(ApiCode.VALIDATION_ERROR, "File is required");
    }

    /**
     * Info: (20260327 - Luphia) 移除 GEMINI_API_KEY 的阻擋檢查
     * 若目前建立空日記帳不需要呼叫 AI，故移除 GEMINI_API_KEY 的阻擋檢查
     * 若後續有需要實際呼叫，建議移至 AI Service 內部做檢查。
     */

    // Info: (20260327 - Luphia) 建立空白的日記帳與 Log（可以的話，未來建議將這兩步放進同一個 Transaction）
    const journal = await journalRepo.createJournal({
      accountBookId: accountBook.id,
      fileId,
      tradingDate: new Date(),
      text: "",
      aiNote: "",
    });

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
    const { account_book_id: accountBookId } = await params;
    const { error, accountBook } = await validateRequestAndGetContext(
      request,
      accountBookId,
    );
    if (error) return error;

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
    const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

    // Info: (20260327 - Luphia) 乾淨且安全地組裝查詢條件 (Where)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: Prisma.JournalWhereInput = {
      accountBookId: accountBook.id,
      OR: [{ deletedAt: null }, { deletedAt: { gte: sevenDaysAgo } }],
    };

    if (keyWord) {
      where.AND = [
        {
          OR: [{ text: { contains: keyWord } }, { id: { contains: keyWord } }],
        },
      ];
    }

    if (verifyStatus) {
      where.isVerified = verifyStatus === VerifyStatus.VERIFIED;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Info: (20260327 - Luphia) 解析分頁
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;
    const take = pageSize || undefined;

    // Info: (20260327 - Luphia) 使用 Promise.all 並行執行 Count 與資料查詢，大幅縮短等待時間
    const [totalCount, journals] = await Promise.all([
      journalRepo.countJournals(where),
      journalRepo.getJournals({
        where,
        skip,
        take,
        orderBy: { tradingDate: sort },
      }),
    ]);

    // Info: (20260327 - Luphia) 移除 any，利用優化後 Repository 提供的精準型別直接映射
    const formattedJournals: IJournal[] = journals.map((j) => ({
      id: j.id,
      tradingTimestamp: Math.floor(j.tradingDate.getTime() / 1000),
      text: j.text ?? "",
      fileId: j.fileId ?? "",
      file: j.file
        ? {
            id: j.file.id,
            hash: j.file.hash,
            fileName: j.file.fileName ?? "",
          }
        : undefined,
      voucherId: j.voucherId,
      esgRecordId: j.esgRecordId,
      analysisStatus: j.analysisStatus as AIAnalysisStatus,
      confidence: j.confidence,
      isVerified: j.isVerified,
      aiNote: j.aiNote ?? undefined,
      isDeleted: !!j.deletedAt,
    }));

    return jsonOk({ data: formattedJournals, total: totalCount });
  } catch (error) {
    console.error("Get journals failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Get journals failed");
  }
}
