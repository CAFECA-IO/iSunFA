// Info: (20260909 - Emily) 勾稽阻擋紀錄的儲存界 —— 寫入端能產出的,儲存端一定讀得回來(#6760)

import type { ILedgerImportBlock } from "@/types/carbon_chatbot.types";
import {
  LEDGER_IMPORT_BLOCK_PARAGRAPH_ID_MAX_LENGTH,
  LEDGER_IMPORT_BLOCK_REASON_MAX_LENGTH,
  LEDGER_IMPORT_BLOCK_TIMESTAMP_MAX_LENGTH,
  LEDGER_IMPORT_BLOCKS_MAX,
} from "@/constants/carbon_chatbot";

/**
 * Info: (20260909 - Emily) `toLedgerEntries` 用它把段落接成 `blockedReason`;截斷只在段與段之間下刀。
 * 與 `carbon_table38.ledger.ts` 的 `parts.join(";")` 是同一個字元 —— 改一邊必須改另一邊,
 * 有測試釘住(`carbon_ledger_import_blocks.test.ts`)。
 */
export const LEDGER_IMPORT_BLOCK_REASON_SEPARATOR = ";";

/** Info: (20260909 - Emily) 沒有任何理由可寫時的替代字;寫入端本來就用這一句(`use_carbon_chat` 的 `?? "未知原因"`) */
export const LEDGER_IMPORT_BLOCK_UNKNOWN_REASON = "未知原因";

/** Info: (20260909 - Emily) 單段長到連自己都放不進上界時,尾端加這個字,讓讀的人知道那一段不是完整的 */
const HARD_CUT_MARK = "…";

const omittedMark = (count: number): string => `另有 ${count} 項未列出`;

/**
 * Info: (20260909 - Emily) 把 `blockedReason` 收進上界,**整段整段地**捨去。
 *
 * 為什麼不是 `slice(0, max)`:每一段長得像 `(1) 總公司 / CATEGORY_2 差額 143.4858(原文 139.4858 vs 加總 282.9716)`,
 * 從中間切開會留下「差額 143.4」這種**看起來像數字的殘片**,而這個字串之後會變成一筆事實的 `value`
 * 進到 LLM 的事實包裡 —— 出口守門對「合法集合裡的數字」是照放的。所以只在 `;` 處下刀,
 * 捨去的段數寫在末尾(「另有 N 項未列出」),讓讀的人知道清單不完整、以及少了幾條。
 *
 * 單段長度在真實版面裡最長 62(見常數處的量測表),500 放得下七、八段。
 * 若第一段自己就超過上界(`subject` 是客戶報告裡的自由字串,理論上可以很長),
 * 硬切並加「…」—— 那是最後一道,正常資料走不到。
 *
 * 冪等:已在界內的字串原樣回傳;界外的收一次之後再收一次,結果不變。
 */
export const boundLedgerImportReason = (
  reason: string,
  maxLength: number = LEDGER_IMPORT_BLOCK_REASON_MAX_LENGTH,
): string => {
  const trimmed = reason.trim();
  if (trimmed.length === 0) return LEDGER_IMPORT_BLOCK_UNKNOWN_REASON;
  if (trimmed.length <= maxLength) return trimmed;

  const parts = trimmed.split(LEDGER_IMPORT_BLOCK_REASON_SEPARATOR);
  for (let keep = parts.length - 1; keep >= 1; keep -= 1) {
    const candidate = [
      ...parts.slice(0, keep),
      omittedMark(parts.length - keep),
    ].join(LEDGER_IMPORT_BLOCK_REASON_SEPARATOR);
    if (candidate.length <= maxLength) return candidate;
  }

  // Info: (20260909 - Emily) 連第一段都放不下:硬切第一段,其餘全部計入「另有 N 項」
  const tail =
    parts.length > 1
      ? `${LEDGER_IMPORT_BLOCK_REASON_SEPARATOR}${omittedMark(parts.length - 1)}`
      : "";
  const room = Math.max(maxLength - tail.length - HARD_CUT_MARK.length, 0);
  return `${parts[0].slice(0, room)}${HARD_CUT_MARK}${tail}`.slice(
    0,
    maxLength,
  );
};

/**
 * Info: (20260909 - Emily) 唯一寫入者 `recordLedgerImportBlocks` 在寫進 state 之前呼叫的那一步。
 *
 * 三個欄位各自收進 `CarbonInventoryStateSchema` 宣告的上界,陣列收進 `LEDGER_IMPORT_BLOCKS_MAX`。
 * `paragraphId` 是大綱 id(最長 10 字)、`blockedAt` 是 ISO 字串(24 字),兩者的 `slice`
 * 在真實資料上永遠不動作 —— 放在這裡是讓「寫入端 ⊆ 儲存端」對**每一個欄位**成立,
 * 而不是只對今天量過的那一個。
 *
 * 回傳新陣列,不改參數;呼叫端把回傳值同時寫進 state 與 `ledgerImportBlocksRef`,
 * 兩處拿到的是同一份已收界的資料(否則 ref 那條路仍會把 1163 字的 reason 餵進事實包)。
 */
export const boundLedgerImportBlocks = (
  blocks: ReadonlyArray<ILedgerImportBlock>,
): ILedgerImportBlock[] =>
  blocks.slice(0, LEDGER_IMPORT_BLOCKS_MAX).map((block) => ({
    paragraphId: block.paragraphId.slice(
      0,
      LEDGER_IMPORT_BLOCK_PARAGRAPH_ID_MAX_LENGTH,
    ),
    reason: boundLedgerImportReason(block.reason),
    blockedAt: block.blockedAt.slice(
      0,
      LEDGER_IMPORT_BLOCK_TIMESTAMP_MAX_LENGTH,
    ),
  }));
