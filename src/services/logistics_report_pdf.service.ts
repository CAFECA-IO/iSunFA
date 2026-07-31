// Info: (20260731 - Tzuhan) 運輸報告 PDF 產生服務(向量列印)
// Info: (20260731 - Tzuhan) 職責:把已驗證的報告資料交給 HTML builder,再以 Chrome 列印成 A4 PDF。
// Info: (20260731 - Tzuhan) 不做業務計算 —— 逐段距離與排放皆由前端沿用 buildPlanLegs 的結果原樣傳入,
// Info: (20260731 - Tzuhan) 伺服端重算會產生第三套數字,與 CSV / 畫面互相矛盾。
// Info: (20260731 - Tzuhan) 用 puppeteer 直接驅動而非 md-to-pdf:批次要在**同一個瀏覽器實例**內印完 N 份,
// Info: (20260731 - Tzuhan) mdToPdf 每次呼叫都會另啟一個 Chrome,27 份就是 27 次啟動。

import { logger } from "@/lib/utils/logger";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { buildLogisticsReportHtml } from "@/lib/utils/logistics_report_html";
import {
  LOGISTICS_PDF_MARGIN,
  LOGISTICS_PDF_MAX_REPORTS_PER_REQUEST,
} from "@/constants/logistics_pdf";
import type {
  ILogisticsReportPdfItem,
  ILogisticsReportPdfRequest,
} from "@/validators";

/**
 * Info: (20260731 - Tzuhan) 錯誤展開:JSON.stringify(error) 對 Error 實例永遠印出 {}
 * (message/stack 皆為不可列舉屬性),失敗時等於沒有線索。
 * Info: (20260731 - Tzuhan) feature/esg_report_ingestion 已有通用的 describeError(),
 * 兩者併入 develop 後應改用該版本並移除此處的區域實作。
 */
const describeError = (error: unknown): string =>
  error instanceof Error
    ? `${error.name}: ${error.message}${error.cause ? ` <- ${String(error.cause)}` : ""}`
    : String(error);

export interface IGeneratedReportPdf {
  fileName: string;
  planCode: string;
  /** Info: (20260731 - Tzuhan) base64 的 PDF 內容:一次請求回多份,故不能走 binary body */
  contentBase64: string;
  sizeBytes: number;
}

/**
 * Info: (20260731 - Tzuhan) 頁尾:頁碼與方案代碼。放在頁尾而非內文,分頁後每一頁都能回溯來源,
 * 這是查核者把散頁對回 CSV 的唯一線索。
 */
const buildFooterTemplate = (planCode: string): string =>
  `<div style="width:100%;padding:0 10mm;font-family:Arial,sans-serif;font-size:7pt;color:#94a3b8;display:flex;justify-content:space-between;">
     <span>${planCode}</span>
     <span>iSunFA · <span class="pageNumber"></span>/<span class="totalPages"></span></span>
   </div>`;

/**
 * Info: (20260731 - Tzuhan) 共用的 Chrome 實例。
 *
 * 實測單份請求 4.6s,而其中絕大部分是冷啟動 —— 每個請求各啟一次 Chrome,
 * 27 份分 4 批就是 4 次啟動的純浪費。改為模組層級快取:
 * 首次請求付啟動成本,之後重用。
 *
 * 沒有做閒置回收:Next 的 dev/serverless 都會在閒置後回收整個模組,
 * 自行加計時器反而會在請求密集時把正在用的實例關掉。
 * `connected` 檢查是為了處理 Chrome 自行崩潰後的重建。
 */
let sharedBrowser: Awaited<
  ReturnType<Awaited<typeof import("puppeteer")>["default"]["launch"]>
> | null = null;

async function getBrowser(): Promise<
  Awaited<ReturnType<Awaited<typeof import("puppeteer")>["default"]["launch"]>>
> {
  if (sharedBrowser?.connected) return sharedBrowser;
  const puppeteer = (await import("puppeteer")).default;
  const started = Date.now();
  sharedBrowser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  logger.info(`[LogisticsReportPdfService] browser launched`, {
    ms: Date.now() - started,
  });
  return sharedBrowser;
}

export class LogisticsReportPdfService {
  /**
   * Info: (20260731 - Tzuhan) 產生多份 PDF。單一 Chrome 實例、逐份列印,任何一份失敗即整批失敗:
   * 使用者拿到「27 份裡少了 3 份」而不知道少了哪些,比明確失敗更糟。
   */
  async generate(
    request: ILogisticsReportPdfRequest,
  ): Promise<IGeneratedReportPdf[]> {
    if (request.reports.length > LOGISTICS_PDF_MAX_REPORTS_PER_REQUEST) {
      throw new ApiError(
        API_ERRORS.VL_SCHEMA_ERROR.code,
        API_ERRORS.VL_SCHEMA_ERROR.message,
        API_ERRORS.VL_SCHEMA_ERROR.status,
      );
    }

    const generatedAt = new Date().toISOString().slice(0, 10);
    const batchStarted = Date.now();
    try {
      const browser = await getBrowser();
      const results: IGeneratedReportPdf[] = [];
      // Info: (20260731 - Tzuhan) 逐份序列處理:並行開多個 page 會讓記憶體用量隨批次線性上升
      for (const report of request.reports) {
        const started = Date.now();
        results.push(
          await this.renderOne(browser, report, generatedAt, request.exportId),
        );
        // Info: (20260731 - Tzuhan) 逐份計時:批次匯出實測 15 分鐘遠超預估,
        // Info: (20260731 - Tzuhan) 要能分辨慢在「伺服端排版」還是「前端取地圖」
        logger.info(`[LogisticsReportPdfService] rendered`, {
          planCode: report.planCode,
          ms: Date.now() - started,
          hasMap: Boolean(report.mapImageDataUrl),
        });
      }
      logger.info(`[LogisticsReportPdfService] batch done`, {
        count: results.length,
        ms: Date.now() - batchStarted,
      });
      return results;
    } catch (error) {
      logger.error(
        `[LogisticsReportPdfService] generate failed: ${describeError(error)}`,
      );
      // Info: (20260731 - Tzuhan) 失敗後棄用共用實例:崩潰的 Chrome 會讓後續請求全數失敗
      if (sharedBrowser) {
        await sharedBrowser.close().catch(() => undefined);
        sharedBrowser = null;
      }
      throw new ApiError(
        API_ERRORS.IS_PDF_GENERATION_FAILED.code,
        API_ERRORS.IS_PDF_GENERATION_FAILED.message,
        API_ERRORS.IS_PDF_GENERATION_FAILED.status,
      );
    }
  }

  private async renderOne(
    browser: Awaited<
      ReturnType<Awaited<typeof import("puppeteer")>["default"]["launch"]>
    >,
    report: ILogisticsReportPdfItem,
    generatedAt: string,
    exportId?: string,
  ): Promise<IGeneratedReportPdf> {
    const page = await browser.newPage();
    try {
      const html = buildLogisticsReportHtml({
        planCode: report.planCode,
        routeLabel: report.routeLabel,
        planLabel: report.planLabel,
        originLabel: report.originLabel,
        destLabel: report.destLabel,
        weightKg: report.weightKg,
        planTotalCo2e: report.planTotalCo2e,
        mapImageDataUrl: report.mapImageDataUrl,
        exportId,
        generatedAt,
        // Info: (20260731 - Tzuhan) validator 的 leg 形狀即 IReportLeg,原樣傳入不做任何換算
        legs: report.legs,
      });

      // Info: (20260731 - Tzuhan) setContent 而非 goto:HTML 由我們產生,不需要網路,也不該讓外部 URL 進來
      await page.setContent(html, { waitUntil: "load" });
      const buffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: LOGISTICS_PDF_MARGIN,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: buildFooterTemplate(report.planCode),
      });

      return {
        fileName: report.fileName,
        planCode: report.planCode,
        contentBase64: Buffer.from(buffer).toString("base64"),
        sizeBytes: buffer.length,
      };
    } finally {
      await page.close();
    }
  }
}
