import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { ReportLayout } from "@/components/common/report_layout";
import type { IMileageBatchResult } from "@/components/transportation_carbon_footprint_calculator/mileage_batch_results";
import { useTranslation } from "@/i18n/i18n_context";
import MapViewer, {
  IMapViewerRef,
} from "@/components/transportation_carbon_footprint_calculator/map_viewer";

interface IBatchItemReportProps {
  item: IMileageBatchResult;
  index: number;
  onMapsReady?: () => void;
}

export function BatchItemReport({
  item,
  index,
  onMapsReady = () => {},
}: IBatchItemReportProps) {
  const { t } = useTranslation();

  const landMapRef = useRef<IMapViewerRef>(null);
  const seaMapRef = useRef<IMapViewerRef>(null);
  const airMapRef = useRef<IMapViewerRef>(null);
  const fallbackMapRef = useRef<IMapViewerRef>(null);

  const [landImgUrl, setLandImgUrl] = useState<string | null>(null);
  const [seaImgUrl, setSeaImgUrl] = useState<string | null>(null);
  const [airImgUrl, setAirImgUrl] = useState<string | null>(null);
  const [fallbackImgUrl, setFallbackImgUrl] = useState<string | null>(null);

  const parseGeo = (geoStr: string | undefined, color: string) => {
    if (!geoStr) return null;
    try {
      const geo = JSON.parse(geoStr);
      if (geo.type === "FeatureCollection") {
        geo.features.forEach((f: { properties?: Record<string, unknown> }) => {
          if (!f.properties) f.properties = {};
          f.properties.color = color;
        });
      } else if (geo.type === "Feature") {
        if (!geo.properties) geo.properties = {};
        geo.properties.color = color;
      } else if (geo.type === "LineString") {
        return {
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: { color }, geometry: geo }],
        };
      }
      return geo;
    } catch {
      return null;
    }
  };

  const landGeo = useMemo(
    () => parseGeo(item.landGeometry, "#fb923c"),
    [item.landGeometry],
  );
  const seaGeo = useMemo(
    () => parseGeo(item.seaGeometry, "#60a5fa"),
    [item.seaGeometry],
  );
  const airGeo = useMemo(
    () => parseGeo(item.airGeometry, "#7dd3fc"),
    [item.airGeometry],
  );

  const fallbackGeo = useMemo(() => {
    let fallbackColor = "#a8a29e";
    if (item.mode === "LAND") fallbackColor = "#fb923c";
    else if (item.mode === "SEA_LAND" || item.mode === "SEA_LAND_AIR")
      fallbackColor = "#60a5fa";
    else if (item.mode === "AIR_LAND") fallbackColor = "#7dd3fc";

    return !item.landGeometry && !item.seaGeometry && !item.airGeometry
      ? parseGeo(item.routeGeometry, fallbackColor)
      : null;
  }, [
    item.landGeometry,
    item.seaGeometry,
    item.airGeometry,
    item.routeGeometry,
    item.mode,
  ]);

  const hasAnyMap = !!(landGeo || seaGeo || airGeo || fallbackGeo);

  useEffect(() => {
    if (!hasAnyMap) {
      if (onMapsReady) onMapsReady();
      return;
    }

    const captureMaps = async () => {
      // Info: (20260511 - Luphia) Wait for MapViewer instances to fully render
      await new Promise((resolve) => setTimeout(resolve, 2000));

      let capturedLand = null;
      let capturedSea = null;
      let capturedAir = null;
      let capturedFallback = null;

      if (landGeo && landMapRef.current)
        capturedLand = await landMapRef.current.captureMap();
      if (seaGeo && seaMapRef.current)
        capturedSea = await seaMapRef.current.captureMap();
      if (airGeo && airMapRef.current)
        capturedAir = await airMapRef.current.captureMap();
      if (fallbackGeo && fallbackMapRef.current)
        capturedFallback = await fallbackMapRef.current.captureMap();

      setLandImgUrl(capturedLand);
      setSeaImgUrl(capturedSea);
      setAirImgUrl(capturedAir);
      setFallbackImgUrl(capturedFallback);

      // Info: (20260511 - Luphia) Wait for React to swap MapViewer with Image
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (onMapsReady) onMapsReady();
    };

    captureMaps();
  }, [landGeo, seaGeo, airGeo, fallbackGeo, hasAnyMap, onMapsReady]);

  return (
    <div
      id={`batch-report-item-${index}`}
      className="bg-white"
      style={{ width: "800px", padding: "20px" }}
    >
      <ReportLayout
        isPdfExport={true}
        footerType="simple"
        footerTitle={`Route Report - ${item.origin} to ${item.dest}`}
        className="h-full rounded-none border border-gray-100 shadow-none ring-0"
        contentClassName="p-8"
      >
        <div className="mb-6 border-b border-gray-100 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t(
              "transportation_carbon_footprint_calculator.mileage_calculator.title_manual",
            )}
          </h1>
          <p className="mt-2 text-gray-500">
            {item.origin} ➔ {item.dest}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">
              {t(
                "transportation_carbon_footprint_calculator.mileage_calculator.col_mode",
              )}
            </p>
            <p className="mt-1 text-lg font-bold text-gray-900">
              {item.mode
                ? t(
                    `transportation_carbon_footprint_calculator.mileage_calculator.mode_${item.seaDistanceKm && item.airDistanceKm && item.seaDistanceKm > 0 && item.airDistanceKm > 0 ? "SEA_LAND_AIR" : item.mode}`,
                  )
                : "N/A"}
            </p>
          </div>
          <div className="rounded-xl bg-orange-50 p-4">
            <p className="text-sm font-medium text-orange-600/80">
              {t(
                "transportation_carbon_footprint_calculator.mileage_calculator.col_mileage",
              )}
            </p>
            <p className="mt-1 text-lg font-bold text-orange-700">
              {Number(item.distanceKm || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              km
            </p>
          </div>
        </div>

        <div className="mb-8 flex gap-6 text-sm text-gray-600">
          {item.landDistanceKm !== undefined && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-400" />
              <span>
                {t(
                  "transportation_carbon_footprint_calculator.mileage_calculator.short_land",
                )}
                :{" "}
                {Number(item.landDistanceKm).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                km
              </span>
            </div>
          )}
          {item.seaDistanceKm !== undefined && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-400" />
              <span>
                {t(
                  "transportation_carbon_footprint_calculator.mileage_calculator.short_sea",
                )}
                :{" "}
                {Number(item.seaDistanceKm).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                km
              </span>
            </div>
          )}
          {item.airDistanceKm !== undefined && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sky-300" />
              <span>
                {t(
                  "transportation_carbon_footprint_calculator.mileage_calculator.short_air",
                )}
                :{" "}
                {Number(item.airDistanceKm).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                km
              </span>
            </div>
          )}
        </div>

        {hasAnyMap ? (
          <div className="flex flex-col gap-4">
            {landGeo && (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="bg-orange-50 px-4 py-2 text-xs font-bold text-orange-600">
                  Land Route
                </div>
                {landImgUrl ? (
                  <Image
                    src={landImgUrl}
                    alt="Land Route Map"
                    width={800}
                    height={300}
                    className="h-[300px] w-full object-cover"
                    crossOrigin="anonymous"
                    unoptimized={true}
                  />
                ) : (
                  <MapViewer
                    ref={landMapRef}
                    routeGeojson={landGeo}
                    interactive={false}
                    hideLabel={true}
                    fitBoundsPadding={40}
                    className="h-[300px] w-full"
                  />
                )}
              </div>
            )}
            {seaGeo && (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600">
                  Sea Route
                </div>
                {seaImgUrl ? (
                  <Image
                    src={seaImgUrl}
                    alt="Sea Route Map"
                    width={800}
                    height={300}
                    className="h-[300px] w-full object-cover"
                    crossOrigin="anonymous"
                    unoptimized={true}
                  />
                ) : (
                  <MapViewer
                    ref={seaMapRef}
                    routeGeojson={seaGeo}
                    interactive={false}
                    hideLabel={true}
                    fitBoundsPadding={40}
                    className="h-[300px] w-full"
                  />
                )}
              </div>
            )}
            {airGeo && (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="bg-sky-50 px-4 py-2 text-xs font-bold text-sky-600">
                  Air Route
                </div>
                {airImgUrl ? (
                  <Image
                    src={airImgUrl}
                    alt="Air Route Map"
                    width={800}
                    height={300}
                    className="h-[300px] w-full object-cover"
                    crossOrigin="anonymous"
                    unoptimized={true}
                  />
                ) : (
                  <MapViewer
                    ref={airMapRef}
                    routeGeojson={airGeo}
                    interactive={false}
                    hideLabel={true}
                    fitBoundsPadding={40}
                    className="h-[300px] w-full"
                  />
                )}
              </div>
            )}
            {fallbackGeo && (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-600">
                  Route Map (Legacy Data)
                </div>
                {fallbackImgUrl ? (
                  <Image
                    src={fallbackImgUrl}
                    alt="Route Map"
                    width={800}
                    height={300}
                    className="h-[300px] w-full object-cover"
                    crossOrigin="anonymous"
                    unoptimized={true}
                  />
                ) : (
                  <MapViewer
                    ref={fallbackMapRef}
                    routeGeojson={fallbackGeo}
                    interactive={false}
                    hideLabel={true}
                    fitBoundsPadding={40}
                    className="h-[300px] w-full"
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-[200px] w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400">
            Map path unavailable
          </div>
        )}
      </ReportLayout>
    </div>
  );
}
