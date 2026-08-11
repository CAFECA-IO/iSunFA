// Info: (20260802 - Luphia) globals.css 的主題選擇區塊一致性。
//
// Info: (20260802 - Luphia) 深色有兩個入口（`.dark` 與系統偏好的媒體查詢），
// Info: (20260802 - Luphia) 淺色也有兩個（預設與 @media print）。四個區塊各自宣告同一組
// Info: (20260802 - Luphia) `--t-*` 變數，改了其中一個而忘了另一個不會有任何錯誤 ——
// Info: (20260802 - Luphia) 只會讓「明確選深色」與「系統深色」長得不一樣，而那極難被發現。

import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const CSS_PATH = join(process.cwd(), "src/app/globals.css");

/**
 * Info: (20260802 - Luphia) 空白正規化。Prettier 會依縮排深度把長的 color-mix 折成
 * 不同形狀，兩個深色區塊的同一條宣告因此字面不同但語意相同。
 * 不正規化就比對的話，測試會為了排版差異而失敗，很快就會被加上例外而失去意義。
 */
function normalize(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .trim();
}

/**
 * Info: (20260802 - Luphia) 取出某個選擇器區塊內的 `--t-*` 宣告。
 * 以大括號配對切出區塊而非用正則一次抓，是因為區塊內含註解與巢狀媒體查詢，
 * 正則會在第一個 `}` 就停住。
 */
function extractThemeVars(
  css: string,
  startIndex: number,
): Map<string, string> {
  const open = css.indexOf("{", startIndex);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = css.slice(open + 1, end);
  const vars = new Map<string, string>();
  for (const match of body.matchAll(/(--t-[\w-]+):\s*([^;]+);/g)) {
    // Info: (20260802 - Luphia) 一併正規化空白：值可能長到被 Prettier 折行，
    // Info: (20260802 - Luphia) 而兩個深色區塊的縮排不同，折出來的形狀就不同。
    vars.set(match[1], normalize(match[2]));
  }
  return vars;
}

function blockAt(css: string, selector: string): Map<string, string> {
  const index = css.indexOf(selector);
  expect(index).toBeGreaterThanOrEqual(0);
  return extractThemeVars(css, index);
}

/**
 * Info: (20260802 - Luphia) `color-scheme` 是屬性而非變數，不會被上面的
 * `--t-*` 抽取抓到，但它同樣必須四塊一致 —— 漏掉一塊的症狀是
 * 「頁面是深的、捲軸是白的」，看起來像瀏覽器的問題而不像我們的。
 */
function colorSchemeAt(css: string, selector: string): string | undefined {
  const index = css.indexOf(selector);
  expect(index).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", index);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return css
    .slice(open + 1, end)
    .match(/color-scheme:\s*([^;]+);/)?.[1]
    .trim();
}

describe("globals.css 主題區塊", () => {
  const css = readFileSync(CSS_PATH, "utf8");

  const light = blockAt(css, "\n:root,\n.theme-static-light,");
  const dark = blockAt(css, "\n.dark {");
  const systemDark = blockAt(css, ":root:not(.light) {");
  const print = blockAt(css, "@media print {");

  it("淺色區塊有宣告變數", () => {
    expect(light.size).toBeGreaterThan(10);
  });

  /**
   * Info: (20260802 - Luphia) 最重要的一條：明確選深色與系統深色必須完全相同。
   * 兩者是同一個主題的兩個入口，長得不一樣就是 bug。
   */
  it("`.dark` 與系統偏好回退宣告完全相同", () => {
    expect(Object.fromEntries(systemDark)).toEqual(Object.fromEntries(dark));
  });

  it("列印區塊與淺色區塊宣告完全相同", () => {
    expect(Object.fromEntries(print)).toEqual(Object.fromEntries(light));
  });

  /**
   * Info: (20260802 - Luphia) 原生部件（捲軸、下拉、日期選擇器）的配色。
   * 值必須寫死 light / dark 而非 `light dark`：後者會在使用者明確選淺色、
   * 但系統是深色時，讓原生部件維持深色。
   */
  it("四個區塊都宣告了正確的 color-scheme", () => {
    expect(colorSchemeAt(css, "\n:root,\n.theme-static-light,")).toBe("light");
    expect(colorSchemeAt(css, "\n.dark {")).toBe("dark");
    expect(colorSchemeAt(css, ":root:not(.light) {")).toBe("dark");
    expect(colorSchemeAt(css, "@media print {")).toBe("light");
  });

  it("淺色與深色宣告同一組變數名（只有值不同）", () => {
    expect([...dark.keys()].sort()).toEqual([...light.keys()].sort());
  });

  /**
   * Info: (20260802 - Luphia) 主題差異必須全部收斂在這四塊。
   * 若有人在別處宣告 `--t-*`，色彩就會出現第二個真相來源，
   * 而四個入口之中總有一個不會跟著走。
   *
   * 以「全檔宣告總數 = 四塊各自的數量相加」來驗證，
   * 比數選擇器可靠 —— 新增第五個區塊也會被抓到。
   */
  it("`--t-*` 只在這四個區塊裡宣告", () => {
    const total = (css.match(/--t-[\w-]+:/g) || []).length;
    expect(total).toBe(light.size + dark.size + systemDark.size + print.size);
  });
});

/** Info: (20260802 - Luphia) 取出某區塊內的 `--color-*` 宣告（彩色階重映） */
function extractColorVars(css: string, selector: string): Map<string, string> {
  const index = css.indexOf(selector);
  expect(index).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", index);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const vars = new Map<string, string>();
  for (const match of css
    .slice(open + 1, end)
    .matchAll(/(--color-[\w-]+):([^;]+);/g)) {
    vars.set(match[1], normalize(match[2]));
  }
  return vars;
}

const TAILWIND_HUES =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/**
 * Info: (20260802 - Luphia) 掃描原始碼中實際使用的 utility（含變體）
 *
 * Info: (20260803 - Tzuhan) 必須連 `.ts` 一起掃，不能只掃 `.tsx`。
 * Tailwind v4 掃描的是所有原始碼檔，class 名稱不必寫在 JSX 裡也會被產生 ——
 * `src/constants/accounting_account.ts` 的 ACCOUNT_TYPE_COLORS 就把
 * `bg-lime-50`、`bg-cyan-50`、`bg-fuchsia-50` 定義在 `.ts` 中。
 * 只掃 `.tsx` 的話，這條測試看不到那三個色相，也就漏掉了它自己要防的那個 bug
 * （深色模式下粉彩底配提亮後的深階文字，對比僅 2.3–2.5:1）。
 * 排除 `__tests__`：測試檔裡的字串是斷言用的樣本，不是實際渲染的 class。
 */
function usedUtilities(pattern: RegExp): string[] {
  const found = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__tests__") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        for (const m of stripComments(readFileSync(full, "utf8")).matchAll(
          pattern,
        ))
          found.add(m[0]);
      }
    }
  };
  walk(join(process.cwd(), "src"));
  return [...found].sort();
}

/**
 * Info: (20260809 - Luphia) 掃描前先去掉註解。
 * 註解裡提到的 class 名稱（例如解釋「為什麼不要寫 dark:bg-slate-950」的說明）
 * 不會被渲染到任何元素上，卻會讓這些測試把文件本身當成違規來源。
 */
/**
 * Info: (20260811 - Luphia) `//` 只在行首（允許前置空白）才視為註解。
 *
 * 原本是一條不限位置的雙斜線規則：`"https://payment-api.oen.tw"` 會被從 `//` 起截斷，
 * 同一行之後的 class 名稱全部被吞掉。目前的排版恰好沒踩到，所以測試照樣綠——
 * 也就是說這道護欄的可信度是假的。行首規則會漏掉行尾註解，
 * 但那個方向只會多掃到不該掃的內容（假性失敗，看得見），不會漏掉違規。
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/[^\n]*/gm, "");
}

describe("globals.css 彩色階", () => {
  const css = readFileSync(CSS_PATH, "utf8");

  /**
   * Info: (20260802 - Luphia) 與 `--t-*` 同樣的理由：深色有兩個入口，
   * 彩色 tint 的重映也必須兩邊一致，否則「明確選深色」與「系統深色」會長得不一樣。
   */
  it("`.dark` 與系統偏好回退的彩色階重映完全相同", () => {
    const dark = extractColorVars(css, "\n.dark {");
    const systemDark = extractColorVars(css, ":root:not(.light) {");
    expect(dark.size).toBeGreaterThan(40);
    expect(Object.fromEntries(systemDark)).toEqual(Object.fromEntries(dark));
  });

  /**
   * Info: (20260802 - Luphia) 有人新增一個目前沒用過的色相（例如 bg-cyan-50）時，
   * 那張卡在深色模式會維持粉嫩色而配上已翻成淺色的文字 —— 正是這次回報的症狀。
   * 這條測試讓它在 CI 就停下來，而不是等使用者截圖。
   */
  it("原始碼用到的每個彩色 tint 都有深色重映", () => {
    const used = usedUtilities(
      new RegExp(
        `\\b(?:bg|border|ring|divide|from|to|via)-(?:${TAILWIND_HUES})-(?:50|100|200|300)\\b`,
        "g",
      ),
    );
    const missing = used.filter((utility) => {
      const [, hue, shade] =
        utility.match(new RegExp(`-(${TAILWIND_HUES})-(\\d+)$`)) ?? [];
      return !css.includes(`--color-${hue}-${shade}:`);
    });
    expect(missing).toEqual([]);
  });

  /**
   * Info: (20260802 - Luphia) 彩色深階當文字用時要提亮，而提亮是逐條選擇器寫的
   * （不能改變數，否則實心按鈕會一起變亮）。新增變體時很容易漏掉。
   */
  it("原始碼用到的每個彩色深階文字都有提亮規則", () => {
    const used = usedUtilities(
      /**
       * Info: (20260802 - Luphia) 變體片段要允許 `/`：具名 group（`group-hover/tag:`）
       * 若被切成 `tag:`，測試會去找一個不存在的 class 而假性失敗。
       */
      new RegExp(
        `\\b(?:[a-z0-9-]+(?:/[a-z0-9-]+)?:)*text-(?:${TAILWIND_HUES})-(?:600|700|800|900)\\b`,
        "g",
      ),
    );
    const missing = used.filter(
      (utility) =>
        !css.includes(`.${utility.replace(/[:/]/g, (c) => `\\${c}`)}`),
    );
    expect(missing).toEqual([]);
  });
});

/**
 * Info: (20260809 - Luphia) `bg-white` 系列有深色覆寫（表面會翻成深色），
 * 但 `border-white` / `ring-white` / `divide-white` 完全沒有 —— `--color-white` 刻意不動，
 * 因為它同時餵給數百處橘底白字。
 *
 * 兩者寫在同一個元素上，深色模式下就會變成「深色面板配一條純白亮線」，
 * 這正是 wizard_header 出現過的症狀。低不透明度（≤40%）的 bg-white 不翻轉，
 * 與白邊搭配是一致的，因此不在此列。
 */
describe("globals.css 白色邊框與白色表面的搭配", () => {
  const css = readFileSync(CSS_PATH, "utf8");

  // Info: (20260809 - Luphia) 會跟著主題翻成深色表面的 bg-white 變體
  const FLIPPING_BG_WHITE = /\bbg-white(?:\/(?:50|60|70|80|90|95))?(?!\S)/;

  /**
   * Info: (20260809 - Luphia) 只抓「不透明或半透明以上」的白線。
   * 沿用 globals.css 自己的分界：50% 以上視為表面，40% 以下維持白色 ——
   * 低不透明度的白色髮絲線（border-white/10）本來就是深色面板上的常見手法，
   * 與翻轉後的深色表面搭配並不衝突。
   */
  const WHITE_LINE =
    /\b(?:border|ring|divide)-white(?:\/(?:5\d|[6-9]\d|100))?(?!\S)/;

  /**
   * Info: (20260811 - Luphia) 讀出一個 className 屬性的完整值（允許跨行）。
   *
   * 原本的做法是掃所有單行字串常值：`/"([^"\n]*)"|`([^`\n]*)`/`。兩個分支都排除換行，
   * 因此**任何被 prettier 折成多行的 className 完全不會被掃到**——而折行正是 prettier
   * 的預設行為（本 PR 的 cookie_consent.tsx 就是），`cn("bg-white/60", cond && "border-white/80")`
   * 也一樣逃得掉。護欄看起來綠，其實根本沒看那些檔案。
   *
   * 改成以 className= 為起點，把整個屬性值取出來（字串或大括號運算式），
   * 大括號用簡單的深度計數配對，並略過字串內的括號。取整段的另一個好處是
   * `cn()` 內多個字面值會被視為同一個元素的 class，才判斷得出「同時使用」這種條件。
   */
  function readAttributeValue(source: string, at: number): string | null {
    const opener = source[at];

    if (opener === '"' || opener === "'") {
      const end = source.indexOf(opener, at + 1);
      return end < 0 ? null : source.slice(at + 1, end);
    }
    if (opener !== "{") return null;

    let depth = 0;
    let quote: string | null = null;

    for (let i = at; i < source.length; i += 1) {
      const ch = source[i];

      if (quote) {
        if (ch === "\\") i += 1;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch;
        continue;
      }
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) return source.slice(at + 1, i);
      }
    }
    return null;
  }

  function classAttributeValues(): { file: string; value: string }[] {
    const results: { file: string; value: string }[] = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "__tests__") continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".tsx")) continue;

        const source = stripComments(readFileSync(full, "utf8"));
        for (const match of source.matchAll(/className\s*=\s*/g)) {
          const value = readAttributeValue(
            source,
            (match.index ?? 0) + match[0].length,
          );
          /**
           * Info: (20260811 - Luphia) 把引號、逗號、括號換成空白再交出去。
           *
           * 取出的是整段運算式原文，class 名稱兩側可能緊貼著引號或逗號；
           * 而這些 pattern 以 `(?!\S)` 判斷 utility 的結尾（避免 bg-white 誤中
           * bg-white-ish 這類名稱）。不先正規化的話 `"bg-white/60",` 會因為
           * 後面緊接著引號而配不到——測試看起來綠，其實比舊版更不敏感。
           */
          if (value !== null) {
            results.push({
              file: full,
              value: value.replace(/[`'"(),{}]/g, " "),
            });
          }
        }
      }
    };

    walk(join(process.cwd(), "src"));
    return results;
  }

  it("`.border-white` 確實沒有深色覆寫（本測試存在的前提）", () => {
    expect(css.includes(".border-white")).toBe(false);
  });

  it("沒有元素同時使用會翻轉的白色表面與不會翻轉的白色線條", () => {
    const offenders = classAttributeValues()
      .filter(
        ({ value }) => FLIPPING_BG_WHITE.test(value) && WHITE_LINE.test(value),
      )
      .map(({ file }) => file.replace(`${process.cwd()}/`, ""));

    expect([...new Set(offenders)]).toEqual([]);
  });
});

/**
 * Info: (20260809 - Luphia) `dark:` 變體不可套用在 gray / slate 上。
 *
 * globals.css 已把這兩個色系整組重映到 `--t-*`，而深色階是淺色階「上下顛倒」，
 * 所以 `bg-slate-50` 在深色模式本來就會變成最暗的那一階。
 * 再補一個 `dark:bg-slate-950` 等於把同一件事做第二次 ——
 * `--neutral-dark-950` 是 99% 亮度，整頁會變成近白色。
 *
 * 這個 bug 的症狀（深色模式下版面變成亮白底）很容易被誤判成「主題沒生效」，
 * 但真正原因是生效了兩次。
 *
 * 若某個元素刻意要在兩種模式維持同一個顏色，請改用不被重映的
 * zinc / neutral / stone（見 reboot_countdown.tsx 與 on_premise_content.tsx）。
 */
describe("globals.css 主題色系與 dark: 變體", () => {
  it("gray / slate 不應搭配 dark: 變體（會翻轉兩次）", () => {
    const offenders = usedUtilities(
      /\bdark:(?:[a-z0-9-]+:)*(?:bg|text|border|ring|divide|from|to|via)-(?:gray|slate)-\d+\b/g,
    );

    expect(offenders).toEqual([]);
  });
});

/**
 * Info: (20260810 - Luphia) 寫死的淺色背景（Tailwind arbitrary value）不會跟著主題翻轉。
 *
 * `bg-[#F8FAFC]` 這種寫法繞過了整個主題系統：globals.css 重映的是 `--color-*` 變數
 * 與 `.bg-white` 這類 utility，arbitrary value 完全碰不到。結果是深色模式下版面
 * 維持近白色，而裡面的欄位、邊框、文字都正確翻成深色——看起來像「只有背景壞掉」。
 *
 * 20260810 的三個明細 modal（日記帳／會計傳票／碳盤查）就是這樣，靠使用者截圖才發現。
 *
 * 少數情況是刻意的：紙張式預覽（PDF／分享頁）本來就該兩種模式都保持淺色，
 * 以及自己用 isDark 分支處理的元件。這些以路徑允許清單放行，
 * 新增例外時必須寫下理由，而不是默默讓測試變寬。
 */
describe("globals.css 寫死的淺色背景", () => {
  // Info: (20260810 - Luphia) 紙張式／自行處理主題的檔案，允許出現淺色 hex
  const ALLOWED_PREFIXES = [
    "src/app/share/pdf/",
    "src/components/pdf_tool/",
    "src/components/common/markdown_content.tsx",
  ];

  // Info: (20260810 - Luphia) sRGB 相對亮度；用來區分「淺色背景」與品牌色／深色面板
  function luminance(hex: string): number {
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const [r, g, b] = [0, 2, 4].map(
      (i) => parseInt(full.slice(i, i + 2), 16) / 255,
    );
    const lin = (v: number) =>
      v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  it("應用介面不得使用寫死的淺色背景", () => {
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "__tests__") continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".tsx") && !entry.name.endsWith(".ts"))
          continue;

        const relative = full.replace(`${process.cwd()}/`, "");
        if (ALLOWED_PREFIXES.some((prefix) => relative.startsWith(prefix))) {
          continue;
        }

        const source = stripComments(readFileSync(full, "utf8"));
        for (const match of source.matchAll(
          /\bbg-\[#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\]/g,
        )) {
          // Info: (20260810 - Luphia) 只抓「淺色」；品牌橘與深色面板是刻意固定的
          if (luminance(match[1]) > 0.6) {
            offenders.push(`${relative}: ${match[0]}`);
          }
        }
      }
    };

    walk(join(process.cwd(), "src"));
    expect(offenders).toEqual([]);
  });
});

/**
 * Info: (20260810 - Luphia) 深階背景的**變體**必須各自補覆寫規則。
 *
 * globals.css 有一層相容層，把 `bg-gray-700`~`950` / `bg-slate-700`~`950` 還原成
 * 淺色階常數，讓「刻意深色的表面」在兩種主題下都維持深色——其上的 `text-white`
 * 因此一直是對的。
 *
 * 但覆寫是逐條選擇器寫的：`hover:bg-gray-800` 編出來是 `.hover\:bg-gray-800:hover`，
 * 與 `.bg-gray-800` 是兩個不同的選擇器，補了後者不會蓋到前者。漏掉的後果是
 * 按鈕靜止時正常、滑鼠移上去背景翻成近白而白字消失。
 *
 * 這個坑踩過兩次（20260807 的 `/60` 卡片、20260810 的「AI 自動解析」按鈕），
 * 兩次都是靠肉眼發現。globals.css 的註解要求人工「逐字轉成選擇器搜一次」——
 * 這條測試就是把那個人工步驟自動化。
 */
describe("globals.css 深階背景的變體覆寫", () => {
  /**
   * Info: (20260810 - Luphia) 比對前先去掉 CSS 註解。
   * 這條測試第一版就是敗在這裡：說明文字裡引用了選擇器字面，
   * 於是規則被刪掉後仍然「找得到」，護欄形同虛設。
   */
  const css = readFileSync(CSS_PATH, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("原始碼用到的每個 hover / group-hover 深階背景都有覆寫規則", () => {
    const used = usedUtilities(
      /\b(?:group-)?hover:bg-(?:gray|slate)-(?:700|800|900|950)(?:\/\d+)?\b/g,
    );

    // Info: (20260810 - Luphia) 類名逐字轉成 CSS 選擇器：`:` → `\:`、`/` → `\/`
    const missing = used.filter((utility) => {
      const escaped = utility.replace(/[:/]/g, (c) => `\\${c}`);
      return !css.includes(`.${escaped}`);
    });

    expect(missing).toEqual([]);
  });
});
