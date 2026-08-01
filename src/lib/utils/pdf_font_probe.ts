// Info: (20260801 - Luphia) 列印前的中文字形覆蓋率偵測(判定邏輯為純函數)。
//
// Info: (20260801 - Luphia) 為什麼需要偵測而非信任環境:實測伺服器上
// Info: (20260801 - Luphia) `fc-list :lang=zh` 只有 X11 點陣字 `Fixed`,沒有任何真正的 CJK 字型。
// Info: (20260801 - Luphia) 後果是一份地點名稱全數渲染成空心方框的報告仍被當成「產生成功」交付 ——
// Info: (20260801 - Luphia) 對審計文件而言那不是品質瑕疵而是不可用。§6 要求這種髒輸出在最外層就被凍結。

/**
 * Info: (20260801 - Luphia) 中文字元範圍。只涵蓋會出現在報告中的區段:
 * CJK 統一漢字(含擴充 A)、相容表意文字、以及中日韓標點。
 * 刻意不含日文假名與韓文諺文 —— 目前的報告文案不會出現,
 * 且擴大範圍會讓「含中文」的判定在只有標點的字串上誤觸發。
 */
const CJK_PATTERN = /[㐀-䶿一-鿿豈-﫿]/;

/**
 * Info: (20260801 - Luphia) 這段文字是否含需要中文字形的字元。
 * 用於決定「字形缺失」是否構成阻擋:純拉丁字的報告即使環境沒有中文字型也能正確輸出,
 * 不該因此擋掉 —— 只有真的要印中文時缺字才是問題。
 */
export function containsCjk(text: string): boolean {
  return CJK_PATTERN.test(text);
}

/**
 * Info: (20260801 - Luphia) 瀏覽器端量測的結果。三個寬度都以同一字型、同一字級量得。
 */
export interface IGlyphWidths {
  /** Info: (20260801 - Luphia) 中文樣本字的寬度 */
  cjk: number;
  /** Info: (20260801 - Luphia) U+FFFF 的寬度,即該字型 .notdef 的寬度 */
  notdef: number;
  /** Info: (20260801 - Luphia) 拉丁字的寬度,用於確認量測本身有效 */
  latin: number;
}

export enum GlyphCoverageEnum {
  /** Info: (20260801 - Luphia) 中文字有真正的字形 */
  AVAILABLE = "AVAILABLE",
  /** Info: (20260801 - Luphia) 中文字落在 .notdef 上,會渲染成方框或空白 */
  MISSING = "MISSING",
  /** Info: (20260801 - Luphia) 量測本身不可信(寬度為 0 或非有限數),無法判定 */
  INDETERMINATE = "INDETERMINATE",
}

/**
 * Info: (20260801 - Luphia) 由量測寬度判定中文字形覆蓋率。
 *
 * 判準是「中文字的寬度是否等於 .notdef 的寬度」,而非任何門檻值。
 * 門檻值會隨字型或字級換一次就失效;而 U+FFFF 是 Unicode 永久保留的 noncharacter,
 * 任何字型都不會為它提供字形,所以它量到的一定是 .notdef 的寬度 ——
 * 中文字若與它同寬,代表中文字也落在同一個 .notdef 上。
 *
 * 先檢查 latin:若拉丁字寬度為 0,代表 canvas 根本沒套用字型(或量測失敗),
 * 此時 cjk 與 notdef 都會是 0 而「相等」,會誤判為缺字。故獨立回 INDETERMINATE,
 * 讓呼叫端能區分「確定缺字」與「不知道」——把兩者混為一談會讓偵測本身故障時
 * 靜默擋掉所有報告,或反之靜默放過所有報告。
 */
export function assessGlyphCoverage(widths: IGlyphWidths): GlyphCoverageEnum {
  const allFinite = [widths.cjk, widths.notdef, widths.latin].every((value) =>
    Number.isFinite(value),
  );
  if (!allFinite || widths.latin <= 0 || widths.notdef <= 0) {
    return GlyphCoverageEnum.INDETERMINATE;
  }
  if (widths.cjk <= 0) return GlyphCoverageEnum.MISSING;

  /**
   * Info: (20260801 - Luphia) 以相對誤差比較而非嚴格相等:
   * canvas 的 measureText 回傳浮點數,同一個 .notdef 字形在不同呼叫間
   * 可能有次像素級的差異。0.5% 遠小於「有字形」與「.notdef」的實際落差
   * (中文字通常為 1em 全角,.notdef 方框約 0.6em,差距逾 60%)。
   */
  const relativeDelta =
    Math.abs(widths.cjk - widths.notdef) / Math.max(widths.cjk, widths.notdef);
  return relativeDelta < 0.005
    ? GlyphCoverageEnum.MISSING
    : GlyphCoverageEnum.AVAILABLE;
}

/**
 * Info: (20260801 - Luphia) 判定是否該擋下這份報告。
 *
 * 只有「報告確實含中文」且「確定缺字形」才擋。
 * INDETERMINATE 刻意放行:偵測機制自己壞掉時不該連帶讓所有匯出失效,
 * 那會把一個診斷功能變成單點故障。該情況由呼叫端記錄警告。
 */
export function shouldBlockForMissingGlyphs(
  coverage: GlyphCoverageEnum,
  reportContainsCjk: boolean,
): boolean {
  return reportContainsCjk && coverage === GlyphCoverageEnum.MISSING;
}
