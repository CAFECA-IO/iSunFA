import path from "path";
import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
import { processNext } from "@/services/issue.service";
import { orderRepo } from "@/repositories/order.repo";
import { analysisRepo } from "@/repositories/analysis.repo";
import { missionBoardRepo } from "@/repositories/mission_board.repo";
import { ORDER_STATUS } from "@/constants/status";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
import { MISSION_PLATFORM_ACTOR } from "@/constants/mission_board";

declare const jest: typeof JestType;

/**
 * Info: (20261015 - Luphia) IssueService 改向 DB 看板發任務（取代鏈上 createTask）。
 *
 * 釘三件事：任務由平台身分建立、懸賞照成本換算（不再被 minReward 墊高）、
 * 本地資料夾用 `local_<id>`；以及「接續上次建好的任務」只接續 DB 看板發的那一種 ——
 * 舊鏈的 missionTaskId 與 DB 流水號可能同號，沿用會把訂單接到別人的任務上。
 */

const ISSUE_DIR = "issues";
const ORDER_ID = "order-1";

const written = new Map<string, string>();

jest.mock("fs/promises", () => ({
  mkdir: jest.fn(async () => undefined),
  writeFile: jest.fn(async (target: string, content: string) => {
    written.set(target, content);
  }),
}));

jest.mock("@/services/env.service", () => ({
  getPriorityEnvConfig: jest.fn(async () => ({ ISSUE_DIR })),
}));

jest.mock("@/lib/analysis/pricing", () => ({
  getAnalysisCost: jest.fn(() => 10),
}));

jest.mock("@/services/storage.service", () => ({
  storageService: { uploadLaria: jest.fn(async () => "mission-cid") },
}));

jest.mock("@/repositories/order.repo", () => ({
  orderRepo: {
    findFirst: jest.fn(),
    update: jest.fn(async () => ({})),
  },
}));

jest.mock("@/repositories/analysis.repo", () => ({
  analysisRepo: {
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({})),
    update: jest.fn(async () => ({})),
  },
}));

jest.mock("@/repositories/account_book.repo", () => ({
  accountBookRepo: { getAccountBookById: jest.fn(async () => null) },
}));

jest.mock("@/repositories/esg.repo", () => ({
  esgRepo: { getEsgCoefficients: jest.fn(async () => []) },
}));

jest.mock("@/repositories/mission_board.repo", () => ({
  missionBoardRepo: { createTask: jest.fn() },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

function givenPaidOrder(files: { hash: string; name: string }[]) {
  asMock(orderRepo.findFirst).mockResolvedValue({
    id: ORDER_ID,
    userId: "user-1",
    status: ORDER_STATUS.PAID,
    data: {
      data: { category: ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS, files },
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  written.clear();
});

describe("IssueService：向 DB 看板發任務", () => {
  it("以平台身分建立任務，懸賞 = 成本 / 2 / 任務數（wei 刻度）", async () => {
    givenPaidOrder([
      { hash: "h1", name: "a.pdf" },
      { hash: "h2", name: "b.pdf" },
    ]);
    asMock(missionBoardRepo.createTask)
      .mockResolvedValueOnce({ id: 11 })
      .mockResolvedValueOnce({ id: 12 });

    await expect(processNext()).resolves.toBe("11");

    expect(asMock(missionBoardRepo.createTask)).toHaveBeenCalledTimes(2);
    expect(asMock(missionBoardRepo.createTask)).toHaveBeenCalledWith({
      creator: MISSION_PLATFORM_ACTOR,
      contentCid: "mission-cid",
      reward: 2500000000000000000n,
    });
    expect(
      written.has(
        path.join(process.cwd(), ISSUE_DIR, "local_11", "mission.json"),
      ),
    ).toBe(true);
    expect(
      JSON.parse(
        written.get(
          path.join(process.cwd(), ISSUE_DIR, "local_12", "context.json"),
        ) ?? "{}",
      ),
    ).toEqual(expect.objectContaining({ orderId: ORDER_ID }));
    expect(asMock(orderRepo.update)).toHaveBeenLastCalledWith({
      where: { id: ORDER_ID },
      data: { mission: JSON.stringify(["11", "12"]) },
    });
    // Info: (20261015 - Luphia) 分析紀錄要帶上看板標記，下次接續時才認得
    expect(asMock(analysisRepo.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          missionTaskId: "11",
          missionFolder: "local_11",
        }),
      }),
    );
  });

  it("接續上次在 DB 看板建好的任務，不重建", async () => {
    givenPaidOrder([{ hash: "h1", name: "a.pdf" }]);
    asMock(analysisRepo.findMany).mockResolvedValue([
      {
        id: "analysis-1",
        data: {
          data: { files: [{ hash: "h1" }] },
          missionTaskId: "3",
          missionFolder: "local_3",
        },
      },
    ]);

    await expect(processNext()).resolves.toBe("3");

    expect(asMock(missionBoardRepo.createTask)).not.toHaveBeenCalled();
  });

  it("舊鏈留下的 missionTaskId（沒有看板標記）不接續，改建新任務", async () => {
    givenPaidOrder([{ hash: "h1", name: "a.pdf" }]);
    asMock(analysisRepo.findMany).mockResolvedValue([
      {
        id: "analysis-1",
        data: { data: { files: [{ hash: "h1" }] }, missionTaskId: "3" },
      },
    ]);
    asMock(missionBoardRepo.createTask).mockResolvedValue({ id: 20 });

    await expect(processNext()).resolves.toBe("20");

    expect(asMock(missionBoardRepo.createTask)).toHaveBeenCalledTimes(1);
  });

  it("建立任務失敗時把訂單退回 PAID 以便重試", async () => {
    givenPaidOrder([{ hash: "h1", name: "a.pdf" }]);
    asMock(missionBoardRepo.createTask).mockRejectedValue(new Error("db down"));

    await expect(processNext()).rejects.toThrow("db down");

    expect(asMock(orderRepo.update)).toHaveBeenLastCalledWith({
      where: { id: ORDER_ID },
      data: { status: ORDER_STATUS.PAID },
    });
  });
});
