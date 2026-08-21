"use client";

/**
 * Info: (20260820 - Luphia) 操作說明的插圖。
 *
 * 這些不是點陣截圖,而是以介面實際使用的元件樣式與實際字串重繪的縮小版畫面。
 * 這麼做的理由有三:
 *
 * 1. **會跟著語言走。** 圖上的「產生分析報告」「進階參數手動配置」都取自 i18n,
 *    日文使用者看到的是日文的圖。一張中文截圖對其餘四種語言的使用者沒有意義。
 * 2. **會跟著主題走。** 沿用與真實元件相同的 class,深色模式下不會出現一塊白色矩形。
 * 3. **不易過期。** 截圖是改版當下的快照,改一次按鈕就與畫面不符,而沒有人會記得回頭換圖。
 *
 * 若某張圖的細節確實非重繪所能表達(例如地圖底圖的真實樣貌),
 * 在 GUIDE_FIGURE_IMAGES 登錄實機截圖路徑即可改以圖片呈現。
 *
 * Info: (20260820 - Luphia) 插圖內的 class 刻意沿用真實元件的寫法(bg-white、text-gray-*、
 * ring-gray-900/5),而非語意 token —— 目的是與畫面「看起來一樣」,
 * 而全庫的中性色階已由 globals.css 依主題轉接,照抄即自動支援深色模式。
 */

import type { ReactNode } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Download,
  FlaskConical,
  FileText,
  Layers,
  MapPin,
  Plane,
  Plus,
  Route,
  Settings,
  Ship,
  Truck,
  UploadCloud,
  Weight,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ANALYSIS_BASE_COSTS } from "@/constants/price";
import { EMISSION_FACTORS, EMISSION_FACTOR_UNIT } from "@/constants/logistics";
import {
  DEFAULT_FACTOR_SET,
  formatFactorSetVersion,
  LOGISTICS_FACTOR_SETS,
} from "@/constants/logistics_factor_sets";
import {
  GUIDE_FIGURE_ID,
  GUIDE_FIGURE_IMAGES,
  type GuideFigureId,
} from "@/constants/logistics_guide";

/**
 * Info: (20260820 - Luphia) 圖上的編號標記。與圖下的說明清單靠「順序」對應:
 * 第 n 個標記對應 callouts[n-1]。標記直接插在被指涉的元素旁而非絕對定位 ——
 * 絕對定位會在文字換行(長語言字串)後指到錯誤的位置。
 */
function Marker({ n }: { n: number }) {
  return (
    <span className="bg-brand text-text-inverted inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] leading-none font-bold">
      {n}
    </span>
  );
}

/** Info: (20260820 - Luphia) 縮小版的卡片外框,對應畫面上的 rounded-xl bg-white 卡片 */
function MockCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-900/5 ${className}`}
    >
      {children}
    </div>
  );
}

/** Info: (20260820 - Luphia) 縮小版的輸入框:只呈現外觀與提示字,不是可用的輸入框 */
function MockField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-medium text-gray-700">{label}</span>
      <div className="truncate rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] text-gray-400">
        {value}
      </div>
    </div>
  );
}

function MockPrimaryButton({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap text-white">
      {children}
    </span>
  );
}

function MockGhostButton({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap text-gray-700">
      {children}
    </span>
  );
}

/** Info: (20260820 - Luphia) 縮小版的核取方塊 */
function MockCheck({
  label,
  checked = true,
  marker = 0,
}: {
  label: string;
  checked?: boolean;
  /** Info: (20260820 - Luphia) 0 表示此列不帶編號標記 */
  marker?: number;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-gray-700">
      <span
        className={`flex size-3 shrink-0 items-center justify-center rounded-[3px] border ${checked ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 bg-white"}`}
      >
        {checked && (
          <svg viewBox="0 0 10 10" className="size-2 fill-none stroke-current">
            <path d="M2 5.2 4 7.2 8 3" strokeWidth="1.6" />
          </svg>
        )}
      </span>
      <span className="flex-1">{label}</span>
      {marker > 0 && <Marker n={marker} />}
    </span>
  );
}

/**
 * Info: (20260820 - Luphia) 地圖區塊的替身。
 *
 * 不嵌入真實地圖:MapLibre 每個實例佔一個 WebGL context,而說明頁一次會出現多張圖,
 * 匯出流程已經因為 context 上限而必須逐張渲染(見 page.tsx 的 BatchExportRenderer)。
 * 說明書裡要傳達的是「這個位置會有一張帶路線的地圖」,不需要真的能拖曳。
 */
function MockMap({ label }: { label: string }) {
  return (
    <div className="relative h-20 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
      <svg
        viewBox="0 0 300 80"
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        <path
          d="M0 58 Q40 44 78 50 T150 40 T230 46 T300 34"
          className="stroke-gray-300"
          fill="none"
          strokeWidth="10"
        />
        <path
          d="M34 62 C90 20 190 66 262 24"
          className="stroke-orange-500"
          fill="none"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <circle cx="34" cy="62" r="4" className="fill-orange-500" />
        <circle cx="262" cy="24" r="4" className="fill-emerald-500" />
      </svg>
      <span className="absolute bottom-1 left-1.5 rounded bg-white/85 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
        {label}
      </span>
    </div>
  );
}

/** Info: (20260820 - Luphia) 報告中的逐段列:起點、模式、里程,以及推估值標記 */
function MockLegRow({
  from,
  to,
  mode,
  distance,
  estimated = false,
  estimatedLabel = "",
}: {
  from: string;
  to: string;
  mode: ReactNode;
  distance: string;
  estimated?: boolean;
  estimatedLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-gray-100 py-1.5 text-[10px] text-gray-600">
      <span className="flex items-center gap-1 text-gray-400">{mode}</span>
      <span className="min-w-0 flex-1 truncate">
        {from} → {to}
      </span>
      <span className="font-semibold text-gray-800">{distance}</span>
      {estimated && estimatedLabel && (
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
          {estimatedLabel}
        </span>
      )}
    </div>
  );
}

/**
 * Info: (20260820 - Luphia) 各插圖的內容。
 *
 * 抽成一個 Record 而非 switch:語言檔指定的 figure 是資料,
 * 找不到對應圖時應當「不畫圖」而非讓整個步驟崩掉。
 */
function useFigureContent(): Record<GuideFigureId, ReactNode> {
  const { t } = useTranslation();
  const tx = (key: string) =>
    t(`transportation_carbon_footprint_calculator.${key}`);

  return {
    [GUIDE_FIGURE_ID.TABS]: (
      <div className="flex justify-center">
        <div className="flex flex-wrap justify-center gap-1 rounded-lg bg-gray-100 p-1">
          {[
            tx("ui.tab_analysis"),
            tx("ui.tab_mileage"),
            tx("ui.tab_history"),
            tx("guide.title"),
          ].map((label, index) => (
            <span
              key={label}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-semibold text-gray-900 ${index === 0 ? "bg-white shadow-sm" : ""}`}
            >
              <Marker n={index + 1} />
              {label}
            </span>
          ))}
        </div>
      </div>
    ),

    [GUIDE_FIGURE_ID.ANALYSIS_INPUT]: (
      <MockCard>
        <div className="mb-3 text-xs font-bold text-gray-800">
          {tx("ui.config_title")}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-gray-700">
                {tx("ui.route_description")}
              </span>
              <Marker n={1} />
            </div>
            <div className="truncate rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] text-gray-400">
              {tx("ui.route_placeholder")}
            </div>
          </div>
          <span className="flex items-center gap-1.5">
            <MockPrimaryButton>{tx("ui.generate_report")}</MockPrimaryButton>
            <Marker n={3} />
          </span>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between px-3 py-2 text-[10px] font-medium text-gray-600">
            <span className="flex items-center gap-1.5">
              {tx("ui.advanced_config")}
              <Marker n={2} />
            </span>
            <ChevronDown className="size-3" />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-white p-3 sm:grid-cols-5">
            <MockField label={tx("ui.origin_lat")} value="25.0400" />
            <MockField label={tx("ui.origin_lng")} value="121.5600" />
            <MockField label={tx("ui.dest_lat")} value="53.4670" />
            <MockField label={tx("ui.dest_lng")} value="-2.2340" />
            <MockField label={tx("ui.total_weight")} value="5000" />
          </div>
        </div>
      </MockCard>
    ),

    [GUIDE_FIGURE_ID.ANALYSIS_PAYMENT]: (
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-lg ring-1 ring-gray-900/5">
        <div className="text-xs font-bold text-gray-900">
          {t("analysis.confirm_title")}
        </div>
        <div className="mt-1 text-[10px] text-gray-500">
          {t("analysis.confirm_desc")}
        </div>
        <div className="mt-3 space-y-1.5 rounded-xl bg-gray-50 p-3">
          <div className="flex items-center justify-between text-[10px] text-gray-600">
            <span>{tx("payment.modal_label")}</span>
            <span className="font-semibold text-gray-800">
              {tx("payment.modal_value")}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 pt-1.5 text-[10px] text-gray-600">
            <span className="flex items-center gap-1.5">
              {t("analysis.confirm_cost")}
              <Marker n={1} />
            </span>
            <span className="font-bold text-orange-600">
              {t("analysis.cost_hint", {
                cost: ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
              })}
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5">
          <MockGhostButton>{t("common.cancel")}</MockGhostButton>
          <MockPrimaryButton>{t("analysis.confirm_action")}</MockPrimaryButton>
          <Marker n={2} />
        </div>
      </div>
    ),

    [GUIDE_FIGURE_ID.ANALYSIS_REPORT]: (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Marker n={1} />
          <span className="flex items-center gap-1 rounded-xl border border-orange-200 bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">
            <Truck className="size-3" /> {tx("ui.land_route")}
          </span>
          <span className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500">
            <Ship className="size-3" /> {tx("ui.sea_route")}
          </span>
          <span className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500">
            <Plane className="size-3" /> {tx("ui.air_route")}
          </span>
          <span className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1 text-[10px] font-bold text-gray-500">
            <Layers className="size-3" />{" "}
            {tx("plan_section.title_sea_land_air")}
          </span>
        </div>

        <MockCard>
          <div className="mb-2 flex items-center gap-1.5">
            <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[9px] font-bold text-white">
              R01-SEA · {tx("pdf.mode_sea")}
            </span>
            <Marker n={2} />
          </div>
          <MockMap label={tx("map.label")} />
          <div className="mt-2">
            <MockLegRow
              mode={<Truck className="size-3" />}
              from={tx("plan_section.origin")}
              to={tx("plan_section.origin_port")}
              distance="31.20 km"
            />
            <MockLegRow
              mode={<Ship className="size-3" />}
              from={tx("plan_section.origin_port")}
              to={tx("plan_section.dest_port")}
              distance="19,884.51 km"
            />
            <MockLegRow
              mode={<Truck className="size-3" />}
              from={tx("plan_section.dest_port")}
              to={tx("plan_section.dest")}
              distance="58.04 km"
              estimated
              estimatedLabel={tx("plan_section.fallback_estimate_badge")}
            />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <Marker n={3} />
            <span className="text-[10px] text-gray-500">
              {tx("plan_section.fallback_estimate_hint")}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800">
              {String(
                t(
                  "transportation_carbon_footprint_calculator.plan_section.total_emissions_est",
                  { title: tx("plan_section.mode_sea") },
                ),
              )}
              <Marker n={4} />
            </span>
            <span className="text-xs font-bold text-emerald-700">
              1,254.36 kg CO₂e
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 border-t border-gray-100 pt-2 text-[10px] text-gray-500">
            <span>{tx("plan_section.coefficient_disclosure")}</span>
            <Marker n={5} />
          </div>
          <div className="mt-1 text-[10px] text-gray-400">
            {tx("plan_section.formula")}
          </div>
        </MockCard>
      </div>
    ),

    [GUIDE_FIGURE_ID.EXPORT_MODAL]: (
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-lg ring-1 ring-gray-900/5">
        <div className="text-xs font-bold text-gray-900">
          {tx("export_options.title")}
        </div>
        <div className="mt-1 text-[10px] text-gray-500">
          {tx("export_options.description")}
        </div>
        <div className="mt-3 space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <MockCheck label={tx("export_options.plan_land")} marker={1} />
          <MockCheck label={tx("export_options.plan_sea")} />
          <MockCheck label={tx("export_options.plan_air")} checked={false} />
        </div>
        <div className="mt-2 space-y-2 rounded-xl border border-gray-100 p-3">
          <MockCheck label={tx("export_options.include_co2e")} marker={2} />
          {/* Info: (20260820 - Luphia) 係數組是**靜態揭露而非可選項**(見 export_options_modal.tsx),
              故此處畫成一行揭露文字而不是下拉選單 —— 圖上出現一個選不動的選單就是一句假陳述。
              版本字串與係數值取自同一組常數,不在說明書裡另抄一份。 */}
          <div className="flex items-start gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5">
            <FlaskConical className="mt-0.5 size-3 shrink-0 text-gray-500" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[10px]">
              <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                {tx("export_options.factor_set")}
                {": "}
                {formatFactorSetVersion(
                  DEFAULT_FACTOR_SET,
                  LOGISTICS_FACTOR_SETS[DEFAULT_FACTOR_SET],
                )}
                <Marker n={3} />
              </span>
              <span className="text-gray-500">
                {`LAND ${EMISSION_FACTORS.LAND} · SEA ${EMISSION_FACTORS.SEA} · AIR ${EMISSION_FACTORS.AIR} ${EMISSION_FACTOR_UNIT}`}
              </span>
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-start gap-1.5 text-[10px] text-gray-500">
          <Marker n={4} />
          <span>{tx("export_options.split_hint")}</span>
        </div>
        <div className="mt-3 flex justify-end">
          <MockPrimaryButton>
            <Download className="size-3" /> {tx("export_options.confirm")}
          </MockPrimaryButton>
        </div>
      </div>
    ),

    [GUIDE_FIGURE_ID.MILEAGE_FLOW]: (
      <div className="space-y-3">
        <MockCard>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-gray-800">
            <FileText className="size-3.5 text-orange-500" />
            {tx("mileage_calculator.title_paste")}
            <Marker n={1} />
          </div>
          <div className="h-12 rounded-lg border border-gray-200 p-2 text-[10px] text-gray-400">
            {tx("mileage_calculator.placeholder")}
          </div>
          <div className="mt-2 flex justify-end">
            <span className="rounded-lg bg-gray-900 px-3 py-1.5 text-[10px] font-semibold text-white">
              {tx("mileage_calculator.btn_ai_parse")}
            </span>
          </div>
        </MockCard>

        <MockCard>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-gray-800">
            <Route className="size-3.5 text-orange-500" />
            {tx("mileage_calculator.title_manual")}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <MockField
              className="min-w-[40%] flex-1"
              label={tx("ui.route_description")}
              value={tx("ui.route_placeholder")}
            />
            <span className="flex items-center gap-1.5">
              <MockGhostButton>
                <Settings className="size-3" />
                {tx("mileage_calculator.btn_setup")}
              </MockGhostButton>
              <Marker n={2} />
            </span>
            <MockGhostButton>
              <Plus className="size-3" /> {tx("mileage_calculator.btn_add")}
            </MockGhostButton>
            <span className="flex items-center gap-1.5">
              <span className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-[10px] font-semibold whitespace-nowrap text-orange-600">
                <UploadCloud className="size-3" />
                {t("logistics.page.batch_import")}
              </span>
              <Marker n={3} />
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
            <div className="flex bg-gray-50 px-2 py-1.5 text-[9px] font-semibold text-gray-500">
              <span className="w-8">{tx("mileage_calculator.col_id")}</span>
              <span className="flex-1">
                {tx("mileage_calculator.col_origin")}
              </span>
              <span className="flex-1">
                {tx("mileage_calculator.col_dest")}
              </span>
              <span className="w-20">{tx("mileage_calculator.col_mode")}</span>
              <span className="w-16 text-right">
                {tx("mileage_calculator.col_mileage")}
              </span>
            </div>
            <div className="flex items-center bg-white px-2 py-1.5 text-[9px] text-gray-600">
              <span className="w-8">1</span>
              <span className="flex-1 truncate">Taipei</span>
              <span className="flex-1 truncate">Manchester</span>
              <span className="flex w-20 items-center gap-1">
                {tx("mileage_calculator.mode_auto")}
                <Marker n={4} />
              </span>
              <span className="w-16 text-right font-semibold text-gray-800">
                —
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-1.5">
            <MockPrimaryButton>
              {tx("mileage_calculator.btn_calculate")}
            </MockPrimaryButton>
            <Marker n={5} />
          </div>
        </MockCard>
      </div>
    ),

    [GUIDE_FIGURE_ID.HISTORY_TABLE]: (
      /* Info: (20260820 - Luphia) 以 grid 而非 flex 排欄:標頭與資料列共用同一組欄寬定義,
         欄位內容長度不一時也不會各自撐開而錯位。min-w 讓欄位有足夠空間,
         窄視窗時由 GuideFigure 的橫向捲動承接 —— 真實畫面的表格也是 overflow-x-auto。 */
      <MockCard className="min-w-[560px] p-0">
        <div className="overflow-hidden rounded-xl">
          <div className="grid grid-cols-[5rem_6rem_4.5rem_1fr_1fr_4rem_7rem] items-center gap-2 bg-gray-50 px-3 py-2 text-[9px] font-semibold text-gray-500">
            <span>{t("common.date")}</span>
            <span>{t("common.status")}</span>
            <span>{t("common.type")}</span>
            <span>{t("common.origin")}</span>
            <span>{t("common.destination")}</span>
            <span>{t("common.weight")}</span>
            <span className="text-right">{t("common.actions")}</span>
          </div>
          <div className="grid grid-cols-[5rem_6rem_4.5rem_1fr_1fr_4rem_7rem] items-center gap-2 bg-white px-3 py-2 text-[9px] text-gray-600">
            <span>2026-08-20</span>
            <span>
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">
                COMPLETED
              </span>
            </span>
            <span className="flex items-center gap-1 font-bold text-gray-700">
              {tx("ui.tab_analysis")}
              <Marker n={1} />
            </span>
            <span className="flex items-center gap-1 truncate">
              <MapPin className="size-2.5 shrink-0 text-orange-500" />
              25.04, 121.56
            </span>
            <span className="flex items-center gap-1 truncate">
              <MapPin className="size-2.5 shrink-0 text-emerald-500" />
              53.46, -2.23
            </span>
            <span className="flex items-center gap-1">
              <Weight className="size-2.5 shrink-0 text-gray-400" />
              5000 kg
            </span>
            <span className="flex items-center justify-end gap-1">
              <span className="rounded-full border border-orange-200 bg-white px-2 py-1 text-[9px] font-bold whitespace-nowrap text-orange-600">
                {t("common.load")}
              </span>
              <Marker n={2} />
              <span className="flex items-center gap-1 rounded-full bg-orange-600 px-2 py-1 text-[9px] font-bold text-white">
                <Download className="size-2.5" />
              </span>
              <Marker n={3} />
            </span>
          </div>
        </div>
      </MockCard>
    ),
  };
}

/**
 * Info: (20260820 - Luphia) 單張插圖。
 *
 * aria-hidden:圖上的字是介面標籤的複製品,對螢幕閱讀器而言與圖下的說明清單重複,
 * 且缺乏閱讀順序。真正承載資訊的是 callouts 清單,那份留在無障礙樹裡。
 */
export function GuideFigure({
  figure,
  caption,
}: {
  figure: GuideFigureId;
  caption: string;
}) {
  const contents = useFigureContent();
  const override = GUIDE_FIGURE_IMAGES[figure];
  const content = contents[figure];

  if (!override && !content) return null;

  return (
    <figure className="border-border-default bg-surface-base mt-3 overflow-hidden rounded-xl border">
      <div
        aria-hidden="true"
        className="pointer-events-none overflow-x-auto p-3 select-none"
      >
        {override ? (
          <Image
            src={override}
            alt=""
            width={1280}
            height={720}
            className="h-auto w-full rounded-lg"
          />
        ) : (
          <div className="min-w-[320px]">{content}</div>
        )}
      </div>
      <figcaption className="border-border-default text-text-muted border-t px-3 py-2 text-[11px]">
        {caption}
      </figcaption>
    </figure>
  );
}
