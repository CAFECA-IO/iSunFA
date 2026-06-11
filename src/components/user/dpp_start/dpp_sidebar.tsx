import { ICompanySearchResult } from "@/app/(landing)/digital_product_passport_simulator/start/page";
import {
  Loader2,
  AlertCircle,
  CircleDashed,
  CheckCircle2,
  FileText,
  Sparkles,
  DownloadCloud,
} from "lucide-react";
import { CompanySearchInput } from "@/components/common/company_search_input";
import { useTranslation } from "@/i18n/i18n_context";

// Info: (20260609 - Tzuhan) 繪製狀態圖示
const renderStateIcon = (
  status: "pending" | "running" | "completed" | "error" | "extrapolated",
) => {
  switch (status) {
    case "pending":
      return <CircleDashed className="h-6 w-6 text-slate-300" />;
    case "running":
      return (
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
      );
    case "completed":
      return <CheckCircle2 className="h-6 w-6 text-orange-500" />;
    case "error":
      return <AlertCircle className="h-6 w-6 stroke-[2.5px] text-red-500" />;
    case "extrapolated":
      return <Sparkles className="h-6 w-6 text-purple-500" />;
  }
};

export interface IDppStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error" | "extrapolated";
  log?: string;
  file?: string;
}

export interface IDppSidebarProps {
  keyword: string;
  setKeyword: (val: string) => void;
  selectedCompany: ICompanySearchResult | null;
  handleSelectCompany: (c: ICompanySearchResult) => void;
  year: string;
  setYear: (val: string) => void;
  isGenerating: boolean;
  startGeneration: (company?: ICompanySearchResult, mode?: string) => void;
  showExtrapolationAlert: boolean;
  steps: IDppStep[];
  products?: { productId: string; productName: string }[];
  selectedProductId?: string;
  setSelectedProductId?: (id: string) => void;
  onStepClick?: (step: IDppStep) => void;
}

export function DppSidebar({
  keyword,
  setKeyword,
  selectedCompany,
  handleSelectCompany,
  year,
  setYear,
  isGenerating,
  startGeneration,
  showExtrapolationAlert,
  steps,
  products = [],
  selectedProductId = "",
  setSelectedProductId = () => {},
  onStepClick = () => {},
}: IDppSidebarProps) {
  const { t } = useTranslation();
  return (
    <div className="relative z-20 flex h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:w-[420px]">
      <div className="border-b border-gray-100 bg-slate-50/50 p-5">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="companyKeyword"
              className="mb-1 block text-xs font-bold text-slate-700"
            >
              {t("digital_product_passport.sidebar_extra.target_enterprise")}
            </label>
            <CompanySearchInput
              value={keyword}
              onChange={setKeyword}
              onSelect={handleSelectCompany}
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label
                htmlFor="yearSelect"
                className="mb-1 block text-xs font-bold text-slate-700"
              >
                {t("digital_product_passport.sidebar_extra.year")}
              </label>
              <select
                id="yearSelect"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isGenerating}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="2025">
                  {t("digital_product_passport.sidebar_extra.year_prediction")}
                </option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>
          </div>

          {(() => {
            const hasFin = steps[0]?.status === "completed";
            const hasEsg =
              steps[1]?.status === "completed" ||
              steps[1]?.status === "extrapolated";
            const hasPersona = steps[3]?.status === "completed";
            const isPartial = (hasFin || hasEsg) && !hasPersona;
            const isAllDone = hasPersona;

            return (
              <div className="mt-2 flex flex-col gap-2">
                <button
                  onClick={() => startGeneration(undefined, "download_only")}
                  disabled={!selectedCompany || isGenerating}
                  className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      {t("digital_product_passport.sidebar_extra.processing")}
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="mr-2 h-4 w-4" />{" "}
                      {t(
                        "digital_product_passport.sidebar_extra.download_reports",
                      )}
                    </>
                  )}
                </button>
                <button
                  onClick={() =>
                    startGeneration(
                      undefined,
                      isAllDone ? "all" : isPartial ? "generate_only" : "all",
                    )
                  }
                  disabled={
                    !selectedCompany || isGenerating || (!hasFin && !hasEsg)
                  }
                  className="flex w-full items-center justify-center rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-700 disabled:bg-slate-300"
                >
                  <Sparkles className="mr-2 h-4 w-4" />{" "}
                  {isAllDone
                    ? t(
                        "digital_product_passport.sidebar_extra.regenerate_persona",
                      )
                    : t("digital_product_passport.sidebar_extra.execute_ai")}
                </button>
                {isAllDone && (
                  <button
                    onClick={() =>
                      startGeneration(undefined, "dpp_catalog_only")
                    }
                    disabled={isGenerating}
                    className="mt-1 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />{" "}
                    {steps[4]?.status === "completed"
                      ? t(
                          "digital_product_passport.sidebar_extra.regenerate_bom",
                        )
                      : t(
                          "digital_product_passport.sidebar_extra.generate_bom",
                        )}
                  </button>
                )}
                {steps[4]?.status === "completed" &&
                  products &&
                  products.length > 0 && (
                    <div className="mt-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      <label
                        htmlFor="productSelect"
                        className="mb-2 block text-xs font-bold text-slate-700"
                      >
                        {t(
                          "digital_product_passport.sidebar_extra.select_product_dpp",
                        )}
                      </label>
                      <select
                        id="productSelect"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId?.(e.target.value)}
                        disabled={isGenerating}
                        className="mb-3 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {products.map((p) => (
                          <option key={p.productId} value={p.productId}>
                            {p.productName} ({p.productId})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          startGeneration(undefined, "product_dpp_only")
                        }
                        disabled={isGenerating || !selectedProductId}
                        className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />{" "}
                        {steps[5]?.status === "completed"
                          ? t(
                              "digital_product_passport.sidebar_extra.regenerate_dpp",
                            )
                          : t(
                              "digital_product_passport.sidebar_extra.generate_dpp",
                            )}
                      </button>
                    </div>
                  )}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto bg-white p-4">
        <h3 className="mb-4 text-xs font-bold tracking-widest text-slate-500 uppercase">
          {t("digital_product_passport.sidebar_extra.pipeline_execution")}
        </h3>
        {showExtrapolationAlert && (
          <div className="animate-in fade-in slide-in-from-top-4 mb-4 flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm duration-500">
            <div className="flex items-center text-sm font-bold text-orange-800">
              <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
              {t(
                "digital_product_passport.sidebar_extra.extrapolation_alert_title",
              )}
            </div>
            <div className="pl-6 text-[11px] leading-relaxed text-orange-700/80">
              {t(
                "digital_product_passport.sidebar_extra.extrapolation_alert_desc",
              )}
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                <li>
                  {t(
                    "digital_product_passport.sidebar_extra.extrapolation_bullet1",
                  )}
                </li>
                <li>
                  {t(
                    "digital_product_passport.sidebar_extra.extrapolation_bullet2",
                  )}
                </li>
                <li>
                  {t(
                    "digital_product_passport.sidebar_extra.extrapolation_bullet3",
                  )}
                </li>
              </ul>
            </div>
          </div>
        )}
        <div className="relative mt-2 flex flex-col gap-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() =>
                onStepClick && step.status === "completed" && onStepClick(step)
              }
              className={`group relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all lg:gap-4 ${
                step.status === "running"
                  ? "border-orange-100 bg-orange-50"
                  : step.status === "completed" ||
                      step.status === "extrapolated"
                    ? "cursor-pointer border-transparent hover:border-slate-200 hover:bg-slate-50"
                    : "border-transparent opacity-70"
              } `}
              disabled={
                step.status !== "completed" &&
                step.status !== "extrapolated" &&
                step.status !== "running"
              }
            >
              <div className="relative flex shrink-0 items-center justify-center rounded-full bg-transparent lg:bg-white">
                {renderStateIcon(step.status)}
              </div>
              <div className="min-w-0 flex-1">
                <h4
                  className={`mb-0.5 truncate text-sm font-semibold transition-colors ${step.status === "running" ? "text-orange-900" : step.status === "completed" || step.status === "extrapolated" ? "text-slate-800" : "text-slate-500"} `}
                >
                  {step.label}
                </h4>
                {step.status === "completed" && step.file && (
                  <div className="mt-0.5 flex items-center text-xs text-slate-400">
                    <FileText className="mr-1 h-3.5 w-3.5" />
                    {t("digital_product_passport.sidebar_extra.click_to_view")}
                  </div>
                )}
                {step.log && (
                  <div className="mt-1 rounded-lg bg-slate-900/5 p-2 text-left font-mono text-xs break-all text-slate-600">
                    &gt; {step.log}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
