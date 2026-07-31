// Info: (20260731 - Tzuhan) 地圖比例尺(純函數)
// Info: (20260731 - Tzuhan) 為什麼報告需要比例尺:一張沒有比例尺的路線圖無法作為證據 ——
// Info: (20260731 - Tzuhan) 查核者看不出這條線代表 5 公里還是 500 公里,也就無法回頭驗證距離欄的數字。
// Info: (20260731 - Tzuhan) 實作在此而非用 MapLibre 的 ScaleControl:ScaleControl 是 DOM overlay,
// Info: (20260731 - Tzuhan) 不在 WebGL canvas 內,`canvas.toDataURL()` 截不到它。故改由前端回報
// Info: (20260731 - Tzuhan) 每像素公尺數,列印端以 HTML 決定性地畫出比例尺。

/**
 * Info: (20260731 - Tzuhan) 比例尺的目標寬度佔圖寬比例。
 * 太短讀不出刻度,太長會蓋住路線;四分之一是製圖慣例。
 */
const SCALE_BAR_TARGET_RATIO = 0.25;

/**
 * Info: (20260731 - Tzuhan) 只採用 1 / 2 / 5 × 10^n 的整數距離。
 * 「這條線是 3.7 公里」對讀者毫無意義;比例尺的用途是心算,必須是好記的數。
 */
const NICE_MULTIPLIERS = [1, 2, 5] as const;

export interface IScaleBar {
  /** Info: (20260731 - Tzuhan) 比例尺線段的像素長度(相對於圖片顯示寬度) */
  widthPx: number;
  /** Info: (20260731 - Tzuhan) 對應的距離文字,如 "500 m" / "50 km" */
  label: string;
}

/**
 * Info: (20260731 - Tzuhan) 依「每像素公尺數」與圖寬算出比例尺。
 * metersPerPixel 無效(未提供、非正數)時回 null —— 寧可不畫,也不要畫一條錯的比例尺:
 * 錯的比例尺比沒有比例尺更糟,它會讓讀者以為自己驗證過了。
 */
export function buildScaleBar(
  metersPerPixel: number | undefined,
  imageWidthPx: number,
): IScaleBar | null {
  if (
    metersPerPixel === undefined ||
    !Number.isFinite(metersPerPixel) ||
    metersPerPixel <= 0 ||
    !Number.isFinite(imageWidthPx) ||
    imageWidthPx <= 0
  ) {
    return null;
  }

  const targetMeters = imageWidthPx * SCALE_BAR_TARGET_RATIO * metersPerPixel;
  if (targetMeters <= 0) return null;

  // Info: (20260731 - Tzuhan) 取不超過目標值的最大「好數字」
  const exponent = Math.floor(Math.log10(targetMeters));
  let chosen = NICE_MULTIPLIERS[0] * 10 ** exponent;
  NICE_MULTIPLIERS.forEach((multiplier) => {
    const candidate = multiplier * 10 ** exponent;
    if (candidate <= targetMeters) chosen = candidate;
  });

  const widthPx = chosen / metersPerPixel;
  return { widthPx: Math.round(widthPx), label: formatScaleLabel(chosen) };
}

/**
 * Info: (20260731 - Tzuhan) 兩點間的大圓距離(公尺)。
 * 放在此模組是因為它只服務比例尺:地圖要換算「一像素等於多少公尺」,
 * 就得先知道畫面東西兩端的實際距離。與碳排計算用的距離函式刻意分開 ——
 * 那邊的結果會進報告數值,不可與顯示用的計算混用。
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadiusMeters = 6_371_008.8;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Info: (20260731 - Tzuhan) 距離文字:1000 公尺以上改用公里,並去除無意義的小數尾數
 */
export function formatScaleLabel(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${Number.isInteger(km) ? km : Number(km.toFixed(1))} km`;
  }
  return `${Number.isInteger(meters) ? meters : Number(meters.toFixed(1))} m`;
}
