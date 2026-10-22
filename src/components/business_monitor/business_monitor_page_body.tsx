"use client";

import { FC } from "react";
import { Building2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useBusinessMonitorChat } from "@/hooks/use_business_monitor_chat";
import CompanySearchBox from "@/components/business_monitor/company_search_box";
import IndustryBrowser from "@/components/business_monitor/industry_browser";
import AiAnswer from "@/components/business_monitor/ai_answer";
import MonitorToast, {
  useMonitorToast,
} from "@/components/business_monitor/monitor_toast";

/**
 * Info: (20261022 - Luphia) 企業觀測站首頁：一個輸入框（找公司或問 AI）＋依產業瀏覽。
 *
 * 原本的「AI 諮詢／選擇企業／產業／年份 + 搜尋報告」篩選列已移除：產業只有寫死的 5 個、
 * 年份對不同來源意義不同，而且有輸入問題時三個篩選都被忽略。年份改為公司頁報告庫的分組
 * 與 AI 諮詢的範疇標籤，產業改為瀏覽入口。
 */
const BusinessMonitorPageBody: FC = () => {
  const { t } = useTranslation();
  const { ask, isAsking, answer, notice, isLoggedIn } =
    useBusinessMonitorChat();
  const { toast, showToast } = useMonitorToast();

  return (
    <main className="min-h-screen bg-gray-50/50 pt-8 pb-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-y-6 px-4 md:px-8 lg:gap-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center text-xl font-bold text-slate-800 lg:text-2xl">
            <Building2
              size={24}
              className="mr-2 shrink-0 text-orange-500"
              strokeWidth={2.5}
            />
            {t("business_monitor.title")}
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {t("business_monitor.subtitle")}
          </p>
        </div>

        <CompanySearchBox
          isAsking={isAsking}
          onAsk={(question, years) => ask(question, { years })}
        />

        <AiAnswer
          isAsking={isAsking}
          answer={answer}
          notice={notice}
          isLoggedIn={isLoggedIn}
          onShowToast={showToast}
        />

        <IndustryBrowser />
      </div>
      <MonitorToast toast={toast} />
    </main>
  );
};

export default BusinessMonitorPageBody;
