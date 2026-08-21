import { describe, it, expect } from "@jest/globals";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import ts from "typescript";

/**
 * Info: (20260821 - Julian) 需要登入的路由根，它的 layout 必須包在守衛裡
 * （review 第 16 輪）。
 *
 * ## 這一條擋的是什麼
 *
 * `/user/**` 用 `<AuthGuard>`、`/admin/**` 用 `<AdminAuthGuard>`，
 * 而 `/hr_management/**` **兩個都沒有** —— 未登入者打得開整個外框：
 * 頂部列、側邊選單、每一頁的空狀態。
 *
 * 資料沒有外洩（37 支 `/hr/` 端點全部走 `getIdentityFromDeWT`，無票 401），
 * 洩的是「這個系統有哪些功能、選單怎麼分組」。差別是「有人記得包」而不是
 * 機制，所以這裡把它變成機制。
 *
 * ## 為什麼是 AST 而不是字串比對
 *
 * `grep AuthGuard` 會被 **import 一行** 或 **註解裡提到它** 滿足 ——
 * 而「import 了卻沒有包上去」正是最像修好了的壞法。這裡剖析預設匯出實際
 * `return` 的那棵 JSX，看它的**根元素**是不是守衛。
 *
 * ## 為什麼不是 render 測試
 *
 * `jest.config.mjs` 是 `testEnvironment: "node"`，全專案 256 支測試沒有
 * 任何一支 render React。為了這一條引進 jsdom 會讓它變成一個沒有人會維護的
 * 例外。守衛自己的行為（未登入 → `router.replace("/")`）屬於 `AuthGuard`
 * 的責任；這一支只回答「有沒有接上去」。
 *
 * ## 上一版是怎麼做的，為什麼換掉
 *
 * 上一版在 `proxy.ts` 加了一道 `HR_MODULE_ENABLED` 路徑閘。它擋掉的不只是
 * 本 PR 新增的東西：`hr/attendance/**` 的 13 支 API 與 8 個頁面早就在
 * `origin/develop` 上，而 develop 的部署流程沒有那個環境變數 —— merge 的
 * 那一刻打卡整組 404。它多擋的只有「未登入者看得到空外框」，
 * 而那正是這一條要求的東西，且與全站同一個標準。
 */

/**
 * Info: (20260821 - Julian) 掃描根與它們各自接受的守衛。
 *
 * `admin` 用的是另一支（多一層平台管理員判斷），因此**逐根列出**而不是
 * 「只要包了什麼都算」：後者會讓某天有人把 `/admin` 換成一般 `AuthGuard`
 * 而測試照樣綠。
 */
const GUARDED_ROOTS: readonly {
  root: string;
  guards: readonly string[];
  /**
   * Info: (20260821 - Julian) 允許幾條「裸 fragment」的提早 return
   * （review 第 7 輪第 2 條）。
   *
   * 上一版只斷言「**至少有一條** return 是守衛」，於是加一條
   * `if (…) return <>{children}</>;` 而保留主 return 的變異體**是綠的** ——
   * 而那不是假想的寫法，它是逐字抄 `src/app/admin/layout.tsx:18`
   * （為了讓 setup / reboot 在還沒有管理員時能開）。下一個人要讓某個 HR 頁面
   * 對外開放，最自然的做法就是抄那一行。
   *
   * fragment 把「不是守衛」偽裝成「不算一條」。現在**精確計數**：
   * `/admin` 允許 1 條並在下面寫明是哪一條，其餘一律 0。
   */
  allowedBareFragments: number;
}[] = [
  { root: "user", guards: ["AuthGuard"], allowedBareFragments: 0 },
  {
    root: "admin",
    guards: ["AdminAuthGuard"],
    // Info: (20260821 - Julian) `/admin/setup` 與 `/admin/reboot`：還沒有管理員時要能開
    allowedBareFragments: 1,
  },
  {
    root: "hr_management",
    guards: ["AttendanceAuthGate"],
    allowedBareFragments: 0,
  },
];

/**
 * Info: (20260821 - Julian) 刻意不需要登入的路由根（review 第 7 輪第 3 條）。
 *
 * 上一版的掃描根是三個硬編碼字串，`it.each` 只走那個三元素陣列 ——
 * 新增一支 `src/app/settings/layout.tsx` 而不註冊，**永遠不會被讀到**。
 * 而它取代掉的 `hr_module_gate.test.ts` 做得更好：掃整個 `src/app` 且
 * 雙向斷言。掃描型測試的價值等於它的掃描根（§1.1）。
 *
 * 現在枚舉 `src/app` 底下每一個第一層目錄，每一根必須落在 `GUARDED_ROOTS` **或**這裡 ——
 * 新增一根就必須表態，忘了表態會紅。
 */
const PUBLIC_ROOTS: readonly string[] = [
  "(landing)",
  "api",
  "auth",
  "cafeca",
  "charts",
  "invite",
  "salary_calculator",
  "share",
  "test",
];

const layoutPathOf = (root: string): string =>
  join(process.cwd(), "src", "app", root, "layout.tsx");

/** Info: (20260821 - Julian) 這棵子樹裡出現的每一個 `return <X …>` 的 X */
const returnedRootElementsOf = (source: string, fileName: string): string[] => {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TSX,
  );

  const names: string[] = [];

  const nameOf = (node: ts.Node): string | null => {
    if (ts.isParenthesizedExpression(node)) return nameOf(node.expression);
    if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
    if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
    /**
     * Info: (20260821 - Julian) `<>…</>` 是「沒有根元素」，記成空字串。
     *
     * 上一版這裡寫「讓斷言**看得見**它」，而下面的迴圈是
     * `if (name === "") continue;` —— 明確地讓斷言看不見它（review 第 7 輪）。
     * 那句話是那個 fragment 繞過洞的入口。現在真的看得見了：
     * `allowedBareFragments` 對空字串**精確計數**。
     */
    if (ts.isJsxFragment(node)) return "";
    return null;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isReturnStatement(node) && node.expression !== undefined) {
      const name = nameOf(node.expression);
      if (name !== null) names.push(name);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return names;
};

describe("需要登入的路由根：layout 必須包在守衛裡", () => {
  it.each(GUARDED_ROOTS.map((one) => [one.root, one] as const))(
    "/%s 的 layout 存在",
    (_root, spec) => {
      expect(existsSync(layoutPathOf(spec.root))).toBe(true);
    },
  );

  it.each(GUARDED_ROOTS.map((one) => [one.root, one] as const))(
    "/%s 的 layout 每一條 return 的根元素都是守衛",
    (_root, spec) => {
      const file = layoutPathOf(spec.root);
      const roots = returnedRootElementsOf(readFileSync(file, "utf8"), file);

      /**
       * Info: (20260821 - Julian) 至少要有一條 return，否則「每一條都是守衛」
       * 在空集合上恆真 —— 一個把 layout 刪成空殼的改動會通過。
       */
      expect(roots.length).toBeGreaterThan(0);

      /**
       * Info: (20260821 - Julian) 裸 fragment 的條數**精確等於**允許值。
       *
       * 「至少有一條 return 是守衛」不夠：加一條
       * `if (…) return <>{children}</>;` 並保留主 return，
       * 那條斷言照樣過，而那個 return 完全沒有守衛。
       */
      expect(roots.filter((name) => name === "").length).toBe(
        spec.allowedBareFragments,
      );

      // Info: (20260821 - Julian) 其餘每一條的根元素都必須是守衛
      for (const name of roots) {
        if (name === "") continue;
        expect(spec.guards).toContain(name);
      }

      // Info: (20260821 - Julian) 而且至少有一條真的包了守衛
      expect(roots.some((name) => spec.guards.includes(name))).toBe(true);
    },
  );

  /**
   * Info: (20260821 - Julian) `src/app` 底下的每一根都必須表態
   * （review 第 7 輪第 3 條）。
   *
   * 這是被取代掉的 `hr_module_gate.test.ts` 唯一做得比較好的地方：
   * 它掃整個 `src/app` 並雙向斷言。硬編碼三個字串的版本今天沒有漏，
   * 問題是**新增一個根不會有任何提示**。
   */
  it("src/app 底下的每一個路由根，不是受保護就是被明確標為公開", () => {
    const appDir = join(process.cwd(), "src", "app");
    const roots = readdirSync(appDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const declared = new Set([
      ...GUARDED_ROOTS.map((one) => one.root),
      ...PUBLIC_ROOTS,
    ]);
    const undeclared = roots.filter((name) => !declared.has(name));

    expect(undeclared).toEqual([]);

    /**
     * Info: (20260821 - Julian) 反方向：清單裡不得有已經不存在的根。
     * 少了這一條，一個被刪掉的路由根會永遠留在 `PUBLIC_ROOTS` 裡，
     * 而下一個同名的新根會被它默默地放行。
     */
    const stale = [...declared].filter((name) => !roots.includes(name));
    expect(stale).toEqual([]);
  });

  /**
   * Info: (20260821 - Julian) 反方向：那道環境變數路徑閘**不得復活**。
   *
   * 它會把 `origin/develop` 上已經在跑的 13 支打卡 API 與 8 個頁面一起 404，
   * 而 develop 的部署流程沒有 `HR_MODULE_ENABLED`。若日後真的需要一道
   * 模組級開關，它必須先解決「已上線路徑不得被波及」這件事 ——
   * 那時再連同這一條一起改。
   */
  it("proxy.ts 不再有 HR_MODULE_ENABLED 路徑閘", () => {
    const proxy = readFileSync(join(process.cwd(), "src", "proxy.ts"), "utf8");

    expect(proxy).not.toContain("HR_MODULE_ENABLED");
    expect(proxy).not.toContain("hr_module_gate");
    expect(proxy).not.toContain("isHrModulePath");
  });

  /**
   * Info: (20260821 - Julian) `matcher` 也要維持原樣：加閘時為了蓋到 API 而
   * 補的 `"/api/:path*"` 讓**全站每一支 API** 都經過 proxy。閘拿掉之後
   * 那一條沒有理由留著，而它留著的代價是每支 API 多一次 middleware 往返。
   */
  it("proxy 的 matcher 不含 /api/:path*", () => {
    const proxy = readFileSync(join(process.cwd(), "src", "proxy.ts"), "utf8");

    expect(proxy).not.toContain('"/api/:path*"');
    expect(proxy).toContain(
      '"/((?!api|_next/static|_next/image|favicon.ico).*)"',
    );
  });
});
