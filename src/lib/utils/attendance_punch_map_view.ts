import { IWorkLocationSummary } from "@/interfaces/attendance";
// Info: (20260813 - Julian) 只取型別：這支模組是純計算，不該把一個 React hook 拖進執行期相依
import type { IGeolocationReading } from "@/hooks/use_geolocation";
import { circlePolygon } from "@/lib/utils/geo";

/**
 * Info: (20260813 - Julian) 打卡頁地圖的純計算。
 * 與現場頁不同，這張圖上有「我」：現場頁刻意不畫任何人的位置（母文件 §D5），
 * 但打卡頁畫的是使用者自己，那條隱私邊界不禁止你看見自己。
 */

// Info: (20260813 - Julian) 緯度一度約 111,320 公尺；換算圍欄半徑用得到
const METERS_PER_DEGREE = 111_320;

/**
 * Info: (20260813 - Julian) 圍欄多邊形。**用真實座標算，不用螢幕像素半徑**——
 * maplibre 的 circle 圖層半徑單位是像素，縮放時圈的實際涵蓋範圍會跟著變，
 * 而這個圓要回答的正是「我站在這裡打不打得到卡」。
 */
export function buildPunchGeofenceFeatures(
  locations: IWorkLocationSummary[],
  nearestId: string | null,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations.map((location) => ({
      type: "Feature",
      properties: {
        workLocationId: location.id,
        nearest: location.id === nearestId,
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
 * Info: (20260813 - Julian) 定位精度圈：把「系統對你在哪有多大把握」畫出來，
 * 沒有它使用者會以為藍點是精確的，G3 的「定位精度不足」也就無從理解。
 */
export function accuracyCircleFeature(
  reading: IGeolocationReading | null,
): GeoJSON.FeatureCollection {
  if (!reading || reading.accuracyMeters <= 0) {
    return { type: "FeatureCollection", features: [] };
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: circlePolygon(
          reading.latitude,
          reading.longitude,
          reading.accuracyMeters,
        ),
      },
    ],
  };
}

/**
 * Info: (20260813 - Julian) 地圖視野：**圍欄與使用者必須同時入鏡**，否則說不出「我在外面」。
 * 框的是圍欄的外緣而非圓心：以圓心入鏡，大半徑的圈會有一半在畫面外。
 */
export function punchMapBounds(
  location: IWorkLocationSummary | null,
  reading: IGeolocationReading | null,
): [[number, number], [number, number]] | null {
  const longitudes: number[] = [];
  const latitudes: number[] = [];

  if (location) {
    // Info: (20260813 - Julian) 經度一度的實際距離隨緯度收縮，因此要除以 cos(lat)
    const latSpan = location.radiusMeters / METERS_PER_DEGREE;
    const lngSpan =
      location.radiusMeters /
      (METERS_PER_DEGREE * Math.cos((location.latitude * Math.PI) / 180));

    latitudes.push(location.latitude - latSpan, location.latitude + latSpan);
    longitudes.push(location.longitude - lngSpan, location.longitude + lngSpan);
  }

  if (reading) {
    latitudes.push(reading.latitude);
    longitudes.push(reading.longitude);
  }

  if (latitudes.length === 0) return null;

  let minLng = Math.min(...longitudes);
  let maxLng = Math.max(...longitudes);
  let minLat = Math.min(...latitudes);
  let maxLat = Math.max(...latitudes);

  // Info: (20260813 - Julian) 最小跨距：人站在圓心上時避免框退化成一個點（0.004 度約 440 公尺）
  const MIN_SPAN = 0.004;
  if (maxLng - minLng < MIN_SPAN) {
    const pad = (MIN_SPAN - (maxLng - minLng)) / 2;
    minLng -= pad;
    maxLng += pad;
  }
  if (maxLat - minLat < MIN_SPAN) {
    const pad = (MIN_SPAN - (maxLat - minLat)) / 2;
    minLat -= pad;
    maxLat += pad;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
