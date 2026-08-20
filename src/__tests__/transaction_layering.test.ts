import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync } from "fs";
import { join, relative, sep } from "path";

/**
 * Info: (20260820 - Julian) `$transaction` 只出現在 Repository 層
 * （`coding_guidelines §1.1`，review 第 6 輪）。
 *
 * ## 為什麼是測試而不是文件裡的一個數字
 *
 * §1.2 的原文是：「全 repo 的 `$transaction` 共 **11** 個檔案，全部已在
 * `src/repositories/` 底下，Service 層一處都沒有。」那句話 2026-08-17 成立，
 * 而它是**手數的**。實測到 2026-08-20 已經是 19 個檔案 —— 結論仍然對，
 * 但那個數字錯了八個月份的份量，而**沒有任何東西會告訴讀者它過期了**。
 *
 * 一份規範最怕的不是被違反，是它自己描述的現況已經不是現況：
 * 下一個讀到「共 11 個」的人會以為自己看的是一份維護中的文件。
 *
 * 因此改成**釘住那條不變式本身**：數字由這支測試現算，
 * 而文件只留規則。違反時它會列出檔名，而不是要求誰去重數一次。
 *
 * ## 掃描根是整個 `src`
 *
 * 只掃 `src/services` 會漏掉「有人把 `$transaction` 寫進 route 或 lib」——
 * 而那兩處違反的是同一條規則（「只有 Repository 能碰 Prisma」）。
 *
 * ## 排除測試檔
 *
 * 測試會自己餵一個帶 `$transaction` 的 prisma 替身（T6、加班核准的 claim
 * 那兩支就是），那是**模擬**不是使用。排除它們，並在下面第二條把
 * 「排除掉的檔案確實只有測試」也釘住 —— 否則這個排除本身會變成漏洞。
 */

const SRC = join(process.cwd(), "src");

/** Info: (20260820 - Julian) 產生的 Prisma client 不是我們寫的程式碼 */
const IGNORED_DIRS: readonly string[] = ["generated"];

const walk = (dir: string, into: string[]): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.includes(entry.name)) continue;
      walk(join(dir, entry.name), into);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.tsx?$/.test(entry.name)) continue;
    into.push(join(dir, entry.name));
  }
};

const isTestFile = (relativePath: string): boolean =>
  relativePath.split(sep).includes("__tests__");

const isRepository = (relativePath: string): boolean =>
  relativePath.startsWith(join("src", "repositories") + sep);

const filesUsingTransaction = (): string[] => {
  const files: string[] = [];
  walk(SRC, files);
  return files
    .filter((full) => readFileSync(full, "utf8").includes("$transaction"))
    .map((full) => relative(process.cwd(), full))
    .sort();
};

describe("$transaction 只在 Repository 層（coding_guidelines §1.1）", () => {
  /**
   * Info: (20260820 - Julian) 掃描根確實掃到東西。
   *
   * 一支掃到零個檔案的測試永遠是綠的，而它綠的時候看起來與真的守住了
   * 一模一樣（同 T19 那支的既有處置）。下界寫得寬鬆 ——
   * 它要擋的是「掃描根壞掉」，不是「數量變了」。
   */
  it("掃描根確實掃到 $transaction 的使用", () => {
    expect(filesUsingTransaction().length).toBeGreaterThan(10);
  });

  it("產品程式碼裡的 $transaction 全部在 src/repositories/ 底下", () => {
    const offenders = filesUsingTransaction()
      .filter((path) => !isTestFile(path))
      .filter((path) => !isRepository(path));

    expect(offenders).toEqual([]);
  });

  /**
   * Info: (20260820 - Julian) 被排除的那些檔案**必須真的只是測試**。
   *
   * 少了這一條，「排除測試檔」這個放寬會變成一條後門：把一支服務放進
   * `__tests__` 底下就能繞過整條規則。這裡把排除的理由也釘住 ——
   * 排除掉的每一個檔名都必須以 `.test.ts` 結尾。
   */
  it("被排除的檔案都是測試檔本身", () => {
    const excluded = filesUsingTransaction().filter(isTestFile);
    expect(excluded.filter((path) => !path.endsWith(".test.ts"))).toEqual([]);
  });
});
