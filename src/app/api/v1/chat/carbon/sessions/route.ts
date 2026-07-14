// Info: (20260714 - Emily) 列出用戶的碳盤查 sessions(以 DB Chatroom 為 single source of truth)
// Info: (20260714 - Emily) 只回 channel metadata;標題衍生自密文首訊,由前端解密後自行補上(server 讀不到明文)

import { NextRequest } from "next/server";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { chatroomRepo } from "@/repositories/chatroom.repo";
import {
  CARBON_CHAT_PURPOSE,
  buildCarbonChatChannel,
} from "@/constants/carbon_chatbot";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getIdentityFromDeWT(
      request.headers.get("Authorization"),
    );
    if (!sessionUser) {
      return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
    }

    // Info: (20260714 - Emily) 前綴即所有權:頻道格式 carbon-chat-{address}-{sessionId},只列本人頻道
    const channelPrefix = buildCarbonChatChannel(sessionUser.address, "");
    const chatrooms = await chatroomRepo.listChatroomsByChannelPrefix(
      channelPrefix,
      CARBON_CHAT_PURPOSE,
    );

    const sessions = chatrooms.map((room) => ({
      sessionId: room.channel.slice(channelPrefix.length),
      channel: room.channel,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }));

    return jsonOk({ sessions });
  } catch (error) {
    console.error("[API] /chat/carbon/sessions GET error:", error);
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
