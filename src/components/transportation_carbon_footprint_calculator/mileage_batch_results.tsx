import { useState } from "react";
import {
  Route,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
  MapPin,
  ArrowRight,
  Truck,
  Ship,
  Plane,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ILogisticsPlan } from "@/interfaces/logistics";
import {
  PlanSection,
  RouteType,
} from "@/components/transportation_carbon_footprint_calculator/plan_section";

export interface IMileageBatchResult {
  origin: string | { lat: number; lng: number; name?: string };
  dest: string | { lat: number; lng: number; name?: string };
  plan?: ILogisticsPlan;
  mode?: string;
  error?: string;
  // Info: (20260629 - Tzuhan) Support displaying waypoints
  waypoints?: string | Array<{ lat: number; lng: number; name?: string }>;
}

export interface IMileageBatchResultsProps {
  batchResults: IMileageBatchResult[];
  onRecalculate: () => void;
  onDownload: (
    index?: number,
    selectedOptions?: Record<number, Set<RouteType>>,
  ) => void;
  isExporting: boolean;
  exportingIndex: number | null;
}

export function MileageBatchResults({
  batchResults,
  onRecalculate,
  onDownload,
  isExporting,
  exportingIndex,
}: IMileageBatchResultsProps) {
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [selectedRoutesMap, setSelectedRoutesMap] = useState<
    Record<number, Set<RouteType>>
  >({});

  const renderLocation = (
    loc: string | { lat: number; lng: number; name?: string },
  ) => {
    if (typeof loc === "string") return loc;
    if (loc && typeof loc === "object" && "lat" in loc && "lng" in loc) {
      if (loc.name) {
        return `${loc.name} (${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)})`;
      }
      return `${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)}`;
    }
    return JSON.stringify(loc);
  };

  const getSelectedRoutes = (index: number, plan?: ILogisticsPlan) => {
    if (selectedRoutesMap[index]) return selectedRoutesMap[index];

    // Info: (20260618 - Tzuhan) Default selection
    // Info: (20260629 - Tzuhan) Added custom route mode
    if (plan?.comparisonData?.plans?.custom_multimodal) {
      return new Set<RouteType>(["custom"]);
    }
    return new Set<RouteType>(
      [
        plan?.comparisonData?.plans?.landOnly?.success ? "land" : null,
        plan?.comparisonData?.plans?.sea_multimodal?.sea_port_to_port?.success
          ? "sea"
          : null,
        plan?.comparisonData?.plans?.air_multimodal?.air_airport_to_airport
          ?.success
          ? "air"
          : null,
      ].filter(Boolean) as RouteType[],
    );
  };

  const toggleRoute = (
    index: number,
    type: RouteType,
    plan?: ILogisticsPlan,
  ) => {
    setSelectedRoutesMap((prev) => {
      const current = new Set(getSelectedRoutes(index, plan));
      if (current.has(type)) {
        current.delete(type);
      } else {
        current.add(type);
      }
      return { ...prev, [index]: current };
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Route className="h-5 w-5 text-orange-500" />
            {t(
              "transportation_carbon_footprint_calculator.mileage_calculator.title_manual",
            )}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={onRecalculate}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
            >
              {t(
                "transportation_carbon_footprint_calculator.mileage_calculator.recalculate",
              )}
            </button>
            <button
              onClick={() => onDownload(undefined, selectedRoutesMap)}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-orange-500 disabled:opacity-50"
            >
              {isExporting && exportingIndex === null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("transportation_carbon_footprint_calculator.ui.export_report")}
            </button>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-4">
          {batchResults.map((item, index) => {
            const isExpanded = expandedIndex === index;
            const selectedRoutes = getSelectedRoutes(index, item.plan);

            const isLandAvailable =
              !!item.plan?.comparisonData?.plans?.landOnly?.success;
            const isSeaAvailable =
              !!item.plan?.comparisonData?.plans?.sea_multimodal
                ?.sea_port_to_port?.success;
            const isAirAvailable =
              !!item.plan?.comparisonData?.plans?.air_multimodal
                ?.air_airport_to_airport?.success;
            const isCustomAvailable =
              !!item.plan?.comparisonData?.plans?.custom_multimodal;

            return (
              <div
                key={index}
                id={`batch-report-container-${index}`}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div
                  className="flex cursor-pointer items-center justify-between bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedIndex(isExpanded ? null : index);
                    }
                  }}
                >
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                      {index + 1}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        <span
                          className="max-w-[150px] truncate"
                          title={
                            typeof item.origin === "string"
                              ? item.origin
                              : renderLocation(item.origin)
                          }
                        >
                          {renderLocation(item.origin)}
                        </span>
                      </div>
                      {Array.isArray(item.waypoints)
                        ? item.waypoints.map((wp, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
                            >
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              <MapPin className="h-4 w-4 text-purple-500" />
                              <span
                                className="max-w-[100px] truncate"
                                title={renderLocation(wp)}
                              >
                                {renderLocation(wp)}
                              </span>
                            </div>
                          ))
                        : item.waypoints && (
                            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              <MapPin className="h-4 w-4 text-purple-500" />
                              <span
                                className="max-w-[150px] truncate"
                                title={String(item.waypoints)}
                              >
                                {String(item.waypoints)}
                              </span>
                            </div>
                          )}
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                        <MapPin className="h-4 w-4 text-emerald-500" />
                        <span
                          className="max-w-[150px] truncate"
                          title={
                            typeof item.dest === "string"
                              ? item.dest
                              : renderLocation(item.dest)
                          }
                        >
                          {renderLocation(item.dest)}
                        </span>
                      </div>
                    </div>
                    {(item.plan?.comparisonData?.plans?.custom_multimodal
                      ?.total_co2eKg ||
                      item.plan?.comparisonData?.plans?.landOnly?.co2eKg) && (
                      <div className="ml-auto hidden items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-1 text-sm font-bold text-gray-600 shadow-sm sm:flex">
                        {Number(
                          item.plan.comparisonData.plans.custom_multimodal
                            ?.total_co2eKg ||
                            item.plan.comparisonData.plans.landOnly?.co2eKg,
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}{" "}
                        kg CO₂e
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(index, selectedRoutesMap);
                      }}
                      disabled={isExporting}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-orange-600 disabled:opacity-50"
                      title={t(
                        "transportation_carbon_footprint_calculator.ui.export_report",
                      )}
                    >
                      {isExporting && exportingIndex === index ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      PDF
                    </button>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-gray-200">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded && item.plan && (
                  <div className="border-t border-gray-200 bg-white p-6">
                    <div className="mb-8 flex flex-wrap justify-center gap-3">
                      {isCustomAvailable && (
                        <button
                          onClick={() =>
                            toggleRoute(index, "custom", item.plan)
                          }
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                            selectedRoutes.has("custom")
                              ? "border-purple-200 bg-purple-50 text-purple-700"
                              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          <MapPin className="h-4 w-4" />{" "}
                          {t(
                            "transportation_carbon_footprint_calculator.plan_section.title_custom",
                          ) || "自訂多段路線"}
                        </button>
                      )}
                      {isLandAvailable && (
                        <button
                          onClick={() => toggleRoute(index, "land", item.plan)}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                            selectedRoutes.has("land")
                              ? "border-orange-200 bg-orange-50 text-orange-700"
                              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          <Truck className="h-4 w-4" />{" "}
                          {t(
                            "transportation_carbon_footprint_calculator.ui.land_route",
                          )}
                        </button>
                      )}
                      {isSeaAvailable && (
                        <button
                          onClick={() => toggleRoute(index, "sea", item.plan)}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                            selectedRoutes.has("sea")
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          <Ship className="h-4 w-4" />{" "}
                          {t(
                            "transportation_carbon_footprint_calculator.ui.sea_route",
                          )}
                        </button>
                      )}
                      {isAirAvailable && (
                        <button
                          onClick={() => toggleRoute(index, "air", item.plan)}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                            selectedRoutes.has("air")
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          <Plane className="h-4 w-4" />{" "}
                          {t(
                            "transportation_carbon_footprint_calculator.ui.air_route",
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-16">
                      {["custom", "land", "sea", "air"].map((type) => {
                        if (!selectedRoutes.has(type as RouteType)) return null;
                        if (type === "custom" && !isCustomAvailable)
                          return null;
                        if (type === "land" && !isLandAvailable) return null;
                        if (type === "sea" && !isSeaAvailable) return null;
                        if (type === "air" && !isAirAvailable) return null;

                        return (
                          <div key={type}>
                            <PlanSection
                              type={type as RouteType}
                              plan={item.plan!}
                              weightKg={1000}
                              isExporting={
                                isExporting && exportingIndex === index
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
