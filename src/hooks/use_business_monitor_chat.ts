import { useCallback, useState } from "react";
import {
  IAIChatScope,
  IAIResponse,
  IReport,
} from "@/interfaces/business_monitor";
import type { IBusinessMonitorChatScope } from "@/validators/business_monitor";
import { ApiError as RequestApiError, request } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { useAuth } from "@/contexts/auth_context";
import { useOrderTransaction } from "@/hooks/use_order_transaction";
import { parsePersonalPaymentRequired } from "@/hooks/use_carbon_chat.helpers";
import { useTranslation } from "@/i18n/i18n_context";
import { detectYears } from "@/lib/business_monitor/scope";

/**
 * Info: (20261022 - Luphia) 企業觀測站 AI 諮詢（首頁與公司頁共用）。
 *
 * - 未登入不呼叫，回傳「需要登入」的提示（畫面附登入按鈕）。
 * - 每次提問一個 clientMessageId；需個人付款時「402 → 付款 → 以同一個 id 重送」，不重複扣款。
 * - 範疇（公司、年度）由呼叫端明示，畫面上看到的就是實際查詢的。
 */

interface IChatPayload {
  reports: IReport[];
  aiResponse?: IAIResponse;
  scope?: IAIChatScope;
}

export interface IBusinessMonitorAnswer {
  question: string;
  aiResponse: IAIResponse;
  scope: IAIChatScope | null;
}

export const useBusinessMonitorChat = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { payExistingOrder } = useOrderTransaction();
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState<IBusinessMonitorAnswer | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ask = useCallback(
    async (question: string, scope: IBusinessMonitorChatScope) => {
      setNotice(null);
      setAnswer(null);
      if (!user) {
        setNotice(t("business_monitor.ai_section.login_required"));
        return;
      }

      const clientMessageId = crypto.randomUUID();
      const postChat = () =>
        request<{ payload: IChatPayload }>("/api/v1/business_monitor/chat", {
          method: "POST",
          body: JSON.stringify({ question, clientMessageId, scope }),
        });

      setIsAsking(true);
      try {
        let res: Awaited<ReturnType<typeof postChat>>;
        try {
          res = await postChat();
        } catch (error) {
          const pendingPayment = parsePersonalPaymentRequired(error);
          if (!pendingPayment) throw error;
          const paid = await payExistingOrder(
            pendingPayment.orderId,
            pendingPayment.cost,
            () => {},
          );
          if (!paid) {
            setNotice(t("business_monitor.ai_section.payment_required"));
            return;
          }
          res = await postChat();
        }
        const aiResponse = res?.payload?.aiResponse;
        if (aiResponse) {
          setAnswer({
            question,
            aiResponse,
            scope: res.payload.scope ?? null,
          });
        }
      } catch (error) {
        console.error("Business monitor chat failed", error);
        const errorCode =
          error instanceof RequestApiError
            ? (error.data as { errorCode?: unknown } | undefined)?.errorCode
            : undefined;
        setNotice(
          errorCode === API_ERRORS.IS_BUSINESS_MONITOR_LLM_UNAVAILABLE.code
            ? t("business_monitor.ai_section.llm_unavailable")
            : errorCode === API_ERRORS.TW_QUOTA_EXCEEDED.code
              ? t("business_monitor.ai_section.quota_exceeded")
              : t("business_monitor.ai_section.chat_failed"),
        );
      } finally {
        setIsAsking(false);
      }
    },
    [user, payExistingOrder, t],
  );

  return { ask, isAsking, answer, notice, isLoggedIn: Boolean(user) };
};

/**
 * Info: (20261022 - Luphia) 問題裡偵測到的年度，扣掉使用者點掉的。
 * 前端顯示的範疇標籤與送出的 scope.years 都從這裡來，兩者一定一致。
 */
export const useScopeYears = (question: string) => {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const years = detectYears(question).filter((year) => !removed.has(year));
  const removeYear = useCallback((year: string) => {
    setRemoved((prev) => new Set(prev).add(year));
  }, []);
  return { years, removeYear };
};
