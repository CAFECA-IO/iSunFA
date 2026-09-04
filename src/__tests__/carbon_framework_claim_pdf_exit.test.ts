import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { CarbonReportPdfService } from "@/services/carbon_report_pdf.service";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { CarbonDisclosureFrameworkEnum } from "@/constants/carbon_report_framework";

/**
 * Info: (20260903 - Emily) PDF 出口的接線(#6688-B)。
 *
 * 分流表由 `carbon_framework_claim_gate.test.ts` 守、四條判準由
 * `carbon_framework_claims.test.ts` 守。本檔守的是**這條線接上了沒有**:
 * 那支閘門在此之前有零個非測試呼叫端 —— 判準寫好了、四條都有測試,
 * 而真正會產出檔案的那條路一次都沒有問過它。
 *
 * ## 為什麼要換掉瀏覽器
 *
 * 要斷言的兩件事以瀏覽器為界:
 *
 * - 被擋的那份**連 Chrome 都不開**(拒絕不需要排版,而排版要數秒)
 * - 乾淨的那份**走得到 Chrome**(否則把閘門寫成無條件拋,上面幾條也全綠)
 *
 * 兩者是一對,不是一條加一條。替身一被呼叫就拋,而服務把非 ApiError 收成
 * 通用列印失敗 —— 於是「走到瀏覽器」有一個明確的、不需要真 Chrome 的表現。
 */
const getPrintBrowserMock = jest.fn<() => Promise<never>>();
const dropPrintBrowserMock = jest.fn<() => Promise<void>>();

/*
 * Info: (20260903 - Emily) 工廠裡用箭頭函式間接呼叫,不直接把上面兩個常數放進去:
 * `jest.mock` 會被提升到 import 之前,而工廠在被 mock 的模組**第一次被 require**
 * 時就執行(也就是 import 服務的那一刻)—— 那一刻上面兩個 const 還沒初始化。
 * 這也是 `llm_usage_reporting.test.ts` 的替身只在內層箭頭裡取值的原因。
 */
jest.mock("@/lib/utils/pdf_browser", () => ({
  getPrintBrowser: () => getPrintBrowserMock(),
  dropPrintBrowser: () => dropPrintBrowserMock(),
}));

const CLEAN_MARKDOWN = "## 1.1 組織邊界\n\n本公司採用營運控制法。\n";

const shell = (extra: Record<string, unknown> = {}) => ({
  brand: "iSunFA",
  internalDocument: "內部文件",
  systemReport: "系統產出",
  issuedAt: "2026/09/03",
  footerTitle: "永續揭露",
  footerText: "© 2026 iSunFA",
  ...extra,
});

beforeEach(() => {
  getPrintBrowserMock.mockReset();
  dropPrintBrowserMock.mockReset();
  getPrintBrowserMock.mockRejectedValue(new Error("browser-reached"));
  dropPrintBrowserMock.mockResolvedValue(undefined);
});

describe("PDF 出口:紙面出現主體合規宣告就不出門", () => {
  it("正文裡的宣告被擋,而且擋在開瀏覽器之前", async () => {
    const service = new CarbonReportPdfService();
    const promise = service.generate({
      markdown: `${CLEAN_MARKDOWN}\n本公司符合 IFRS S1 之各項規定。\n`,
      fileName: "report.pdf",
      shell: shell(),
    });

    const caught = await promise.catch((reason: unknown) => reason);
    expect(caught).toBeInstanceOf(ApiError);
    const error = caught as ApiError;
    expect(error.code).toBe(API_ERRORS.VA_FRAMEWORK_COMPLIANCE_CLAIM.code);
    /*
     * Info: (20260903 - Emily) 訊息要指名命中的片語與兩軸:一份 33 節的報告裡
     * 找一句話等於重讀整份,只說「被擋」使用者不知道要改哪一句。
     */
    expect(error.message).toContain("符合IFRS");
    expect(error.message).toContain("axes=符合/IFRS");

    expect(getPrintBrowserMock).not.toHaveBeenCalled();
  });

  it("塞在識別欄位的宣告一樣被擋(那個值不經 markdown)", async () => {
    /**
     * Info: (20260903 - Emily) 驗收條款寫的「手動塞」沒有說塞在哪。
     * `identity` 的 value 經文件外殼的 `.doc-identity` 直接上紙,
     * 只審 markdown 的閘門會被這條路整條繞過。
     */
    const service = new CarbonReportPdfService();
    await expect(
      service.generate({
        markdown: CLEAN_MARKDOWN,
        fileName: "report.pdf",
        shell: shell({
          identity: [{ label: "備註", value: "本公司遵循 TIFRS S2" }],
        }),
      }),
    ).rejects.toMatchObject({
      code: API_ERRORS.VA_FRAMEWORK_COMPLIANCE_CLAIM.code,
    });
    expect(getPrintBrowserMock).not.toHaveBeenCalled();
  });

  it("被印到頁尾的下載檔名也在審的範圍內", async () => {
    /**
     * Info: (20260903 - Emily) 頁尾印的是 `input.title ?? input.fileName` ——
     * 省略 title 時每一頁印的是**檔名**,而檔名由使用者自己命。
     */
    const service = new CarbonReportPdfService();
    await expect(
      service.generate({
        markdown: CLEAN_MARKDOWN,
        fileName: "本公司已達成 IFRS S1 要求.pdf",
        shell: shell(),
      }),
    ).rejects.toMatchObject({
      code: API_ERRORS.VA_FRAMEWORK_COMPLIANCE_CLAIM.code,
    });
    expect(getPrintBrowserMock).not.toHaveBeenCalled();
  });

  it("乾淨的那份走得到瀏覽器(否則「擋掉一切」也會讓上面三條綠)", async () => {
    const service = new CarbonReportPdfService();
    await expect(
      service.generate({
        markdown: CLEAN_MARKDOWN,
        fileName: "report.pdf",
        title: "高興昌 2024 年度溫室氣體報告",
        shell: shell({
          title: "高興昌鋼鐵股份有限公司",
          identity: [{ label: "盤查年度", value: "2024" }],
        }),
      }),
    ).rejects.toMatchObject({
      code: API_ERRORS.IS_PDF_GENERATION_FAILED.code,
    });
    expect(getPrintBrowserMock).toHaveBeenCalledTimes(1);
  });

  it("敘述文件結構的架構對齊聲明不被擋 —— 擋的是主體合規", async () => {
    /**
     * Info: (20260903 - Emily) 這條分界是常數檔頭那張對照表的紙面版本:
     *
     *     「本報告依 IFRS S1/S2 之架構編製」  關於**文件結構**  → 可以
     *     「本公司符合 IFRS S1/S2」          關於**主體**合規  → 不可以
     *
     * 少了這一條,把判準寫成「有 IFRS 就擋」也是綠的 —— 而那會擋掉
     * #6688-C 之後每一份揭露版報告,也就是這個功能本身。
     */
    const service = new CarbonReportPdfService();
    await expect(
      service.generate({
        markdown: `${CLEAN_MARKDOWN}\n本報告依 IFRS S1/S2 之架構編製。\n本報告不構成 IFRS S1/S2 之合規聲明。\n`,
        fileName: "report.pdf",
        shell: shell(),
      }),
    ).rejects.toMatchObject({
      code: API_ERRORS.IS_PDF_GENERATION_FAILED.code,
    });
    expect(getPrintBrowserMock).toHaveBeenCalledTimes(1);
  });
});

describe("#6688-C:聲明行由伺服端從 enum 導出", () => {
  /**
   * Info: (20260904 - Emily) 用戶端送的是 enum,聲明行的字串由服務導出並印在外殼上。
   * `ICarbonReportPdfInput.shell` 的型別排除 `claims`,所以「用戶端塞字串」
   * 這件事由 tsc 擋;本組驗的是**導出之後的行為**。
   */
  it("選了 IFRS 的乾淨報告出得去(條 3 因為外殼補上免責句而滿足)", async () => {
    const service = new CarbonReportPdfService();
    await expect(
      service.generate({
        markdown: CLEAN_MARKDOWN,
        fileName: "report.pdf",
        framework: CarbonDisclosureFrameworkEnum.IFRS_S1_S2,
        shell: shell({ title: "高興昌鋼鐵股份有限公司" }),
      }),
    ).rejects.toMatchObject({
      code: API_ERRORS.IS_PDF_GENERATION_FAILED.code,
    });
    expect(getPrintBrowserMock).toHaveBeenCalledTimes(1);
  });

  it("沒選框架而正文提到 IFRS:提示而不擋(條 2 的已知洞 #2)", async () => {
    /**
     * Info: (20260904 - Emily) 匯入會把客戶原文逐字落地,而客戶自己的報告可能提到 IFRS。
     * 這一條釘住那個判斷:條 2 在 PDF 出口是 WARN 不是 BLOCK。
     * 翻成 BLOCK 就會擋掉每一份提到 IFRS 的匯入報告。
     */
    const service = new CarbonReportPdfService();
    await expect(
      service.generate({
        markdown: `${CLEAN_MARKDOWN}\n本節依 IFRS S2 之氣候相關揭露編排。`,
        fileName: "report.pdf",
        shell: shell(),
      }),
    ).rejects.toMatchObject({
      code: API_ERRORS.IS_PDF_GENERATION_FAILED.code,
    });
    expect(getPrintBrowserMock).toHaveBeenCalledTimes(1);
  });

  it("沒有外殼就沒有印出點,聲明行不進審的文字", async () => {
    /**
     * Info: (20260904 - Emily) `buildCarbonReportHtml` 在 shell 為 undefined 時
     * 整個外殼都不印。若 `shellClaimsOf` 仍回兩句,閘門會審到一段不會被印出來的文字 ——
     * 而條 3 會因此對一份**沒有**對齊聲明的紙面判定「印了對齊卻缺免責」。
     * 這一條釘住那個空回傳。
     */
    const service = new CarbonReportPdfService();
    await expect(
      service.generate({
        markdown: CLEAN_MARKDOWN,
        fileName: "report.pdf",
        framework: CarbonDisclosureFrameworkEnum.IFRS_S1_S2,
      }),
    ).rejects.toMatchObject({
      code: API_ERRORS.IS_PDF_GENERATION_FAILED.code,
    });
    expect(getPrintBrowserMock).toHaveBeenCalledTimes(1);
  });
});
