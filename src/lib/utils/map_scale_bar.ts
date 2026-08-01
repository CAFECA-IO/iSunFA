// Info: (20260731 - Tzuhan) 地圖比例尺(純函數)
// Info: (20260731 - Tzuhan) 為什麼報告需要比例尺:一張沒有比例尺的路線圖無法作為證據 ——
// Info: (20260731 - Tzuhan) 查核者看不出這條線代表 5 公里還是 500 公里,也就無法回頭驗證距離欄的數字。
// Info: (20260731 - Tzuhan) 實作在此而非用 MapLibre 的 ScaleControl:ScaleControl 是 DOM overlay,
// Info: (20260731 - Tzuhan) 不在 WebGL canvas 內,`canvas.toDataURL()` 截不到它。故改由前端回報
// Info: (20260731 - Tzuhan) 每像素公尺數,列印端以 HTML 決定性地畫出比例尺。

/**
 * Info: (20260801 - Luphia) 本模組同時負責「影像在報告中的顯示尺寸」與「比例尺長度」,
 * 因為後者沒有前者就沒有意義:比例尺是「多少實際距離對應紙面上多長」,
 * 而紙面長度取決於影像實際被畫成多大,不是版面容器有多寬。
 *
 * 先前版本把兩者混為一談而錯了三層:
 * 1. 線段寬度以 % 表示,但 CSS 的百分比是對「最近的定位祖先」求值,
 *    也就是那個收縮包住 "2 km" 文字的標籤盒,不是圖片 —— 線段因此只剩幾公釐。
 * 2. 標籤盒的 `bottom` 以整個 <figure> 為基準(含 figcaption),
 *    且 `object-fit: contain` 會在容器與影像長寬比不同時留白,
 *    標籤因此落在留白區而非地圖上。
 * 3. metersPerPixel 的基準是「截圖當下畫布的 CSS 像素」,卻被當成
 *    報告顯示寬度(718 / 348 px)的基準使用。兩者無關,長度本身即是錯的。
 *
 * 現在的作法是把單位一路收斂到公釐:顯示尺寸算得出來,線段長度就是確定的,
 * 不再有任何一步依賴 CSS 的求值上下文。
 */

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

/**
 * Info: (20260801 - Luphia) 線段長度的硬性上界(佔圖寬比例)。
 * 取最近的好數字時可能略微超過目標的 25%,此值確保無論如何都不會長到蓋住路線。
 */
const SCALE_BAR_MAX_RATIO = 0.45;

/** Info: (20260801 - Luphia) 公釐取兩位小數:Chrome 的列印排版精度遠高於此,再多位無意義 */
const MM_PRECISION = 100;

const roundMm = (value: number): number =>
  Math.round(value * MM_PRECISION) / MM_PRECISION;

const isPositiveFinite = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0;

export interface IRenderedMapSizeMm {
  /** Info: (20260801 - Luphia) 影像在紙面上實際佔的寬度(mm) */
  widthMm: number;
  /** Info: (20260801 - Luphia) 影像在紙面上實際佔的高度(mm) */
  heightMm: number;
}

/**
 * Info: (20260801 - Luphia) 算出影像在報告中實際被畫成多大。
 *
 * 為什麼需要這一步:版面只給了「容器寬度」與「高度上限」,而影像有自己的長寬比。
 * 讓 CSS 用 `object-fit: contain` 自行縮放的話,縮放後的實際尺寸只存在於瀏覽器內部,
 * HTML 產生端無從得知 —— 於是比例尺與圖上的疊加元素都只能用容器尺寸去猜,必然錯。
 *
 * 改成在此決定性地算出來,再把容器直接設成這個尺寸,contain 就永遠不會留白,
 * 影像的邊界與容器的邊界重合,疊加元素的座標才有意義。
 *
 * 截圖尺寸缺漏(舊版前端送上來的請求)時回 null,呼叫端據此不畫比例尺 ——
 * 與本模組一貫的立場一致:錯的比例尺比沒有比例尺更糟。
 */
export function computeRenderedMapSizeMm(
  captureWidthPx: number | undefined,
  captureHeightPx: number | undefined,
  containerWidthMm: number,
  maxHeightMm: number,
): IRenderedMapSizeMm | null {
  if (
    !isPositiveFinite(captureWidthPx) ||
    !isPositiveFinite(captureHeightPx) ||
    !isPositiveFinite(containerWidthMm) ||
    !isPositiveFinite(maxHeightMm)
  ) {
    return null;
  }

  const aspectRatio = captureWidthPx / captureHeightPx;
  // Info: (20260801 - Luphia) 寬度受兩個條件夾擊:不得超出容器,也不得讓高度超過上限
  const widthMm = Math.min(containerWidthMm, maxHeightMm * aspectRatio);
  if (!isPositiveFinite(widthMm)) return null;

  return {
    widthMm: roundMm(widthMm),
    heightMm: roundMm(widthMm / aspectRatio),
  };
}

export interface IScaleBar {
  /** Info: (20260801 - Luphia) 比例尺線段在紙面上的長度(mm),可直接寫進 CSS */
  widthMm: number;
  /** Info: (20260731 - Tzuhan) 對應的距離文字,如 "500 m" / "50 km" */
  label: string;
}

/**
 * Info: (20260801 - Luphia) 依截圖的實際地理跨距與影像的紙面寬度算出比例尺。
 *
 * 關鍵是 `metersPerPixel` 與 `captureWidthPx` 必須成對使用:前者是「截圖當下畫布的
 * 每一個 CSS 像素代表多少公尺」,兩者相乘才是這張圖橫跨的實際距離(公尺)。
 * 有了實際跨距與紙面寬度,「紙上一公釐等於多少公尺」就是確定的,與影像原始解析度、
 * 裝置像素比、報告版面寬度都無關 —— 那些都是先前算錯的來源。
 *
 * 任一輸入無效時回 null;寧可不畫,也不要畫一條錯的比例尺:
 * 錯的比例尺會讓讀者以為自己驗證過距離,比沒有更糟。
 */
export function buildScaleBar(
  metersPerPixel: number | undefined,
  captureWidthPx: number | undefined,
  renderedWidthMm: number,
): IScaleBar | null {
  if (
    !isPositiveFinite(metersPerPixel) ||
    !isPositiveFinite(captureWidthPx) ||
    !isPositiveFinite(renderedWidthMm)
  ) {
    return null;
  }

  // Info: (20260801 - Luphia) 這張圖橫跨的實際距離,以及紙上一公釐代表多少公尺
  const spanMeters = metersPerPixel * captureWidthPx;
  const metersPerMm = spanMeters / renderedWidthMm;
  if (!isPositiveFinite(spanMeters) || !isPositiveFinite(metersPerMm)) {
    return null;
  }

  const targetMeters = spanMeters * SCALE_BAR_TARGET_RATIO;
  if (!isPositiveFinite(targetMeters)) return null;

  /**
   * Info: (20260801 - Luphia) 取離目標最近的好數字,而非不超過目標的最大者。
   *
   * 先前是後者,最壞情況會選到目標的 0.4 倍(目標 4.9 卻只能取 2),
   * 換算後線段只有圖寬的一成。實測在直向的逐段小圖上得到 5.08mm 的線段,
   * 比它自己的 "500 m" 標籤還短 —— 這種比例尺讀不出刻度,等於沒有。
   *
   * 改取最近者後,線段落在圖寬的 15.8% ~ 39.5% 之間(1/2/5 數列的幾何中點所致),
   * 下界從一成提高到約一成六,且上界仍遠低於「蓋住路線」的程度。
   */
  const exponent = Math.floor(Math.log10(targetMeters));
  const candidates = [exponent, exponent + 1].flatMap((power) =>
    NICE_MULTIPLIERS.map((multiplier) => multiplier * 10 ** power),
  );
  /**
   * Info: (20260801 - Luphia) 「最近」以比值而非差值衡量。
   * 1/2/5 是等比數列,用差值會把中點放在算術平均 3.5 而非幾何平均 √10≈3.16,
   * 於是 target 略低於 3.5 時會挑到 2,線段縮到目標的 0.571 倍 —— 實測掃描到 14.3% 圖寬。
   * 改用比值後最壞情況是 0.632 倍(幾何中點),下界回到約 15.8%。
   */
  const logDistance = (candidate: number): number =>
    Math.abs(Math.log(candidate / targetMeters));

  const maxMeters = spanMeters * SCALE_BAR_MAX_RATIO;
  let chosen = candidates[0];
  candidates.forEach((candidate) => {
    if (
      logDistance(candidate) < logDistance(chosen) &&
      // Info: (20260801 - Luphia) 硬性上界:線段永遠不得蓋掉近半張圖,否則會遮住路線本身
      candidate <= maxMeters
    ) {
      chosen = candidate;
    }
  });

  const widthMm = roundMm(chosen / metersPerMm);
  if (!isPositiveFinite(widthMm)) return null;

  return { widthMm, label: formatScaleLabel(chosen) };
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
