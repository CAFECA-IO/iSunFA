import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20260818 - Luphia) 每一支 e2e 都要有正式機隔離閘（PR #6652 第四輪 B-4）。
 *
 * `src/__tests__/e2e` 底下的測試會**真的建立與刪除**資料列，而
 * `jest.config.mjs` 沒有排除它們——`npm test` 會跑到。跑錯環境就是動到真實資料。
 *
 * `core_pipeline.e2e.test.ts` 一開始就有這道閘，而本 PR 新增的
 * `free_plan_invite_cap.e2e.test.ts` 沒有（漏了）。差別是「有人記得」而不是機制，
 * 所以這裡把它變成機制：掃描根是**整個 e2e 目錄**，新增一支沒有閘的就會紅。
 *
 * 這支測試自己不碰資料庫，因此在沒有 `DATABASE_URL` 的環境也跑得起來——
 * 那正是最需要它擋下來的環境。
 */

const E2E_DIR = join(process.cwd(), "src", "__tests__", "e2e");

/**
 * Info: (20260818 - Luphia) **遞迴**掃描，且只認 `*.e2e.test.ts`（第五輪 C-6）。
 *
 * 上一版只讀第一層目錄，於是 `src/__tests__/e2e/billing/x.e2e.test.ts` 完全掃不到
 * ——「把它變成機制」的那個機制自己有一個逃逸口。副檔名也從 `.ts` 收緊為
 * `.e2e.test.ts`：那正是 `jest.config.mjs` 與 `npm run test:e2e` 認的樣式，
 * 三者用同一個判準才不會出現「掃描認得、執行不到」或反過來的縫。
 */
function listE2eFiles(dir: string = E2E_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listE2eFiles(full);
    return entry.name.endsWith(".e2e.test.ts") ? [full] : [];
  });
}

/**
 * Info: (20260818 - Luphia) 註解裡的字串不算數（第五輪 C-6）。
 *
 * 純文字比對會把「說明這道閘的註解」當成閘本身——那正是這一檔要防的
 * 「看起來有、其實沒有」。
 */
function codeWithoutComments(file: string): string {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith("*") && !trimmed.startsWith("//");
    })
    .join("\n");
}

describe("e2e 測試的正式機隔離", () => {
  it("目錄底下確實有 e2e 測試（掃描根沒有掃到空氣）", () => {
    expect(listE2eFiles().length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260818 - Luphia) 閘必須是**丟錯**而不是 `describe.skip`。
   * 靜靜跳過在錯誤環境下看起來也是綠的，而那正是假綠。
   */
  it("每一支都在 production 環境丟錯", () => {
    const missing = listE2eFiles()
      .filter((file) => {
        const code = codeWithoutComments(file);
        /**
         * Info: (20260818 - Luphia) 要求「同一段」判斷與拋錯，而不是各自出現：
         * 檔案裡別處有 `throw new Error(` 不代表這道閘存在。
         */
        return !/if \(process\.env\.NODE_ENV === "production"\)\s*\{[^}]*throw new Error\(/s.test(
          code,
        );
      })
      .map((file) => file.slice(process.cwd().length + 1));

    expect(missing).toEqual([]);
  });

  /**
   * Info: (20260818 - Luphia) 掃描認得的樣式要與**實際執行**的樣式一致（第五輪 C-6）。
   *
   * `jest.config.mjs` 以 `\.e2e\.test\.ts$` 把它們排除在預設執行之外、
   * `npm run test:e2e` 以同一個副檔名樣式把它們找回來。若這個目錄裡出現
   * 其他副檔名的測試檔，它會**不被本掃描檢查、也不被 test:e2e 執行**——
   * 兩頭落空是最難發現的那種。
   */
  it("目錄裡沒有不符合 *.e2e.test.ts 的測試檔", () => {
    const stray: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (entry.name.endsWith(".e2e.test.ts")) continue;
        if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".ts")) {
          stray.push(full.slice(process.cwd().length + 1));
        }
      }
    };
    walk(E2E_DIR);

    expect(stray).toEqual([]);
  });
});
