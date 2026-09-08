import { Bot } from "lucide-react";
import { IChatMessage } from "@/types/carbon_chatbot.types";
import { MarkdownContent } from "@/components/common/markdown_content";
import { AttachmentCard } from "@/components/carbon_chatbot/attachment_card";
import { ParagraphChip } from "@/components/carbon_chatbot/paragraph_chip";

export interface IAIBubbleProps {
  message: IChatMessage;
  onChipJump?: (paragraphId: string) => void;
}
import { useTranslation } from "@/i18n/i18n_context";

export function AIBubble({ message, onChipJump = undefined }: IAIBubbleProps) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-4">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5a00] shadow-sm">
        <Bot className="h-6 w-6 text-white" />
      </div>
      <div className="flex max-w-xl min-w-0 flex-1 flex-col">
        <div className="max-w-full min-w-0 rounded-[24px] rounded-tl-none border-2 border-gray-100 bg-white p-5 leading-relaxed font-medium break-words text-gray-800 shadow-sm">
          {/**
           * Info: (20260907 - Emily) 回覆以 markdown 渲染,沿用既有的 `MarkdownContent`。
           *
           * 在此之前這裡是 `{message.text}` 純文字,而 AI 的回覆本來就帶 markdown:
           * 事實清單是條列、排放源明細是 GFM 表格、章節引用是標頭 —— 使用者看到的是
           * `| 類別 | 排放量 |` 與 `|---|---|` 這些原始符號。同一份內容在報告預覽
           * (`carbon_report_preview`)早就是渲染過的,只有聊天室沒接上。
           *
           * `variant="compact"` 而不是預設的 `document`:後者是 A4 文件級字級(給 PDF 用),
           * 放進聊天泡泡會比周圍 UI 大一號。`theme="light"` 是「我背後是淺色」——
           * 白底泡泡;使用者那側的橘底泡泡是另一回事(見 `user_bubble`)。
           *
           * **不傳**碳報告專用的三個 opt-in(`stripDocumentTitle` /
           * `stripEchoedHeadings` / `restoreSourceLineBreaks`):它們針對報告原文的
           * 行結構與重複標頭,套在聊天回覆上會是靜默的內容遺失。
           *
           * 算式裡的乘號不必在這裡處理:`MarkdownContent` 內部無條件跑
           * `escapeArithmeticEmphasis`(`0.6*200/1000000000` 不會被吃成斜體),
           * 而寬表格由該元件的 `overflow-x-auto` 容器承接,不會撐破泡泡。
           */}
          <MarkdownContent
            content={message.text}
            theme="light"
            variant="compact"
          />

          {/* Info: (20260714 - Tzuhan) 附件卡片抽為共用 AttachmentCard,並支援多附件 */}
          {message.attachments?.map((attachment) => (
            <AttachmentCard
              key={`${message.id}-${attachment.name}`}
              attachment={attachment}
            />
          ))}

          {/* Info: (20260714 - Tzuhan) 段落 chip:點擊跳至報告對應段落並高亮 */}
          {onChipJump &&
            message.relatedParagraphIds &&
            message.relatedParagraphIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {message.relatedParagraphIds.map((paragraphId) => (
                  <ParagraphChip
                    key={`${message.id}-${paragraphId}`}
                    paragraphId={paragraphId}
                    onJump={onChipJump}
                  />
                ))}
              </div>
            )}
        </div>
        <div className="mt-2 ml-2 text-xs font-bold text-gray-400">
          {t("carbon_chatbot.ai_name")}
        </div>
      </div>
    </div>
  );
}
