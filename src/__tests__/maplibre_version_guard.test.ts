import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Info: (20260813 - Julian) maplibre-gl 不可升到會移除 `map.transform` 的版本。
 *
 * ## 這支測試是為了一件已經發生三次的事
 *
 * | 日期 | 事件 |
 * |---|---|
 * | 2026-07-24 | Dependabot 把 maplibre-gl 5.24.0 → 6.0.0 |
 * | 2026-08-01 | `fix(deps): pin maplibre-gl to v5`，同時加上 dependabot ignore |
 * | 2026-08-07 | Dependabot **又**把它升到 6.1.0，ignore 規則沒擋住 |
 * | 2026-08-13 | 出勤打卡頁做地圖時發現全站地圖都是壞的，改回 v5 |
 * | 2026-09-11 | Dependabot 第三次(PR #6802，6.8.0)；仍是「規則在、卻沒擋住」 |
 *
 * ## 為什麼 v6 會壞，而且壞得很難認
 *
 * `@vis.gl/react-maplibre@8.x`(`react-map-gl@8` 的實作)直接讀 maplibre 的**內部**
 * API：`map.transform` 與 `map.transformCameraUpdate`。v5 的 `Map` 繼承 `Camera`，
 * 那兩個成員來自它；**v6 的 `Map` 改成繼承 `Evented`**，於是實例上拿不到 ——
 * `_onCameraEvent` 讀到 undefined 的 `transform`，`fitBounds` 必定崩潰，
 * 而專案四張地圖的初始化路徑上都有 `fitBounds`。
 *
 * 症狀是：底圖只剩樣式的背景色，**連自己的 GeoJSON 圖層都不會畫**，
 * 但 `<Marker>` 照常顯示(那是 React 的 DOM，只靠 `map.project()` 定位)。
 * 於是畫面看起來像「一張還在載入的地圖」，沒有錯誤訊息、沒有紅字，
 * 而受影響的是物流路線圖、碳足跡計算機、出勤現場頁與打卡頁**全部**。
 *
 * 而上游不會警告：`@vis.gl/react-maplibre` 的 peer 是 `maplibre-gl: ">=4.0.0"`(無上界)。
 * 一個不會報錯的相依性升級，只有測試擋得住。
 *
 * ## Info: (20260911 - Luphia) 這一版改成守「被鎖住的原因」，不再寫死版號
 *
 * 原本第一條是 `expect(range).toMatch(/^\^?5\./)` —— 一句**永久**斷言，
 * 用來處理一個**暫時**的問題。它過期的方式已經發生了：`GHSA-jrc7-96c5-q579`
 * (CRITICAL，2026-09-08)的受影響範圍是 `<= 6.4.0`、首個修補版 6.4.1，
 * **v5 沒有修補版** —— 唯一的出路正好是這條斷言擋著的那一段(見 issue #6804)。
 * 那一刻護欄從保護變成障礙，而且沒有任何機制會告訴你「可以放手了」。
 *
 * 所以改成兩段：
 *
 * 1. **`react-maplibre` 是否還在讀那兩個內部 API** —— 這才是我們被鎖住的原因。
 *    這一條紅了是**好消息**：上游解耦了，可以重新評估升級。
 * 2. **只要 (1) 還成立**，`package.json` 宣告的範圍不得放行 v6 或更高。
 *
 * 上游修好的那天，(1) 會紅並告訴你去讀這段註解，而 (2) 的約束自動失效 ——
 * 不需要有人先想起來「那條測試為什麼在」。
 */

const ROOT = process.cwd();
const REACT_MAPLIBRE = join(ROOT, "node_modules/@vis.gl/react-maplibre");

const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, "utf8"));

/**
 * Info: (20260911 - Luphia) 走遍整包找原始碼檔案(排除嵌套 node_modules、型別宣告與 source map)。
 * src 與 dist 都掃：出貨內容會隨版本變(8.1.1 兩者都有)，只認一邊會在哪天變成零命中而靜默通過。
 */
const sourceFilesOf = (dir: string): string[] => {
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      if (name === "node_modules") continue;
      const full = join(current, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (name.endsWith(".d.ts") || name.endsWith(".map")) continue;
      if (/\.(ts|tsx|js|cjs|mjs)$/.test(name)) out.push(full);
    }
  };
  walk(dir);
  return out;
};

/** Info: (20260911 - Luphia) maplibre 的內部 API：`map.transform` 與 `transformCameraUpdate` */
const INTERNAL_API = /(map|_map)\.transform\b|transformCameraUpdate/g;

describe("maplibre-gl 版本護欄", () => {
  const files = sourceFilesOf(REACT_MAPLIBRE);

  /**
   * Info: (20260911 - Luphia) 下界：擋住「一個檔案都沒掃到卻照綠」(§1.15)。
   * 套件的出貨結構改變(或沒安裝)時，上面那個 walk 會回空陣列，
   * 而「沒有命中」與「掃了零個檔案」在斷言上長得一樣。
   */
  it("掃描根真的掃到 react-maplibre 的原始碼", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("react-maplibre 仍在讀 maplibre 的內部 API —— 這一條紅了是解鎖訊號，去讀本檔的註解", () => {
    const hits = files
      .map((file) => ({
        file: file.slice(REACT_MAPLIBRE.length + 1),
        count: (readFileSync(file, "utf8").match(INTERNAL_API) ?? []).length,
      }))
      .filter(({ count }) => count > 0);

    /*
     * Info: (20260911 - Luphia) 訊息要說出「紅了該做什麼」：這不是壞事。
     * 上游不再依賴內部 API 之後，下面那條版本上界就沒有理由存在了 ——
     * 該做的是量一次 v6(四張地圖的 fitBounds)，然後把這兩條一起拆掉。
     */
    expect(hits.length).toBeGreaterThan(0);
  });

  it("只要上游還在讀內部 API，宣告的 maplibre-gl 就不得放行 v6 或更高", () => {
    const pkg = readJson(join(ROOT, "package.json")) as {
      dependencies: Record<string, string>;
    };
    const range = pkg.dependencies["maplibre-gl"];
    expect(range).toBeDefined();

    /**
     * Info: (20260911 - Luphia) 只接受「鎖在單一 major」的寫法(`^5.x` / `~5.x` / `5.x`)，
     * 而那個 major 必須小於 6 —— 6 是把 `Map extends Camera` 拿掉的那一版。
     *
     * `>=5`、`*`、`x` 這類會滑進 v6 的寫法連 major 都解析不出來，直接紅：
     * 「解析不出來就當通過」正是護欄最常見的破法。
     */
    const major = /^[~^]?(\d+)\./.exec(range)?.[1];
    expect(major).toBeDefined();
    expect(Number(major)).toBeLessThan(6);
  });

  /**
   * Info: (20260813 - Julian) 2026-08-07 那次就是規則在、但沒擋住。
   *
   * 這條斷言擋不了 Dependabot，但它讓「有人把規則刪掉」這件事會紅 ——
   * 而規則被刪掉之後，下一次升級就會靜靜地把四張地圖再弄壞一次。
   */
  it("dependabot 的 maplibre-gl 例外規則必須還在", () => {
    const config = readFileSync(join(ROOT, ".github/dependabot.yml"), "utf8");

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
