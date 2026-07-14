import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { chatroomRepo } from "@/repositories/chatroom.repo";
import { CHATROOM_HISTORY_PAGE_SIZE } from "@/constants/chatroom";
import { isCarbonChatChannelOwnedBy } from "@/constants/carbon_chatbot";

// Info: (20260712 - Luphia) 分頁取回聊天室歷史（密文）；進入載入最近一頁，上卷帶 before 載入更舊一頁
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    const { searchParams } = request.nextUrl;
    const channel = searchParams.get("channel");
    if (!channel) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    // Info: (20260714 - Emily) 頻道所有權裁決:歷史雖為密文,仍不允許讀取他人頻道(縱深防禦)
    if (!isCarbonChatChannelOwnedBy(channel, sessionUser.address)) {
      return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
    }

    const beforeParam = searchParams.get("before");
    const before = beforeParam ? new Date(beforeParam) : undefined;
    const limit = CHATROOM_HISTORY_PAGE_SIZE;

    // Info: (20260712 - Luphia) desc 取最新一頁，再反轉為 asc 供直接顯示
    const rowsDesc = await chatroomRepo.listMessagesByChannel(
      channel,
      limit,
      before,
    );
    const rowsAsc = [...rowsDesc].reverse();

    const messages = rowsAsc.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      encryptedContent: row.encryptedContent,
      ephemeralPublicKey: row.ephemeralPublicKey,
      keyDerivationHint: row.keyDerivationHint,
      algorithm: row.algorithm,
    }));

    return jsonOk({
      messages,
      oldestCreatedAt: rowsAsc.length > 0 ? rowsAsc[0].createdAt : null,
      hasMore: rowsDesc.length === limit,
    });
  } catch (error) {
    console.error("[API] /chat/carbon/history GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
