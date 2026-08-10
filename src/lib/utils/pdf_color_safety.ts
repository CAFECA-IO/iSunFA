/**
 * Info: (20260810 - Emily) 匯出 PDF 期間的顏色與表格寬度處理
 * (data/issue_drafts/inventory_table_import/17)。
 *
 * ## 顏色
 *
 * html2canvas 1.4.1 遇到 `oklch()` / `oklab()` / `color-mix()` 會**直接拋錯**
 * (`Attempting to parse an unsupported color function "oklch"`),不是退化成預設色。
 * 而 Tailwind v4 的整套調色盤就是 oklch,不透明度修飾符(`/5`)編譯成
 * `color-mix(in oklab, ...)` —— 任一元素帶到就整份掛掉。
 *
 * 既有做法是攔截 `getComputedStyle`,碰到含 lab / lch / color( 的值一律回
 * `rgb(17, 24, 39)`。那不是安全退路,是**把淺色底塗成近黑**:
 * `bg-gray-50` 的 computed 值 `oklch(0.985 0.002 247.839)` 字串裡含 "lch",
 * 於是表頭那片淺灰變成近黑 —— UAT 從第一天回報到現在的「表頭一整片黑」就是它。
 * 實測(tools/pdf_harness/proxy.mjs):
 *   無攔截 → 拋錯;既有攔截 → rgb(17,24,39);換算 → rgb(249,250,251)。
 *
 * 這裡改成**換算**:canvas 的 `fillStyle` 用的是瀏覽器自己的顏色解析器,
 * 它看得懂 oklch / color-mix。畫一個像素再讀回來就得到等值的 rgb ——
 * 顏色不變,只是換一種 html2canvas 讀得懂的寫法。
 *
 * ## 為什麼攔在 getComputedStyle 而不是改 DOM
 *
 * html2canvas 讀的是 computed style,包含 `::before` / `::after` 這類
 * 改不到 inline style 的來源;攔在讀取端才涵蓋得完,而且完全不動使用者畫面。
 */

// Info: (20260810 - Emily) html2canvas 1.4.1 解析不了的色彩函式
const UNSUPPORTED_COLOR_PATTERN =
  /(oklch|oklab|color-mix|\blch\(|\blab\(|\bhwb\()/i;

/**
 * Info: (20260810 - Emily) 抓出單一個色彩函式呼叫,容許一層巢狀
 * (`color-mix(in oklab, oklch(...) 5%, transparent)`)。
 * 逐段換而不是整串換 —— 一個值可能含多個顏色(border-color 三段、漸層多段)。
 */
const COLOR_FUNCTION_PATTERN =
  /(?:oklch|oklab|color-mix|lch|lab|hwb)\((?:[^()]|\([^()]*\))*\)/gi;

const PROBE_SENTINEL_A = "#010203";
const PROBE_SENTINEL_B = "#040506";

/**
 * Info: (20260810 - Emily) 用瀏覽器自己的解析器把任意 CSS 顏色換成等值的 rgba()。
 *
 * 換不掉就原值回傳 —— 換成錯的顏色比不換更糟,而這正是既有做法犯的錯。
 * 判定「換不掉」用兩個哨兵值:`fillStyle` 對無效輸入是**靜默保留原值**而不是拋錯,
 * 只用一個哨兵的話,無法區分「輸入無效」與「輸入剛好等於哨兵」。
 */
export const createColorConverter = (
  context: CanvasRenderingContext2D | null,
): ((value: string) => string) => {
  const cache = new Map<string, string>();

  const probe = (value: string, sentinel: string): string | null => {
    if (!context) return null;
    context.fillStyle = sentinel;
    context.fillStyle = value;
    return context.fillStyle === sentinel ? null : String(context.fillStyle);
  };

  return (value: string): string => {
    const cached = cache.get(value);
    if (cached !== undefined) return cached;
    if (!context) return value;

    const accepted =
      probe(value, PROBE_SENTINEL_A) !== null ||
      probe(value, PROBE_SENTINEL_B) !== null;
    if (!accepted) {
      cache.set(value, value);
      return value;
    }

    context.clearRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const { data } = context.getImageData(0, 0, 1, 1);
    const rgba = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${(data[3] / 255).toFixed(3)})`;
    cache.set(value, rgba);
    return rgba;
  };
};

/**
 * Info: (20260810 - Emily) 換算後仍留有解析不了的寫法時,才退回 `none`。
 *
 * 只對陰影與圖片(漸層)這麼做:它們少了不影響判讀,而且
 * `linear-gradient(in oklab, ...)` 的插值關鍵字不是函式呼叫,換不掉。
 * 一般顏色寧可保持原值讓它拋錯 —— 拋錯看得見,塗黑看不見。
 */
const isDroppableProperty = (property: string): boolean => {
  const name = property.toLowerCase();
  return name.includes("shadow") || name.includes("image");
};

export const rewriteColorValue = (
  property: string,
  value: string,
  convert: (input: string) => string,
): string => {
  if (!UNSUPPORTED_COLOR_PATTERN.test(value)) return value;
  const rewritten = value.replace(COLOR_FUNCTION_PATTERN, (fn) => convert(fn));
  if (!UNSUPPORTED_COLOR_PATTERN.test(rewritten)) return rewritten;
  return isDroppableProperty(property) ? "none" : rewritten;
};

export type IComputedStyleGetter = (
  element: Element,
  pseudoElement?: string | null,
) => CSSStyleDeclaration;

/**
 * Info: (20260810 - Emily) 包一層 `getComputedStyle`,讀出來的顏色一律是 rgb()。
 *
 * 只在匯出期間掛上,結束即還原(見 pdf_editor 的 finally)。
 */
export const createColorSafeComputedStyle = (
  original: IComputedStyleGetter,
  convert: (value: string) => string,
): IComputedStyleGetter => {
  return (element, pseudoElement) => {
    const styles = original(element, pseudoElement);
    return new Proxy(styles, {
      get(target: CSSStyleDeclaration, property: string | symbol) {
        const bag = target as unknown as Record<string | symbol, unknown>;
        const value = bag[property];

        if (typeof value === "function") {
          if (property === "getPropertyValue") {
            return (name: string) =>
              rewriteColorValue(name, target.getPropertyValue(name), convert);
          }
          return (value as (...args: unknown[]) => unknown).bind(target);
        }

        if (typeof value === "string") {
          return rewriteColorValue(String(property), value, convert);
        }
        return value;
      },
    });
  };
};
