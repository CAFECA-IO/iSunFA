import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Info: (20260813 - Julian) maplibre-gl 必須留在 v5。
 *
 * ## 這支測試是為了一件已經發生兩次的事
 *
 * | 日期 | 事件 |
 * |---|---|
 * | 2026-07-24 | Dependabot 把 maplibre-gl 5.24.0 → 6.0.0 |
 * | 2026-08-01 | `fix(deps): pin maplibre-gl to v5 — v6 breaks react-map-gl at runtime`，同時加上 dependabot ignore |
 * | 2026-08-07 | Dependabot **又**把它升到 6.1.0，ignore 規則沒擋住 |
 * | 2026-08-13 | 出勤打卡頁做地圖時發現全站地圖都是壞的，改回 v5 |
 *
 * ## 為什麼 v6 會壞，而且壞得很難認
 *
 * `@vis.gl/react-maplibre@8.1.x` 的 peer 宣告是 `maplibre-gl: ">=4.0.0"`（無上界），
 * 因此 npm 不會有任何警告。而 v6 會讓 `_onCameraEvent` 讀到 undefined 的 `transform`，
 * **`fitBounds` 必定崩潰** —— 專案裡四張地圖有三張在初始化時就呼叫它。
 *
 * 症狀是：底圖只剩樣式的背景色，**連自己的 GeoJSON 圖層都不會畫**，
 * 但 `<Marker>` 照常顯示（那是 React 的 DOM，只靠 `map.project()` 定位）。
 * 於是畫面看起來像「一張還在載入的地圖」，沒有錯誤訊息、沒有紅字，
 * 而受影響的是物流路線圖、碳足跡計算機、出勤現場頁與打卡頁**全部**。
 *
 * 一個不會報錯的相依性升級，只有測試擋得住。
 */

const readJson = (relativePath: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(process.cwd(), relativePath), "utf8"));

describe("maplibre-gl 版本護欄", () => {
  it("package.json 宣告的必須是 v5", () => {
    const pkg = readJson("package.json") as {
      dependencies: Record<string, string>;
    };
    const range = pkg.dependencies["maplibre-gl"];

    expect(range).toBeDefined();
    /**
     * Info: (20260813 - Julian) 允許 `^5.x`（v5 內的小版本更新是安全的），
     * 但不允許 `^6`、`>=5`、`*` 這類會滑進 v6 的寫法。
     */
    expect(range).toMatch(/^\^?5\./);
  });

  it("react-map-gl 必須是 v8 —— 版本相依的另一半", () => {
    const pkg = readJson("package.json") as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["react-map-gl"]).toMatch(/^\^?8\./);
  });

  /**
   * Info: (20260813 - Julian) 2026-08-07 那次就是規則在、但沒擋住。
   *
   * 這條斷言擋不了 Dependabot，但它讓「有人把規則刪掉」這件事會紅 ——
   * 而規則被刪掉之後，下一次升級就會靜靜地把四張地圖再弄壞一次。
   */
  it("dependabot 的 maplibre-gl 例外規則必須還在", () => {
    const config = readFileSync(
      join(process.cwd(), ".github/dependabot.yml"),
      "utf8",
    );

    /**
     * Info: (20260814 - Julian) 取出 maplibre-gl 那一條的內容再比對，不做兩次獨立的子字串比對 ——
     * 後者只要檔案裡「任何一處」有 `maplibre-gl`、「另外任何一處」有
     * `version-update:semver-major` 就通過，即使那條 ignore 掛在別的套件上。
     * 而這支測試的存在理由正是「規則在、但沒擋住」。
     *
     * 手工切段而不用 yaml 套件：它只是傳遞相依，不在 `package.json` 裡 ——
     * 讓守門測試依賴一個沒人宣告的套件，是把新的碎裂點加進防碎裂的機制本身。
     */
    const entries = config
      .split(/^\s*-\s+dependency-name:/m)
      .slice(1)
      .map((chunk) => `dependency-name:${chunk}`);

    const maplibre = entries.find((entry) =>
      /^dependency-name:\s*"?maplibre-gl"?\s*$/m.test(entry.split("\n")[0]),
    );

    expect(maplibre).toBeDefined();
    expect(maplibre).toContain("version-update:semver-major");
  });
});
