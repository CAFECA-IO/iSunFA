// Info: (20260731 - Tzuhan) 地圖截圖的品質判定(純函數)
// Info: (20260731 - Tzuhan) 動機:實測第一條路線的四張圖不只完全相同,而且整張只有一種顏色(純黑)——
// Info: (20260731 - Tzuhan) MapLibre 的樣式尚未載入完成就截圖,WebGL buffer 從未被繪製,
// Info: (20260731 - Tzuhan) 加上 preserveDrawingBuffer 讓 toDataURL 回傳那個空白緩衝區。
// Info: (20260731 - Tzuhan) 一張純黑的方塊被放進報告當證據,比缺圖糟得多:缺圖讀者知道沒有,
// Info: (20260731 - Tzuhan) 黑方塊會被當成「這段就是這樣」。故截圖後必須驗,驗不過就當作沒有。

/**
 * Info: (20260731 - Tzuhan) 判定為空白所允許的最大相異顏色數。
 * 真實地圖即使極簡也有底色、道路、邊界(實測 6,000 色以上);
 * 取 2 是為了容忍抗鋸齒可能產生的第二種顏色,同時仍能抓到純色畫面。
 */
export const MAP_BLANK_MAX_UNIQUE_COLORS = 2;

/**
 * Info: (20260731 - Tzuhan) 取樣邊長。8×8 = 64 點足以判斷「整張同色」,
 * 而成本遠低於讀取整張畫布(批次要跑上百次)。
 */
export const MAP_BLANK_SAMPLE_SIZE = 8;

/**
 * Info: (20260731 - Tzuhan) RGBA 位元組序列是否幾乎只有一種顏色。
 * 傳入的是縮圖後的取樣資料(見 MAP_BLANK_SAMPLE_SIZE),不是原始畫布。
 * 忽略 alpha:WebGL 畫布的 alpha 在不同瀏覽器行為不一,顏色才是我們要判斷的。
 */
export function isUniformPixelData(data: ArrayLike<number>): boolean {
  if (data.length < 4) return true;
  const colors = new Set<string>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    if (colors.size > MAP_BLANK_MAX_UNIQUE_COLORS) return false;
  }
  return true;
}
