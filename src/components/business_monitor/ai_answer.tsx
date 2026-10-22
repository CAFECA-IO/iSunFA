"use client";

import { FC } from "react";
import { AlertCircle, Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { MarkdownContent } from "@/components/common/markdown_content";
import LoginButton from "@/components/common/login_button";
import AiResponseCard from "@/components/business_monitor/ai_response_card";
import { IBusinessMonitorAnswer } from "@/hooks/use_business_monitor_chat";

interface IAiAnswerProps {
  isAsking: boolean;
  answer: IBusinessMonitorAnswer | null;
  notice: string | null;
  isLoggedIn: boolean;
  onShowToast: (type: "success" | "error", message: string) => void;
}

// Info: (20261022 - Luphia) AI 諮詢的結果區（首頁與公司頁共用）：載入中、提示（含登入）、回答與出處
const AiAnswer: FC<IAiAnswerProps> = ({
  isAsking,
  answer,
  notice,
  isLoggedIn,
  onShowToast,
}) => {
  const { t } = useTranslation();

  if (isAsking) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm font-medium text-orange-900">
        <Sparkles
          size={18}
          className="shrink-0 animate-pulse text-orange-500"
        />
        {t("business_monitor.ai_section.searching")}
      </div>
    );
  }

  if (notice) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm font-medium text-orange-900 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          {notice}
        </p>
        {!isLoggedIn && (
          <LoginButton label={t("business_monitor.ai_section.login_to_ask")} />
        )}
      </div>
    );
  }

  if (!answer) return null;

  const scopeText = answer.scope
    ? [
        answer.scope.companies.length > 0
          ? answer.scope.companies.join("、")
          : t("business_monitor.scope.no_company"),
        answer.scope.years.length > 0
          ? answer.scope.years
              .map((year) => t("business_monitor.scope.year", { year }))
              .join("、")
          : t("business_monitor.scope.all_years"),
      ].join("｜")
    : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm md:p-6">
      <div className="flex items-center gap-2">
        <Sparkles size={20} className="shrink-0 text-orange-500" />
        <h2 className="text-sm font-bold text-orange-900 md:text-lg">
          {t("business_monitor.ai_section.title")}
        </h2>
      </div>
      <p className="text-sm font-bold text-slate-700">{answer.question}</p>
      {scopeText && (
        <p className="text-xs text-slate-500">
          {t("business_monitor.scope.used", { scope: scopeText })}
        </p>
      )}
      <div className="rounded-2xl bg-orange-100 px-4 py-2 text-base leading-relaxed font-medium text-slate-800">
        <MarkdownContent content={answer.aiResponse.answer} theme="light" />
      </div>
      <AiResponseCard
        aiResponse={answer.aiResponse}
        onShowToast={onShowToast}
      />
    </div>
  );
};

export default AiAnswer;
