import { useTranslation } from "@/i18n/i18n_context";
import {
  CheckCircle2,
  BarChart2,
  Zap,
  Building2,
  Lightbulb,
  Info,
} from "lucide-react";

interface IDppCompanyBaselinePaneProps {
  isGenerating: boolean;
  onViewDetails: () => void;
  onRegenerate: () => void;
  progress?: {
    hasFin: boolean;
    hasEsg: boolean;
    hasEsgExtrapolation?: boolean;
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
    hasEsgExtrapolation: false,
    hasPersonaHtml: false,
    hasBom: false,
  },
}: IDppCompanyBaselinePaneProps) {
  const { t } = useTranslation();

  const baselineModules = [
    {
      name:
        t("digital_product_passport.simulator.baseline_manufacturer") ||
        "🏢 製造商 (Manufacturer)",
      completed: !!progress?.hasFin,
    },
    {
      name: (
        <span className="flex items-center">
          {t("digital_product_passport.simulator.baseline_circularity") ||
            "♻️ 循環性與效率政策 (Circularity)"}
          {progress?.hasEsgExtrapolation && !progress?.hasEsg && (
            <div className="group relative ml-2 flex items-center">
              <span className="flex items-center gap-1 rounded-sm border border-purple-200 bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                ✨ AI 推估
                <Info className="h-3 w-3" />
              </span>
              <div className="invisible absolute right-0 bottom-full z-50 mb-2 w-64 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                <div className="relative rounded-lg bg-slate-800 p-3 text-xs leading-relaxed font-normal whitespace-normal text-slate-100 shadow-xl">
                  AI
                  跨年推估原則：系統自動抓取上一年度的永續報告書基準，並結合本年度最新的財務與營收財報數據，透過大語言模型動態推算出本年度的碳排與能源消耗指標。
                  <div className="absolute top-full right-4 h-2 w-2 -translate-y-1/2 rotate-45 bg-slate-800"></div>
                </div>
              </div>
            </div>
          )}
        </span>
      ),
      completed: !!progress?.hasEsg || !!progress?.hasEsgExtrapolation,
    },
    {
      name:
        t("digital_product_passport.simulator.baseline_compliance") ||
        "🎯 企業營運與政策方針 (Company Policy & Persona)",
      completed: !!progress?.hasPersonaHtml,
    },
    {
      name:
        t("digital_product_passport.simulator.baseline_traceability") ||
        "🔗 供應鏈追溯與物料庫 (Traceability & Material)",
      completed: !!progress?.hasBom,
    },
  ];

  const hasAnyProgress =
    progress?.hasFin ||
    progress?.hasEsg ||
    progress?.hasPersonaHtml ||
    progress?.hasBom;

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
            : hasAnyProgress
              ? t("digital_product_passport.simulator.regenerate_baseline") ||
                "重新生成公司公用資料"
              : t("digital_product_passport.start.start_generation") ||
                "⚡ 開始提取企業 Baseline (Start Generation)"}
        </button>
      </div>
    </div>
  );
}
