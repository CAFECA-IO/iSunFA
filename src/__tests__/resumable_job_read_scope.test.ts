import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { readFileSync } from "fs";
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
    },
  },
}));

const findMany = prisma.resumableJob.findMany as unknown as ReturnType<
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
  it("依 updatedAt 由新到舊，且帶上限", async () => {
    await resumableJobRepo.listResumableByUser(USER);

    expect(findMany.mock.calls[0][0]).toMatchObject({
      orderBy: { updatedAt: "desc" },
      take: JOB_RESUMABLE_NOTICE_LIMIT,
    });
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
    if (!/prisma\.resumableJob\.findMany\(/.test(line)) return;

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
    if (!scoped && !CROSS_USER_READS.includes(current)) offenders.push(current);
  });

  return offenders;
}

describe("沒有第四支未限定使用者的讀取", () => {
  it("每一支 findMany 不是帶 userId，就是登記過的跨使用者查詢", () => {
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
});
