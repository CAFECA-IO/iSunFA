import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
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
 * Info: (20260825 - Julian) 每一則測試資料都帶這個前綴，清理時只刪自己的。
 * 不用 `deleteMany({ where: { userId } })` 就好的原因：那也對，但兩位使用者
 * 各自的通知都要清，而以 dedupeKey 前綴刪更能表達「這些是我建的」。
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

    await prisma.notification.deleteMany({
      where: { id: { in: [a?.id ?? "", b?.id ?? ""] } },
    });
  });

  /**
   * Info: (20260825 - Julian) D1 的核心：`notIn` 真的排除待辦型。
   *
   * 斷言成對：事件型真的被標記（證明有做事）**且**待辦型還在
   * （證明沒做過頭）。只驗後者的話，「一律不標記」也會通過。
   */
  it("markReadExcludingTypes 不動待辦型", async () => {
    await seed(NOTIFICATION_TYPE.WALLET_UPGRADE, "todo", new Date(NOW_MS));
    await seed(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, "done", new Date(NOW_MS));

    const marked = await notificationRepo.markReadExcludingTypes(
      userId,
      [NOTIFICATION_TYPE.WALLET_UPGRADE],
      NOW_MS,
    );

    expect(marked).toBe(1);
    const counts = await notificationRepo.countUnreadByType(userId);
    expect(counts.get(NOTIFICATION_TYPE.WALLET_UPGRADE)).toBe(1);
    expect(counts.get(NOTIFICATION_TYPE.ANALYSIS_COMPLETED)).toBeUndefined();

    // Info: (20260825 - Julian) 待辦型的關閉路徑：指名收掉
    expect(
      await notificationRepo.markReadByType(
        userId,
        NOTIFICATION_TYPE.WALLET_UPGRADE,
        NOW_MS,
      ),
    ).toBe(1);
    expect((await notificationRepo.countUnreadByType(userId)).size).toBe(0);
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

    await notificationRepo.markReadExcludingTypes(userId, [], NOW_MS);
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

    expect(
      await notificationRepo.markReadExcludingTypes(userId, [], NOW_MS),
    ).toBe(1);

    // Info: (20260825 - Julian) 另一位的通知必須原封不動
    const theirs = await notificationRepo.countUnreadByType(otherUserId);
    expect(theirs.get(NOTIFICATION_TYPE.ANALYSIS_COMPLETED)).toBe(1);
  });
});
