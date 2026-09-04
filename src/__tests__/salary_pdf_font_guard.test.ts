import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import path from "path";

/**
 * Info: (20260902 - Julian) 掃描測試：薪資單列印真的呼叫了字型守門。
 *
 * ## 為什麼這件事只能用掃描守
 *
 * 缺中文字型時 headless Chrome **不會報錯**。它靜默 fallback 到 DejaVu，
 * 每個中文字取 .notdef，產出一份滿版空心方框的 PDF —— 而 `page.pdf()` 回傳成功、
 * 型別檢查全綠、所有單元測試全綠，流程回報「寄送成功」。
 *
 * 收件人是員工，不是同事。他不會來問「是不是字型壞了」，
 * 他會認為公司寄了一份亂碼給他，而我們永遠不會知道。
 *
 * 真正跑一次列印來驗證，需要 puppeteer 與一個「刻意沒有中文字型」的環境 ——
 * 本專案的測試不啟瀏覽器（`header_layout_320.test.ts` 正是那條路的下場：
 * 它在多數機器上找不到 Chrome）。於是唯一守得住的，是驗這一行還在。
 *
 * ## 為什麼要剝掉註解才掃
 *
 * `salary_pay_slip_pdf.service.ts` 的註解裡就寫著 `assertCjkRenderable` 這個字，
 * 而且寫了三次。直接對原始碼做字串比對的話，有人把**呼叫**刪掉、
 * 註解留著（那是最可能發生的情況 —— 註解看起來只是說明），這條測試依然全綠。
 */

const SERVICE_RELATIVE_PATH = "src/services/salary_pay_slip_pdf.service.ts";

const rawSource = readFileSync(
  path.join(process.cwd(), SERVICE_RELATIVE_PATH),
  "utf-8",
);

/**
 * Info: (20260902 - Julian) 剝掉區塊註解與行註解。
 *
 * 夠用而非通用：這是掃我們自己寫的一支檔案，不是寫一個 TypeScript parser。
 * 字串字面值裡若出現 `//` 會被誤剝 —— 本檔沒有那種內容，
 * 而萬一將來有，症狀是掃描變嚴格（誤刪程式碼），不是變寬鬆（漏掉缺陷）。
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const code = stripComments(rawSource);

describe("salary_pay_slip_pdf.service — 字型守門", () => {
  it("從 pdf_font_guard 引入 assertCjkRenderable", () => {
    expect(code).toMatch(
      /import\s*\{\s*assertCjkRenderable\s*\}\s*from\s*["']@\/lib\/utils\/pdf_font_guard["']/,
    );
  });

  it("真的呼叫了 assertCjkRenderable，而不只是在註解裡提到它", () => {
    expect(code).toContain("assertCjkRenderable(");
  });

  /**
   * Info: (20260902 - Julian) 順序才是重點：先印再驗等於已經產出了那份方框 PDF。
   * 那時擋下來只剩下「別寄出去」的價值，而呼叫端未必分得清楚。
   */
  it("守門發生在 page.pdf() 之前", () => {
    const guardAt = code.indexOf("assertCjkRenderable(");
    const printAt = code.indexOf("page.pdf(");

    expect(guardAt).toBeGreaterThan(-1);
    expect(printAt).toBeGreaterThan(-1);
    expect(guardAt).toBeLessThan(printAt);
  });

  it("守門發生在 setContent 之後（沒有內容可量就驗不了字形）", () => {
    const setContentAt = code.indexOf("page.setContent(");
    const guardAt = code.indexOf("assertCjkRenderable(");

    expect(setContentAt).toBeGreaterThan(-1);
    expect(setContentAt).toBeLessThan(guardAt);
  });

  it("守門的 scope 標成本服務，log 才追得回來源", () => {
    expect(code).toContain('scope: "SalaryPaySlipPdfService"');
  });
});

describe("salary_pay_slip_pdf.service — 已分類錯誤不被吞掉", () => {
  /**
   * Info: (20260902 - Julian) 這是同一個缺陷的另一半，成因與 §4.2 相同。
   *
   * 字型守門丟出的 IS_PDF_FONT_UNAVAILABLE 若在 catch 裡被包成通用列印失敗，
   * 唯一的解法（裝字型）就被埋掉了 —— 維運看到的是一個「值得重試」的錯誤，
   * 而它重試一萬次都一樣。logistics_report_pdf.service 已經踩過一次。
   */
  it("catch 裡把 ApiError 原樣往上拋", () => {
    expect(code).toMatch(/if\s*\(error instanceof ApiError\)\s*throw error;/);
  });

  it("原樣往上拋寫在 dropPrintBrowser 之前", () => {
    const rethrowAt = code.indexOf("error instanceof ApiError");
    const dropAt = code.indexOf("dropPrintBrowser()");

    expect(rethrowAt).toBeGreaterThan(-1);
    expect(dropAt).toBeGreaterThan(-1);
    expect(rethrowAt).toBeLessThan(dropAt);
  });
});

describe("salary_pay_slip_pdf.service — log 不洩漏身分與金額", () => {
  /**
   * Info: (20260902 - Julian) 薪資是「知道了就不能假裝不知道」的資料，
   * 而 log 的讀取權限遠寬於資料庫。要查是哪一筆，寄送紀錄表有 id。
   */
  it("log 不帶姓名、檔名或金額欄位", () => {
    const logCalls =
      code.match(/logger\.(info|error|warn)\([\s\S]*?\);/g) ?? [];

    expect(logCalls.length).toBeGreaterThan(0);
    logCalls.forEach((call) => {
      expect(call).not.toContain("employeeName");
      expect(call).not.toContain("fileName");
      expect(call).not.toContain("totalPayment");
      expect(call).not.toContain("result");
    });
  });
});
