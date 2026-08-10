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
});

export type ICarbonReportPdfRequest = z.infer<
  typeof CarbonReportPdfRequestSchema
>;
