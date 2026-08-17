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

function listE2eFiles(): string[] {
  return readdirSync(E2E_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name);
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
    const missing = listE2eFiles().filter((name) => {
      const code = readFileSync(join(E2E_DIR, name), "utf8");
      return !(
        /process\.env\.NODE_ENV === "production"/.test(code) &&
        /throw new Error\(/.test(code)
      );
    });

    expect(missing).toEqual([]);
  });
});
