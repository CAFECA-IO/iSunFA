// Info: (20260807 - Luphia) 半透明深色表面的還原覆蓋率。
//
// Info: (20260807 - Luphia) 中性色盤在深色模式整組反轉，globals.css 再把「刻意深色」的
// Info: (20260807 - Luphia) 表面還原回淺色階常數。不透明的 `.bg-slate-800` 好辦，
// Info: (20260807 - Luphia) 但 Tailwind v4 把 `bg-slate-800/40` 編成
// Info: (20260807 - Luphia) `color-mix(in oklab, var(--color-slate-800) 40%, transparent)`，
// Info: (20260807 - Luphia) 讀的是被反轉的變數，必須逐條補；而 `hover:bg-slate-800/60`
// Info: (20260807 - Luphia) 又是另一個選擇器，補了不帶前綴的那條也蓋不到它。
//
// Info: (20260807 - Luphia) 漏補的後果是深色下解析成近白色，配上刻意維持淺色的
// Info: (20260807 - Luphia) `text-slate-100~300` 就是淺字配淺底（實測低到 1.07:1）。
// Info: (20260807 - Luphia) 這種漏不會有任何工具報錯 —— 兩次都是靠人眼在畫面上抓到的，
// Info: (20260807 - Luphia) 所以改由這支測試在 CI 擋下來。

import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { execFileSync } from "child_process";
import { join } from "path";

const CSS_PATH = join(process.cwd(), "src/app/globals.css");

/**
 * Info: (20260807 - Luphia) 需要還原的色階：只有高號碼。
 *
 * 低號碼在全庫是淺色表面（`bg-gray-50` 的卡片），反轉後變深才是對的；
 * 高號碼是深色表面（landing 的深色區塊、admin 側欄），反轉後變淺是錯的。
 * 這個分界與 globals.css 的色盤反轉註解採同一套「位置性」依據。
 */
const SHADES = ["600", "700", "800", "900", "950"];

/**
 * Info: (20260807 - Luphia) 例如 `hover:bg-slate-800/60`、`bg-gray-900/40`。
 * 寫成 POSIX ERE 而非 JS 正則：這串是要交給 `git grep -E` 的，
 * 那邊沒有 `(?:...)` 也沒有 `\d`。
 */
const USAGE_PATTERN = String.raw`([a-z][a-z0-9-]*:)*bg-(slate|gray)-(${SHADES.join(
  "|",
)})/[0-9]+`;

/**
 * Info: (20260807 - Luphia) 用 git grep 而非自己遞迴走檔案樹：
 * 它依 .gitignore 跳過 node_modules、.next 與所有產物，速度也不是同一個量級。
 *
 * `--untracked` 不能省：新元件在第一次 `git add` 之前是未追蹤的，
 * 少了它，最可能出錯的那一刻（剛寫完、還沒 commit）正好掃不到。
 *
 * 找不到任何符合時 git grep 以 1 結束，那不是錯誤，是「全庫都乾淨」。
 */
function collectUsages(): string[] {
  let output = "";
  try {
    output = execFileSync(
      "git",
      ["grep", "--untracked", "-hoE", USAGE_PATTERN, "--", "src/"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 1) return [];
    throw error;
  }

  return [...new Set(output.split("\n").filter(Boolean))].sort();
}

/**
 * Info: (20260807 - Luphia) 把 Tailwind 類名轉成它在 CSS 裡的選擇器前綴。
 *
 * 只比對到類名本身（`.hover\:bg-slate-800\/60`），不含後面的 `:hover`
 * 或 group-hover 那串 `:is(...)`：那部分由 Tailwind 決定，版本升級時可能改寫，
 * 比對它只會製造與本測試意圖無關的失敗。
 */
function toSelector(utility: string): string {
  return (
    "." + utility.replace(/:/g, String.raw`\:`).replace(/\//g, String.raw`\/`)
  );
}

/**
 * Info: (20260807 - Luphia) 先把註解拿掉再比對。
 *
 * globals.css 的註解會直接引用選擇器來解釋自己（「`hover:bg-slate-800/60` 編出來的是
 * `.hover\:bg-slate-800\/60:hover`」），不剝掉的話，光是一段說明文字就能讓測試通過，
 * 規則其實已經被刪掉也照樣綠燈 —— 實際驗過，就是這樣騙過第一版的。
 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("半透明深色表面的還原", () => {
  const css = stripComments(readFileSync(CSS_PATH, "utf8"));
  const usages = collectUsages();

  it("全庫確實有在用這類 utility（否則本測試已失去意義）", () => {
    expect(usages.length).toBeGreaterThan(0);
  });

  it.each(usages)("`%s` 在 globals.css 有對應的還原規則", (utility) => {
    expect(css).toContain(toSelector(utility));
  });
});
