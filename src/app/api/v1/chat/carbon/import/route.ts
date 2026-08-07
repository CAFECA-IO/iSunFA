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
import { describeError } from "@/lib/utils/error_message";
import { ReportImportService } from "@/services/report_import.service";
import {
  CARBON_CHAT_MAX_ATTACHMENT_BYTES,
  CarbonReportImportModeEnum,
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

// Info: (20260730 - Tzuhan) 合法模式白名單(未帶或不合法一律視為逐字匯入)
const IMPORT_MODES: readonly CarbonReportImportModeEnum[] = Object.values(
  CarbonReportImportModeEnum,
);

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
    // Info: (20260730 - Tzuhan) 三種模式:逐字匯入 / 草稿補齊 / 頁碼索引(兩階段第一階段);
    // Info: (20260730 - Tzuhan) 值取自 enum(API 契約兩端共用),不在此以字面值比對
    const modeRaw = formData.get("mode");
    const mode = IMPORT_MODES.includes(modeRaw as CarbonReportImportModeEnum)
      ? (modeRaw as CarbonReportImportModeEnum)
      : CarbonReportImportModeEnum.VERBATIM;
    /**
     * Info: (20260805 - Tzuhan) sectionIds 白名單解析。DRAFT 必填;
     * VERBATIM 選填 —— 前端把節數多的章切成數次呼叫,讓單次請求跑得完
     * (閘道 60 秒閒置逾時,而等 LLM 期間整段都算閒置)。省略即整章。
     */
    const parseSectionIds = (
      raw: FormDataEntryValue | null,
    ): string[] | null => {
      if (typeof raw !== "string") return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (
          !Array.isArray(parsed) ||
          parsed.length === 0 ||
          parsed.length > CARBON_REPORT_OUTLINE.length ||
          !parsed.every((id) => typeof id === "string")
        ) {
          return null;
        }
        const validIds = new Set(
          CARBON_REPORT_OUTLINE.map((section) => section.id),
        );
        return parsed.every((id) => validIds.has(id))
          ? (parsed as string[])
          : null;
      } catch {
        return null;
      }
    };
    const sectionIdsRaw = formData.get("sectionIds");
    let draftSectionIds: string[] = [];
    let verbatimSectionIds: string[] | undefined;
    if (mode === CarbonReportImportModeEnum.DRAFT) {
      const parsed = parseSectionIds(sectionIdsRaw);
      if (!parsed) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
      draftSectionIds = parsed;
    } else if (sectionIdsRaw !== null) {
      // Info: (20260805 - Tzuhan) 有帶就必須合法:帶了壞值而靜默忽略,等於整章重跑卻沒人知道
      const parsed = parseSectionIds(sectionIdsRaw);
      if (!parsed) return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
      verbatimSectionIds = parsed;
    }
    // Info: (20260730 - Tzuhan) 頁碼範圍(兩階段第二階段):由前端依索引算出,伺服端切片後才送 LLM。
    // Info: (20260730 - Tzuhan) 僅為降低輸入量的最佳化——範圍無效或切片過短時 slicePagesForRange 會退回全文。
    const parsePage = (value: FormDataEntryValue | null): number | null => {
      if (typeof value !== "string" || value.length === 0) return null;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
    };
    const fromPage = parsePage(formData.get("fromPage"));
    const toPage = parsePage(formData.get("toPage"));

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

    // Info: (20260730 - Tzuhan) 來源裁決(文字層優先 / 視覺降級 / 拒收)為業務判斷,收在 Service;
    // Info: (20260730 - Tzuhan) 本層只把檔案 metadata 與 buffer 交出去,並把 null 轉成明確的拒收回應
    const service = new ReportImportService();
    const source = await service.resolveSource({
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      buffer,
      isTextMimeType: TEXT_MIME_TYPES.includes(file.type),
    });
    if (!source) {
      return jsonFail(API_ERRORS.VA_FILE_TOO_LARGE);
    }

    // Info: (20260730 - Tzuhan) 兩階段第一階段:只問頁碼,輸出極小;失敗時服務層回空索引,前端據此退回送全文
    if (mode === CarbonReportImportModeEnum.INDEX) {
      const index = await service.buildSectionPageIndex(
        source,
        typeof language === "string" ? language : undefined,
      );
      return jsonOk({
        index: Array.from(index.entries()).map(([paragraphId, startPage]) => ({
          paragraphId,
          startPage,
        })),
      });
    }

    // Info: (20260730 - Tzuhan) 兩階段第二階段:依頁碼範圍切片,把輸入從整份文件縮成該章對應頁。
    // Info: (20260730 - Tzuhan) 實測 64 頁報告一次匯入原本耗掉約 44 萬 input token,後段章節因額度耗盡連請求都發不出去。
    const scopedSource =
      fromPage !== null && toPage !== null
        ? service.scopeSourceToPages(source, fromPage, toPage)
        : source;

    // Info: (20260727 - Tzuhan) #57 草稿補齊:回傳形狀與匯入一致(unmapped/activities 恆空),前端共用合併邏輯
    if (mode === CarbonReportImportModeEnum.DRAFT) {
      const segments = await service.draftMissingSections(
        scopedSource,
        draftSectionIds,
        typeof language === "string" ? language : undefined,
      );
      return jsonOk({ segments, unmapped: [], activities: [] });
    }

    const result = await service.importReport(
      scopedSource,
      typeof language === "string" ? language : undefined,
      { chapterId, extractActivities, sectionIds: verbatimSectionIds },
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
      `[API] /chat/carbon/import POST error: ${describeError(error)}`,
    );
    return jsonFail(API_ERRORS.IS_REPORT_IMPORT_FAILED);
  }
}
