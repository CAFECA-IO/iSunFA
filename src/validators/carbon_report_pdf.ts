import { z } from "zod";
import { CARBON_PDF_MAX_MARKDOWN_BYTES } from "@/constants/carbon_pdf";

/**
 * Info: (20260810 - Emily) 碳盤查報告伺服端列印的請求結構。
 *
 * 量的限制在此,內容逸出在 builder(沿用 logistics_report_pdf 的分工)。
 * markdown 以**位元組**而非字元數設上限:中文一個字三個位元組,
 * 用字元數會讓中文報告的實際載荷是英文報告的三倍而限制看起來一樣。
 */
const markdownByteLength = (value: string): number =>
  Buffer.byteLength(value, "utf8");

/**
 * Info: (20260817 - Emily) 查證識別列數的 schema 上限（PR review B1）。
 *
 * 它**不是**「有幾欄」—— 那由 `CARBON_REPORT_IDENTITY_FIELDS` 決定（目前 4 欄）。
 * 這個值只負責擋住失控的輸入,所以必須留餘裕給「下一次加一欄」。
 *
 * 匯出是為了讓測試讀它而不是自己寫一份 —— A2 那條測試就是因為自己寫了一份
 * `const SCHEMA_MAX_NODES = 150`,於是它不可能為了它存在的理由而失敗。
 *
 * 這一項與 A2 的失效模式不同,所以不是 blocker:寫太小的話 Zod 會硬性失敗（400），
 * 現場看得到,而不是像 `identity` 沒宣告那次被 `z.object` 靜靜 strip 掉。
 */
export const CARBON_REPORT_IDENTITY_MAX_ROWS = 8;

/**
 * Info: (20260811 - Emily) 文件外殼的文案由用戶端帶上來。
 *
 * 那組字是 i18n(`admin_mission_board.pdf_editor.*`),而伺服端沒有使用者的語言與地區設定;
 * 在伺服端另寫一份等於同一份文件的頁首有兩處來源,遲早一邊改一邊沒改。
 * 長度上限只為擋住異常載荷 —— 內容逸出在 builder(`escapeHtml`)。
 * logo 走 data URL:列印時 sealNetwork 會擋掉所有非 data/about/blob 的請求。
 */
const CarbonReportShellSchema = z.object({
  brand: z.string().min(1).max(80),
  internalDocument: z.string().min(1).max(80),
  systemReport: z.string().min(1).max(80),
  issuedAt: z.string().min(1).max(40),
  footerTitle: z.string().min(1).max(120),
  footerText: z.string().min(1).max(300),
  title: z.string().max(200).optional(),
  tocTitle: z.string().max(80).optional(),
  /**
   * Info: (20260817 - Emily) 查證識別四欄。
   *
   * 上限寫 `CARBON_REPORT_IDENTITY_MAX_ROWS`（8）而不是 4：欄位數由
   * `CARBON_REPORT_IDENTITY_FIELDS` 決定，這裡只負責擋住失控的輸入。
   * 寫死 4 的話，下一次加一欄會在這裡靜靜地排掉 ——
   * 而那正是這一條一開始出問題的方式。
   */
  identity: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        value: z.string().max(120),
      }),
    )
    .max(CARBON_REPORT_IDENTITY_MAX_ROWS)
    .optional(),
});

export const CarbonReportPdfRequestSchema = z.object({
  markdown: z
    .string()
    .min(1)
    .refine(
      (value) => markdownByteLength(value) <= CARBON_PDF_MAX_MARKDOWN_BYTES,
      { message: "markdown exceeds the size limit" },
    ),
  fileName: z.string().min(1).max(160),
  title: z.string().max(200).optional(),
  shell: CarbonReportShellSchema.optional(),
});

export type ICarbonReportPdfRequest = z.infer<
  typeof CarbonReportPdfRequestSchema
>;
