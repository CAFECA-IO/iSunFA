// Info: (20260617 - Julian) 匯出資料專用 Service：處理 Voucher 與 ESG 紀錄的 CSV 格式化
import { voucherRepo } from "@/repositories/voucher.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { timestampToString } from "@/lib/utils/common";
import {
  IVoucherFilterOptions,
  IEsgRecordFilterOptions,
} from "@/interfaces/data_filter_option";
import { VerifyStatus } from "@/constants/verify_status";

export class ExportService {
  /**
   * Info: (20260617 - Julian) 將傳票及其分錄匯出為 CSV 字串
   */
  async exportVouchersToCsv(
    accountBookId: string,
    startDate?: Date,
    endDate?: Date,
    includeUnverified?: boolean,
  ): Promise<string> {
    const csvHeaders = [
      "傳票編號 (Voucher No)",
      "傳票日期 (Voucher Date)",
      "交易類型 (Trading Type)",
      "備註 (Note)",
      "分錄序號 (Entry Index)",
      "科目代碼 (Account Code)",
      "科目名稱 (Account Name)",
      "摘要 (Particulars)",
      "借方金額 (Debit)",
      "貸方金額 (Credit)",
      "經辦人 (Issuer)",
      "審核狀態 (Status)",
    ];

    if (!startDate || !endDate) {
      return csvHeaders.join(",");
    }

    const options: IVoucherFilterOptions = {
      accountBookId,
      startDate,
      endDate,
    };

    if (!includeUnverified) {
      options.verifyStatus = VerifyStatus.VERIFIED;
    }

    const vouchers = await voucherRepo.getVouchersByFilter(options);

    const csvRows = [csvHeaders.join(",")];

    vouchers.forEach((v) => {
      const tradingDateStr = timestampToString(v.tradingDate).dateWithDash;
      const statusStr = v.isVerified ? "已核對" : "未核對";

      // Info: (20260617 - Julian) 為了與前端語言顯示對齊，服務端採用中英雙語標示
      let typeStr = "未知 (Unknown)";
      if (v.tradingType === "INCOME") typeStr = "收入傳票 (Income)";
      else if (v.tradingType === "OUTCOME") typeStr = "支出傳票 (Outcome)";
      else if (v.tradingType === "TRANSFER") typeStr = "轉帳傳票 (Transfer)";

      const issuer = v.issuerName || "";
      const note = (v.note || "").replace(/"/g, '""');

      const lines = v.lineItems.lines;
      if (lines.length === 0) {
        const row = [
          `"${v.id}"`,
          `"${tradingDateStr}"`,
          `"${typeStr}"`,
          `"${note}"`,
          `""`,
          `""`,
          `""`,
          `""`,
          `""`,
          `""`,
          `"${issuer}"`,
          `"${statusStr}"`,
        ];
        csvRows.push(row.join(","));
      } else {
        lines.forEach((line, index) => {
          const lineIndex = index + 1;
          const code = line.accounting?.code || "";
          const name = line.accounting?.name || "";
          const particular = (line.particular || "").replace(/"/g, '""');
          const debit = line.isDebit ? line.amount : "";
          const credit = !line.isDebit ? line.amount : "";

          const row = [
            `"${v.id}"`,
            `"${tradingDateStr}"`,
            `"${typeStr}"`,
            `"${note}"`,
            `"${lineIndex}"`,
            `"${code}"`,
            `"${name}"`,
            `"${particular}"`,
            `"${debit}"`,
            `"${credit}"`,
            `"${issuer}"`,
            `"${statusStr}"`,
          ];
          csvRows.push(row.join(","));
        });
      }
    });

    return csvRows.join("\n");
  }

  /**
   * Info: (20260617 - Julian) 將 ESG 碳盤查紀錄匯出為 CSV 字串
   */
  async exportEsgToCsv(
    accountBookId: string,
    startDate?: Date,
    endDate?: Date,
    includeUnverified?: boolean,
  ): Promise<string> {
    const csvHeaders = [
      "紀錄編號 (Record ID)",
      "交易日期 (Trading Date)",
      "排放範疇 (Scope)",
      "活動類型 (Activity Type)",
      "排放源 (Vendor/Source)",
      "排放源標籤 (Tag)",
      "活動量 (Activity Amount)",
      "單位 (Unit)",
      "排放量 (Emissions kgCO2e)",
      "排放強度 (Intensity)",
      "係數名稱 (Factor Name)",
      "排放係數 (Emission Factor)",
      "係數來源 (Factor Source)",
      "AI 信心度 (AI Confidence)",
      "審核狀態 (Status)",
      "AI 分析備註 (AI Note)",
    ];

    if (!startDate || !endDate) {
      return csvHeaders.join(",");
    }

    const options: IEsgRecordFilterOptions = {
      accountBookId,
      startDate,
      endDate,
    };

    if (!includeUnverified) {
      options.verifyStatus = VerifyStatus.VERIFIED;
    }

    const records = await esgRepo.getEsgRecordsByFilter(options);

    const csvRows = [csvHeaders.join(",")];

    records.forEach((r) => {
      const tradingDateStr = timestampToString(r.tradingDate).dateWithDash;
      const statusStr = r.isVerified ? "已核對" : "未核對";
      const scopeStr = r.scope || "";
      const typeStr = r.activityType || "";
      const vendor = (r.vendor || "").replace(/"/g, '""');
      const tag = (r.emissionSourceTag || "").replace(/"/g, '""');
      const amount = r.amount || "0";
      const unit = r.unit || "";
      const emissions = r.emissions || "0";
      const intensity = r.intensity || "";
      const coefName = r.coefficient
        ? (r.coefficient.name || "").replace(/"/g, '""')
        : "";
      const coefFactor = r.coefficient
        ? r.coefficient.emissionFactor || ""
        : "";
      const coefSource = r.coefficient
        ? (r.coefficient.source || "").replace(/"/g, '""')
        : "";
      const confidence = r.confidence !== undefined ? `${r.confidence}%` : "";
      const aiNote = (r.aiNote || "").replace(/"/g, '""');

      const row = [
        `"${r.id}"`,
        `"${tradingDateStr}"`,
        `"${scopeStr}"`,
        `"${typeStr}"`,
        `"${vendor}"`,
        `"${tag}"`,
        `"${amount}"`,
        `"${unit}"`,
        `"${emissions}"`,
        `"${intensity}"`,
        `"${coefName}"`,
        `"${coefFactor}"`,
        `"${coefSource}"`,
        `"${confidence}"`,
        `"${statusStr}"`,
        `"${aiNote}"`,
      ];
      csvRows.push(row.join(","));
    });

    return csvRows.join("\n");
  }

  /**
   * Info: (20260617 - Julian) 計算符合匯出條件的傳票總筆數，未選擇區間時為 0
   */
  async countVouchersForExport(
    accountBookId: string,
    startDate?: Date,
    endDate?: Date,
    includeUnverified?: boolean,
  ): Promise<number> {
    if (!startDate || !endDate) return 0;

    const options: IVoucherFilterOptions = {
      accountBookId,
      startDate,
      endDate,
    };

    if (!includeUnverified) {
      options.verifyStatus = VerifyStatus.VERIFIED;
    }

    return await voucherRepo.countVouchersByFilter(options);
  }

  /**
   * Info: (20260617 - Julian) 計算符合匯出條件的 ESG 紀錄總筆數，未選擇區間時為 0
   */
  async countEsgForExport(
    accountBookId: string,
    startDate?: Date,
    endDate?: Date,
    includeUnverified?: boolean,
  ): Promise<number> {
    if (!startDate || !endDate) return 0;

    const options: IEsgRecordFilterOptions = {
      accountBookId,
      startDate,
      endDate,
    };

    if (!includeUnverified) {
      options.verifyStatus = VerifyStatus.VERIFIED;
    }

    return await esgRepo.countEsgRecordsByFilter(options);
  }
}

export const exportService = new ExportService();
