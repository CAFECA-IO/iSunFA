import { prisma } from "@/lib/prisma";

/**
 * Info: (20260908 - Julian) 把既有薪資紀錄的本薪從 Json 抽到新的純量欄位。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §16
 *
 * ## 為什麼這支腳本留在版控裡
 *
 * 本專案沒有 `prisma/migrations/`，schema 走 `prisma db push` ——
 * 也就是**沒有任何地方記得資料曾經被怎麼搬過**。
 * `SalaryRecord.baseSalary` 帶 `@default(0)`（否則既有列 push 不上去），
 * 而 `0` 不是空值、是**錯的值**：一筆本薪為 0 的紀錄會讓下一個月的列
 * 顯示「較上月 +44,000」。
 *
 * 所以這支腳本就是那次改動的 migration 紀錄。它是 idempotent 的，
 * 重跑只會把還沒回填的列補上。
 *
 * ## 什麼時候可以刪掉這支腳本
 *
 * 20260908 被問過一次「開發機跑完了，還有保留的必要嗎」。有 ——
 * 而且判斷不能只看自己那台機器：
 *
 * 1. **其他環境還沒跑**：production、staging、其他開發者的本機、
 *    CI 的 e2e 資料庫。任何一個沒跑過的地方，本薪都是 0。
 * 2. **它是這次 schema 改動唯一的紀錄。** 沒有 `prisma/migrations/`，
 *    刪掉之後 `@default(0)` 就變成一個沒有說明的地雷：
 *    下一個人拉這個分支、`db push`、拿到一堆 0，而沒有地方告訴他該做什麼。
 *
 * 所以退場條件是：**所有還會被部署的環境都跑過了**，
 * 而且不存在任何早於這個欄位的分支還可能被部署。
 * 那一天到來時，刪掉它的同時要把「為什麼那一欄有 `@default(0)`」
 * 這件事搬到 schema 註解裡 —— 那個預設值本身刪不掉（沒有 migrations），
 * 所以它需要一個解釋活著。
 *
 * ## 用法
 *
 * ```
 * npx tsx scripts/backfill_salary_record_base_salary.ts
 * npx tsx scripts/backfill_salary_record_base_salary.ts --dry-run
 * ```
 *
 * ## 為什麼只補 `baseSalary === 0` 的列
 *
 * 已經有值的列不動 —— 重跑不該覆蓋任何東西。而「本薪真的是 0」這件事
 * 在實務上不存在（`baseSalary` 在 schema 上刻意沒有預設值，
 * 因為「薪資不該有一個『反正給個 0』的靜默結果」），
 * 所以 `0` 一律當成「還沒回填」。
 */

const DRY_RUN = process.argv.includes("--dry-run");
const PAGE_SIZE = 200;

/**
 * Info: (20260908 - Julian) 從 `inputSnapshot` 取本薪。
 *
 * 引擎把本薪與伙食費分成「應稅／免稅」兩欄，本薪是前者
 * （`calculator_context` 的 `baseSalaryWithTax` 對應的就是它）。
 *
 * 取不到就回 `null`，而 `null` 的處置是**跳過並印出來**，不是當成 0 ——
 * 靜靜寫個 0 進去，就等於用一個看起來正常的錯數字蓋掉「這裡有問題」。
 */
const baseSalaryOf = (snapshot: unknown): number | null => {
  const value = (snapshot as { baseSalaryTaxable?: unknown } | null)
    ?.baseSalaryTaxable;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

async function main(): Promise<void> {
  let cursor: string | undefined;
  let scanned = 0;
  let updated = 0;
  const skipped: string[] = [];

  for (;;) {
    const rows = await prisma.salaryRecord.findMany({
      where: { baseSalary: 0 },
      select: { id: true, year: true, month: true, inputSnapshot: true },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      scanned += 1;
      const baseSalary = baseSalaryOf(row.inputSnapshot);

      if (baseSalary === null) {
        skipped.push(`${row.id} (${row.year}-${row.month})`);
        continue;
      }

      if (!DRY_RUN) {
        await prisma.salaryRecord.update({
          where: { id: row.id },
          data: { baseSalary: BigInt(Math.round(baseSalary)) },
        });
      }
      updated += 1;
    }

    cursor = rows[rows.length - 1].id;
  }

  console.info(
    `[backfill] scanned=${scanned} updated=${updated} skipped=${skipped.length}${DRY_RUN ? " (dry-run)" : ""}`,
  );

  /**
   * Info: (20260908 - Julian) 跳過的列要**列出來**，不是只報數字。
   *
   * 一個「skipped=3」的結尾會被當成雜訊掃過去，而那三列在畫面上
   * 會顯示成本薪 0 —— 也就是下一個月的差額是錯的。
   * 印出 id 與年月，才有辦法去看那三筆到底怎麼了。
   */
  if (skipped.length > 0) {
    console.warn(
      `[backfill] 這些列的 inputSnapshot 取不到 baseSalaryTaxable，未回填：\n  ${skipped.join("\n  ")}`,
    );
  }
}

main()
  .catch((error) => {
    console.error("[backfill] failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
