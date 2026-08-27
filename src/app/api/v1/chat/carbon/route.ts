import { NextRequest } from "next/server";
import { logger } from "@/lib/utils/logger";
import { describeError } from "@/lib/utils/error_message";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { enforceRateLimit } from "@/lib/rate_limiter";
import { RateLimitBucketEnum } from "@/constants/rate_limit";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  ChatService,
  isLlmQuotaError,
  isLlmTimeoutError,
} from "@/services/chat.service";
import { chatroomService } from "@/services/chatroom.service";
import { AttachmentExtractionService } from "@/services/attachment_extraction.service";
import { ParagraphDraftService } from "@/services/paragraph_draft.service";
import {
  CARBON_CHAT_PURPOSE,
  CARBON_CHAT_AI_CONTEXT_SIZE,
  buildAttachmentDraftSummary,
  buildAttachmentExtractedNotice,
  buildChatDraftSummary,
  buildDraftProgressNotice,
  isCarbonChatChannelOwnedBy,
} from "@/constants/carbon_chatbot";
import { randomUUID } from "crypto";
import { CarbonChatRequestSchema } from "@/validators";
import { runBilledCarbonTask } from "@/services/carbon_billing.service";
import { toBillingFailureResponse } from "@/lib/utils/billing_response";
import {
  ChatRoleEnum,
  IAttachment,
  IActivityRecord,
} from "@/types/carbon_chatbot.types";
import {
  IParagraphDraft,
  IContextFact,
} from "@/interfaces/carbon_paragraph_draft";
import {
  shouldRunReplyGate,
  auditReplyQuantities,
} from "@/lib/carbon_reply_gate";
import type { IEciesEnvelope } from "@/lib/chatroom_ecies";

// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260712 - Luphia) 取得 AI 回覆，使用者訊息與 AI 回覆皆加密入庫；AI 回覆另經 Centrifugo 回傳（前端只訂閱）
// Info: (20260714 - Tzuhan) 手動解構驗證改為集中 Zod validator；新增 attachments(metadata 入加密 payload,base64 不入庫)
// Info: (20260714 - Tzuhan) DeWT 授權: 比照 history route，並檢查 channel 所有權(頻道內含用戶 address)
export async function POST(request: NextRequest) {
  const sessionUser = await getIdentityFromDeWT(
    request.headers.get("Authorization"),
  );
  if (!sessionUser) {
    return jsonFail(API_ERRORS.AUTH_INVALID_TOKEN);
  }

  // Info: (20260716 - Tzuhan) 限流(#6516):DeWT 驗證後、業務邏輯前 Fail Fast
  const limited = enforceRateLimit(
    sessionUser.address,
    RateLimitBucketEnum.LLM,
  );
  if (limited) return limited;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonFail(API_ERRORS.VL_INVALID_JSON);
  }

  const parsed = CarbonChatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonFail(API_ERRORS.VL_SCHEMA_ERROR);
  }

  const {
    history,
    currentStep,
    language,
    channel,
    recipientPublicKey,
    init,
    attachments,
    clientMessageId,
    // Info: (20260825 - Emily) #6707 帳本事實包:前端決定性組出(帳本 E2EE,伺服端讀不到),
    // Info: (20260825 - Emily) 經 Zod 上限驗證後原樣進 persona —— 本路由不加工、不補算
    ledgerFacts,
  } = parsed.data;

  // Info: (20260714 - Tzuhan) 頻道所有權裁決: 只允許讀寫自己 address 前綴的頻道，防跨用戶寫入
  if (channel && !isCarbonChatChannelOwnedBy(channel, sessionUser.address)) {
    return jsonFail(API_ERRORS.AUTH_PERMISSION_DENIED);
  }

  try {
    const chatService = new ChatService();

    // Info: (20260712 - Luphia) 進入 channel 的前置作業：由 AI 產生開場招呼詞，加密後經 Centrifugo 回傳
    if (init) {
      if (!channel || !recipientPublicKey) {
        return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
      }
      const greeting = await chatService.generateCarbonChatbotGreeting(
        currentStep,
        language,
      );
      // Info: (20260714 - Tzuhan) envelope 隨 HTTP 回帶: Centrifugo 遞送失效時前端仍可解密顯示(以訊息 id 去重)
      const greetingEnvelope = await chatroomService.recordAndPublishAiReply({
        channel,
        recipientPublicKey,
        text: greeting,
        purpose: CARBON_CHAT_PURPOSE,
      });
      return jsonOk({ published: true, envelopes: [greetingEnvelope] });
    }

    if (!history) {
      return jsonFail(API_ERRORS.VL_MISSING_PARAMS);
    }

    // Info: (20260714 - Tzuhan) 有附件時在「送給 AI 的副本」最後一則使用者訊息標註檔名，
    // Info: (20260714 - Tzuhan) 讓 AI 知道使用者上傳了佐證；入庫的原文不加註，避免重整後畫面重複顯示
    const attachmentNames = (attachments ?? []).map((a) => a.name);
    const historyForAi =
      attachmentNames.length > 0
        ? history.map((item, index) => {
            const isLastUserMessage =
              item.role === "user" &&
              index === history.map((h) => h.role).lastIndexOf("user");
            if (!isLastUserMessage) return item;
            return {
              ...item,
              text: `${item.text}\n[使用者已上傳附件: ${attachmentNames.join(", ")}]`,
            };
          })
        : history;

    /**
     * Info: (20260804 - Tzuhan) 使用者的訊息**先入庫,再呼叫 LLM**。
     *
     * 原本排在 LLM 呼叫之後。後果:LLM 逾時、撞額度或任何拋錯,
     * 那則訊息就永遠不會進 DB —— 畫面上它還在(前端本機 echo),
     * 但下一次 loadHistory 就沒了,使用者看到的是「我打的字消失了」。
     *
     * 而匯入正是最會把 LLM 額度燒乾的操作(11 章 + 最多 11 次 gap-fill + 5 次結構圖,
     * 而額度是 12 次/分鐘),所以這個順序錯誤在匯入前後最容易發作 ——
     * 實測「匯入後聊天歷史只剩招呼語」即由此而來。
     *
     * 使用者說過的話不該因為系統回不出來就消失:那是他的輸入,不是系統的產出。
     */
    const canPublish = Boolean(channel && recipientPublicKey);
    const publishChannel = channel as string;
    const publishKey = recipientPublicKey as string;
    const attachmentsMeta: IAttachment[] | undefined = attachments;
    const lastUserMessage = [...history]
      .reverse()
      .find((item) => item.role === "user");

    if (canPublish && (lastUserMessage?.text || attachmentNames.length > 0)) {
      await chatroomService.recordUserMessage({
        channel: publishChannel,
        recipientPublicKey: publishKey,
        text: lastUserMessage?.text ?? "",
        purpose: CARBON_CHAT_PURPOSE,
        // Info: (20260714 - Tzuhan) 入庫 metadata(name/size/mimeType/cid)；原檔已於選檔時由 Laria 分片保存
        attachments: attachmentsMeta,
      });
    }

    // Info: (20260714 - Tzuhan) 結構化回覆: 對話內容 + 段落完成訊號(readyParagraphId 已經白名單裁決)
    // Info: (20260716 - Tzuhan) #6518:extraction 為已裁決的事實萃取，回帶前端合併進盤查狀態帳本
    // Info: (20260720 - Tzuhan) #51 chartRequest 為已裁決的圖表請求(雙 enum 白名單),透傳前端由模板產圖
    /**
     * Info: (20260813 - Luphia) 碳盤查對話計費（設計書 §5.5）：與費思同一套預扣—結算。
     * 額度不足時 runBilledCarbonTask 內的 spendCredits 會上拋 402，**LLM 不會被呼叫**。
     * 無帳本的舊個人會話不計費（該處留 log），行為與此前一致。
     */
    const billedChat = await runBilledCarbonTask({
      userId: sessionUser.id,
      channel,
      idempotencyKey: clientMessageId
        ? `carbon-chat:${sessionUser.id}:${clientMessageId}`
        : `carbon-chat:${randomUUID()}`,
      inputChars: historyForAi.reduce((sum, item) => sum + item.text.length, 0),
      hasAttachment: attachmentNames.length > 0,
      nowSec: Math.floor(Date.now() / 1000),
      run: () =>
        chatService.generateCarbonChatbotStructuredResponse(
          historyForAi,
          currentStep,
          language,
          undefined,
          ledgerFacts,
        ),
    });
    const {
      reply,
      readyParagraphId,
      extraction,
      revisionParagraphId,
      chartRequest,
    } = billedChat.result;

    const conversationContext = history
      .slice(-CARBON_CHAT_AI_CONTEXT_SIZE)
      .map((item) => ({
        role: item.role === "user" ? ChatRoleEnum.USER : ChatRoleEnum.AI,
        text: item.text,
      }));

    let drafts: IParagraphDraft[] = [];
    let degraded = false;
    let attachmentActivities: IActivityRecord[] = [];
    // Info: (20260716 - Tzuhan) #55 附件事實回帶:前端據此發起段落修訂(修訂數值僅能引用這些事實)
    let attachmentFacts: IContextFact[] = [];

    // Info: (20260730 - Tzuhan) 遞送順序改為「邊做邊推」:原本使用者訊息與 AI 回覆都排在附件管線之後,
    // Info: (20260730 - Tzuhan) 整條請求做完才一次發佈。實測附件流程約 87s(萃取 36.8s + 3 段草稿),
    // Info: (20260730 - Tzuhan) 而閘道的讀取逾時預設 60s,使用者只看到 504 與「系統錯誤」,
    // Info: (20260730 - Tzuhan) 即使伺服端其實跑完了。改成回覆先送、每個單元完成即推,結果不再依賴那條連線活著。
    // Info: (20260804 - Tzuhan) 使用者訊息已提前於 LLM 呼叫之前入庫,不在此處。
    const envelopes: IEciesEnvelope[] = [];
    const publishedDraftIds = new Set<string>();

    if (canPublish) {
      // Info: (20260730 - Tzuhan) 對話回覆此時已算完,立刻送出,不讓它被後面的長工作綁住
      envelopes.push(
        await chatroomService.recordAndPublishAiReply({
          channel: publishChannel,
          recipientPublicKey: publishKey,
          text: reply,
          purpose: CARBON_CHAT_PURPOSE,
        }),
      );
    }

    /**
     * Info: (20260730 - Tzuhan) 單段草稿完成即推:訊息帶該段草稿,前端訂閱端立即寫進報告。
     * 已推播的段落記入 publishedDraftIds,最終摘要不再重複攜帶(避免同一段落推兩次)。
     */
    const publishDraftProgress = async (
      draft: IParagraphDraft,
      current: number,
      total: number,
    ): Promise<void> => {
      if (!canPublish) return;
      envelopes.push(
        await chatroomService.recordAndPublishAiReply({
          channel: publishChannel,
          recipientPublicKey: publishKey,
          text: buildDraftProgressNotice(language, draft.title, current, total),
          purpose: CARBON_CHAT_PURPOSE,
          relatedParagraphIds: [draft.paragraphId],
          drafts: [draft],
        }),
      );
      publishedDraftIds.add(draft.paragraphId);
    };

    // Info: (20260714 - Tzuhan) 附件→段落管線: 附件已於選檔時上傳 Laria(僅帶 metadata+cid),
    // Info: (20260714 - Tzuhan) 管線經 recoverLaria 取回內容 → 萃取 → 白名單裁決 → 生成草稿(graceful fallback)
    if (attachments && attachments.length > 0) {
      const pipeline = new AttachmentExtractionService();
      /**
       * Info: (20260813 - Luphia) 附件萃取→段落草稿另計一筆（設計書 §5.5）：
       * 這條管線是 fan-out（萃取 1 次 + 每段草稿各 1 次，實測單次約 87 秒），
       * 成本遠高於純對話，與對話共用一把鍵會讓兩者的用量混在同一筆無法分辨。
       * 預扣以附件位元組數估算——這條路徑的輸入量來自檔案，不是訊息長度。
       */
      // Info: (20260813 - Luphia) metadata 的 size 是字串；非數字一律當 0，估算寧可低估不高估
      const attachmentBytes = attachments.reduce((sum, item) => {
        const size = Number(item.size);
        return sum + (Number.isFinite(size) && size > 0 ? size : 0);
      }, 0);
      const billedPipeline = await runBilledCarbonTask({
        userId: sessionUser.id,
        channel,
        idempotencyKey: clientMessageId
          ? `carbon-attachment:${sessionUser.id}:${clientMessageId}`
          : `carbon-attachment:${randomUUID()}`,
        inputChars: attachmentBytes,
        hasAttachment: true,
        nowSec: Math.floor(Date.now() / 1000),
        run: () =>
          pipeline.runAttachmentToParagraphPipeline({
            attachments,
            conversationContext,
            language,
            // Info: (20260730 - Tzuhan) 萃取是整條管線最長的單一步驟,結束時先報進度免得畫面像卡死
            onExtracted: canPublish
              ? async (sectionCount) => {
                  envelopes.push(
                    await chatroomService.recordAndPublishAiReply({
                      channel: publishChannel,
                      recipientPublicKey: publishKey,
                      text: buildAttachmentExtractedNotice(
                        language,
                        attachments.length,
                        sectionCount,
                      ),
                      purpose: CARBON_CHAT_PURPOSE,
                    }),
                  );
                }
              : undefined,
            onDraft: canPublish ? publishDraftProgress : undefined,
          }),
      });
      const result = billedPipeline.result;
      drafts = result.drafts;
      degraded = result.degraded;
      attachmentActivities = result.activities;
      attachmentFacts = result.facts;
    }

    // Info: (20260714 - Tzuhan) 對話蒐集完成的段落: 自動生成草稿寫入報告(打斷「無限訪談迴圈」的出口)
    // Info: (20260716 - Tzuhan) #55 修訂請求優先:目標段落交由前端對照卡確認,不在此自動生成
    if (
      readyParagraphId &&
      readyParagraphId !== revisionParagraphId &&
      !drafts.some((d) => d.paragraphId === readyParagraphId)
    ) {
      try {
        const draftService = new ParagraphDraftService();
        const draft = await draftService.generateParagraphDraft({
          paragraphId: readyParagraphId,
          // Info: (20260714 - Tzuhan) 帶入 AI 最新彙整回覆，草稿以彙整後的資訊為準
          conversationContext: [
            ...conversationContext,
            { role: ChatRoleEnum.AI, text: reply },
          ],
          language,
          /**
           * Info: (20260826 - Emily) #6707 帳本事實包一路帶到草稿(review 阻擋 3 的前半):
           * 這條路徑原本不帶事實 —— 草稿的 LLM 呼叫比對話回覆更下游、
           * 寫的字直接進報告,卻是唯一一段拿不到合法數字清單的生成。
           */
          contextFacts: ledgerFacts,
        });
        /**
         * Info: (20260826 - Emily) 出口守門補到守門後方的生成(review 阻擋 3 的後半):
         * 對話回覆過了守門,不代表這裡**另一次 LLM 呼叫**的產物也乾淨 ——
         * 草稿寫進報告,是比對話更嚴重的落地面。同一把尺:
         * 帶排放單位的數字 ∈ 事實包 ∪ 使用者說過的數字;上崗條件同 shouldRunReplyGate。
         * 攔下時草稿不落地、標記降級(使用者可用目錄的 AI 撰寫鈕重試),對話不中斷。
         */
        const draftGate = shouldRunReplyGate(ledgerFacts)
          ? auditReplyQuantities(
              draft.content,
              ledgerFacts,
              history
                .filter((item) => item.role === "user")
                .map((item) => item.text),
            )
          : { ok: true, violations: [] as string[] };
        if (!draftGate.ok) {
          logger.warn("carbon draft gate blocked", {
            paragraphId: readyParagraphId,
            violations: draftGate.violations,
          });
          degraded = true;
        } else {
          drafts.push(draft);
          // Info: (20260730 - Tzuhan) 對話蒐集完成的段落同樣完成即推
          await publishDraftProgress(draft, drafts.length, drafts.length);
        }
      } catch (draftError) {
        // Info: (20260714 - Tzuhan) 草稿失敗不阻斷對話，僅標記降級(用戶可用目錄的 AI 撰寫鈕重試)
        logger.error(
          `[API] /chat/carbon ready-paragraph draft failed: ${JSON.stringify(draftError)}`,
        );
        degraded = true;
      }
    }

    // Info: (20260712 - Luphia) 有頻道與收件者公鑰時，記錄使用者訊息並記錄+發佈 AI 回覆；否則直接回傳（相容用）
    if (canPublish) {
      // Info: (20260714 - Tzuhan) 草稿摘要為決定性模板訊息(不經 LLM)，帶 relatedParagraphIds 供段落 chip 還原
      // Info: (20260714 - Tzuhan) 模板依來源選擇: 有附件用附件版，純對話蒐集完成用對話版
      if (drafts.length > 0) {
        const sections = drafts.map((d) => d.title).join("、");
        const summaryText =
          attachments && attachments.length > 0
            ? buildAttachmentDraftSummary(
                language,
                drafts.length,
                sections,
                degraded,
              )
            : buildChatDraftSummary(language, sections);
        // Info: (20260730 - Tzuhan) 摘要只補帶「還沒被逐段推播出去」的草稿:
        // Info: (20260730 - Tzuhan) 逐段推播成功時這裡為空陣列(record 內部會略過欄位),避免同段落遞送兩次
        const unpublishedDrafts = drafts.filter(
          (draft) => !publishedDraftIds.has(draft.paragraphId),
        );
        const summaryEnvelope = await chatroomService.recordAndPublishAiReply({
          channel: publishChannel,
          recipientPublicKey: publishKey,
          text: summaryText,
          purpose: CARBON_CHAT_PURPOSE,
          relatedParagraphIds: drafts.map((d) => d.paragraphId),
          // Info: (20260714 - Tzuhan) 草稿隨加密訊息遞送: 長請求 HTTP 中斷時，報告更新仍經 Centrifugo/歷史送達
          drafts: unpublishedDrafts,
        });
        envelopes.push(summaryEnvelope);
      }

      return jsonOk({
        published: true,
        envelopes,
        drafts,
        degraded,
        extraction,
        attachmentActivities,
        revisionParagraphId,
        chartRequest,
        attachmentFacts,
      });
    }

    return jsonOk({
      reply,
      drafts,
      degraded,
      extraction,
      attachmentActivities,
      revisionParagraphId,
      chartRequest,
      attachmentFacts,
    });
  } catch (error) {
    logger.error(`[API] /chat/carbon error: ${describeError(error)}`);
    /**
     * Info: (20260813 - Luphia) 兩種計費錯誤都要帶 payload（設計書 §5.5）：
     * 團隊額度用罄回雙視窗 resetAt，無帳本會話回待付訂單的 orderId——
     * 少了 payload，前端只能顯示一句錯誤，用戶無從知道下一步該做什麼。
     */
    const billingFailure = toBillingFailureResponse(error);
    if (billingFailure) return billingFailure;
    // Info: (20260714 - Tzuhan) 額度耗盡回專屬錯誤碼，前端提示稍候重試(與一般系統錯誤區分)
    if (isLlmQuotaError(error)) {
      return jsonFail(API_ERRORS.IS_LLM_QUOTA_EXCEEDED);
    }
    // Info: (20260716 - Tzuhan) 同步路徑逾時(#6515): 前端提示重試，與一般系統錯誤區分
    if (isLlmTimeoutError(error)) {
      return jsonFail(API_ERRORS.IS_LLM_TIMEOUT);
    }
    return jsonFail(API_ERRORS.IS_UNKNOWN);
  }
}
