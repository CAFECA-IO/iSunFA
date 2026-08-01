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

/**
 * Info: (20260801 - Luphia) Web Mercator 的比例隨緯度變化 1/cos(緯度),
 * 因此「一條比例尺」只在某一條緯線上成立。以下兩個門檻決定何時可以忽略這件事。
 *
 * 5% 以內視為均勻:比例尺的標示值本身已因取「好數字」而與理想長度差達 37%,
 * 再細分 5% 沒有意義,標註參考緯度只會讓讀者以為這條線比實際更精確。
 *
 * 超過 50% 即不畫:此時線段在圖的一端與另一端相差逾半,
 * 標註單一參考緯度也救不了想在別處量測的讀者。實測台北→曼徹斯特的航段
 * 兩端比例相差 52%(25.07°N 為 1.104、53.35°N 為 1.675),正好落在此界之外。
 */
/**
 * Info: (20260801 - Luphia) Web Mercator 的緯度上界。85.0511° 是投影的數學極限
 * (再往極點 y 座標趨於無限),MapLibre 的視野也不會超出。
 * 超過此值的輸入代表資料有誤,不是極區地圖 —— 據此拒絕而非硬算。
 */
const MAX_MERCATOR_LATITUDE_DEG = 85.0511;

const MERCATOR_UNIFORM_RATIO_MAX = 1.05;
const MERCATOR_USABLE_RATIO_MAX = 1.5;

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

/**
 * Info: (20260801 - Luphia) 單一比例尺在這張圖上的成立程度。
 */
export enum MercatorScaleVerdictEnum {
  /** Info: (20260801 - Luphia) 緯度跨幅小,可視為單一比例 */
  UNIFORM = "UNIFORM",
  /** Info: (20260801 - Luphia) 比例已明顯隨緯度變化,可畫但必須標註參考緯度 */
  APPROXIMATE = "APPROXIMATE",
  /** Info: (20260801 - Luphia) 跨幅過大,任何單一比例尺都會誤導,不應畫 */
  INVALID = "INVALID",
}

export interface IMercatorScaleAssessment {
  verdict: MercatorScaleVerdictEnum;
  /** Info: (20260801 - Luphia) 圖內最大與最小比例的倍數(1 表示完全均勻) */
  ratio: number;
  /** Info: (20260801 - Luphia) 比例尺實際成立的那條緯線(取視野中心) */
  referenceLatitudeDeg: number;
}

/**
 * Info: (20260801 - Luphia) 評估單一比例尺在這張 Mercator 圖上是否成立。
 *
 * 為什麼必須評估:`metersPerPixel` 是由視野中心緯線的東西向跨距算出的,
 * 而 Mercator 在緯度 φ 的比例為 1/cos(φ) —— 離中心緯線越遠,同樣的像素長度
 * 代表的實際距離差越多。實測台北(25.07°N)→曼徹斯特(53.35°N)的航段圖,
 * 兩端比例相差 52%:一條標示 2000 km 的線段在台北端實際是 2,148 km、
 * 在曼徹斯特端只有 1,416 km。
 *
 * 這是先前所有比例尺修正都沒解決的一層 —— 而把線段長度與位置修正確之後,
 * 那條仍然不準的比例尺反而更容易被當成可信的量測依據,比原本沒人看得懂的短線更糟。
 *
 * 跨越赤道時最小比例固定為 1(赤道處 cos = 1),因為緯度為 0 的那條線也在圖內。
 */
export function assessMercatorScale(
  latSouthDeg: number | undefined,
  latNorthDeg: number | undefined,
): IMercatorScaleAssessment | null {
  if (
    latSouthDeg === undefined ||
    latNorthDeg === undefined ||
    !Number.isFinite(latSouthDeg) ||
    !Number.isFinite(latNorthDeg) ||
    Math.abs(latSouthDeg) > MAX_MERCATOR_LATITUDE_DEG ||
    Math.abs(latNorthDeg) > MAX_MERCATOR_LATITUDE_DEG ||
    latNorthDeg < latSouthDeg
  ) {
    return null;
  }

  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  // Info: (20260801 - Luphia) 跨越赤道時圖內含 |φ|=0,故最小絕對緯度為 0
  const straddlesEquator = latSouthDeg <= 0 && latNorthDeg >= 0;
  const minAbsLat = straddlesEquator
    ? 0
    : Math.min(Math.abs(latSouthDeg), Math.abs(latNorthDeg));
  const maxAbsLat = Math.max(Math.abs(latSouthDeg), Math.abs(latNorthDeg));

  const ratio = Math.cos(toRad(minAbsLat)) / Math.cos(toRad(maxAbsLat));
  if (!isPositiveFinite(ratio)) return null;

  const referenceLatitudeDeg = (latSouthDeg + latNorthDeg) / 2;
  const verdict =
    ratio <= MERCATOR_UNIFORM_RATIO_MAX
      ? MercatorScaleVerdictEnum.UNIFORM
      : ratio <= MERCATOR_USABLE_RATIO_MAX
        ? MercatorScaleVerdictEnum.APPROXIMATE
        : MercatorScaleVerdictEnum.INVALID;

  return { verdict, ratio, referenceLatitudeDeg };
}

export interface IScaleBar {
  /** Info: (20260801 - Luphia) 比例尺線段在紙面上的長度(mm),可直接寫進 CSS */
  widthMm: number;
  /** Info: (20260731 - Tzuhan) 對應的距離文字,如 "500 m" / "50 km" */
  label: string;
  /**
   * Info: (20260801 - Luphia) 比例尺實際成立的緯線。僅在 Mercator 比例已明顯
   * 隨緯度變化時提供 —— 此時必須讓讀者知道「這條線在哪裡才準」,
   * 否則他會拿它去量圖上任何一段。均勻時不提供,以免暗示比實際更高的精確度。
   */
  referenceLatitudeDeg?: number;
}

/**
 * Info: (20260801 - Luphia) 不畫比例尺的原因。必須讓呼叫端能區分 ——
 * 「沒有資料」與「跨緯度過大所以不成立」在報告上要給讀者不同的說明:
 * 前者是缺件,後者是刻意的正確判斷。混為一句「無比例尺」會讓後者看起來像故障。
 */
export enum ScaleBarOmissionEnum {
  /** Info: (20260801 - Luphia) 截圖資訊不足(舊版前端、或截圖失敗) */
  MISSING_INPUT = "MISSING_INPUT",
  /** Info: (20260801 - Luphia) 圖跨越的緯度過大,任何單一比例尺都會誤導 */
  LATITUDE_SPAN_TOO_WIDE = "LATITUDE_SPAN_TOO_WIDE",
}

export type ScaleBarResult =
  | { drawn: true; bar: IScaleBar }
  | { drawn: false; reason: ScaleBarOmissionEnum };

export interface IScaleBarInput {
  /** Info: (20260801 - Luphia) 截圖當下每一個畫布 CSS 像素代表多少公尺 */
  metersPerPixel?: number;
  /** Info: (20260801 - Luphia) 截圖畫布的 CSS 寬度,與 metersPerPixel 同基準 */
  captureWidthPx?: number;
  /** Info: (20260801 - Luphia) 影像在紙面上的實際寬度(mm) */
  renderedWidthMm: number;
  /** Info: (20260801 - Luphia) 截圖視野的南北緯度界,用於判定單一比例尺是否成立 */
  latSouthDeg?: number;
  latNorthDeg?: number;
}

/**
 * Info: (20260801 - Luphia) 依截圖的實際地理跨距與影像的紙面寬度算出比例尺。
 *
 * 關鍵是 `metersPerPixel` 與 `captureWidthPx` 必須成對使用:前者是「截圖當下畫布的
 * 每一個 CSS 像素代表多少公尺」,兩者相乘才是這張圖橫跨的實際距離(公尺)。
 * 有了實際跨距與紙面寬度,「紙上一公釐等於多少公尺」就是確定的,與影像原始解析度、
 * 裝置像素比、報告版面寬度都無關 —— 那些都是先前算錯的來源。
 *
 * 另外必須通過 Mercator 檢驗:比例隨緯度變化,跨幅過大時單一比例尺不成立。
 * 緯度界缺漏時一律不畫 —— 它與 captureWidthPx 由同一次截圖同時回報,
 * 「有寬度卻沒有緯度」在部署後不會發生;要求它不造成實務上的退步,
 * 卻能避免在無從驗證的情況下畫出一條可能誤導的線。
 *
 * 任何一項不成立時回 `drawn: false` 並附原因;寧可不畫,也不要畫一條錯的比例尺:
 * 錯的比例尺會讓讀者以為自己驗證過距離,比沒有更糟。
 */
export function buildScaleBar(input: IScaleBarInput): ScaleBarResult {
  const { metersPerPixel, captureWidthPx, renderedWidthMm } = input;
  if (
    !isPositiveFinite(metersPerPixel) ||
    !isPositiveFinite(captureWidthPx) ||
    !isPositiveFinite(renderedWidthMm)
  ) {
    return { drawn: false, reason: ScaleBarOmissionEnum.MISSING_INPUT };
  }

  const mercator = assessMercatorScale(input.latSouthDeg, input.latNorthDeg);
  if (mercator === null) {
    return { drawn: false, reason: ScaleBarOmissionEnum.MISSING_INPUT };
  }
  if (mercator.verdict === MercatorScaleVerdictEnum.INVALID) {
    return {
      drawn: false,
      reason: ScaleBarOmissionEnum.LATITUDE_SPAN_TOO_WIDE,
    };
  }

  // Info: (20260801 - Luphia) 這張圖橫跨的實際距離,以及紙上一公釐代表多少公尺
  const spanMeters = metersPerPixel * captureWidthPx;
  const metersPerMm = spanMeters / renderedWidthMm;
  if (!isPositiveFinite(spanMeters) || !isPositiveFinite(metersPerMm)) {
    return { drawn: false, reason: ScaleBarOmissionEnum.MISSING_INPUT };
  }

  const targetMeters = spanMeters * SCALE_BAR_TARGET_RATIO;
  if (!isPositiveFinite(targetMeters)) {
    return { drawn: false, reason: ScaleBarOmissionEnum.MISSING_INPUT };
  }

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
  if (!isPositiveFinite(widthMm)) {
    return { drawn: false, reason: ScaleBarOmissionEnum.MISSING_INPUT };
  }

  return {
    drawn: true,
    bar: {
      widthMm,
      label: formatScaleLabel(chosen),
      // Info: (20260801 - Luphia) 僅在比例已明顯隨緯度變化時標註,均勻時不暗示額外精確度
      ...(mercator.verdict === MercatorScaleVerdictEnum.APPROXIMATE
        ? { referenceLatitudeDeg: mercator.referenceLatitudeDeg }
        : {}),
    },
  };
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
