import { Bot } from "lucide-react";
import { IChatMessage } from "@/types/carbon_chatbot.types";
import { AttachmentCard } from "@/components/carbon_chatbot/attachment_card";

export interface IAIBubbleProps {
  message: IChatMessage;
}
import { useTranslation } from "@/i18n/i18n_context";

export function AIBubble({ message }: IAIBubbleProps) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-4">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5a00] shadow-sm">
        <Bot className="h-6 w-6 text-white" />
      </div>
      <div className="flex max-w-xl flex-1 flex-col">
        <div className="rounded-[24px] rounded-tl-none border-2 border-gray-100 bg-white p-5 leading-relaxed font-medium text-gray-800 shadow-sm">
          {message.text}

          {/* Info: (20260714 - Emily) 附件卡片抽為共用 AttachmentCard,並支援多附件 */}
          {message.attachments?.map((attachment) => (
            <AttachmentCard
              key={`${message.id}-${attachment.name}`}
              attachment={attachment}
            />
          ))}
        </div>
        <div className="mt-2 ml-2 text-xs font-bold text-gray-400">
          {t("carbon_chatbot.ai_name")}
        </div>
      </div>
    </div>
  );
}
