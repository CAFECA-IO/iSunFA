import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { JOB_CLAIM, resumableJobRepo } from "@/repositories/resumable_job.repo";
import {
  JOB_CLAIM_TTL_MS,
  JOB_STATUS,
  JOB_TYPE,
} from "@/constants/resumable_job";

/**
 * Info: (20260901 - Luphia) `claimIfIdle` 對**真資料庫**的驗證（review #6726 阻-2）。
 *
 * ## 為什麼非它不可
 *
 * `resumable_job_claim.test.ts` 把這支 repo 整包 mock 掉——review 的 mutation
 * 實驗證明：把 `CANCELLED` 早退**和** `updateMany` where 的
 * `notIn: [COMPLETED, CANCELLED]` 一起拔掉（等於把高-1 整條還原），
 * 唯一會紅的是一條原始碼字串掃描；「取消過的任務接續是錯」的行為測試照綠。
 * 裁決那段 `updateMany`——這把鎖的**全部**——從未被執行過（檢查表 §1.2、
 * §1.11、§1.12）。
 *
 * 這條鎖守的是重複扣款（單份 2MB PDF 預扣估算約 677 點），依 §2.3
 * 「金流的恆等式至少要有一支真資料庫的 e2e」。三件事只有真 Prisma 答得出來：
 *
 * 1. **並發**：同一列同時兩次 claim，`updateMany` 的原子性讓恰好一次 CLAIMED。
 * 2. **租約**：`updatedAt` 超過 TTL 之後搶得到，沒超過搶不到。
 * 3. **終局狀態**：CANCELLED / COMPLETED **連租約過期都搶不到**——這正是
 *    mutation 拔掉的那條 `notIn` 在裁決裡載重的證明（沒有它，`OR` 的
 *    「updatedAt 過期」分支會把終局狀態翻回 RUNNING）。
 *
 * ## 租約的過期不用改 `updatedAt`
 *
 * `updatedAt` 是 `@updatedAt`，直接寫會被 Prisma 蓋掉。這裡反過來動 `nowMs`：
 * 把「現在」推到未來，`staleBefore = nowMs - ttl` 就越過真實的 `updatedAt`
 * ——與生產路徑跑的是**同一段** where，一行 raw SQL 都不用。
 */

// Info: (20260825 - Julian) 🛑 正式機實體隔離（與同層 e2e 一致）
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免污染真實任務資料！",
  );
}

const STAMP = Date.now();
// Info: (20260901 - Luphia) 前綴帶時間戳：同一個資料庫上兩份 e2e 併跑時不會撞
const KEY_PREFIX = `e2e-job-claim-${STAMP}:`;

let userId = "";

const createJob = (suffix: string, status: string) =>
  prisma.resumableJob.create({
    data: {
      userId,
      type: JOB_TYPE.CARBON_REPORT_IMPORT,
      resourceKey: `${KEY_PREFIX}${suffix}`,
      status,
      totalSteps: 4,
      completedSteps: 1,
      remainingStepIds: ["ch3#0", "ch3#1", "ch4#0"],
    },
  });

const claim = (suffix: string, nowMs: number) =>
  resumableJobRepo.claimIfIdle({
    resourceKey: `${KEY_PREFIX}${suffix}`,
    type: JOB_TYPE.CARBON_REPORT_IMPORT,
    userId,
    nowMs,
    ttlMs: JOB_CLAIM_TTL_MS,
  });

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { address: `e2e_job_claim_${STAMP}`, name: "E2E job claim" },
  });
  userId = user.id;
});

afterAll(async () => {
  // Info: (20260901 - Luphia) 只清自己建的列（前綴指名），然後斷線
  await prisma.resumableJob.deleteMany({
    where: { resourceKey: { startsWith: KEY_PREFIX } },
  });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("claimIfIdle 對真資料庫", () => {
  /**
   * Info: (20260901 - Luphia) 這把鎖唯一真正在做的事。兩個分頁同時按下
   * 「接著匯入」＝同一列並發兩次 `updateMany`——Postgres 的列鎖讓後到的那次
   * 在前一次 commit 後重評 where（status 已是 RUNNING、updatedAt 已續租）
   * → count 0 → BUSY。單執行緒的 mock 測試永遠走不到這裡。
   */
  it("並發：同一列同時兩次 claim，恰好一次 CLAIMED、一次 BUSY", async () => {
    await createJob("concurrent", JOB_STATUS.PAUSED);

    const now = Date.now();
    const [first, second] = await Promise.all([
      claim("concurrent", now),
      claim("concurrent", now),
    ]);

    const kinds = [first.kind, second.kind].sort();
    expect(kinds).toEqual([JOB_CLAIM.BUSY, JOB_CLAIM.CLAIMED].sort());

    // Info: (20260901 - Luphia) 贏家把列翻成 RUNNING，輸家沒有動到任何東西
    const row = await prisma.resumableJob.findUnique({
      where: {
        resourceKey_type: {
          resourceKey: `${KEY_PREFIX}concurrent`,
          type: JOB_TYPE.CARBON_REPORT_IMPORT,
        },
      },
    });
    expect(row?.status).toBe(JOB_STATUS.RUNNING);
  });

  it("租約：RUNNING 而未過期時搶不到；過期之後搶得到", async () => {
    await createJob("lease", JOB_STATUS.RUNNING);

    // Info: (20260901 - Luphia) 剛建立的列 updatedAt≈now：租約還新鮮，BUSY
    const fresh = await claim("lease", Date.now());
    expect(fresh.kind).toBe(JOB_CLAIM.BUSY);

    /**
     * Info: (20260901 - Luphia) 把「現在」推到 TTL 之後（見檔頭）：
     * staleBefore 越過 updatedAt，`OR` 的過期分支放行。
     */
    const afterLease = await claim("lease", Date.now() + JOB_CLAIM_TTL_MS + 1);
    expect(afterLease.kind).toBe(JOB_CLAIM.CLAIMED);
  });

  /**
   * Info: (20260901 - Luphia) 終局狀態**連租約過期都搶不到**。nowMs 刻意推到
   * 未來：沒有 `notIn` 的話，`OR` 的過期分支會 match，取消被撤銷、那批份
   * 真的跑、點數真的扣——正是高-1 的缺陷與 review 那次 mutation 還原的世界。
   */
  it.each([
    [JOB_STATUS.CANCELLED, JOB_CLAIM.CANCELLED],
    [JOB_STATUS.COMPLETED, JOB_CLAIM.COMPLETED],
  ])("終局狀態 %s：租約過期也搶不到，列不被改寫", async (status, expected) => {
    const suffix = `terminal-${status}`;
    await createJob(suffix, status);

    const outcome = await claim(suffix, Date.now() + JOB_CLAIM_TTL_MS * 2);
    expect(outcome.kind).toBe(expected);

    const row = await prisma.resumableJob.findUnique({
      where: {
        resourceKey_type: {
          resourceKey: `${KEY_PREFIX}${suffix}`,
          type: JOB_TYPE.CARBON_REPORT_IMPORT,
        },
      },
    });
    // Info: (20260901 - Luphia) 裁決沒有動它：狀態仍是終局，不是 RUNNING
    expect(row?.status).toBe(status);
    expect(row?.pauseReason).toBeNull();
  });
});
