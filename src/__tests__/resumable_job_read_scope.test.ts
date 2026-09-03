import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

import { resumableJobRepo } from "@/repositories/resumable_job.repo";
import { prisma } from "@/lib/prisma";
import {
  JOB_PAUSE_REASON,
  JOB_RESUMABLE_NOTICE_LIMIT,
  JOB_STATUS,
} from "@/constants/resumable_job";

/**
 * Info: (20260831 - Julian) 讀取查詢的**租戶範圍**（review #6732 的 1-B）。
 *
 * 這一檔存在的理由是一次實跑的 mutation：把 `listResumableByUser` 的
 * `where: { userId, status }` 改成 `where: { status }`，**527 個測試全綠**。
 *
 * 綠的原因不是沒人測到它，而是兩個消費端都把整支 repo 整包 mock 掉了
 *（`notification_service.test.ts`、`resumable_job_service.test.ts`），
 * 而 repo 自己沒有任何測試 —— 檢查清單 §1.2 講的正是這件事：
 * 一旦決定 mock 掉某支協作者，就要另有一支測試直接測那支協作者。
 *
 * 掉了 `userId` 的後果不是壞掉，是**外洩**：任何人打開小鈴鐺，待辦區會列出
 * 全站所有人可繼續的匯入任務，payload 帶著 `resourceKey`
 *（`carbon-chat-<對方錢包位址>-<sessionId>`），深連結還會指向別人的會話。
 *
 * 所以這裡不 mock repo，而是 mock `prisma` —— 斷言的是**交給資料庫的條件**。
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    resumableJob: {
      findMany: jest.fn(async () => []),
      aggregate: jest.fn(async () => ({
        _count: { _all: 0 },
        _max: { updatedAt: null },
      })),
    },
  },
}));

const findMany = prisma.resumableJob.findMany as unknown as ReturnType<
  typeof jest.fn
>;

const aggregate = prisma.resumableJob.aggregate as unknown as ReturnType<
  typeof jest.fn
>;

const USER = "user-1";

function whereOf(call = 0): Record<string, unknown> {
  return (findMany.mock.calls[call][0] as { where: Record<string, unknown> })
    .where;
}

beforeEach(() => {
  jest.clearAllMocks();
  findMany.mockResolvedValue([]);
  aggregate.mockResolvedValue({
    _count: { _all: 0 },
    _max: { updatedAt: null },
  });
});

describe("小鈴鐺的活算來源：只撈這個人的", () => {
  it("條件帶 userId 與 RESUMABLE", async () => {
    await resumableJobRepo.listResumableByUser(USER);

    expect(whereOf()).toEqual({
      userId: USER,
      status: JOB_STATUS.RESUMABLE,
    });
  });

  /**
   * Info: (20260831 - Julian) 上限與排序一起釘：這支會被每 60 秒的摘要輪詢打到。
   * 少了 `take`，一個累積了幾百筆的帳號會讓每一次輪詢都拖著整包資料。
   */
  it("依 updatedAt 由新到舊，且多取一則以判斷截斷", async () => {
    /**
     * Info: (20260901 - Julian) `take` 是**上限 + 1**（review：D4）。
     *
     * 多取的那一則不會進清單，它只用來回答「還有沒有更多」。少了它，
     * 截斷就是靜默的 —— 而徽章數的是全部（`summarizeResumable`），
     * 兩者分岔時畫面必須說得出一句話。
     */
    await resumableJobRepo.listResumableByUser(USER);

    expect(findMany.mock.calls[0][0]).toMatchObject({
      orderBy: { updatedAt: "desc" },
      take: JOB_RESUMABLE_NOTICE_LIMIT + 1,
    });
  });

  /**
   * Info: (20260901 - Julian) 截斷要說得出來，而且多取的那一則不得外流。
   */
  it("超過上限時只回上限內的筆數，並回報 hasMore", async () => {
    const rows = Array.from(
      { length: JOB_RESUMABLE_NOTICE_LIMIT + 1 },
      (unused, index) => ({ id: `job-${index}` }),
    );
    findMany.mockResolvedValueOnce(rows);

    const page = await resumableJobRepo.listResumableByUser(USER);

    expect(page.items).toHaveLength(JOB_RESUMABLE_NOTICE_LIMIT);
    expect(page.hasMore).toBe(true);
  });

  it("剛好等於上限時不算截斷", async () => {
    const rows = Array.from(
      { length: JOB_RESUMABLE_NOTICE_LIMIT },
      (unused, index) => ({ id: `job-${index}` }),
    );
    findMany.mockResolvedValueOnce(rows);

    const page = await resumableJobRepo.listResumableByUser(USER);

    expect(page.items).toHaveLength(JOB_RESUMABLE_NOTICE_LIMIT);
    expect(page.hasMore).toBe(false);
  });
});

describe("付款釋放的來源：只撈這個人的、這一份資源的", () => {
  /**
   * Info: (20260831 - Julian) 兩個條件缺一不可（review #6732 的 1-A 與 1-B）。
   *
   * - 少了 `userId`：`resourceKey` 是可推導的字串（`buildCarbonChatChannel`），
   *   等於讓任何人翻別人的任務。
   * - 少了 `resourceKey`：一次付款會把這個人**所有**等付款的任務都翻成
   *   「可以繼續」，而其中只有一筆是真的付過的。
   */
  it("條件帶 userId、resourceKey、PAUSED 與 PAYMENT_REQUIRED", async () => {
    await resumableJobRepo.listPaymentBlockedByResource(USER, "channel-1");

    expect(whereOf()).toEqual({
      userId: USER,
      resourceKey: "channel-1",
      status: JOB_STATUS.PAUSED,
      pauseReason: JOB_PAUSE_REASON.PAYMENT_REQUIRED,
    });
  });

  // Info: (20260831 - Julian) 最久沒動的先處理（與掃描同一個原則）
  it("依 updatedAt 由舊到新", async () => {
    await resumableJobRepo.listPaymentBlockedByResource(USER, "channel-1");

    expect(findMany.mock.calls[0][0]).toMatchObject({
      orderBy: { updatedAt: "asc" },
    });
  });
});

describe("使用者自己的未完成任務（畫面橫幅）", () => {
  it("條件帶 userId", async () => {
    await resumableJobRepo.listOpenByUser(USER);

    expect(whereOf()).toMatchObject({ userId: USER });
  });
});

/**
 * Info: (20260831 - Julian) 上面三條釘的是**現有的三支**。真正會重演的是
 * 「新增第四支讀取、忘了帶 userId」—— 那不會讓任何一條變紅，它只是沒被檢查。
 *
 * 所以這一條由原始碼長出來：repo 裡每一支 `findMany` 都必須落在兩類之一 ——
 * 帶 `userId` 的，或**明確登記過的跨使用者查詢**。今天後者只有一支：
 * `listPausedForScan`（掃描行程要看全站暫停中的任務，那是它的職責）。
 */
const REPO_FILE = join("src", "repositories", "resumable_job.repo.ts");

/**
 * Info: (20260831 - Julian) 已知且刻意跨使用者的讀取，**逐項附理由**。
 *
 * - `listPausedForScan`：掃描行程要看全站暫停中的任務，跨使用者是它的職責本身。
 *   它不回傳給任何人，結果只餵給 `canResumeNow` 與 `markResumable`。
 */
const CROSS_USER_READS = ["listPausedForScan"];

// Info: (20260831 - Julian) 這份清單的上限；要放寬必須改這個數字，見下方測試
const CROSS_USER_READS_MAX = 1;

/**
 * Info: (20260902 - Julian) **每一個讀取動詞**，不只 `findMany`（review R3 的 A6）。
 *
 * 上一版只認 `findMany`，而 repo 現在的讀取是 `findMany`×4、`findUnique`×3、
 * `aggregate`×1。reviewer 實跑過那個 mutation：加一支不帶 `userId` 的
 * `aggregate`（`where: { status: RESUMABLE }`）→ **這一檔 13 條全綠**。
 *
 * 會走到那裡的情境很具體：下一個人要做「全站有幾份可接續的匯入」的營運數字，
 * 最省事就是複製 `summarizeResumable` 去掉 `userId` —— 跨租戶計數外洩，
 * 順手回 `_max.updatedAt` 就連活動時間一起外洩。
 *
 * 這正是本檔檔頭記的那個 mutation 換一個動詞重演：**下界寫對了、上界只認一個動詞**，
 * 而檢查清單 §1.15 要的是兩側成對。列舉而不是 `[A-Za-z]+`：`create`／`update`
 * 也符合後者，而那些是寫入，歸另一支測試管。
 */
const READ_VERBS =
  /prisma\.resumableJob\.(findMany|findFirst|findUnique|aggregate|count|groupBy)\(/;

const SERVICE_FILE = join("src", "services", "resumable_job.service.ts");

/**
 * Info: (20260902 - Julian) 以唯一鍵讀、由**明確的擁有者比對**把關的那幾支。
 *
 * 加動詞之後浮出來三支，而它們不是「刻意跨使用者」—— 那是另一回事。
 * 它們以主鍵或 `(resourceKey, type)` 唯一鍵讀一列，然後在程式裡比對
 * `userId` 並拒絕，也就是**範圍限定在查詢之外**。
 *
 * 混進 `CROSS_USER_READS` 會弄壞那份清單的意思（它的上限是 1，而那個 1
 * 是「掃描行程」這唯一一個真的跨使用者的職責）。所以分開一份，
 * 並且**逐支斷言那道比對真的存在** —— 只列名字就只是放行，不是把關。
 */
const OWNERSHIP_CHECKED: {
  method: string;
  file: string;
  guard: RegExp;
  /**
   * Info: (20260902 - Julian) **要幾道**，不是「有沒有」（review R3 二輪的 N1）。
   *
   * 上一版用 `toMatch`，而 `findById` 有兩個呼叫端（開始接續、取消）——
   * 刪掉其中一個的比對，`toMatch` 照樣綠。檢查清單 §1.15 寫著
   * 「計數比包含強」，而這裡正是那個形狀：註解宣稱「兩個呼叫端都比對過」，
   * 斷言只證明了「至少有一個」。
   *
   * 今天刪掉一道不會立刻外洩（`jobId` 是 uuid，不可枚舉），
   * 所以這是守門的缺口而不是現行缺陷 —— 但那也正是它會被安靜刪掉的原因。
   */
  guards: number;
}[] = [
  // Info: (20260902 - Julian) 讀完立刻拒絕別人的列（`upsert` 的第二防線同一條）
  {
    method: "claimIfIdle",
    file: REPO_FILE,
    guard: /existing\.userId !== params\.userId/g,
    guards: 1,
  },
  // Info: (20260902 - Julian) 兩個呼叫端（開始接續、取消）都比對過才動它
  {
    method: "findById",
    file: SERVICE_FILE,
    guard: /job\.userId !== params\.userId/g,
    guards: 2,
  },
];

/**
 * Info: (20260902 - Julian) `findByResource` 今天**沒有生產呼叫端**。
 *
 * 它以 `(resourceKey, type)` 讀一列而完全不看 `userId`，所以它一旦有呼叫端，
 * 那個呼叫端就必須自己比對擁有者。與其現在猜一套規則，先把「沒有人用它」
 * 釘住 —— 加第一個呼叫端的人會看到這條紅，那時再決定要哪一種把關。
 */
const UNUSED_READS = ["findByResource"];

/**
 * Info: (20260902 - Julian) 走 `src` 找生產程式碼裡的引用（排除測試與 generated）。
 * 與 `resumable_job_write_invariants.test.ts` 的同名函式同一套做法。
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
      if (readFileSync(full, "utf8").includes(needle)) hits.push(relative);
    }
  };
  walk(join(process.cwd(), "src"));
  return hits.sort();
}

// Info: (20260831 - Julian) 查詢條件從 `findMany(` 那一行往下這麼多行內判定
const QUERY_HEAD_LINES = 10;

function readsWithoutUserId(): string[] {
  const lines = readFileSync(join(process.cwd(), REPO_FILE), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"));

  const offenders: string[] = [];
  let current = "";

  /**
   * Info: (20260831 - Julian) 逐行走並記住位置，**不要**用 `indexOf(line)` 回頭找 ——
   * 每一支的 `return prisma.resumableJob.findMany({` 是同一個字串，
   * `indexOf` 永遠指回第一支，於是每一支都會拿第一支的條件來檢查，
   * 這條測試會靜靜地變成永遠通過。
   */
  lines.forEach((line, index) => {
    const declaration = /^\s*async\s+([A-Za-z][A-Za-z0-9_]*)\s*\(/.exec(line);
    if (declaration) current = declaration[1];
    if (!READ_VERBS.test(line)) return;

    /**
     * Info: (20260831 - Julian) 只看到這支查詢自己的結尾（`});`）為止。
     *
     * 固定行數的視窗會溢出到**下一支方法的簽章**，而那裡幾乎一定有
     * `userId: string` —— 於是拿掉條件的那一支也會被判定為合格。
     * 這是這條掃描第一版真的犯過的錯（改壞了條件，掃描照樣是綠的）。
     */
    const window = lines.slice(index + 1, index + 1 + QUERY_HEAD_LINES);
    const end = window.findIndex((entry) => entry.trim().startsWith("});"));
    const head = window.slice(0, end === -1 ? window.length : end).join("\n");
    const scoped = head.includes("userId");
    if (
      !scoped &&
      !CROSS_USER_READS.includes(current) &&
      !OWNERSHIP_CHECKED.some((entry) => entry.method === current) &&
      !UNUSED_READS.includes(current)
    ) {
      offenders.push(current);
    }
  });

  return offenders;
}

describe("沒有第四支未限定使用者的讀取", () => {
  it("每一支讀取不是帶 userId，就是登記過的跨使用者查詢", () => {
    expect(readsWithoutUserId()).toEqual([]);
  });

  /**
   * Info: (20260831 - Julian) 例外清單**只能變短**（review #6732 R3）。
   *
   * 上面那一條只做了檢查清單 §1.1 的一半：明列例外。少了另一半的話，
   * 下一個人寫了一支不帶 `userId` 的讀取，**把名字加進那個陣列就靜默放行了** ——
   * 沒有任何東西會紅，而那正是這一檔要防的缺陷（跨租戶外洩）。
   *
   * 這一條讓「放寬」變成一個要動手改數字、因而會出現在 diff 上、
   * 需要在 review 裡說明理由的動作。清單縮短時它照樣綠 —— 方向是單向的。
   */
  it("跨使用者的例外清單沒有變長", () => {
    expect(CROSS_USER_READS.length).toBeLessThanOrEqual(CROSS_USER_READS_MAX);
  });

  /**
   * Info: (20260902 - Julian) 登記「範圍在查詢之外」的那幾支，比對必須真的在。
   *
   * 少了這一條，那份清單就是一個放行名單：把方法名加進去、順手刪掉那行
   * `job.userId !== params.userId`，掃描照樣綠，而外洩是靜默的。
   */
  it.each(OWNERSHIP_CHECKED)(
    "$method 的擁有者比對在 $file 裡有 $guards 道",
    ({ file, guard, guards }) => {
      const text = readFileSync(join(process.cwd(), file), "utf8");
      // Info: (20260902 - Julian) 精確筆數：少一道會紅，多一道也會（多的那道要有人解釋）
      expect(text.match(guard) ?? []).toHaveLength(guards);
    },
  );

  /**
   * Info: (20260902 - Julian) 宣稱沒有呼叫端的那幾支，真的沒有。
   *
   * 這是那份清單成立的唯一前提。有人加了第一個呼叫端時這條會紅，
   * 而紅的訊息就是「請決定這支要哪一種把關」。
   */
  it.each(UNUSED_READS)("%s 沒有生產呼叫端", (method) => {
    const hits = productionFilesMentioning(`resumableJobRepo.${method}(`);
    expect(hits).toEqual([]);
  });
});

/**
 * Info: (20260901 - Julian) 摘要那一支也要釘住條件（review：D4 的修正本身）。
 *
 * 這一組是實跑一次 mutation 之後補的：把 `summarizeResumable` 的
 * `where: { userId, status }` 改成 `where: { userId }`，**5,057 條全綠**。
 *
 * 綠的原因與這個檔案開頭記的那一次一模一樣 —— 兩個消費端都把 repo 整包
 * mock 掉，而新加的這支 repo 方法沒有任何測試碰過它交給 Prisma 的條件。
 * 修一個 D4 的同時開一個新的同型缺口，正是檢查清單 §2.5 說的
 *「放寬（或新增）一道之後，其他護欄的涵蓋範圍要重新量過」。
 *
 * 掉了 `status` 的後果：徽章把 PAUSED／RUNNING／CANCELLED 全部算進去，
 * 於是它說 9 而清單只有 2 —— 徽章與清單分岔，而這正是這次修正要消滅的東西。
 * 掉了 `userId` 的後果更糟：那是一個跨租戶的計數外洩。
 */
describe("摘要的活算來源：計數不得截斷，條件不得放寬", () => {
  it("條件帶 userId 與 RESUMABLE", async () => {
    await resumableJobRepo.summarizeResumable(USER);

    expect(aggregate.mock.calls[0][0]).toMatchObject({
      where: { userId: USER, status: JOB_STATUS.RESUMABLE },
    });
  });

  /**
   * Info: (20260901 - Julian) **不得帶 `take`。** 這一支存在的唯一理由就是
   * 「徽章要數全部」——帶了上限就退回原本的缺陷，而且看起來完全正常。
   */
  it("不帶任何上限", async () => {
    await resumableJobRepo.summarizeResumable(USER);

    expect(aggregate.mock.calls[0][0]).not.toHaveProperty("take");
  });

  /**
   * Info: (20260901 - Julian) 計數與最新翻面時間必須來自**同一次**查詢。
   * 分兩次查不只多一趟往返，還可能看到不一致的快照（同 `summarizeUnread`）。
   */
  it("計數與最新 updatedAt 一次查完", async () => {
    aggregate.mockResolvedValueOnce({
      _count: { _all: 7 },
      _max: { updatedAt: new Date(1_700_000_000_000) },
    });

    const result = await resumableJobRepo.summarizeResumable(USER);

    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(7);
    expect(result.latestUpdatedAt).toEqual(new Date(1_700_000_000_000));
  });

  it("一筆都沒有時回 0 與 null", async () => {
    const result = await resumableJobRepo.summarizeResumable(USER);

    expect(result.count).toBe(0);
    expect(result.latestUpdatedAt).toBeNull();
  });
});
