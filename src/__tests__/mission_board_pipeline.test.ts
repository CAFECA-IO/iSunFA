import path from "path";
import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
import { missionBoardRepo } from "@/repositories/mission_board.repo";
import { storageService } from "@/services/storage.service";
import {
  MISSION_PLATFORM_ACTOR,
  MISSION_TASK_STATUS,
  missionFolderName,
  parseMissionFolderName,
} from "@/constants/mission_board";
import {
  computeTaskReward,
  formatTaskReward,
  listAdminTasks,
} from "@/services/mission_board.service";
import { processNext as planNext } from "@/services/mission.planner.service";
import { processNext as commitNext } from "@/services/mission.commitor.service";
import { processNext as closeNext } from "@/services/mission.closer.service";
import { processNext as validateNext } from "@/services/issue.validator.service";
import { SystemWorkerSource } from "@/constants/enums";

declare const jest: typeof JestType;

/**
 * Info: (20261015 - Luphia) 任務管線改用 DB 看板之後的行為（取代鏈上 MissionBoard）。
 *
 * 檔案協定（meta.json / result.md / submit.md / approved.N.md / close.md / giveup.md）不變，
 * 變的只有資料來源與資料夾名稱。所以這裡把 fs 換成記憶體版本、repo 換成替身，
 * 真的呼叫各 worker 的 `processNext()`，驗「哪一種 DB 狀態 + 檔案組合會留下什麼檔案、
 * 對看板做了什麼」。
 *
 * 另外一組要釘的是**舊鏈資料夾**：`{合約位址}_{taskId}` 的 taskId 與 DB 流水號可能同號，
 * worker 拿它去查 DB 會操作到別人的任務，所以要被略過。
 */

const MISSION_DIR = "missions";
const ISSUE_DIR = "issues";
const missionPath = (...parts: string[]) =>
  path.join(process.cwd(), MISSION_DIR, ...parts);
const issuePath = (...parts: string[]) =>
  path.join(process.cwd(), ISSUE_DIR, ...parts);

// Info: (20261015 - Luphia) 記憶體檔案系統：只實作 worker 用得到的那幾支
const memFs = {
  files: new Map<string, string>(),
  dirs: new Set<string>(),
};

function addDir(target: string) {
  let current = target;
  while (current && !memFs.dirs.has(current)) {
    memFs.dirs.add(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

// Info: (20261015 - Luphia) 測試擺檔案時連同上層資料夾一起建立（與真的 fs 一致）
function put(target: string, content: string) {
  addDir(path.dirname(target));
  memFs.files.set(target, content);
}

function enoent(target: string): Error {
  return new Error(`ENOENT: ${target}`);
}

jest.mock("fs/promises", () => ({
  mkdir: jest.fn(async (target: string) => {
    addDir(target);
  }),
  access: jest.fn(async (target: string) => {
    if (!memFs.files.has(target) && !memFs.dirs.has(target)) {
      throw enoent(target);
    }
  }),
  readFile: jest.fn(async (target: string) => {
    const content = memFs.files.get(target);
    if (content === undefined) throw enoent(target);
    return content;
  }),
  writeFile: jest.fn(async (target: string, content: string) => {
    addDir(path.dirname(target));
    memFs.files.set(target, content);
  }),
  appendFile: jest.fn(async (target: string, content: string) => {
    memFs.files.set(target, (memFs.files.get(target) ?? "") + content);
  }),
  rename: jest.fn(async (from: string, to: string) => {
    const content = memFs.files.get(from);
    if (content === undefined) throw enoent(from);
    memFs.files.delete(from);
    memFs.files.set(to, content);
  }),
  rm: jest.fn(async (target: string) => {
    for (const key of [...memFs.files.keys()]) {
      if (key === target || key.startsWith(`${target}${path.sep}`)) {
        memFs.files.delete(key);
      }
    }
    for (const key of [...memFs.dirs]) {
      if (key === target || key.startsWith(`${target}${path.sep}`)) {
        memFs.dirs.delete(key);
      }
    }
  }),
  readdir: jest.fn(
    async (target: string, options?: { withFileTypes?: boolean }) => {
      if (!memFs.dirs.has(target)) throw enoent(target);
      const prefix = `${target}${path.sep}`;
      const children = new Map<string, boolean>();
      for (const dir of memFs.dirs) {
        if (dir.startsWith(prefix)) {
          children.set(dir.slice(prefix.length).split(path.sep)[0], true);
        }
      }
      for (const file of memFs.files.keys()) {
        if (file.startsWith(prefix)) {
          const rest = file.slice(prefix.length).split(path.sep);
          if (!children.has(rest[0])) children.set(rest[0], rest.length > 1);
        }
      }
      const names = [...children.keys()].sort();
      return options?.withFileTypes
        ? names.map((name) => ({
            name,
            isDirectory: () => children.get(name) === true,
          }))
        : names;
    },
  ),
}));

jest.mock("@/services/env.service", () => ({
  getPriorityEnvConfig: jest.fn(async () => ({ MISSION_DIR, ISSUE_DIR })),
}));

jest.mock("@/repositories/mission_board.repo", () => ({
  missionBoardRepo: {
    createTask: jest.fn(),
    getTask: jest.fn(),
    getSubmission: jest.fn(),
    listTasksByStatus: jest.fn(async () => []),
    listTasks: jest.fn(),
    listTaskIds: jest.fn(async () => []),
    findTaskByContentCid: jest.fn(),
    submitResult: jest.fn(),
    rejectSubmission: jest.fn(),
    approveSubmission: jest.fn(),
    cancelTask: jest.fn(),
    bumpTask: jest.fn(),
    closeTask: jest.fn(),
  },
}));

jest.mock("@/services/storage.service", () => ({
  storageService: {
    uploadLaria: jest.fn(async () => "uploaded-cid"),
    recoverLaria: jest.fn(),
  },
}));

jest.mock("@/lib/worker/mission.generator", () => ({
  missionGenerator: {
    generateMission: jest.fn(() => ({ id: "generated-plan" })),
  },
}));

jest.mock("@/services/chat.service", () => ({
  ChatService: jest.fn().mockImplementation(() => ({
    generateRaw: jest.fn(async () =>
      JSON.stringify({ confidence: 90, reason: "looks right" }),
    ),
  })),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function task(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    creator: MISSION_PLATFORM_ACTOR,
    contentCid: "mission-cid",
    reward: 2000000000000000000n,
    status: MISSION_TASK_STATUS.OPEN,
    submissionCount: 0,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  memFs.files.clear();
  memFs.dirs.clear();
  addDir(missionPath());
  addDir(issuePath());
});

describe("任務資料夾名稱", () => {
  it("missionFolderName 與 parseMissionFolderName 互為反函式", () => {
    expect(missionFolderName(12)).toBe("local_12");
    expect(parseMissionFolderName(missionFolderName(12))).toBe(12);
  });

  it("舊鏈與格式不符的資料夾回 null", () => {
    expect(parseMissionFolderName("0xAbC123_12")).toBeNull();
    expect(parseMissionFolderName("12")).toBeNull();
    expect(parseMissionFolderName("local_")).toBeNull();
    expect(parseMissionFolderName("local_1.5")).toBeNull();
  });
});

describe("mission_board.service 換算", () => {
  // Info: (20261015 - Luphia) 原本是 parseEther(cost / 2 / n)，結果要一致（wei 刻度）
  it("每筆懸賞 = 成本 / 2 / 任務數（wei 刻度、捨去）", () => {
    expect(computeTaskReward(10, 2)).toBe(2500000000000000000n);
    expect(computeTaskReward(1, 3)).toBe(166666666666666666n);
  });

  it("成本為 0、負數或非有限值時懸賞為 0", () => {
    expect(computeTaskReward(0, 1)).toBe(0n);
    expect(computeTaskReward(-5, 1)).toBe(0n);
    expect(computeTaskReward(Number.NaN, 1)).toBe(0n);
    expect(computeTaskReward(10, 0)).toBe(0n);
  });

  it("formatTaskReward 把 wei 換回十進位字串", () => {
    expect(formatTaskReward(2500000000000000000n)).toBe("2.5");
    expect(formatTaskReward(0n)).toBe("0");
  });

  it("管理後台的任務：秒數時間戳、原始 token 數、換算後的懸賞", async () => {
    asMock(missionBoardRepo.listTasks).mockResolvedValue({
      total: 1,
      tasks: [
        {
          ...task({ status: MISSION_TASK_STATUS.PENDING_REVIEW }),
          submissionCount: 1,
          submissions: [
            {
              id: "s",
              taskId: 5,
              subIndex: 0,
              submitter: MISSION_PLATFORM_ACTOR,
              resultCid: "r",
              consumedTokens: 1234n,
              isRejected: false,
              createdAt: new Date(),
            },
          ],
        },
      ],
    });

    const [adminTask] = await listAdminTasks();

    expect(adminTask).toEqual({
      taskId: 5,
      creator: MISSION_PLATFORM_ACTOR,
      contentCid: "mission-cid",
      reward: "2",
      createdAt: 1790812800,
      updatedAt: 1790812800,
      status: MISSION_TASK_STATUS.PENDING_REVIEW,
      submissionCount: 1,
      submissions: [
        {
          submitter: MISSION_PLATFORM_ACTOR,
          resultCid: "r",
          consumedTokens: "1234",
          isRejected: false,
          subIndex: 0,
        },
      ],
    });
  });
});

describe("MissionPlanner", () => {
  it("向 DB 要 Open 任務，為新任務建 MISSION_DIR/local_<id>", async () => {
    asMock(missionBoardRepo.listTasksByStatus).mockResolvedValue([task()]);
    asMock(storageService.recoverLaria).mockResolvedValue(
      Buffer.from(JSON.stringify({ data: { category: "x" } })),
    );

    await planNext();

    expect(asMock(missionBoardRepo.listTasksByStatus)).toHaveBeenCalledWith([
      MISSION_TASK_STATUS.OPEN,
    ]);
    const meta = JSON.parse(
      memFs.files.get(missionPath("local_5", "meta.json")) ?? "{}",
    );
    expect(meta).toEqual({
      taskId: "5",
      creator: MISSION_PLATFORM_ACTOR,
      reward: "2000000000000000000",
      contentCid: "mission-cid",
    });
    expect(memFs.files.has(missionPath("local_5", "mission.json"))).toBe(true);
    expect(memFs.files.has(missionPath("local_5", "plan.executor.json"))).toBe(
      true,
    );
  });

  it("已經有資料夾的任務跳過，處理下一筆", async () => {
    addDir(missionPath("local_5"));
    asMock(missionBoardRepo.listTasksByStatus).mockResolvedValue([
      task(),
      task({ id: 6 }),
    ]);
    asMock(storageService.recoverLaria).mockResolvedValue(Buffer.from("{}"));

    await planNext();

    expect(asMock(storageService.recoverLaria)).toHaveBeenCalledTimes(1);
    expect(memFs.files.has(missionPath("local_6", "meta.json"))).toBe(true);
    expect(memFs.files.has(missionPath("local_5", "meta.json"))).toBe(false);
  });

  /**
   * Info: (20261015 - Luphia) 攤銷 worker 的任務以雜湊當 contentCid，
   * planner 去下載只會失敗並刪掉攤銷剛寫好的資料夾。
   */
  it("不規劃其他系統 worker 發的任務", async () => {
    asMock(missionBoardRepo.listTasksByStatus).mockResolvedValue([
      task({ creator: SystemWorkerSource.AMORTIZATION_WORKER }),
    ]);

    await planNext();

    expect(asMock(storageService.recoverLaria)).not.toHaveBeenCalled();
    expect(memFs.dirs.has(missionPath("local_5"))).toBe(false);
  });

  it("下載失敗時清掉資料夾，下一輪重試", async () => {
    asMock(missionBoardRepo.listTasksByStatus).mockResolvedValue([task()]);
    asMock(storageService.recoverLaria).mockRejectedValue(new Error("down"));

    await planNext();

    expect(memFs.dirs.has(missionPath("local_5"))).toBe(false);
  });
});

describe("MissionCommitor", () => {
  function givenExecuted(folder: string, taskId: number) {
    put(
      missionPath(folder, "meta.json"),
      JSON.stringify({ taskId: String(taskId) }),
    );
    put(missionPath(folder, "result.md"), "{}");
    put(
      missionPath(folder, "execution_log.json"),
      JSON.stringify([{ totalTokens: 10 }, { totalTokens: 5 }]),
    );
  }

  it("把結果提交到 DB 看板，留下 submit.md", async () => {
    givenExecuted("local_5", 5);
    asMock(missionBoardRepo.submitResult).mockResolvedValue({ subIndex: 0 });

    await commitNext();

    expect(asMock(missionBoardRepo.submitResult)).toHaveBeenCalledWith({
      taskId: 5,
      submitter: MISSION_PLATFORM_ACTOR,
      resultCid: "uploaded-cid",
      consumedTokens: 15n,
    });
    const submit = memFs.files.get(missionPath("local_5", "submit.md")) ?? "";
    expect(submit).toMatch(/- Consumed Tokens: 15/);
    expect(submit).toMatch(/- Submitted At: /);
  });

  // Info: (20261015 - Luphia) 舊鏈資料夾的 taskId 5 ≠ DB 任務 5
  it("不提交舊鏈資料夾", async () => {
    givenExecuted("0xMissionBoard_5", 5);

    await commitNext();

    expect(asMock(missionBoardRepo.submitResult)).not.toHaveBeenCalled();
  });

  it("提交失敗時寫 commit_failed_*，不寫 submit.md", async () => {
    givenExecuted("local_5", 5);
    asMock(missionBoardRepo.submitResult).mockRejectedValue(
      new Error("MissionBoard: Task not accepting submissions"),
    );

    await commitNext();

    const names = [...memFs.files.keys()].map((f) => path.basename(f));
    expect(names.some((n) => n.startsWith("commit_failed_"))).toBe(true);
    expect(memFs.files.has(missionPath("local_5", "submit.md"))).toBe(false);
  });
});

describe("MissionCloser", () => {
  function givenSubmitted(folder: string, taskId: number) {
    put(
      missionPath(folder, "meta.json"),
      JSON.stringify({ taskId: String(taskId) }),
    );
    put(missionPath(folder, "result.md"), "{}");
    put(
      missionPath(folder, "submit.md"),
      "- Consumed Tokens: 100\n- Submitted At: 2026-10-01T00:01:40.000Z\n",
    );
  }

  it("DB 已關閉：寫 close.md（懸賞以十進位計）", async () => {
    givenSubmitted("local_5", 5);
    asMock(missionBoardRepo.getTask).mockResolvedValue(
      task({ status: MISSION_TASK_STATUS.CLOSED, submissionCount: 1 }),
    );

    await closeNext();

    const close = memFs.files.get(missionPath("local_5", "close.md")) ?? "";
    expect(close).toMatch(/- Status: Approved/);
    expect(close).toMatch(/- Revenue Gained \(ISC\): 2\n/);
    expect(close).toMatch(/- Time Spent \(seconds\): 100\.00/);
  });

  it("最新提交被拒、未滿三次：改名讓 executor 重跑", async () => {
    givenSubmitted("local_5", 5);
    asMock(missionBoardRepo.getTask).mockResolvedValue(
      task({ status: MISSION_TASK_STATUS.PENDING_REVIEW, submissionCount: 1 }),
    );
    asMock(missionBoardRepo.getSubmission).mockResolvedValue({
      isRejected: true,
    });

    await closeNext();

    expect(asMock(missionBoardRepo.getSubmission)).toHaveBeenCalledWith(5, 0);
    expect(memFs.files.has(missionPath("local_5", "result.md"))).toBe(false);
    expect(memFs.files.has(missionPath("local_5", "submit.md"))).toBe(false);
  });

  it("被拒滿三次：寫 giveup.md", async () => {
    givenSubmitted("local_5", 5);
    asMock(missionBoardRepo.getTask).mockResolvedValue(
      task({ status: MISSION_TASK_STATUS.PENDING_REVIEW, submissionCount: 3 }),
    );
    asMock(missionBoardRepo.getSubmission).mockResolvedValue({
      isRejected: true,
    });

    await closeNext();

    expect(memFs.files.has(missionPath("local_5", "giveup.md"))).toBe(true);
  });

  it("等待審核中：什麼都不寫", async () => {
    givenSubmitted("local_5", 5);
    asMock(missionBoardRepo.getTask).mockResolvedValue(
      task({ status: MISSION_TASK_STATUS.PENDING_REVIEW, submissionCount: 1 }),
    );
    asMock(missionBoardRepo.getSubmission).mockResolvedValue({
      isRejected: false,
    });

    await closeNext();

    expect(memFs.files.has(missionPath("local_5", "close.md"))).toBe(false);
    expect(memFs.files.has(missionPath("local_5", "result.md"))).toBe(true);
  });

  it("不讀舊鏈資料夾的狀態", async () => {
    givenSubmitted("0xMissionBoard_5", 5);

    await closeNext();

    expect(asMock(missionBoardRepo.getTask)).not.toHaveBeenCalled();
  });
});

describe("IssueValidator", () => {
  function givenReviewable(status: number) {
    asMock(missionBoardRepo.listTasksByStatus).mockResolvedValue([
      // Info: (20261015 - Luphia) 沒有提交的已關閉任務（被取消的）要被濾掉
      task({ id: 4, status: MISSION_TASK_STATUS.CLOSED, submissionCount: 0 }),
      task({ status, submissionCount: 2 }),
    ]);
    asMock(missionBoardRepo.getSubmission).mockResolvedValue({
      resultCid: "result-cid",
      isRejected: false,
    });
    asMock(storageService.recoverLaria).mockResolvedValue(
      Buffer.from(JSON.stringify({ summary: "a well-formed result" })),
    );
  }

  it("查 PendingReview / Closed 任務，核可最新提交並寫 approved.<subIndex>.md", async () => {
    givenReviewable(MISSION_TASK_STATUS.PENDING_REVIEW);

    await validateNext();

    expect(asMock(missionBoardRepo.listTasksByStatus)).toHaveBeenCalledWith([
      MISSION_TASK_STATUS.PENDING_REVIEW,
      MISSION_TASK_STATUS.CLOSED,
    ]);
    expect(asMock(missionBoardRepo.getSubmission)).toHaveBeenCalledTimes(1);
    expect(asMock(missionBoardRepo.getSubmission)).toHaveBeenCalledWith(5, 1);
    expect(asMock(missionBoardRepo.approveSubmission)).toHaveBeenCalledWith(
      5,
      1,
    );
    expect(memFs.files.has(issuePath("local_5", "approved.1.md"))).toBe(true);
    expect(memFs.files.has(issuePath("local_5", "1.md"))).toBe(true);
  });

  it("AI 信心不足時拒絕並寫 rejected.<subIndex>.md", async () => {
    givenReviewable(MISSION_TASK_STATUS.PENDING_REVIEW);
    const { ChatService } = jest.requireMock("@/services/chat.service") as {
      ChatService: ReturnType<typeof jest.fn>;
    };
    ChatService.mockImplementationOnce(() => ({
      generateRaw: jest.fn(async () =>
        JSON.stringify({ confidence: 10, reason: "wrong" }),
      ),
    }));

    await validateNext();

    expect(asMock(missionBoardRepo.rejectSubmission)).toHaveBeenCalledWith(
      5,
      1,
    );
    expect(memFs.files.has(issuePath("local_5", "rejected.1.md"))).toBe(true);
  });

  // Info: (20261015 - Luphia) DB 已核可、本地 approved 檔遺失 → 補回，不再呼叫核可
  it("已關閉但缺本地紀錄時補寫 approved 檔", async () => {
    givenReviewable(MISSION_TASK_STATUS.CLOSED);

    await validateNext();

    expect(asMock(missionBoardRepo.approveSubmission)).not.toHaveBeenCalled();
    expect(
      memFs.files.get(issuePath("local_5", "approved.1.md")) ?? "",
    ).toMatch(/Recovered/);
  });

  it("已有本地紀錄就不重複驗證", async () => {
    givenReviewable(MISSION_TASK_STATUS.PENDING_REVIEW);
    put(issuePath("local_5", "approved.1.md"), "done");

    await validateNext();

    expect(asMock(storageService.recoverLaria)).not.toHaveBeenCalled();
    expect(asMock(missionBoardRepo.approveSubmission)).not.toHaveBeenCalled();
  });

  it("別人已核可（Invalid status）時優雅略過並寫本地紀錄", async () => {
    givenReviewable(MISSION_TASK_STATUS.PENDING_REVIEW);
    asMock(missionBoardRepo.approveSubmission).mockRejectedValue(
      new Error("MissionBoard: Invalid status"),
    );

    await validateNext();

    expect(
      memFs.files.get(issuePath("local_5", "approved.1.md")) ?? "",
    ).toMatch(/Already approved/);
  });
});
