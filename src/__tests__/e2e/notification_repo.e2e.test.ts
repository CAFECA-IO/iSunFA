import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { notificationRepo } from "@/repositories/notification.repo";
import { NOTIFICATION_TYPE } from "@/constants/notification";

/**
 * Info: (20260825 - Julian) `NotificationRepository` 對**真資料庫**的驗證。
 *
 * ## 為什麼非它不可
 *
 * `notification_service.test.ts` 把這支 repo 換成一份有狀態的假實作，
 * 而那份假實作裡的 `type.in` / `type.notIn` / `take` / `updateMany` 的語意
 * **是我自己寫的**。檢查清單 §一.2 第二條：一旦決定 mock 掉某支協作者，
 * 就要另有一支測試直接測那支協作者；§一.8 的判準則是「把替身換成真的實作，
 * 結論應該一樣 —— 不一樣就代表替身在替程式回答問題」。
 *
 * 這一支就是那個對照組。它驗的四件事，全部只有真 Prisma 答得出來：
 *
 * 1. `dedupeKey` 的唯一約束真的存在（不是只寫在 schema 裡沒 push 上去）
 * 2. `notIn` 真的排除掉待辦型 —— D1 的整個修法建立在這上面
 * 3. `take: limit + 1` 真的算得出 `hasMore`
 * 4. `updateMany` 的 `where` 真的只動到自己那一列（跨租戶）
 *
 * ## 為什麼是 e2e 而不是一般測試
 *
 * `jest.config.mjs` 把 `*.e2e.test.ts` 排除在 `npm test` 之外，以
 * `npm run test:e2e` 明確執行 —— 那些測試會**真的建立與刪除**資料列，
 * 而開發者的 `DATABASE_URL` 可能指向共用或 staging 資料庫。
 */

// Info: (20260825 - Julian) 🛑 正式機實體隔離（與同層 e2e 一致）
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免污染真實通知資料！",
  );
}

const STAMP = Date.now();
const NOW_MS = 1_760_000_000_000;

let userId = "";
let otherUserId = "";

/**
 * Info: (20260825 - Julian) 每一則測試資料都帶這個前綴，斷言時用它指名自己建的列。
 * 加時間戳而不是固定字串：同一個資料庫上兩份 e2e 併跑時前綴不會撞。
 */
const KEY_PREFIX = `e2e-notification-${STAMP}:`;

beforeAll(async () => {
  const [main, other] = await Promise.all([
    prisma.user.create({
      data: { address: `e2e_notif_main_${STAMP}`, name: "E2E notif main" },
    }),
    prisma.user.create({
      data: { address: `e2e_notif_other_${STAMP}`, name: "E2E notif other" },
    }),
  ]);
  userId = main.id;
  otherUserId = other.id;
});

/**
 * Info: (20260825 - Julian) 每一則測試都從「兩位使用者都沒有通知」開始。
 *
 * 原本的寫法是各測試在自己結尾收拾（標已讀、刪掉自己建的列），那有兩個問題，
 * 而且兩個都真的發生了：
 *
 * 1. 漏收拾看不出來。第一則測試建的 `dedupe` 那一列沒人刪，於是第三則的
 *    `markReadExcludingTypes`（當時的整批標記，已隨端點移除）標到 2 列而不是 1 列 —— 紅的是第三則，
 *    錯的是第一則。
 * 2. 收拾寫在測試結尾，斷言失敗就不會執行。第三則一紅，它後面那行
 *    `markReadByType` 沒跑，第四則跟著紅；第四則一紅，第五則再跟著紅。
 *    一個缺陷印出三條失敗，而只有第一條指得到病灶。
 *
 * 前置清空則兩者皆免：狀態由「前一則有沒有收乾淨」決定，改成由這裡決定。
 */
beforeEach(async () => {
  await prisma.notification.deleteMany({
    where: { userId: { in: [userId, otherUserId] } },
  });
});

afterAll(async () => {
  await prisma.notification.deleteMany({
    where: { userId: { in: [userId, otherUserId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [userId, otherUserId] } },
  });
  await prisma.$disconnect();
});

const seed = (
  type: string,
  suffix: string,
  createdAt: Date,
  owner: string = userId,
) =>
  prisma.notification.create({
    data: {
      userId: owner,
      type,
      payload: {},
      dedupeKey: `${KEY_PREFIX}${suffix}`,
      createdAt,
    },
  });

describe("NotificationRepository（真資料庫）", () => {
  /**
   * Info: (20260825 - Julian) 唯一約束真的在資料庫裡。
   *
   * 這條擋的是一個只有真 DB 抓得到的失效：schema 寫了 `@unique` 但
   * `prisma db push` 沒跑（本專案沒有 migrations 目錄，schema 與資料庫
   * 是兩件要分別確認的事）。假實作裡的唯一性是我用 `Array.some` 寫的，
   * 它永遠會通過。
   */
  it("dedupeKey 撞鍵回 null，且只留下一列", async () => {
    const first = await notificationRepo.createIfAbsent({
      userId,
      type: NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      payload: {},
      dedupeKey: `${KEY_PREFIX}dedupe`,
    });
    const second = await notificationRepo.createIfAbsent({
      userId,
      type: NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      payload: {},
      dedupeKey: `${KEY_PREFIX}dedupe`,
    });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(
      await prisma.notification.count({
        where: { dedupeKey: `${KEY_PREFIX}dedupe` },
      }),
    ).toBe(1);
  });

  // Info: (20260825 - Julian) 不帶鍵的通知不受唯一約束限制（Postgres 允許多個 null）
  it("不帶 dedupeKey 時可以建立多列", async () => {
    const a = await notificationRepo.createIfAbsent({
      userId,
      type: NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      payload: {},
    });
    const b = await notificationRepo.createIfAbsent({
      userId,
      type: NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      payload: {},
    });

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a?.id).not.toBe(b?.id);
  });

  /**
   * Info: (20260825 - Julian) `_max` 真的取到未讀之中的最新（計畫書 D17）。
   *
   * 假實作裡這件事是我用 `reduce` 寫的；真 Prisma 的 `groupBy` + `_max`
   * 是不是分組後才取最大、已讀的列有沒有被 `where` 排掉，只有真資料庫答得出來。
   *
   * 這個值是提示音跨分頁去重的識別值：取錯成「所有列的最新」的話，
   * 一則更晚建立但已讀的列會把它釘住，於是新到的通知算出同一把鍵、
   * 被 `seenKeys` 擋下 —— 搖但不響，而且沒有任何觀測量顯示這件事。
   */
  it("summarizeUnread 的最新時間只看未讀，且跨型別取最大", async () => {
    await seed(
      NOTIFICATION_TYPE.WALLET_UPGRADE,
      "sum-todo",
      new Date(NOW_MS - 5_000),
    );
    await seed(
      NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      "sum-done",
      new Date(NOW_MS - 1_000),
    );
    const read = await seed(
      NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      "sum-read",
      new Date(NOW_MS),
    );
    await prisma.notification.update({
      where: { id: read.id },
      data: { readAt: new Date(NOW_MS) },
    });

    const summary = await notificationRepo.summarizeUnread(userId);

    // Info: (20260825 - Julian) 最新的那一列是已讀的，不能被算進來
    expect(summary.latestCreatedAt?.getTime()).toBe(NOW_MS - 1_000);
    // Info: (20260825 - Julian) 而且橫跨兩個型別分組，不是只看其中一組
    expect(summary.counts.get(NOTIFICATION_TYPE.WALLET_UPGRADE)).toBe(1);
    expect(summary.counts.get(NOTIFICATION_TYPE.ANALYSIS_COMPLETED)).toBe(1);
  });

  /**
   * Info: (20260825 - Julian) D4 的核心：待辦不會被新的事件型擠出清單，
   * 而截斷的事實說得出來。
   *
   * 精確值而非門檻（§一.6）：`limit` 傳 2 時就該是 2 則，不是「至少 1 則」。
   */
  it("兩支清單各自吃自己的型別條件與 take，並算得出 hasMore", async () => {
    await seed(
      NOTIFICATION_TYPE.WALLET_UPGRADE,
      "old-todo",
      new Date(NOW_MS - 3 * 86_400_000),
    );
    await seed(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, "d1", new Date(NOW_MS));
    await seed(
      NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      "d2",
      new Date(NOW_MS - 1),
    );
    await seed(
      NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      "d3",
      new Date(NOW_MS - 2),
    );

    const todos = await notificationRepo.listUnreadByTypes(
      userId,
      [NOTIFICATION_TYPE.WALLET_UPGRADE],
      20,
    );
    expect(todos.map((item) => item.dedupeKey)).toEqual([
      `${KEY_PREFIX}old-todo`,
    ]);

    /**
     * Info: (20260825 - Julian) 歷史那支（含已讀）也在同一份資料上驗一次。
     *
     * 兩支的差別只有「濾不濾 `readAt`」，而那個差別在假實作裡是我寫的。
     * 這裡先把 d3 標成已讀，然後同時問兩支：未讀那支要看不到它，
     * 歷史那支要看得到 —— 只驗其中一支的話，兩支寫成同一個查詢也會通過。
     */
    await prisma.notification.updateMany({
      where: { userId, dedupeKey: `${KEY_PREFIX}d3` },
      data: { readAt: new Date(NOW_MS) },
    });

    const history = await notificationRepo.listRecentExcludingTypes(
      userId,
      [NOTIFICATION_TYPE.WALLET_UPGRADE],
      20,
    );
    expect(history.items.map((item) => item.dedupeKey)).toEqual([
      `${KEY_PREFIX}d1`,
      `${KEY_PREFIX}d2`,
      `${KEY_PREFIX}d3`,
    ]);
    expect(history.hasMore).toBe(false);
    // Info: (20260825 - Julian) 待辦型仍然不混進來（型別條件是這支自己的）
    expect(
      history.items.some(
        (item) => item.type === NOTIFICATION_TYPE.WALLET_UPGRADE,
      ),
    ).toBe(false);

    const historyPage = await notificationRepo.listRecentExcludingTypes(
      userId,
      [NOTIFICATION_TYPE.WALLET_UPGRADE],
      2,
    );
    expect(historyPage.items).toHaveLength(2);
    expect(historyPage.hasMore).toBe(true);

    // Info: (20260825 - Julian) 把 d3 收回未讀，讓下面幾條斷言維持原本的前提
    await prisma.notification.updateMany({
      where: { userId, dedupeKey: `${KEY_PREFIX}d3` },
      data: { readAt: null },
    });

    const page = await notificationRepo.listUnreadExcludingTypes(
      userId,
      [NOTIFICATION_TYPE.WALLET_UPGRADE],
      2,
    );
    // Info: (20260825 - Julian) 新到舊，且待辦不混進來
    expect(page.items.map((item) => item.dedupeKey)).toEqual([
      `${KEY_PREFIX}d1`,
      `${KEY_PREFIX}d2`,
    ]);
    expect(page.hasMore).toBe(true);

    const wholePage = await notificationRepo.listUnreadExcludingTypes(
      userId,
      [NOTIFICATION_TYPE.WALLET_UPGRADE],
      20,
    );
    expect(wholePage.items).toHaveLength(3);
    // Info: (20260825 - Julian) 剛好取完時 hasMore 必須是 false（邊界：rows.length === limit）
    expect(wholePage.hasMore).toBe(false);
  });

  /**
   * Info: (20260825 - Julian) `distinct` 與 `readAt: null` 在真 Prisma 下的行為。
   *
   * 假實作裡這兩件事是我用 `filter` + `Set` 寫的。真的要驗的是
   * `distinct: ["userId"]` 真的存在（同一人兩則未讀不會讓他出現兩次 ——
   * 回傳是 Set 所以看不出來，但底層多撈的列是白費的）
   * 以及已讀的人真的不在裡面。
   */
  it("listUserIdsWithUnread 只回還掛著未讀的人", async () => {
    await seed(NOTIFICATION_TYPE.WALLET_UPGRADE, "pending-1", new Date(NOW_MS));
    await seed(
      NOTIFICATION_TYPE.WALLET_UPGRADE,
      "read-1",
      new Date(NOW_MS),
      otherUserId,
    );
    await notificationRepo.markReadByType(
      otherUserId,
      NOTIFICATION_TYPE.WALLET_UPGRADE,
      NOW_MS,
    );

    const pending = await notificationRepo.listUserIdsWithUnread(
      NOTIFICATION_TYPE.WALLET_UPGRADE,
      [userId, otherUserId],
    );

    expect([...pending]).toEqual([userId]);

    // Info: (20260825 - Julian) 不在名單裡的人不會被算進來（`--user` 模式的前提）
    expect(
      (
        await notificationRepo.listUserIdsWithUnread(
          NOTIFICATION_TYPE.WALLET_UPGRADE,
          [otherUserId],
        )
      ).size,
    ).toBe(0);
  });

  /**
   * Info: (20260825 - Julian) `markReadById` 的四個條件，對真資料庫各驗一次。
   *
   * 假實作裡這四個條件是我用 `Array.find` 寫的；真 Prisma 的 `updateMany`
   * 是不是真的把它們全部放進 `where`，只有真資料庫答得出來。而每漏一個
   * 都是一種真實的失效：漏 `userId` 是跨租戶、漏 `readAt` 是重複點擊改寫
   * 已讀時間、漏型別條件是 D1（收掉補不回來的待辦）。
   */
  it("markReadById 只動自己的、未讀的、非待辦型的那一則", async () => {
    const mine = await seed(
      NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      "mark-mine",
      new Date(NOW_MS),
    );
    const sibling = await seed(
      NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      "mark-sibling",
      new Date(NOW_MS),
    );
    const todo = await seed(
      NOTIFICATION_TYPE.WALLET_UPGRADE,
      "mark-todo",
      new Date(NOW_MS),
    );
    const theirs = await seed(
      NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      "mark-theirs",
      new Date(NOW_MS),
      otherUserId,
    );

    const excludeTodo = [NOTIFICATION_TYPE.WALLET_UPGRADE];

    // Info: (20260825 - Julian) 正例：標得到，而且只標到一列
    expect(
      await notificationRepo.markReadById(userId, mine.id, excludeTodo, NOW_MS),
    ).toBe(1);
    // Info: (20260825 - Julian) 重複標記回 0（`readAt: null` 這個條件真的在）
    expect(
      await notificationRepo.markReadById(userId, mine.id, excludeTodo, NOW_MS),
    ).toBe(0);
    // Info: (20260825 - Julian) 待辦型標不到（D1）
    expect(
      await notificationRepo.markReadById(userId, todo.id, excludeTodo, NOW_MS),
    ).toBe(0);
    // Info: (20260825 - Julian) 別人的標不到（跨租戶）
    expect(
      await notificationRepo.markReadById(
        userId,
        theirs.id,
        excludeTodo,
        NOW_MS,
      ),
    ).toBe(0);

    /**
     * Info: (20260825 - Julian) 反面：其餘三列都還是未讀。
     * 沒有這一段的話，「把整個 userId 底下都標成已讀」也會通過上面每一條。
     */
    const stillUnread = await prisma.notification.findMany({
      where: {
        id: { in: [sibling.id, todo.id, theirs.id] },
        readAt: null,
      },
      select: { id: true },
    });
    expect(stillUnread).toHaveLength(3);
  });

  /**
   * Info: (20260825 - Julian) 跨租戶：`where` 少了 `userId` 的話這條會紅。
   *
   * 檢查清單 §三.1 把「`where` 條件失效 → 列出全站資料」列為標準形狀，
   * 而假實作測不到它（那個 filter 也是我寫的）。
   */
  it("查詢與標記只影響自己那一位使用者", async () => {
    await seed(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, "mine", new Date(NOW_MS));
    await seed(
      NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      "theirs",
      new Date(NOW_MS),
      otherUserId,
    );

    const mine = await notificationRepo.listUnreadExcludingTypes(
      userId,
      [],
      20,
    );
    expect(mine.items.map((item) => item.dedupeKey)).toEqual([
      `${KEY_PREFIX}mine`,
    ]);

    /**
     * Info: (20260826 - Julian) 改以 `markReadById` 驗跨租戶。
     *
     * 原本這裡用 `markReadExcludingTypes`（整批標記），而那支隨著
     * 「全部標為已讀」端點一起移除了 —— 它自從逐則已讀上線後就沒有呼叫端。
     * 換成逐則的那一支不是將就：**它才是今天真的會被打到的路徑**，
     * 而跨租戶的 `where` 條件正是需要驗在活路徑上。
     */
    const theirRow = await prisma.notification.findFirst({
      where: { userId: otherUserId, dedupeKey: `${KEY_PREFIX}theirs` },
    });
    expect(theirRow).not.toBeNull();

    // Info: (20260826 - Julian) 拿別人的 id 來標記，必須什麼都不做
    expect(
      await notificationRepo.markReadById(
        userId,
        theirRow?.id ?? "",
        [],
        NOW_MS,
      ),
    ).toBe(0);

    // Info: (20260825 - Julian) 另一位的通知必須原封不動
    const theirs = await notificationRepo.summarizeUnread(otherUserId);
    expect(theirs.counts.get(NOTIFICATION_TYPE.ANALYSIS_COMPLETED)).toBe(1);
  });
});

/**
 * Info: (20260826 - Julian) 分頁歷史（`/user/notifications` 的來源）。
 *
 * 這三件事全部只有真 Prisma 答得出來，而假實作裡的 `skip` / `orderBy`
 * 語意會是我自己寫的（檢查清單 §一.8）：
 *
 * 1. `skip` 真的跳過前一頁，而且**沒有重複也沒有遺漏**
 * 2. `createdAt` 撞毫秒時，第二排序鍵 `id` 讓翻頁穩定
 * 3. `countHistory` 的 `where` 與 `listHistoryPage` 一致（都排除待辦型）
 */
describe("分頁歷史", () => {
  /**
   * Info: (20260826 - Julian) 五則**同一毫秒**的通知，外加一則待辦型。
   *
   * 刻意全部同時間：單以 `createdAt` 排序時，Postgres 對相同值的排列
   * 不保證跨查詢穩定 —— 那正是「翻頁時某一則出現兩次、另一則從未出現」
   * 的成因，而它只在資料撞毫秒時發作。這裡讓它必然發生。
   */
  const SAME_MS = new Date(NOW_MS);

  it("翻完所有頁 = 每一則恰好出現一次", async () => {
    for (let index = 0; index < 5; index += 1) {
      await seed(
        NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
        `page-${index}`,
        SAME_MS,
      );
    }
    // Info: (20260826 - Julian) 待辦型也放一則：它必須不出現在歷史裡
    await seed(NOTIFICATION_TYPE.WALLET_UPGRADE, "page-todo", SAME_MS);

    const total = await notificationRepo.countHistory(userId, [
      NOTIFICATION_TYPE.WALLET_UPGRADE,
    ]);
    expect(total).toBe(5);

    const collected: string[] = [];
    for (let page = 0; page < 3; page += 1) {
      const rows = await notificationRepo.listHistoryPage(
        userId,
        [NOTIFICATION_TYPE.WALLET_UPGRADE],
        page * 2,
        2,
      );
      collected.push(...rows.map((row) => row.dedupeKey ?? ""));
    }

    /**
     * Info: (20260826 - Julian) 比對**集合**而不是筆數。
     *
     * `toHaveLength(5)` 在「第 3 則出現兩次、第 4 則從未出現」時照樣是綠的 ——
     * 而那正是要抓的缺陷（檢查清單：斷言要對得上失效的形狀）。
     */
    expect(collected.sort()).toEqual(
      [0, 1, 2, 3, 4].map((index) => `${KEY_PREFIX}page-${index}`).sort(),
    );
  });

  it("countHistory 與 listHistoryPage 用同一組排除條件", async () => {
    await seed(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, "count-done", SAME_MS);
    await seed(NOTIFICATION_TYPE.ANALYSIS_FAILED, "count-failed", SAME_MS);
    await seed(NOTIFICATION_TYPE.WALLET_UPGRADE, "count-todo", SAME_MS);

    const excluded = [NOTIFICATION_TYPE.WALLET_UPGRADE];
    const total = await notificationRepo.countHistory(userId, excluded);
    const rows = await notificationRepo.listHistoryPage(
      userId,
      excluded,
      0,
      100,
    );

    /**
     * Info: (20260826 - Julian) 兩支的 `where` 分岔時，頁數會指向一頁空清單 ——
     * 而那在畫面上看起來像「通知不見了」。
     */
    expect(rows).toHaveLength(total);
    expect(total).toBe(2);
  });

  it("已讀的歷史照樣算進去（歷史不是未讀清單）", async () => {
    const row = await seed(
      NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      "read-history",
      SAME_MS,
    );
    expect(
      await notificationRepo.markReadById(userId, row.id, [], NOW_MS),
    ).toBe(1);

    expect(await notificationRepo.countHistory(userId, [])).toBe(1);
    const rows = await notificationRepo.listHistoryPage(userId, [], 0, 10);
    expect(rows[0]?.readAt).not.toBeNull();
  });

  it("只看得到自己的歷史", async () => {
    await seed(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, "iso-mine", SAME_MS);
    await seed(
      NOTIFICATION_TYPE.ANALYSIS_COMPLETED,
      "iso-theirs",
      SAME_MS,
      otherUserId,
    );

    expect(await notificationRepo.countHistory(userId, [])).toBe(1);
    const rows = await notificationRepo.listHistoryPage(userId, [], 0, 10);
    expect(rows.map((r) => r.dedupeKey)).toEqual([`${KEY_PREFIX}iso-mine`]);
  });
});
