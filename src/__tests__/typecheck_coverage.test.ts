import { describe, it, expect } from "@jest/globals";
import fs from "fs";
import path from "path";

/**
 * Info: (20260827 - Emily) 「全專案型別檢查」的判準(#6577)。
 *
 * 票的原始症狀(測試檔的型別錯誤永遠不會被擋)已不成立:`tsconfig.json` 的
 * include 涵蓋 `src/**` (含 `__tests__`)、`types` 帶 jest,CI 的 test.yaml
 * 也有 `npx tsc --noEmit` 那一步 —— 08-27 以刻意的型別錯誤實測會紅。
 *
 * 但「全專案」當時**不成立**:根目錄的 `prisma.config.ts` 不在 include
 * (prisma CLI 真的在用它,而 08-27 我們才被 prisma 咬了兩次),
 * 而 `dockerfiles/` 與 hardhat 那組則是**該豁免**的 —— 它們的依賴不在
 * 本 repo 的 node_modules,硬納進來只會製造假錯。
 *
 * 所以判準不是「有沒有跑 tsc」,而是:**repo 裡每一份 TS 都要嘛被某個
 * tsconfig 涵蓋、要嘛在明文豁免清單裡並寫得出理由**。這條測試釘住那個邊界 ——
 * 未來有人新增一個根目錄設定檔或一個帶 TS 的頂層資料夾,它會紅,
 * 而不是靜默地多出一份沒人檢查的程式碼。
 *
 * Info: (20260831 - Emily) 這條邊界的**天然上限**(PR #6729 review 的提醒,照收):
 * 掃描面是「根目錄的每個 .ts + 每個含 TS 的頂層資料夾」。
 * - 在已涵蓋資料夾深處新增檔案 → 不會紅(它本來就被涵蓋,正確)
 * - 新增一個頂層資料夾 → 會紅(正確)
 * - 新增一個頂層資料夾**並同時把它加進某個 tsconfig 的 include** → 會綠,
 *   而沒有人複查那個 include 是否恰當。
 * 最後一格是這類邊界測試守不到的地方:它能證明「有人做了決定」,
 * 不能證明「那個決定是對的」。寫在這裡,不補規則 ——
 * 補規則會變成要求測試去判斷 include 的品質,那需要的資訊不在檔案系統裡。
 */

const ROOT = process.cwd();

/**
 * Info: (20260827 - Emily) 明文豁免:每一條都要有理由,理由本身是測試內容 ——
 * 沒有理由的豁免與「忘了加」在效果上相同,只是多一層心安。
 */
const EXEMPT: Record<string, string> = {
  "hardhat.config.ts":
    "由 tsconfig.hardhat.json 涵蓋(該檔目前沒有任何 script 在跑,且 scripts/deploy_contract.ts 在其設定下有 viem 型別漂移 —— 屬區塊鏈線,見 #6577 關票留言)",
  dockerfiles:
    "容器內執行的獨立腳本,依賴(systeminformation)裝在映像裡而非本 repo 的 node_modules;納進主 tsconfig 會產生 9 個假錯",
  ignition: "hardhat 部署模組,tsconfig.json 的 exclude 明文排除",
  test: "hardhat 合約測試,tsconfig.json 的 exclude 明文排除",
  artifacts: "hardhat 編譯產物(非手寫程式碼)",
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "coverage",
  "cache",
]);

const readTsconfig = (): { include: string[]; exclude: string[] } => {
  const raw = fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf-8");
  const parsed = JSON.parse(raw) as { include?: string[]; exclude?: string[] };
  return { include: parsed.include ?? [], exclude: parsed.exclude ?? [] };
};

/** Info: (20260827 - Emily) include 的第一段路徑(`src/**\/*.ts` → `src`;`next.config.ts` → 自己) */
const includedEntries = (include: string[]): Set<string> =>
  new Set(include.map((pattern) => pattern.split("/")[0]));

describe("全專案型別檢查的涵蓋範圍(#6577)", () => {
  const { include } = readTsconfig();
  const covered = includedEntries(include);

  it("根目錄的每一份 .ts 都被涵蓋,或有明文豁免理由", () => {
    const rootTs = fs
      .readdirSync(ROOT, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => entry.name);

    const unaccounted = rootTs.filter(
      (name) => !covered.has(name) && EXEMPT[name] === undefined,
    );
    expect(unaccounted).toEqual([]);
  });

  it("每個含 TS 的頂層資料夾都被涵蓋,或有明文豁免理由", () => {
    const dirs = fs
      .readdirSync(ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !SKIP_DIRS.has(entry.name))
      .map((entry) => entry.name);

    const withTs = dirs.filter((dir) => {
      const stack = [path.join(ROOT, dir)];
      while (stack.length > 0) {
        const current = stack.pop() as string;
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) {
              stack.push(path.join(current, entry.name));
            }
            continue;
          }
          if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
            return true;
          }
        }
      }
      return false;
    });

    const unaccounted = withTs.filter(
      (dir) => !covered.has(dir) && EXEMPT[dir] === undefined,
    );
    expect(unaccounted).toEqual([]);
  });

  it("prisma.config.ts 在 include 裡(prisma CLI 真的在用它)", () => {
    expect(include).toContain("prisma.config.ts");
  });

  /**
   * Info: (20260827 - Emily) 判準是「有沒有理由」,不是「理由多長」。
   * 第一版寫 `length > 20`,而「hardhat 編譯產物(非手寫程式碼)」剛好 20 字 ——
   * 那條測試量的是字數,不是內容,紅了也不代表豁免不合理。改為擋**佔位符**:
   * 空白、TODO、待補、破折號 —— 那些才是「忘了寫理由」的實際形狀。
   */
  const PLACEHOLDER = /^(todo|tbd|fixme|待補|待確認|[-—－.。]+)$/i;

  it("每一條豁免都寫得出理由(佔位符不算理由)", () => {
    Object.entries(EXEMPT).forEach(([target, reason]) => {
      expect(target.trim().length).toBeGreaterThan(0);
      expect(reason.trim().length).toBeGreaterThan(0);
      expect(PLACEHOLDER.test(reason.trim())).toBe(false);
    });
  });
});
