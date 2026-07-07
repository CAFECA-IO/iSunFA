"use client";

import { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  Scale,
  Target,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ReportType, ReportPeriod } from "@/constants/financial_report";

interface IAiNarrativeSectionProps {
  accountBookId: string;
  period: ReportPeriod;
  year: number;
}

interface IAiNarrativeResponse {
  executiveSummary: string;
  materialityExclusion: string;
  uncertaintyAnalysis: string;
}

export default function AiNarrativeSection({
  accountBookId,
  period,
  year,
}: IAiNarrativeSectionProps) {
  const { t, language } = useTranslation();
  const [narrative, setNarrative] = useState<IAiNarrativeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await request<IApiResponse<IAiNarrativeResponse>>(
        `/api/v1/user/account_book/${accountBookId}/report/narrative?reportType=${ReportType.ESG_REPORT}&period=${period}&year=${year}&language=${language}`,
      );
      if (res.payload) {
        setNarrative(res.payload);
      } else {
        setError(t("esg_report.generate_ai_error"));
      }
    } catch (err) {
      console.error("Failed to generate AI narrative:", err);
      setError(t("esg_report.generate_ai_error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!narrative && !isLoading) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-6 print:hidden">
        {error ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-6 text-center shadow-sm">
            <p className="text-sm font-bold text-red-600">{error}</p>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold text-red-600 shadow-sm transition-colors hover:bg-red-50 active:bg-red-100"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 rounded-xl bg-[#FA4A11] px-6 py-3 text-sm font-bold tracking-wide text-white transition-colors hover:bg-[#E5430F] active:bg-[#CC3A0C]"
          >
            <Sparkles className="h-5 w-5" />
            {t("esg_report.generate_ai_btn")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 py-4 print:py-2">
      {/* Title Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 print:hidden">
        <Sparkles className="h-5 w-5 text-[#FA4A11]" />
        <h3 className="text-lg font-black tracking-wide text-gray-800">
          {t("esg_report.ai_narrative_title")}
        </h3>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 py-12 text-gray-500 print:hidden">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="mt-4 text-sm font-bold tracking-widest text-gray-600">
            {t("esg_report.generating_ai")}
          </p>
        </div>
      ) : narrative ? (
        <div className="flex flex-col gap-4">
          {/* Executive Summary */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm print:break-inside-avoid">
            <div className="mb-3 flex items-center gap-2 text-gray-800">
              <Target className="h-5 w-5 text-emerald-500" />
              <h4 className="text-base font-bold">
                {t("esg_report.ai_executive_summary")}
              </h4>
            </div>
            <div className="text-sm leading-relaxed font-medium whitespace-pre-wrap text-gray-600">
              {narrative.executiveSummary}
            </div>
          </div>

          {/* Materiality Exclusion */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm print:break-inside-avoid">
            <div className="mb-3 flex items-center gap-2 text-gray-800">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h4 className="text-base font-bold">
                {t("esg_report.ai_materiality_exclusion")}
              </h4>
            </div>
            <div className="text-sm leading-relaxed font-medium whitespace-pre-wrap text-gray-600">
              {narrative.materialityExclusion}
            </div>
          </div>

          {/* Uncertainty Analysis */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm print:break-inside-avoid">
            <div className="mb-3 flex items-center gap-2 text-gray-800">
              <Scale className="h-5 w-5 text-blue-500" />
              <h4 className="text-base font-bold">
                {t("esg_report.ai_uncertainty_analysis")}
              </h4>
            </div>
            <div className="text-sm leading-relaxed font-medium whitespace-pre-wrap text-gray-600">
              {narrative.uncertaintyAnalysis}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-right text-xs font-medium text-gray-400 print:text-[10px]">
            {t("esg_report.ai_disclaimer")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
