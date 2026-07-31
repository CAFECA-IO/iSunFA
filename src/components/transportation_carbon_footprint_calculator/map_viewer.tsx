"use client";

import {
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useId,
} from "react";
import Map, { Source, Layer, MapRef, Marker } from "react-map-gl/maplibre";
import { MapPin } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import { useTranslation } from "@/i18n/i18n_context";
// Info: (20260731 - Tzuhan) bbox 計算抽到純模組:它是幾何運算而非 UI,且跨換日線的修正需要單元測試
import { getMapBoundingBox as getBoundingBox } from "@/lib/utils/map_bounding_box";

export interface IMapViewerProps {
  // Info: (20260430 - Tzuhan) 支援多式聯運的 FeatureCollection 或是單一軌跡
  routeGeojson?: FeatureCollection<Geometry> | Feature<Geometry> | null;
  // Info: (20260430 - Tzuhan) 使用者點擊要聚焦的特定區段 Geometry
  focusGeojson?:
    | GeoJSON.FeatureCollection
    | GeoJSON.Feature
    | GeoJSON.Geometry
    | null;
  className?: string; // Info: (20260430 - Tzuhan) 自定義外觀 (例如高度)
  interactive?: boolean; // Info: (20260430 - Tzuhan) 是否允許互動 (平移、縮放)
  hideLabel?: boolean; // Info: (20260430 - Tzuhan) 隱藏左下角的標籤
  fitBoundsPadding?: number; // Info: (20260430 - Tzuhan) 控制飛梭邊距，小地圖需設小一點
  showRouteMarkers?: boolean; // Info: (20260430 - Luphia) 顯示起終點標記
  duration?: number; // Info: (20260501 - Luphia) 飛梭動畫時長
}

export interface IMapViewerRef {
  captureMap: () => Promise<string | null>;
}

function getStartAndEndCoordinates(
  geojson:
    | GeoJSON.FeatureCollection
    | GeoJSON.Feature
    | GeoJSON.Geometry
    | null,
) {
  let start: number[] | null = null;
  let end: number[] | null = null;

  const processCoords = (coords: number[][]) => {
    if (coords.length > 0) {
      if (!start) start = coords[0];
      end = coords[coords.length - 1];
    }
  };

  const processGeometry = (geom: GeoJSON.GeoJSON | null) => {
    if (!geom) return;
    if (geom.type === "LineString") {
      processCoords(geom.coordinates);
    } else if (geom.type === "MultiLineString") {
      if (geom.coordinates.length > 0) {
        if (!start) start = geom.coordinates[0][0];
        const lastLine = geom.coordinates[geom.coordinates.length - 1];
        end = lastLine[lastLine.length - 1];
      }
    } else if (geom.type === "GeometryCollection") {
      geom.geometries.forEach(processGeometry);
    } else if (geom.type === "FeatureCollection") {
      geom.features.forEach((f: GeoJSON.Feature) =>
        processGeometry(f.geometry),
      );
    } else if (geom.type === "Feature") {
      processGeometry(geom.geometry);
    }
  };

  processGeometry(geojson);
  return { start, end };
}

// Info: (20260430 - Tzuhan) 輔助函數：計算 Geometry 的 Bounding Box [[minLng, minLat], [maxLng, maxLat]]

const MapViewerBase = (
  {
    routeGeojson = null,
    focusGeojson = null,
    className = "w-full h-full min-h-[600px]",
    interactive = true,
    hideLabel = false,
    fitBoundsPadding = 80,
    showRouteMarkers = false,
    duration = 2500,
  }: IMapViewerProps,
  ref: React.Ref<IMapViewerRef>,
) => {
  const { t } = useTranslation();
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const mapInstanceId = useId();

  const mapRef = useRef<MapRef>(null);
  const targetGeojson = focusGeojson || routeGeojson;
  const { start: startCoord, end: endCoord } = useMemo(
    () => getStartAndEndCoordinates(routeGeojson),
    [routeGeojson],
  );
  const initialBbox = useMemo(
    () => getBoundingBox(targetGeojson),
    [targetGeojson],
  );

  useImperativeHandle(
    ref,
    () => ({
      captureMap: () => {
        return new Promise<string | null>((resolve) => {
          if (!mapRef.current) return resolve(null);
          const map = mapRef.current.getMap();
          // Info: (20260501 - Luphia) 確保 MapLibre 完整渲染完畢後截取 WebGL Canvas
          map.once("render", () => {
            try {
              // Info: (20260501 - Luphia) 使用 image/jpeg 壓縮，避免 PNG 過大導致最終 PDF 超過 1MB
              resolve(map.getCanvas().toDataURL("image/jpeg", 0.8));
            } catch (e) {
              console.error("Failed to capture map data URL:", e);
              resolve(null);
            }
          });
          map.triggerRepaint();
        });
      },
    }),
    [],
  );

  useEffect(() => {
    if (targetGeojson && mapRef.current) {
      const bbox = getBoundingBox(targetGeojson);
      if (bbox) {
        // Info: (20260501 - Luphia) 確保重新匯出時能正確縮放，但避免重複觸發動畫
        mapRef.current.fitBounds(bbox, {
          padding: fitBoundsPadding,
          duration: 0,
          maxZoom: 12,
          essential: true,
        });
      }
    }
  }, [targetGeojson, fitBoundsPadding]);

  const handleMapLoad = () => {
    if (targetGeojson && mapRef.current) {
      const bbox = getBoundingBox(targetGeojson);
      if (bbox) {
        mapRef.current.fitBounds(bbox, {
          padding: fitBoundsPadding,
          duration,
          maxZoom: 12,
          essential: true,
        });
      }
    }
  };

  if (!mapTilerKey) {
    return (
      <div className="rounded bg-red-100 p-4 text-red-500">
        {t(
          "transportation_carbon_footprint_calculator.map.maptiler_key_not_set",
        )}
      </div>
    );
  }

  // Info: (20260430 - Tzuhan) dataviz-light
  // Info: (20260430 - Tzuhan) （要付費）使用 MapTiler 的 dataviz-light (高對比亮色，且保留國家邊界與地理脈絡) 底圖
  const mapStyle = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${mapTilerKey}`;
  const mapProps = {
    preserveDrawingBuffer: true,
  } as unknown as React.ComponentProps<typeof Map>;

  return (
    <div
      className={`${className} relative overflow-hidden rounded-xl shadow-2xl`}
    >
      <Map
        id={mapInstanceId}
        {...mapProps}
        ref={mapRef}
        attributionControl={hideLabel ? false : undefined}
        renderWorldCopies={false}
        initialViewState={
          initialBbox
            ? {
                bounds: initialBbox,
                fitBoundsOptions: { padding: fitBoundsPadding },
              }
            : {
                longitude: 150,
                latitude: 20,
                zoom: 2,
              }
        }
        mapStyle={mapStyle}
        interactive={interactive}
        onLoad={handleMapLoad}
      >
        {/* Info: (20260430 - Tzuhan) 如果傳入了 GeoJSON，就把它畫在圖層上 */}
        {routeGeojson && (
          <Source
            id={`route-source-${mapInstanceId}`}
            type="geojson"
            data={routeGeojson}
          >
            <Layer
              id={`route-layer-${mapInstanceId}`}
              type="line"
              paint={{
                // Info: (20260430 - Tzuhan) 如果 feature 有 properties.color 則使用，否則使用預設 ESG 螢光綠
                "line-color": ["coalesce", ["get", "color"], "#00E676"],
                "line-width": 3, // Info: (20260430 - Tzuhan) 線條寬度
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}

        {/* Info: (20260430 - Luphia) 若啟用，則在軌跡起訖點渲染獨立的圖標 */}
        {showRouteMarkers && startCoord && (
          <Marker
            longitude={startCoord[0]}
            latitude={startCoord[1]}
            anchor="bottom"
          >
            <div className="pointer-events-none flex flex-col items-center drop-shadow-md">
              <div className="mb-1 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
                <MapPin className="h-3 w-3 text-orange-600" />
                <span className="text-[10px] font-bold text-gray-800">
                  {t("transportation_carbon_footprint_calculator.map.origin")}
                </span>
              </div>
              <div className="h-0 w-0 border-t-[8px] border-r-[6px] border-l-[6px] border-t-white/90 border-r-transparent border-l-transparent"></div>
            </div>
          </Marker>
        )}

        {showRouteMarkers && endCoord && (
          <Marker
            longitude={endCoord[0]}
            latitude={endCoord[1]}
            anchor="bottom"
          >
            <div className="pointer-events-none flex flex-col items-center drop-shadow-md">
              <div className="mb-1 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm">
                <MapPin className="h-3 w-3 text-rose-600" />
                <span className="text-[10px] font-bold text-gray-800">
                  {t("transportation_carbon_footprint_calculator.map.dest")}
                </span>
              </div>
              <div className="h-0 w-0 border-t-[8px] border-r-[6px] border-l-[6px] border-t-white/90 border-r-transparent border-l-transparent"></div>
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
};

const MapViewer = forwardRef(MapViewerBase);
MapViewer.displayName = "MapViewer";

export default MapViewer;
