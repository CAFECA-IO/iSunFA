import { CARBON_PENDING_IMPORT_STORAGE_VERSION } from "@/constants/carbon_chatbot";
import type { CarbonPendingImportData } from "@/validators/carbon_pending_import";
import type { IPendingImport } from "@/components/carbon_chatbot/import_preview";
import type { ICarbonImportSource } from "@/hooks/use_carbon_chat.helpers";
import type { IActivityRecord } from "@/types/carbon_chatbot.types";

/**
 * Info: (20260828 - Julian) 把「待匯入紀錄」的形狀組出來——**純函式，抽出來是為了測得到**。
 *
 * 這段原本是 `persistPendingImport` 裡的一個物件字面量，而它逐欄位手寫，
 * 漏掉了 `pausedChapters` / `pausedUnits` / `pauseReason`（issue #6713 加的三個欄位）。
 *
 * 漏掉的後果不是存壞，是**存了一份看起來完好、卻少了一半意義的紀錄**：
 * schema 把那三個欄位定義成選填（為了讓舊紀錄還存得進去），所以驗證照樣通過；
 * 記憶體裡的物件帶著它們，還原時也照樣 spread 回來 —— 只有「寫出去」那一步丟掉。
 * 症狀要重載頁面才看得到：卡片還在、檔名還在，但「以下章節還沒開始解析」
 * 那一塊與「接著匯入」按鈕整個消失，也就是**接續功能在重載之後不可達**。
 *
 * 而重載正是這件事唯一的使用情境：通知在幾分鐘或幾天後才響。
 *
 * `savedAt` 由呼叫端注入而不是在這裡讀時鐘：純函式才測得住，
 * 而「存檔時間」本來就是呼叫端的事實。
 */
export function buildPendingImportRecord(params: {
  pending: IPendingImport;
  source: ICarbonImportSource | null;
  activities: IActivityRecord[];
  pageIndex: Map<string, number> | undefined;
  savedAt: string;
}): CarbonPendingImportData {
  const { pending, source, activities, pageIndex, savedAt } = params;

  return {
    storageVersion: CARBON_PENDING_IMPORT_STORAGE_VERSION,
    savedAt,
    source: {
      cid: source?.cid ?? null,
      fileName: source?.fileName ?? pending.fileName,
      mimeType: source?.mimeType ?? "",
    },
    pending: {
      fileName: pending.fileName,
      originSessionId: pending.originSessionId,
      originSessionTitle: pending.originSessionTitle,
      items: pending.items,
      unmapped: pending.unmapped,
      activityCount: pending.activityCount,
      failedChapters: pending.failedChapters ?? [],
      /**
       * Info: (20260828 - Julian) 斷點三欄位。缺席＝沒有暫停，所以
       * **不要**用 `?? []` 把它們補成空陣列 —— 那會把「這份匯入沒有暫停」
       * 與「暫停過但我忘了存」寫成同一個值，而還原端分不出來。
       */
      pausedChapters: pending.pausedChapters,
      pausedUnits: pending.pausedUnits,
      pauseReason: pending.pauseReason ?? null,
    },
    activities,
    // Info: (20260806 - Tzuhan) Map 無法 JSON 序列化,存成 entry 陣列
    pageIndex: pageIndex ? Array.from(pageIndex.entries()) : [],
  };
}
