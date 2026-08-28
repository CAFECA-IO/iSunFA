// Info: (20260803 - Tzuhan) 表3.8 匯入管線的組裝端(Issue B):把四個純模組串成一次呼叫
//
// Info: (20260803 - Tzuhan) 為什麼不寫在 hook 裡:這是「解析 → 勾稽 → 轉帳本 → 產生揭露」的
// Info: (20260803 - Tzuhan) 業務流程,寫進 React hook 就再也無法單元測試,而它的每一步都在決定
// Info: (20260803 - Tzuhan) 數字能不能進帳本 —— 恰恰是最需要測試的部分。hook 只負責把結果寫進狀態。

import { CARBON_SOURCE_TABLE_ANCHOR_PREFIX } from "@/constants/carbon_source_tables";
import { EmissionBasisEnum } from "@/constants/imported_quantity";
import {
  extractCompanyTotalTonne,
  parseTable38,
  type IParsedTable38,
} from "@/lib/carbon_table38.parser";
import {
  reconcileTable38,
  type IReconciliationResult,
} from "@/lib/carbon_table38.reconciliation";
import { toLedgerEntries } from "@/lib/carbon_table38.ledger";
import {
  buildReconciliationDisclosure,
  DISCLOSURE_DEFAULT_LABELS,
  type IDisclosureLabels,
} from "@/lib/carbon_table38.disclosure";
import type { ICarbonSourceTable } from "@/lib/carbon_source_table.builder";
import type { IComputedLedgerEntry } from "@/types/carbon_chatbot.types";

/**
 * Info: (20260803 - Tzuhan) 表3.8 是唯一有「廠址 × 子代碼」分解的表,故只認它進帳本。
 * 表3.6/3.7 僅提供全公司總量作為第三層勾稽的對照值(它們沒有廠址維度)。
 * 以表號常數比對而非中文標題:標題各家報告寫法不同,表號是固定的。
 */
export const LEDGER_SOURCE_TABLE_NO = "表3.8";
export const COMPANY_TOTAL_TABLE_NO_LOCATION = "表3.6";
export const COMPANY_TOTAL_TABLE_NO_MARKET = "表3.7";

export interface IImportedLedgerResult {
  entries: IComputedLedgerEntry[];
  /** Info: (20260803 - Tzuhan) 對帳說明(markdown);沒有表3.8 時為 null,呼叫端不產生對帳區塊 */
  disclosure: string | null;
  reconciliation: IReconciliationResult | null;
  parsed: IParsedTable38 | null;
  /** Info: (20260803 - Tzuhan) 有表但沒入帳的理由。與「沒有表」必須分得開 */
  blockedReason: string | null;
  /**
   * Info: (20260804 - Tzuhan) 該有表3.8 卻沒拿到。與「使用者沒勾選任何表」必須分得開:
   * 前者是異常(通常是頁碼切片把它切掉了),後者只是還沒有可入帳的來源。
   */
  missingLedgerTable: boolean;
}

const EMPTY_RESULT: IImportedLedgerResult = {
  entries: [],
  disclosure: null,
  reconciliation: null,
  parsed: null,
  blockedReason: null,
  missingLedgerTable: false,
};

const findTable = (
  tables: ICarbonSourceTable[],
  tableNo: string,
): ICarbonSourceTable | undefined =>
  tables.find((table) => table.tableNo === tableNo);

export interface IBuildImportedLedgerInput {
  sourceTables: ICarbonSourceTable[];
  basis?: EmissionBasisEnum;
  labels?: IDisclosureLabels;
  /**
   * Info: (20260827 - Emily) 這份報告的盤查年度(PR #6725 review R1)。
   * 寫進每一筆 importedOrigin.year,讓合併能分辨「同年覆蓋」與「換年換鍋」。
   */
  year?: number;
}

/**
 * Info: (20260803 - Tzuhan) 從一節的原文表格產出帳本項目與對帳說明。
 *
 * 找不到表3.8 就整組回空(而非拋錯):使用者可能只勾選了部分表格,
 * 那不是錯誤,只是還沒有可入帳的來源。錨點前綴用於防禦性檢查,見下方註解。
 */
export function buildImportedLedger(
  input: IBuildImportedLedgerInput,
): IImportedLedgerResult {
  const table38 = findTable(input.sourceTables, LEDGER_SOURCE_TABLE_NO);
  if (!table38) {
    /**
     * Info: (20260804 - Tzuhan) 缺表3.8 有兩種情形,不可混為一談。
     *
     * 使用者沒勾選,或這節本來就不是排放總量節 —— 不是錯誤,靜默即可。
     * 但**同節有表3.6/3.7 卻沒有表3.8**,那就是該有卻沒有:
     * 這三張在原文是同一節連續的表,有前者沒後者只可能是中途掉了
     * (實測是頁碼切片把跨頁的表3.8 切掉)。
     *
     * 差別很大:表3.8 是桑基圖與系統數據表格**唯一**的資料來源,
     * 它沒進來的表現卻只是「少一張圖」,畫面上毫無異狀。
     * 用同節的鄰表當判準,而不是段落 id —— 純函數不該知道大綱結構。
     */
    const hasCompanyTotalTable =
      findTable(input.sourceTables, COMPANY_TOTAL_TABLE_NO_LOCATION) !==
        undefined ||
      findTable(input.sourceTables, COMPANY_TOTAL_TABLE_NO_MARKET) !==
        undefined;
    if (!hasCompanyTotalTable) return EMPTY_RESULT;
    const labels = input.labels ?? DISCLOSURE_DEFAULT_LABELS;
    return {
      ...EMPTY_RESULT,
      missingLedgerTable: true,
      disclosure: `**${labels.heading}**\n\n> _⚠ ${labels.missingLedgerTable}_`,
    };
  }

  /**
   * Info: (20260803 - Tzuhan) 防禦性檢查:markdown 內不得含原文表格的錨點字樣。
   * 若含有,代表照抄的內容裡混進了系統錨點(可能是重複組裝或模型偽造),
   * 此時解析出來的數字來源已不可信 —— 寧可不入帳。
   */
  if (table38.markdown.includes(CARBON_SOURCE_TABLE_ANCHOR_PREFIX)) {
    return {
      ...EMPTY_RESULT,
      blockedReason: "原文表格內含系統錨點,來源不可信",
    };
  }

  const basis = input.basis ?? EmissionBasisEnum.LOCATION;
  const parsed = parseTable38(table38.markdown);

  // Info: (20260803 - Tzuhan) 對照值取自對應基準的那張表;缺表即跳過第三層勾稽(不猜數字)
  const totalTable = findTable(
    input.sourceTables,
    basis === EmissionBasisEnum.MARKET
      ? COMPANY_TOTAL_TABLE_NO_MARKET
      : COMPANY_TOTAL_TABLE_NO_LOCATION,
  );
  const companyTotalTonne = totalTable
    ? (extractCompanyTotalTonne(totalTable.markdown) ?? undefined)
    : undefined;

  const reconciliation = reconcileTable38(parsed, {
    companyTotalTonne,
    basis,
  });
  const { entries, blockedReason } = toLedgerEntries(parsed, reconciliation, {
    tableNo: table38.tableNo,
    basis,
    year: input.year,
  });

  return {
    entries,
    disclosure: buildReconciliationDisclosure({
      parsed,
      reconciliation,
      tableNo: table38.tableNo,
      basis,
      labels: input.labels,
    }),
    reconciliation,
    parsed,
    blockedReason,
    missingLedgerTable: false,
  };
}
