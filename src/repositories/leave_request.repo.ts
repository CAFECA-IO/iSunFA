import { prisma } from "@/lib/prisma";
import { WorkDayType } from "@/constants/attendance";
import { LeaveRequestStatus } from "@/constants/leave";
import { LeaveApprovalStepStatus } from "@/constants/leave_policy";
import {
  readConsumableGrants,
  writeConsumeForDays,
} from "@/repositories/leave_ledger";
import { activeKeyOf } from "@/repositories/leave.repo";
import { assertSchedulableDay } from "@/repositories/attendance_schedule_invariant";
import { assertStorablePii } from "@/repositories/hr_pii_invariant";
import { HrPiiTable } from "@/constants/hr_pii";
import { LEAVE_ENTITLEMENT_ENGINE_VERSION } from "@/lib/leave_entitlement_rules";
import {
  ILeaveApprovalStepRecord,
  ILeaveRequestDetailRow,
  ILeaveRequestRecord,
  ILeaveRequestRepository,
  ILeaveRequestSummary,
  LeaveApprovalOutcome,
} from "@/interfaces/leave_request";

/**
 * Info: (20260817 - Julian) 假單的送出與簽核（唯一碰 Prisma 的一層）。
 *
 * ## 三個方法都是 unit-of-work
 *
 * 送出要一次寫三張表（假單、逐日、簽核鏈快照），最後一關通過要一次寫五張
 * （簽核節點、假單狀態、額度帳本、餘額快取、排班投影）。少任一步就會留下
 * 永久說謊的中間狀態，而原子性只有 DB 給得起 —— 把 `$transaction` 拉到
 * service 會違反優先度更高的「只有 Repository 能碰 Prisma」。
 * 判準與理由同 `leave.repo.ts` 的 `resolveRecall`（見 attendance_demo_plan.md §7.4）。
 *
 * ## 狀態轉移一律用附條件的 `updateMany`
 *
 * `count === 0` 就是輸給另一個分頁或另一張單。不能先查再寫：兩個請求會同時
 * 看到 PENDING，一個核准一個駁回，最後狀態是 REJECTED 但額度已經被扣掉。
 *
 * ## 分配在交易內重算
 *
 * service 傳進來的只有總量。它在送出前也算過一次分配，但那一份在另一張單
 * 先扣走之後就是舊的 —— 寫進帳本的 `grantBalanceAfterMinutes` 會因此對不上，
 * 而那正是每日勾稽要抓的東西，不該由我們自己製造（ADR 022 §2.3）。
 */

const STEP_SELECT = {
  id: true,
  order: true,
  nodeKind: true,
  approverEmployeeId: true,
  approverEmployeeNo: true,
  approverName: true,
  status: true,
  pendingKey: true,
} as const;

const REQUEST_INCLUDE = {
  days: { select: { id: true, workDate: true, minutes: true } },
  approvalSteps: { select: STEP_SELECT, orderBy: { order: "asc" } },
} as const;

/**
 * Info: (20260817 - Julian) 明細所需的關聯（L12）。
 *
 * 比 `REQUEST_INCLUDE` 多帶職稱、合併節點、決行時間與意見，以及密文三件套。
 * 分開一份而不是把欄位加進去：`REQUEST_INCLUDE` 是每一次核准都會撈的，
 * 而明細一次只撈一張單 —— 兩者的成本模型完全不同。
 */
const DETAIL_INCLUDE = {
  days: {
    select: {
      workDate: true,
      segment: true,
      startMinute: true,
      endMinute: true,
      minutes: true,
      dayEquivalentMinutes: true,
      recalledAt: true,
    },
    orderBy: { workDate: "asc" },
  },
  approvalSteps: {
    select: {
      order: true,
      nodeKind: true,
      approverEmployeeId: true,
      approverEmployeeNo: true,
      approverName: true,
      approverJobTitle: true,
      status: true,
      mergedFromKinds: true,
      escalatedReason: true,
      decidedAt: true,
      comment: true,
      pendingKey: true,
    },
    orderBy: { order: "asc" },
  },
} as const;

/**
 * Info: (20260817 - Julian) 清單所需的關聯。比 `REQUEST_INCLUDE` 多帶員工與假別的顯示欄位，
 * 少帶逐日明細以外的東西 —— 清單一次回幾十列，帶不必要的關聯會讓它變成 N+1 的溫床。
 */
const SUMMARY_INCLUDE = {
  employee: { select: { employeeNo: true, name: true } },
  leavePolicy: { select: { code: true, name: true } },
  days: { select: { workDate: true }, orderBy: { workDate: "asc" } },
  approvalSteps: {
    select: { order: true, approverName: true, pendingKey: true },
    orderBy: { order: "asc" },
  },
} as const;

/**
 * Info: (20260817 - Julian) 逐批餘額 = 授予分鐘 + Σ(該批的異動)。
 *
 * 不另存 `LeaveGrant.remainingMinutes`：那會是第三份真相（帳本、餘額快取、批次餘額），
 * 而 ADR 022 §2.3 只授權了兩份。
 *
 * ToDo: (20260817 - Julian) 帳本列數成長後這個 groupBy 會變慢。屆時的解法是
 * 為 `LeaveGrant` 加一個**遵守同樣三規矩**的 `remainingMinutes` 快取
 * （同交易更新、可重建、每日勾稽），而不是把它變成一個沒有勾稽的欄位。
 */

/**
 * Info: (20260819 - Julian) 交易內判定「額度被別人先扣走」的哨兵（review B4）。
 *
 * ## 為什麼是 throw 而不是 return
 *
 * `prisma.$transaction(async (tx) => ...)` 的語意是：**callback 正常回傳就 commit**，
 * 只有丟例外才回捲。先前這裡是 `return LeaveApprovalOutcome.BALANCE_RACE`，
 * 而它上面已經把 `LeaveRequest.status` 改成 `APPROVED`、把簽核節點結案了 ——
 * 那些寫入會**跟著 commit**。結果是一張標著已核准、卻一分鐘都沒扣帳的假單，
 * 而使用者只看到一句「額度剛被扣走」。
 *
 * 檔案裡原本的註解寫著「中途 return BALANCE_RACE 時交易會整個回捲」——
 * 那句話對 Prisma 的互動式交易不成立，這個哨兵是為了讓它成立。
 */
class BalanceRaceError extends Error {
  constructor() {
    super("leave balance was consumed by a concurrent approval");
    this.name = "BalanceRaceError";
  }
}

export class LeaveRequestRepository implements ILeaveRequestRepository {
  public async findById(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<ILeaveRequestRecord | null> {
    const found = await prisma.leaveRequest.findFirst({
      where: { id: params.requestId, accountBookId: params.accountBookId },
      include: REQUEST_INCLUDE,
    });
    return found === null ? null : toRecord(found);
  }

  public async findSummaryById(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<ILeaveRequestSummary | null> {
    const found = await prisma.leaveRequest.findFirst({
      where: { id: params.requestId, accountBookId: params.accountBookId },
      include: SUMMARY_INCLUDE,
    });
    return found === null ? null : toSummary(found);
  }

  /**
   * Info: (20260817 - Julian) 依員工列出假單。
   *
   * `from` / `to` 篩的是**逐日**而不是假單的建立時間：使用者問的是
   * 「八月我請了哪些假」，而一張跨月的假單在兩個月都應該出現。
   *
   * **可見範圍不在這裡判**。授權是 service 的事 —— 把它寫進查詢條件，
   * 就會有一天有人寫出一個「忘了帶那個條件」的新查詢，而那種漏洞
   * 在 code review 時看起來只是少了一行。
   */
  public async listByEmployee(params: {
    accountBookId: string;
    employeeId: string;
    from?: string;
    to?: string;
  }): Promise<ILeaveRequestSummary[]> {
    const rows = await prisma.leaveRequest.findMany({
      where: {
        accountBookId: params.accountBookId,
        employeeId: params.employeeId,
        ...(params.from !== undefined || params.to !== undefined
          ? {
              days: {
                some: {
                  workDate: {
                    ...(params.from !== undefined ? { gte: params.from } : {}),
                    ...(params.to !== undefined ? { lte: params.to } : {}),
                  },
                },
              },
            }
          : {}),
      },
      include: SUMMARY_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toSummary);
  }

  /**
   * Info: (20260817 - Julian) 待我簽核：`pendingKey` 非 null 且簽核者是我。
   *
   * 用 `pendingKey` 而不是 `status = PENDING`：後者會把排在第二關、
   * 尚未輪到的節點也撈進來 —— 那個人會去簽一張還沒輪到他的單，
   * 然後收到一個他看不懂的 403。`pendingKey` 有唯一約束保護，
   * 是「當前待簽」這件事唯一可信的來源。
   */
  public async listPendingForApprover(params: {
    accountBookId: string;
    approverEmployeeId: string;
  }): Promise<ILeaveRequestSummary[]> {
    const rows = await prisma.leaveRequest.findMany({
      where: {
        accountBookId: params.accountBookId,
        approvalSteps: {
          some: {
            approverEmployeeId: params.approverEmployeeId,
            pendingKey: { not: null },
          },
        },
      },
      include: SUMMARY_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toSummary);
  }

  /**
   * Info: (20260817 - Julian) 送出：假單 + 逐日 + 簽核鏈快照，一個交易。
   *
   * `LeaveDay.activeKey` 此時**留空** —— 它的語意是「生效中」，而待簽的假單
   * 尚未生效。兩張待簽的假單可以涵蓋同一天，衝突要到核准時才成立
   * （對應 service 端「不預扣」的設計）。
   *
   * `id` 由**呼叫端**產生並連同密文一起傳進來，不是在這裡 `randomUUID()`：
   * `reasonCipher` 的 AAD 綁定 `LeaveRequest:{id}:reasonCipher:{keyVersion}`，
   * 加密必須在 insert 之前完成，而加密發生在 service
   * （與 `attendance_punch.service` 對 `latitudeCipher` 的處置相同，ADR 018 §3）。
   *
   * Info: (20260817 - Julian) 第一版在這裡寫 `reason: params.reason` —— 明文，
   * 而且欄位在 ADR 018 之後已經不存在了。上面那段註解當時就寫著 AAD 怎麼綁，
   * **但沒有任何一行實作它**。與 `completeApproval` 漏掉 `assertSchedulableDay`
   * 是同一種錯：把「為什麼要這樣做」寫下來，然後沒有做。
   */
  /**
   * Info: (20260817 - Julian) L12 明細的原始列，**含密文**。
   *
   * 解密不在這一層：repository 不做業務判斷，而「這個人有沒有權看事由」
   * 正是一個業務判斷。這裡只負責把密文與它的代次一起交出去 ——
   * 兩者必須成對（`assertStorablePii` 在寫入端守的是同一件事）。
   */
  public async findDetailById(params: {
    accountBookId: string;
    requestId: string;
  }): Promise<ILeaveRequestDetailRow | null> {
    return prisma.leaveRequest.findFirst({
      where: { id: params.requestId, accountBookId: params.accountBookId },
      select: {
        id: true,
        employeeId: true,
        reasonCipher: true,
        piiKeyVersion: true,
        concurrencyWarned: true,
        ...DETAIL_INCLUDE,
      },
    });
  }

  public async createWithChain(
    params: Parameters<ILeaveRequestRepository["createWithChain"]>[0],
  ): Promise<ILeaveRequestRecord> {
    const requestId = params.id;

    /**
     * Info: (20260817 - Julian) repository 是唯一的 DB 閘口，因此不變式擋在這裡 ——
     * 種子腳本、資料遷移、金鑰輪替都繞不過去（`hr_pii_invariant.ts` 檔頭的理由）。
     */
    assertStorablePii(HrPiiTable.LEAVE_REQUEST, {
      ciphers: { reasonCipher: params.reasonCipher },
      keyVersion: params.piiKeyVersion,
      algorithm: params.piiAlgorithm,
    });

    const created = await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.create({
        data: {
          id: requestId,
          accountBookId: params.accountBookId,
          employeeId: params.employeeId,
          leavePolicyId: params.leavePolicyId,
          reasonCipher: params.reasonCipher,
          piiAlgorithm: params.piiAlgorithm,
          piiKeyVersion: params.piiKeyVersion,
          status: LeaveRequestStatus.PENDING,
          totalMinutes: params.totalMinutes,
          /**
           * Info: (20260819 - Julian) 已經是**精確的十進位字串**（review B5）。
           *
           * 先前這裡是 `String(params.totalDays)`，而 `params.totalDays` 是由
           * `Σ 分鐘/日約當` 用 double 累加出來的 number —— `String()` 讓
           * `[Database Boundary Guard]` 看不到它是 number，但洗掉的是一個
           * 已經算壞的值（`2.9999999999999996`）。CLAUDE.md §2 要的是運算用
           * 精確型別，不是把算壞的 double 轉成字串再存。
           * 現在由 `exactDaysToDecimalString()` 在 service 端算好傳進來。
           */
          totalDays: params.totalDays,
          concurrencyWarned: params.concurrencyWarned,
          days: {
            create: params.days.map((day) => ({
              workDate: day.workDate,
              segment: day.segment,
              startMinute: day.startMinute,
              endMinute: day.endMinute,
              minutes: day.minutes,
              dayEquivalentMinutes: day.dayEquivalentMinutes,
              // Info: (20260817 - Julian) 固化數值就要固化它的依據（接線守則 §3.1）
              entitlementEngineVersion: LEAVE_ENTITLEMENT_ENGINE_VERSION,
            })),
          },
          approvalSteps: {
            create: params.steps.map((step) => ({
              order: step.order,
              nodeKind: step.nodeKind,
              approverEmployeeId: step.approver.employeeId,
              approverEmployeeNo: step.approver.employeeNo,
              approverName: step.approver.name,
              approverJobTitle: step.approver.jobTitle,
              mergedFromKinds: step.mergedFromKinds,
              escalatedReason: step.escalatedReason,
              status: LeaveApprovalStepStatus.PENDING,
              // Info: (20260817 - Julian) 只有第一關是「當前待簽」，其餘留 null（partial unique）
              pendingKey: step.order === 0 ? requestId : null,
            })),
          },
        },
      });

      return tx.leaveRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: REQUEST_INCLUDE,
      });
    });

    return toRecord(created);
  }

  /**
   * Info: (20260817 - Julian) 中間節點通過：本關結案、把「當前待簽」交給下一關。
   *
   * `pendingKey` 的交棒必須在同一個交易內：中間若斷開，這張單會變成
   * 一張所有節點都不是待簽的假單 —— 沒有人會在待辦清單裡看到它，
   * 而它在申請人眼中仍然是「簽核中」。
   */
  public async advanceStep(
    params: Parameters<ILeaveRequestRepository["advanceStep"]>[0],
  ): Promise<LeaveApprovalOutcome> {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.leaveApprovalStep.updateMany({
        where: {
          id: params.stepId,
          status: LeaveApprovalStepStatus.PENDING,
          pendingKey: { not: null },
        },
        data: {
          status: LeaveApprovalStepStatus.APPROVED,
          decidedAt: params.decidedAt,
          comment: params.comment ?? null,
          pendingKey: null,
        },
      });
      if (claimed.count === 0) return LeaveApprovalOutcome.ALREADY_REVIEWED;

      const current = await tx.leaveApprovalStep.findUniqueOrThrow({
        where: { id: params.stepId },
        select: { order: true, leaveRequestId: true },
      });
      await tx.leaveApprovalStep.updateMany({
        where: {
          leaveRequestId: current.leaveRequestId,
          order: current.order + 1,
        },
        data: { pendingKey: current.leaveRequestId },
      });

      return LeaveApprovalOutcome.ADVANCED;
    });
  }

  /**
   * Info: (20260817 - Julian) 最後一關通過：五件事一起做完，或一件都不做。
   *
   * 1. 搶下本關（附條件 updateMany，輸了就整個交易不動）
   * 2. 假單狀態改 APPROVED
   * 3. 依交易內讀到的餘額重算 FIFO 分配，逐批寫 `LeaveLedgerEntry`
   * 4. 更新 `LeaveBalance` 快取（附條件，額度不足即判輸）
   * 5. 投影 `EmployeeShiftDay.dayType = LEAVE`，並把 `LeaveDay.activeKey` 填上
   *
   * 第 5 步的 `activeKey` 是「同一人同一天只能有一張生效假單」的全部 ——
   * 撞上唯一約束代表另一張單先生效了，那是衝突不是故障。
   */
  public async completeApproval(
    params: Parameters<ILeaveRequestRepository["completeApproval"]>[0],
  ): Promise<LeaveApprovalOutcome> {
    /**
     * Info: (20260819 - Julian) 哨兵在交易**外**接住，因為它的用途就是回捲。
     * 轉回 `BALANCE_RACE` 之後呼叫端的處置不變（service 轉成
     * `CF_LEAVE_BALANCE_RACE`），差別只在：現在真的一列都沒落地。
     */
    try {
      return await prisma.$transaction(async (tx) => {
        const claimed = await tx.leaveApprovalStep.updateMany({
          where: {
            id: params.stepId,
            status: LeaveApprovalStepStatus.PENDING,
            pendingKey: { not: null },
          },
          data: {
            status: LeaveApprovalStepStatus.APPROVED,
            decidedAt: params.decidedAt,
            comment: params.comment ?? null,
            pendingKey: null,
          },
        });
        if (claimed.count === 0) return LeaveApprovalOutcome.ALREADY_REVIEWED;

        /**
         * Info: (20260817 - Julian) 先取得逐日明細再扣帳 —— 扣帳需要 `leaveDayId`。
         *
         * 狀態一併改成 `APPROVED`：若把它留到最後，中途 return
         * `BALANCE_RACE` 時交易會整個回捲，兩者的最終結果相同，
         * 但放在這裡讀起來是「這一關過了，接著結帳」，
         * 而那正是這段程式在做的事。
         */
        const request = await tx.leaveRequest.update({
          where: { id: params.requestId },
          data: { status: LeaveRequestStatus.APPROVED },
          // Info: (20260817 - Julian) 帶出 dayEquivalentMinutes：投影時要把它抄進 plannedWorkMinutes
          include: {
            days: {
              select: {
                id: true,
                workDate: true,
                minutes: true,
                dayEquivalentMinutes: true,
              },
            },
          },
        });

        if (params.totalMinutes > 0) {
          /**
           * Info: (20260819 - Julian) **附條件扣總量排在讀逐批餘額之前**（review B4）。
           *
           * 順序是這段程式的正確性本身，不是風格：
           *
           * 這一句 `UPDATE ... WHERE remainingMinutes >= n` 會在 `LeaveBalance`
           * 那一列上取得列鎖。第二個併發交易執行同一句時**會阻塞到第一個 commit**，
           * 之後才重新評估條件、才往下讀逐批餘額 —— 而那時它已經看得到
           * 第一個交易寫下的 `CONSUME` 分錄。
           *
           * 先前的順序（先無鎖讀逐批 → 算 FIFO → 寫分錄 → 最後才扣總量）
           * 讓附條件更新只保護了**總量**：兩張各 480 分鐘的單同時核准、
           * 兩邊都讀到「批次 A 還有 480」，於是兩筆 `CONSUME` 都寫在 A 上，
           * A 的帳面變成 −480，而兩筆分錄都聲稱 `grantBalanceAfterMinutes = 0`。
           * 冪等鍵是 `consume:<leaveDayId>:<grantId>`，`leaveDayId` 不同，擋不住。
           * ADR 022 §2.2：守恆式必須**逐 LeaveGrant** 成立，不能只在總量上成立。
           */
          const deducted = await tx.leaveBalance.updateMany({
            where: {
              employeeId: params.employeeId,
              leavePolicyId: params.leavePolicyId,
              remainingMinutes: { gte: params.totalMinutes },
            },
            data: { remainingMinutes: { decrement: params.totalMinutes } },
          });
          if (deducted.count === 0) throw new BalanceRaceError();

          /**
           * Info: (20260819 - Julian) 與試算／送出前置檢查共用同一支
           * （`readConsumableGrants`）：已過期與餘額為 0 的批次都不參與 FIFO。
           * `asOfDate` 由呼叫端給，缺就丟 —— 見 `consumableGrantWhere`。
           */
          const balances = await readConsumableGrants(tx, {
            accountBookId: params.accountBookId,
            employeeId: params.employeeId,
            leavePolicyId: params.leavePolicyId,
            asOfDate: params.asOfDate,
          });

          /**
           * Info: (20260817 - Julian) **逐日扣帳**，不是按整張單扣。
           *
           * 第一版按單彙總（`consume:<requestId>:<grantId>`）。扣的時候沒問題，
           * 銷假的時候就回不去了 —— 銷假是逐日的，而按單彙總之後沒有任何
           * 資訊能算出「8/14 那一天用掉了哪幾批的多少分鐘」。
           * 總分配結果與按單扣相同（先到期先扣的貪婪演算法），差別只在粒度。
           */
          const consumed = await writeConsumeForDays(tx, {
            balances,
            days: request.days.map((day) => ({
              leaveDayId: day.id,
              minutes: day.minutes,
            })),
            actorEmployeeId: params.actorEmployeeId,
          });
          /**
           * Info: (20260819 - Julian) 逐批不足 —— 總量過了但攤不到批次上。
           * 丟哨兵而不是 return：回傳會 commit 掉上面那些寫入（見 `BalanceRaceError`）。
           */
          if (!consumed) throw new BalanceRaceError();
        }

        for (const day of request.days) {
          await tx.leaveDay.update({
            where: { id: day.id },
            data: { activeKey: activeKeyOf(params.employeeId, day.workDate) },
          });
          /**
           * Info: (20260817 - Julian) 投影成 `LEAVE`，**不帶班別** ——
           * `assertSchedulableDay` 要求非上班日不得掛班別。
           * 判定引擎只讀 `EmployeeShiftDay`，不知道假單存在（單向依賴鐵律）。
           *
           * Info: (20260817 - Julian) 真的呼叫那個不變式，而不是只在註解裡引述它。
           * 這裡是 `EmployeeShiftDay` 的第三個寫入點（另兩個是
           * `attendance_schedule.repo.upsertShiftDay` 與 `leave.repo.resolveRecall`），
           * 而前兩個都過閘口。第一版只寫了上面那段註解 —— 目前寫死 `LEAVE` + `null`
           * 碰巧合法，但那是**這一行現在長這樣**，不是一個保證：
           * 哪天有人把它改成帶班別（例如半天假想保留班別），沒有任何東西擋得住。
           * 註解攔不下 refactor，斷言可以。
           */
          assertSchedulableDay({
            dayType: WorkDayType.LEAVE,
            shiftPatternId: null,
          });
          await tx.employeeShiftDay.update({
            where: {
              accountBookId_employeeId_workDate: {
                accountBookId: params.accountBookId,
                employeeId: params.employeeId,
                workDate: day.workDate,
              },
            },
            data: {
              dayType: WorkDayType.LEAVE,
              shiftPatternId: null,
              /**
               * Info: (20260817 - Julian) 投影是單向有損的 —— 班別一設成 null，
               * 「這天本來要上幾分鐘」就查不到了。投影者負責在丟掉之前留一份。
               *
               * 值取自 `LeaveDay.dayEquivalentMinutes`，而那一份是送出當下
               * 從該日 `ShiftPattern.requiredWorkMinutes` 抄來的 —— 同一個數字，
               * 不是第二個來源。
               */
              plannedWorkMinutes: day.dayEquivalentMinutes,
            },
          });
        }

        return LeaveApprovalOutcome.COMPLETED;
      });
    } catch (error) {
      if (error instanceof BalanceRaceError) {
        return LeaveApprovalOutcome.BALANCE_RACE;
      }
      throw error;
    }
  }

  /**
   * Info: (20260817 - Julian) 駁回：任一節點駁回即整張單駁回，**額度不動**。
   *
   * 其餘尚未輪到的節點標 `SKIPPED` 而非留在 PENDING ——
   * 留著會讓它們永遠出現在那些人的待辦清單裡。
   */
  public async rejectStep(
    params: Parameters<ILeaveRequestRepository["rejectStep"]>[0],
  ): Promise<LeaveApprovalOutcome> {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.leaveApprovalStep.updateMany({
        where: {
          id: params.stepId,
          status: LeaveApprovalStepStatus.PENDING,
          pendingKey: { not: null },
        },
        data: {
          status: LeaveApprovalStepStatus.REJECTED,
          decidedAt: params.decidedAt,
          comment: params.comment ?? null,
          pendingKey: null,
        },
      });
      if (claimed.count === 0) return LeaveApprovalOutcome.ALREADY_REVIEWED;

      await tx.leaveApprovalStep.updateMany({
        where: {
          leaveRequestId: params.requestId,
          status: LeaveApprovalStepStatus.PENDING,
        },
        data: { status: LeaveApprovalStepStatus.SKIPPED, pendingKey: null },
      });
      await tx.leaveRequest.update({
        where: { id: params.requestId },
        data: { status: LeaveRequestStatus.REJECTED },
      });

      return LeaveApprovalOutcome.COMPLETED;
    });
  }

  // Info: (20260817 - Julian) 撤回：只能發生在尚未有任何決定之前，額度不動
  public async withdraw(
    params: Parameters<ILeaveRequestRepository["withdraw"]>[0],
  ): Promise<LeaveApprovalOutcome> {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.leaveRequest.updateMany({
        where: { id: params.requestId, status: LeaveRequestStatus.PENDING },
        data: { status: LeaveRequestStatus.WITHDRAWN },
      });
      if (claimed.count === 0) return LeaveApprovalOutcome.ALREADY_REVIEWED;

      await tx.leaveApprovalStep.updateMany({
        where: {
          leaveRequestId: params.requestId,
          status: LeaveApprovalStepStatus.PENDING,
        },
        data: { status: LeaveApprovalStepStatus.SKIPPED, pendingKey: null },
      });

      return LeaveApprovalOutcome.COMPLETED;
    });
  }
}

/**
 * Info: (20260817 - Julian) 攤平成 service 認得的形狀。
 *
 * `isPending` 由 `pendingKey` 推出而非另存一個欄位 ——
 * 兩者可以互相矛盾，而 `pendingKey` 是有唯一約束保護的那一個。
 */
const toRecord = (row: {
  id: string;
  accountBookId: string;
  employeeId: string;
  leavePolicyId: string;
  status: string;
  totalMinutes: number;
  totalDays: unknown;
  days: { id: string; workDate: string; minutes: number }[];
  approvalSteps: {
    id: string;
    order: number;
    nodeKind: string;
    approverEmployeeId: string | null;
    approverEmployeeNo: string;
    approverName: string;
    status: string;
    pendingKey: string | null;
  }[];
}): ILeaveRequestRecord => ({
  id: row.id,
  accountBookId: row.accountBookId,
  employeeId: row.employeeId,
  leavePolicyId: row.leavePolicyId,
  status: row.status as ILeaveRequestRecord["status"],
  totalMinutes: row.totalMinutes,
  totalDays: Number(row.totalDays),
  days: row.days,
  steps: row.approvalSteps.map(
    (step): ILeaveApprovalStepRecord => ({
      id: step.id,
      order: step.order,
      nodeKind: step.nodeKind as ILeaveApprovalStepRecord["nodeKind"],
      approverEmployeeId: step.approverEmployeeId,
      approverEmployeeNo: step.approverEmployeeNo,
      approverName: step.approverName,
      status: step.status as ILeaveApprovalStepRecord["status"],
      isPending: step.pendingKey !== null,
    }),
  ),
});

export const leaveRequestRepo = new LeaveRequestRepository();

/**
 * Info: (20260817 - Julian) 攤平成清單 DTO。
 *
 * `pendingStepOrder` 由 `pendingKey` 推出而非另存 —— 理由同 `isPending`：
 * 兩者可以互相矛盾，而 `pendingKey` 是有唯一約束保護的那一個。
 */
const toSummary = (row: {
  id: string;
  employeeId: string;
  leavePolicyId: string;
  status: string;
  totalMinutes: number;
  totalDays: unknown;
  createdAt: Date;
  employee: { employeeNo: string; name: string };
  leavePolicy: { code: string; name: string };
  days: { workDate: string }[];
  approvalSteps: {
    order: number;
    approverName: string;
    pendingKey: string | null;
  }[];
}): ILeaveRequestSummary => {
  const pending = row.approvalSteps.find((step) => step.pendingKey !== null);
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeNo: row.employee.employeeNo,
    employeeName: row.employee.name,
    leavePolicyId: row.leavePolicyId,
    leavePolicyCode: row.leavePolicy.code,
    leavePolicyName: row.leavePolicy.name,
    status: row.status as ILeaveRequestSummary["status"],
    totalMinutes: row.totalMinutes,
    totalDays: Number(row.totalDays),
    // Info: (20260817 - Julian) days 已依 workDate 排序，取頭尾即為區間
    firstWorkDate: row.days[0]?.workDate ?? "",
    lastWorkDate: row.days[row.days.length - 1]?.workDate ?? "",
    pendingStepOrder: pending?.order ?? null,
    pendingApproverName: pending?.approverName ?? null,
    totalSteps: row.approvalSteps.length,
    createdAt: row.createdAt.toISOString(),
  };
};
