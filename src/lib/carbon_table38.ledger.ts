// Info: (20260803 - Tzuhan) 表3.8 → computedLedger 項目(Issue B 的落地端)
//
// Info: (20260803 - Tzuhan) 這一層的唯一職責是「把已勾稽的解析結果轉成帳本項目」,
// Info: (20260803 - Tzuhan) 不做解析、不做加總、不做判斷 —— 那些都在 parser 與 reconciliation 做完了。
//
// Info: (20260803 - Tzuhan) 兩條不可退讓的規則:
// Info: (20260803 - Tzuhan) 1. **勾稽沒過就一筆都不寫。** 半套資料進了帳本,之後每一張圖、每一個小計都是錯的,
// Info: (20260803 - Tzuhan)    而且錯得很像對的(比例看起來合理)。凍結在門口是唯一安全的處置(同 #22)。
// Info: (20260803 - Tzuhan) 2. **只寫 REPORTED。** NA/NS 沒有數字,寫 0 進帳本就等於宣稱它們是零。

import {
  EmissionBasisEnum,
  ImportedQuantityStateEnum,
  LedgerProvenanceEnum,
} from "@/constants/imported_quantity";
import { MeasurementUnit } from "@/constants/enums";
import type { IParsedTable38 } from "@/lib/carbon_table38.parser";
import type { IReconciliationResult } from "@/lib/carbon_table38.reconciliation";
import type { IComputedLedgerEntry } from "@/types/carbon_chatbot.types";

/**
 * Info: (20260803 - Tzuhan) 匯入項目沒有排放係數:報告直接給最終的 CO2e,中間的
 * 活動數據 × 係數 × GWP 都發生在報告作者那邊。這裡放明確的佔位字樣而非數字 1,
 * 因為「係數 = 1」會被讀成一個真的係數,而事實是**本系統沒有套用任何係數**。
 */
export const IMPORTED_FACTOR_VALUE_PLACEHOLDER = "—";
export const IMPORTED_FACTOR_NAME = "不適用(原文照錄)";

// Info: (20260803 - Tzuhan) activityKey 前綴:與憑證路徑的 key 命名空間分離,避免兩邊撞號
export const IMPORTED_ACTIVITY_KEY_PREFIX = "imported";

export const buildImportedActivityKey = (
  site: string,
  subCategory: string,
  basis: EmissionBasisEnum,
): string => `${IMPORTED_ACTIVITY_KEY_PREFIX}:${basis}:${site}:${subCategory}`;

export interface IToLedgerOptions {
  /** Info: (20260803 - Tzuhan) 來源表號,寫進 factor.source 與 importedOrigin 供溯源 */
  tableNo: string;
  basis?: EmissionBasisEnum;
  /**
   * Info: (20260827 - Emily) 該份報告的盤查年度,寫進 importedOrigin.year
   * (見該欄位註解:跨年度合併會留孤兒列)。無值即「年度未知」。
   */
  year?: number;
}

export interface IToLedgerResult {
  entries: IComputedLedgerEntry[];
  /**
   * Info: (20260803 - Tzuhan) 未寫入的理由。勾稽沒過時 entries 為空而這裡有值 ——
   * 「沒有資料」與「有資料但不可信」必須分得出來,否則畫面上都只是一片空白。
   */
  blockedReason: string | null;
}

/**
 * Info: (20260803 - Tzuhan) 轉成帳本項目。勾稽未通過即回空並附理由,不寫入任何一筆。
 */
export function toLedgerEntries(
  parsed: IParsedTable38,
  reconciliation: IReconciliationResult,
  options: IToLedgerOptions,
): IToLedgerResult {
  if (!reconciliation.isReconciled) {
    const failed = reconciliation.checks.filter(
      (check) => !check.isWithinTolerance,
    );
    const parts: string[] = [];
    if (reconciliation.unparsedRows.length > 0) {
      parts.push(`${reconciliation.unparsedRows.length} 列無法解析`);
    }
    failed.forEach((check) => {
      parts.push(
        `${check.subject} 差額 ${check.difference}(原文 ${check.expected} vs 加總 ${check.actual})`,
      );
    });
    if (parts.length === 0) parts.push("無可勾稽的加總關係");
    return { entries: [], blockedReason: parts.join(";") };
  }

  const basis = options.basis ?? EmissionBasisEnum.LOCATION;
  const entries = parsed.rows
    // Info: (20260803 - Tzuhan) 只有 REPORTED 有數字;NA/NS 不入帳(見本檔開頭規則 2)
    .filter(
      (row) =>
        row.state === ImportedQuantityStateEnum.REPORTED &&
        row.tonneCo2e !== null &&
        row.co2eKg !== null,
    )
    .map<IComputedLedgerEntry>((row) => ({
      activityKey: buildImportedActivityKey(row.site, row.subCategory, basis),
      scopeCategory: row.scope,
      sourceName: `${row.site} ${row.subCategory}`,
      // Info: (20260803 - Tzuhan) 匯入項目沒有活動數據,quantityRaw 即原文照錄的排放當量
      quantityRaw: row.tonneCo2e as string,
      convertedQuantity: row.tonneCo2e as string,
      convertedUnit: MeasurementUnit.TONNE,
      co2eKg: row.co2eKg as string,
      factor: {
        factorId: `${IMPORTED_ACTIVITY_KEY_PREFIX}:${options.tableNo}`,
        name: IMPORTED_FACTOR_NAME,
        value: IMPORTED_FACTOR_VALUE_PLACEHOLDER,
        unit: MeasurementUnit.TONNE,
        source: options.tableNo,
      },
      provenance: LedgerProvenanceEnum.IMPORTED,
      emissionBasis: basis,
      importedOrigin: {
        site: row.site,
        isoCategory: row.isoCategory,
        subCategory: row.subCategory,
        tableNo: options.tableNo,
        // Info: (20260827 - Emily) 年度隨分錄走(見 importedOrigin.year 註解:跨年合併的孤兒列)
        ...(options.year !== undefined ? { year: options.year } : {}),
      },
    }));

  return { entries, blockedReason: null };
}

/**
 * Info: (20260803 - Tzuhan) 判斷一筆帳本項目是否為匯入而來。
 * 未標記 provenance 者視為 COMPUTED —— 既有憑證路徑不必回填欄位(見型別註解)。
 */
export const isImportedEntry = (entry: IComputedLedgerEntry): boolean =>
  entry.provenance === LedgerProvenanceEnum.IMPORTED;
