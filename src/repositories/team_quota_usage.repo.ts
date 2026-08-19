import { prisma } from "@/lib/prisma";
import { Prisma, TeamQuotaUsage } from "@/generated";

/**
 * Info: (20260807 - Luphia) 訂閱額度用量 Repository（設計書 §4 / §5）。
 * 用量以固定視窗 key 聚合（DB SUM 為準，多實例一致）；
 * 冪等由 idempotencyKey @unique 保證，重試命中 P2002 時回傳既有列。
 */

export interface IWindowUsageSum {
  used5h: bigint;
  usedWeek: bigint;
}

export interface ICreateUsageResult {
  created: boolean;
  usage: TeamQuotaUsage;
}

export interface ICreateUsageInput {
  teamId: string;
  userId: string;
  featureCode: string;
  amount: bigint;
  windowKey5h: number;
  windowKeyWeek: number;
  idempotencyKey: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export class TeamQuotaUsageRepository {
  /**
   * Info: (20260815 - Luphia) 以 advisory lock 序列化同一成員的額度讀寫（PR #6652 第二輪 C-6）。
   *
   * 「先 SUM 再寫入」中間沒有任何互斥：併發的 N 個請求會讀到同一個 used，
   * 各自判斷「還有額度」，然後各寫一筆——超額幅度是 **併發數 × 單筆**，
   * 而 §5.1 容許的是「最後一筆超額」，指的是一筆。
   *
   * 用 Postgres 的交易級 advisory lock（`pg_advisory_xact_lock`）而非資料列鎖：
   * 要鎖的是「這個成員在這個視窗的用量總和」，那不是任何一列，沒有列可以鎖。
   * 鎖在交易結束時自動釋放，不需要善後，也不會因為程式提早 return 而外洩。
   *
   * 鎖的粒度是 (teamId, userId)：不同成員互不阻塞，而同一成員的併發請求本來就
   * 只有一個能贏——這正是我們要的。
   */
  async withMemberQuotaLock<T>(
    teamId: string,
    userId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      /**
       * Info: (20260815 - Luphia) hashtext 把字串壓成 int4，兩層 hash 湊成 lock 的 (int, int)。
       * 碰撞的後果只是「兩個不相干的成員偶爾互相等一下」，不影響正確性。
       */
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${teamId}), hashtext(${userId}))`;
      return operation(tx);
    });
  }

  /**
   * Info: (20260819 - Luphia) 免費方案改為**全隊共用一份額度**（產品決定 20260819）。
   *
   * 額度一人一池的理由是「席次費買到的就是這個人自己的額度」（設計書 §5.4.2）。
   * 免費方案沒有席次費，一人一池因此沒有對價依據——而它正是「20 人的免費團隊
   * ＝每週 800 點的模型用量、月費零」這個洞的來源。改為全隊共用之後，
   * 加人不再產生額度，免費版的人數上限也就不需要存在。
   *
   * 鎖的粒度必須跟著換成**團隊**：兩位成員各自持有自己的鎖時，會同時讀到同一個
   * used、各自判斷「還有額度」、各寫一筆——超額幅度變成併發數 × 單筆，
   * 而設計書 §5.1 容許的是「最後一筆超額」，指的是一筆。
   *
   * 第二個 hash 參數固定為 teamId（而不是 userId），因此同一團隊的所有成員
   * 共用同一把鎖。付費方案仍走 `withMemberQuotaLock`，成員之間互不阻塞。
   *
   * ⚠️ 方案在視窗中途變更（升級生效、訂閱到期）時，同一團隊可能同時存在
   * 「持團隊鎖」與「持成員鎖」的請求，那個瞬間最壞情況是一筆超額——
   * 與 §5.1 已經容忍的「最後一筆超額」同級，刻意不為它加第二把鎖。
   */
  async withTeamQuotaLock<T>(
    teamId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${teamId}), hashtext(${teamId}))`;
      return operation(tx);
    });
  }

  /**
   * Info: (20260819 - Luphia) 交易內的**全隊**用量聚合（免費方案的共用額度）。
   *
   * 與 `sumTeamWindowUsage` 同一套條件，差別只在它跑在交易內——鎖與讀取必須在
   * 同一個交易裡，否則鎖等於沒鎖（與 `sumWindowUsageInTx` 同一個理由）。
   */
  async sumTeamWindowUsageInTx(
    tx: Prisma.TransactionClient,
    teamId: string,
    windowKey5h: number,
    windowKeyWeek: number,
  ): Promise<IWindowUsageSum> {
    const [sum5h, sumWeek] = await Promise.all([
      tx.teamQuotaUsage.aggregate({
        where: { teamId, windowKey5h },
        _sum: { amount: true },
      }),
      tx.teamQuotaUsage.aggregate({
        where: { teamId, windowKeyWeek },
        _sum: { amount: true },
      }),
    ]);
    return {
      used5h: sum5h._sum.amount ?? BigInt(0),
      usedWeek: sumWeek._sum.amount ?? BigInt(0),
    };
  }

  /**
   * Info: (20260815 - Luphia) 交易內的用量聚合，與 `sumWindowUsage` 同一套條件。
   * 供 `withMemberQuotaLock` 內使用——鎖與讀取必須在同一個交易裡，否則鎖等於沒鎖。
   */
  async sumWindowUsageInTx(
    tx: Prisma.TransactionClient,
    teamId: string,
    userId: string,
    windowKey5h: number,
    windowKeyWeek: number,
  ): Promise<IWindowUsageSum> {
    const [sum5h, sumWeek] = await Promise.all([
      tx.teamQuotaUsage.aggregate({
        where: { teamId, userId, windowKey5h },
        _sum: { amount: true },
      }),
      tx.teamQuotaUsage.aggregate({
        where: { teamId, userId, windowKeyWeek },
        _sum: { amount: true },
      }),
    ]);
    return {
      used5h: sum5h._sum.amount ?? BigInt(0),
      usedWeek: sumWeek._sum.amount ?? BigInt(0),
    };
  }

  // Info: (20260815 - Luphia) 交易內的用量寫入，與 createUsage 同語意（冪等由 unique 保證）
  async createUsageInTx(
    tx: Prisma.TransactionClient,
    input: ICreateUsageInput,
  ): Promise<void> {
    try {
      await tx.teamQuotaUsage.create({ data: input });
    } catch (error) {
      // Info: (20260815 - Luphia) 冪等重放：同一把鍵已入帳，視為成功
      if (!isUniqueConstraintError(error)) throw error;
    }
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<TeamQuotaUsage | null> {
    return prisma.teamQuotaUsage.findUnique({ where: { idempotencyKey } });
  }

  /**
   * Info: (20260814 - Luphia) 額度視窗用量**逐成員**聚合（產品拍板 20260814）。
   *
   * 原本只以 teamId 聚合，等於全隊共用一池、先用先得——一個人可以在一個視窗內
   * 把整隊的額度用光，其他人直到重置前一律 402。改為一人一池後，
   * 席次費買到的就是「這個人的額度」，價格隨人數增加、額度也隨之增加，
   * 每點成本不再隨團隊規模惡化。
   */
  async sumWindowUsage(
    teamId: string,
    userId: string,
    windowKey5h: number,
    windowKeyWeek: number,
  ): Promise<IWindowUsageSum> {
    const [sum5h, sumWeek] = await Promise.all([
      prisma.teamQuotaUsage.aggregate({
        where: { teamId, userId, windowKey5h },
        _sum: { amount: true },
      }),
      prisma.teamQuotaUsage.aggregate({
        where: { teamId, userId, windowKeyWeek },
        _sum: { amount: true },
      }),
    ]);
    return {
      used5h: sum5h._sum.amount ?? BigInt(0),
      usedWeek: sumWeek._sum.amount ?? BigInt(0),
    };
  }

  /**
   * Info: (20260817 - Luphia) 全隊用量合計（PR #6652 第二輪 C-1）。
   *
   * 額度改成一人一池之後，`src` 裡就沒有任何 team-wide 的讀取路徑了：
   * 五席團隊的 OWNER 每月付 4,200，畫面上卻只看得到**他自己**的進度條，
   * 而其他四人用掉多少，系統中不存在任何介面說得出來。
   *
   * **只回合計，不回逐人明細**（產品決定 20260817）。成員各自用了多少 AI，
   * 是相當個人的資料；付費者需要知道的是「這個團隊消耗了多少」，
   * 那個問題用一個總和就回答得了。
   */
  async sumTeamWindowUsage(
    teamId: string,
    windowKey5h: number,
    windowKeyWeek: number,
  ): Promise<IWindowUsageSum> {
    const [sum5h, sumWeek] = await Promise.all([
      prisma.teamQuotaUsage.aggregate({
        where: { teamId, windowKey5h },
        _sum: { amount: true },
      }),
      prisma.teamQuotaUsage.aggregate({
        where: { teamId, windowKeyWeek },
        _sum: { amount: true },
      }),
    ]);
    return {
      used5h: sum5h._sum.amount ?? BigInt(0),
      usedWeek: sumWeek._sum.amount ?? BigInt(0),
    };
  }

  /**
   * Info: (20260807 - Luphia) 寫入一筆用量（消耗為正、退款為負）。
   * 冪等：同 idempotencyKey 重試回傳既有列並標記 created = false，不重複扣額度。
   */
  async createUsage(input: ICreateUsageInput): Promise<ICreateUsageResult> {
    try {
      const usage = await prisma.teamQuotaUsage.create({ data: input });
      return { created: true, usage };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existing = await prisma.teamQuotaUsage.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
        });
        if (existing) return { created: false, usage: existing };
      }
      throw error;
    }
  }
}

export const teamQuotaUsageRepo = new TeamQuotaUsageRepository();
