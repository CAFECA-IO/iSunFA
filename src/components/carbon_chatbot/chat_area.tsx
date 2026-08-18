import { RefObject, useRef, useLayoutEffect, useEffect } from "react";
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
  // Info: (20260714 - Emily) 對話↔報告雙向連動:chip 點擊跳報告、反向連動時閃爍的目標訊息
  onChipJump?: (paragraphId: string) => void;
  focusedMessageId?: string | null;
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
  onChipJump = undefined,
  focusedMessageId = null,
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

  // Info: (20260714 - Emily) 反向連動:報告段落點擊後捲動至關聯訊息(閃爍樣式由 wrapper class 呈現)
  useEffect(() => {
    if (!focusedMessageId || !containerRef.current) return;
    const target = containerRef.current.querySelector(
      `[data-message-id="${focusedMessageId}"]`,
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedMessageId]);

  /**
   * Info: (20260814 - Emily) 拿掉寫死的 `pb-32`。
   *
   * 那 8rem 是替絕對定位的輸入區留的位置，但輸入區的高度會隨著提示卡數量變 ——
   * 留固定值就等於賭它不會長高，而它一長高就蓋住最後幾則訊息（見 `chat_input` 檔內說明）。
   * `ChatInput` 已改排進文檔流，位置由 flex 分配，這裡不需要也不該再猜。
   *
   * `min-h-0`：flex 子項的 `min-height` 預設是 auto，內容一多會撐開父容器而不是自己捲動 ——
   * 帶 `overflow-y-auto` 的 flex 子項一律要配它。
   */
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 space-y-8 overflow-y-auto bg-white px-6 py-8"
    >
      {isLoadingMore && (
        <div className="flex items-center justify-center py-2 text-xs text-gray-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("common.loading")}
        </div>
      )}

      {messages.map((msg) => (
        // Info: (20260714 - Emily) data-message-id 為反向連動錨點;閃爍以短暫 ring + 底色呈現
        <div
          key={msg.id}
          data-message-id={msg.id}
          className={`rounded-3xl transition-all duration-500 ${
            focusedMessageId === msg.id
              ? "bg-orange-50 ring-2 ring-[#ff5a00]/50"
              : ""
          }`}
        >
          {msg.sender === ChatRoleEnum.USER ? (
            <UserBubble message={msg} />
          ) : (
            <AIBubble message={msg} onChipJump={onChipJump} />
          )}
        </div>
      ))}

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
