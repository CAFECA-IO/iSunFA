import { Bot } from "lucide-react";
import { IChatMessage } from "@/types/carbon_chatbot.types";
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
      <div className="flex min-w-0 max-w-xl flex-1 flex-col">
        <div className="rounded-[24px] rounded-tl-none border-2 border-gray-100 bg-white p-5 leading-relaxed font-medium text-gray-800 shadow-sm min-w-0 max-w-full break-words">
          {message.text}

          {/* Info: (20260714 - Emily) 附件卡片抽為共用 AttachmentCard,並支援多附件 */}
          {message.attachments?.map((attachment) => (
            <AttachmentCard
              key={`${message.id}-${attachment.name}`}
              attachment={attachment}
            />
          ))}

          {/* Info: (20260714 - Emily) 段落 chip:點擊跳至報告對應段落並高亮 */}
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
