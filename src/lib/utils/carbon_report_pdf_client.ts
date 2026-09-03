import { request, ApiError as RequestApiError } from "@/lib/utils/request";
import type { IApiResponse } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { base64ToBytes } from "@/lib/utils/logistics_report_client";

/**
 * Info: (20260810 - Emily) 向伺服端要一份向量列印的碳盤查報告
 * (data/issue_drafts/inventory_table_import/17)。
 *
 * base64 包在 JSON 而非直接回二進位:與 logistics 的 report_pdf 同一種形狀,
 * 讓兩條列印路徑的用戶端處理方式一致(共用 base64ToBytes)。
 */
export const CARBON_PDF_API_PATH = "/api/v1/carbon/report_pdf";

/**
 * Info: (20260812 - Emily) `tocFilled` / `tocMissing` 必須一路帶到用戶端。
 *
 * 伺服端算出來、route 也用 `jsonOk({ file })` 全帶回來了,但這裡的兩個 interface
 * 原本沒有這兩個欄位 —— 於是它們在解析時被靜默丟掉,呼叫端拿不到。
 * 而那正是它們存在的理由:文字層抽不出來時(`extractPdfTextLayer` 回 null,
 * ADR 014 記載的 @napi-rs/canvas SIGBUS 至今未定案)整份目錄會沒有頁碼,
 * 而使用者拿到的是一份**看起來完整**的查證文件。
 *
 * DTO 少一個欄位不會有型別錯誤也不會有測試紅燈,只會讓資料在邊界上消失 ——
 * 所以伺服端每加一個降級訊號,這裡就要跟著加。
 */
export interface ICarbonPdfResult {
  blob: Blob;
  sizeBytes: number;
  landscapeTables: number;
  chartsRendered: number;
  chartsFailed: number;
  tocFilled: number;
  tocMissing: number;
}

interface ICarbonPdfPayload {
  file: {
    fileName: string;
    contentBase64: string;
    sizeBytes: number;
    landscapeTables: number;
    chartsRendered: number;
    chartsFailed: number;
    /*
     * Info: (20260812 - Emily) 這兩個是**線上格式**,所以是選填:
     * 部署過程中舊版伺服端不會回這兩個欄位。而 `ICarbonPdfResult` 是本模組
     * 對呼叫端的保證,那裡不能選填 —— 否則每個呼叫端都要各自處理 undefined。
     * 邊界上補一次 0,語意正是「沒有缺」。
     */
    tocFilled?: number;
    tocMissing?: number;
  };
}

/**
 * Info: (20260811 - Emily) 下載的 PDF 要有預覽上那組頁首／頁尾,文案由這裡帶上去 ——
 * 它們是 i18n,伺服端沒有使用者的語言設定(見 validators/carbon_report_pdf 的註解)。
 */
export interface ICarbonPdfShell {
  brand: string;
  internalDocument: string;
  systemReport: string;
  issuedAt: string;
  footerTitle: string;
  footerText: string;
  title?: string;
  tocTitle?: string;
  /**
   * Info: (20260817 - Emily) 查證識別四欄
   * (`data/issue_drafts/open/24_report_identity_fields.md`)。
   *
   * 這一行本來就該在這裡。沒有它的後果不是型別錯誤而已：
   * `pdf_editor` 有傳 `identity`，但伺服端的 Zod schema 沒有這一項，
   * 而 `z.object` 預設會**默默剔掉未知欄位** ——
   * 於是填寫面板、工具列徽記、HTML 渲染都做了，
   * 而四欄從來沒有印在紙上。修正端≠生效端，本週第五次。
   */
  identity?: ReadonlyArray<{ label: string; value: string }>;
}

export const requestCarbonReportPdf = async (params: {
  markdown: string;
  fileName: string;
  title?: string;
  shell?: ICarbonPdfShell;
}): Promise<ICarbonPdfResult> => {
  /*
   * Info: (20260810 - Emily) request() 回的是整個信封而不是 payload,
   * body 要自己 JSON.stringify —— 它只負責帶上 Authorization 與 Content-Type。
   */
  const envelope = await request<IApiResponse<ICarbonPdfPayload>>(
    CARBON_PDF_API_PATH,
    { method: "POST", body: JSON.stringify(params) },
  );
  const file = envelope?.payload?.file;
  if (!file?.contentBase64) {
    throw new Error("carbon report pdf response missing payload");
  }
  return {
    blob: new Blob([base64ToBytes(file.contentBase64)], {
      type: "application/pdf",
    }),
    sizeBytes: file.sizeBytes,
    landscapeTables: file.landscapeTables,
    chartsRendered: file.chartsRendered,
    chartsFailed: file.chartsFailed,
    /*
     * Info: (20260812 - Emily) 舊的伺服端不會有這兩個欄位,補 0 而不是 undefined:
     * 呼叫端只做 `> 0` 判斷,0 的語意正是「沒有缺」——
     * 這樣舊伺服端 + 新用戶端不會跳出一個沒有根據的警告。
     */
    tocFilled: file.tocFilled ?? 0,
    tocMissing: file.tocMissing ?? 0,
  };
};

/**
 * Info: (20260811 - Luphia) 缺中文字型的失敗要能被單獨認出來(PR review 第 4 點)。
 *
 * service 花了一整支 pdf_font_guard 把這個成因從通用列印失敗裡分出來,
 * 理由是兩者的處置相反:字型缺失重試一萬次都一樣,唯一的解法是由維運安裝字型;
 * 列印故障值得重試。而前端的 catch 原本把兩者收成同一句「下載失敗」——
 * 那條分類到了使用者眼前就消失了,而 pdf_editor 自己的註解寫著
 * 「空白產出要說得出是空白 —— 與『下載失敗』共用一句話等於沒說」。
 *
 * 讀 `data.errorCode` 而不是 HTTP 狀態:兩者都是 500,狀態碼分不出來。
 * 型別守衛的形狀沿用 use_carbon_chat.helpers 的 isQuotaApiError / isTimeoutApiError。
 */
export const isPdfFontUnavailableError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.IS_PDF_FONT_UNAVAILABLE.code;
};

/**
 * Info: (20260903 - Emily) 紙面合規宣告被擋下的失敗要能被單獨認出來(#6688-B)。
 *
 * 與缺字型那條同一個判準、同一個形狀:兩者的**處置相反**。字型缺失要維運安裝,
 * 列印故障值得重試,而這一條是**內容紅線** —— 重試一萬次都一樣,
 * 唯一的解法是把那句主體合規宣告從報告裡拿掉。共用一句「下載失敗」等於沒說,
 * 而使用者會合理地以為是系統壞了,再按幾次。
 *
 * 讀 `data.errorCode`:這條回 422,與其他驗證錯誤同一個狀態碼,狀態分不出來。
 */
export const isFrameworkComplianceClaimError = (error: unknown): boolean => {
  if (!(error instanceof RequestApiError)) return false;
  const data = error.data as { errorCode?: string } | undefined;
  return data?.errorCode === API_ERRORS.VA_FRAMEWORK_COMPLIANCE_CLAIM.code;
};

/** Info: (20260810 - Emily) 觸發瀏覽器下載;URL 用完即撤,否則整份 PDF 會留在記憶體 */
export const saveBlobAs = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
