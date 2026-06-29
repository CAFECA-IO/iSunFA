import { Truck, Ship, Plane, MapPin, ArrowRight, Activity } from "lucide-react";
import MapViewer, {
  IMapViewerRef,
} from "@/components/transportation_carbon_footprint_calculator/map_viewer";
import { ILogisticsPlan } from "@/interfaces/logistics";
import { MoneyUtil } from "@/lib/utils/money";
import { useTranslation } from "@/i18n/i18n_context";

// Info: (20260629 - Tzuhan) Support custom mode
export type RouteType = "sea" | "air" | "land" | "custom";

export interface ISegment {
  mode: string;
  from: string;
  to: string;
  estimatedDist?: number;
  distUnit?: string;
  emissions?: string;
  emissionsUnit: string;
  coefficient: number;
  coefficientUnit: string;
  coefficientSource: string;
  geometry?: GeoJSON.Geometry | null;
  isFallback?: boolean;
}

interface IPlanSectionProps {
  type: RouteType;
  plan: ILogisticsPlan;
  weightKg: number | string;
  isExporting?: boolean;
  mapRef?: React.Ref<IMapViewerRef>;
}

interface ILegData {
  distanceKm?: number;
  co2eKg?: string | number;
  geometry?: GeoJSON.Geometry | null;
  isFallback?: boolean;
}

export function PlanSection({
  type,
  plan,
  weightKg,
  isExporting = false,
  mapRef = null,
}: IPlanSectionProps) {
  const { t } = useTranslation();
  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "land":
        return <Truck className="h-5 w-5 text-orange-600" />;
      case "sea":
        return <Ship className="h-5 w-5 text-emerald-600" />;
      case "air":
        return <Plane className="h-5 w-5 text-blue-600" />;
      default:
        return <MapPin className="h-5 w-5 text-gray-400" />;
    }
  };

  const getModeName = (mode: string) => {
    switch (mode) {
      case "land":
        return t(
          "transportation_carbon_footprint_calculator.plan_section.mode_land",
        );
      case "sea":
        return t(
          "transportation_carbon_footprint_calculator.plan_section.mode_sea",
        );
      case "air":
        return t(
          "transportation_carbon_footprint_calculator.plan_section.mode_air",
        );
      default:
        return mode;
    }
  };

  const isSea = type === "sea";
  const isAir = type === "air";
  const isLand = type === "land";
  // Info: (20260629 - Tzuhan) Check custom route type
  const isCustom = type === "custom";
  const seaPlan = plan.comparisonData?.plans?.sea_multimodal;
  const airPlan = plan.comparisonData?.plans?.air_multimodal;
  const landPlan = plan.comparisonData?.plans?.landOnly;
  const customPlan = plan.comparisonData?.plans?.custom_multimodal;

  const segments: ISegment[] = [];
  const mapFeatures: GeoJSON.Feature[] = [];
  let totalCo2e = "0";
  let titleName = "";
  let themeColor = "";
  let themeBg = "";

  const addSegment = (
    mode: string,
    from: string,
    to: string,
    legData: ILegData,
    coefficient: number,
    coefficientSource: string,
    color: string,
  ) => {
    if (!legData) return;
    segments.push({
      mode,
      from,
      to,
      estimatedDist: legData.distanceKm,
      distUnit: "KM",
      emissions: legData.co2eKg?.toString() || "0",
      emissionsUnit: "kg CO₂e",
      coefficient,
      coefficientUnit: "kg CO₂e / t-km",
      coefficientSource,
      geometry: legData.geometry,
      isFallback: legData.isFallback,
    });
    if (legData.geometry) {
      mapFeatures.push({
        type: "Feature",
        properties: { color },
        geometry: legData.geometry as GeoJSON.Geometry,
      });
    }
  };

  if (isLand && landPlan?.success) {
    titleName = t(
      "transportation_carbon_footprint_calculator.plan_section.title_land",
    );
    themeColor = "text-orange-500";
    themeBg = "bg-orange-100";
    totalCo2e = landPlan.co2eKg?.toString() || "0";
    addSegment(
      "land",
      t("transportation_carbon_footprint_calculator.plan_section.origin"),
      t("transportation_carbon_footprint_calculator.plan_section.dest"),
      landPlan,
      0.11289,
      "UK DEFRA 2025 (HGV)",
      "#F97316",
    );
  } else if (isSea && seaPlan) {
    titleName = t(
      "transportation_carbon_footprint_calculator.plan_section.title_sea",
    );
    themeColor = "text-emerald-500";
    themeBg = "bg-emerald-100";
    totalCo2e = seaPlan.total_co2eKg?.toString() || "0";
    const portOut =
      plan.exportPort?.name ||
      t("transportation_carbon_footprint_calculator.plan_section.origin_port");
    const portIn =
      plan.importPort?.name ||
      t("transportation_carbon_footprint_calculator.plan_section.dest_port");
    addSegment(
      "land",
      t("transportation_carbon_footprint_calculator.plan_section.origin"),
      portOut,
      seaPlan.land_origin_to_port,
      0.11289,
      "UK DEFRA 2025 (HGV)",
      "#F97316",
    );
    addSegment(
      "sea",
      portOut,
      portIn,
      seaPlan.sea_port_to_port,
      0.01045,
      "UK DEFRA 2025 (Container ship)",
      "#059669",
    );
    addSegment(
      "land",
      portIn,
      t("transportation_carbon_footprint_calculator.plan_section.dest"),
      seaPlan.land_port_to_dest,
      0.11289,
      "UK DEFRA 2025 (HGV)",
      "#F97316",
    );
  } else if (isAir && airPlan) {
    titleName = t(
      "transportation_carbon_footprint_calculator.plan_section.title_air",
    );
    themeColor = "text-blue-500";
    themeBg = "bg-blue-100";
    totalCo2e = airPlan.total_co2eKg?.toString() || "0";
    const airportOut =
      plan.exportAirport?.name ||
      t(
        "transportation_carbon_footprint_calculator.plan_section.origin_airport",
      );
    const airportIn =
      plan.importAirport?.name ||
      t("transportation_carbon_footprint_calculator.plan_section.dest_airport");
    addSegment(
      "land",
      t("transportation_carbon_footprint_calculator.plan_section.origin"),
      airportOut,
      airPlan.land_origin_to_airport,
      0.11289,
      "UK DEFRA 2025 (HGV)",
      "#F97316",
    );
    addSegment(
      "air",
      airportOut,
      airportIn,
      airPlan.air_airport_to_airport,
      0.6023,
      "UK DEFRA 2025 (Long-haul)",
      "#2563EB",
    );
    addSegment(
      "land",
      airportIn,
      t("transportation_carbon_footprint_calculator.plan_section.dest"),
      airPlan.land_airport_to_dest,
      0.11289,
      "UK DEFRA 2025 (HGV)",
      "#F97316",
    );
  } else if (isCustom && customPlan) {
    titleName =
      t(
        "transportation_carbon_footprint_calculator.plan_section.title_custom",
      ) || "自訂多段路線";
    themeColor = "text-purple-500";
    themeBg = "bg-purple-100";
    totalCo2e = customPlan.total_co2eKg?.toString() || "0";
    customPlan.segments.forEach((seg) => {
      const coeff = seg.mode === "LAND" ? 0.11289 : 0.01045;
      const source =
        seg.mode === "LAND"
          ? "UK DEFRA 2025 (HGV)"
          : "UK DEFRA 2025 (Container ship)";
      const color = seg.mode === "LAND" ? "#F97316" : "#059669";

      const parts = (seg.name || "").split("->");
      const from = parts[0]?.trim() || "Point";
      const to = parts[1]?.trim() || "Point";

      addSegment(
        seg.mode.toLowerCase(),
        from,
        to,
        {
          distanceKm: seg.distanceKm,
          co2eKg: seg.co2eKg,
          geometry: seg.geometry,
        },
        coeff,
        source,
        color,
      );
    });
  }

  if (segments.length === 0) return null; // Info: (20260430 - Tzuhan) 未成功解析該方案或不支持

  return (
    <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Info: (20260430 - Tzuhan) Left Column: Summary & Map & Coeffs */}
      <div className="space-y-6 lg:col-span-1">
        <div className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-lg">
          <div
            className={`absolute top-0 right-0 h-32 w-32 ${themeBg} -mt-10 -mr-10 rounded-full blur-3xl transition-all group-hover:scale-110`}
          ></div>
          <h3 className="relative z-10 mb-2 text-sm font-semibold text-gray-500">
            {t(
              "transportation_carbon_footprint_calculator.plan_section.total_emissions_est",
            ).replace("{{title}}", titleName)}
          </h3>
          <div className="relative z-10 flex items-end gap-2">
            <span className="text-4xl font-extrabold text-gray-900 md:text-5xl">
              {MoneyUtil.formatDynamic(totalCo2e, 1)}
            </span>
            <span className="mb-1 font-medium text-gray-500">kg CO₂e</span>
          </div>
          <div className="relative z-10 mt-6 flex items-center justify-between border-t border-gray-100 pt-6 text-sm">
            <span className="font-medium text-gray-500">
              {t(
                "transportation_carbon_footprint_calculator.plan_section.total_weight",
              )}
            </span>
            <span className="font-bold text-gray-900">
              {(Number(weightKg) / 1000).toLocaleString()}{" "}
              {t(
                "transportation_carbon_footprint_calculator.plan_section.metric_ton",
              )}
            </span>
          </div>
        </div>

        <div className="group overflow-hidden rounded-3xl border border-gray-200 bg-white p-2 shadow-lg">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
            <MapViewer
              ref={mapRef}
              routeGeojson={{
                type: "FeatureCollection",
                features: mapFeatures.filter(
                  (f) => f.geometry,
                ) as GeoJSON.Feature[],
              }}
              className="h-full w-full"
              interactive={false}
              fitBoundsPadding={40}
              showRouteMarkers={true}
              duration={isExporting ? 0 : 2500}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
          </div>
        </div>

        {/* Info: (20260430 - Tzuhan) {t('transportation_carbon_footprint_calculator.plan_section.coefficient_disclosure')} */}
        <div className="rounded-3xl border border-orange-100 bg-orange-50 p-6 shadow-sm">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
            <Activity className="h-4 w-4 text-orange-500" />{" "}
            {t(
              "transportation_carbon_footprint_calculator.plan_section.coefficient_disclosure",
            )}
          </h4>
          <div className="space-y-3 text-xs text-gray-600">
            <p className="rounded-lg border border-orange-100 bg-white px-3 py-2 font-mono">
              {t(
                "transportation_carbon_footprint_calculator.plan_section.formula",
              )}
            </p>
            <ul className="space-y-2">
              <li className="flex items-center justify-between border-b border-orange-200/50 pb-1">
                <span className="flex items-center gap-1">
                  <Ship className="h-3 w-3 text-emerald-600" />
                  {t(
                    "transportation_carbon_footprint_calculator.plan_section.mode_sea",
                  )}
                </span>
                <span className="font-medium">
                  0.01045{" "}
                  <span className="text-[10px] text-gray-400">
                    kg CO2e / t-km
                  </span>
                </span>
              </li>
              <li className="flex items-center justify-between border-b border-orange-200/50 pb-1">
                <span className="flex items-center gap-1">
                  <Plane className="h-3 w-3 text-blue-600" />
                  {t(
                    "transportation_carbon_footprint_calculator.plan_section.mode_air",
                  )}
                </span>
                <span className="font-medium">
                  0.6023{" "}
                  <span className="text-[10px] text-gray-400">
                    kg CO2e / t-km
                  </span>
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3 text-orange-600" />
                  {t(
                    "transportation_carbon_footprint_calculator.plan_section.mode_land",
                  )}
                </span>
                <span className="font-medium">
                  0.11289{" "}
                  <span className="text-[10px] text-gray-400">
                    kg CO2e / t-km
                  </span>
                </span>
              </li>
            </ul>
            <div className="mt-2 text-right text-[10px] text-gray-400">
              {t(
                "transportation_carbon_footprint_calculator.plan_section.source",
              )}
              : UK DEFRA 2025
            </div>
          </div>
        </div>
      </div>

      {/* Info: (20260430 - Tzuhan) Right Column: Segments List */}
      <div className="lg:col-span-2">
        <div className="h-full rounded-3xl border border-gray-200 bg-white p-6 shadow-lg md:p-8">
          <h3 className="mb-6 flex items-center gap-3 text-xl font-bold text-gray-900">
            <Activity className={`h-6 w-6 ${themeColor}`} />
            {t(
              "transportation_carbon_footprint_calculator.plan_section.section_analysis",
            ).replace("{{title}}", titleName)}
          </h3>

          <div className="relative space-y-4">
            <div className="absolute top-6 bottom-6 left-[27px] hidden w-[2px] bg-gray-100 md:block"></div>

            {segments.map((seg, idx) => (
              <div
                key={idx}
                className="relative flex flex-col gap-4 rounded-2xl border border-transparent p-4 transition-colors hover:border-gray-200 hover:bg-gray-50 md:flex-row"
              >
                <div className="z-10 hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm md:flex">
                  {getModeIcon(seg.mode)}
                </div>

                <div className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:rounded-none md:border-transparent md:bg-transparent md:p-0">
                  <div className="mb-2 flex items-center gap-2 md:hidden">
                    {getModeIcon(seg.mode)}
                    <span
                      className={`text-sm font-bold ${seg.mode === "sea" ? "text-emerald-600" : seg.mode === "air" ? "text-blue-600" : "text-orange-600"}`}
                    >
                      {getModeName(seg.mode)}
                    </span>
                  </div>

                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2 text-sm text-gray-800">
                        <span className="max-w-[150px] truncate font-bold">
                          {seg.from}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-gray-400" />
                        <span className="max-w-[150px] truncate font-bold">
                          {seg.to}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-sm font-medium text-gray-500">
                        {t(
                          "transportation_carbon_footprint_calculator.plan_section.est_mileage",
                        )}{" "}
                        <span className="text-gray-700">
                          {seg.estimatedDist?.toLocaleString(undefined, {
                            maximumFractionDigits: 1,
                          })}{" "}
                          {seg.distUnit || "KM"}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-medium text-gray-500">
                        {t(
                          "transportation_carbon_footprint_calculator.plan_section.emission_coefficient",
                        )}{" "}
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {seg.coefficient} {seg.coefficientUnit}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400 italic">
                        {t(
                          "transportation_carbon_footprint_calculator.plan_section.source",
                        )}
                        : {seg.coefficientSource}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm md:items-end md:border-none md:bg-transparent md:p-0 md:shadow-none">
                      <span className="mb-1 text-xs font-semibold text-gray-500">
                        {t(
                          "transportation_carbon_footprint_calculator.plan_section.carbon_emissions",
                        )}
                      </span>
                      <span
                        className={`text-lg font-extrabold ${seg.mode === "sea" ? "text-emerald-600" : seg.mode === "air" ? "text-blue-600" : "text-orange-600"}`}
                      >
                        {MoneyUtil.formatDynamic(seg.emissions || "0", 1)}{" "}
                        <span className="text-xs font-medium text-gray-500">
                          {seg.emissionsUnit}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Info: (20260430 - Luphia) 移除了段落的 MapViewer 縮圖以避免 WebGL 上限導致的 Crash (Map Overload) */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
