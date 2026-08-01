// Info: (20260801 - Luphia) 列印前的中文字形覆蓋率偵測(判定邏輯為純函數)。
//
// Info: (20260801 - Luphia) 為什麼需要偵測而非信任環境:實測伺服器曾經
// Info: (20260801 - Luphia) `fc-list :lang=zh` 只有 X11 點陣字 `Fixed`,沒有任何真正的 CJK 字型,
// Info: (20260801 - Luphia) 後果是一份地點名稱全數渲染成空心方框的報告仍被當成「產生成功」交付。
// Info: (20260801 - Luphia) 對審計文件而言那不是品質瑕疵而是不可用,§6 要求這種髒輸出在最外層就被凍結。

/**
 * Info: (20260801 - Luphia) 中文字元範圍。只涵蓋會出現在報告中的區段:
 * CJK 統一漢字(含擴充 A)、相容表意文字。
 * 刻意不含日文假名與韓文諺文 —— 目前的報告文案不會出現,
 * 且擴大範圍會讓「含中文」的判定在只有標點的字串上誤觸發。
 */
const CJK_PATTERN = /[㐀-䶿一-鿿豈-﫿]/;

/**
 * Info: (20260801 - Luphia) 這段文字是否含需要中文字形的字元。
 * 用於決定「字形缺失」是否構成阻擋:純拉丁字的報告即使環境沒有中文字型也能正確輸出,
 * 不該因此擋掉 —— 只有真的要印中文時缺字才是問題。
 */
export function containsCjk(text: string): boolean {
  return CJK_PATTERN.test(text);
}

/**
 * Info: (20260801 - Luphia) 單一字元渲染後的點陣特徵。
 *
 * **為什麼是點陣特徵而不是前進寬度(advance width)。**
 *
 * 第一版以「中文字的寬度是否等於 U+FFFF 的寬度」判定,理由是 U+FFFF 是 Unicode
 * 永久保留的 noncharacter,任何字型都不會給它字形,所以它量到的必然是 .notdef 的寬度。
 * 這個推論本身沒錯,錯的是隱含假設:「.notdef 的寬度會與真正的字形不同」。
 *
 * 實測反例(字級 100px):
 *   latin(M): 81.2   cjk(測): 100.0   notdef(U+FFFF): 100.0
 * 字型是 Noto Sans CJK(其拉丁字源自 Source Sans,M 為 0.812em,故 81.2 是它的指紋),
 * 中文字為全角 1em = 100.0 —— 而 **Noto Sans CJK 的 .notdef 也是全角 1em**。
 * 兩者同寬,於是「字型裝好」反而被判成「缺字」,匯出全數被擋。
 *
 * 全角是 CJK 字型的通則而非這個字型的特例,所以寬度判準在有中文字型時必然誤判 ——
 * 它剛好只在缺字時「碰巧正確」。改為比對字形實際畫出來的樣子:
 * 真正的「測」是筆畫複雜的表意文字,.notdef 是空白或一個方框,兩者的點陣不可能相同。
 */
export interface IGlyphSignature {
  /** Info: (20260801 - Luphia) 有墨色(alpha 非零)的像素數;0 表示什麼都沒畫出來 */
  inkPixels: number;
  /** Info: (20260801 - Luphia) 墨色分布的雜湊,用於判斷兩個字元是否畫出同一個字形 */
  checksum: number;
}

export interface IGlyphProbe {
  /** Info: (20260801 - Luphia) 中文樣本字 */
  cjk: IGlyphSignature;
  /** Info: (20260801 - Luphia) U+FFFF,即該字型的 .notdef */
  notdef: IGlyphSignature;
  /** Info: (20260801 - Luphia) 拉丁字,用於確認渲染管線本身有效 */
  latin: IGlyphSignature;
}

export enum GlyphCoverageEnum {
  /** Info: (20260801 - Luphia) 中文字有真正的字形 */
  AVAILABLE = "AVAILABLE",
  /** Info: (20260801 - Luphia) 中文字落在 .notdef 上,會渲染成方框或空白 */
  MISSING = "MISSING",
  /** Info: (20260801 - Luphia) 渲染本身不可信,無法判定 */
  INDETERMINATE = "INDETERMINATE",
}

/**
 * Info: (20260801 - Luphia) 由點陣特徵判定中文字形覆蓋率。
 *
 * 先檢查 latin:拉丁字必然有字形,它若畫不出墨色代表 canvas 根本沒運作
 * (字型未套用、量測失敗、離屏渲染被停用)。此時 cjk 與 notdef 也會都是空的而「相同」,
 * 會被誤判為缺字。故獨立回 INDETERMINATE —— 把「確定缺字」與「不知道」混為一談,
 * 會讓偵測本身故障時靜默擋掉所有報告。
 */
export function assessGlyphCoverage(probe: IGlyphProbe): GlyphCoverageEnum {
  const signatures = [probe.cjk, probe.notdef, probe.latin];
  const allFinite = signatures.every(
    (signature) =>
      Number.isFinite(signature.inkPixels) &&
      Number.isFinite(signature.checksum) &&
      signature.inkPixels >= 0,
  );
  if (!allFinite || probe.latin.inkPixels <= 0) {
    return GlyphCoverageEnum.INDETERMINATE;
  }

  // Info: (20260801 - Luphia) 中文字什麼都沒畫出來:缺字的其中一種表現(空白而非方框)
  if (probe.cjk.inkPixels <= 0) return GlyphCoverageEnum.MISSING;

  /**
   * Info: (20260801 - Luphia) 中文字與 U+FFFF 畫出同一個字形 → 兩者都是 .notdef。
   * 以「墨色像素數」與「分布雜湊」同時相同才判定相同:單看雜湊在極端情況可能碰撞,
   * 單看像素數則不同字形可能碰巧同量。
   */
  const sameGlyph =
    probe.cjk.inkPixels === probe.notdef.inkPixels &&
    probe.cjk.checksum === probe.notdef.checksum;

  return sameGlyph ? GlyphCoverageEnum.MISSING : GlyphCoverageEnum.AVAILABLE;
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
