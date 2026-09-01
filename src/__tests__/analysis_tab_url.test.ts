import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  NOTIFICATION_LINK_PATH,
  NOTIFICATION_TYPE,
} from "@/constants/notification";

/**
 * Info: (20260827 - Julian) 通知的去處與那一頁的分頁參數是**跨檔契約**。
 *
 * `NOTIFICATION_LINK_PATH` 說分析類通知導到 `/analysis?tab=history`，
 * 而那句話成不成立由 `analysis_view.tsx` 決定 —— 兩個檔案之間沒有型別，
 * 也沒有任何東西會在其中一邊改掉時讓另一邊變紅。
 *
 * 而它真的壞過：那一頁把分頁存在 state 裡，只在掛載時讀一次網址，
 * 另一支 effect 又把網址改回 state 的值。人已經在 `/analysis` 且停在
 * 別的分頁時點這個連結，pathname 相同 → 元件不重新掛載 → initializer
 * 不重跑 → 網址跳成 history 又被改回去。使用者看到的是網址列抖一下，
 * 實際發生的是**這個連結完全沒有作用**，而畫面上沒有任何地方顯示它失敗了。
 */

const codeOf = (...segments: string[]): string =>
  readFileSync(join(process.cwd(), ...segments), "utf8");

const ANALYSIS_VIEW = [
  "src",
  "components",
  "user",
  "analysis",
  "analysis_view.tsx",
];

describe("分析頁的分頁參數", () => {
  const view = codeOf(...ANALYSIS_VIEW);

  /**
   * Info: (20260827 - Julian) 通知指名的那個分頁必須真的存在。
   *
   * 從連結裡把 `tab` 的值取出來，拿去比對那一頁的白名單常數 ——
   * 任一邊改名（`history` → `reports`）都會在這裡紅，
   * 而不是變成一個安靜地落在預設分頁的連結。
   */
  it.each([
    NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
    NOTIFICATION_TYPE.ANALYSIS_FAILED,
  ])("%s 的去處指向一個真的存在的分頁", (type) => {
    const href = NOTIFICATION_LINK_PATH[type];
    expect(href).not.toBeNull();

    const tab = new URL(href as string, "https://isunfa.com").searchParams.get(
      "tab",
    );
    expect(tab).toBeTruthy();

    const whitelist = /const ANALYSIS_TABS = \[([^\]]*)\]/.exec(view);
    expect(whitelist).not.toBeNull();
    expect(whitelist?.[1]).toContain(`"${tab}"`);
  });

  /**
   * Info: (20260827 - Julian) 分頁狀態不得再存回 state。
   *
   * 存成 state 的那一刻就有了兩份真相，而它們的同步是單向的 ——
   * 網址改變時沒有任何東西把它讀回來。這一條擋的是那個形狀本身，
   * 不是某一次的寫法。
   */
  it("分頁由網址導出，不是 useState", () => {
    expect(view).not.toMatch(/useState<TabType>/);
    expect(view).toMatch(/const activeTab: TabType/);
    expect(view).toMatch(/searchParams\.get\("tab"\)/);
  });

  /**
   * Info: (20260827 - Julian) 不得把分頁參數寫回網址。
   *
   * 那正是抖動的第二跳：網址已經是使用者要去的地方了，
   * 而元件用自己那份過期的值把它蓋掉。
   * 切分頁要走 `push`（`replace` 會讓「上一頁」直接離開這一頁）。
   */
  it("切分頁走 push，且沒有把 tab 改回去的 replace", () => {
    expect(view).not.toMatch(/router\.replace/);
    expect(view).toMatch(
      /router\.push\(`\$\{pathname\}\?\$\{params\.toString\(\)\}`/,
    );
  });
});
