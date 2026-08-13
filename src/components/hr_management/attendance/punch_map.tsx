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
  const mapRef = useRef<MapRef | null>(null);

  /**
   * Info: (20260813 - Julian) 街道圖而不是資料視覺化底圖。
   *
   * 這一頁的地圖要回答的是「我站在哪、離工區多遠」，而那個問題的答案是
   * 路名與街廓 —— 一張沒有路名的淡色底圖，圈畫得再準也認不出自己在哪裡。
   * 現場頁相反：那裡的主角是四個圓圈，標註太多會蓋掉主角。
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
   * ToDo: (20260813 - Julian) 手機上單指拖曳會被地圖吃掉，使用者捲不動頁面。
   *
   * 演示全程在手機上進行（計畫書 §10），而打卡按鈕就在地圖下方 ——
   * 使用者想往下捲卻在拖地圖，是這一頁在手機上最可能被卡住的地方。
   * 正解是 `dragPan: false` + 「點一下啟用地圖」的遮罩，或改成雙指才平移。
   * 尚未實作：要先在真機上量過才知道哪一種不會誤觸。
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
