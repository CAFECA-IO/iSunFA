import { RefObject } from "react";
import { Bot, MoreHorizontal } from "lucide-react";
import { IChatMessage, ChatRoleEnum } from "@/types/carbon_chatbot.types";
import { UserBubble } from "@/components/carbon_chatbot/user_bubble";
import { AIBubble } from "@/components/carbon_chatbot/ai_bubble";

export interface IChatAreaProps {
  messages: IChatMessage[];
  isTyping: boolean;
  isLoading: boolean;
  chatEndRef: RefObject<HTMLDivElement | null>;
}

export function ChatArea({
  messages,
  isTyping,
  isLoading,
  chatEndRef,
}: IChatAreaProps) {
  return (
    <div className="flex-1 space-y-8 overflow-y-auto bg-white px-6 py-8 pb-32">
      {messages.map((msg) =>
        msg.sender === ChatRoleEnum.USER ? (
          <UserBubble key={msg.id} message={msg} />
        ) : (
          <AIBubble key={msg.id} message={msg} />
        ),
      )}

      {(isTyping || isLoading) && (
        <div className="flex gap-4">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff5a00] shadow-sm">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="max-w-xl flex-1">
            <div className="flex w-24 items-center gap-2 rounded-[24px] rounded-tl-none border-2 border-gray-100 bg-white p-5 text-gray-800 shadow-sm">
              <MoreHorizontal className="h-6 w-6 animate-pulse text-gray-400" />
            </div>
          </div>
        </div>
      )}

      <div ref={chatEndRef as RefObject<HTMLDivElement>} />
    </div>
  );
}
