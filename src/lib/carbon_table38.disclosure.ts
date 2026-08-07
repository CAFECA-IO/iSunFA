// Info: (20260803 - Tzuhan) 表3.8 的對帳說明文字(Issue B 的揭露端)
//
// Info: (20260803 - Tzuhan) 這段文字的存在理由不是好看,而是**讓每一個判斷都能被質疑**:
// Info: (20260803 - Tzuhan) - 差額寫出來(即使在容差內):靜默吸收等於宣稱兩者完全相等,那不是事實
// Info: (20260803 - Tzuhan) - 排除的 NA/NS 列出來:一張只畫得出來的圖會讓人以為沒畫的都是零
// Info: (20260803 - Tzuhan) - 近似映射列出來:隱藏一個判斷,查核者就無法質疑它,而無法被質疑的判斷等於沒有依據
//
// Info: (20260803 - Tzuhan) 純字串組裝,不做任何計算 —— 數字全部來自 reconciliation 的結果。

import {
  EmissionBasisEnum,
  ImportedQuantityStateEnum,
} from "@/constants/imported_quantity";
import { listApproximateMappings } from "@/constants/iso14064_subcategory";
import {
  listExcludedEntries,
  ReconciliationLevelEnum,
  type IReconciliationResult,
} from "@/lib/carbon_table38.reconciliation";
import type { IParsedTable38 } from "@/lib/carbon_table38.parser";

export interface IDisclosureLabels {
  heading: string;
  basisLocation: string;
  basisMarket: string;
  stateNotApplicable: string;
  stateNotSignificant: string;
  reconciled: string;
  blocked: string;
  excludedHeading: string;
  approximateHeading: string;
  levelSubcategory: string;
  levelSite: string;
  levelCompany: string;
  /** Info: (20260804 - Tzuhan) 該有表3.8 卻沒拿到時的說明(缺表不得靜默) */
  missingLedgerTable: string;
}

export const DISCLOSURE_DEFAULT_LABELS: IDisclosureLabels = {
  heading: "原文與系統對帳",
  basisLocation: "所在地基準",
  basisMarket: "市場基準",
  stateNotApplicable: "不適用(NA)",
  stateNotSignificant: "不顯著、未量化(NS)",
  missingLedgerTable:
    "本節有全公司總量表(表3.6/3.7)卻未取得表3.8,無法建立廠址與排放形式的分解,桑基圖與系統數據表格因此無法產出。表3.8 在原文與表3.6/3.7 同節,理應一併匯入;請重新匯入本節,並在伺服端日誌查看該表是否被丟棄及其原因。",
  reconciled: "三層加總勾稽通過,已寫入帳本",
  blocked: "勾稽未通過,未寫入帳本",
  excludedHeading: "未納入計算的項目",
  approximateHeading: "分類對應的近似之處",
  levelSubcategory: "子項加總 vs 原文類別小計",
  levelSite: "類別加總 vs 原文廠址總計",
  levelCompany: "廠址加總 vs 表3.6 全公司總量",
};

const LEVEL_LABEL_KEY: Record<
  ReconciliationLevelEnum,
  keyof IDisclosureLabels
> = {
  [ReconciliationLevelEnum.SUBCATEGORY_TO_CATEGORY]: "levelSubcategory",
  [ReconciliationLevelEnum.CATEGORY_TO_SITE]: "levelSite",
  [ReconciliationLevelEnum.SITE_TO_COMPANY]: "levelCompany",
};

const STATE_LABEL_KEY: Record<string, keyof IDisclosureLabels> = {
  [ImportedQuantityStateEnum.NOT_APPLICABLE]: "stateNotApplicable",
  [ImportedQuantityStateEnum.NOT_SIGNIFICANT]: "stateNotSignificant",
};

export interface IBuildDisclosureInput {
  parsed: IParsedTable38;
  reconciliation: IReconciliationResult;
  tableNo: string;
  basis?: EmissionBasisEnum;
  labels?: IDisclosureLabels;
}

/**
 * Info: (20260803 - Tzuhan) 組出對帳說明(markdown 純文字,由呼叫端包進 carbon-reconciliation 錨點)。
 *
 * 刻意**不省略通過的檢查**:只列失敗項會讓讀者無法判斷「其他項是通過了,還是根本沒檢查」。
 * 這兩件事在查帳上的意義天差地遠。
 */
export function buildReconciliationDisclosure(
  input: IBuildDisclosureInput,
): string {
  const labels = input.labels ?? DISCLOSURE_DEFAULT_LABELS;
  const basis = input.basis ?? EmissionBasisEnum.LOCATION;
  const basisLabel =
    basis === EmissionBasisEnum.MARKET
      ? labels.basisMarket
      : labels.basisLocation;
  const lines: string[] = [];

  lines.push(
    `**${labels.heading}**(來源 ${input.tableNo},${basisLabel},公噸 CO2e/年)`,
  );
  lines.push("");
  lines.push(
    `> ${input.reconciliation.isReconciled ? labels.reconciled : labels.blocked}`,
  );
  lines.push("");

  if (input.reconciliation.checks.length > 0) {
    lines.push("| 勾稽層級 | 對象 | 原文 | 系統加總 | 差額 | 結果 |");
    lines.push("| --- | --- | ---: | ---: | ---: | --- |");
    input.reconciliation.checks.forEach((check) => {
      const level = labels[LEVEL_LABEL_KEY[check.level]];
      lines.push(
        `| ${level} | ${check.subject} | ${check.expected} | ${check.actual} | ${check.difference} | ${check.isWithinTolerance ? "✓" : "✗"} |`,
      );
    });
    lines.push("");
  }

  /**
   * Info: (20260803 - Tzuhan) 未解析的列必須逐列列出原文,不只給數量:
   * 只說「有 3 列無法解析」的話,沒有人能判斷那 3 列重不重要。
   */
  if (input.reconciliation.unparsedRows.length > 0) {
    lines.push(
      `無法解析的資料列(${input.reconciliation.unparsedRows.length}):`,
    );
    lines.push("");
    input.reconciliation.unparsedRows.forEach((row) => {
      lines.push(`- \`${row}\``);
    });
    lines.push("");
  }

  const excluded = listExcludedEntries(input.parsed);
  if (excluded.length > 0) {
    lines.push(`**${labels.excludedHeading}**`);
    lines.push("");
    excluded.forEach((entry) => {
      const stateLabel = labels[STATE_LABEL_KEY[entry.state]];
      lines.push(`- ${entry.site} ${entry.subCategory}:${stateLabel}`);
    });
    lines.push("");
  }

  const approximate = listApproximateMappings();
  if (approximate.length > 0) {
    lines.push(`**${labels.approximateHeading}**`);
    lines.push("");
    approximate.forEach((mapping) => {
      lines.push(`- ${mapping.subCategory}:${mapping.note}`);
    });
    lines.push("");
  }

  return lines.join("\n").trim();
}
