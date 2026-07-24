import { ILedger } from "@/interfaces/ledger";
import { timestampToString } from "@/lib/utils/common";

// Info: (20260724 - Julian) CSV 欄位（依 RFC 4180 以雙引號包夾，內部雙引號跳脫為 ""）
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Info: (20260724 - Julian) 分類帳 CSV 表頭（中英雙語，對齊既有匯出風格）
const LEDGER_CSV_HEADERS = [
  "科目編號 (Account Code)",
  "會計科目 (Account Name)",
  "傳票編號 (Voucher No)",
  "傳票日期 (Voucher Date)",
  "交易類型 (Trading Type)",
  "摘要 (Particulars)",
  "借方金額 (Debit)",
  "貸方金額 (Credit)",
  "餘額 (Balance)",
];

/**
 * Info: (20260724 - Julian)
 * 將分類帳產生器輸出轉為 CSV 字串（純函式）。
 * 金額沿用產生器已計算之 Decimal 字串；日期由 epoch 秒轉為 YYYY-MM-DD；末列附借貸合計。
 */
export function buildLedgerCsv(ledger: ILedger): string {
  const rows: string[] = [LEDGER_CSV_HEADERS.map(csvCell).join(",")];

  ledger.items.forEach((item) => {
    rows.push(
      [
        csvCell(item.code),
        csvCell(item.accountingTitle),
        csvCell(item.voucherNumber),
        csvCell(timestampToString(item.voucherDate).dateWithDash),
        csvCell(item.voucherType ?? ""),
        csvCell(item.particulars),
        csvCell(item.debitAmount),
        csvCell(item.creditAmount),
        csvCell(item.balance),
      ].join(","),
    );
  });

  // Info: (20260724 - Julian) 合計列（借貸總額）
  rows.push(
    [
      csvCell("合計 (Total)"),
      csvCell(""),
      csvCell(""),
      csvCell(""),
      csvCell(""),
      csvCell(""),
      csvCell(ledger.total.totalDebit),
      csvCell(ledger.total.totalCredit),
      csvCell(""),
    ].join(","),
  );

  return rows.join("\n");
}
