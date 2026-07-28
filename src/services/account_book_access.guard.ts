import { accountBookRepo } from "@/repositories/account_book.repo";
import { teamRepo } from "@/repositories/team.repo";
import { API_ERRORS, IErrorDef } from "@/lib/utils/error_dictionary";

// Info: (20260728 - Julian) Service 層以具名 Error message 表示可映射之網域錯誤（取代散落 route 的哨兵字串）
export const SERVICE_ERROR = {
  NF_ACCOUNT_BOOK: "NF_ACCOUNT_BOOK",
  AUTH_PERMISSION_DENIED: "AUTH_PERMISSION_DENIED",
} as const;

/**
 * Info: (20260728 - Julian)
 * 授權收斂點：驗證帳本存在，且 user 為該帳本所屬 team 成員。四支報表/分類帳 route 共用同一入口，杜絕遷移遺漏。
 * - 帳本不存在 → throw NF_ACCOUNT_BOOK
 * - 非 team 成員 → throw AUTH_PERMISSION_DENIED
 * 回傳已驗證之帳本（型別已由 null 收斂為非空）。
 */
export async function assertAccountBookMember(
  accountBookId: string,
  userId: string,
) {
  const accountBook = await accountBookRepo.getAccountBookById(accountBookId);
  if (!accountBook) {
    throw new Error(SERVICE_ERROR.NF_ACCOUNT_BOOK);
  }

  const member = await teamRepo.getTeamMember(userId, accountBook.teamId);
  if (!member) {
    throw new Error(SERVICE_ERROR.AUTH_PERMISSION_DENIED);
  }

  return accountBook;
}

/**
 * Info: (20260728 - Julian)
 * 將 Service 拋出的錯誤映射為 API 錯誤定義，供 route 的 catch 統一格式化。
 * NF_USER（token 驗證）與 VA_QUERY_PARAMETER（參數驗證）由 route 端口自行處理，不經此。
 */
export function mapServiceError(error: unknown): IErrorDef {
  if (error instanceof Error) {
    if (error.message === SERVICE_ERROR.NF_ACCOUNT_BOOK) {
      return API_ERRORS.NF_ACCOUNT_BOOK;
    }
    if (error.message === SERVICE_ERROR.AUTH_PERMISSION_DENIED) {
      return API_ERRORS.AUTH_PERMISSION_DENIED;
    }
    // Info: (20260728 - Julian) 資料整合性違規（generator 決定論護欄）不應偽裝為 DB 失敗
    if (/Data Integrity/.test(error.message)) {
      return API_ERRORS.VA_INVALID_INPUT_DATA;
    }
  }
  return API_ERRORS.IS_DB_FAILED;
}
