import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
import { missionBoardRepo } from "@/repositories/mission_board.repo";
import { prisma } from "@/lib/prisma";
import { MISSION_TASK_STATUS } from "@/constants/mission_board";

declare const jest: typeof JestType;

/**
 * Info: (20261015 - Luphia) 任務看板 Repository 的狀態機（取代鏈上 MissionBoard 合約）。
 *
 * prisma 換成替身，`$transaction` 直接把同一組替身當成 `tx` 交給回呼，
 * 讓「交易內讀到什麼 → 寫了什麼／拋了什麼」成為被驗證的東西。
 * 每一條對應合約的一個 require：違反時要 throw，而且不能寫入。
 */
jest.mock("@/lib/prisma", () => {
  const client = {
    missionTask: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    missionSubmission: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  client.$transaction.mockImplementation(async (work: unknown) =>
    (work as (tx: typeof client) => Promise<unknown>)(client),
  );
  return { prisma: client };
});

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function givenTask(overrides: Record<string, unknown> = {}) {
  const task = {
    id: 7,
    creator: "platform",
    contentCid: "cid-7",
    reward: 1000n,
    status: MISSION_TASK_STATUS.OPEN,
    submissionCount: 0,
    ...overrides,
  };
  asMock(prisma.missionTask.findUnique).mockResolvedValue(task);
  return task;
}

function givenSubmission(overrides: Record<string, unknown> = {}) {
  asMock(prisma.missionSubmission.findUnique).mockResolvedValue({
    id: "sub-uuid",
    taskId: 7,
    subIndex: 0,
    isRejected: false,
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("missionBoardRepo.createTask", () => {
  it("以 Open 狀態建立任務", async () => {
    asMock(prisma.missionTask.create).mockResolvedValue({ id: 1 });

    await missionBoardRepo.createTask({
      creator: "platform",
      contentCid: "cid",
      reward: 5n,
    });

    expect(asMock(prisma.missionTask.create)).toHaveBeenCalledWith({
      data: {
        creator: "platform",
        contentCid: "cid",
        reward: 5n,
        status: MISSION_TASK_STATUS.OPEN,
      },
    });
  });
});

describe("missionBoardRepo.submitResult", () => {
  it("Open 任務：以目前的 submissionCount 為 subIndex，任務轉為 PendingReview", async () => {
    givenTask({ submissionCount: 0 });
    asMock(prisma.missionSubmission.create).mockResolvedValue({ subIndex: 0 });

    await missionBoardRepo.submitResult({
      taskId: 7,
      submitter: "platform",
      resultCid: "result-cid",
      consumedTokens: 42n,
    });

    expect(asMock(prisma.missionSubmission.create)).toHaveBeenCalledWith({
      data: {
        taskId: 7,
        subIndex: 0,
        submitter: "platform",
        resultCid: "result-cid",
        consumedTokens: 42n,
      },
    });
    expect(asMock(prisma.missionTask.update)).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        submissionCount: 1,
        status: MISSION_TASK_STATUS.PENDING_REVIEW,
      },
    });
  });

  // Info: (20261015 - Luphia) 被拒後重交：任務仍是 PendingReview，subIndex 往後遞增
  it("PendingReview 任務可以再交，subIndex 遞增", async () => {
    givenTask({
      status: MISSION_TASK_STATUS.PENDING_REVIEW,
      submissionCount: 2,
    });
    asMock(prisma.missionSubmission.create).mockResolvedValue({ subIndex: 2 });

    await missionBoardRepo.submitResult({
      taskId: 7,
      submitter: "platform",
      resultCid: "r",
      consumedTokens: 0n,
    });

    expect(asMock(prisma.missionSubmission.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subIndex: 2 }),
      }),
    );
  });

  it("已關閉的任務不收件，也不寫入", async () => {
    givenTask({ status: MISSION_TASK_STATUS.CLOSED });

    await expect(
      missionBoardRepo.submitResult({
        taskId: 7,
        submitter: "platform",
        resultCid: "r",
        consumedTokens: 0n,
      }),
    ).rejects.toThrow("Task not accepting submissions");
    expect(asMock(prisma.missionSubmission.create)).not.toHaveBeenCalled();
  });

  it("任務不存在時拋錯", async () => {
    asMock(prisma.missionTask.findUnique).mockResolvedValue(null);

    await expect(
      missionBoardRepo.submitResult({
        taskId: 99,
        submitter: "platform",
        resultCid: "r",
        consumedTokens: 0n,
      }),
    ).rejects.toThrow("not found");
  });
});

describe("missionBoardRepo.approveSubmission / rejectSubmission", () => {
  it("核可：PendingReview → Closed", async () => {
    givenTask({ status: MISSION_TASK_STATUS.PENDING_REVIEW });
    givenSubmission();

    await missionBoardRepo.approveSubmission(7, 0);

    expect(asMock(prisma.missionTask.update)).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: MISSION_TASK_STATUS.CLOSED },
    });
  });

  /**
   * Info: (20261015 - Luphia) validator 依賴這段訊息判斷「別人已經核可過」而優雅略過，
   * 訊息改了那條分支就會把正常的重複當成錯誤拋出。
   */
  it("已關閉的任務再核可時拋出 Invalid status", async () => {
    givenTask({ status: MISSION_TASK_STATUS.CLOSED });

    await expect(missionBoardRepo.approveSubmission(7, 0)).rejects.toThrow(
      "Invalid status",
    );
    expect(asMock(prisma.missionTask.update)).not.toHaveBeenCalled();
  });

  it("被拒過的提交不能核可", async () => {
    givenTask({ status: MISSION_TASK_STATUS.PENDING_REVIEW });
    givenSubmission({ isRejected: true });

    await expect(missionBoardRepo.approveSubmission(7, 0)).rejects.toThrow(
      "Submission was rejected",
    );
  });

  it("拒絕：只標記提交，任務留在 PendingReview", async () => {
    givenTask({ status: MISSION_TASK_STATUS.PENDING_REVIEW });
    givenSubmission();

    await missionBoardRepo.rejectSubmission(7, 0);

    expect(asMock(prisma.missionSubmission.update)).toHaveBeenCalledWith({
      where: { id: "sub-uuid" },
      data: { isRejected: true },
    });
    expect(asMock(prisma.missionTask.update)).not.toHaveBeenCalled();
  });

  // Info: (20261015 - Luphia) 同上：validator 以 Already rejected 判斷重複
  it("重複拒絕時拋出 Already rejected", async () => {
    givenTask({ status: MISSION_TASK_STATUS.PENDING_REVIEW });
    givenSubmission({ isRejected: true });

    await expect(missionBoardRepo.rejectSubmission(7, 0)).rejects.toThrow(
      "Already rejected",
    );
    expect(asMock(prisma.missionSubmission.update)).not.toHaveBeenCalled();
  });
});

describe("missionBoardRepo.cancelTask / bumpTask", () => {
  it("取消只作用於 Open 且沒有提交的任務", async () => {
    asMock(prisma.missionTask.updateMany).mockResolvedValue({ count: 1 });

    await missionBoardRepo.cancelTask(7);

    expect(asMock(prisma.missionTask.updateMany)).toHaveBeenCalledWith({
      where: { id: 7, status: MISSION_TASK_STATUS.OPEN, submissionCount: 0 },
      data: { status: MISSION_TASK_STATUS.CLOSED },
    });
  });

  it("沒有任何一列符合時拋錯", async () => {
    asMock(prisma.missionTask.updateMany).mockResolvedValue({ count: 0 });

    await expect(missionBoardRepo.cancelTask(7)).rejects.toThrow("Not Open");
  });

  it("加碼：懸賞加一成", async () => {
    givenTask({ reward: 1000n });

    await missionBoardRepo.bumpTask(7);

    expect(asMock(prisma.missionTask.update)).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { reward: 1100n },
    });
  });

  it("加碼量為 0 時拋錯而不是靜默不變", async () => {
    givenTask({ reward: 9n });

    await expect(missionBoardRepo.bumpTask(7)).rejects.toThrow(
      "Bump amount too small",
    );
    expect(asMock(prisma.missionTask.update)).not.toHaveBeenCalled();
  });

  it("非 Open 的任務不能加碼", async () => {
    givenTask({ status: MISSION_TASK_STATUS.PENDING_REVIEW });

    await expect(missionBoardRepo.bumpTask(7)).rejects.toThrow(
      "Task is not open",
    );
  });
});

describe("missionBoardRepo 查詢", () => {
  it("listTaskIds 只回傳 id", async () => {
    asMock(prisma.missionTask.findMany).mockResolvedValue([
      { id: 1 },
      { id: 3 },
    ]);

    await expect(missionBoardRepo.listTaskIds()).resolves.toEqual([1, 3]);
  });

  it("findTaskByContentCid 以 contentCid 查詢，取最早的一筆", async () => {
    asMock(prisma.missionTask.findFirst).mockResolvedValue(null);

    await missionBoardRepo.findTaskByContentCid("0xhash");

    expect(asMock(prisma.missionTask.findFirst)).toHaveBeenCalledWith({
      where: { contentCid: "0xhash" },
      orderBy: { id: "asc" },
    });
  });
});
