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
import { MAPTILER_STYLE, useMapStyle } from "@/hooks/use_map_style";

/**
 * Info: (20260813 - Julian) 現場地圖：工區圓心 + 圍欄圓圈 + 每個工區的人數。
 *
 * 地圖上不畫任何人的位置，且 API 本身不回傳員工座標。
 * 圍欄圓要用真實座標算出多邊形（`circlePolygon`），不可用 maplibre 的
 * circle 圖層——它的半徑單位是螢幕像素，畫出來的圈會是錯的。
 */

const PresenceMap: FC<{
  locations: IPresenceLocationSummary[];
  selectedId: string | null;
  onSelect: (workLocationId: string) => void;
}> = ({ locations, selectedId, onSelect }) => {
  const { t } = useTranslation();

  /**
   * Info: (20260813 - Julian) 淡色底圖：這一頁的主角是四個工區的圓圈與人數，
   * 路名與 POI 太搶眼會蓋掉主角。打卡頁相反，那裡要的正是路名。
   */
  const { styleUrl, checking, reportError } = useMapStyle(
    MAPTILER_STYLE.DATAVIZ,
  );

  const features = useMemo(
    () => buildGeofenceFeatures(locations, selectedId),
    [locations, selectedId],
  );
  const bounds = useMemo(() => locationBounds(locations), [locations]);

  /**
   * Info: (20260813 - Julian) 沒有金鑰時不擋住整頁，只把地圖換成一行說明——
   * 地圖是配角，人數、名單、匯出都不需要它。
   */
  // Info: (20260813 - Julian) 還在確認金鑰時什麼都不顯示，避免先閃一下錯誤訊息再出現地圖
  if (checking) return null;

  if (!styleUrl || !bounds) {
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
        mapStyle={styleUrl}
        onError={reportError}
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
               * Info: (20260813 - Julian) 數字是「在班 + 未打下班卡」——`STALE` 代表
               * 系統不知道他在不在，不能從數字裡拿掉，否則「不確定」會被顯示成「不在」。
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
