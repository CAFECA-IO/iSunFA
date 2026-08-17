"use client";

import { FC, useEffect, useMemo, useRef } from "react";
import Map, { Layer, MapRef, Marker, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  accuracyCircleFeature,
  buildPunchGeofenceFeatures,
  punchMapBounds,
} from "@/lib/utils/attendance_punch_map_view";
import { IWorkLocationSummary } from "@/interfaces/attendance";
import { IGeolocationReading } from "@/hooks/use_geolocation";
import { useTranslation } from "@/i18n/i18n_context";
import { MAPTILER_STYLE, useMapStyle } from "@/hooks/use_map_style";

/**
 * Info: (20260813 - Julian) 打卡頁地圖：圍欄 + 工區標記 + 自己的位置與精度圈。
 *
 * 只是輔助：地圖掛掉時打卡完全不受影響，只換成一行說明。
 * 地圖上只畫使用者自己，不畫任何他人位置。
 * 視野跟著座標變動，因此用 ref + `fitBounds`（`initialViewState` 只在掛載時生效一次）。
 */
const PunchMap: FC<{
  locations: IWorkLocationSummary[];
  nearestLocation: IWorkLocationSummary | null;
  reading: IGeolocationReading | null;
  inside: boolean;
}> = ({ locations, nearestLocation, reading, inside }) => {
  const { t } = useTranslation();
  const mapRef = useRef<MapRef | null>(null);

  /**
   * Info: (20260813 - Julian) 用街道圖而非資料視覺化底圖：這一頁要回答
   * 「我站在哪、離工區多遠」，需要路名。現場頁相反，主角是圓圈，標註太多會蓋掉主角。
   */
  const { styleUrl, checking, reportError } = useMapStyle(
    MAPTILER_STYLE.STREETS,
  );

  const fences = useMemo(
    () => buildPunchGeofenceFeatures(locations, nearestLocation?.id ?? null),
    [locations, nearestLocation],
  );
  const accuracy = useMemo(() => accuracyCircleFeature(reading), [reading]);
  const bounds = useMemo(
    () => punchMapBounds(nearestLocation, reading),
    [nearestLocation, reading],
  );

  useEffect(() => {
    if (!bounds) return;
    mapRef.current?.fitBounds(bounds, { padding: 48, duration: 600 });
  }, [bounds]);

  // Info: (20260813 - Julian) 還在確認金鑰時什麼都不顯示，避免先閃一下錯誤訊息再出現地圖
  if (checking) return null;

  if (!styleUrl || !bounds) {
    return (
      <div className="rounded-2xl bg-gray-50 px-4 py-4 text-center text-xs text-gray-400 ring-1 ring-gray-200">
        {t("hr_management.attendance.map_unavailable")}
      </div>
    );
  }

  /**
   * ToDo: (20260813 - Julian) 手機上單指拖曳會被地圖吃掉，使用者捲不動頁面——
   * 打卡按鈕就在地圖下方，最容易被卡住。
   * 正解是 `dragPan: false` + 「點一下啟用地圖」的遮罩，或改成雙指才平移；
   * 尚未實作，需先在真機上驗證。
   */
  return (
    <div className="relative h-64 overflow-hidden rounded-2xl ring-1 ring-gray-200">
      <Map
        ref={mapRef}
        initialViewState={{ bounds, fitBoundsOptions: { padding: 48 } }}
        mapStyle={styleUrl}
        onError={reportError}
      >
        {/**
         * Info: (20260813 - Julian) 圍欄。最近的那一個用橘色，其餘灰色 ——
         * 打卡命中多個圍欄時取距離最小者，顏色要與那條規則一致。
         */}
        <Source id="punch-geofence" type="geojson" data={fences}>
          <Layer
            id="punch-geofence-fill"
            type="fill"
            paint={{
              "fill-color": ["case", ["get", "nearest"], "#f97316", "#94a3b8"],
              "fill-opacity": ["case", ["get", "nearest"], 0.18, 0.08],
            }}
          />
          <Layer
            id="punch-geofence-line"
            type="line"
            paint={{
              "line-color": ["case", ["get", "nearest"], "#f97316", "#94a3b8"],
              "line-width": 2,
            }}
          />
        </Source>

        {/**
         * Info: (20260813 - Julian) 精度圈畫在圍欄**之上**：兩者重疊時
         * 使用者要看得出來自己的不確定範圍有沒有跨出圍欄邊界。
         */}
        <Source id="punch-accuracy" type="geojson" data={accuracy}>
          <Layer
            id="punch-accuracy-fill"
            type="fill"
            paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.14 }}
          />
        </Source>

        {locations.map((location) => (
          <Marker
            key={location.id}
            longitude={location.longitude}
            latitude={location.latitude}
            anchor="bottom"
          >
            <div
              title={location.name}
              className={`flex size-7 items-center justify-center rounded-full text-white shadow-md ${
                location.id === nearestLocation?.id
                  ? "bg-orange-500"
                  : "bg-slate-400"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2l2.9 6.26 6.6.6-5 4.4 1.5 6.74L12 16.9 6 20l1.5-6.74-5-4.4 6.6-.6z" />
              </svg>
            </div>
          </Marker>
        ))}

        {reading && (
          <Marker
            longitude={reading.longitude}
            latitude={reading.latitude}
            anchor="center"
          >
            {/**
             * Info: (20260813 - Julian) 自己的位置：圈內圈外用顏色分，且上方狀態列
             * 已用文字說過同一件事，顏色只是輔助對應。
             */}
            <div
              title={t("hr_management.attendance.map_self_label")}
              className={`size-4 rounded-full border-2 border-white shadow-md ${
                inside ? "bg-blue-600" : "bg-red-500"
              }`}
            />
          </Marker>
        )}
      </Map>
    </div>
  );
};

export default PunchMap;
