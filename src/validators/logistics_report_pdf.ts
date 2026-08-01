// Info: (20260731 - Tzuhan) 運輸報告 PDF 產出的請求驗證(#issue 07:向量列印取代前端光柵化)
// Info: (20260731 - Tzuhan) 這個端點會把 payload 內的字串放進交給 Chrome 的 HTML,
// Info: (20260731 - Tzuhan) 因此長度與格式必須在進 Service 前就收斂:內容逸出在 builder,量的限制在此。

import { z } from "zod";
import {
  LOGISTICS_PDF_MAP_DATA_URL_PATTERN,
  LOGISTICS_PDF_MAX_REPORTS_PER_REQUEST,
} from "@/constants/logistics_pdf";

// Info: (20260731 - Tzuhan) 地點名稱與標籤的長度上限:超長字串只會撐爛版面,且是探測伺服器的常見手法
/**
 * Info: (20260801 - Luphia) 截圖尺寸的合理上界(CSS px)。純粹是溢位護欄:
 * 真實畫布不會接近這個數,但沒有上界時一個荒謬的大數會讓紙面尺寸與比例尺長度失去意義。
 */
const CAPTURE_PX_MAX = 20_000;

const LABEL_MAX = 200;

const LegSchema = z.object({
  mode: z.enum(["LAND", "SEA", "AIR"]),
  fromName: z.string().max(LABEL_MAX),
  toName: z.string().max(LABEL_MAX),
  fromLat: z.number().min(-90).max(90).optional(),
  fromLng: z.number().min(-180).max(180).optional(),
  toLat: z.number().min(-90).max(90).optional(),
  toLng: z.number().min(-180).max(180).optional(),
  // Info: (20260731 - Tzuhan) 數值一律以字串傳遞並照抄輸出:伺服端不重算,避免出現與前端不同的第三套數字
  distanceKm: z.number().nonnegative().optional(),
  co2eKg: z.string().max(32).optional(),
  isFallback: z.boolean().optional(),
  // Info: (20260731 - Tzuhan) 逐段路徑圖:只有全程圖時接駁段看不到路徑,報告不成證據
  mapImageDataUrl: z
    .string()
    .regex(LOGISTICS_PDF_MAP_DATA_URL_PATTERN)
    .optional(),
  // Info: (20260731 - Tzuhan) 每像素公尺數(比例尺用);非正數即不畫比例尺,不猜
  metersPerPixel: z.number().positive().optional(),
  /**
   * Info: (20260801 - Luphia) 截圖畫布的 CSS 尺寸。上界取 20000:CSS 像素在任何真實畫布上
   * 都遠低於此,設上界是為了擋下讓紙面尺寸計算溢位的荒謬值,而非限制正常使用。
   */
  captureWidthPx: z.number().positive().max(CAPTURE_PX_MAX).optional(),
  captureHeightPx: z.number().positive().max(CAPTURE_PX_MAX).optional(),
  /**
   * Info: (20260801 - Luphia) 截圖視野的南北緯度界(Mercator 比例尺護欄用)。
   * **範圍為 -90~90 而非 positive** —— 赤道為 0、南半球為負,
   * 用 positive() 會把南半球與赤道附近的合法值擋成錯誤。
   */
  captureLatSouthDeg: z.number().min(-90).max(90).optional(),
  captureLatNorthDeg: z.number().min(-90).max(90).optional(),
});

const ReportSchema = z.object({
  planCode: z.string().min(1).max(32),
  fileName: z.string().min(1).max(160),
  routeLabel: z.string().max(LABEL_MAX),
  planLabel: z.string().max(LABEL_MAX),
  originLabel: z.string().max(LABEL_MAX),
  destLabel: z.string().max(LABEL_MAX),
  weightKg: z.string().max(32),
  planTotalCo2e: z.string().max(32).optional(),
  legs: z.array(LegSchema).min(1).max(20),
  // Info: (20260731 - Tzuhan) 只收 JPEG/PNG 的 data URL:此字串會成為 img src,協定必須先擋
  mapImageDataUrl: z
    .string()
    .regex(LOGISTICS_PDF_MAP_DATA_URL_PATTERN)
    .optional(),
  metersPerPixel: z.number().positive().optional(),
  /**
   * Info: (20260801 - Luphia) 截圖畫布的 CSS 尺寸。上界取 20000:CSS 像素在任何真實畫布上
   * 都遠低於此,設上界是為了擋下讓紙面尺寸計算溢位的荒謬值,而非限制正常使用。
   */
  captureWidthPx: z.number().positive().max(CAPTURE_PX_MAX).optional(),
  captureHeightPx: z.number().positive().max(CAPTURE_PX_MAX).optional(),
  /**
   * Info: (20260801 - Luphia) 截圖視野的南北緯度界(Mercator 比例尺護欄用)。
   * **範圍為 -90~90 而非 positive** —— 赤道為 0、南半球為負,
   * 用 positive() 會把南半球與赤道附近的合法值擋成錯誤。
   */
  captureLatSouthDeg: z.number().min(-90).max(90).optional(),
  captureLatNorthDeg: z.number().min(-90).max(90).optional(),
});

export const LogisticsReportPdfRequestSchema = z.object({
  reports: z
    .array(ReportSchema)
    .min(1)
    .max(LOGISTICS_PDF_MAX_REPORTS_PER_REQUEST),
  exportId: z.string().max(64).optional(),
});

export type ILogisticsReportPdfRequest = z.infer<
  typeof LogisticsReportPdfRequestSchema
>;
export type ILogisticsReportPdfItem = z.infer<typeof ReportSchema>;
