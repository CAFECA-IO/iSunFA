/**
 * Info: (20260828 - Luphia) `canvg` 的替身：這個專案不需要它。
 *
 * `jspdf` 把 `canvg` 宣告為 **optionalDependency**（`canvg` / `core-js` /
 * `dompurify` / `html2canvas` 四個都是），而它在 `jspdf.es.min.js` 裡以
 * `import("canvg")` 動態載入。Turbopack 會在**建置期**解析那個動態 import，
 * 解不到就是硬失敗：
 *
 * ```
 * Module not found: Can't resolve 'canvg'
 *   ./node_modules/jspdf/dist/jspdf.es.min.js
 *   → src/lib/utils/pdf_export.ts
 *   → transportation_carbon_footprint_calculator/page.tsx
 * ```
 *
 * optional 相依在**冷安裝**時可能不存在，於是「有 build cache 的建置綠、
 * 全新分支的第一次建置紅」——這正是 2026-08-28 的現象：develop 與既有 PR 都綠，
 * 而新開的分支一建就失敗。任何新分支的第一次建置都會中。
 *
 * **為什麼是替身而不是把 `canvg` 升為直接相依**：`canvg` 只服務
 * `jsPDF.addSvgAsImage()`，而這個專案**一次都沒有呼叫過它**——
 * `pdf_export.ts` 只用 `addImage`（PNG data URL）、`addPage`、`output("blob")`。
 * 為一個沒有人用的能力多背一組套件，是把「我們不需要它」這個事實藏起來。
 *
 * **這個替身會拋錯而不是安靜地回 undefined**：哪天真的有人開始用 SVG 匯出，
 * 該立刻看到一句說得出原因的錯誤，而不是一張少了圖的 PDF。
 */

const REASON =
  "canvg is intentionally not bundled: this project never calls jsPDF.addSvgAsImage(). " +
  "If you need SVG-in-PDF, add canvg to dependencies and remove the alias in next.config.ts.";

export class Canvg {
  static from(): never {
    throw new Error(REASON);
  }

  constructor() {
    throw new Error(REASON);
  }
}

/**
 * Info: (20260901 - Luphia) 任何**未知**的屬性存取也拋同一句
 *（review #6731 三輪低-4）。
 *
 * 上一版只擋 `Canvg.from()` 與 `new Canvg()`。jspdf 升版後若改用別的匯出
 *（`presets`、`Canvg.fromString`…），拿到的會是 `undefined` 而不是那句說得出
 * 原因的錯誤——正是這個替身刻意要避免的靜默失敗。
 *
 * `then` 要放行：這個模組是被 `import("canvg")` 動態載入的，而 Promise 解析
 * 會去讀 `then`——讓它拋錯的話，模組還沒被使用就先炸了。
 */
const guarded = new Proxy(
  { Canvg },
  {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      if (prop === "then" || typeof prop === "symbol") return undefined;
      throw new Error(`${REASON} (accessed: ${String(prop)})`);
    },
  },
);

export default guarded;
