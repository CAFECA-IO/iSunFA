import fs from "node:fs";
import path from "node:path";
import { fetchWithRetry } from "@/lib/utils/http_client";

interface IEsgReportData {
  twFirstReportDownloadId?: string;
  twEditReportDownloadId?: string;
}

interface IEsgApiResponse {
  success: boolean;
  data?: IEsgReportData[];
}

/**
 * Info: (20260402 - Tzuhan) 核心 Service: ESG 永續報告書下載 (動態上市櫃支援版)
 * @param stockId 公司代號
 * @param marketType 市場別 ('sii' | 'otc')
 * @param year 西元年份
 * @param savePath 完整存檔路徑 (含檔名)
 * @returns {Promise<boolean>} 是否下載成功
 */
export async function downloadEsgReport(
  stockId: string,
  marketType: "sii" | "otc",
  year: number,
  savePath: string,
): Promise<boolean> {
  const listUrl = `https://esggenplus.twse.com.tw/api/api/MopsSustainReport/data`;

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    Origin: "https://esggenplus.twse.com.tw",
    Referer: "https://esggenplus.twse.com.tw/",
  };

  try {
    const marketTypeCode = marketType === "otc" ? 1 : 0;
    const requestBody = {
      marketType: marketTypeCode,
      year: year,
      companyCodeList: [stockId],
      industryNameList: [],
      industryName: "all",
      companyCode: stockId,
    };

    const listRes = await fetchWithRetry(listUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });
    if (!listRes.ok) {
      console.warn(`⚠️ [ESG PDF] API 請求失敗 (HTTP ${listRes.status})`);
      return false;
    }

    const responseJson = (await listRes.json()) as IEsgApiResponse;

    // Info: (20260402 - Tzuhan) 如果找不到資料，清楚印出原因
    if (
      !responseJson.success ||
      !responseJson.data ||
      responseJson.data.length === 0
    ) {
      console.warn(
        `⚠️ [ESG PDF] 找不到 ${stockId} (${marketType.toUpperCase()}) 於 ${year} 年度的報告書紀錄。`,
      );
      return false;
    }

    const report = responseJson.data[0];

    let fileId = report.twEditReportDownloadId;
    const emptyUuid = "00000000-0000-0000-0000-000000000000";

    if (!fileId || fileId === emptyUuid) {
      fileId = report.twFirstReportDownloadId;
    }

    // Info: (20260402 - Tzuhan) 如果有紀錄但沒有上傳實體 PDF
    if (!fileId || fileId === emptyUuid) {
      console.warn(
        `⚠️ [ESG PDF] ${stockId} 有登錄資料，但未上傳實體的 PDF 檔案 (可能只提供網址)`,
      );
      throw new Error("該公司有紀錄，但未上傳有效的 PDF 檔案");
    }

    const downloadUrl = `https://esggenplus.twse.com.tw/api/api/MopsSustainReport/data/FileStream?id=${fileId}`;
    const downloadRes = await fetchWithRetry(downloadUrl, {
      method: "GET",
      headers,
    });

    if (!downloadRes.ok) {
      console.warn(
        `⚠️ [ESG PDF] PDF 下載請求失敗 (HTTP ${downloadRes.status})`,
      );
      return false;
    }

    const buffer = Buffer.from(await downloadRes.arrayBuffer());

    // Info: (20260402 - Tzuhan) 如果下載下來的不是 PDF，印出前幾個字元看看到底是什麼
    if (buffer.subarray(0, 4).toString("ascii") !== "%PDF") {
      const preview = buffer
        .toString("utf-8")
        .substring(0, 100)
        .replace(/\n/g, "");
      console.warn(`❌ [ESG PDF] ${stockId} 下載內容非 PDF。預覽: ${preview}`);
      throw new Error("下載的 ESG 檔案非 PDF 格式");
    }

    fs.mkdirSync(path.dirname(savePath), { recursive: true });
    fs.writeFileSync(savePath, buffer);

    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`❌ 處理 ${stockId} 失敗: ${msg}`);
    return false;
  }
}
