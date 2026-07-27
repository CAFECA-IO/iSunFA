import { User } from "lucide-react";
import { IChatMessage } from "@/types/carbon_chatbot.types";
import { AttachmentCard } from "@/components/carbon_chatbot/attachment_card";

export interface IUserBubbleProps {
  message: IChatMessage;
}
import { useTranslation } from "@/i18n/i18n_context";

export function UserBubble({ message }: IUserBubbleProps) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end gap-4">
      {/* Info: (20260716 - Tzuhan) min-w-0 + max-w-full:長檔名/長字串不得撐破聊天視窗(UAT 破版修正) */}
      <div className="flex min-w-0 max-w-xl flex-1 flex-col items-end">
        <div className="min-w-0 max-w-full rounded-[24px] rounded-tr-none bg-[#ff5a00] p-5 leading-relaxed font-bold break-words text-white shadow-sm shadow-orange-500/20">
          {message.text}

          {/* Info: (20260714 - Tzuhan) 使用者上傳的附件卡片(與 AIBubble 共用 AttachmentCard) */}
          {message.attachments?.map((attachment) => (
            <AttachmentCard
              key={`${message.id}-${attachment.name}`}
              attachment={attachment}
            />
          ))}
        </div>
        <div className="mt-2 mr-2 text-xs font-bold text-gray-400">
          {t("common.system_admin")}
        </div>
      </div>

      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gray-100 bg-white shadow-sm">
        <User className="h-5 w-5 text-gray-400" />
      </div>
    </div>
  );
}
