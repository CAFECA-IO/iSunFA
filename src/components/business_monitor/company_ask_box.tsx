"use client";

import { FC, KeyboardEvent, useState } from "react";
import { MessageCircleQuestion, Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { BUSINESS_MONITOR_QUESTION_MAX_LENGTH } from "@/constants/business_monitor";
import {
  useBusinessMonitorChat,
  useScopeYears,
} from "@/hooks/use_business_monitor_chat";
import ScopeChips from "@/components/business_monitor/scope_chips";
import AiAnswer from "@/components/business_monitor/ai_answer";

interface ICompanyAskBoxProps {
  stockId: string;
  companyLabel: string;
  onShowToast: (type: "success" | "error", message: string) => void;
}

/**
 * Info: (20261022 - Luphia) 公司頁的「問問這家公司」：範疇固定為這家公司（不可移除），
 * 年度由問題裡偵測、送出前顯示且可點掉。
 */
const CompanyAskBox: FC<ICompanyAskBoxProps> = ({
  stockId,
  companyLabel,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const { years, removeYear } = useScopeYears(question);
  const { ask, isAsking, answer, notice, isLoggedIn } =
    useBusinessMonitorChat();

  const submit = () => {
    const text = question.trim();
    if (!text || isAsking) return;
    ask(text, { stockId, years });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
        <MessageCircleQuestion size={18} className="shrink-0 text-orange-500" />
        {t("business_monitor.company.ask_title")}
      </h2>
      <textarea
        value={question}
        rows={2}
        maxLength={BUSINESS_MONITOR_QUESTION_MAX_LENGTH}
        placeholder={t("business_monitor.company.ask_placeholder", {
          company: companyLabel,
        })}
        aria-label={t("business_monitor.company.ask_title")}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
      />
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <ScopeChips
          companyName={companyLabel}
          years={years}
          onRemoveYear={removeYear}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!question.trim() || isAsking}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Sparkles size={16} className="shrink-0" />
          {t("business_monitor.home.ask_ai")}
        </button>
      </div>
      <p className="text-xs text-slate-400">
        {t("business_monitor.filter.ai_billing_hint")}
      </p>
      <AiAnswer
        isAsking={isAsking}
        answer={answer}
        notice={notice}
        isLoggedIn={isLoggedIn}
        onShowToast={onShowToast}
      />
    </section>
  );
};

export default CompanyAskBox;
