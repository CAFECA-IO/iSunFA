import path from "path";
import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
import Decimal from "decimal.js";
import { processAmortization } from "@/services/cron/amortization.worker.service";
import { missionBoardRepo } from "@/repositories/mission_board.repo";
import { SystemWorkerSource } from "@/constants/enums";

declare const jest: typeof JestType;

/**
 * Info: (20261015 - Luphia) 攤銷 worker 的冪等改由 DB 看板判斷（取代鏈上 revert + 事件回掃）。
 *
 * 同一個 (帳本, 月份, 科目, 排程) 只能有一筆任務：已有任務且本地結果在 → 跳過；
 * 有任務但本地檔遺失 → 用同一個 taskId 重建；沒有任務 → 以攤銷 worker 身分建立。
 */

const MISSION_DIR = "missions";
const existing = new Set<string>();
const written = new Map<string, string>();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    amortizationSchedule: {
      findMany: jest.fn(async () => [
        {
          id: "schedule-1",
          accountBookId: "book-1",
          assetAccountCode: "1260",
          expenseAccountCode: "6125",
          totalAmount: "1200",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
        },
      ]),
    },
  },
}));

jest.mock("@/lib/utils/amortization_math", () => ({
  calculateStatelessAmortizationForMonth: jest.fn(() => new Decimal(100)),
}));

jest.mock("@/services/env.service", () => ({
  getPriorityEnvConfig: jest.fn(async () => ({ MISSION_DIR })),
}));

jest.mock("fs/promises", () => ({
  mkdir: jest.fn(async () => undefined),
  access: jest.fn(async (target: string) => {
    if (!existing.has(target)) throw new Error(`ENOENT: ${target}`);
  }),
  writeFile: jest.fn(async (target: string, content: string) => {
    written.set(target, content);
  }),
}));

jest.mock("@/repositories/mission_board.repo", () => ({
  missionBoardRepo: {
    createTask: jest.fn(),
    findTaskByContentCid: jest.fn(async () => null),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;
const missionPath = (...parts: string[]) =>
  path.join(process.cwd(), MISSION_DIR, ...parts);

beforeEach(() => {
  jest.clearAllMocks();
  existing.clear();
  written.clear();
});

describe("AmortizationWorker：DB 看板冪等", () => {
  it("沒有任務時以攤銷 worker 身分建立，寫進 local_<id>", async () => {
    asMock(missionBoardRepo.createTask).mockResolvedValue({ id: 30 });

    await processAmortization();

    expect(asMock(missionBoardRepo.createTask)).toHaveBeenCalledWith({
      creator: SystemWorkerSource.AMORTIZATION_WORKER,
      contentCid: expect.stringMatching(/^0x[0-9a-f]{64}$/),
      reward: 0n,
    });
    expect(written.has(missionPath("local_30", "result.md"))).toBe(true);
    expect(
      JSON.parse(written.get(missionPath("local_30", "meta.json")) ?? "{}"),
    ).toEqual(expect.objectContaining({ taskId: "30" }));
  });

  it("同一個雜湊每次算出來都一樣", async () => {
    asMock(missionBoardRepo.createTask).mockResolvedValue({ id: 30 });

    await processAmortization();
    await processAmortization();

    const [first, second] = asMock(
      missionBoardRepo.findTaskByContentCid,
    ).mock.calls.map((call) => call[0]);
    expect(first).toBe(second);
  });

  it("任務已存在且本地結果在：跳過", async () => {
    asMock(missionBoardRepo.findTaskByContentCid).mockResolvedValue({
      id: 31,
    });
    existing.add(missionPath("local_31", "result.md"));

    await processAmortization();

    expect(asMock(missionBoardRepo.createTask)).not.toHaveBeenCalled();
    expect(written.size).toBe(0);
  });

  it("任務已存在但本地檔遺失：沿用同一個 taskId 重建", async () => {
    asMock(missionBoardRepo.findTaskByContentCid).mockResolvedValue({
      id: 31,
    });

    await processAmortization();

    expect(asMock(missionBoardRepo.createTask)).not.toHaveBeenCalled();
    expect(written.has(missionPath("local_31", "result.md"))).toBe(true);
  });
});
