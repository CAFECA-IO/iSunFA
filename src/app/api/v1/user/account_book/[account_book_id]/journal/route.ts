import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IJournalFilterOptions } from "@/interfaces/data_filter_option";
import { IJournal } from "@/interfaces/journal";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

// Info: (20260327 - Luphia) 內部共用 Helper：抽離重複的權限與帳簿驗證邏輯
async function validateRequestAndGetContext(
  request: NextRequest,
  accountBookId: string,
) {
  const authHeader = request.headers.get("Authorization");
  const sessionUser = await getIdentityFromDeWT(authHeader);

  if (!sessionUser) return { error: jsonFail(API_ERRORS.NF_USER) };

  const user = await webAuthnRepo.findUserByAddress(sessionUser.address);
  if (!user) return { error: jsonFail(API_ERRORS.NF_USER) };

  const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
  if (!accountBook) return { error: jsonFail(API_ERRORS.NF_ACCOUNT_BOOK) };

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
      return jsonFail({
        code: "VA000099",
        message: "File is required",
        status: ApiCode.VALIDATION_ERROR,
      });
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
    return jsonFail(API_ERRORS.IS_UPLOAD_FAILED);
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
    const options: IJournalFilterOptions = {
      accountBookId: accountBook.id,
      keyword: keyWord,
      verifyStatus,
      startDate,
      endDate,
      page,
      limit: pageSize,
      sort,
    };

    // Info: (20260327 - Luphia) 使用 Promise.all 並行執行 Count 與資料查詢，大幅縮短等待時間
    const [totalCount, journals] = await Promise.all([
      journalRepo.countJournalsByFilter(options),
      journalRepo.getJournalsByFilter(options),
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
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
