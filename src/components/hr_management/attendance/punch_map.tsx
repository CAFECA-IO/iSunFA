"use client";

import { FC, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * Info: (20260813 - Julian) 打卡頁地圖：圍欄 + 工區標記 + 自己的位置與精度圈。
 *
 * ## 它是輔助，不是前提
 *
 * 上方的定位狀態列已經把該說的話說完了（在不在範圍內、距中心幾公尺、精度多少）。
 * 這張圖只是把那些數字變成看得見的東西 —— 因此**地圖掛掉時打卡完全不受影響**，
 * 只換成一行說明。把 MapTiler 放進打卡的關鍵路徑，等於讓一個外部服務
 * 決定工地上的人能不能簽到。
 *
 * ## 只畫自己
 *
 * 現場頁刻意不畫任何人的位置（母文件 §D5）。這裡畫的是使用者本人 ——
 * 那條邊界管的是「看見別人」，不是「看見自己」。同事一個都不會出現在這張圖上。
 *
 * ## 視野跟著座標動
 *
 * `initialViewState` 只在掛載時生效一次，而示範模式輸入遠處座標時**視野必須跟著變** ——
 * 否則畫面會停在工區上，文字說「距工區 3.2 公里」而圖上看不到那個人，
 * 那是自相矛盾的一幕，而它正好發生在 P2 最關鍵的那一步。
 * 因此改用 ref + `fitBounds`，並刻意留 600ms 動畫：**縮出去的那個過程本身就是說明**。
 */
const PunchMap: FC<{
  locations: IWorkLocationSummary[];
  nearestLocation: IWorkLocationSummary | null;
  reading: IGeolocationReading | null;
  inside: boolean;
}> = ({ locations, nearestLocation, reading, inside }) => {
  const { t } = useTranslation();
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const mapRef = useRef<MapRef | null>(null);

  /**
   * Info: (20260813 - Julian) 底圖載入失敗時退回一行說明。
   *
   * 只檢查「有沒有金鑰」不夠 —— **一把錯的金鑰會通過那個檢查**，
   * 然後 maplibre 取不到 style，畫面上留下一塊空白的灰色方框。
   */
  const [hasMapError, setHasMapError] = useState<boolean>(false);

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

  if (!mapTilerKey || !bounds || hasMapError) {
    return (
      <div className="rounded-2xl bg-gray-50 px-4 py-4 text-center text-xs text-gray-400 ring-1 ring-gray-200">
        {t("hr_management.attendance.map_unavailable")}
      </div>
    );
  }

  return (
    <div className="relative h-64 overflow-hidden rounded-2xl ring-1 ring-gray-200">
      <Map
        ref={mapRef}
        initialViewState={{ bounds, fitBoundsOptions: { padding: 48 } }}
        mapStyle={`https://api.maptiler.com/maps/dataviz-light/style.json?key=${mapTilerKey}`}
        onError={() => setHasMapError(true)}
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
             * Info: (20260813 - Julian) 自己的位置。圈內圈外用顏色分 ——
             * 顏色不是唯一線索：上方狀態列已經用文字說過同一件事，
             * 這裡的顏色只是讓那句話在圖上找得到對應（W11 的紅綠色盲檢討同理）。
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
