import { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  DownloadCloud,
  Plus,
  Settings,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export interface IProductGapSettings {
  includeBom: boolean;
  includeLca: boolean;
}

interface IDppProductMatrixPaneProps {
  products: { productId: string; productName: string }[];
  isGenerating: boolean;
  onDownloadSku: (productId: string, gapSettings: IProductGapSettings) => void;
  onAddSku: () => void;
}

export function DppProductMatrixPane({
  products,
  isGenerating,
  onDownloadSku,
  onAddSku,
}: IDppProductMatrixPaneProps) {
  const { t } = useTranslation();

  // Local state to track gap settings for each product
  const [gapSettingsMap, setGapSettingsMap] = useState<
    Record<string, IProductGapSettings>
  >({});

  const handleToggleGap = (
    productId: string,
    field: keyof IProductGapSettings,
  ) => {
    setGapSettingsMap((prev) => {
      const current = prev[productId] || { includeBom: true, includeLca: true };
      return { ...prev, [productId]: { ...current, [field]: !current[field] } };
    });
  };

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/50 p-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            📊{" "}
            {t("digital_product_passport.simulator.matrix_title") ||
              "產品組合與 Gap 設定 (Unique)"}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            💡{" "}
            {t("digital_product_passport.simulator.matrix_desc") ||
              "請為不同產品 SKU 設定不同的缺陷情境，體驗判定。"}
          </p>
        </div>
        <button
          onClick={onAddSku}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {t("digital_product_passport.simulator.add_sku") ||
            "新增模擬產品 SKU"}
        </button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const settings = gapSettingsMap[p.productId] || {
              includeBom: true,
              includeLca: true,
            };
            const isPerfect = settings.includeBom && settings.includeLca;
            const isMissingLca = settings.includeBom && !settings.includeLca;

            return (
              <div
                key={p.productId}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 bg-slate-50 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {p.productName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">SKU: {p.productId}</p>
                </div>

                <div className="flex-1 p-4">
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-bold text-slate-700">
                      {t("digital_product_passport.simulator.scenario") ||
                        "情境設定"}
                      ：
                    </p>
                    {isPerfect ? (
                      <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> 完美護照 (全勾)
                      </div>
                    ) : isMissingLca ? (
                      <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-600">
                        <AlertCircle className="h-4 w-4" /> 缺陷護照 (缺碳排)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600">
                        <AlertCircle className="h-4 w-4" /> 嚴重缺陷
                        (缺物流與碳排)
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700">
                      {t("digital_product_passport.simulator.gap_settings") ||
                        "Gap 設定 (僅針對此產品獨有數據)"}
                    </p>
                    <label className="group flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.includeBom}
                        onChange={() =>
                          handleToggleGap(p.productId, "includeBom")
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 transition-all focus:ring-blue-500"
                      />
                      <span
                        className={`text-sm ${settings.includeBom ? "text-slate-700" : "text-slate-400 line-through"} transition-colors`}
                      >
                        {t("digital_product_passport.simulator.gap_bom") ||
                          "產品與物流資訊 (BOM)"}
                      </span>
                    </label>
                    <label className="group flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.includeLca}
                        onChange={() =>
                          handleToggleGap(p.productId, "includeLca")
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 transition-all focus:ring-blue-500"
                      />
                      <span
                        className={`text-sm ${settings.includeLca ? "text-slate-700" : "text-slate-400 line-through"} transition-colors`}
                      >
                        {t("digital_product_passport.simulator.gap_lca") ||
                          "環境影響報告 (LCA)"}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                  <button
                    onClick={() => onDownloadSku(p.productId, settings)}
                    disabled={isGenerating}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    <DownloadCloud className="h-4 w-4" />
                    {t("digital_product_passport.simulator.download_sku") ||
                      "生成與下載 SKU 檔案包"}
                  </button>
                </div>
              </div>
            );
          })}

          {products.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-slate-500">
              <p className="text-sm font-medium">
                尚無產品資料，請先生成公司公用資料或新增模擬產品。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
