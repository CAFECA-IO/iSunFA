// Info: (20260714 - Emily) 訊息附件卡片:UserBubble 與 AIBubble 共用(自 ai_bubble 內嵌樣式抽出)

import { FileText } from "lucide-react";
import { IAttachment } from "@/types/carbon_chatbot.types";

export interface IAttachmentCardProps {
  attachment: IAttachment;
}

export function AttachmentCard({ attachment }: IAttachmentCardProps) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-[#e04f00] p-3">
      <div className="rounded-lg bg-white/20 p-2">
        <FileText className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-white">
          {attachment.name}
        </div>
        <div className="mt-0.5 text-[10px] tracking-wider text-white/70 uppercase">
          {attachment.size}
        </div>
      </div>
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-white bg-green-500">
        <svg
          className="h-3 w-3 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    </div>
  );
}
