import { useTranslation } from "@/i18n/i18n_context";
import { CheckCircle2, BarChart2, Zap } from "lucide-react";

interface IDppCompanyBaselinePaneProps {
  isGenerating: boolean;
  onViewDetails: () => void;
  onRegenerate: () => void;
}

export function DppCompanyBaselinePane({
  isGenerating,
  onViewDetails,
  onRegenerate,
}: IDppCompanyBaselinePaneProps) {
  const { t } = useTranslation();

  const baselineModules = [
    t("digital_product_passport.simulator.baseline_manufacturer") ||
      "製造商 (Manufacturer)",
    t("digital_product_passport.simulator.baseline_traceability") ||
      "供應鏈追溯 (Traceability)",
    t("digital_product_passport.simulator.baseline_circularity") ||
      "循環性與效率政策 (Circularity)",
    t("digital_product_passport.simulator.baseline_compliance") ||
      "技術手冊 & 合規稽核政策 (Compliance)",
    t("digital_product_passport.simulator.baseline_material") ||
      "材料組成政策 (Material Composition)",
  ];

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-gray-200 bg-white shadow-sm lg:w-[450px]">
      <div className="border-b border-gray-100 bg-slate-50/50 p-5">
        <h2 className="text-lg font-bold text-gray-900">
          📦{" "}
          {t("digital_product_passport.simulator.baseline_title") ||
            "公司公用 Baseline 資料集"}
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          💡{" "}
          {t("digital_product_passport.simulator.baseline_desc") ||
            "此資料集由財報 & ESG 報告反推。作為所有產品模擬的共用基礎。"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-3">
          {baselineModules.map((mod, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-slate-700">{mod}</span>
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
