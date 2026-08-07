// Info: (20260805 - Tzuhan) 匯入摘要訊息端點(純端口:授權 → 限流 → 驗證 → 組文案 → 入庫並推播)
//
// Info: (20260805 - Tzuhan) 為什麼需要這條路:匯入原本**全程不產生任何聊天訊息** ——
// Info: (20260805 - Tzuhan) 一份 64 頁的報告落地 33 個段落,對話裡卻只剩招呼語。
// Info: (20260805 - Tzuhan) 段落層的 origin 會被編輯抹掉,報告層的 importedFrom 只有檔名與時間;
// Info: (20260805 - Tzuhan) 「當時發生了什麼」需要一則按時序排在對話裡、且**能撐過重載**的記錄。
//
// Info: (20260805 - Tzuhan) 不呼叫 LLM,故走 SAVE bucket 而非 LLM bucket ——
// Info: (20260805 - Tzuhan) 把它算進 LLM 額度會讓匯入本來就吃緊的額度再少一格。

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { describeError } from "@/lib/utils/error_message";
import { CarbonImportNoticeSchema } from "@/validators";
import {
  buildImportSummaryNotice,
  CARBON_CHAT_PURPOSE,
  isCarbonChatChannelOwnedBy,
} from "@/constants/carbon_chatbot";
import { chatroomService } from "@/services/chatroom.service";

export async function POST(request: NextRequest) {
  const sessionUser = await getIdentityFromDeWT(
    request.headers.get("Authorization"),
  );
  if (!sessionUser) {
    return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
  }

  const limited = enforceCarbonRateLimit(
    sessionUser.address,
    RateLimitBucketEnum.SAVE,
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonFail(API_ERRORS.VL_INVALID_JSON);
  }

  const parsed = CarbonImportNoticeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
  }
  const { channel, recipientPublicKey, language, ...summary } = parsed.data;

  // Info: (20260805 - Tzuhan) 頻道所有權裁決:只允許寫入自己 address 前綴的頻道(與 /chat/carbon 同一規則)
  if (!isCarbonChatChannelOwnedBy(channel, sessionUser.address)) {
    return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
  }

  try {
    /**
     * Info: (20260805 - Tzuhan) 文案在此組出,不採用呼叫端傳來的字串 ——
     * 入庫的是系統的陳述,讓呼叫端塞任意文字進使用者的對話紀錄是不能接受的。
     */
    const envelope = await chatroomService.recordAndPublishAiReply({
      channel,
      recipientPublicKey: recipientPublicKey ?? sessionUser.address,
      text: buildImportSummaryNotice(language, summary),
      purpose: CARBON_CHAT_PURPOSE,
    });
    return jsonOk({ envelope });
  } catch (error) {
    logger.error(
      `[API] /chat/carbon/import/notice POST error: ${describeError(error)}`,
    );
    return jsonFail(API_ERRORS.IS_REPORT_IMPORT_FAILED);
  }
}
