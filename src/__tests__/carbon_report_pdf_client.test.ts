import { describe, it, expect } from "@jest/globals";
import { ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { isPdfFontUnavailableError } from "@/lib/utils/carbon_report_pdf_client";

/**
 * Info: (20260811 - Luphia) 釘住「缺字型認得出來」這條分類(PR review 第 4 點)。
 *
 * 伺服端把 IS_PDF_FONT_UNAVAILABLE 與 IS_PDF_GENERATION_FAILED 分成兩碼,
 * 因為兩者的處置相反:前者重試一萬次都一樣(要由維運裝字型),後者值得重試。
 * 兩者的 HTTP 狀態都是 500,所以分類只能讀 `data.errorCode` ——
 * 拿 status 判會把兩者混成一句話,而那正是這支守衛要防的事。
 */
const buildFailure = (errorCode: string) =>
  new RequestApiError("Failed", 500, {
    success: false,
    errorCode,
    payload: null,
  });

describe("isPdfFontUnavailableError", () => {
  it("should recognise the font-unavailable failure", () => {
    expect(
      isPdfFontUnavailableError(
        buildFailure(API_ERRORS.IS_PDF_FONT_UNAVAILABLE.code),
      ),
    ).toBe(true);
  });

  /**
   * Info: (20260811 - Luphia) 通用列印失敗不得被誤認 ——
   * 誤認的後果是叫使用者去裝字型,而真正的成因是 Chrome 排版故障(重試有意義)。
   */
  it("should not claim a generic print failure is a font problem", () => {
    expect(
      isPdfFontUnavailableError(
        buildFailure(API_ERRORS.IS_PDF_GENERATION_FAILED.code),
      ),
    ).toBe(false);
  });

  it("should ignore errors that are not request failures", () => {
    expect(isPdfFontUnavailableError(new Error("boom"))).toBe(false);
    expect(isPdfFontUnavailableError(undefined)).toBe(false);
  });
});
