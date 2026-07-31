// Info: (20260731 - Tzuhan) 地圖 bbox 計算(純幾何,自 map_viewer.tsx 抽出)
// Info: (20260731 - Tzuhan) 抽出的理由:這是幾何運算而非 UI,且跨換日線的修正必須能被單元測試 ——
// Info: (20260731 - Tzuhan) 實測回報「地圖上路線超出邊界」的成因就在這裡,不是圖資限制。

export type MapGeoJsonInput =
  | GeoJSON.FeatureCollection
  | GeoJSON.Feature
  | GeoJSON.Geometry
  | null;

// Info: (20260430 - Tzuhan) 輔助函數:計算 Geometry 的 Bounding Box [[minLng, minLat], [maxLng, maxLat]]
export function getMapBoundingBox(
  geojson: MapGeoJsonInput,
): [[number, number], [number, number]] | null {
  if (!geojson) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  const updateBounds = (coord: number[]) => {
    if (coord[0] < minX) minX = coord[0];
    if (coord[0] > maxX) maxX = coord[0];
    if (coord[1] < minY) minY = coord[1];
    if (coord[1] > maxY) maxY = coord[1];
  };

  const processGeometry = (geom: GeoJSON.GeoJSON | null) => {
    if (!geom) return;
    if (geom.type === "LineString") {
      geom.coordinates.forEach(updateBounds);
    } else if (geom.type === "MultiLineString") {
      geom.coordinates.forEach((line: number[][]) =>
        line.forEach(updateBounds),
      );
    } else if (geom.type === "Point") {
      updateBounds(geom.coordinates);
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

  if (minX === Infinity) return null;

  /**
   * Info: (20260731 - Tzuhan) 跨換日線修正。
   *
   * splitAtAntimeridian 會把跨越 ±180° 的路徑切成兩段(例如檀香山 → 東京
   * 切成 -157.8…-180 與 180…139.7),對切開後的座標取天真 min/max 會得到
   * -180…180 —— **跨度 360 度的全球 bbox**,fitBounds 於是縮到整個世界,
   * 路線只剩畫面左右兩側各一小截,看起來就是「路線超出邊界」。
   * 該航程的實際經度跨度只有 62.5 度。
   *
   * 判準:跨度超過 180 度即視為橫跨換日線(真正跨越半個地球以上的單一運輸段
   * 在實務上不存在),把西半球的經度 +360 後重算,讓 bbox 連續。
   * maplibre 接受超出 [-180, 180] 的經度並自行正規化,故可直接回傳。
   */
  if (maxX - minX > 180) {
    let shiftedMin = Infinity;
    let shiftedMax = -Infinity;
    const shift = (x: number): number => (x < 0 ? x + 360 : x);
    const collectShifted = (coord: number[]) => {
      const x = shift(coord[0]);
      if (x < shiftedMin) shiftedMin = x;
      if (x > shiftedMax) shiftedMax = x;
    };
    const walk = (geom: GeoJSON.GeoJSON | null) => {
      if (!geom) return;
      if (geom.type === "LineString") geom.coordinates.forEach(collectShifted);
      else if (geom.type === "MultiLineString")
        geom.coordinates.forEach((line: number[][]) =>
          line.forEach(collectShifted),
        );
      else if (geom.type === "Point") collectShifted(geom.coordinates);
      else if (geom.type === "GeometryCollection")
        geom.geometries.forEach(walk);
      else if (geom.type === "FeatureCollection")
        geom.features.forEach((f: GeoJSON.Feature) => walk(f.geometry));
      else if (geom.type === "Feature") walk(geom.geometry);
    };
    walk(geojson);
    // Info: (20260731 - Tzuhan) 位移後跨度更小才採用:否則是真的東西向長程,維持原 bbox
    if (shiftedMax - shiftedMin < maxX - minX) {
      minX = shiftedMin;
      maxX = shiftedMax;
    }
  }

  // Info: (20260430 - Tzuhan) 防呆：如果起終點太近，給予微小的 bbox 避免報錯或無法縮放
  if (maxX - minX < 0.001) {
    minX -= 0.01;
    maxX += 0.01;
  }
  if (maxY - minY < 0.001) {
    minY -= 0.01;
    maxY += 0.01;
  }

  return [
    [minX, minY],
    [maxX, maxY],
  ];
}
