// Info: (20260712 - Luphia) Chatroom 服務層：協調加密 → 入庫 → 發佈，確保所有通過訊息都以密文留存
import { chatroomRepo } from "@/repositories/chatroom.repo";
import { publishToCentrifugo } from "@/lib/centrifugo";
import { eciesEncrypt } from "@/lib/chatroom_ecies";
import { ChatRoleEnum } from "@/types/carbon_chatbot.types";
import { AI_REPLY_PROGRESS_STEP } from "@/constants/carbon_chatbot";

interface IRecordParams {
  channel: string;
  recipientPublicKey: string;
  senderPublicKey?: string | null;
  text: string;
  progressUpdate: number;
  sender: ChatRoleEnum;
  publish: boolean;
  purpose?: string;
}

export class ChatroomService {
  // Info: (20260712 - Luphia) 加密後入庫（僅密文），並視需要發佈到 Centrifugo
  private async record(params: IRecordParams) {
    const chatroom = await chatroomRepo.findOrCreateByChannel(
      params.channel,
      params.purpose,
      params.recipientPublicKey,
    );

    const envelope = await eciesEncrypt(
      params.recipientPublicKey,
      JSON.stringify({
        message: {
          id: crypto.randomUUID(),
          sender: params.sender,
          text: params.text,
        },
        progressUpdate: params.progressUpdate,
      }),
    );

    await chatroomRepo.createMessage({
      chatroomId: chatroom.id,
      senderPublicKey: params.senderPublicKey ?? null,
      recipientPublicKey: params.recipientPublicKey,
      encryptedContent: envelope.encryptedContent,
      ephemeralPublicKey: envelope.ephemeralPublicKey,
      algorithm: envelope.algorithm,
      keyDerivationHint: envelope.keyDerivationHint,
    });

    if (params.publish) {
      await publishToCentrifugo(params.channel, envelope);
    }
  }

  // Info: (20260712 - Luphia) 記錄使用者訊息（加密入庫、不發佈，前端已就地顯示）
  async recordUserMessage(params: {
    channel: string;
    recipientPublicKey: string;
    text: string;
    purpose?: string;
  }) {
    return this.record({
      ...params,
      senderPublicKey: params.recipientPublicKey,
      sender: ChatRoleEnum.USER,
      progressUpdate: 0,
      publish: false,
    });
  }

  // Info: (20260712 - Luphia) 記錄並發佈 AI 回覆（加密入庫 + Centrifugo 廣播）
  async recordAndPublishAiReply(params: {
    channel: string;
    recipientPublicKey: string;
    text: string;
    purpose?: string;
  }) {
    return this.record({
      ...params,
      senderPublicKey: null,
      sender: ChatRoleEnum.AI,
      progressUpdate: AI_REPLY_PROGRESS_STEP,
      publish: true,
    });
  }
}

export const chatroomService = new ChatroomService();
