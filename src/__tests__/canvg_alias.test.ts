import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { Canvg } from "@/lib/stubs/canvg_unused";

/**
 * Info: (20260828 - Luphia) `jspdf` 的 optional 相依 `canvg` 解不到就整個建置失敗
 *（2026-08-28 現象）。
 *
 * `jspdf` 在 `jspdf.es.min.js` 裡以 `import("canvg")` 動態載入它，而 Turbopack
 * 會在**建置期**解析那個動態 import。optional 相依在冷安裝時可能不存在，於是：
 *
 * | 情境 | 結果 |
 * |---|---|
 * | 有 build cache（develop、既有 PR） | 綠 |
 * | 全新分支的第一次建置 | **紅** |
 *
 * 也就是**每一條新分支的第一次 Vercel 建置都會失敗**，而症狀看起來像是那條分支
 * 的問題——實際上與它改了什麼完全無關。
 *
 * 本機重現與驗證（把 `node_modules/canvg` 移開，模擬冷安裝）：
 * 修正前 `next build` 以完全相同的錯誤失敗，修正後成功產出 157 個靜態頁。
 */
describe("canvg 的替身", () => {
  const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

  it("next.config 把 canvg 指到替身", () => {
    expect(config).toContain("resolveAlias");
    expect(config).toContain("canvg:");
    expect(config).toContain("./src/lib/stubs/canvg_unused.ts");
  });

  /**
   * Info: (20260828 - Luphia) 替身要**拋錯**而不是安靜地回 undefined。
   *
   * 哪天真的有人開始用 SVG 匯出，該立刻看到一句說得出原因的錯誤，
   * 而不是一張少了圖的 PDF——後者要到使用者回報才會被發現。
   */
  it("真的被用到時拋出說得出原因的錯誤", () => {
    expect(() => Canvg.from()).toThrow(/addSvgAsImage/);
    expect(() => new Canvg()).toThrow(/addSvgAsImage/);
  });

  it("錯誤訊息說得出怎麼解除這個限制", () => {
    let message = "";
    try {
      Canvg.from();
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }
    expect(message).toContain("add canvg to dependencies");
    expect(message).toContain("next.config.ts");
  });

  /**
   * Info: (20260828 - Luphia) 替身成立的**前提**是這個專案不用 SVG 匯出。
   * 哪天有人開始呼叫 `addSvgAsImage`，這條會先紅——那時該做的是把 `canvg`
   * 升為真正的相依並移除別名，而不是刪掉這條測試。
   */
  it("專案沒有任何地方呼叫 addSvgAsImage（替身成立的前提）", () => {
    const pdfExport = readFileSync(
      join(process.cwd(), "src", "lib", "utils", "pdf_export.ts"),
      "utf8",
    );
    expect(pdfExport).not.toContain("addSvgAsImage");
    expect(pdfExport).toContain("addImage");
  });
});
