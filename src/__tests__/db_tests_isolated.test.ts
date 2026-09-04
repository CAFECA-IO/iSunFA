import fs from "fs";
import path from "path";
import { describe, it, expect } from "@jest/globals";

/**
 * Info: (20260904 - Emily) 預設套件裡不得有真連資料庫的測試(#6752)。
 *
 * ## 它要防的事
 *
 * `npm test`(husky pre-commit 會跑)在沒起 docker 的機器上必紅,而那幾條紅的訊息是
 * `Can't reach database server` —— 與程式壞掉的紅長得一樣。2026-09-02 這件事讓人
 * 查了三輪、差一步就去改一個沒問題的資料庫。**紅燈沒有分類,現場就會拿它去猜。**
 *
 * `reports/ui_test_plan.md` 早就記著「你本機 DB 起著的話應該會過」——
 * 處置寫在文件裡叫人記得,而這一支讓工具自己分得開。
 *
 * ## 判準
 *
 * 非 e2e 的測試檔若 `import` 了 `@/lib/prisma`(那是真 client 的唯一出口,
 * 見 `transaction_layering.test.ts` 的同一個依據),就必須 `jest.mock` 它。
 * 「不能 import」太嚴 —— 16 支 repo 測試都 import 它然後 mock 掉,那是對的寫法。
 *
 * 只看真正的 import 行(行首 `import`),註解與字串裡提到不算:
 * `transaction_layering.test.ts` 掃的就是這個字串,它自己不連 DB。
 *
 * ## 界(誠實寫出)
 *
 * 這條掃的是「有沒有拿到真 client」,不是「有沒有真的打出去」——
 * 一支 import 又 mock 但 mock 寫錯仍會真連 DB,這裡看不出來。那種壞法會在
 * 沒 DB 的機器上紅,而紅的訊息仍是 `Can't reach database server`;
 * 這裡守的是**已知的那種**混入方式,不是全部。
 */
const TESTS_DIR = path.join(process.cwd(), "src/__tests__");
const PRISMA_IMPORT = /^import\s[^;]*from\s+["']@\/lib\/prisma["']/m;
const PRISMA_MOCK = /jest\.mock\(\s*["']@\/lib\/prisma["']/;

const nonE2eTestFiles = (): string[] =>
  fs
    .readdirSync(TESTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.test\.ts$/.test(name))
    .filter((name) => !/\.e2e\.test\.ts$/.test(name))
    .filter((name) => !/\.tz\.test\.ts$/.test(name));

describe("預設套件不得真連資料庫(#6752)", () => {
  it("import 了 @/lib/prisma 的非 e2e 測試都 mock 了它", () => {
    const offenders = nonE2eTestFiles().filter((name) => {
      const source = fs.readFileSync(path.join(TESTS_DIR, name), "utf-8");
      return PRISMA_IMPORT.test(source) && !PRISMA_MOCK.test(source);
    });
    expect(offenders).toEqual([]);
  });

  it("掃描真的走到了那批 repo 測試(防止空掃描假綠)", () => {
    /**
     * Info: (20260904 - Emily) 與 carbon_report_outline.test.ts 同一個判準:
     * 目錄讀錯、regex 寫錯,上面那條會因為「一個都沒命中」而綠。
     * 這裡釘住至少有一批 import 又 mock 的檔在(2026-09-04 實測 16 支)。
     */
    const mocked = nonE2eTestFiles().filter((name) => {
      const source = fs.readFileSync(path.join(TESTS_DIR, name), "utf-8");
      return PRISMA_IMPORT.test(source) && PRISMA_MOCK.test(source);
    });
    expect(mocked.length).toBeGreaterThanOrEqual(10);
  });

  it("那支搬走的測試現在住在 e2e/,且帶正式機隔離", () => {
    const moved = path.join(TESTS_DIR, "e2e/emission_factor_db.e2e.test.ts");
    expect(fs.existsSync(moved)).toBe(true);
    expect(
      fs.existsSync(path.join(TESTS_DIR, "emission_factor_db.test.ts")),
    ).toBe(false);
    const source = fs.readFileSync(moved, "utf-8");
    expect(source).toContain('process.env.NODE_ENV === "production"');
    // Info: (20260904 - Emily) 「DB 沒起」要是一句看得懂的話,不是 Prisma 堆疊
    expect(source).toContain("SELECT 1");
  });
});
