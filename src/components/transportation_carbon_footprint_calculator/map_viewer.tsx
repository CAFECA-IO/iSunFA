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
import { haversineMeters } from "@/lib/utils/map_scale_bar";
import {
  isUniformPixelData,
  MAP_BLANK_SAMPLE_SIZE,
} from "@/lib/utils/map_capture_quality";
import {
  MAP_IDLE_TIMEOUT_MS,
  MAP_STYLE_READY_TIMEOUT_MS,
} from "@/constants/logistics_pdf";
// Info: (20260731 - Luphia) maplibre-gl v6 移除了 default export,故以命名型別匯入(v5/v6 皆提供 MapLibreMap 別名)。
// Info: (20260731 - Luphia) 請勿改回 `import type maplibregl from "maplibre-gl"`,那會在 CI 以 TS1192 失敗。
// Info: (20260801 - Luphia) v5/v6 皆匯出 MapLibreMap,故 maplibre-gl 回退至 v5 後此寫法仍成立,無須改動。
import type { MapLibreMap } from "maplibre-gl";

/**
 * Info: (20260731 - Tzuhan) 輪詢樣式是否就緒。
 *
 * **刻意不用 `map.once("load")`**:`load` 是一次性事件,若在我們開始等待之前就已經觸發,
 * 那個 await 會白等到逾時為止。實測第一條路線的空運段就是這樣被判成缺圖 ——
 * 樣式其實早就載好了,我們卻在等一個永遠不會再來的事件。
 * 輪詢對「已經發生」與「即將發生」兩種情況都成立,這是它比事件可靠的地方。
 */
const waitForStyleReady = async (
  map: MapLibreMap,
  timeoutMs: number,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (map.isStyleLoaded()) return true;
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }
  // Info: (20260731 - Tzuhan) maplibre 的 isStyleLoaded 型別為 boolean | void(未設樣式時回 undefined)
  return Boolean(map.isStyleLoaded());
};

/**
 * Info: (20260731 - Tzuhan) 等 idle 或逾時。idle 會反覆觸發,故用一次性監聽是安全的。
 * 回傳是否真的等到,供呼叫端記錄「截到的是完整畫面還是逾時畫面」。
 */
const waitForIdle = (map: MapLibreMap, timeoutMs: number): Promise<boolean> =>
  new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    map.once("idle", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });

/**
 * Info: (20260731 - Tzuhan) 畫布是否為空白(未繪製)。
 * 縮到 8×8 再讀像素:成本約一毫秒,而批次要跑上百次。
 * 讀不到像素時回 false(寧可放行也不要因為判定工具本身失敗而丟掉一張好圖)。
 */
const isCanvasBlank = (canvas: HTMLCanvasElement): boolean => {
  try {
    const probe = document.createElement("canvas");
    probe.width = MAP_BLANK_SAMPLE_SIZE;
    probe.height = MAP_BLANK_SAMPLE_SIZE;
    const context = probe.getContext("2d");
    if (!context) return false;
    context.drawImage(canvas, 0, 0, probe.width, probe.height);
    return isUniformPixelData(
      context.getImageData(0, 0, probe.width, probe.height).data,
    );
  } catch {
    return false;
  }
};

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

/**
 * Info: (20260731 - Tzuhan) 單張地圖的截圖結果。
 * metersPerPixel 由 bounds 與畫布寬度實算而非由 zoom 推導 —— 報告的比例尺必須對得上實際畫面。
 */
export interface IMapCapture {
  dataUrl: string;
  metersPerPixel: number;
  /**
   * Info: (20260801 - Luphia) 截圖畫布的 CSS 尺寸。與 metersPerPixel 成對回報:
   * 後者只說「一像素多少公尺」,要知道整張圖橫跨多遠還得知道有幾個像素。
   * 列印端據此算出影像的紙面尺寸與比例尺長度 —— 缺這兩個值就只能拿版面寬度去猜,
   * 而那正是先前比例尺長度算錯的原因。
   */
  widthPx: number;
  heightPx: number;
}

export interface IMapViewerRef {
  captureMap: () => Promise<string | null>;
  /**
   * Info: (20260731 - Tzuhan) 截取「聚焦於某段幾何」的圖(issue 08 實測回報:缺接駁段路徑圖)。
   *
   * 以命令式而非改 prop 實作,是為了在**同一個 WebGL context** 內連續產出多張圖:
   * 每段各掛一個 MapViewer 會撞瀏覽器的同時 context 上限
   * (plan_section.tsx 當年就是為此移除逐段縮圖 —— 註解仍在)。
   * 截完會還原原本的視野,避免影響後續的全程圖。
   */
  captureGeometry: (
    geometry: GeoJSON.Geometry | null,
    options?: {
      /**
       * Info: (20260731 - Tzuhan) 只畫這一段。逐段圖若同時顯示陸運與空運兩條線,
       * 讀者無法判斷哪一條才是本段,那張圖就不能單獨作為該段的證據。
       * 全程圖不設此旗標(它本來就該顯示所有段)。
       */
      soloFeature?: boolean;
    },
  ) => Promise<IMapCapture | null>;
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

      captureGeometry: async (geometry, options) => {
        if (!mapRef.current || !geometry) return null;
        const map = mapRef.current.getMap();
        const bbox = getBoundingBox(geometry);
        if (!bbox) return null;

        /**
         * Info: (20260731 - Tzuhan) 先等樣式載入完成才動作。
         * 實測第一條路線的四張圖全是純黑且完全相同:離屏元件的 onReady 是固定 2 秒,
         * 但首次載入要取樣式 JSON、字型與圖磚,兩秒不夠;樣式未載入時 fitBounds 不會重繪,
         * 而 preserveDrawingBuffer 讓 toDataURL 回傳那個從未被繪製的緩衝區。
         * 第二條路線之後樣式已快取,所以問題只出現在第一條 —— 這也是它難以察覺的原因。
         */
        const startedAt = Date.now();
        const styleReady = await waitForStyleReady(
          map,
          MAP_STYLE_READY_TIMEOUT_MS,
        );

        // Info: (20260731 - Tzuhan) 記下原視野,截完還原,才不會污染後續的全程圖
        const previousCenter = map.getCenter();
        const previousZoom = map.getZoom();

        /**
         * Info: (20260731 - Tzuhan) 只畫這一段(solo)。
         *
         * captureGeometry 原本只改視野,圖層資料仍是整條路線,於是接駁段的小圖上
         * 同時出現陸運與空運兩條線 —— 一張「巴黎 → 空軍基地」的圖裡橫著一條飛往柏林的
         * 藍線,讀者無法判斷哪條才是這一段。逐段圖的用途是單獨證明該段,必須只有一條線。
         *
         * 以 setData 暫時替換資料源而非改 props:props 走 React 渲染週期,
         * 在同一個 async 函式內無法保證已套用;截完立即還原。
         */
        const source = options?.soloFeature
          ? (map.getSource(`route-source-${mapInstanceId}`) as
              | { setData?: (data: GeoJSON.GeoJSON) => void }
              | undefined)
          : undefined;
        if (source?.setData) {
          // Info: (20260731 - Tzuhan) 沿用原 feature 的顏色(以幾何物件比對),讓小圖與全程圖的配色一致
          const original = routeGeojson as FeatureCollection<Geometry> | null;
          const matched = original?.features?.find(
            (feature) => feature.geometry === geometry,
          );
          source.setData({
            type: "FeatureCollection",
            features: [
              matched ?? {
                type: "Feature",
                properties: {},
                geometry: geometry as Geometry,
              },
            ],
          });
        }

        map.fitBounds(bbox, {
          padding: fitBoundsPadding,
          duration: 0,
          maxZoom: 14,
          essential: true,
        });

        // Info: (20260731 - Tzuhan) 明確要求重繪再等 idle:視野變更後若沒有實際重繪,
        // Info: (20260731 - Tzuhan) preserveDrawingBuffer 會讓我們截到上一張圖(實測四張完全相同)
        map.triggerRepaint();
        const becameIdle = await waitForIdle(map, MAP_IDLE_TIMEOUT_MS);

        let capture: IMapCapture | null = null;
        try {
          const canvas = map.getCanvas();
          /**
           * Info: (20260731 - Tzuhan) 空白畫面一律當作沒有截到。
           * 一張純黑方塊被放進報告當證據,比缺圖糟得多:缺圖讀者知道沒有,
           * 黑方塊會被讀成「這段就是這樣」。
           */
          if (isCanvasBlank(canvas)) {
            // Info: (20260731 - Tzuhan) 印出判定依據:缺圖有數種成因,不記下來下次還是得靠猜
            console.warn(
              `[mapCapture] blank canvas — styleReady=${styleReady} idle=${becameIdle} elapsed=${Date.now() - startedAt}ms`,
            );
            if (source?.setData && routeGeojson) {
              source.setData(routeGeojson as GeoJSON.GeoJSON);
            }
            map.jumpTo({ center: previousCenter, zoom: previousZoom });
            return null;
          }
          // Info: (20260731 - Tzuhan) 以實際 bounds 與畫布寬度算每像素公尺數,不由 zoom 反推
          const bounds = map.getBounds();
          const centerLat = bounds.getCenter().lat;
          const spanMeters =
            haversineMeters(
              centerLat,
              bounds.getWest(),
              centerLat,
              bounds.getEast(),
            ) || 0;
          // Info: (20260801 - Luphia) 一律取 CSS 尺寸:metersPerPixel 以它為分母,
          // Info: (20260801 - Luphia) 回報的尺寸若混用 device pixel 兩者就不同基準,乘回去得不到真實跨距
          const widthCssPx = canvas.clientWidth || canvas.width;
          const heightCssPx = canvas.clientHeight || canvas.height;
          capture = {
            dataUrl: canvas.toDataURL("image/jpeg", 0.8),
            metersPerPixel: widthCssPx > 0 ? spanMeters / widthCssPx : 0,
            widthPx: widthCssPx,
            heightPx: heightCssPx,
          };
        } catch (e) {
          console.error("Failed to capture leg map:", e);
        }

        // Info: (20260731 - Tzuhan) 還原資料源與視野:下一張圖(或畫面上的地圖)不該被這次截圖影響
        if (source?.setData && routeGeojson) {
          source.setData(routeGeojson as GeoJSON.GeoJSON);
        }
        map.jumpTo({ center: previousCenter, zoom: previousZoom });
        return capture;
      },
    }),
    [fitBoundsPadding, mapInstanceId, routeGeojson],
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
