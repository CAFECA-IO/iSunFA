export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Info: (20260501 - Luphia) 半徑設為 6371 km (地球平均半徑)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}

export function splitAtAntimeridian(
  geometry: GeoJSON.Geometry | null | undefined,
): GeoJSON.Geometry | null {
  if (!geometry) return null;
  if (geometry.type === "GeometryCollection") return geometry;
  if (!("coordinates" in geometry) || !geometry.coordinates) return geometry;

  if (geometry.type === "LineString") {
    const coords = geometry.coordinates as number[][];
    const multiLines: number[][][] = [];
    let currentLine: number[][] = [];

    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i];
      if (i === 0) {
        currentLine.push([lng, lat]);
        continue;
      }

      const [prevLng, prevLat] = currentLine[currentLine.length - 1];

      if (lng - prevLng > 180) {
        const lngCont = lng - 360;
        const fraction =
          lngCont !== prevLng ? (-180 - prevLng) / (lngCont - prevLng) : 0.5;
        const latMid = prevLat + fraction * (lat - prevLat);

        currentLine.push([-180, latMid]);
        multiLines.push(currentLine);
        currentLine = [
          [180, latMid],
          [lng, lat],
        ];
      } else if (prevLng - lng > 180) {
        const lngCont = lng + 360;
        const fraction =
          lngCont !== prevLng ? (180 - prevLng) / (lngCont - prevLng) : 0.5;
        const latMid = prevLat + fraction * (lat - prevLat);

        currentLine.push([180, latMid]);
        multiLines.push(currentLine);
        currentLine = [
          [-180, latMid],
          [lng, lat],
        ];
      } else {
        currentLine.push([lng, lat]);
      }
    }

    if (currentLine.length > 0) {
      multiLines.push(currentLine);
    }

    if (multiLines.length > 1) {
      return {
        type: "MultiLineString",
        coordinates: multiLines,
      };
    } else {
      return {
        type: "LineString",
        coordinates: multiLines[0],
      };
    }
  }

  return geometry;
}

/**
 * Info: (20260813 - Julian) 以某點為圓心、指定半徑的多邊形近似圓（GeoJSON）。
 *
 * ## 為什麼不用地圖套件的 circle 圖層
 *
 * maplibre 的 `circle-radius` 單位是**螢幕像素**，不是公尺 —— 用它畫出來的圓
 * 放大縮小時涵蓋的實際範圍會一直改變。而這個圓要表達的正是
 * 「這個圍欄有多大」：畫錯大小，等於在畫面上對圍欄的範圍說謊，
 * 而觀眾唯一能拿來判斷「我站在這裡打不打得到卡」的就是它。
 *
 * 走大圓上的目標點公式（而不是把經緯度當平面加減）：
 * 在台灣的緯度上兩者差不到一公尺，但公式一樣短，沒有理由用近似的那個。
 */
export function circlePolygon(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  steps = 64,
): GeoJSON.Polygon {
  const R = 6371e3; // Info: (20260813 - Julian) 地球平均半徑（公尺），與 calculateDistanceKm 同源
  const angular = radiusMeters / R;
  const lat1 = (latitude * Math.PI) / 180;
  const lon1 = (longitude * Math.PI) / 180;

  const ring: [number, number][] = [];
  for (let index = 0; index < steps; index += 1) {
    const bearing = (2 * Math.PI * index) / steps;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angular) +
        Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
        Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
      );
    ring.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  // Info: (20260813 - Julian) GeoJSON 的環必須首尾相同，否則多數渲染器會靜默不畫
  ring.push(ring[0]);

  return { type: "Polygon", coordinates: [ring] };
}
