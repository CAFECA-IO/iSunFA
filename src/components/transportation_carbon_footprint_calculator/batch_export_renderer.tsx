import { useEffect } from "react";
import { ReportLayout } from "@/components/common/report_layout";
import { useTranslation } from "@/i18n/i18n_context";
import {
  PlanSection,
  RouteType,
} from "@/components/transportation_carbon_footprint_calculator/plan_section";
import { Truck, Ship, Plane, MapPin, Layers } from "lucide-react";
import { IMileageBatchResult } from "@/components/transportation_carbon_footprint_calculator/mileage_batch_results";
import type { IMapViewerRef } from "@/components/transportation_carbon_footprint_calculator/map_viewer";
import { getRouteApplicability } from "@/lib/utils/route_applicability";
import { buildPlanCode } from "@/constants/logistics";

interface IBatchExportRendererProps {
  item: IMileageBatchResult;
  index: number;
  total: number;
  selectedRoutes: Set<RouteType>;
  // Info: (20260729 - Tzuhan) 匯出批次識別碼:顯示於頁尾,與 summary.csv 檔頭一致
  exportId?: string;
  /**
   * Info: (20260731 - Tzuhan) 地圖控制器的 ref(issue 08)。呼叫端以此取得地圖影像
   * (`captureMap()`)供伺服端列印;一次只渲染一個 (路線, 方案),故單一 ref 即足夠。
   */
  mapRef?: React.Ref<IMapViewerRef>;
  onReady: () => void;
}

export function BatchExportRenderer({
  item,
  index,
  total,
  selectedRoutes,
  exportId = undefined,
  mapRef = null,
  onReady,
}: IBatchExportRendererProps) {
  const { t } = useTranslation();

  useEffect(() => {
    // Info: (20260511 - Luphia) Wait for maps inside PlanSections to finish rendering
    const timer = setTimeout(() => {
      onReady();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onReady]);

  const formatLocation = (
    loc: string | { lat: number; lng: number; name?: string },
  ) => {
    if (typeof loc === "string") return loc;
    if (loc && typeof loc === "object" && "lat" in loc && "lng" in loc) {
      if (loc.name) {
        return `${loc.name} (${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)})`;
      }
      return `${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)}`;
    }
    return "";
  };

  const originName = formatLocation(item.origin);
  const destName = formatLocation(item.dest);
  const plan = item.plan;

  if (!plan) {
    return (
      <div id={`batch-report-item-${index}`}>
        {/* Fallback empty report if calculation failed */}
      </div>
    );
  }

  // Info: (20260724 - Tzuhan) 匯出內容與畫面顯示共用同一適用性引擎,確保 PDF 不出現不適用的方案(需求一)
  const applicability = getRouteApplicability(plan);

  // Info: (20260724 - Tzuhan) 補上 custom 方案支援(原本被排除導致自訂聯運匯出空白 PDF)
  const routesToRender = (
    ["custom", "land", "sea", "air", "seaLandAir"] as const
  ).filter((type) => selectedRoutes.has(type) && applicability[type]);

  const getModeName = (mode: string) =>
    mode === "land"
      ? t("transportation_carbon_footprint_calculator.pdf.mode_land")
      : mode === "sea"
        ? t("transportation_carbon_footprint_calculator.pdf.mode_sea")
        : mode === "air"
          ? t("transportation_carbon_footprint_calculator.pdf.mode_air")
          : mode === "seaLandAir"
            ? t(
                "transportation_carbon_footprint_calculator.plan_section.title_sea_land_air",
              )
            : t(
                "transportation_carbon_footprint_calculator.plan_section.title_custom",
              );

  return (
    <div id={`batch-report-item-${index}`} className="flex flex-col">
      {routesToRender.map((type) => (
        <div key={type} className="bg-white">
          <ReportLayout
            isPdfExport={true}
            hideFrameUnlessExport={true}
            /* Info: (20260729 - Tzuhan) 標頭帶方案代碼 + 運輸模式,與 CSV 的 Plan Code 欄互為索引 */
            badgeText={`${buildPlanCode(index, type)} · ${getModeName(type)}`}
            footerType="simple"
            footerTitle={t(
              "transportation_carbon_footprint_calculator.pdf.footer",
            )
              .replace("{{current}}", String(index + 1))
              .replace("{{total}}", String(total))
              .replace("{{origin}}", originName)
              .replace("{{dest}}", destName)
              .concat(
                exportId
                  ? ` • ${t("transportation_carbon_footprint_calculator.pdf.export_id_label")}: ${exportId}`
                  : "",
              )}
            className="mb-4 min-h-[1448px] justify-between rounded-none border-none bg-white shadow-none ring-0"
            contentClassName="p-8"
          >
            <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-gray-100 bg-gray-50/80 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm">
                  {type === "land" ? (
                    <Truck className="h-6 w-6 text-orange-500" />
                  ) : type === "sea" ? (
                    <Ship className="h-6 w-6 text-emerald-500" />
                  ) : type === "air" ? (
                    <Plane className="h-6 w-6 text-blue-500" />
                  ) : type === "seaLandAir" ? (
                    <Layers className="h-6 w-6 text-indigo-500" />
                  ) : (
                    <MapPin className="h-6 w-6 text-purple-500" />
                  )}
                </div>
                <h2 className="flex flex-wrap items-baseline gap-2 text-2xl font-bold text-gray-900">
                  {/* Info: (20260729 - Tzuhan) 唯一方案代碼(對應 CSV Plan Code 與檔名) */}
                  <span className="rounded-lg bg-gray-900 px-2 py-1 font-mono text-base text-white">
                    {buildPlanCode(index, type)}
                  </span>
                  {getModeName(type)}{" "}
                  {t(
                    "transportation_carbon_footprint_calculator.pdf.section_analysis",
                  )}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-700">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm sm:flex-none">
                  <span className="text-gray-400">{t("common.origin")}:</span>
                  <span className="truncate">{originName}</span>
                </div>
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm sm:flex-none">
                  <span className="text-gray-400">
                    {t("common.destination")}:
                  </span>
                  <span className="truncate">{destName}</span>
                </div>
              </div>
            </div>

            <PlanSection
              type={type as RouteType}
              plan={plan}
              weightKg={item.weightKg ?? 1000}
              isExporting={true}
              // Info: (20260731 - Tzuhan) issue 08:伺服端列印需要地圖影像,而 MapLibre 是 WebGL
              // Info: (20260731 - Tzuhan) (伺服端沒有),只能由此離屏實例截圖後上傳。
              // Info: (20260731 - Tzuhan) 這是離屏渲染在向量路徑下唯一還存在的理由。
              mapRef={mapRef}
            />
          </ReportLayout>
        </div>
      ))}
    </div>
  );
}
