"use client";

// Info: (20260724 - Tzuhan) 匯出勾選選單(需求二):匯出範圍由使用者明確勾選,與畫面檢視狀態解耦
// Info: (20260724 - Tzuhan) 只列出適用性引擎判定為適用的方案;每個勾選方案將產出獨立 PDF

import { useState } from "react";
import {
  Truck,
  Ship,
  Plane,
  MapPin,
  Layers,
  X,
  FileDown,
  Leaf,
  FlaskConical,
} from "lucide-react";
import { RouteType } from "@/components/transportation_carbon_footprint_calculator/plan_section";
import { useTranslation } from "@/i18n/i18n_context";
import {
  DEFAULT_FACTOR_SET,
  FactorSetEnum,
  FACTOR_SET_ORDER,
  factorSetDeltaRatio,
  type IFactorSetImpact,
} from "@/constants/logistics_factor_sets";

/**
 * Info: (20260801 - Luphia) 匯出選項。改以物件回傳而非多個位置引數:
 * 選項只會越加越多,位置引數到第三個就無法從呼叫端看出哪個是哪個。
 */
export interface IExportOptions {
  plans: Set<RouteType>;
  /** Info: (20260801 - Luphia) 採用的排放係數組;預設為環境部 */
  factorSet: FactorSetEnum;
  /**
   * Info: (20260801 - Luphia) 是否計算二氧化碳當量。
   * 關閉時整份報告與 CSV 都不出現任何排放數值(不是算了才隱藏)——
   * 一份距離報告與一份「碳排為零」的報告是完全不同的主張。
   */
  includeCo2e: boolean;
}

interface IExportOptionsModalProps {
  availablePlans: RouteType[];
  /**
   * Info: (20260801 - Luphia) 各係數組對本次匯出的總排放試算。
   *
   * 由呼叫端以實際段落算出後傳入,而非在此給一個「約 ±X%」的通用數字 ——
   * 影響完全取決於路線組成:以長程空運為主的路線換組差 48%,純陸運只差 14%。
   * 通用百分比會在半數情況下誤導使用者。
   */
  factorSetImpacts?: IFactorSetImpact[];
  onConfirm: (options: IExportOptions) => void;
  onClose: () => void;
}

// Info: (20260729 - Tzuhan) issue 10:海陸空聯運列於海空之後
const PLAN_ORDER: RouteType[] = ["custom", "land", "sea", "air", "seaLandAir"];

const PLAN_ICONS: Record<RouteType, typeof Truck> = {
  land: Truck,
  sea: Ship,
  air: Plane,
  seaLandAir: Layers,
  custom: MapPin,
};

export function ExportOptionsModal({
  availablePlans,
  // Info: (20260801 - Luphia) 未提供試算時只列出係數組名稱,不顯示數值 —— 不以 0 充數
  factorSetImpacts = undefined,
  onConfirm,
  onClose,
}: IExportOptionsModalProps) {
  const { t } = useTranslation();
  // Info: (20260724 - Tzuhan) 預設全勾適用方案,使用者可自由取消
  const [selected, setSelected] = useState<Set<RouteType>>(
    new Set(availablePlans),
  );
  // Info: (20260801 - Luphia) 預設計算:碳足跡是本功能的主要目的,不計算是例外情形
  const [includeCo2e, setIncludeCo2e] = useState(true);
  // Info: (20260801 - Luphia) 預設環境部:主管機關收錄的係數優先於境外機構
  const [factorSet, setFactorSet] = useState<FactorSetEnum>(DEFAULT_FACTOR_SET);

  const togglePlan = (plan: RouteType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(plan)) {
        next.delete(plan);
      } else {
        next.add(plan);
      }
      return next;
    });
  };

  const orderedPlans = PLAN_ORDER.filter((plan) =>
    availablePlans.includes(plan),
  );

  const planLabel = (plan: RouteType) =>
    t(`transportation_carbon_footprint_calculator.export_options.plan_${plan}`);

  return (
    /* Info: (20260802 - Luphia) 補 h-dvh w-screen:`inset-0` 在部分瀏覽器以 layout viewport 為準,
       而本頁匯出流程會把 viewport meta 改為 width=1024(page.tsx),兩者不一致時遮罩高度會短少。
       捲動鎖定在 page.tsx 以 useScrollLock 處理 —— 對話框的開關狀態由該處持有。 */
    <div className="fixed inset-0 z-[110] flex h-dvh w-screen items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {t(
              "transportation_carbon_footprint_calculator.export_options.title",
            )}
          </h2>
          <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-gray-500">
          {t(
            "transportation_carbon_footprint_calculator.export_options.description",
          )}
        </p>

        <div className="flex flex-col gap-2">
          {orderedPlans.map((plan) => {
            const Icon = PLAN_ICONS[plan];
            const isChecked = selected.has(plan);
            return (
              <label
                key={plan}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                  isChecked
                    ? "border-orange-200 bg-orange-50 text-orange-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => togglePlan(plan)}
                  className="h-4 w-4 accent-orange-600"
                />
                <Icon className="h-4 w-4" />
                {planLabel(plan)}
              </label>
            );
          })}
        </div>

        {/* Info: (20260801 - Luphia) 碳排開關與方案勾選以分隔線區隔:
            前者決定「算什麼」,後者決定「算哪些路線」,是兩個不同層次的選擇 */}
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-all hover:bg-gray-50">
          <input
            type="checkbox"
            checked={includeCo2e}
            onChange={() => setIncludeCo2e((prev) => !prev)}
            className="mt-0.5 h-4 w-4 accent-orange-600"
          />
          <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-gray-700">
              {t(
                "transportation_carbon_footprint_calculator.export_options.include_co2e",
              )}
            </span>
            <span className="text-xs font-normal text-gray-500">
              {t(
                "transportation_carbon_footprint_calculator.export_options.include_co2e_hint",
              )}
            </span>
          </span>
        </label>

        {/* Info: (20260801 - Luphia) 係數組選擇。僅在要計算碳排時顯示 ——
            未計算碳排的報告不套用任何係數,選了也沒有意義 */}
        {includeCo2e && (
          <div className="mt-4 rounded-xl border border-gray-200 p-3">
            <div className="mb-2 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">
                {t(
                  "transportation_carbon_footprint_calculator.export_options.factor_set",
                )}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {FACTOR_SET_ORDER.map((key) => {
                const isChecked = factorSet === key;
                const impact = factorSetImpacts?.find(
                  (item) => item.setKey === key,
                );
                /**
                 * Info: (20260801 - Luphia) 直接顯示該組的實際總排放,而非只給百分比 ——
                 * 使用者要判斷的是「這份報告會報多少」,不是要自己套一個比例。
                 * 倍數另附於非預設組,供快速對照。
                 */
                const ratio =
                  key === DEFAULT_FACTOR_SET || !factorSetImpacts
                    ? undefined
                    : factorSetDeltaRatio(
                        factorSetImpacts,
                        DEFAULT_FACTOR_SET,
                        key,
                      );
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-xs transition-all ${
                      isChecked
                        ? "border-orange-200 bg-orange-50"
                        : "border-transparent hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="factorSet"
                      checked={isChecked}
                      onChange={() => setFactorSet(key)}
                      className="mt-0.5 h-3.5 w-3.5 accent-orange-600"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span
                        className={`font-semibold ${isChecked ? "text-orange-700" : "text-gray-700"}`}
                      >
                        {t(
                          `transportation_carbon_footprint_calculator.export_options.factor_set_${key.toLowerCase()}`,
                        )}
                        {key === DEFAULT_FACTOR_SET && (
                          <span className="ml-1.5 font-normal text-gray-400">
                            {t(
                              "transportation_carbon_footprint_calculator.export_options.factor_set_default",
                            )}
                          </span>
                        )}
                      </span>
                      {impact?.totalCo2eKg !== undefined && (
                        <span className="font-normal text-gray-500">
                          {`${Math.round(impact.totalCo2eKg).toLocaleString("en-US")} kg CO2e`}
                          {ratio !== undefined &&
                            ` · ${ratio >= 1 ? "+" : ""}${Math.round((ratio - 1) * 100)}%`}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            {/* Info: (20260801 - Luphia) 試算不可用時明說,不以「0%」或空白充數 */}
            <p className="mt-2 text-xs text-gray-400">
              {factorSetImpacts?.some((item) => item.totalCo2eKg !== undefined)
                ? t(
                    "transportation_carbon_footprint_calculator.export_options.factor_set_hint",
                  )
                : t(
                    "transportation_carbon_footprint_calculator.export_options.factor_set_no_estimate",
                  )}
            </p>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          {t(
            "transportation_carbon_footprint_calculator.export_options.split_hint",
          )}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm({ plans: selected, includeCo2e, factorSet })
            }
            disabled={selected.size === 0}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            {t(
              "transportation_carbon_footprint_calculator.export_options.confirm",
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
