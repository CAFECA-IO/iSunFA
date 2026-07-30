// Info: (20260716 - Tzuhan) 整份報告匯入端點(#56):multipart 收檔 → 內容驗證 → LLM 切段對應大綱 → 匯入預覽資料
// Info: (20260716 - Tzuhan) 純端口:授權 → 限流(LLM bucket,昂貴呼叫) → 檔案裁決 → Service;
// Info: (20260716 - Tzuhan) 不寫入任何資料 — 匯入落地由前端預覽卡確認後走既有報告保存路徑

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { matchesDeclaredMimeType } from "@/lib/file_signature";
import {
  ReportImportService,
  type IReportImportSource,
} from "@/services/report_import.service";
import { assessPdfTextLayer, extractPdfTextLayer } from "@/lib/pdf_text_layer";
import { PdfTextLayerDecisionEnum } from "@/constants/pdf_text_layer";
import {
  CARBON_CHAT_MAX_ATTACHMENT_BYTES,
  CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES,
} from "@/constants/carbon_chatbot";
import {
  CARBON_REPORT_CHAPTERS,
  CARBON_REPORT_OUTLINE,
} from "@/constants/carbon_report_outline";

// Info: (20260716 - Tzuhan) 匯入格式白名單:pdf(inline 萃取)與 md/純文字(直讀);
// Info: (20260716 - Tzuhan) docx 需先轉換管線,Gemini inline 不支援 — 列於 #56 後續,不在本清單
const IMPORT_ACCEPTED_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "text/markdown",
  "text/plain",
];

const TEXT_MIME_TYPES: readonly string[] = ["text/markdown", "text/plain"];

/**
 * Info: (20260730 - Tzuhan) 決定這份檔案要以什麼形態進 LLM。
 * 回傳 null 代表兩條路都不通(文字層不可信、原檔又超過視覺模型上限),呼叫端須明確拒收。
 */
async function resolveImportSource(
  file: File,
  buffer: Buffer,
): Promise<IReportImportSource | null> {
  const base = { name: file.name, mimeType: file.type };

  if (TEXT_MIME_TYPES.includes(file.type)) {
    return { ...base, data: buffer.toString("utf-8"), isText: true };
  }

  const canUseVision = file.size <= CARBON_ATTACHMENT_EXTRACTION_MAX_BYTES;
  const extracted = await extractPdfTextLayer(buffer);
  const assessment = extracted
    ? assessPdfTextLayer(extracted.text, extracted.pages, canUseVision)
    : null;

  logger.info("report import source decision", {
    fileName: file.name,
    fileSize: file.size,
    canUseVision,
    decision: assessment?.decision ?? PdfTextLayerDecisionEnum.VISION,
    reason: assessment?.reason ?? "text_layer_unavailable",
    charsPerPage: assessment?.quality.charsPerPage ?? 0,
    numericUndecodedChars: assessment?.quality.numericUndecodedChars ?? 0,
  });

  if (extracted && assessment?.decision === PdfTextLayerDecisionEnum.TEXT) {
    return { ...base, data: extracted.text, isText: true };
  }
  if (canUseVision) {
    return { ...base, data: buffer.toString("base64"), isText: false };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260716 - Tzuhan) LLM bucket:匯入為昂貴推論呼叫,與 chat/draft 共用額度
    const limited = enforceCarbonRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.LLM,
    );
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get("file");
    const language = formData.get("language");
    // Info: (20260716 - Tzuhan) 逐章模式參數(前端迴圈):chapterId 需在合法章節清單內
    const chapterIdRaw = formData.get("chapterId");
    const chapterId =
      typeof chapterIdRaw === "string" && chapterIdRaw.length > 0
        ? chapterIdRaw
        : undefined;
    if (
      chapterId &&
      !CARBON_REPORT_CHAPTERS.some((chapter) => chapter.id === chapterId)
    ) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }
    const extractActivities = formData.get("extractActivities") !== "false";
    // Info: (20260727 - Tzuhan) #57 草稿補齊模式:mode=draft + sectionIds(JSON 陣列,白名單複驗於此與服務層)
    const mode = formData.get("mode") === "draft" ? "draft" : "verbatim";
    let draftSectionIds: string[] = [];
    if (mode === "draft") {
      const sectionIdsRaw = formData.get("sectionIds");
      if (typeof sectionIdsRaw !== "string") {
        return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
      }
      try {
        const parsed: unknown = JSON.parse(sectionIdsRaw);
        if (
          !Array.isArray(parsed) ||
          parsed.length === 0 ||
          parsed.length > CARBON_REPORT_OUTLINE.length ||
          !parsed.every((id) => typeof id === "string")
        ) {
          return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
        }
        const validIds = new Set(
          CARBON_REPORT_OUTLINE.map((section) => section.id),
        );
        if (!parsed.every((id) => validIds.has(id))) {
          return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
        }
        draftSectionIds = parsed;
      } catch {
        return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
      }
    }
    if (!(file instanceof File)) {
      return jsonFail(API_ERRORS.VA_NO_FILE_UPLOADED);
    }

    if (!IMPORT_ACCEPTED_MIME_TYPES.includes(file.type)) {
      return jsonFail(API_ERRORS.VA_INVALID_DOCUMENT_TYPE);
    }
    if (file.size > CARBON_CHAT_MAX_ATTACHMENT_BYTES) {
      return jsonFail(API_ERRORS.VA_FILE_TOO_LARGE);
    }
    // Info: (20260716 - Tzuhan) magic bytes 複驗(#6517 同一防線):宣告與內容不符即拒
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesDeclaredMimeType(buffer, file.type)) {
      return jsonFail(API_ERRORS.IS_ATTACHMENT_TYPE_MISMATCH);
    }

    // Info: (20260730 - Tzuhan) PDF 改為「文字層優先」:原本一律走 Gemini inlineData,
    // Info: (20260730 - Tzuhan) 導致 >14MB 的報告直接拒收且無降級路徑(實測台積 30.3MB、三星 17.4MB 皆進不來)。
    // Info: (20260730 - Tzuhan) 文字層乾淨即送純文字(不受 inlineData 上限、token 成本大降);
    // Info: (20260730 - Tzuhan) 文字層不可信(尤其數字被解成替換字元)才退回原檔走視覺模型;兩條路都不通才拒收。
    const source = await resolveImportSource(file, buffer);
    if (!source) {
      return jsonFail(API_ERRORS.VA_FILE_TOO_LARGE);
    }

    const service = new ReportImportService();

    // Info: (20260727 - Tzuhan) #57 草稿補齊:回傳形狀與匯入一致(unmapped/activities 恆空),前端共用合併邏輯
    if (mode === "draft") {
      const segments = await service.draftMissingSections(
        source,
        draftSectionIds,
        typeof language === "string" ? language : undefined,
      );
      return jsonOk({ segments, unmapped: [], activities: [] });
    }

    const result = await service.importReport(
      source,
      typeof language === "string" ? language : undefined,
      { chapterId, extractActivities },
    );

    return jsonOk(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(
      `[API] /chat/carbon/import POST error: ${JSON.stringify(error)}`,
    );
    return jsonFail(API_ERRORS.IS_REPORT_IMPORT_FAILED);
  }
}
