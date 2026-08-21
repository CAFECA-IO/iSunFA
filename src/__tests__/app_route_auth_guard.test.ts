import { describe, it, expect } from "@jest/globals";
import { readFileSync, existsSync } from "fs";
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
const GUARDED_ROOTS: readonly { root: string; guards: readonly string[] }[] = [
  { root: "user", guards: ["AuthGuard"] },
  { root: "admin", guards: ["AdminAuthGuard"] },
  { root: "hr_management", guards: ["AuthGuard", "AdminAuthGuard"] },
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
    // Info: (20260821 - Julian) `<>…</>` 是「沒有根元素」，記成空字串讓斷言看得見它
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
       * Info: (20260821 - Julian) `/admin` 對 `setup` / `reboot` 有一條刻意的
       * 提早 return（那兩頁在還沒有管理員的時候就要能開）。因此允許
       * `<>…</>` 這種 fragment 直通，但**不允許**直接回一個具名元素 ——
       * 那才是「忘了包」的樣子。
       */
      for (const name of roots) {
        if (name === "") continue;
        expect(spec.guards).toContain(name);
      }

      // Info: (20260821 - Julian) 而且至少有一條真的包了守衛
      expect(roots.some((name) => spec.guards.includes(name))).toBe(true);
    },
  );

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
