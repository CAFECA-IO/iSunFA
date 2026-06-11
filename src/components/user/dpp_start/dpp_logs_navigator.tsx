import { ICompanySearchResult } from "@/app/(landing)/digital_product_passport_simulator/start/page";
import {
  AlertCircle,
  CircleDashed,
  CheckCircle2,
  FileText,
  Sparkles,
  Building2,
  Package,
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
  activeTabContext: string | null; // "baseline" or productId
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

  // Filter steps based on active context
  const isBaseline = activeTabContext === "baseline" || !activeTabContext;

  // Baseline gets steps 0-4
  // Product gets steps 5-8
  const displayedSteps = isBaseline ? steps.slice(0, 5) : steps.slice(5, 9);
  const stepOffset = isBaseline ? 0 : 5;

  return (
    <div className="relative z-20 flex h-full w-full flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:w-[420px]">
      <div className="border-b border-gray-100 bg-slate-50/50 p-0">
        <div className="no-scrollbar flex w-full overflow-x-auto border-b border-gray-200">
          <button
            onClick={() => onTabChange("baseline")}
            className={`flex flex-shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${isBaseline ? "border-b-2 border-blue-600 bg-blue-50/50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
          >
            <Building2 className="h-4 w-4" />
            企業 Baseline
          </button>
          {products.map((p) => {
            const isActive = activeTabContext === p.productId;
            return (
              <button
                key={p.productId}
                onClick={() => onTabChange(p.productId)}
                className={`flex flex-shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${isActive ? "border-b-2 border-blue-600 bg-blue-50/50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
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

        <div className="relative border-l-2 border-slate-100 pl-4">
          {displayedSteps.map((step, index) => {
            const globalIndex = index + stepOffset;
            const isCompleted =
              step.status === "completed" || step.status === "extrapolated";

            // Recompute step file path if it's a product step to avoid singleton overlap
            let actualFile = step.file;
            if (!isBaseline && activeTabContext && selectedCompany) {
              const baseDir = `data/${selectedCompany.taxId}/${year}/outputs/products/${activeTabContext}`;
              if (globalIndex === 5)
                actualFile = `${baseDir}/product_specs.json`;
              else if (globalIndex === 6)
                actualFile = `${baseDir}/product_image.png`;
              else if (globalIndex === 7)
                actualFile = `${baseDir}/dpp_ground_truth.json`;
              else if (globalIndex === 8)
                actualFile = `${baseDir}/dpp_compliance_report.json`;
            }

            return (
              <div key={step.id} className="relative mb-6 last:mb-0">
                <div className="absolute top-1 -left-[29px] bg-white">
                  {renderStateIcon(step.status)}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-bold ${isCompleted ? "text-slate-800" : "text-slate-400"}`}
                  >
                    {step.label}
                  </span>

                  {step.log && (
                    <div className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-green-400">
                      <pre className="leading-relaxed whitespace-pre-wrap">
                        {step.log}
                      </pre>
                    </div>
                  )}

                  {actualFile && isCompleted && (
                    <button
                      onClick={() => onStepClick({ ...step, file: actualFile })}
                      className="mt-2 flex w-fit items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600"
                    >
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                      View Generated Output
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
