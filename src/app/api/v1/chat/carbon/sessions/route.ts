// Info: (20260714 - Tzuhan) 列出用戶的碳盤查 sessions(以 DB Chatroom 為 single source of truth)
// Info: (20260714 - Tzuhan) 只回 channel metadata;標題衍生自密文首訊,由前端解密後自行補上(server 讀不到明文)

import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceCarbonRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { carbonSessionService } from "@/services/carbon_session.service";
import { buildCarbonChatChannel } from "@/constants/carbon_chatbot";
import {
  CarbonSessionBindSchema,
  CarbonSessionArchiveSchema,
} from "@/validators";
import {
  canBindAccountBook,
  resolveCarbonAccess,
  canViewAccountBook,
  CarbonAccessLevelEnum,
} from "@/services/carbon_access.guard";
import { describeError } from "@/lib/utils/error_message";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260716 - Tzuhan) 限流(#6516):DeWT 驗證後、業務邏輯前 Fail Fast
    const limited = enforceCarbonRateLimit(
      sessionUser.address,
      RateLimitBucketEnum.READ,
    );
    if (limited) return limited;

    // Info: (20260716 - Tzuhan) #52 帳本閱覽動線:帶 accountBookId 時列出該帳本全部會話;
    // Info: (20260716 - Tzuhan) 需為團隊成員(VIEWER 含),非成員不得枚舉;逐會話內容授權由 report/inventory GET 再裁決
    // Info: (20260730 - Tzuhan) 已封存的會話預設不列(封存的意義就是從清單消失);帶此參數才一併列出供還原
    const includeArchived =
      request.nextUrl.searchParams.get("includeArchived") === "true";
    const accountBookId = request.nextUrl.searchParams.get("accountBookId");
    if (accountBookId) {
      // Info: (20260731 - Luphia) 改用 carbon_access.guard 既有裁決(§1:route 不直接碰 repository)
      // Info: (20260731 - Luphia) 注意參數順序為 (userAddress, accountBookId),與 repo 相反
      if (!(await canViewAccountBook(sessionUser.address, accountBookId))) {
        return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
      }
      const sessions = await carbonSessionService.listByAccountBook(
        accountBookId,
        sessionUser.address,
        includeArchived,
      );
      return jsonOk({ sessions });
    }

    const sessions = await carbonSessionService.listOwnedByAddress(
      sessionUser.address,
      includeArchived,
    );

    return jsonOk({ sessions });
  } catch (error) {
    logger.error(
      `[API] /chat/carbon/sessions GET error: ${describeError(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

/**
 * Info: (20260716 - Tzuhan) #52 建立/綁定帳本會話:
 * POST { sessionId, accountBookId, recipientPublicKey } — 需為該帳本 EDITOR 以上;
 * 已綁定其他帳本者拒絕改綁(報告歸屬不可漂移,審計原則)
 */
export async function POST(request: NextRequest) {
  try {
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

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonFail(API_ERRORS.VL_INVALID_JSON);
    }
    const parsed = CarbonSessionBindSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }

    const channel = buildCarbonChatChannel(
      sessionUser.address,
      parsed.data.sessionId,
    );

    // Info: (20260716 - Tzuhan) 綁定 = 寫入行為,需 EDITOR 以上
    const allowed = await canBindAccountBook(
      sessionUser.address,
      parsed.data.accountBookId,
    );
    if (!allowed) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    // Info: (20260716 - Tzuhan) 不可改綁:既有綁定與請求不符即拒
    const bound = await carbonSessionService.bindAccountBook(
      channel,
      parsed.data.accountBookId,
      parsed.data.recipientPublicKey,
    );
    if (!bound) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }
    return jsonOk({ channel, accountBookId: parsed.data.accountBookId });
  } catch (error) {
    logger.error(
      `[API] /chat/carbon/sessions POST error: ${describeError(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}

/**
 * Info: (20260730 - Tzuhan) 封存會話(軟刪)。刻意不做硬刪:
 * 一個會話連帶整份 33 節報告草稿與活動數據帳本,在審計系統裡誤刪一份已查核的報告不可逆。
 * 封存後清單不再顯示,但資料仍在,可由 PATCH 還原。
 *
 * 權限為獨立的 DELETE 層級(非 EDIT):個人會話限擁有者;帳本會話限擁有者或帳本 OWNER/ADMIN。
 * EDITOR 能寫報告內容,但不能收掉別人建的會話。
 */
export async function DELETE(request: NextRequest) {
  return setSessionArchived(request, true);
}

// Info: (20260730 - Tzuhan) 還原已封存的會話(與封存同一權限層級)
export async function PATCH(request: NextRequest) {
  return setSessionArchived(request, false);
}

async function setSessionArchived(request: NextRequest, archived: boolean) {
  try {
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

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonFail(API_ERRORS.VL_INVALID_JSON);
    }
    const parsed = CarbonSessionArchiveSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
    }

    // Info: (20260730 - Tzuhan) channel 由 address + sessionId 組出,請求端無法指定他人頻道;
    // Info: (20260730 - Tzuhan) 帳本會話的跨人封存仍須通過下方 DELETE 層級裁決
    const channel = parsed.data.channel;
    const access = await resolveCarbonAccess(
      sessionUser.address,
      channel,
      CarbonAccessLevelEnum.DELETE,
    );
    if (!access.allowed) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const updated = await carbonSessionService.setArchived(channel, archived);
    if (!updated) {
      // Info: (20260730 - Tzuhan) 不存在就明說,不假裝成功(否則使用者無從得知自己封存的是不存在的會話)
      return jsonFail(API_ERRORS.NF_CARBON_SESSION);
    }

    logger.info("carbon session archive", {
      channel,
      archived,
      by: sessionUser.address,
      accountBookId: access.accountBookId,
    });
    return jsonOk({ channel: updated.channel, archivedAt: updated.archivedAt });
  } catch (error) {
    logger.error(
      `[API] /chat/carbon/sessions archive error: ${describeError(error)}`,
    );
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
