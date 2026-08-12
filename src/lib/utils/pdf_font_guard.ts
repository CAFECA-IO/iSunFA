import { logger } from "@/lib/utils/logger";
import { ApiError, API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  assessGlyphCoverage,
  containsCjk,
  GlyphCoverageEnum,
  shouldBlockForMissingGlyphs,
  type IGlyphProbe,
} from "@/lib/utils/pdf_font_probe";
import {
  PDF_FONT_PROBE_CJK_SAMPLE,
  PDF_FONT_PROBE_LATIN_REFERENCE,
  PDF_FONT_PROBE_NOTDEF_REFERENCE,
  PDF_FONT_PROBE_SIZE_PX,
  PDF_FONT_STACK,
} from "@/constants/pdf_font";
import type { IPrintPage } from "@/lib/utils/pdf_browser";

/**
 * Info: (20260810 - Emily) 列印前實測中文字形是否可用,缺失即 fail fast。
 *
 * 由 logistics_report_pdf.service 抽出(原註解為 20260801 - Luphia),
 * 因為碳盤查報告也由 headless Chrome 列印、也含中文 ——
 * 字型缺失的成因與修法完全相同,分開維護只會讓其中一邊被漏掉
 * (那正是 dpp.service 的字型堆疊完全沒有 CJK 家族的成因)。
 *
 * 為什麼不信任字型堆疊就好:堆疊只表達「偏好」,Chrome 找不到就靜默 fallback。
 * 實測伺服器 fc-list :lang=zh 只有 X11 點陣字 Fixed,所有中文取 DejaVu 的
 * .notdef,產出一份地點名稱全是空心方框的報告 —— 而流程回報「成功」。
 *
 * 渲染放在瀏覽器內進行,因為只有 Chrome 自己知道 per-character fallback
 * 最後選了哪個字型;Node 端讀 fontconfig 得到的是「系統有什麼」而非
 * 「Chrome 實際用了什麼」,兩者可以不同。
 */
export const assertCjkRenderable = async (
  page: IPrintPage,
  html: string,
  context: { scope: string; ref: string },
): Promise<void> => {
  // Info: (20260801 - Luphia) 純拉丁字的內容即使環境無中文字型也能正確輸出,不該擋
  const containsCjkText = containsCjk(html);

  /**
   * Info: (20260801 - Luphia) 把三個字元各自畫到離屏 canvas,回傳點陣特徵。
   *
   * 不量前進寬度:CJK 字型的 .notdef 與真正的中文字同為全角,寬度必然相同
   * (實測 Noto Sans CJK 兩者皆為 1em),用寬度判定會在字型正常時誤判為缺字。
   * 字形畫出來的樣子才是真正的判準 —— 真的「測」是筆畫複雜的表意文字,
   * .notdef 是空白或一個方框,點陣不可能相同。
   */
  const probe = await page.evaluate(
    (fontStack: string, samples: string[], sizePx: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = sizePx * 2;
      canvas.height = sizePx * 2;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;

      const signatureOf = (character: string) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${sizePx}px ${fontStack}`;
        ctx.textBaseline = "top";
        ctx.fillStyle = "#000";
        ctx.fillText(character, sizePx * 0.25, sizePx * 0.25);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let inkPixels = 0;
        let checksum = 0;
        // Info: (20260801 - Luphia) 只讀 alpha 通道(每 4 bytes 的第 4 個),字色固定為黑
        for (let index = 3; index < data.length; index += 4) {
          const alpha = data[index];
          if (alpha === 0) continue;
          inkPixels += 1;
          // Info: (20260801 - Luphia) 位置與濃度同時入雜湊,否則只是墨量相同就會誤判成同字形
          checksum = (checksum * 31 + index * 7 + alpha) % 2147483647;
        }
        return { inkPixels, checksum };
      };

      return {
        cjk: signatureOf(samples[0]),
        notdef: signatureOf(samples[1]),
        latin: signatureOf(samples[2]),
      };
    },
    PDF_FONT_STACK,
    [
      PDF_FONT_PROBE_CJK_SAMPLE,
      PDF_FONT_PROBE_NOTDEF_REFERENCE,
      PDF_FONT_PROBE_LATIN_REFERENCE,
    ],
    PDF_FONT_PROBE_SIZE_PX,
  );

  const coverage =
    probe === null
      ? GlyphCoverageEnum.INDETERMINATE
      : assessGlyphCoverage(probe as IGlyphProbe);

  if (coverage === GlyphCoverageEnum.INDETERMINATE) {
    // Info: (20260801 - Luphia) 偵測自己壞掉時不擋:診斷功能不該成為匯出的單點故障
    logger.warn(`[${context.scope}] glyph probe indeterminate`, {
      ref: context.ref,
      probe,
    });
    return;
  }

  if (shouldBlockForMissingGlyphs(coverage, containsCjkText)) {
    logger.error(
      `[${context.scope}] no CJK glyph available; refusing to emit a report of empty boxes`,
      { ref: context.ref, probe },
    );
    throw new ApiError(
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.code,
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.message,
      API_ERRORS.IS_PDF_FONT_UNAVAILABLE.status,
    );
  }
};
