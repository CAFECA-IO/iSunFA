import { useTranslation } from "@/i18n/i18n_context";
import {
  CheckCircle2,
  BarChart2,
  Zap,
  Building2,
  Lightbulb,
} from "lucide-react";

interface IDppCompanyBaselinePaneProps {
  isGenerating: boolean;
  onViewDetails: () => void;
  onRegenerate: () => void;
  progress?: {
    hasFin: boolean;
    hasEsg: boolean;
    hasPersonaHtml: boolean;
    hasBom: boolean;
  };
}

export function DppCompanyBaselinePane({
  isGenerating,
  onViewDetails,
  onRegenerate,
  progress = {
    hasFin: false,
    hasEsg: false,
    hasPersonaHtml: false,
    hasBom: false,
  },
}: IDppCompanyBaselinePaneProps) {
  const { t } = useTranslation();

  const baselineModules = [
    {
      name:
        t("digital_product_passport.simulator.baseline_manufacturer") ||
        "製造商 (Manufacturer)",
      completed: !!progress?.hasFin,
    },
    {
      name:
        t("digital_product_passport.simulator.baseline_traceability") ||
        "供應鏈追溯 (Traceability)",
      completed: !!progress?.hasBom,
    },
    {
      name:
        t("digital_product_passport.simulator.baseline_circularity") ||
        "循環性與效率政策 (Circularity)",
      completed: !!progress?.hasEsg,
    },
    {
      name:
        t("digital_product_passport.simulator.baseline_compliance") ||
        "技術手冊 & 合規稽核政策 (Compliance)",
      completed: !!progress?.hasPersonaHtml,
    },
    {
      name:
        t("digital_product_passport.simulator.baseline_material") ||
        "材料組成政策 (Material Composition)",
      completed: !!progress?.hasBom,
    },
  ];

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm lg:w-[450px]">
      <div className="border-b border-gray-100 bg-slate-50/50 p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Building2 className="h-5 w-5 text-blue-600" />
          {t("digital_product_passport.simulator.baseline_title") ||
            "公司公用 Baseline 資料集"}
        </h2>
        <p className="mt-1 flex text-xs text-gray-500">
          <Lightbulb className="mt-0.5 mr-1.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          {t("digital_product_passport.simulator.baseline_desc") ||
            "此資料集由財報 & ESG 報告反推。作為所有產品模擬的共用基礎。"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-3">
          {baselineModules.map((mod, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 rounded-lg border p-3 ${mod.completed ? "border-emerald-100 bg-emerald-50/30" : "border-slate-100 bg-slate-50 opacity-60"}`}
            >
              {mod.completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 bg-transparent text-slate-300">
                  <span className="text-[10px] font-bold">!</span>
                </div>
              )}
              <span
                className={`text-sm font-medium ${mod.completed ? "text-slate-700" : "text-slate-500"}`}
              >
                {mod.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-100 p-5">
        <button
          onClick={onViewDetails}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
        >
          <BarChart2 className="h-4 w-4" />
          {t("digital_product_passport.simulator.view_baseline_details") ||
            "查看 Baseline 生成詳情"}
        </button>
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-700 disabled:bg-slate-300"
        >
          <Zap className="h-4 w-4" />
          {isGenerating
            ? t("common.processing") || "處理中..."
            : t("digital_product_passport.simulator.regenerate_baseline") ||
              "重新生成公司公用資料"}
        </button>
      </div>
    </div>
  );
}
