import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { Gender } from "@/constants/hr_management";
import { WorkDayType } from "@/constants/attendance";
import {
  LeaveRecallDecision,
  LeaveRecallResolutionOutcome,
  LeaveRecallStatus,
  LeaveRequestStatus,
  LeaveType,
} from "@/constants/leave";
import { activeKeyOf, leaveRepo } from "@/repositories/leave.repo";
import { employeeRepo } from "@/repositories/employee.repo";

/**
 * Info: (20260817 - Luphia) 簽到系統的併發保證（真資料庫）。
 *
 * ## 為什麼一定要對真資料庫跑
 *
 * 這一支守的三件事**全部發生在 repository 內部**，而 service 的單元測試把整支
 * `ILeaveRepository` 換成手寫假物件。實測的後果：把
 *
 *   1. `resolveRecall` 的 `updateMany({ where: { status: PENDING } })` 拿掉狀態條件
 *   2. 同一交易內 `leaveDay.update({ activeKey: null })` 拿掉 activeKey 清除
 *   3. `linkUser` 的 `where: { userId: null }` 拿掉條件
 *
 * 三處同時改壞，全套 1806 條測試的失敗數**一字不變**。也就是說這三條保證
 * 目前是靠「作者寫對了」而不是靠機制 —— 而它們的共同形狀正是
 * `code_review_checklist.md §3.2`（先查後改＝雙倍）與 §一.2（mock 掉協作者
 * 就要另有一支測那支協作者）。
 *
 * 更多 mock 抓不到這一類：附條件更新到底有沒有原子性，只有真的讓兩個請求
 * 同時打進同一列才會知道。
 *
 * ## 這支不做什麼
 *
 * 不碰任何外部副作用（無 SMTP、無鏈、無 LLM），只建立與刪除自己的資料列。
 * 也不驗「該不該同意」那類業務判斷 —— 那些在 `leave_recall.service.test.ts`
 * 已用假物件覆蓋，且在那一層測是對的。
 */

/**
 * Info: (20260817 - Luphia) 🛑 正式機實體隔離（比照 `core_pipeline.e2e` 與
 * `free_plan_invite_cap.e2e`）。`jest.config.mjs` 沒有排除 e2e，`npm test` 會跑到它，
 * 而它會真的建立與刪除 Employee / LeaveRequest / EmployeeShiftDay。
 * `e2e_production_guard.test.ts` 會掃描本目錄確認這道閘存在。
 */
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免污染真實出勤與假勤資料！",
  );
}

// Info: (20260817 - Luphia) 前綴與 CLAUDE.md §8 的 `e2e-book-` 慣例一致，清理與人工排查都靠它
const STAMP = `${Date.now()}`;
const BOOK_ID = `e2e-book-attendance-${STAMP}`;
const TZ_DATE = "2099-01-15";
const OTHER_DATE = "2099-01-16";

let teamId = "";
let managerId = "";
let employeeId = "";
let shiftPatternId = "";
const createdUserIds: string[] = [];

/**
 * Info: (20260817 - Luphia) `phoneCipher` / `piiKeyVersion` 是 NOT NULL（ADR 018 §5），
 * 但本檔沒有任何路徑會去解它，因此填佔位字串而不呼叫 `encryptPii()` ——
 * 那會讓這支測試多一個「環境必須有 `HR_PII_KEY_V1`」的前提，而那個前提與
 * 它要驗的東西無關（§一.3：測試的前提越少越好）。
 *
 * 反過來說，任何**會解密**的 e2e 都必須走真的 `encryptPii()`，
 * 因為 AAD 綁定寫錯只有往返一次才驗得出來。
 */
const PII_PLACEHOLDER = {
  phoneCipher: `e2e-placeholder-${STAMP}`,
  piiKeyVersion: 1,
};

const makeEmployee = async (params: {
  employeeNo: string;
  name: string;
}): Promise<string> => {
  const employee = await prisma.employee.create({
    data: {
      employeeNo: params.employeeNo,
      name: params.name,
      gender: Gender.MALE,
      email: `${params.employeeNo.toLowerCase()}.${STAMP}@e2e.invalid`,
      hireDate: new Date("2020-01-01T00:00:00.000Z"),
      accountBookId: BOOK_ID,
      ...PII_PLACEHOLDER,
    },
  });
  return employee.id;
};

/**
 * Info: (20260817 - Luphia) 建立一張生效中的請假日 + 一張待回應的徵詢。
 * `activeKey` 一律走 `activeKeyOf()`，不自己組字串 —— 那個組法是
 * 「同一人同一天只能有一張生效假單」這條保證的全部（見 leave.repo 檔頭）。
 */
const makePendingRecall = async (workDate: string): Promise<string> => {
  const request = await prisma.leaveRequest.create({
    data: {
      accountBookId: BOOK_ID,
      employeeId,
      leaveType: LeaveType.ANNUAL,
      reason: "e2e 併發測試",
      status: LeaveRequestStatus.APPROVED,
    },
  });

  const day = await prisma.leaveDay.create({
    data: {
      leaveRequestId: request.id,
      workDate,
      activeKey: activeKeyOf(employeeId, workDate),
    },
  });

  const recall = await prisma.leaveRecall.create({
    data: {
      leaveDayId: day.id,
      pendingLeaveDayId: day.id,
      shiftPatternId,
      requestedByEmployeeId: managerId,
      reason: "e2e 併發測試：企業經營上之急迫需求",
      status: LeaveRecallStatus.PENDING,
    },
  });

  return recall.id;
};

beforeAll(async () => {
  const team = await prisma.team.create({
    data: { name: `e2e-attendance-${STAMP}` },
  });
  teamId = team.id;

  await prisma.accountBook.create({
    data: {
      id: BOOK_ID,
      name: "E2E 出勤併發測試帳本",
      country: "tw",
      currency: "TWD",
      rule: "TW-GAAP",
      teamId,
    },
  });

  managerId = await makeEmployee({ employeeNo: "E2E001", name: "E2E 主管" });
  employeeId = await makeEmployee({ employeeNo: "E2E002", name: "E2E 員工" });

  // Info: (20260817 - Luphia) 主管身分來自 `Department.managerId`，不是職稱字串（見 employee.repo）
  await prisma.department.create({
    data: {
      code: `E2E-DEP-${STAMP}`,
      name: "E2E 第一工務所",
      accountBookId: BOOK_ID,
      managerId,
    },
  });

  const pattern = await prisma.shiftPattern.create({
    data: {
      code: `E2E-SITE-DAY-${STAMP}`,
      name: "E2E 工地日班",
      accountBookId: BOOK_ID,
      windowStartMinute: 450,
      windowEndMinute: 1020,
      coreStartMinute: 450,
      coreEndMinute: 1020,
      requiredWorkMinutes: 480,
      breakMinutes: 60,
    },
  });
  shiftPatternId = pattern.id;
});

/**
 * Info: (20260817 - Luphia) 刪除順序即外鍵的反向拓樸。`LeaveDay` / `LeaveRecall` 靠
 * `onDelete: Cascade` 隨假單一起走，但 `EmployeeShiftDay` 與 `Department.managerId`
 * 不會 —— 後者必須先解開，否則刪員工會被 `onDelete: SetNull` 之外的約束擋住。
 */
afterAll(async () => {
  await prisma.department.updateMany({
    where: { accountBookId: BOOK_ID },
    data: { managerId: null },
  });
  await prisma.leaveRequest.deleteMany({ where: { accountBookId: BOOK_ID } });
  await prisma.employeeShiftDay.deleteMany({
    where: { accountBookId: BOOK_ID },
  });
  await prisma.shiftPattern.deleteMany({ where: { accountBookId: BOOK_ID } });
  await prisma.department.deleteMany({ where: { accountBookId: BOOK_ID } });
  await prisma.employee.deleteMany({ where: { accountBookId: BOOK_ID } });
  await prisma.accountBook.deleteMany({ where: { id: BOOK_ID } });
  await prisma.team.deleteMany({ where: { id: teamId } });
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  // Info: (20260817 - Luphia) 不關連線 jest 會抱怨有未結束的非同步操作
  await prisma.$disconnect();
});

describe("同意銷假的三張表一起改（真資料庫）", () => {
  it("ACCEPT 之後徵詢、請假日、排班三者同時生效", async () => {
    const recallId = await makePendingRecall(TZ_DATE);

    const resolution = await leaveRepo.resolveRecall({
      recallId,
      respondedAt: new Date(),
      decision: LeaveRecallDecision.ACCEPT,
      projection: {
        leaveDayId: (
          await prisma.leaveRecall.findUniqueOrThrow({
            where: { id: recallId },
          })
        ).leaveDayId,
        accountBookId: BOOK_ID,
        employeeId,
        workDate: TZ_DATE,
        shiftPatternId,
      },
    });

    expect(resolution.outcome).toBe(LeaveRecallResolutionOutcome.RESOLVED);

    const recall = await prisma.leaveRecall.findUniqueOrThrow({
      where: { id: recallId },
      include: { leaveDay: true },
    });

    // Info: (20260817 - Luphia) 不變式 1：狀態已終局，且 pendingLeaveDayId 讓位給下一張徵詢
    expect(recall.status).toBe(LeaveRecallStatus.ACCEPTED);
    expect(recall.pendingLeaveDayId).toBeNull();

    /**
     * Info: (20260817 - Luphia) 不變式 2：請假日退出生效，但**不刪列** ——
     * `recalledAt` 有值而 `activeKey` 為 null，兩者是不同的事實
     * （被駁回的日子 activeKey 也是 null，但它從來沒有被銷過）。
     */
    expect(recall.leaveDay.activeKey).toBeNull();
    expect(recall.leaveDay.recalledAt).not.toBeNull();

    // Info: (20260817 - Luphia) 不變式 3：排班改回上班日，否則判定引擎看到的是 NO_SCHEDULE
    const shiftDay = await prisma.employeeShiftDay.findUniqueOrThrow({
      where: {
        accountBookId_employeeId_workDate: {
          accountBookId: BOOK_ID,
          employeeId,
          workDate: TZ_DATE,
        },
      },
    });
    expect(shiftDay.dayType).toBe(WorkDayType.WORK);
    expect(shiftDay.shiftPatternId).toBe(shiftPatternId);
  });

  it("DECLINE 一個字都不動排班，且假仍然生效", async () => {
    const recallId = await makePendingRecall(OTHER_DATE);

    const resolution = await leaveRepo.resolveRecall({
      recallId,
      respondedAt: new Date(),
      decision: LeaveRecallDecision.DECLINE,
      note: "e2e 婉拒",
    });

    expect(resolution.outcome).toBe(LeaveRecallResolutionOutcome.RESOLVED);

    const recall = await prisma.leaveRecall.findUniqueOrThrow({
      where: { id: recallId },
      include: { leaveDay: true },
    });
    expect(recall.status).toBe(LeaveRecallStatus.DECLINED);
    expect(recall.leaveDay.activeKey).not.toBeNull();
    expect(recall.leaveDay.recalledAt).toBeNull();

    const shiftDay = await prisma.employeeShiftDay.findUnique({
      where: {
        accountBookId_employeeId_workDate: {
          accountBookId: BOOK_ID,
          employeeId,
          workDate: OTHER_DATE,
        },
      },
    });
    expect(shiftDay).toBeNull();
  });
});

describe("併發回應同一張徵詢（真資料庫）", () => {
  /**
   * Info: (20260817 - Luphia) 兩個分頁同時按下「同意」與「婉拒」。
   *
   * **斷言的是自我一致，不是誰贏。** 誰先搶到取決於排程，寫死贏家就是一支
   * 會偶爾紅的測試；而真正不可接受的狀態是那個**組合**：
   * 狀態 DECLINED 卻已經改了排班（或 ACCEPTED 卻沒改），
   * 那是 `leave.repo` 檔頭點名「永遠改不回來」的中間狀態。
   */
  it("恰好一個成功，另一個得到 ALREADY_ANSWERED，且最終狀態自我一致", async () => {
    const workDate = "2099-02-20";
    const recallId = await makePendingRecall(workDate);
    const { leaveDayId } = await prisma.leaveRecall.findUniqueOrThrow({
      where: { id: recallId },
    });

    const respondedAt = new Date();
    const [accepted, declined] = await Promise.all([
      leaveRepo.resolveRecall({
        recallId,
        respondedAt,
        decision: LeaveRecallDecision.ACCEPT,
        projection: {
          leaveDayId,
          accountBookId: BOOK_ID,
          employeeId,
          workDate,
          shiftPatternId,
        },
      }),
      leaveRepo.resolveRecall({
        recallId,
        respondedAt,
        decision: LeaveRecallDecision.DECLINE,
      }),
    ]);

    const outcomes = [accepted.outcome, declined.outcome].sort();
    expect(outcomes).toEqual(
      [
        LeaveRecallResolutionOutcome.ALREADY_ANSWERED,
        LeaveRecallResolutionOutcome.RESOLVED,
      ].sort(),
    );

    const recall = await prisma.leaveRecall.findUniqueOrThrow({
      where: { id: recallId },
      include: { leaveDay: true },
    });
    const shiftDay = await prisma.employeeShiftDay.findUnique({
      where: {
        accountBookId_employeeId_workDate: {
          accountBookId: BOOK_ID,
          employeeId,
          workDate,
        },
      },
    });

    // Info: (20260817 - Luphia) 無論誰贏，pendingLeaveDayId 都必須讓位
    expect(recall.pendingLeaveDayId).toBeNull();

    if (recall.status === LeaveRecallStatus.ACCEPTED) {
      expect(recall.leaveDay.activeKey).toBeNull();
      expect(shiftDay?.dayType).toBe(WorkDayType.WORK);
    } else {
      expect(recall.status).toBe(LeaveRecallStatus.DECLINED);
      // Info: (20260817 - Luphia) 婉拒贏了就必須完全沒動過排班：假還在，那天不是上班日
      expect(recall.leaveDay.activeKey).not.toBeNull();
      expect(shiftDay).toBeNull();
    }
  });
});

describe("員工檔綁定系統帳號的競態（真資料庫）", () => {
  /**
   * Info: (20260817 - Luphia) 同一個員工檔、兩個系統帳號同時首次登入。
   *
   * `linkUser` 的 `where` 帶 `userId: null`，讓「這筆還沒被綁走」成為更新的條件
   * 本身。少了它，後者會直接覆蓋前者 —— 而覆蓋的後果是**某人的打卡記在別人頭上**，
   * 且兩邊都會收到「綁定成功」。
   */
  it("兩個帳號同時綁定同一員工檔，只有一個成功且不被覆蓋", async () => {
    const [userA, userB] = await Promise.all([
      prisma.user.create({
        data: { address: `e2e_att_a_${STAMP}`, name: "E2E A" },
      }),
      prisma.user.create({
        data: { address: `e2e_att_b_${STAMP}`, name: "E2E B" },
      }),
    ]);
    createdUserIds.push(userA.id, userB.id);

    const target = await makeEmployee({
      employeeNo: `E2E00${STAMP.slice(-1)}L`,
      name: "E2E 待綁定",
    });

    const [boundA, boundB] = await Promise.all([
      employeeRepo.linkUser(target, userA.id),
      employeeRepo.linkUser(target, userB.id),
    ]);

    // Info: (20260817 - Luphia) 恰好一個 true —— 不是「兩個都成功」也不是「兩個都失敗」
    expect([boundA, boundB].filter(Boolean)).toHaveLength(1);

    const winner = boundA ? userA.id : userB.id;
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: target },
    });
    expect(employee.userId).toBe(winner);

    // Info: (20260817 - Luphia) 輸家再試一次仍然是 false，不會後來覆蓋先來
    const loser = boundA ? userB.id : userA.id;
    expect(await employeeRepo.linkUser(target, loser)).toBe(false);
    expect(
      (await prisma.employee.findUniqueOrThrow({ where: { id: target } }))
        .userId,
    ).toBe(winner);
  });
});
