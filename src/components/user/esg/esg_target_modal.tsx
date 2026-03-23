"use client";

import { Dialog } from "@headlessui/react";
import { useState, useEffect, useCallback } from "react";
import { X, Target, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import ConfirmModal from "@/components/common/confirm_modal";
import { IApiResponse } from "@/lib/utils/response";
import { ESG_INDUSTRY_BENCHMARKS } from "@/constants/esg_industry_benchmarks";

interface IHistory {
  year: number;
  emissions: number | null;
  revenue: number | null;
  intensity: number | null;
  totalEmissionTarget: number | null;
  revenueEmissionTarget: number | null;
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
  esgIndustryId,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountBookId: string;
  esgIndustryId?: number | null;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ITargetInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Info: (20260323 - Julian) Local state to hold user edits
  const [draftTargets, setDraftTargets] = useState<
    Record<
      number,
      {
        totalEmissionTarget: number | null;
        revenueEmissionTarget: number | null;
      }
    >
  >({});

  const getIndustryRank = (
    target: number | null,
    industryId?: number | null,
  ): number | null => {
    if (target === null || !industryId) return null;
    const industry = ESG_INDUSTRY_BENCHMARKS.find((i) => i.id === industryId);
    if (!industry) return null;
    if (target <= industry.emissionPer10kMin) return 1;
    if (target >= industry.emissionPer10kMax) return 100;
    const rank =
      1 +
      ((target - industry.emissionPer10kMin) /
        (industry.emissionPer10kMax - industry.emissionPer10kMin)) *
      99;
    return Math.max(1, Math.min(100, Math.round(rank)));
  };

  const getGlobalRank = (target: number | null): number | null => {
    if (target === null) return null;
    const allMins = ESG_INDUSTRY_BENCHMARKS.map((i) => i.emissionPer10kMin);
    const allMaxs = ESG_INDUSTRY_BENCHMARKS.map((i) => i.emissionPer10kMax);
    const globalMin = Math.min(...allMins);
    const globalMax = Math.max(...allMaxs);
    if (target <= globalMin) return 1;
    if (target >= globalMax) return 100;
    const rank = 1 + ((target - globalMin) / (globalMax - globalMin)) * 99;
    return Math.max(1, Math.min(100, Math.round(rank)));
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request<IApiResponse<ITargetInfo>>(
        `/api/v1/user/account_book/${accountBookId}/esg/target`,
      );
      if (res.payload) {
        setData(res.payload);
        const drafts: Record<
          number,
          {
            totalEmissionTarget: number | null;
            revenueEmissionTarget: number | null;
          }
        > = {};
        res.payload.history.forEach((h) => {
          drafts[h.year] = {
            totalEmissionTarget: h.totalEmissionTarget,
            revenueEmissionTarget: h.revenueEmissionTarget,
          };
        });
        setDraftTargets(drafts);
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

  const handleInputChange = (
    year: number,
    field: "totalEmissionTarget" | "revenueEmissionTarget",
    value: string,
  ) => {
    setDraftTargets((prev) => ({
      ...prev,
      [year]: {
        ...prev[year],
        [field]: value === "" ? null : parseFloat(value),
      },
    }));
  };

  const handleSave = async () => {
    if (!data) return;
    try {
      setSaving(true);
      // Info: (20260322 - Luphia) Save all years that have changed or just save all for simplicity
      const promises = data.history.map((h) => {
        const draft = draftTargets[h.year];
        if (
          draft.totalEmissionTarget !== h.totalEmissionTarget ||
          draft.revenueEmissionTarget !== h.revenueEmissionTarget
        ) {
          return request(
            `/api/v1/user/account_book/${accountBookId}/esg/target`,
            {
              method: "POST",
              body: JSON.stringify({
                year: h.year,
                totalEmissionTarget: draft.totalEmissionTarget,
                revenueEmissionTarget: draft.revenueEmissionTarget,
              }),
            },
          );
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      onClose();
    } catch (e) {
      console.error("Failed to save targets", e);
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = () => {
    if (!data) return false;
    for (const h of data.history) {
      const draft = draftTargets[h.year];
      if (!draft) continue;
      if (
        draft.totalEmissionTarget !== h.totalEmissionTarget ||
        draft.revenueEmissionTarget !== h.revenueEmissionTarget
      ) {
        return true;
      }
    }
    return false;
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setIsConfirmOpen(true);
      return;
    }
    onClose();
  };

  const renderYoY = (
    currentValue: number | null | undefined,
    previousValue: number | null | undefined,
  ) => {
    if (
      currentValue === null ||
      currentValue === undefined ||
      previousValue === null ||
      previousValue === undefined ||
      previousValue === 0
    )
      return null;
    const diff = Number(currentValue) - Number(previousValue);
    const percent = Math.abs((diff / Number(previousValue)) * 100).toFixed(1);
    if (diff < 0) {
      return (
        <div className="mt-1.5 w-full justify-end text-[11px] whitespace-nowrap text-green-600">
          {t("esg_target.yoy_reduction", { percent })}
        </div>
      );
    } else if (diff > 0) {
      return (
        <div className="mt-1.5 w-full justify-end text-[11px] whitespace-nowrap text-red-500">
          {t("esg_target.yoy_increase", { percent })}
        </div>
      );
    } else {
      return (
        <div className="mt-1.5 w-full justify-end text-[11px] whitespace-nowrap text-slate-500">
          {t("esg_target.yoy_same")}
        </div>
      );
    }
  };

  return (
    <Dialog
      open={isOpen}
      as="div"
      className="relative z-50"
      onClose={handleClose}
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left align-middle shadow-2xl">
            {/* Info: (20260323 - Julian) Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {t("esg_target.title")}
                </h3>
                {esgIndustryId
                  ? (() => {
                    const industry = ESG_INDUSTRY_BENCHMARKS.find(
                      (i) => i.id === esgIndustryId,
                    );
                    const industryName = industry
                      ? t(industry.industryName)
                      : "";
                    return industryName ? (
                      <div className="ml-3 hidden items-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-50 px-3 py-1 text-[13px] font-medium text-slate-700 shadow-sm sm:inline-flex">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-sm"></span>
                        {t("esg_target.industry_classification", {
                          industry: industryName,
                        })}
                      </div>
                    ) : null;
                  })()
                  : null}
              </div>
              <button
                aria-label="Close"
                onClick={handleClose}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                disabled={saving}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex h-64 flex-1 items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="w-full flex-1 overflow-y-auto bg-white p-6">
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full min-w-[450px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-xs tracking-wider text-slate-500 uppercase shadow-sm">
                      <tr>
                        <th className="bg-slate-50 px-4 py-3 font-medium">
                          {t("esg_target.year")}
                        </th>

                        <th className="bg-slate-50 px-4 py-3 text-right font-medium">
                          {t("esg_target.target_total_emissions")}
                        </th>
                        <th className="bg-slate-50 px-4 py-3 text-right font-medium">
                          {t("esg_target.target_revenue_emissions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium whitespace-nowrap text-slate-700">
                      {data?.history && data.history.length > 0 ? (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data.history.map((h: any) => {
                          const draft = draftTargets[h.year] || {
                            totalEmissionTarget: null,
                            revenueEmissionTarget: null,
                          };
                          const prevYearData = data.history.find(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (x: any) => x.year === h.year - 1,
                          );
                          const prevTotalActual = prevYearData?.emissions
                            ? prevYearData.emissions / 1000
                            : null;
                          const prevRevActual =
                            prevYearData?.emissions && prevYearData?.revenue
                              ? prevYearData.emissions /
                              1000 /
                              (prevYearData.revenue / 10000)
                              : null;
                          return (
                            <tr
                              key={h.year}
                              className="transition-colors hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {h.year}
                              </td>

                              <td className="px-4 py-2 text-right align-top">
                                <input
                                  type="number"
                                  aria-label="Total Emission Target"
                                  value={draft.totalEmissionTarget ?? ""}
                                  onChange={(e) =>
                                    handleInputChange(
                                      h.year,
                                      "totalEmissionTarget",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full max-w-[160px] rounded-md border border-slate-300 px-3 py-1.5 text-right text-sm placeholder:text-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                                  placeholder="-"
                                />
                                {renderYoY(
                                  draft.totalEmissionTarget,
                                  prevTotalActual,
                                )}
                              </td>
                              <td className="px-4 py-2 text-right align-top">
                                <input
                                  type="number"
                                  aria-label="Revenue Emission Target"
                                  value={draft.revenueEmissionTarget ?? ""}
                                  onChange={(e) =>
                                    handleInputChange(
                                      h.year,
                                      "revenueEmissionTarget",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full max-w-[160px] rounded-md border border-slate-300 px-3 py-1.5 text-right text-sm placeholder:text-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                                  placeholder="-"
                                />
                                {renderYoY(
                                  draft.revenueEmissionTarget,
                                  prevRevActual,
                                )}
                                {draft.revenueEmissionTarget !== null &&
                                  esgIndustryId
                                  ? (() => {
                                    const globalRankStr = t(
                                      "esg_target.global_rank",
                                      {
                                        rank:
                                          getGlobalRank(
                                            draft.revenueEmissionTarget,
                                          ) || 0,
                                      },
                                    );
                                    const industryRankStr = t(
                                      "esg_target.industry_rank",
                                      {
                                        rank:
                                          getIndustryRank(
                                            draft.revenueEmissionTarget,
                                            esgIndustryId,
                                          ) || 0,
                                      },
                                    );
                                    return (
                                      <div className="mt-1.5 flex flex-col items-end gap-1 text-[11px] whitespace-nowrap text-slate-500">
                                        <span>
                                          {t("esg_target.target_estimation", {
                                            global_rank: globalRankStr,
                                            industry_rank: industryRankStr,
                                          })}
                                        </span>
                                      </div>
                                    );
                                  })()
                                  : null}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-12 text-center text-slate-400"
                          >
                            {t("esg_summary.no_data_prefix")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="shrink-0 rounded-b-2xl border-t border-slate-200 bg-white px-6 py-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#FF5A1F] px-8 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#E04914] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("esg_target.save")}
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-lg border border-slate-300 bg-white px-8 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none disabled:opacity-50 sm:mt-0 sm:w-auto"
                onClick={handleClose}
                disabled={saving}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={t("esg_target.unsaved_changes_title")}
        message={t("esg_target.unsaved_changes_warning")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={onClose}
      />
    </Dialog>
  );
}
