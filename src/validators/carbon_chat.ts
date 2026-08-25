// Info: (20260714 - Emily) POST /api/v1/chat/carbon 的 Zod Schema(原路由為手動解構驗證,一併集中至此)

import { z } from "zod";
import {
  CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES,
  CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
} from "@/constants/carbon_chatbot";

export const CarbonChatAttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  size: z.string().min(1).max(20),
  mimeType: z.enum(CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES),
  // Info: (20260714 - Emily) Laria metadata hash:檔案已於選檔時上傳,訊息只帶引用;內容由管線經 recoverLaria 取回
  cid: z.string().min(1).max(200),
});

export type CarbonChatAttachmentPayload = z.infer<
  typeof CarbonChatAttachmentSchema
>;

/**
 * Info: (20260825 - Emily) #6707 帳本事實(第二層):前端由 buildLedgerFactBundle 決定性組出,
 * 是 LLM 回答數據問題的唯一合法數字來源。帳本是 E2EE 的、伺服端讀不到,
 * 所以事實只能隨請求帶上來 —— 上限與 LEDGER_FACT_BUNDLE_MAX 同值(80),
 * 超了是前端組包的 bug,打回比靜默裁切好。
 */
export const CarbonLedgerFactSchema = z.object({
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(500),
  source: z.string().min(1).max(300),
});

export const CarbonChatRequestSchema = z
  .object({
    init: z.boolean().optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "model"]),
          text: z.string().max(8000),
        }),
      )
      .max(100)
      .optional(),
    currentStep: z.string().max(1000).optional(),
    // Info: (20260813 - Luphia) 計費冪等鍵（設計書 §5.5）：同一則訊息重送不重複扣點
    clientMessageId: z.string().min(1).max(128).optional(),
    language: z.string().max(20).optional(),
    channel: z.string().max(200).optional(),
    recipientPublicKey: z.string().max(300).optional(),
    attachments: z
      .array(CarbonChatAttachmentSchema)
      .max(CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE)
      .optional(),
    // Info: (20260825 - Emily) #6707 帳本事實包(見 CarbonLedgerFactSchema 的註解)
    ledgerFacts: z.array(CarbonLedgerFactSchema).max(80).optional(),
  })
  // Info: (20260714 - Emily) init 模式必須有 channel + recipientPublicKey;一般模式必須有 history
  .refine((body) => (body.init ? true : Array.isArray(body.history)), {
    message: "history is required when init is not set",
  })
  .refine(
    (body) =>
      !body.init || (Boolean(body.channel) && Boolean(body.recipientPublicKey)),
    { message: "channel and recipientPublicKey are required for init" },
  );

export type CarbonChatRequestPayload = z.infer<typeof CarbonChatRequestSchema>;

// Info: (20260714 - Emily) 聊天回覆的結構化輸出:reply 為對話內容;readyParagraphId 為「資訊已蒐集齊全可寫入報告」的段落 id
// Info: (20260714 - Emily) id 是否合法由服務層白名單裁決,此處僅驗證型別
export const CarbonChatStructuredReplySchema = z.object({
  reply: z.string().min(1),
  readyParagraphId: z.string().max(50),
});

export type CarbonChatStructuredReply = z.infer<
  typeof CarbonChatStructuredReplySchema
>;
