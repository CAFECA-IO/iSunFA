import { ITrialBalance, ITrialBalanceItem } from "@/interfaces/trial_balance";

// Info: (20260724 - Julian) CSV 欄位（依 RFC 4180 以雙引號包夾，內部雙引號跳脫為 ""）
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Info: (20260724 - Julian) 文字欄位防 CSV 公式注入：以 = + - @ 開頭者前置單引號中和（不套用於金額欄避免破壞負數）
function csvText(value: string): string {
  const raw = String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Info: (20260724 - Julian) 試算表 CSV 表頭（中英雙語，對齊既有匯出風格）
const TRIAL_BALANCE_CSV_HEADERS = [
  "科目編號 (Account Code)",
  "會計科目 (Account Name)",
  "期初借方餘額 (Beginning Debit)",
  "期初貸方餘額 (Beginning Credit)",
  "期中借方餘額 (Midterm Debit)",
  "期中貸方餘額 (Midterm Credit)",
  "期末借方餘額 (Ending Debit)",
  "期末貸方餘額 (Ending Credit)",
];

// Info: (20260724 - Julian) 將樹狀科目以深度優先攤平為列，父科目與子科目皆輸出
function flattenItems(items: ITrialBalanceItem[]): ITrialBalanceItem[] {
  const flat: ITrialBalanceItem[] = [];
  const walk = (nodes: ITrialBalanceItem[]) => {
    nodes.forEach((node) => {
      flat.push(node);
      walk(node.subAccounts);
    });
  };
  walk(items);
  return flat;
}

/**
 * Info: (20260724 - Julian)
 * 將試算表產生器輸出轉為 CSV 字串（純函式）。
 * 金額沿用產生器已計算之 Decimal 字串，末列附合計。
 */
export function buildTrialBalanceCsv(trialBalance: ITrialBalance): string {
  const rows: string[] = [TRIAL_BALANCE_CSV_HEADERS.map(csvCell).join(",")];

  flattenItems(trialBalance.items).forEach((item) => {
    rows.push(
      [
        csvText(item.code),
        csvText(item.name),
        csvCell(item.beginningDebit),
        csvCell(item.beginningCredit),
        csvCell(item.midtermDebit),
        csvCell(item.midtermCredit),
        csvCell(item.endingDebit),
        csvCell(item.endingCredit),
      ].join(","),
    );
  });

  // Info: (20260724 - Julian) 合計列
  const { total } = trialBalance;
  rows.push(
    [
      csvCell("合計 (Total)"),
      csvCell(""),
      csvCell(total.beginningDebit),
      csvCell(total.beginningCredit),
      csvCell(total.midtermDebit),
      csvCell(total.midtermCredit),
      csvCell(total.endingDebit),
      csvCell(total.endingCredit),
    ].join(","),
  );

  // Info: (20260724 - Julian) RFC 4180 以 CRLF 分隔列
  return rows.join("\r\n");
}
