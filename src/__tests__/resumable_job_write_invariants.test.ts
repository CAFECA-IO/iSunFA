import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

import { resumableJobRepo } from "@/repositories/resumable_job.repo";
import { prisma } from "@/lib/prisma";
import {
  JOB_PAUSE_REASON,
  JOB_STATUS,
  JOB_TYPE,
  type JobStatus,
} from "@/constants/resumable_job";

/**
 * Info: (20260828 - Julian) 書籤的暫停欄位不變式：
 *
 * > **狀態不是 `PAUSED` 的列，`pauseReason` 與 `pausedAt` 都必須是 `null`。**
 *
 * 這是 schema 給那兩個欄位的定義（`null＝不是暫停狀態`），而它沒有任何
 * 資料庫層的約束在守——只靠三支寫入各自記得。`markResumable` 就漏過一次：
 * 翻面時只改 `status`，於是一列同時是「可以繼續」又「因為額度用盡而暫停」。
 *
 * 那次的漏法值得記下來，因為它會重演：**三支各寫一次的東西，漏掉一支不會有
 * 任何人發現**。今天沒有人讀 `RESUMABLE` 狀態下的 `pauseReason`，所以壞掉的
 * 資料不會有症狀——直到有人拿它決定文案（「額度已重置」vs「款項已到帳」），
 * 讀到一個過期的值，而那時錯的是三個月前的一次寫入。
 *
 * 所以這一檔的職責是**把三支一起釘住**，並且釘住的是各自真正的執行點：
 *
 * | 寫入路徑        | `pausedAt` 由誰保證 | `pauseReason` 由誰保證              |
 * | --------------- | ------------------- | ----------------------------------- |
 * | `upsert`        | repo 的三元         | `saveJobBookmark` 由原因推導狀態    |
 * | `setStatus`     | repo 的三元         | 呼叫端（預設 null，兩處都明寫 null）|
 * | `markResumable` | repo（本次補上）    | repo（本次補上）                    |
 *
 * `upsert` 與 `setStatus` 的 `pauseReason` 不在 repo 裡把關，所以光測 repo
 * 會漏——那兩格的測試在最後一段用掃描補，掃的是**保證所在的那一層**。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    resumableJob: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
  },
}));

const findUnique = prisma.resumableJob.findUnique as unknown as ReturnType<
  typeof jest.fn
>;
const upsert = prisma.resumableJob.upsert as unknown as ReturnType<
  typeof jest.fn
>;
const update = prisma.resumableJob.update as unknown as ReturnType<
  typeof jest.fn
>;
const updateMany = prisma.resumableJob.updateMany as unknown as ReturnType<
  typeof jest.fn
>;

const NOW_MS = 1_787_000_000_000;
const ALL_STATUSES: JobStatus[] = Object.values(JOB_STATUS);

beforeEach(() => {
  jest.clearAllMocks();
  findUnique.mockResolvedValue(null);
  upsert.mockResolvedValue({});
  update.mockResolvedValue({});
  updateMany.mockResolvedValue({ count: 1 });
});

interface IWrittenRow {
  status?: unknown;
  pauseReason?: unknown;
  pausedAt?: unknown;
}

function argsOf(fn: ReturnType<typeof jest.fn>, call = 0) {
  return fn.mock.calls[call][0] as {
    where: Record<string, unknown>;
    data?: IWrittenRow;
    update?: IWrittenRow;
    create?: IWrittenRow;
  };
}

/**
 * Info: (20260828 - Julian) 不變式本身，寫成一個函式讓三支共用。
 *
 * `PAUSED` 那一側刻意也檢查（要有原因、要有時間），否則「全部清成 null」
 * 也會是綠的——而那會讓掃描行程永遠算不出「停了多久」。
 */
function expectPauseFieldsConsistent(row: IWrittenRow, label: string) {
  const actual = {
    label,
    status: row.status,
    pauseReason: row.pauseReason,
    pausedAt: row.pausedAt,
  };

  if (row.status === JOB_STATUS.PAUSED) {
    expect(actual).toEqual({
      label,
      status: JOB_STATUS.PAUSED,
      pauseReason: JOB_PAUSE_REASON.CREDITS_EXHAUSTED,
      pausedAt: expect.any(Date),
    });
    return;
  }

  expect(actual).toEqual({
    label,
    status: row.status,
    pauseReason: null,
    pausedAt: null,
  });
}

describe("markResumable：翻面時把暫停的痕跡一起清掉", () => {
  it("寫入 RESUMABLE，並清掉 pauseReason 與 pausedAt", async () => {
    await resumableJobRepo.markResumable("job-1");

    const { data } = argsOf(updateMany);
    expect(data).toEqual({
      status: JOB_STATUS.RESUMABLE,
      pauseReason: null,
      pausedAt: null,
    });
  });

  /**
   * Info: (20260828 - Julian) 條件式更新是這支的另一半（`updateMany` 而非
   * `update` 的唯一理由）：掃描行程讀取之後、寫入之前，使用者可能已經按了
   * 「繼續」（列已是 RUNNING）或取消了。無條件覆寫會把正在跑的任務標成
   * 「等著被繼續」。清欄位的修改很容易順手把 where 一起簡化掉，所以一起釘。
   */
  it("只翻得動仍在 PAUSED 的列", async () => {
    await resumableJobRepo.markResumable("job-1");

    expect(argsOf(updateMany).where).toEqual({
      id: "job-1",
      status: JOB_STATUS.PAUSED,
    });
  });

  it("沒翻到任何列時回 false（掃描行程據此不發通知）", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(resumableJobRepo.markResumable("job-1")).resolves.toBe(false);
  });
});

describe("setStatus：每一種狀態寫進去的暫停欄位都一致", () => {
  it.each(ALL_STATUSES)("%s", async (status) => {
    await resumableJobRepo.setStatus(
      "job-1",
      status,
      status === JOB_STATUS.PAUSED ? JOB_PAUSE_REASON.CREDITS_EXHAUSTED : null,
    );

    expectPauseFieldsConsistent(
      argsOf(update).data as IWrittenRow,
      `setStatus(${status})`,
    );
  });
});

describe("upsert：每一種狀態寫進去的暫停欄位都一致", () => {
  function inputFor(status: JobStatus) {
    return {
      userId: "user-1",
      teamId: "team-1",
      type: JOB_TYPE.CARBON_REPORT_IMPORT,
      resourceKey: "carbon-chat-0xabc-2025",
      status,
      pauseReason:
        status === JOB_STATUS.PAUSED
          ? JOB_PAUSE_REASON.CREDITS_EXHAUSTED
          : null,
      totalSteps: 14,
      completedSteps: 4,
      failedSteps: 0,
      remainingStepIds: ["c5"],
      nextStepCost: "100",
      lastError: null,
      nowMs: NOW_MS,
    };
  }

  it.each(ALL_STATUSES)("新增：%s", async (status) => {
    await resumableJobRepo.upsert(inputFor(status));

    const args = argsOf(upsert);
    expectPauseFieldsConsistent(
      args.create as IWrittenRow,
      `upsert.create(${status})`,
    );
    expectPauseFieldsConsistent(
      args.update as IWrittenRow,
      `upsert.update(${status})`,
    );
  });

  /**
   * Info: (20260828 - Julian) 覆寫既有的暫停列——這是最容易寫壞的一格：
   * `pausedAt` 要**沿用**（不然「停了多久」每次寫回都歸零），
   * 但狀態一離開 PAUSED 就要清掉（不然留下一個孤立的時間戳）。
   */
  it("覆寫既有的暫停列：續停沿用原本的 pausedAt", async () => {
    const pausedAt = new Date(NOW_MS - 3_600_000);
    findUnique.mockResolvedValue({
      status: JOB_STATUS.PAUSED,
      pausedAt,
      userId: "user-1",
    });

    await resumableJobRepo.upsert(inputFor(JOB_STATUS.PAUSED));

    expect(argsOf(upsert).update?.pausedAt).toBe(pausedAt);
  });

  it("覆寫既有的暫停列：離開暫停就清掉 pausedAt", async () => {
    findUnique.mockResolvedValue({
      status: JOB_STATUS.PAUSED,
      pausedAt: new Date(NOW_MS - 3_600_000),
      userId: "user-1",
    });

    await resumableJobRepo.upsert(inputFor(JOB_STATUS.RUNNING));

    expect(argsOf(upsert).update).toMatchObject({
      status: JOB_STATUS.RUNNING,
      pauseReason: null,
      pausedAt: null,
    });
  });
});

/**
 * Info: (20260828 - Julian) 以下是掃描的部分，補上執行測試碰不到的兩件事：
 *
 * 1. **第四支寫入**。上面三段各自釘住一支；新增的第四支不會讓它們變紅，
 *    它只是不被任何人檢查。
 * 2. **`pauseReason` 的保證不在 repo 裡的那兩格**（見檔頭的表）。
 */

const REPO_FILE = join("src", "repositories", "resumable_job.repo.ts");
const SERVICE_FILE = join("src", "services", "resumable_job.service.ts");

// Info: (20260828 - Julian) 去掉區塊註解與行註解——註解裡提到什麼都不算
function codeOf(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

const NOT_METHOD_NAMES = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "return",
  "throw",
  "await",
  "new",
  "constructor",
  "function",
  "expect",
]);

const WRITE_VERBS = [
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
];

// Info: (20260828 - Julian) repo 裡哪些方法真的寫了 resumableJob 這張表
function writingMethods(): string[] {
  const found = new Set<string>();
  let current = "";
  for (const line of codeOf(REPO_FILE).split("\n")) {
    const declaration = /^\s*(?:async\s+)?([A-Za-z][A-Za-z0-9_]*)\s*\(/.exec(
      line,
    );
    // Info: (20260828 - Julian) `if (`、`for (` 也長得像宣告，別讓它們冒充方法名
    if (declaration && !NOT_METHOD_NAMES.has(declaration[1])) {
      current = declaration[1];
    }
    const write = /prisma\.resumableJob\.([A-Za-z]+)\s*\(/.exec(line);
    if (write && WRITE_VERBS.includes(write[1])) found.add(current);
  }
  return [...found].sort();
}

describe("沒有第四支寫入偷偷長出來", () => {
  it("寫 resumableJob 的方法就是這三支", () => {
    expect(writingMethods()).toEqual(["markResumable", "setStatus", "upsert"]);
  });
});

describe("repo 沒把關的那兩格，保證在呼叫端", () => {
  /**
   * Info: (20260828 - Julian) `upsert` 的 `pauseReason` 是原封不動寫進去的，
   * 所以「不會出現非暫停狀態卻帶著原因」這件事，是 `saveJobBookmark`
   * **由原因推導狀態**推出來的：有原因就是 PAUSED，沒有別的組合寫得進去。
   *
   * 這個保證只在「upsert 只有那一個呼叫端」時成立，所以兩件一起釘。
   */
  it("saveJobBookmark 由 pauseReason 推導狀態", () => {
    expect(codeOf(SERVICE_FILE)).toMatch(
      /params\.pauseReason\s*!==\s*null\s*\?\s*JOB_STATUS\.PAUSED/,
    );
  });

  it("upsert 在生產程式碼裡只有 saveJobBookmark 一個呼叫端", () => {
    expect(productionFilesMentioning("resumableJobRepo.upsert(")).toEqual([
      SERVICE_FILE,
    ]);
  });

  /**
   * Info: (20260828 - Julian) `setStatus` 的 `pauseReason` 同樣來自呼叫端。
   * 合法的組合只有兩種：狀態是 PAUSED（可以帶原因），或原因明寫 null。
   */
  it("setStatus 的每個呼叫端不是寫 PAUSED 就是明寫 null", () => {
    const calls = [
      ...codeOf(SERVICE_FILE)
        .replace(/\s+/g, " ")
        .matchAll(/resumableJobRepo\.setStatus\(([^)]*)\)/g),
    ].map((match) => match[1]);

    expect(calls.length).toBeGreaterThan(0);
    calls.forEach((argumentList) => {
      const parts = argumentList.split(",").map((part) => part.trim());
      const writesPause = parts[1]?.includes(JOB_STATUS.PAUSED);
      expect({ argumentList, ok: writesPause || parts[2] === "null" }).toEqual({
        argumentList,
        ok: true,
      });
    });
  });
});

/**
 * Info: (20260828 - Julian) 「只有一個呼叫端」這種主張的掃描根必須是整個 src，
 * 不能只是我想得到的那幾個檔案。排除測試與產生的 Prisma client。
 */
function productionFilesMentioning(needle: string): string[] {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__" || entry.name === "generated") continue;
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) continue;
      const relative = full.slice(process.cwd().length + 1);
      if (relative === REPO_FILE) continue;
      if (codeOf(relative).includes(needle)) hits.push(relative);
    }
  };
  walk(join(process.cwd(), "src"));
  return hits.sort();
}
