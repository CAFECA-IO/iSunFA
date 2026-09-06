import { logger } from "@/lib/utils/logger";
import { dropPrintBrowser, getPrintBrowser } from "@/lib/utils/pdf_browser";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import { assertCjkRenderable } from "@/lib/utils/pdf_font_guard";
import {
  buildPaySlipHtml,
  type IPaySlipHtmlInput,
} from "@/lib/utils/pay_slip_html";

/**
 * Info: (20260902 - Julian) 薪資單 PDF 產生服務。
 *
 * ## 為什麼另立一支，而不是擴充 `logistics_report_pdf.service`
 *
 * 那支的介面是「一次請求印 N 份，任一份失敗即整批失敗」，因為運輸報告本來就是批次匯出。
 * 薪資單相反：一次寄一位員工，而且**每一位的成敗必須各自記錄**（見計畫書 D2 的寄送紀錄表）。
 * 把薪資單塞進批次介面，等於逼呼叫端把 N 個獨立的寄送硬湊成一批，
 * 然後在收到「整批失敗」時失去「誰寄成功了」這個唯一重要的資訊。
 *
 * 共用的是下面兩個 import：Chrome 實例與字型守門。那才是真正該共用的部分。
 *
 * ## 回傳 Buffer 而不是 base64
 *
 * 運輸報告回 base64 是因為它一次回多份，得走 JSON body。薪資單的下一站是
 * nodemailer 的 `attachments[].content`，那個欄位吃 Buffer。
 * 先轉 base64 再讓呼叫端轉回來，只是多一次 33% 膨脹的字串複製。
 */

/**
 * Info: (20260902 - Julian) 錯誤展開：JSON.stringify(error) 對 Error 實例永遠印出 {}
 * （message/stack 皆為不可列舉屬性），失敗時等於沒有線索。
 * 與 logistics_report_pdf.service 的區域實作相同；待 develop 的通用 describeError() 落地後一併改用。
 */
const describeError = (error: unknown): string =>
  error instanceof Error
    ? `${error.name}: ${error.message}${error.cause ? ` <- ${String(error.cause)}` : ""}`
    : String(error);

export interface ISalaryPaySlipPdf {
  fileName: string;
  content: Buffer;
  sizeBytes: number;
}

/**
 * Info: (20260902 - Julian) A4 邊界。左右比上下窄：薪資單是兩欄式表格，
 * 左右各留 12mm 會把金額欄擠到換行，而上下留白只影響觀感。
 */
const PAY_SLIP_PDF_MARGIN = {
  top: "12mm",
  bottom: "12mm",
  left: "10mm",
  right: "10mm",
} as const;

/**
 * Info: (20260902 - Julian) 檔名片段消毒。
 *
 * 員工姓名與員工編號都是使用者輸入，而它們會成為信件附件的檔名。
 * 路徑分隔符與控制字元進到檔名，輕則收件端存檔失敗，重則在某些郵件客戶端
 * 被解讀成路徑（`../` 是 zip-slip 的同一族問題）。
 *
 * 保留中文：附件檔名走 RFC 2231 編碼，非 ASCII 本身沒有問題，
 * 把中文剃成空字串反而讓每個人的附件都叫同一個名字。
 */
export const sanitizeFileNamePart = (value: string): string =>
  value
    // Info: (20260902 - Julian) 路徑分隔、Windows 檔名保留字元、以及會被外殼或郵件標頭誤讀的符號
    .replace(/[/\\:*?"<>|]/g, "")
    // Info: (20260902 - Julian) 控制字元（含換行）進到檔名等於進到 MIME 標頭，必須整段剃掉
    .replace(/[\u0000-\u001f\u007f]/g, "")
    // Info: (20260902 - Julian) 前導的點會做出隱藏檔；連續點是 `..` 的來源
    .replace(/\.+/g, ".")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "");

/**
 * Info: (20260902 - Julian) 附件檔名。年月置前：員工把多個月份存進同一個資料夾時，
 * 依檔名排序即是依月份排序；把姓名放前面會讓同一個人的十二個月散落在別人中間。
 */
export const buildPaySlipFileName = (input: {
  employeeName: string;
  employeeNumber: string;
  year: number;
  month: number;
}): string => {
  const period = `${input.year}-${String(input.month).padStart(2, "0")}`;
  const parts = [
    period,
    sanitizeFileNamePart(input.employeeNumber),
    sanitizeFileNamePart(input.employeeName),
  ].filter((part) => part.length > 0);
  return `payslip_${parts.join("_")}.pdf`;
};

export class SalaryPaySlipPdfService {
  /**
   * Info: (20260902 - Julian) 產生單份薪資單 PDF。
   *
   * log 只留期間、耗時與位元組數 —— 不留姓名、檔名與任何金額。
   * 薪資是本專案裡少數「知道了就不能假裝不知道」的資料，
   * 而 log 的閱讀者是維運，不是人資。要查是哪一筆，寄送紀錄表有 id。
   */
  async generate(input: IPaySlipHtmlInput): Promise<ISalaryPaySlipPdf> {
    const started = Date.now();
    const period = `${input.year}-${String(input.month).padStart(2, "0")}`;

    try {
      const browser = await getPrintBrowser();
      const page = await browser.newPage();

      try {
        const html = buildPaySlipHtml(input);

        // Info: (20260902 - Julian) setContent 而非 goto：HTML 由我們產生，不需要網路，也不該讓外部 URL 進來
        await page.setContent(html, { waitUntil: "load" });

        /**
         * Info: (20260902 - Julian) 列印前實測中文字形。這一行不能拿掉。
         *
         * 薪資單通篇中文，缺字型的產出是一份滿版空心方框的 PDF ——
         * 而流程會回報「寄送成功」。收件人是員工，不是同事：
         * 他不會來問「是不是字型壞了」，他會認為公司寄了一份亂碼給他。
         * 這個缺陷完全靜默，型別與單元測試都看不到，只有掃描測試守得住
         * （見 `salary_pdf_font_guard.test.ts`）。
         *
         * Info: (20260904 - Julian) **「我們寄成功過了」不能當作這一項已驗證。**
         * 同日在 macOS 開發機做過一次端到端寄送，PDF 完全正確 ——
         * 但那台機器本來就有中文字型。`pdf_font_guard.ts` 檔頭記的那次事故
         * 發生在**伺服器**上（`fc-list :lang=zh` 只有 X11 點陣字）。
         * 這一行要防的環境，至今一次都沒有被測到過。
         */
        await assertCjkRenderable(page, html, {
          scope: "SalaryPaySlipPdfService",
          ref: period,
        });

        const buffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: PAY_SLIP_PDF_MARGIN,
        });

        const content = Buffer.from(buffer);
        logger.info("[SalaryPaySlipPdfService] rendered", {
          period,
          ms: Date.now() - started,
          sizeBytes: content.length,
        });

        return {
          fileName: buildPaySlipFileName(input),
          content,
          sizeBytes: content.length,
        };
      } finally {
        await page.close();
      }
    } catch (error) {
      logger.error(
        `[SalaryPaySlipPdfService] generate failed: ${describeError(error)}`,
        { period },
      );

      /**
       * Info: (20260902 - Julian) 已分類的 ApiError 原樣往上拋，且不棄用共用 Chrome。
       *
       * 沿用 logistics_report_pdf.service 得到的教訓：IS_PDF_FONT_UNAVAILABLE
       * 被包成通用列印失敗之後，唯一的解法（裝字型）就被埋掉了，維運只能靠猜。
       * 而缺字型時瀏覽器本身是健康的，關掉它只讓後續每個請求多付一次 4.6 秒冷啟動。
       */
      if (error instanceof ApiError) throw error;

      await dropPrintBrowser();
      throw new ApiError(
        API_ERRORS.IS_PDF_GENERATION_FAILED.code,
        API_ERRORS.IS_PDF_GENERATION_FAILED.message,
        API_ERRORS.IS_PDF_GENERATION_FAILED.status,
      );
    }
  }
}
