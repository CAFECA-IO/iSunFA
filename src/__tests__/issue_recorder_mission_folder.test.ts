import path from "path";
import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
import { issueRecorderService } from "@/services/issue.recorder.service";
import { orderRepo } from "@/repositories/order.repo";
import { analysisRepo } from "@/repositories/analysis.repo";
import { ORDER_STATUS } from "@/constants/status";
import { missionFolderName } from "@/constants/mission_board";

declare const jest: typeof JestType;

/**
 * Info: (20261015 - Luphia) recorder 在 DB 看板與舊鏈資料夾並存時的對應規則。
 *
 * 舊鏈的 taskId 從 0 起算、DB 流水號從 1 起算，同一個數字兩邊都會出現：
 * ISSUE_DIR 底下可能同時有 `0x…_8` 與 `local_8`，而舊訂單的 `Order.mission`
 * 裡也還留著舊鏈的 taskId。這裡釘住兩件事：
 *
 * 1. 「同一張訂單的其他任務做完沒」要找**同一個前綴**的資料夾，
 *    不能用 `endsWith("_8")` 撿到另一個看板的同號任務。
 * 2. DB 看板的任務不走 `mission contains` 反查（會配到同號的舊訂單），
 *    舊鏈資料夾則保留原本的反查。
 */

const ISSUE_DIR = "issues";
const MISSION_DIR = "missions";
const ORDER_ID = "order-1";

const issuePath = (...parts: string[]) =>
  path.join(process.cwd(), ISSUE_DIR, ...parts);

const fsState = {
  folders: [] as string[],
  folderFiles: new Map<string, string[]>(),
  existing: new Set<string>(),
  contents: new Map<string, string>(),
  written: new Map<string, string>(),
};

jest.mock("fs/promises", () => ({
  readdir: jest.fn(
    async (target: string, options?: { withFileTypes?: true }) =>
      options?.withFileTypes
        ? fsState.folders.map((name) => ({ name, isDirectory: () => true }))
        : (fsState.folderFiles.get(path.basename(target)) ?? []),
  ),
  access: jest.fn(async (target: string) => {
    if (!fsState.existing.has(target)) throw new Error(`ENOENT: ${target}`);
  }),
  readFile: jest.fn(async (target: string) => {
    const content = fsState.contents.get(target);
    if (content === undefined) throw new Error(`ENOENT: ${target}`);
    return content;
  }),
  writeFile: jest.fn(async (target: string, content: string) => {
    fsState.written.set(target, content);
  }),
}));

jest.mock("@/services/env.service", () => ({
  getPriorityEnvConfig: jest.fn(async () => ({ ISSUE_DIR, MISSION_DIR })),
}));

jest.mock("@/repositories/order.repo", () => ({
  orderRepo: {
    findFirst: jest.fn(),
    findMany: jest.fn(async () => []),
    update: jest.fn(async () => ({})),
  },
}));

jest.mock("@/repositories/analysis.repo", () => ({
  analysisRepo: {
    findById: jest.fn(async () => null),
    findByOrderId: jest.fn(async () => null),
    findByOrderIdAndTaskId: jest.fn(async () => null),
    updateAnalysisResult: jest.fn(async () => ({})),
    syncAnalysisTags: jest.fn(async () => ({})),
  },
}));

jest.mock("@/services/notification.service", () => ({
  notifyAnalysisCompleted: jest.fn(async () => undefined),
  notifyAnalysisFailed: jest.fn(async () => undefined),
}));

jest.mock("@/skills/utils/document_parser_db_sync", () => ({
  syncDocumentResultToDatabase: jest.fn(async () => ({})),
}));

jest.mock("@/repositories/transaction.repo", () => ({
  TransactionRepo: {
    run: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function givenApproved(folder: string, context: Record<string, unknown>) {
  fsState.folderFiles.set(folder, ["approved.0.md"]);
  fsState.contents.set(
    issuePath(folder, "context.json"),
    JSON.stringify(context),
  );
  fsState.contents.set(
    issuePath(folder, "0.md"),
    JSON.stringify({ summary: "done" }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  fsState.folders = [];
  fsState.folderFiles = new Map();
  fsState.existing = new Set();
  fsState.contents = new Map();
  fsState.written = new Map();
});

describe("IssueRecorder：同訂單的其他任務要在同一個看板上找", () => {
  it("找 local_8 的旗標，不會撿到舊鏈的 0x…_8", async () => {
    const legacy = "0xMissionBoard_8";
    const current = missionFolderName(7);
    const sibling = missionFolderName(8);
    // Info: (20261015 - Luphia) 舊鏈的同號資料夾排在前面，`endsWith("_8")` 會先撿到它
    fsState.folders = [legacy, current, sibling];
    fsState.folderFiles.set(legacy, []);
    givenApproved(current, { orderId: ORDER_ID, analysisId: "analysis-7" });
    fsState.existing.add(issuePath(sibling, "recorded.flag"));

    asMock(analysisRepo.findById).mockResolvedValue({
      id: "analysis-7",
      orderId: ORDER_ID,
      userId: "user-1",
      type: "other_analysis",
    });
    asMock(orderRepo.findFirst).mockResolvedValue({
      id: ORDER_ID,
      userId: "user-1",
      status: ORDER_STATUS.EXECUTING,
      mission: JSON.stringify(["7", "8"]),
      tokens: 0,
      data: { category: "other_analysis" },
    });

    await issueRecorderService.processNext();

    expect(asMock(orderRepo.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ORDER_ID },
        data: expect.objectContaining({ status: ORDER_STATUS.COMPLETED }),
      }),
    );
  });
});

describe("IssueRecorder：mission contains 反查只留給舊鏈資料夾", () => {
  it("DB 看板的任務缺 orderId 時不反查舊訂單", async () => {
    const folder = missionFolderName(9);
    fsState.folders = [folder];
    givenApproved(folder, {});

    await issueRecorderService.processNext();

    expect(asMock(orderRepo.findMany)).not.toHaveBeenCalled();
    expect(fsState.written.get(issuePath(folder, "recorded.flag"))).toMatch(
      /No matching order/,
    );
  });

  it("舊鏈資料夾仍以 mission contains 反查", async () => {
    const folder = "0xMissionBoard_9";
    fsState.folders = [folder];
    givenApproved(folder, {});

    await issueRecorderService.processNext();

    expect(asMock(orderRepo.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { mission: { contains: '"9"' } },
      }),
    );
  });
});
