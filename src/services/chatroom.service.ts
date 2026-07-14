// Info: (20260712 - Luphia) Chatroom 服務層：協調加密 → 入庫 → 發佈，確保所有通過訊息都以密文留存
import { chatroomRepo } from "@/repositories/chatroom.repo";
import { publishToCentrifugo } from "@/lib/centrifugo";
import { eciesEncrypt } from "@/lib/chatroom_ecies";
import { ChatRoleEnum, IAttachment } from "@/types/carbon_chatbot.types";
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
  // Info: (20260714 - Emily) 附件 metadata(name/size/mimeType);併入加密 payload,重整後可還原附件卡片
  attachments?: IAttachment[];
  // Info: (20260714 - Emily) 訊息關聯的報告段落 id;併入加密 payload,重整後段落 chip 可還原
  relatedParagraphIds?: string[];
}

export class ChatroomService {
  // Info: (20260712 - Luphia) 加密後入庫（僅密文），並視需要發佈到 Centrifugo
  // Info: (20260714 - Emily) 回傳 envelope 供 HTTP 回應直接帶回:Centrifugo 遞送失效時前端仍可解密顯示(訂閱重複由前端以訊息 id 去重)
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
          // Info: (20260714 - Emily) 附件 metadata 併入加密訊息(無附件時不帶欄位,維持 payload 精簡)
          ...(params.attachments && params.attachments.length > 0
            ? { attachments: params.attachments }
            : {}),
          ...(params.relatedParagraphIds &&
          params.relatedParagraphIds.length > 0
            ? { relatedParagraphIds: params.relatedParagraphIds }
            : {}),
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
      // Info: (20260714 - Emily) 廣播為 best-effort:主要遞送已改為 HTTP 回帶 envelope,
      // Info: (20260714 - Emily) Centrifugo 斷線不應讓整個請求 500(訊息已入庫,僅損失多分頁即時同步)
      try {
        await publishToCentrifugo(params.channel, envelope);
      } catch (error) {
        console.error("[ChatroomService] centrifugo publish failed:", error);
      }
    }

    return envelope;
  }

  // Info: (20260712 - Luphia) 記錄使用者訊息（加密入庫、不發佈，前端已就地顯示）
  async recordUserMessage(params: {
    channel: string;
    recipientPublicKey: string;
    text: string;
    purpose?: string;
    attachments?: IAttachment[];
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
    relatedParagraphIds?: string[];
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
