import { useEffect } from "react";
import { ReportLayout } from "@/components/common/report_layout";
import { useTranslation } from "@/i18n/i18n_context";
import {
  PlanSection,
  RouteType,
} from "@/components/transportation_carbon_footprint_calculator/plan_section";
import { Truck, Ship, Plane } from "lucide-react";
import { IMileageBatchResult } from "@/components/transportation_carbon_footprint_calculator/mileage_batch_results";

interface IBatchExportRendererProps {
  item: IMileageBatchResult;
  index: number;
  total: number;
  selectedRoutes: Set<RouteType>;
  onReady: () => void;
}

export function BatchExportRenderer({
  item,
  index,
  total,
  selectedRoutes,
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

  const formatLocation = (loc: string | { lat: number; lng: number; name?: string }) => {
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

  const isLandAvailable = !!plan.comparisonData?.plans?.landOnly?.success;
  const isSeaAvailable =
    !!plan.comparisonData?.plans?.sea_multimodal?.sea_port_to_port?.success;
  const isAirAvailable =
    !!plan.comparisonData?.plans?.air_multimodal?.air_airport_to_airport
      ?.success;

  const routesToRender = ["land", "sea", "air"].filter(
    (type) =>
      selectedRoutes.has(type as RouteType) &&
      (type === "land"
        ? isLandAvailable
        : type === "sea"
          ? isSeaAvailable
          : isAirAvailable),
  );

  const getModeName = (mode: string) =>
    mode === "land"
      ? t("transportation_carbon_footprint_calculator.pdf.mode_land")
      : mode === "sea"
        ? t("transportation_carbon_footprint_calculator.pdf.mode_sea")
        : t("transportation_carbon_footprint_calculator.pdf.mode_air");

  return (
    <div id={`batch-report-item-${index}`} className="flex flex-col">
      {routesToRender.map((type) => (
        <div key={type} className="bg-white">
          <ReportLayout
            isPdfExport={true}
            hideFrameUnlessExport={true}
            badgeText={`${getModeName(type)} ${t("transportation_carbon_footprint_calculator.payment.fee_name")}`}
            footerType="simple"
            footerTitle={t(
              "transportation_carbon_footprint_calculator.pdf.footer",
            )
              .replace("{{current}}", String(index + 1))
              .replace("{{total}}", String(total))
              .replace("{{origin}}", originName)
              .replace("{{dest}}", destName)}
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
                  ) : (
                    <Plane className="h-6 w-6 text-blue-500" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
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
              weightKg={1000}
              isExporting={true}
            />
          </ReportLayout>
        </div>
      ))}
    </div>
  );
}
