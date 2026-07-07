import { ICompanySearchResult } from "@/app/(landing)/digital_product_passport_simulator/start/page";
import {
  AlertCircle,
  CircleDashed,
  CheckCircle2,
  FileText,
  Sparkles,
  Building2,
  Package,
  Info,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

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

export interface IDppLogsNavigatorProps {
  selectedCompany: ICompanySearchResult | null;
  year: string;
  steps: IDppStep[];
  products?: { productId: string; productName: string }[];
  activeTabContext: string | null; // Info: (20260612 - Tzuhan) "baseline" or productId
  onTabChange: (tabContext: string) => void;
  onStepClick?: (step: IDppStep) => void;
}

export function DppLogsNavigator({
  selectedCompany,
  year,
  steps,
  products = [],
  activeTabContext,
  onTabChange,
  onStepClick = () => {},
}: IDppLogsNavigatorProps) {
  const { t } = useTranslation();

  // Info: (20260612 - Tzuhan) Filter steps based on active context
  const isBaseline = activeTabContext === "baseline" || !activeTabContext;

  // Info: (20260612 - Tzuhan) Baseline gets steps 0-4
  // Info: (20260612 - Tzuhan) Product gets steps 5-8

  return (
    <div className="relative z-20 flex h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:w-[420px]">
      <div className="border-b border-gray-100 bg-slate-50/50 p-0">
        <div className="no-scrollbar flex w-full overflow-x-auto border-b border-gray-200">
          <button
            onClick={() => onTabChange("baseline")}
            className={`flex flex-shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${isBaseline ? "border-b-2 border-orange-600 bg-orange-50/50 text-orange-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
          >
            <Building2 className="h-4 w-4" />
            {t("digital_product_passport.simulator.baseline_tab")}
          </button>
          {products.map((p) => {
            const isActive = activeTabContext === p.productId;
            return (
              <button
                key={p.productId}
                onClick={() => onTabChange(p.productId)}
                className={`flex flex-shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${isActive ? "border-b-2 border-orange-600 bg-orange-50/50 text-orange-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
              >
                <Package className="h-4 w-4" />
                {p.productId}
              </button>
            );
          })}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto bg-white p-4">
        <h3 className="mb-4 text-xs font-bold tracking-widest text-slate-500 uppercase">
          {t("digital_product_passport.sidebar_extra.pipeline_execution")}
        </h3>

        <div className="relative">
          {(() => {
            const renderStep = (step: IDppStep, globalIndex: number) => {
              if (!step) return null;
              const isCompleted =
                step.status === "completed" || step.status === "extrapolated";

              let actualFile = step.file;
              if (!isBaseline && activeTabContext && selectedCompany) {
                const baseDir = `data/${selectedCompany.taxId}/${year}/outputs/${activeTabContext}/mock_sources`;
                if (globalIndex === 5)
                  actualFile = `${baseDir}/${activeTabContext}_product_specs.json`;
                else if (globalIndex === 6)
                  actualFile = `${baseDir}/fastener_blueprint.png`;
                else if (globalIndex === 7)
                  actualFile = `${baseDir}/${activeTabContext}_dpp_ground_truth.json`;
                else if (globalIndex === 8)
                  actualFile = `${baseDir}/${activeTabContext}_dpp_compliance_declaration.md`;
              }

              return (
                <div key={step.id} className="relative mb-6 last:mb-0">
                  <div className="absolute top-1 -left-[29px] bg-white">
                    {renderStateIcon(step.status)}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`flex items-center text-sm font-bold ${isCompleted ? "text-slate-800" : "text-slate-400"}`}
                    >
                      {step.label}
                      {step.id === "esg" && step.status === "extrapolated" && (
                        <div className="group relative ml-2 flex items-center">
                          <Info className="h-4 w-4 cursor-pointer text-purple-500 hover:text-purple-600" />
                          <div className="invisible absolute bottom-full left-0 z-50 mb-2 w-64 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                            <div className="relative rounded-lg bg-slate-800 p-3 text-xs leading-relaxed font-normal tracking-wide whitespace-normal text-slate-100 shadow-xl">
                              {t(
                                "digital_product_passport.simulator.cbam_extrapolation_tooltip",
                              )}
                              <div className="absolute top-full left-2 h-2 w-2 -translate-y-1/2 rotate-45 bg-slate-800"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </span>

                    {step.log && (
                      <div className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-green-400">
                        <pre className="leading-relaxed whitespace-pre-wrap">
                          {step.log}
                        </pre>
                      </div>
                    )}

                    {actualFile && (
                      <button
                        onClick={() =>
                          onStepClick({ ...step, file: actualFile })
                        }
                        className="mt-2 flex w-fit items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600"
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        {isCompleted
                          ? t(
                              "digital_product_passport.preview_extra.view_generated_output",
                            )
                          : t(
                              "digital_product_passport.preview_extra.file_not_found",
                            )}
                      </button>
                    )}
                  </div>
                </div>
              );
            };

            const renderBaselineGroup = (
              title: string,
              groupSteps: IDppStep[],
            ) => (
              <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50/50 p-4 last:mb-0">
                <h4 className="mb-6 flex items-center text-sm font-bold text-slate-800">
                  {title}
                </h4>
                <div className="relative ml-2 border-l-2 border-slate-200 pl-4">
                  {groupSteps.filter(Boolean).map((s) => {
                    const globalIndex = steps.indexOf(s);
                    return renderStep(s, globalIndex);
                  })}
                </div>
              </div>
            );

            if (isBaseline) {
              return (
                <div className="flex flex-col gap-4">
                  {renderBaselineGroup(
                    t("digital_product_passport.simulator.group_manufacturer"),
                    [steps[0]],
                  )}
                  {renderBaselineGroup(
                    t("digital_product_passport.simulator.group_circularity"),
                    [steps[1], steps[2]],
                  )}
                  {renderBaselineGroup(
                    t(
                      "digital_product_passport.simulator.group_company_policy",
                    ),
                    [steps[3]],
                  )}
                  {renderBaselineGroup(
                    t("digital_product_passport.simulator.group_traceability"),
                    [steps[4]],
                  )}
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-4">
                {renderBaselineGroup(
                  t("digital_product_passport.simulator.group_product_specs"),
                  [steps[5], steps[6]],
                )}
                {renderBaselineGroup(
                  t("digital_product_passport.simulator.group_dpp_core"),
                  [steps[7], steps[8]],
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
