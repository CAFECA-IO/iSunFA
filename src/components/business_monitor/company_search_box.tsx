"use client";

import { FC, KeyboardEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";
import {
  IBusinessMonitorCompany,
  IBusinessMonitorCompanyList,
} from "@/interfaces/business_monitor";
import {
  BUSINESS_MONITOR_QUESTION_MAX_LENGTH,
  BUSINESS_MONITOR_SEARCH_MAX_LENGTH,
  BUSINESS_MONITOR_SUGGESTION_LIMIT,
} from "@/constants/business_monitor";
import { useScopeYears } from "@/hooks/use_business_monitor_chat";
import ScopeChips from "@/components/business_monitor/scope_chips";

interface ICompanySearchBoxProps {
  isAsking: boolean;
  onAsk: (question: string, years: string[]) => void;
}

// Info: (20261022 - Luphia) 輸入的字剛好就是某家公司（代號、簡稱或全名）時，Enter 直接進公司頁
function exactMatch(
  text: string,
  companies: IBusinessMonitorCompany[],
): IBusinessMonitorCompany | undefined {
  const value = text.trim();
  return companies.find(
    (c) =>
      c.stockId === value.toUpperCase() ||
      c.abbreviation === value ||
      c.name === value,
  );
}

/**
 * Info: (20261022 - Luphia) 首頁唯一的輸入框：找公司或問 AI。
 * 下拉列出符合的公司（點了進公司頁），最後一列是「問 AI」；送出前在下方顯示 AI 的查詢範疇。
 */
const CompanySearchBox: FC<ICompanySearchBoxProps> = ({ isAsking, onAsk }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<IBusinessMonitorCompany[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  // Info: (20261022 - Luphia) 點掉的年度在繼續打字時維持點掉；只有問題裡還有那個年份才會出現
  const { years, removeYear } = useScopeYears(text);

  useEffect(() => {
    const keyword = text.trim();
    if (!keyword || keyword.length > BUSINESS_MONITOR_SEARCH_MAX_LENGTH) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: keyword,
          pageSize: String(BUSINESS_MONITOR_SUGGESTION_LIMIT),
        });
        const res = await request<{ payload: IBusinessMonitorCompanyList }>(
          `/api/v1/business_monitor/companies?${params.toString()}`,
        );
        setSuggestions(res?.payload?.companies ?? []);
      } catch (error) {
        console.error("Company suggestions failed", error);
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const goCompany = (stockId: string) =>
    router.push(`/business_monitor/company/${stockId}`);

  const ask = () => {
    const question = text.trim();
    if (!question || isAsking) return;
    setIsOpen(false);
    onAsk(question, years);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const match = exactMatch(text, suggestions);
    if (match) goCompany(match.stockId);
    else ask();
  };

  const showDropdown = isOpen && Boolean(text.trim());
  const scopeChips = <ScopeChips years={years} onRemoveYear={removeYear} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          size={20}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={text}
          maxLength={BUSINESS_MONITOR_QUESTION_MAX_LENGTH}
          placeholder={t("business_monitor.home.search_placeholder")}
          aria-label={t("business_monitor.home.search_placeholder")}
          onChange={(e) => {
            setText(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          className="block w-full rounded-xl border border-slate-200 bg-white py-3.5 pr-28 pl-12 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={ask}
          disabled={!text.trim() || isAsking}
          className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Sparkles size={16} className="shrink-0" />
          {t("business_monitor.home.ask_ai")}
        </button>

        {showDropdown && (
          <div className="absolute top-full z-30 mt-1 max-h-96 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
            {suggestions.map((company) => (
              <button
                key={company.stockId}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => goCompany(company.stockId)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-left hover:bg-orange-50"
              >
                <span className="min-w-0 truncate text-sm font-bold text-slate-700">
                  {company.abbreviation ?? company.name}
                  <span className="ml-2 text-xs font-medium text-slate-400">
                    {company.stockId}・{company.name}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {company.industryName}
                </span>
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={ask}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-orange-700 hover:bg-orange-50"
            >
              <Sparkles size={16} className="shrink-0" />
              <span className="truncate">
                {t("business_monitor.home.ask_ai_with", {
                  question: text.trim(),
                })}
              </span>
            </button>
            {/* Info: (20261022 - Luphia) 下拉展開時範疇顯示在這裡，否則會被下拉蓋住；按下時不讓輸入框失焦 */}
            <div
              role="presentation"
              className="border-t border-slate-100 px-4 py-2"
              onMouseDown={(e) => e.preventDefault()}
            >
              {scopeChips}
            </div>
          </div>
        )}
      </div>

      {text.trim() ? (
        !showDropdown && scopeChips
      ) : (
        <p className="text-xs text-slate-400">
          {t("business_monitor.home.search_hint")}
        </p>
      )}
      <p className="text-xs text-slate-400">
        {t("business_monitor.filter.ai_billing_hint")}
      </p>
    </div>
  );
};

export default CompanySearchBox;
