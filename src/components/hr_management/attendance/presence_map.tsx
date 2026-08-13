"use client";

import { FC, useMemo } from "react";
import Map, { Layer, Marker, Source } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  buildGeofenceFeatures,
  locationBounds,
  markerHeadcount,
} from "@/lib/utils/attendance_presence_view";
import { IPresenceLocationSummary } from "@/interfaces/attendance";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 現場地圖：工區圓心 + 圍欄圓圈 + 每個工區的人數。
 *
 * ## 地圖上沒有任何一個人的位置，而且拿不到
 *
 * 只畫 `WorkLocation` 的圓心與半徑。母文件 §D5 對「在地圖上顯示人」的隱私質疑，
 * 是靠「顯示地點、不顯示個人軌跡」回答的 —— 而這不只是前端的自律：
 * **API 根本不回傳員工座標**（那兩欄在資料庫裡是密文，判定用完就丟）。
 * 想在這張圖上畫出某個人的位置，得先改後端。
 *
 * ## 圓圈是真的 500 公尺
 *
 * 不用 maplibre 的 circle 圖層（半徑單位是螢幕像素），改用 `circlePolygon`
 * 算出真實座標的多邊形。這個圓要回答的正是「我站在這裡打不打得到卡」，
 * 畫錯大小等於對圍欄的範圍說謊。
 */

const PresenceMap: FC<{
  locations: IPresenceLocationSummary[];
  selectedId: string | null;
  onSelect: (workLocationId: string) => void;
}> = ({ locations, selectedId, onSelect }) => {
  const { t } = useTranslation();
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  const features = useMemo(
    () => buildGeofenceFeatures(locations, selectedId),
    [locations, selectedId],
  );
  const bounds = useMemo(() => locationBounds(locations), [locations]);

  /**
   * Info: (20260813 - Julian) 沒有金鑰時**不擋住整頁**，只把地圖換成一行說明。
   *
   * 地圖是這一頁的配角：人數、名單、匯出都不需要它。演示當天若金鑰失效
   * （或會場連不上 MapTiler），紅色錯誤框會讓整頁看起來壞掉，
   * 而其實壞掉的只有底圖 —— 執行手冊的備援分級講的就是這件事。
   */
  if (!mapTilerKey || !bounds) {
    return (
      <div className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-400 ring-1 ring-gray-200">
        {t("hr_management.attendance_presence.map_unavailable")}
      </div>
    );
  }

  return (
    <div className="relative h-80 overflow-hidden rounded-2xl ring-1 ring-gray-200">
      <Map
        initialViewState={{ bounds, fitBoundsOptions: { padding: 64 } }}
        mapStyle={`https://api.maptiler.com/maps/dataviz-light/style.json?key=${mapTilerKey}`}
      >
        <Source id="attendance-geofence" type="geojson" data={features}>
          <Layer
            id="attendance-geofence-fill"
            type="fill"
            paint={{
              "fill-color": ["case", ["get", "selected"], "#f97316", "#94a3b8"],
              "fill-opacity": ["case", ["get", "selected"], 0.22, 0.12],
            }}
          />
          <Layer
            id="attendance-geofence-line"
            type="line"
            paint={{
              "line-color": ["case", ["get", "selected"], "#f97316", "#94a3b8"],
              "line-width": 2,
            }}
          />
        </Source>

        {locations.map((location) => {
          const headcount = markerHeadcount(location);
          const hasUnconfirmed = location.staleCount > 0;

          return (
            <Marker
              key={location.workLocationId}
              longitude={location.longitude}
              latitude={location.latitude}
              anchor="center"
              onClick={() => onSelect(location.workLocationId)}
            >
              {/**
               * Info: (20260813 - Julian) 數字是「在班 + 未打下班卡」。
               *
               * `STALE` 的語意是「系統不知道他在不在」—— 把他從地圖上的數字裡
               * 拿掉，就是把「不確定」顯示成「不在」。疏散時要問的是
               * 「這個工區裡最多可能有幾個人」，分項留給下面的地點卡片。
               */}
              <button
                type="button"
                title={t("hr_management.attendance_presence.marker_hint", {
                  name: location.name,
                  onSite: location.onSiteCount,
                  stale: location.staleCount,
                })}
                className={`flex size-9 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-white shadow-md transition ${
                  location.workLocationId === selectedId
                    ? "bg-orange-500 ring-4 ring-orange-200"
                    : "bg-slate-500 hover:bg-slate-600"
                } ${hasUnconfirmed ? "outline outline-2 outline-offset-1 outline-amber-400" : ""}`}
              >
                {headcount}
              </button>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
};

export default PresenceMap;
