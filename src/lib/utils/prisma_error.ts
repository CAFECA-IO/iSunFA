import { AppError } from "@/lib/utils/error";
import { IErrorDef } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260814 - Julian) Prisma 錯誤碼 → `AppError` 的對應。
 *
 * CLAUDE.md §6.2：service 層必須攔截並包裝原始資料庫錯誤。漏接的後果不是資訊外洩
 * （route 的 catch-all 會轉成通用 500），而是**使用者拿到誤導的「系統錯誤」而不是
 * 「已經有人在做同一件事了」**，而 log 裡也只剩一行泛用訊息。
 *
 * ToDo: (20260814 - Julian) `src/services/oauth.service.ts` 有一份自己的
 * `isUniqueConstraintError`，應併到這裡。屬 auth 路徑，另案處理。
 */

export const PRISMA_ERROR = {
  /** Info: (20260814 - Julian) 唯一鍵衝突。並行寫入同一鍵時由資料庫擋下 */
  UNIQUE_CONSTRAINT: "P2002",
  /** Info: (20260814 - Julian) 外鍵不存在。多半是查與寫之間那一列被刪了 */
  FOREIGN_KEY: "P2003",
  /** Info: (20260814 - Julian) 要更新的列不存在 */
  RECORD_NOT_FOUND: "P2025",
} as const;

export type PrismaErrorCode = (typeof PRISMA_ERROR)[keyof typeof PRISMA_ERROR];

/**
 * Info: (20260814 - Julian) 以 `code` 欄位辨識，不用 `instanceof`。
 *
 * `PrismaClientKnownRequestError` 來自 `@/generated`，而那份 client 是產生物；
 * 用 `instanceof` 會在 service 的單元測試裡失效（測試用的 fake 丟的是普通物件），
 * 於是「有沒有攔到」這件事變成測不到 —— 而那正是這條規則最需要被測的地方。
 */
export function isPrismaError(error: unknown, code: PrismaErrorCode): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === code
  );
}

/**
 * Info: (20260814 - Julian) 依對應表把 Prisma 錯誤換成 `AppError`；沒對應到的原樣拋回。
 *
 * 刻意不吞掉未知錯誤：對應表沒列到的狀況應該一路往上，由 route 記錄成 500 ——
 * 把它們也包成某個業務錯誤，等於用一個看起來合理的訊息蓋住真正的故障。
 */
export function rethrowAsAppError(
  error: unknown,
  mapping: Partial<Record<PrismaErrorCode, IErrorDef>>,
): never {
  for (const [code, definition] of Object.entries(mapping)) {
    if (definition && isPrismaError(error, code as PrismaErrorCode)) {
      throw new AppError(definition);
    }
  }
  throw error;
}
