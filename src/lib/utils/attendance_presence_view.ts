import { PresenceStatus } from "@/constants/attendance";
import { circlePolygon } from "@/lib/utils/geo";
import {
  IPresenceEntry,
  IPresenceLocationSummary,
} from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 現場頁的顯示邏輯。純函數，不碰 React 也不碰網路。
 * 地圖上不會出現任何員工座標：只畫 `WorkLocation` 的圓心與圍欄圈——
 * API 本來就不回傳員工座標（母文件 §D5）。
 */

/**
 * Info: (20260813 - Julian) 標記上的數字 = **在班 + 未打下班卡**。
 * `STALE` 的語意是「系統不知道他在不在」而不是「他不在」，
 * 拿掉他就是把「不確定」顯示成「不在」（母文件 §D10.4）。
 * 疏散時要問的是「這個工區裡最多可能有幾個人」，這個數字必須含 `STALE`。
 */
export function markerHeadcount(location: IPresenceLocationSummary): number {
  return location.onSiteCount + location.staleCount;
}

// Info: (20260813 - Julian) 圍欄圓圈的 GeoJSON。選取狀態帶在 properties 裡供圖層上色
export function buildGeofenceFeatures(
  locations: IPresenceLocationSummary[],
  selectedId: string | null,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations.map((location) => ({
      type: "Feature",
      properties: {
        workLocationId: location.workLocationId,
        selected: location.workLocationId === selectedId,
      },
      geometry: circlePolygon(
        location.latitude,
        location.longitude,
        location.radiusMeters,
      ),
    })),
  };
}

/**
 * Info: (20260813 - Julian) 涵蓋所有地點的邊界框，供地圖初始化時 fitBounds。
 * 只有一個地點時給最小跨距，避免地圖縮到最大（0.01 度約一公里）。
 */
export function locationBounds(
  locations: IPresenceLocationSummary[],
): [[number, number], [number, number]] | null {
  if (locations.length === 0) return null;

  const longitudes = locations.map((location) => location.longitude);
  const latitudes = locations.map((location) => location.latitude);

  let minLng = Math.min(...longitudes);
  let maxLng = Math.max(...longitudes);
  let minLat = Math.min(...latitudes);
  let maxLat = Math.max(...latitudes);

  const MIN_SPAN = 0.01;
  if (maxLng - minLng < MIN_SPAN) {
    minLng -= MIN_SPAN / 2;
    maxLng += MIN_SPAN / 2;
  }
  if (maxLat - minLat < MIN_SPAN) {
    minLat -= MIN_SPAN / 2;
    maxLat += MIN_SPAN / 2;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * Info: (20260813 - Julian) 名單排序：**未打下班卡的排最前面**——他們是緊急點名時
 * 要優先打電話確認的對象（母文件 §D10.4）。
 */
export function sortRosterEntries(entries: IPresenceEntry[]): IPresenceEntry[] {
  return [...entries].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === PresenceStatus.STALE ? -1 : 1;
    }
    return a.sinceMinute - b.sinceMinute;
  });
}

/**
 * Info: (20260813 - Julian) 進頁時預設選哪一個工區：取人數最多的那一個，而不是清單第一個，
 * 避免開起來就是空名單。人數全為零時回 null——那是一個結論，不是一個空畫面。
 */
export function defaultSelectedLocation(
  locations: IPresenceLocationSummary[],
): string | null {
  const populated = locations.filter(
    (location) => markerHeadcount(location) > 0,
  );
  if (populated.length === 0) return null;

  return populated.reduce((best, current) =>
    markerHeadcount(current) > markerHeadcount(best) ? current : best,
  ).workLocationId;
}
