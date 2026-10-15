import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import fs from "fs/promises";
import { orderIssueService } from "@/services/order.issue.service";
import { ORDER_STATUS } from "@/constants/status";

/**
 * Info: (20261015 - Luphia) 訂單執行狀態要讀到「自己的」任務資料夾。
 *
 * 區塊鏈退役後，舊鏈 taskId（`{合約位址}_{id}`，從 0 起）與 DB taskId（`local_{id}`，從 1 起）
 * 會撞號。原本以後綴比對，新訂單的 task 5 會讀到舊訂單 task 5 的 approved 檔，
 * 把一張還在跑的訂單顯示成已完成。
 */

jest.mock("fs/promises", () => ({
  __esModule: true,
  default: { readdir: jest.fn(), readFile: jest.fn() },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const FILES: Record<string, string[]> = {
  "0xabc_5": ["approved.0.md", "context.json"],
  local_5: ["execution_log.json", "context.json"],
};
const CONTEXT: Record<string, string> = {
  "0xabc_5": JSON.stringify({ orderId: "old-order" }),
  local_5: JSON.stringify({ orderId: "new-order" }),
};

beforeEach(() => {
  jest.clearAllMocks();
  asMock(fs.readdir).mockImplementation(async (dir: unknown) => {
    const folder = String(dir).split("/").pop() ?? "";
    return folder in FILES ? FILES[folder] : Object.keys(FILES);
  });
  asMock(fs.readFile).mockImplementation(async (file: unknown) => {
    const parts = String(file).split("/");
    const folder = parts[parts.length - 2];
    if (folder in CONTEXT) return CONTEXT[folder];
    throw new Error("ENOENT");
  });
});

describe("getExecutionStatusesForOrders", () => {
  it("新訂單讀到 local_ 資料夾，不被同號的舊鏈資料夾誤配", async () => {
    const [result] = await orderIssueService.getExecutionStatusesForOrders([
      { id: "new-order", status: ORDER_STATUS.EXECUTING, mission: '["5"]' },
    ]);
    expect(result.executionStatus).toBe(ORDER_STATUS.EXECUTING);
  });

  it("舊訂單仍讀到自己的舊鏈資料夾", async () => {
    const [result] = await orderIssueService.getExecutionStatusesForOrders([
      { id: "old-order", status: ORDER_STATUS.COMPLETED, mission: '["5"]' },
    ]);
    expect(result.executionStatus).toBe(ORDER_STATUS.COMPLETED);
  });
});
