import { Bot, FileText } from "lucide-react";
import { IChatMessage } from "@/types/carbon_chatbot.types";

export interface IAIBubbleProps {
  message: IChatMessage;
}

export function AIBubble({ message }: IAIBubbleProps) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5a00] shadow-sm">
        <Bot className="h-6 w-6 text-white" />
      </div>
      <div className="flex max-w-xl flex-1 flex-col">
        <div className="rounded-[24px] rounded-tl-none border-2 border-gray-100 bg-white p-5 leading-relaxed font-medium text-gray-800 shadow-sm">
          {message.text}

          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#e04f00] p-3"
                >
                  <div className="rounded-lg bg-white/20 p-2">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white">
                      {att.file.name}
                    </div>
                    <div className="mt-0.5 text-[10px] tracking-wider text-white/70 uppercase">
                      {(att.file.size / 1024).toFixed(1)} KB
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
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 ml-2 text-xs font-bold text-gray-400">
          費思 (FAITH)
        </div>
      </div>
    </div>
  );
}
