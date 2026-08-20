import { Prisma } from "@/generated";
import { LeaveLedgerEntryType } from "@/constants/leave_policy";
import { allocateConsumption } from "@/lib/leave_entitlement_rules";
import { IConsumableGrant } from "@/interfaces/leave_entitlement";

/**
 * Info: (20260817 - Julian) 額度帳本的寫入原語。
 *
 * ## 為什麼抽出來
 *
 * 扣帳發生在假單核准（`leave_request.repo`），回補發生在銷假
 * （`leave.repo`）—— 兩個檔案，同一本帳。各寫一份的話，
 * 「餘額怎麼算」「冪等鍵怎麼組」「`grantBalanceAfterMinutes` 怎麼填」
 * 會有兩份實作，而它們遲早會在某個邊界上不一致 ——
 * 那種不一致的症狀是帳對不起來，而查起來要跑遍兩條路徑。
 *
 * 這裡全部收 `tx`，不自己開交易：帳本異動必須與它的來源單據同生共死
 * （ADR 022 §4 的第一條規矩），開交易是呼叫端的責任。
 *
 * ## 為什麼以「日」為單位而不是以「單」
 *
 * 第一版按整張假單扣帳（`consume:<requestId>:<grantId>`，不帶 `leaveDayId`）。
 * 那在扣的時候沒問題，**在銷假的時候就回不去了** —— 銷假是逐日的
 * （`LeaveRecall` 掛在 `LeaveDay` 上），而按單彙總之後，
 * 沒有任何資訊能算出「8/14 那一天用掉了哪幾批的多少分鐘」。
 *
 * schema 本來就是這樣設計的（`LeaveLedgerEntry.leaveDayId` 的註解寫著
 * 「CONSUME / RESTORE 指向 LeaveDay」），是實作偏離了它。
 *
 * 逐日扣與整批扣的**總分配結果相同** —— `allocateConsumption` 是
 * 先到期先扣的貪婪演算法，依序逐日扣與一次扣總和會落在同一組批次上。
 * 差別只在帳本留下的粒度，而那個粒度正是銷假需要的。
 */

/**
 * Info: (20260819 - Julian) 「哪些批次可以扣」的**唯一**定義（review B4）。
 *
 * ## 為什麼要抽出來
 *
 * 先前有兩個答案：試算與送出前置檢查（`findConsumableGrants`）帶
 * `expiresOn >= asOfDate` 並濾掉餘額為 0 的批次；而交易內實際扣減的
 * `readGrantBalances` **兩個條件都沒有**。`allocateConsumption` 依 `expiresOn`
 * 由早至晚排序，於是**已過期的批次會排在最前面被優先扣光**。
 *
 * 這不是邊界情形而是穩定狀態：寫 `EXPIRE` 分錄的每日 Worker 還不存在
 * （`leave_balance.service.ts` 的 ToDo），因此過期批次會永久帶著正的餘額。
 * 症狀是「試算說扣本年度、帳本扣的是去年已過期那批」—— 畫面與帳本各說各話，
 * 而 §38 IV 對過期額度應折現的處置被靜默吃掉。
 *
 * checklist §2.1：同一個問題只能有一個判斷點。這裡就是那個點。
 */
export const consumableGrantWhere = (params: {
  accountBookId: string;
  employeeId: string;
  leavePolicyId: string;
  /** Info: (20260819 - Julian) 以哪一天為準判斷「還沒過期」。必填，見下方的 fail fast */
  asOfDate: string;
}): Prisma.LeaveGrantWhereInput => {
  /**
   * Info: (20260819 - Julian) 空字串會讓 `expiresOn: { gte: "" }` 比對到
   * 每一列 —— 到期過濾靜默失效，而查詢仍然「成功」。這種形狀不能放行。
   */
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.asOfDate)) {
    throw new Error(
      `consumableGrantWhere: asOfDate must be YYYY-MM-DD, got ${JSON.stringify(params.asOfDate)}`,
    );
  }

  return {
    accountBookId: params.accountBookId,
    employeeId: params.employeeId,
    leavePolicyId: params.leavePolicyId,
    expiresOn: { gte: params.asOfDate },
  };
};

/**
 * Info: (20260819 - Julian) 依上面那組條件讀出逐批餘額，濾掉沒有餘額的批次。
 *
 * `client` 收 `Prisma.TransactionClient` 或 `PrismaClient` —— 交易內的實際扣減
 * 與交易外的試算走的是**同一支**，這樣「試算說會扣哪幾批」與「實際扣了哪幾批」
 * 才不會有第二種答案（checklist §1.10：驗收與產品要讀同一支實作）。
 */
export const readConsumableGrants = async (
  client: Prisma.TransactionClient,
  params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    asOfDate: string;
  },
): Promise<IConsumableGrant[]> => {
  const grants = await client.leaveGrant.findMany({
    where: consumableGrantWhere(params),
    select: { id: true, expiresOn: true, createdAt: true },
  });
  if (grants.length === 0) return [];

  const sums = await client.leaveLedgerEntry.groupBy({
    by: ["leaveGrantId"],
    where: { leaveGrantId: { in: grants.map((grant) => grant.id) } },
    _sum: { deltaMinutes: true },
  });
  const deltaByGrant = new Map(
    sums.map((row) => [row.leaveGrantId, row._sum.deltaMinutes ?? 0]),
  );

  return (
    grants
      .map((grant) => ({
        grantId: grant.id,
        // Info: (20260817 - Julian) GRANT 本身也是一筆正的異動，故異動總和即為餘額
        remainingMinutes: deltaByGrant.get(grant.id) ?? 0,
        expiresOn: grant.expiresOn,
        createdAt: grant.createdAt.toISOString(),
      }))
      // Info: (20260819 - Julian) 餘額為 0（或被回補成負）的批次不參與 FIFO
      .filter((grant) => grant.remainingMinutes > 0)
  );
};

export interface ILeaveDayConsumption {
  leaveDayId: string;
  minutes: number;
}

/**
 * Info: (20260817 - Julian) 逐日扣帳。回傳 false 表示額度不足（不是故障）。
 *
 * `balances` 由呼叫端傳入並**在此就地遞減** —— 逐日扣必須看得到前一天
 * 扣完之後的餘額，否則同一批會被重複分配給每一天。
 */
export const writeConsumeForDays = async (
  tx: Prisma.TransactionClient,
  params: {
    balances: IConsumableGrant[];
    days: readonly ILeaveDayConsumption[];
    actorEmployeeId: string;
  },
): Promise<boolean> => {
  const running = params.balances.map((item) => ({ ...item }));

  for (const day of params.days) {
    if (day.minutes <= 0) continue;

    const allocation = allocateConsumption({
      grants: running,
      requiredMinutes: day.minutes,
    });
    if (allocation.shortfallMinutes > 0) return false;

    for (const item of allocation.allocations) {
      await tx.leaveLedgerEntry.create({
        data: {
          leaveGrantId: item.grantId,
          entryType: LeaveLedgerEntryType.CONSUME,
          deltaMinutes: -item.minutes,
          grantBalanceAfterMinutes: item.grantBalanceAfterMinutes,
          leaveDayId: day.leaveDayId,
          actorEmployeeId: params.actorEmployeeId,
          /**
           * Info: (20260817 - Julian) 冪等鍵以「日 × 批次」組成。
           * 同一天同一批只能扣一次，而重試、補償、Worker 重跑都靠它擋。
           */
          idempotencyKey: `consume:${day.leaveDayId}:${item.grantId}`,
        },
      });

      const target = running.find((grant) => grant.grantId === item.grantId);
      if (target) target.remainingMinutes = item.grantBalanceAfterMinutes;
    }
  }

  return true;
};

/**
 * Info: (20260817 - Julian) 逐日回補：把那一天的每一筆 CONSUME 原路退回。
 *
 * ## 為什麼是「照著 CONSUME 退」而不是「重新分配」
 *
 * 退回必須回到**當初扣的那幾批**。重新跑一次分配會依「先到期先扣」
 * 把額度退給另一批 —— 結果是總數對得起來，但某一批被退了它從未被扣的量，
 * 而另一批的扣減永遠留在帳上。那種錯誤在總額勾稽時完全看不出來。
 *
 * ## 回傳的是實際回補的分鐘數
 *
 * 不是「應該回補多少」。兩者在正常情況下相等，但當那一天根本沒有 CONSUME
 * （額度帳本上線前核准的舊假單、或零分鐘的日子）時，實際值是 0 ——
 * 而呼叫端要拿它去加回 `LeaveBalance`，加一個「應該」會讓快取憑空長出額度。
 */
export const writeRestoreForDay = async (
  tx: Prisma.TransactionClient,
  params: {
    leaveDayId: string;
    actorEmployeeId: string | null;
    reason: string;
  },
): Promise<number> => {
  const consumed = await tx.leaveLedgerEntry.findMany({
    where: {
      leaveDayId: params.leaveDayId,
      entryType: LeaveLedgerEntryType.CONSUME,
    },
    select: { leaveGrantId: true, deltaMinutes: true },
  });
  if (consumed.length === 0) return 0;

  /**
   * Info: (20260817 - Julian) 每一批的當前餘額要現算，不能用扣當下的
   * `grantBalanceAfterMinutes` —— 那之後可能又有別的假單扣過，
   * 沿用舊值會讓 `grantBalanceAfterMinutes` 這一欄開始說謊，
   * 而它的全部用途就是勾稽時定位斷點（同 `TeamWalletLedger.balanceAfter`）。
   */
  const sums = await tx.leaveLedgerEntry.groupBy({
    by: ["leaveGrantId"],
    where: {
      leaveGrantId: { in: consumed.map((entry) => entry.leaveGrantId) },
    },
    _sum: { deltaMinutes: true },
  });
  const balanceByGrant = new Map(
    sums.map((row) => [row.leaveGrantId, row._sum.deltaMinutes ?? 0]),
  );

  let restored = 0;
  for (const entry of consumed) {
    // Info: (20260817 - Julian) CONSUME 是負的，回補是它的相反數
    const minutes = -entry.deltaMinutes;
    if (minutes <= 0) continue;

    const balanceAfter =
      (balanceByGrant.get(entry.leaveGrantId) ?? 0) + minutes;

    await tx.leaveLedgerEntry.create({
      data: {
        leaveGrantId: entry.leaveGrantId,
        entryType: LeaveLedgerEntryType.RESTORE,
        deltaMinutes: minutes,
        grantBalanceAfterMinutes: balanceAfter,
        leaveDayId: params.leaveDayId,
        actorEmployeeId: params.actorEmployeeId,
        reason: params.reason,
        /**
         * Info: (20260817 - Julian) 一個 `LeaveDay` 只會被銷一次
         * （`recalledAt` 與 `activeKey` 同時被改），因此「日 × 批次」
         * 已足以唯一。若未來開放「銷了再請」，鍵要帶上次數。
         */
        idempotencyKey: `restore:${params.leaveDayId}:${entry.leaveGrantId}`,
      },
    });

    balanceByGrant.set(entry.leaveGrantId, balanceAfter);
    restored += minutes;
  }

  return restored;
};

/**
 * Info: (20260817 - Julian) 從帳本重算某員工某假別的餘額。
 *
 * 「異動總和」即餘額 —— `GRANT` 是正的、`CONSUME` 是負的，
 * 所以不需要另外記「授予了多少」。這也是 `readGrantBalances` 的作法，
 * 兩邊必須一致，否則勾稽會把自己的算法差異報成資料錯誤。
 */
export const sumLedgerMinutes = async (
  tx: Prisma.TransactionClient,
  params: { accountBookId: string; employeeId: string; leavePolicyId: string },
): Promise<number> => {
  const grants = await tx.leaveGrant.findMany({
    where: {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      leavePolicyId: params.leavePolicyId,
    },
    select: { id: true },
  });
  if (grants.length === 0) return 0;

  const sum = await tx.leaveLedgerEntry.aggregate({
    where: { leaveGrantId: { in: grants.map((grant) => grant.id) } },
    _sum: { deltaMinutes: true },
  });
  return sum._sum.deltaMinutes ?? 0;
};

/**
 * Info: (20260817 - Julian) 餘額快取寫回。**upsert 而非 update**：
 * 第一次授予時那一列還不存在，而 `updateMany` 在沒有列時是安靜的成功
 * （`count === 0` 不是錯誤）—— 那會讓第一批額度授予完成、餘額卻仍是零，
 * 而扣減端的附條件更新會把它讀成「額度不足」。
 */
export const writeBalance = async (
  tx: Prisma.TransactionClient,
  params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    remainingMinutes: number;
    reconciledAt?: Date | null;
  },
): Promise<void> => {
  await tx.leaveBalance.upsert({
    where: {
      employeeId_leavePolicyId: {
        employeeId: params.employeeId,
        leavePolicyId: params.leavePolicyId,
      },
    },
    create: {
      accountBookId: params.accountBookId,
      employeeId: params.employeeId,
      leavePolicyId: params.leavePolicyId,
      remainingMinutes: params.remainingMinutes,
      reconciledAt: params.reconciledAt ?? null,
    },
    update: {
      remainingMinutes: params.remainingMinutes,
      ...(params.reconciledAt ? { reconciledAt: params.reconciledAt } : {}),
    },
  });
};

/**
 * Info: (20260820 - Julian) 從帳本重建餘額快取的**本體**（ADR 022 §4 第二條規矩）。
 *
 * ## 為什麼收 `tx` 而不是自己開交易（review 第 5 條）
 *
 * 原本整段只存在於 `leave_grant.repo.ts` 的 `rebuildBalance` 裡，而那一支
 * 第一行就是 `prisma.$transaction` —— 於是紅線測試餵不進替身，只能在測試檔裡
 * **手抄一份同樣的兩行**。結果是：測試驗的是它自己抄的那一份，
 * 產品那一支全 repo 零呼叫端（勾稽 Worker 還沒寫），改壞了不會有任何測試變紅。
 * 那正是 checklist §1.10 說的「驗收與產品要讀同一支實作」。
 *
 * 分工與這個檔案的其餘函式一致：本體收 `tx`、交易由呼叫端開。
 */
export const rebuildBalanceWithin = async (
  tx: Prisma.TransactionClient,
  params: {
    accountBookId: string;
    employeeId: string;
    leavePolicyId: string;
    reconciledAt: Date;
  },
): Promise<number> => {
  const remainingMinutes = await sumLedgerMinutes(tx, params);
  await writeBalance(tx, {
    ...params,
    remainingMinutes,
    reconciledAt: params.reconciledAt,
  });
  return remainingMinutes;
};
