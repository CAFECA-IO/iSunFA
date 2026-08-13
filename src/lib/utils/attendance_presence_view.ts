import { PresenceStatus } from "@/constants/attendance";
import { circlePolygon } from "@/lib/utils/geo";
import {
  IPresenceEntry,
  IPresenceLocationSummary,
} from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 現場頁的顯示邏輯。純函數，不碰 React 也不碰網路。
 *
 * ## 這裡不會出現任何員工座標
 *
 * 地圖上只有 `WorkLocation` 的圓心與圍欄圓圈。母文件 §D5 對「在地圖上顯示人」
 * 的隱私質疑，是靠「只顯示地點、不顯示個人軌跡」回答的 ——
 * 而 API 本來就不回傳員工座標（那些欄位在資料庫裡是密文）。
 * 這一層再確認一次：**能畫出人的資料，前端根本拿不到。**
 */

/**
 * Info: (20260813 - Julian) 標記上的數字 = **在班 + 未打下班卡**。
 *
 * ## 為什麼不是只算在班
 *
 * 母文件 §D5 原本寫「標記上的數字 = 該地點目前在班人數」。但 `STALE` 的語意是
 * 「系統不知道他在不在」，而不是「他不在」—— 把他從地圖上的數字裡拿掉，
 * 就是**把「不確定」顯示成「不在」，那是母文件 §D10.4 自己點名的
 * 「這類系統最危險的失真」**。
 *
 * 疏散時要問的是「這個工區裡最多可能有幾個人」，而那個數字必須含 `STALE`。
 * 分項留給地點卡片，地圖上只回答「這裡要找幾個人」。
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
 *
 * 只有一個地點時整個框會退化成一個點，地圖會縮到最大 —— 因此給一個
 * 最小跨距。0.01 度約一公里，足以讓 800 公尺的圍欄整個入鏡。
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
 * Info: (20260813 - Julian) 名單排序：**未打下班卡的排最前面**。
 *
 * 他們是緊急點名時要優先打電話確認的對象（母文件 §D10.4）。
 * 依工號排序看起來比較整齊，但那份整齊會讓最該被看到的三個人
 * 散落在四十個人中間 —— 而看板存在的理由就是讓人一眼看到該處理的事。
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
 * Info: (20260813 - Julian) 進頁時預設選哪一個工區。
 *
 * 取人數最多的那一個，而不是清單第一個 —— 一個開起來就是空名單的看板，
 * 會讓人以為系統壞了。人數全為零時回 null，此時該顯示的是
 * 「目前沒有人在任何工區」，那是一個結論，不是一個空畫面。
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
