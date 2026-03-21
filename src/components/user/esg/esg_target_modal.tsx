"use client";

import { Dialog } from "@headlessui/react";
import { useState, useEffect, useCallback } from "react";
import { X, Target, TrendingDown, TrendingUp, Award, Building2, Loader2, Info } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";

interface IHistory {
  year: number;
  emissions: number;
  revenue: number;
  intensity: number;
}

interface ITargetInfo {
  history: IHistory[];
  lastYearData: IHistory | null;
  currentYearData: IHistory | null;
  suggestedTargetIntensity: number;
}

export default function EsgTargetModal({
  isOpen,
  onClose,
  accountBookId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountBookId: string;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ITargetInfo | null>(null);

  const [targetIntensityInput, setTargetIntensityInput] = useState<string>("");
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>("semiconductor");

  const INDUSTRY_DATA = [
    { id: "power", min: 5, max: 3000 },
    { id: "steel", min: 140, max: 600 },
    { id: "cement", min: 15, max: 550 },
    { id: "petro", min: 25, max: 350 },
    { id: "semiconductor", min: 2, max: 80 },
    { id: "transport", min: 25, max: 250 },
    { id: "retail", min: 3, max: 15 },
    { id: "telecom", min: 1, max: 32 },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request<IApiResponse<ITargetInfo>>(
        `/api/v1/user/account_book/${accountBookId}/esg/target`
      );
      if (res.payload) {
        setData(res.payload);
        if (res.payload.suggestedTargetIntensity > 0) {
          setTargetIntensityInput(res.payload.suggestedTargetIntensity.toFixed(2));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [accountBookId]);

  useEffect(() => {
    if (isOpen && accountBookId) {
      loadData();
    }
  }, [isOpen, accountBookId, loadData]);

  const handleSave = async () => {
    // Info: (20260321 - Luphia) In a real app we'd dispatch a POST save.
    onClose();
  };

  const targetIntensity = parseFloat(targetIntensityInput) || 0;
  const lastYearIntensity = data?.lastYearData?.intensity || 0;

  // Info: (20260321 - Luphia) Real-time calculations
  let reductionPercent = 0;
  let isDecrease = true;
  if (lastYearIntensity > 0) {
    reductionPercent = ((targetIntensity - lastYearIntensity) / lastYearIntensity) * 100;
    isDecrease = reductionPercent <= 0;
  }

  const calculateTaiwanRank = (val: number) => {
    if (val <= 0) return 1;
    // Info: (20260321 - Luphia) 2024 Taiwan Average 58 kgCO2e
    const avg = 58;
    if (val <= avg) {
      const rank = (val / avg) * 49 + 1;
      return Math.max(1, Math.round(rank));
    } else {
      const rank = 50 + ((val - avg) / (3000 - avg)) * 49;
      return Math.min(99, Math.round(rank));
    }
  };

  const calculateIndustryRank = (val: number) => {
    const industry = INDUSTRY_DATA.find((i) => i.id === selectedIndustryId) || INDUSTRY_DATA[0];
    const min = industry.min;
    const max = industry.max;
    if (val <= min) return 1;
    if (val >= max) return 99;

    const rank = ((val - min) / (max - min)) * 98 + 1;
    return Math.max(1, Math.min(99, Math.round(rank)));
  };

  const taiwanRank = calculateTaiwanRank(targetIntensity);
  const industryRank = calculateIndustryRank(targetIntensity);

  const currentYear = new Date().getFullYear();

  return (
    <Dialog open={isOpen} as="div" className="relative z-50" onClose={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" aria-hidden="true" />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-slate-50 text-left align-middle shadow-2xl border border-slate-200">
            {/* Info: (20260321 - Luphia) Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {t("esg_target.title")}
                </h3>
              </div>
              <button
                aria-label="Close"
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Info: (20260321 - Luphia) Left: Historical Context */}
                  <div className="flex flex-col gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
                      <h4 className="mb-4 flex items-center text-sm font-semibold text-slate-700">
                        <Info className="mr-2 h-4 w-4 text-slate-400" />
                        {t("esg_target.past_records")}
                      </h4>

                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 font-medium">{t("esg_target.year")}</th>
                              <th className="px-4 py-3 font-medium text-right">{t("esg_target.emissions")}</th>
                              <th className="px-4 py-3 font-medium text-right">{t("esg_target.revenue")}</th>
                              <th className="px-4 py-3 font-medium text-right">{t("esg_target.intensity")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium whitespace-nowrap">
                            {data?.history && data.history.length > 0 ? (
                              data.history.map((h) => (
                                <tr key={h.year} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3">{h.year}</td>
                                  <td className="px-4 py-3 text-right">{h.emissions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                  <td className="px-4 py-3 text-right">{(h.revenue / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-orange-600">{h.intensity}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                  {t("esg_summary.no_data_prefix")}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  {/* Info: (20260321 - Luphia) Right: Target Setting & Simulation */}
                  <div className="flex flex-col gap-6">
                    {/* Info: (20260321 - Luphia) Input block matching esg_summary style */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
                      <label htmlFor="industry" className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                        <span>{t("esg_target.select_industry")}</span>
                      </label>
                      <select
                        id="industry"
                        value={selectedIndustryId}
                        onChange={(e) => setSelectedIndustryId(e.target.value)}
                        className="mb-5 block w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-800 focus:border-orange-500 focus:ring-orange-500 transition-colors"
                      >
                        {INDUSTRY_DATA.map((ind) => (
                          <option key={ind.id} value={ind.id}>
                            {t(`esg_target.ind_${ind.id}`)} ( {ind.min} - {ind.max} kg)
                          </option>
                        ))}
                      </select>

                      <label htmlFor="targetIntensity" className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                        <span>{t("esg_target.set_target_intensity")} ({currentYear})</span>
                      </label>
                      <div className="relative flex items-center mt-1">
                        <input
                          type="number"
                          id="targetIntensity"
                          value={targetIntensityInput}
                          onChange={(e) => setTargetIntensityInput(e.target.value)}
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none block w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-4 pr-32 text-xl font-bold tracking-tight text-slate-800 focus:border-orange-500 focus:ring-orange-500 transition-colors placeholder:font-normal placeholder:text-slate-400"
                          placeholder={t("esg_target.target_placeholder")}
                        />
                        <span className="absolute right-4 text-sm font-medium text-slate-500">
                          {t("esg_target.target_unit")}
                        </span>
                      </div>
                    </div>

                    {/* Info: (20260321 - Luphia) Real-time Cards following esg_summary.tsx visual grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Info: (20260321 - Luphia) Reduction Card */}
                      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5 md:col-span-2">
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">
                              {t("esg_target.reduction_from_last_year")}
                            </span>
                            {isDecrease ? (
                              <TrendingDown className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <TrendingUp className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className={`text-2xl font-bold tracking-tight ${isDecrease ? 'text-emerald-600' : 'text-red-500'}`}>
                              {isDecrease ? "-" : "+"}{Math.abs(reductionPercent).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                            </span>
                            <span className="text-sm font-medium text-slate-500">
                              {isDecrease ? t("esg_target.decrease") : t("esg_target.increase")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info: (20260321 - Luphia) Ranking Taiwan */}
                      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">
                              {t("esg_target.taiwan_ranking")}
                            </span>
                            <Award className="h-5 w-5 text-amber-500" />
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-2xl font-bold tracking-tight text-slate-800">
                              Top {taiwanRank}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info: (20260321 - Luphia) Ranking Industry */}
                      <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">
                              {t("esg_target.industry_ranking")}
                            </span>
                            <Building2 className="h-5 w-5 text-slate-400" />
                          </div>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-2xl font-bold tracking-tight text-slate-800">
                              Top {industryRank}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 bg-white px-6 py-4 sm:flex sm:flex-row-reverse rounded-b-2xl">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-lg bg-[#FF5A1F] px-8 py-2.5 text-sm font-medium text-white hover:bg-[#E04914] sm:ml-3 sm:w-auto transition-colors focus:outline-none"
                onClick={handleSave}
              >
                {t("esg_target.save")}
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-8 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-colors focus:outline-none"
                onClick={onClose}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog >
  );
}
