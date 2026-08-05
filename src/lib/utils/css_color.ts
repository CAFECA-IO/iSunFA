// Info: (20260802 - Tzuhan) CSS 色值 → 十六進位。
//
// Info: (20260802 - Tzuhan) 為什麼需要這一層:
// Info: (20260802 - Tzuhan) 主題的色票以現代色彩空間定義(oklch / lab),SVG 屬性直接寫進去瀏覽器看得懂,
// Info: (20260802 - Tzuhan) 但 mermaid 會在 JS 內**解析**themeVariables 去推導衍生色(邊框、陰影、對比文字),
// Info: (20260802 - Tzuhan) 它的色彩函式庫不認得 lab()/oklch(),於是整個 initialize 拋錯:
// Info: (20260802 - Tzuhan) `Unsupported color format: "lab(14.5749% -.231504 -10.8736)"` —— 報告預覽整頁掛掉。
//
// Info: (20260802 - Tzuhan) 轉換交給瀏覽器本身(畫一個像素再讀回來)而非自己實作色彩空間換算:
// Info: (20260802 - Tzuhan) 手寫 oklch→sRGB 需要處理色域裁切,算錯只會得到「顏色有點不一樣」這種難以察覺的 bug。

/**
 * Info: (20260802 - Tzuhan) RGB 位元組 → #rrggbb。純函數,與 DOM 無關,故可單元測試。
 */
export function rgbToHex(red: number, green: number, blue: number): string {
  const clamp = (value: number): number =>
    Math.max(0, Math.min(255, Math.round(value)));
  const pair = (value: number): string =>
    clamp(value).toString(16).padStart(2, "0");
  return `#${pair(red)}${pair(green)}${pair(blue)}`;
}

// Info: (20260802 - Tzuhan) 同一組色票會被多張圖表反覆解析,快取避免重複建立 canvas
const cache = new Map<string, string>();

/**
 * Info: (20260802 - Tzuhan) 把任何瀏覽器認得的色值轉成 #rrggbb。
 *
 * 無法解析時回傳 fallback 而非拋錯:一張顏色略有差異的圖仍是可用的圖,
 * 而拋錯會讓整份報告預覽消失 —— 兩者的代價不對等。
 */
export function resolveCssColorToHex(color: string, fallback: string): string {
  const trimmed = color.trim();
  if (trimmed.length === 0) return fallback;
  // Info: (20260802 - Tzuhan) 已是十六進位就直接用(最常見的情況,省掉 canvas)
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (typeof document === "undefined") return fallback;

  const cached = cache.get(trimmed);
  if (cached) return cached;

  try {
    // Info: (20260802 - Tzuhan) 先問瀏覽器認不認得:無效值會讓 fillStyle 賦值被靜默忽略,
    // Info: (20260802 - Tzuhan) 那時讀到的是上一個顏色而非錯誤,結果會是「顏色錯了但沒人知道」
    if (
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      !CSS.supports("color", trimmed)
    ) {
      return fallback;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) return fallback;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = trimmed;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
    // Info: (20260802 - Tzuhan) 全透明代表賦值沒生效(或色值本身是 transparent),不可當成黑色
    if (alpha === 0) return fallback;
    const hex = rgbToHex(red, green, blue);
    cache.set(trimmed, hex);
    return hex;
  } catch {
    return fallback;
  }
}
