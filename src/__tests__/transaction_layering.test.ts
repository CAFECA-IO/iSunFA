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
 * ## 這一檔釘住兩條，不是一條（review 阻擋 2）
 *
 * `$transaction` 只是「碰 DB」的**代理指標**，而規則講的是「只有 Repository
 * 能碰 Prisma/DB」（CLAUDE.md §1）。兩者的差集不是空的：一支只做讀取的
 * service 沒有交易，於是它會通過一道以它為名的規則 ——
 * `leave_balance_reconcile.cron.ts` 當時就是這樣溜過去的。
 * 底下第二個 describe 直接掃 `from "@/lib/prisma"` 的 import，
 * 那才是「碰不碰得到 DB」的充要條件。
 *
 * ## 掃描根是整個 `src`
 *
 * 只掃 `src/services` 會漏掉「有人把 `$transaction` 寫進 route 或 lib」——
 * 而那兩處違反的是同一條規則（「只有 Repository 能碰 Prisma」）。
 *
 * ## 掃描根也包含根目錄的 `scripts/`
 *
 * Info: (20260824 - Luphia) 先前掃描根只有 `src`，於是根目錄的 `scripts/`
 * **完全在監測之外** —— 而 `scripts/reconcile_leave_balances.ts` 會寫到
 * 額度帳本（`LeaveLedgerEntry` / `LeaveBalance`，ADR 022 的錢那一側），
 * 卻不受任何一條規則約束。`src/scripts/e2e_seeder/**` 反而是被掃到的，
 * 只因為它剛好住在 `src` 底下 —— 同一種東西，兩種待遇，而分界線是
 * 目錄位置而不是它做什麼。
 *
 * 納入之後 15 支腳本落進白名單（全部逐檔核對過現況）。那不是「開後門」：
 * 白名單只縮不增，且下面第三條會釘住「每個名字都還真的在違反」，
 * 因此它記的是**既有負債**，而下一支伸手拿 prisma 的腳本會是唯一的紅點。
 *
 * ## 為什麼不順手把那 15 支改掉
 *
 * 種子與 backfill 腳本直接用 prisma 是合理的：它們的工作就是在
 * repository 的不變式之前把資料鋪好，上面也沒有 service 層可以走。
 * 硬要它們繞 repository 會逼出一批只給腳本用的後門方法，
 * 那比現在更糟。這一條要擋的是**新增**，不是既有。
 *
 * ## 排除測試檔
 *
 * 測試會自己餵一個帶 `$transaction` 的 prisma 替身（T6、加班核准的 claim
 * 那兩支就是），那是**模擬**不是使用。排除它們，並在下面第二條把
 * 「排除掉的檔案確實只有測試」也釘住 —— 否則這個排除本身會變成漏洞。
 */

const SRC = join(process.cwd(), "src");

/**
 * Info: (20260824 - Luphia) 根目錄的維運腳本也要掃（見檔頭）。
 * 與 `SRC` 分成兩個根而不是掃 `process.cwd()`：後者會連 `node_modules`、
 * `.next`、`documents` 一起走一遍，慢且會掃到不是我們寫的程式碼。
 */
const SCRIPTS = join(process.cwd(), "scripts");

const SCAN_ROOTS: readonly string[] = [SRC, SCRIPTS];

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

const filesMatching = (needle: string): string[] => {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) walk(root, files);
  return files
    .filter((full) => readFileSync(full, "utf8").includes(needle))
    .map((full) => relative(process.cwd(), full))
    .sort();
};

const filesUsingTransaction = (): string[] => filesMatching("$transaction");

/**
 * Info: (20260824 - Julian) 碰得到 Prisma 的判準是**那個 import**（review 阻擋 2）。
 *
 * 上面那條掃的是 `$transaction`，而規則講的是「只有 Repository 能碰 DB」——
 * 兩者範圍不同，而差集不是空的：一支只做讀取的 service 沒有交易，
 * 於是它會通過一道以它為名的規則。`leave_balance_reconcile.cron.ts` 就是
 * 這樣溜過去的（兩個 `findMany` / `findUnique`，零 `$transaction`）。
 *
 * `@/lib/prisma` 是那個 client 的唯一出口，所以「有沒有 import 它」
 * 就是「碰不碰得到 DB」的充要條件 —— 不再是代理指標。
 */
const filesImportingPrisma = (): string[] =>
  filesMatching('from "@/lib/prisma"');

/** Info: (20260824 - Julian) client 的定義處本身；它不 import 自己，列出來是為了防未來改寫 */
const PRISMA_MODULE = join("src", "lib", "prisma.ts");

/**
 * Info: (20260824 - Julian) 既存違反者的白名單 —— **只縮不增**。
 *
 * 這些在 `develop` 上就已經是這樣了（逐檔 `git show origin/develop:` 核對過）。
 * 直接把規則開成紅燈會讓這支測試從第一天就是紅的，而一支永遠紅的紅線
 * 與沒有紅線是同一件事；把它們寫死在這裡，新增的那一支就會是唯一的紅點。
 *
 * 底下第二條會反過來釘住「白名單裡的每一個檔案都還真的在違反」——
 * 否則清乾淨一支之後，這張表會留著一個誰都不敢刪的名字。
 */
const GRANDFATHERED_PRISMA_IMPORTERS: readonly string[] = [
  // Info: (20260824 - Luphia) 根目錄維運與種子腳本（掃描根納入 scripts/ 之後才看得到）
  join("scripts", "backfill_faith_memory_aad.ts"),
  join("scripts", "backfill_invite_email_match.ts"),
  join("scripts", "backfill_pending_invite_key.ts"),
  join("scripts", "backfill_remove_team_admin.ts"),
  join("scripts", "backfill_subscription_seats.ts"),
  join("scripts", "bootstrap_hr_admin.ts"),
  join("scripts", "diagnose_wallet_conservation.ts"),
  join("scripts", "import_pdfs.ts"),
  join("scripts", "migrate_allocations_onchain.ts"),
  join("scripts", "reconcile_leave_balances.ts"),
  join("scripts", "repair_wallet_conservation.ts"),
  join("scripts", "seed", "link_employee_user.ts"),
  join("scripts", "seed", "seed_attendance_demo.ts"),
  join("scripts", "seed", "seed_esg_coefficients.ts"),
  join("scripts", "seed", "seed_leave_overtime_demo.ts"),
  join("src", "app", "api", "v1", "admin", "team", "route.ts"),
  join("src", "scripts", "e2e_seeder", "ai_blind_tester.ts"),
  join("src", "scripts", "e2e_seeder", "cross_validator.ts"),
  join("src", "scripts", "e2e_seeder", "dpp", "generate_dpp_compliance.ts"),
  join("src", "scripts", "e2e_seeder", "dpp", "generate_dpp_ground_truth.ts"),
  join("src", "scripts", "e2e_seeder", "export_phase2_db.ts"),
  join("src", "scripts", "e2e_seeder", "fast_verify.ts"),
  join("src", "scripts", "e2e_seeder", "import_phase2_db.ts"),
  join("src", "scripts", "e2e_seeder", "phase2_runner.ts"),
  join("src", "services", "allocation.engine.service.ts"),
  join("src", "services", "cron", "amortization.worker.service.ts"),
  join("src", "services", "cron", "fx_revaluation.worker.service.ts"),
  join("src", "skills", "document", "esg_parsing.ts"),
];

/**
 * Info: (20260824 - Luphia) `$transaction` 這一側的白名單 —— 掃描根納入
 * `scripts/` 之後才需要它（`src` 底下非 repository 的 `$transaction` 是 0，
 * 所以先前這一條不需要白名單）。
 *
 * 三支都是維運腳本，而它們開交易的理由與 service 不同：
 * `leave_ledger.ts` 的原話是「這裡全部收 `tx`，不自己開交易：
 * 開交易是**呼叫端**的責任」—— CLI 就是那個呼叫端，
 * 它得先有一個 `tx` 才餵得進 `sumLedgerMinutes` / `sumExpiringSoonMinutes`。
 *
 * 所以這三個名字記的不是「違反」而是「這條規則對 CLI 入口不適用」。
 * 仍然列名而不是整個 `scripts/` 放行：新增一支要動這張表，
 * 那一刻才有人會問「它真的是入口嗎」。
 */
const GRANDFATHERED_TRANSACTION_USERS: readonly string[] = [
  join("scripts", "backfill_remove_team_admin.ts"),
  join("scripts", "migrate_allocations_onchain.ts"),
  join("scripts", "reconcile_leave_balances.ts"),
];

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

  /**
   * Info: (20260824 - Luphia) `scripts/` 這個根**真的**被走到了。
   *
   * 少了這一條，`SCRIPTS` 路徑一旦算錯（改了 cwd、搬了目錄），
   * 掃描會安靜地退回只有 `src`：所有斷言仍然全綠，而 `scripts/` 重新
   * 變成監測之外 —— 那正是這次要修掉的狀態，卻沒有東西會說出來。
   *
   * 判準取「白名單裡的 `scripts/` 項目至少有一個真的被掃到」，
   * 而不是寫死一個數量：數量會隨腳本增減變動，而根有沒有被走到不會。
   */
  it("掃描根確實走到根目錄的 scripts/", () => {
    const scanned = new Set(filesMatching('from "@/lib/prisma"'));
    const fromScripts = GRANDFATHERED_PRISMA_IMPORTERS.filter((path) =>
      path.startsWith(`scripts${sep}`),
    );
    expect(
      fromScripts.filter((path) => scanned.has(path)).length,
    ).toBeGreaterThan(0);
  });

  const transactionOffenders = (): string[] =>
    filesUsingTransaction()
      .filter((path) => !isTestFile(path))
      .filter((path) => !isRepository(path));

  it("產品程式碼裡的 $transaction 全部在 src/repositories/ 底下", () => {
    expect(
      transactionOffenders().filter(
        (path) => !GRANDFATHERED_TRANSACTION_USERS.includes(path),
      ),
    ).toEqual([]);
  });

  // Info: (20260824 - Luphia) 白名單不得留下已經清乾淨的名字（同 prisma 那一側的理由）
  it("$transaction 白名單裡的每一個檔案都還真的在用它", () => {
    const current = new Set(transactionOffenders());
    expect(
      GRANDFATHERED_TRANSACTION_USERS.filter((path) => !current.has(path)),
    ).toEqual([]);
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

describe("只有 Repository 碰得到 Prisma（CLAUDE.md §1）", () => {
  const offenders = (): string[] =>
    filesImportingPrisma()
      .filter((path) => !isTestFile(path))
      .filter((path) => !isRepository(path))
      .filter((path) => path !== PRISMA_MODULE);

  // Info: (20260824 - Julian) 掃描根壞掉時要紅，不是安靜地全綠（同上一段的理由）
  it("掃描根確實掃到 @/lib/prisma 的 import", () => {
    expect(filesImportingPrisma().length).toBeGreaterThan(10);
  });

  it("Repository 之外沒有新的檔案 import @/lib/prisma", () => {
    expect(
      offenders().filter(
        (path) => !GRANDFATHERED_PRISMA_IMPORTERS.includes(path),
      ),
    ).toEqual([]);
  });

  /**
   * Info: (20260824 - Julian) 白名單不得留下已經清乾淨的名字。
   *
   * 少了這一條，這張表只會長不會短：清掉一支之後沒有人知道那一行
   * 可以刪了，而下一個讀到它的人會以為那個檔案還在違反。
   */
  it("白名單裡的每一個檔案都還真的在違反", () => {
    const current = new Set(offenders());
    expect(
      GRANDFATHERED_PRISMA_IMPORTERS.filter((path) => !current.has(path)),
    ).toEqual([]);
  });
});
