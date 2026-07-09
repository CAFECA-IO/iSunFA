import { User } from "lucide-react";
import { IChatMessage } from "@/types/carbon_chatbot.types";

export interface IUserBubbleProps {
  message: IChatMessage;
}
import { useTranslation } from "@/i18n/i18n_context";

import Image from "next/image";
import { File as FileIcon } from "lucide-react";

export function UserBubble({ message }: IUserBubbleProps) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end gap-4">
      <div className="flex max-w-xl flex-1 flex-col items-end">
        <div className="rounded-[24px] rounded-tr-none bg-[#ff5a00] p-5 leading-relaxed font-bold text-white shadow-sm shadow-orange-500/20">
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10"
                >
                  {att.previewUrl ? (
                    <Image
                      src={att.previewUrl}
                      alt={att.file.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <FileIcon className="h-8 w-8 text-white/70" />
                  )}
                </div>
              ))}
            </div>
          )}
          {message.text}
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
