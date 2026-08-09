// Info: (20260730 - Tzuhan) 段落結構圖生成端點(純端口:授權 → 限流 → 驗證 → Service → 組圖 → 回傳)
// Info: (20260730 - Tzuhan) 不寫入任何資料:圖表區塊回給前端,由使用者確認後走既有的報告保存路徑。
// Info: (20260730 - Tzuhan) 分工:LLM 只回節點與父子關係(Service),mermaid 語法與原文回溯驗證一律在 builder。
// Info: (20260806 - Tzuhan) LLM 那一段改走保活式串流(見下方註解與 @/lib/utils/streaming_response)。

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { ok, fail, jsonFail } from "@/lib/utils/response";
import { streamingJson } from "@/lib/utils/streaming_response";
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

  /**
   * Info: (20260806 - Tzuhan) 從這裡開始改成保活式串流回應。
   *
   * `LLM_DIAGRAM_TIMEOUT_MS` 是 90 秒(最長那張圖在 45 秒版本以 8 毫秒之差逾時,不能調小),
   * 而閘道的 `proxy_read_timeout` 預設 60 秒且是**閒置**逾時 ——
   * 等 LLM 期間一個位元組都沒送,整段都算閒置,使用者只看到 504,
   * 而伺服端其實跑完了、90 秒的推理白燒(這個端點不寫入任何資料,結果只存在於回應裡),
   * 前端接著還會退避重試一次,再燒一次。
   *
   * 拉長閘道逾時已被否決(允許連線長時間空掛是安全隱患);
   * 心跳的作法相反 —— 連線一直是活的,閘道的判斷維持原樣,nginx 一行都不動。
   *
   * 授權、限流、Schema 驗證刻意留在串流**之前**:那些失敗要落在正確的狀態碼上
   * (401/429/400),而它們都在 LLM 之前,天然做得到。
   * 串流開始後狀態碼鎖 200,只有 LLM 這一段的失敗改由信封的 `success`/`errorCode` 表達。
   */
  return streamingJson(
    async () => {
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
            // Info: (20260730 - Tzuhan) ILogFields 不接受 undefined,缺值一律轉 null(等同「本次無此資訊」)
            reason: validation.reason ?? null,
            offendingLabels: validation.offendingLabels ?? [],
            nodeCount: nodes.length,
          });
        }

        return ok({
          templateId,
          // Info: (20260730 - Tzuhan) 驗證未過時 block 內為說明文字而非圖,前端照樣顯示(不靜默少一張圖)
          block: buildCarbonDiagramBlock(templateId, nodes, content),
          isDrawn: validation.isValid,
          rejectReason: validation.reason ?? null,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          return fail({
            code: error.code,
            message: error.message,
            status: error.status,
          });
        }
        logger.error(
          `[API] /chat/carbon/diagram POST error: ${describeError(error)}`,
        );
        return fail(API_ERRORS.IS_UNKNOWN);
      }
    },
    (error) => {
      // Info: (20260806 - Tzuhan) 上面已把錯誤都轉成信封,走到這裡代表有漏 —— 記下來,不靜默斷線
      logger.error(
        `[API] /chat/carbon/diagram streaming error: ${describeError(error)}`,
      );
      return fail(API_ERRORS.IS_UNKNOWN);
    },
  );
}
