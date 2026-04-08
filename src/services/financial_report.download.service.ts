import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { fetchWithRetry } from "@/lib/utils/http_client";

// Info: (20260408 - Tzuhan) 內部動態解析用
interface IDynamicRecord {
  [key: string]: string;
}

interface IEquityChanges {
  currentPeriod: IDynamicRecord[];
  previousPeriod: IDynamicRecord[];
}

interface ICpaReport {
  報告內容?: string;
  事務所名稱?: string;
  簽證會計師?: string[];
  查核日期?: string;
  查核類型?: string;
}

// Info: (20260408 - Tzuhan) MOPS API 基礎回傳格式
interface IMopsUrlItem {
  name: string;
  url: string;
}

interface IMopsTitleItem {
  main: string;
  sub: IMopsTitleItem[];
}

// Info: (20260408 - Tzuhan) 三大報表 (資產負債、綜合損益、現金流量) 的 Result 格式
interface IReportResult {
  reportType: string;
  year: string;
  reportList: string[][];
  season: string;
  urlList: IMopsUrlItem[];
  titles: IMopsTitleItem[];
  fiscalYear: string;
  subsidiary: unknown[];
  companyAbbreviation: string;
  CAL?: Record<string, unknown>;
}

// Info: (20260408 - Tzuhan) 財務報告公告 (t163sb01) 的 Result 格式
interface IAnnouncementIllustrate {
  content: string;
  url: unknown[];
}

interface IAnnouncementCcsi {
  date: string;
  unit: string;
  data: string[][];
}

interface IAnnouncementResult {
  IFRSFinancialReportStatus: string;
  reportType: string;
  declarationOfFinancialReports: { title: string; url: unknown[] }[];
  marketName: string;
  year: string;
  illustrate: IAnnouncementIllustrate[];
  seasonName: string;
  IFRSAccountantReports: string[];
  CCSI: IAnnouncementCcsi;
  companyAbbreviation: string;
  subsidiary: unknown[];
}

// Info: (20260408 - Tzuhan) 通用 MOPS JSON 回傳外層包裝
interface IMopsApiResponse<T> {
  code: number;
  message: string;
  result: T;
  datetime: string;
}

// Info: (20260408 - Tzuhan) 舊版轉址 API 回傳格式 (redirectToOld)
interface IRedirectResult {
  url: string;
}

interface IRedirectResponse {
  code: number;
  message: string;
  result: IRedirectResult;
  datetime: string;
}

// Info: (20260408 - Tzuhan) 最終聚合存檔格式
interface IFinancialMetadata {
  stockId: string;
  year: number;
  marketType: string;
  fetchTime: string;
}

interface IAggregatedFinancialData {
  metadata: IFinancialMetadata;
  balanceSheet: IReportResult | null;
  incomeStatement: IReportResult | null;
  cashFlow: IReportResult | null;
  announcement: IAnnouncementResult | null;
  equityChangesHtml: IEquityChanges | Partial<IEquityChanges>;
  cpaReportHtml: ICpaReport | Partial<ICpaReport>;
}

/**
 * Info: (20260408 - Tzuhan)
 * 內部工具函式：將「權益變動表 HTML」解析為結構化 JSON
 */
function parseEquityHtmlToJson(html: string): IEquityChanges {
  const $ = cheerio.load(html);
  const result: IEquityChanges = {
    currentPeriod: [],
    previousPeriod: [],
  };
  const tables = $("table.hasBorder");

  tables.each((index, table) => {
    const periodKey = index === 0 ? "currentPeriod" : "previousPeriod";
    const rows = $(table).find("tr");
    const headers: string[] = [];

    rows.each((rowIndex, row) => {
      // Info: (20260408 - Tzuhan) 第 3 列 (index 2) 通常是欄位名稱的 Header
      if (rowIndex === 2) {
        $(row)
          .find("th, td")
          .each((_, cell) => {
            headers.push(
              $(cell)
                .text()
                .replace(/[\u3000\s]/g, ""),
            ); // Info: (20260408 - Tzuhan) 去除全形空白與換行
          });
      } else if (rowIndex > 2) {
        const cells = $(row).find("td");
        if (cells.length > 0) {
          const rowData: IDynamicRecord = {};
          const itemName = $(cells[0])
            .text()
            .replace(/[\u3000\s]/g, "");
          rowData["會計項目"] = itemName;

          for (let i = 1; i < cells.length; i++) {
            const headerName = headers[i] || `column_${i}`;
            // Info: (20260408 - Tzuhan) 去除千分位逗號，轉換為純數字字串
            rowData[headerName] = $(cells[i]).text().trim().replace(/,/g, "");
          }
          result[periodKey].push(rowData);
        }
      }
    });
  });
  return result;
}

/**
 * Info: (20260408 - Tzuhan)
 * 內部工具函式：將「會計師查核報告 HTML」解析為結構化 JSON
 */
function parseCpaHtmlToJson(html: string): ICpaReport {
  const $ = cheerio.load(html);
  const result: ICpaReport = {};

  // Info: (20260408 - Tzuhan) 萃取查核報告長文內容
  result["報告內容"] = $("pre").text().trim();

  // Info: (20260408 - Tzuhan) 萃取表格內的元數據
  $("th").each((_, th) => {
    const headerText = $(th).text().trim();
    if (headerText === "事務所名稱") {
      result["事務所名稱"] = $(th)
        .next("td")
        .text()
        .replace(/&nbsp;/g, "")
        .trim();
    } else if (headerText === "簽證會計師") {
      const cpa1 = $(th)
        .next("td")
        .text()
        .replace(/&nbsp;/g, "")
        .trim();
      const cpa2 = $(th)
        .next("td")
        .next("td")
        .text()
        .replace(/&nbsp;/g, "")
        .trim();
      result["簽證會計師"] = [cpa1, cpa2].filter((c) => c); // Info: (20260408 - Tzuhan) 過濾掉空值
    } else if (headerText === "查核日期") {
      result["查核日期"] = $(th)
        .next("td")
        .text()
        .replace(/&nbsp;/g, "")
        .trim();
    } else if (headerText === "查核類型") {
      result["查核類型"] = $(th)
        .next("td")
        .text()
        .replace(/&nbsp;/g, "")
        .trim();
    }
  });

  return result;
}

/**
 * Info: (20260408 - Tzuhan)
 * 透過 MOPS 新版 JSON API 聚合下載五大財報數據
 * 包含：資產負債表、綜合損益表、現金流量表、財務報告公告、權益變動表(HTML)、會計師查核報告(HTML)
 */
export async function downloadFinancialData(
  stockId: string,
  marketType: string,
  year: number,
  savePath: string,
): Promise<boolean> {
  const taiwanYear = (year - 1911).toString();
  const season = "4"; // Info: (20260408 - Tzuhan) 年報固定抓取第 4 季 (全年)

  // Info: (20260408 - Tzuhan) 偽裝 Header (這些是 MOPS JSON API 必備的防護)
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Content-Type": "application/json",
    Accept: "application/json, text/plain, */*",
    Origin: "https://mops.twse.com.tw",
    Referer: "https://mops.twse.com.tw/mops/web/t164sb03",
  };

  // Info: (20260408 - Tzuhan) 共用的基礎 Payload
  const basePayload = {
    companyId: stockId,
    dataType: "2", // Info: (20260408 - Tzuhan) 2 = 自訂時間
    season: season, // Info: (20260408 - Tzuhan) 第 4 季
    year: taiwanYear,
    subsidiaryCompanyId: "",
  };

  try {
    // Info: (20260408 - Tzuhan) 取得三大報表與財務公告 (純 JSON)
    // Info: (20260408 - Tzuhan) 放棄 Promise.all，改用循序 (Sequential) 請求，避免瞬間對 MOPS 產生 DDoS 級別的併發
    const bsRes = await fetchWithRetry(
      "https://mops.twse.com.tw/mops/api/t164sb03",
      {
        method: "POST",
        headers,
        body: JSON.stringify(basePayload),
      },
    );
    const isRes = await fetchWithRetry(
      "https://mops.twse.com.tw/mops/api/t164sb04",
      {
        method: "POST",
        headers,
        body: JSON.stringify(basePayload),
      },
    );
    const cfRes = await fetchWithRetry(
      "https://mops.twse.com.tw/mops/api/t164sb05",
      {
        method: "POST",
        headers,
        body: JSON.stringify(basePayload),
      },
    );
    const annRes = await fetchWithRetry(
      "https://mops.twse.com.tw/mops/api/t163sb01",
      {
        method: "POST",
        headers,
        body: JSON.stringify(basePayload),
      },
    );

    const bsData = (await bsRes.json()) as IMopsApiResponse<IReportResult>;
    const isData = (await isRes.json()) as IMopsApiResponse<IReportResult>;
    const cfData = (await cfRes.json()) as IMopsApiResponse<IReportResult>;
    const annData =
      (await annRes.json()) as IMopsApiResponse<IAnnouncementResult>;

    // Info: (20260408 - Tzuhan) 防呆：如果最核心的資產負債表回傳失敗，代表該公司今年還沒上傳財報
    if (bsData.code !== 200 || !bsData.result || !bsData.result.reportList) {
      console.warn(
        `⚠️ [財報 JSON] 查無 ${stockId} (${year}年) 結構化財報 (可能尚未公告)`,
      );
      return false;
    }

    // Info: (20260408 - Tzuhan) 取得跳轉頁面並「即時解析 HTML 為 JSON」
    let equityChangesJson: IEquityChanges | Partial<IEquityChanges> = {};
    let cpaReportJson: ICpaReport | Partial<ICpaReport> = {};

    // Info: (20260408 - Tzuhan) 權益變動表
    const eqPayload = {
      apiName: "ajax_t164sb06",
      parameters: {
        co_id: stockId,
        isnew: "false",
        year: taiwanYear,
        season,
        encodeURIComponent: 1,
        firstin: 1,
        step: 1,
        first: 1,
      },
    };
    const eqRedirectRes = await fetchWithRetry(
      "https://mops.twse.com.tw/mops/api/redirectToOld",
      { method: "POST", headers, body: JSON.stringify(eqPayload) },
    );
    const eqRedirectData = (await eqRedirectRes.json()) as IRedirectResponse;
    if (eqRedirectData.code === 200 && eqRedirectData.result?.url) {
      const eqHtmlRes = await fetchWithRetry(eqRedirectData.result.url, {
        method: "GET",
        headers: { "User-Agent": headers["User-Agent"] },
      });
      const rawHtml = await eqHtmlRes.text();
      equityChangesJson = parseEquityHtmlToJson(rawHtml); // Info: (20260408 - Tzuhan) 調用解析器
    }

    // Info: (20260408 - Tzuhan) 會計師查核報告
    const cpaPayload = {
      apiName: "ajax_t163sb03",
      parameters: {
        co_id: stockId,
        isnew: "false",
        year: taiwanYear,
        season,
        encodeURIComponent: 1,
        firstin: 1,
        step: 1,
        first: 1,
      },
    };
    const cpaRedirectRes = await fetchWithRetry(
      "https://mops.twse.com.tw/mops/api/redirectToOld",
      { method: "POST", headers, body: JSON.stringify(cpaPayload) },
    );
    const cpaRedirectData = (await cpaRedirectRes.json()) as IRedirectResponse;
    if (cpaRedirectData.code === 200 && cpaRedirectData.result?.url) {
      const cpaHtmlRes = await fetchWithRetry(cpaRedirectData.result.url, {
        method: "GET",
        headers: { "User-Agent": headers["User-Agent"] },
      });
      const rawHtml = await cpaHtmlRes.text();
      cpaReportJson = parseCpaHtmlToJson(rawHtml); // Info: (20260408 - Tzuhan) 調用解析器
    }

    // Info: (20260408 - Tzuhan) 聚合所有數據，寫入單一 JSON 檔案 (符合 IAggregatedFinancialData 規範)
    const finalAggregatedData: IAggregatedFinancialData = {
      metadata: {
        stockId,
        year,
        marketType,
        fetchTime: new Date().toISOString(),
      },
      balanceSheet: bsData.result || null,
      incomeStatement: isData.result || null,
      cashFlow: cfData.result || null,
      announcement: annData.result || null,
      equityChangesHtml: equityChangesJson,
      cpaReportHtml: cpaReportJson,
    };

    fs.mkdirSync(path.dirname(savePath), { recursive: true });
    fs.writeFileSync(
      savePath,
      JSON.stringify(finalAggregatedData, null, 4),
      "utf-8",
    );

    return true;
  } catch (error) {
    console.error(`   ❌ [財報 JSON] ${stockId} 發生未預期錯誤:`, error);
    return false;
  }
}

/**
 * Info: (20260402 - Tzuhan)
 * 下載 MOPS 股東會年報 (F04)
 * @param stockId 公司代號
 * @param year 西元年份
 * @param savePath 完整存檔路徑 (含檔名)
 * @returns {Promise<boolean>} 是否下載成功
 */
export async function downloadFinancialReport(
  stockId: string,
  year: number,
  savePath: string,
): Promise<boolean> {
  const taiwanYear = (year - 1911).toString();
  const url = "https://doc.twse.com.tw/server-java/t57sb01";

  const headers = {
    Referer: "https://doc.twse.com.tw/server-java/t57sb01",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded",
  };
  try {
    fs.mkdirSync(path.dirname(savePath), { recursive: true });

    // Info: (20260408 - Tzuhan) 第一次嘗試：使用 ptype = F
    const formParams = new URLSearchParams({
      step: "1",
      colorchg: "1",
      co_id: stockId,
      year: taiwanYear,
      seamon: "",
      mtype: "F",
      ptype: "F",
    });

    let searchRes = await fetchWithRetry(url, {
      method: "POST",
      headers,
      body: formParams.toString(),
    });
    let htmlText = Buffer.from(await searchRes.arrayBuffer()).toString(
      "latin1",
    );

    if (htmlText.includes("d߹Lq") || htmlText.includes("查詢過繁")) {
      throw new Error("觸發 MOPS 防爬蟲機制，請等待幾分鐘"); // Info: (20260408 - Tzuhan) 改用 throw
    }

    let filenameMatch = htmlText.match(/([a-zA-Z0-9_]*F04[a-zA-Z0-9_]*\.pdf)/i);

    // Info: (20260408 - Tzuhan) 第二次嘗試：如果 ptype=F 找不到，切換為 ptype=F04 再打一次 API！
    if (!filenameMatch || !filenameMatch[1]) {
      formParams.set("ptype", "F04");
      searchRes = await fetchWithRetry(url, {
        method: "POST",
        headers,
        body: formParams.toString(),
      });
      htmlText = Buffer.from(await searchRes.arrayBuffer()).toString("latin1");
      filenameMatch = htmlText.match(/([a-zA-Z0-9_]*F04[a-zA-Z0-9_]*\.pdf)/i);
    }

    if (!filenameMatch || !filenameMatch[1]) {
      throw new Error("查無股東會年報(F04)檔案 (可能尚未上傳或非此格式)"); // Info: (20260408 - Tzuhan) 改用 throw
    }

    const fileName = filenameMatch[1];

    // Info: (20260408 - Tzuhan) 請求過渡頁面
    const step2Url = `${url}?step=9&kind=F&co_id=${stockId}&filename=${fileName}`;
    const step2Res = await fetchWithRetry(step2Url, { method: "GET", headers });
    const step2Buffer = Buffer.from(await step2Res.arrayBuffer());

    // Info: (20260402 - Tzuhan) 如果直接拿到 PDF 就結束任務
    if (step2Buffer.subarray(0, 4).toString("ascii") === "%PDF") {
      fs.writeFileSync(savePath, step2Buffer);
      return true;
    }

    // Info: (20260331 - Tzuhan) 取得過渡頁面的 HTML
    const step2Text = step2Buffer.toString("utf-8");

    // Info: (20260331 - Tzuhan) 增強 Regex：同時尋找 href, url=, 或是 window.open 的連結
    const realUrlMatch =
      step2Text.match(/href=['"]?(\/server-java\/t57sb01\?[^'"]+)['"]?/i) ||
      step2Text.match(/url=['"]?([^'"]+)['"]?/i) ||
      step2Text.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i) ||
      step2Text.match(/<a[^>]+href=['"]([^'"]+)['"]/i);

    // Info: (20260408 - Tzuhan) 防呆：如果遇到空白的無效頁面，直接拋出錯誤
    if (!realUrlMatch) {
      throw new Error("找不到 PDF 過渡連結 (可能是 MOPS 實體檔案已遺失)");
    }

    // Info: (20260331 - Tzuhan) 組裝最終網址
    let finalDownloadUrl = realUrlMatch[1];
    if (finalDownloadUrl.startsWith("/")) {
      finalDownloadUrl = `https://doc.twse.com.tw${finalDownloadUrl}`;
    } else if (!finalDownloadUrl.startsWith("http")) {
      finalDownloadUrl = `https://doc.twse.com.tw/server-java/${finalDownloadUrl}`;
    }
    // Info: (20260331 - Tzuhan) 下載 PDF 檔案
    const finalRes = await fetchWithRetry(finalDownloadUrl, {
      method: "GET",
      headers,
    });
    const finalBuffer = Buffer.from(await finalRes.arrayBuffer());

    if (finalBuffer.subarray(0, 4).toString("ascii") !== "%PDF") {
      throw new Error("最終下載內容非 PDF 格式 (可能被導向錯誤頁面)");
    }

    fs.writeFileSync(savePath, finalBuffer);
    return true;
  } catch (error) {
    // Info: (20260408 - Tzuhan) 將錯誤原封不動地往上拋，交給 Commander 去寫入 DB！
    throw error;
  }
}
