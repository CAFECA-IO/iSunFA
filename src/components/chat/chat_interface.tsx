"use client";

import { useCallback, useEffect, useState } from "react";
import ChatInput from "@/components/chat/chat_input";
import MessageList, { IMessage } from "@/components/chat/message_list";
import QuotaExceededNotice from "@/components/chat/quota_exceeded_notice";
import QuotaIndicator from "@/components/chat/quota_indicator";
import { request } from "@/lib/utils/request";
import { parseQuotaExceededError } from "@/lib/quota/quota_notice";
import type { IQuotaExceededPayload } from "@/interfaces/team_wallet";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";

interface IChatInterfaceProps {
  className?: string;
  /**
   * Info: (20260812 - Luphia) 計費情境（設計書 §5.3「使用前提」）：選定帳本後才能使用費思，
   * 扣費團隊由 server 從 AccountBook.teamId 推導。未帶帳本時後端走訪客試用路徑（不扣點）。
   */
  accountBookId?: string;
}

export default function ChatInterface({
  className,
  accountBookId,
}: IChatInterfaceProps = {}) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [guestUsage, setGuestUsage] = useState(0);
  // Info: (20260812 - Luphia) 額度用罄的 402 payload：非 null 即鎖住輸入並顯示重置倒數
  const [quotaExceeded, setQuotaExceeded] =
    useState<IQuotaExceededPayload | null>(null);
  /**
   * Info: (20260812 - Luphia) 倒數歸零後解鎖但不撤掉卡片：卡片改顯示「已恢復」，
   * 由下一次送出訊息才清掉。這樣「額度回來了」是看得見的狀態轉換，而非畫面靜靜消失。
   */
  const [quotaRecovered, setQuotaRecovered] = useState(false);
  /**
   * Info: (20260813 - Luphia) 常駐額度指示器的重取觸發：每次送出後用量都變了，
   * 以計數器而非時間戳，避免同一秒內連送兩則時漏更新。
   */
  const [quotaRefreshToken, setQuotaRefreshToken] = useState(0);

  // Info: (20260105 - Luphia) Load usage from localStorage on mount
  useEffect(() => {
    const usage = parseInt(localStorage.getItem("guest_usage") || "0", 10);
    setGuestUsage(usage);
  }, []);

  // Info: (20260812 - Luphia) 倒數歸零即解除輸入鎖，用戶不需重整頁面
  const handleQuotaReset = useCallback(() => setQuotaRecovered(true), []);

  const handleSend = async (
    text: string,
    file: File | null,
    tags: string[],
  ) => {
    // Info: (20260105 - Luphia) Check Guest Limit
    if (!user) {
      if (guestUsage >= 5) {
        return;
      }
      const newUsage = guestUsage + 1;
      setGuestUsage(newUsage);
      localStorage.setItem("guest_usage", newUsage.toString());
    }

    // Info: (20260104 - Luphia) 1. Create User Message
    const fileUrl = file ? URL.createObjectURL(file) : undefined;
    const userMsg: IMessage = {
      role: "user",
      content: text,
      image: fileUrl,
      mimeType: file?.type,
      tags,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    // Info: (20260812 - Luphia) 重新送出即撤掉上一輪的額度卡片，避免舊倒數殘留在畫面上
    setQuotaExceeded(null);
    setQuotaRecovered(false);

    try {
      /**
       * Info: (20260104 - Luphia) 2. Convert File to Base64 if exists
       * Info: (20260812 - Luphia) 無附件時必須是 undefined 而非 null：
       * faithChatSchema 的 `file` 是 z.string().optional()，只放行 undefined，
       * 送 null 會讓每一則純文字訊息都被擋在 VL_SCHEMA_ERROR（JSON 不會省略 null 欄位）。
       */
      let base64Data: string | undefined;
      if (file) {
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(file);
        });
      }

      // Info: (20260104 - Luphia) 3. Call API
      const response = await request<{ payload: { reply: string } }>(
        "/api/v1/chat",
        {
          method: "POST",
          body: JSON.stringify({
            message: text,
            tags,
            file: base64Data,
            mimeType: file?.type,
            accountBookId,
            /**
             * Info: (20260812 - Luphia) 冪等鍵的業務主鍵（設計書 §5.3）：
             * 同一則訊息重送不會重複扣點。
             */
            clientMessageId: crypto.randomUUID(),
          }),
        },
      );

      // Info: (20260104 - Luphia) 4. Add AI Response
      setMessages((prev) => [
        ...prev,
        { role: "model", content: response.payload.reply },
      ]);
    } catch (error) {
      /**
       * Info: (20260812 - Luphia) 額度用罄（402 / TW000001）不是「系統錯誤」：
       * 走專屬提示（重置倒數 + 導購），不要與通用錯誤文案混為一談，
       * 否則用戶只會不斷重試同一句話。
       */
      const quotaPayload = parseQuotaExceededError(error);
      if (quotaPayload) {
        setQuotaExceeded(quotaPayload);
        return;
      }
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "model", content: t("chat.generic_error") },
      ]);
    } finally {
      setLoading(false);
      // Info: (20260813 - Luphia) 成功或失敗都重取：失敗也可能已經扣掉預扣（例如 LLM 逾時後退款前）
      setQuotaRefreshToken((prev) => prev + 1);
    }
  };

  const isGuestLimitReached = !user && guestUsage >= 5;

  return (
    <div
      className={`relative z-[9999] flex flex-col bg-gray-50 ${className || "h-[calc(100vh-64px)]"}`}
    >
      {!user && !authLoading && (
        <div
          className={`border-b px-4 py-2 text-center text-sm ${isGuestLimitReached ? "border-red-100 bg-red-50 text-red-800" : "border-yellow-100 bg-yellow-50 text-yellow-800"}`}
        >
          {isGuestLimitReached
            ? t("chat.guest_limit_reached")
            : t("chat.login_warning")}
        </div>
      )}
      <MessageList messages={messages} loading={loading} />
      <QuotaIndicator
        accountBookId={accountBookId}
        refreshToken={quotaRefreshToken}
      />
      {quotaExceeded && (
        <QuotaExceededNotice
          payload={quotaExceeded}
          onReset={handleQuotaReset}
        />
      )}
      <ChatInput
        onSend={handleSend}
        disabled={
          loading ||
          isGuestLimitReached ||
          (Boolean(quotaExceeded) && !quotaRecovered)
        }
      />
    </div>
  );
}
