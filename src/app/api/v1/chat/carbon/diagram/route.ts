// Info: (20260730 - Tzuhan) 段落結構圖生成端點(純端口:授權 → 限流 → 驗證 → Service → 組圖 → 回傳)
// Info: (20260730 - Tzuhan) 不寫入任何資料:圖表區塊回給前端,由使用者確認後走既有的報告保存路徑。
// Info: (20260730 - Tzuhan) 分工:LLM 只回節點與父子關係(Service),mermaid 語法與原文回溯驗證一律在 builder。

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";
import { describeError } from "@/lib/utils/error_message";
import { CarbonDiagramRequestSchema } from "@/validators";
import { CarbonDiagramService } from "@/services/carbon_diagram.service";
import {
  buildCarbonDiagramBlock,
  findDiagramTemplateForParagraph,
  validateDiagramNodes,
} from "@/lib/carbon_report_diagram.builder";

export async function POST(request: NextRequest) {
  const sessionUser = await getIdentityFromDeWT(
    request.headers.get("Authorization"),
  );
  if (!sessionUser) {
    return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
  }

  // Info: (20260730 - Tzuhan) LLM bucket:與 chat/draft/import 共用額度(同為推論呼叫)
  const limited = enforceCarbonRateLimit(
    sessionUser.address,
    RateLimitBucketEnum.LLM,
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail(API_ERRORS.VL_INVALID_JSON);
  }

  const parsed = CarbonDiagramRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
  }
  const { paragraphId, content, language } = parsed.data;

  // Info: (20260730 - Tzuhan) 要畫哪張圖由段落 id 決定,不由請求端指定 —— 前端無從要求非白名單的圖
  const templateId = findDiagramTemplateForParagraph(paragraphId);
  if (!templateId) {
    return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
  }

  try {
    const service = new CarbonDiagramService();
    const nodes = await service.extractDiagramNodes(
      templateId,
      content,
      language,
    );
    const validation = validateDiagramNodes(templateId, nodes, content);
    if (!validation.isValid) {
      // Info: (20260730 - Tzuhan) 記錄被拒的節點文字:模型在哪裡越界必須留下痕跡,否則無從調整提示詞
      logger.info("carbon diagram rejected", {
        paragraphId,
        templateId,
        reason: validation.reason,
        offendingLabels: validation.offendingLabels,
        nodeCount: nodes.length,
      });
    }

    return jsonOk({
      templateId,
      // Info: (20260730 - Tzuhan) 驗證未過時 block 內為說明文字而非圖,前端照樣顯示(不靜默少一張圖)
      block: buildCarbonDiagramBlock(templateId, nodes, content),
      isDrawn: validation.isValid,
      rejectReason: validation.reason ?? null,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonFail({
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }
    logger.error(
      `[API] /chat/carbon/diagram POST error: ${describeError(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
