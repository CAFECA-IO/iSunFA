import { RefObject, useRef, useLayoutEffect } from "react";
import { Bot, MoreHorizontal, Loader2 } from "lucide-react";
import { IChatMessage, ChatRoleEnum } from "@/types/carbon_chatbot.types";
import { useTranslation } from "@/i18n/i18n_context";
import { UserBubble } from "@/components/carbon_chatbot/user_bubble";
import { AIBubble } from "@/components/carbon_chatbot/ai_bubble";

export interface IChatAreaProps {
  messages: IChatMessage[];
  isTyping: boolean;
  isLoading: boolean;
  chatEndRef: RefObject<HTMLDivElement | null>;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore: () => void;
}

// Info: (20260712 - Luphia) 捲到距頂多少 px 內即觸發載入更舊訊息
const SCROLL_TOP_THRESHOLD = 40;

export function ChatArea({
  messages,
  isTyping,
  isLoading,
  chatEndRef,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: IChatAreaProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isPrependingRef = useRef<boolean>(false);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || !hasMore || isLoadingMore) return;
    if (el.scrollTop <= SCROLL_TOP_THRESHOLD) {
      // Info: (20260712 - Luphia) 記錄載入前高度，載入後還原捲動位置，避免畫面跳動
      prevScrollHeightRef.current = el.scrollHeight;
      isPrependingRef.current = true;
      onLoadMore();
    }
  };

  // Info: (20260712 - Luphia) 前置更舊訊息後，維持使用者原本的可視位置
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el && isPrependingRef.current) {
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      isPrependingRef.current = false;
    }
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 space-y-8 overflow-y-auto bg-white px-6 py-8 pb-32"
    >
      {isLoadingMore && (
        <div className="flex items-center justify-center py-2 text-xs text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("common.loading")}
        </div>
      )}

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
