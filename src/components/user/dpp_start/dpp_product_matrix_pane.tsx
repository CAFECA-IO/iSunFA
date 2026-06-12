import { useTranslation } from "@/i18n/i18n_context";
import {
  DownloadCloud,
  Settings,
  AlertCircle,
  CheckCircle2,
  Network,
  Lightbulb,
  Search,
  Zap,
} from "lucide-react";

export interface IProductItem {
  productId: string;
  productName: string;
  progress: {
    hasSpecs: boolean;
    hasImage: boolean;
    dppGroundTruthFile?: string;
    dppComplianceFile?: string;
  };
}

interface IDppProductMatrixPaneProps {
  products: IProductItem[];
  isGenerating: boolean;
  onDownloadSku: (productId: string) => void;
  onAddSku: () => void;
  onViewProductDetails: (productId: string) => void;
}

export function DppProductMatrixPane({
  products,
  isGenerating,
  onDownloadSku,
  onAddSku,
  onViewProductDetails,
}: IDppProductMatrixPaneProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/50 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Network className="h-5 w-5 text-indigo-600" />
            {t("digital_product_passport.simulator.matrix_title") ||
              "產品組合 (Unique)"}
          </h2>
          <p className="mt-1 flex text-xs text-gray-500">
            <Lightbulb className="mt-0.5 mr-1.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            {t("digital_product_passport.simulator.matrix_desc") ||
              "管理旗下所有產品 SKU，並生成可供上傳驗證的 DPP 模擬資料檔。"}
          </p>
        </div>
        <button
          onClick={onAddSku}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 disabled:opacity-50"
        >
          <Zap className="h-4 w-4" />
          {t("digital_product_passport.simulator.add_sku") ||
            "⚡ AI 自動建立模擬 SKU"}
        </button>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const isComplete =
              p.progress.hasSpecs &&
              p.progress.hasImage &&
              !!p.progress.dppGroundTruthFile &&
              !!p.progress.dppComplianceFile;

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
                        "資料狀態"}
                      ：
                    </p>
                    {isComplete ? (
                      <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> 資料齊全 (可下載)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-600">
                        <AlertCircle className="h-4 w-4" /> 資料處理中或不完整
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-4">
                  <button
                    onClick={() => onViewProductDetails(p.productId)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 py-2 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-100 disabled:opacity-50"
                  >
                    <Search className="h-4 w-4" />
                    {t("digital_product_passport.simulator.view_sku_details") ||
                      "查看 SKU 數據細節"}
                  </button>
                  <button
                    onClick={() => onDownloadSku(p.productId)}
                    disabled={isGenerating || !isComplete}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-50"
                  >
                    <DownloadCloud className="h-4 w-4" />
                    {t("digital_product_passport.simulator.download_sku") ||
                      "下載模擬資料檔 (供上傳測試)"}
                  </button>
                </div>
              </div>
            );
          })}

          {products.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-slate-500">
              <p className="text-sm font-medium">
                {t("digital_product_passport.simulator.empty_product_data") ||
                  "尚無產品資料，請先生成公司公用資料或新增模擬產品。"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
