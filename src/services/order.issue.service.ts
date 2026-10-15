import fs from "fs/promises";
import path from "path";
import { ORDER_STATUS } from "@/constants/status";
import { missionFolderName } from "@/constants/mission_board";

/**
 * Info: (20261015 - Luphia) 找出某張訂單某個 taskId 的 ISSUE_DIR 資料夾。
 *
 * 原本是 `folders.find(f => f.endsWith("_" + taskId))`。區塊鏈退役後 taskId 有兩個來源：
 * 舊鏈的流水號（資料夾 `{合約位址}_{id}`，從 0 起）與 DB 流水號（`local_{id}`，從 1 起），
 * 同一個數字兩邊都會有——後綴比對會把新訂單接到舊訂單的資料夾上，顯示別人的執行狀態。
 *
 * 每個資料夾的 context.json 都記著所屬 orderId（issue.service 自 20260728 起一律寫入），
 * 因此以「後綴相符且 orderId 相符」為準；舊到沒有 context.json 的資料夾才退回後綴比對，
 * 而且只在只有一個候選時採用。
 */
async function resolveTaskFolder(
  issuesDir: string,
  folders: readonly string[],
  taskId: string,
  orderId: string,
): Promise<string | undefined> {
  const candidates = folders.filter((f) => f.endsWith(`_${taskId}`));
  if (candidates.length === 0) return undefined;

  const unknownOwner: string[] = [];
  for (const folder of candidates) {
    try {
      const raw = await fs.readFile(
        path.join(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ issuesDir,
          folder,
          "context.json",
        ),
        "utf8",
      );
      const context = JSON.parse(raw) as { orderId?: unknown };
      if (context.orderId === orderId) return folder;
      if (typeof context.orderId !== "string") unknownOwner.push(folder);
    } catch {
      unknownOwner.push(folder);
    }
  }

  // Info: (20261015 - Luphia) 新格式資料夾一定有 context.json；沒有的只可能是舊鏈資料
  const legacy = unknownOwner.filter((f) => f !== missionFolderName(taskId));
  return legacy.length === 1 ? legacy[0] : undefined;
}

export class OrderIssueService {
  async getExecutionStatusesForOrders<
    T extends { id: string; status: string; mission?: unknown },
  >(
    orders: T[],
  ): Promise<
    (T & { executionStatus: string; executionConfidence: number | null })[]
  > {
    const issueDirBase = process.env.ISSUE_DIR || "issues";
    const issuesDir = path.join(
      /* webpackIgnore: true */ /* turbopackIgnore: true */ process.cwd(),
      issueDirBase,
    );
    let folders: string[] = [];
    try {
      folders = await fs.readdir(issuesDir);
    } catch {
      // Info: (20260427 - Luphia) issues directory might not exist yet
    }

    return Promise.all(
      orders.map(async (order) => {
        let executionStatus: string =
          order.status === ORDER_STATUS.CANCEL
            ? ORDER_STATUS.CANCEL
            : ORDER_STATUS.PENDING;
        let executionConfidence: number | null = null;

        if (
          order.status === ORDER_STATUS.EXECUTING ||
          order.status === ORDER_STATUS.COMPLETED ||
          order.status === ORDER_STATUS.PAID
        ) {
          try {
            const taskIds = order.mission
              ? JSON.parse(order.mission as string)
              : [];
            if (Array.isArray(taskIds) && taskIds.length > 0) {
              let allCompleted = true;
              let anyFailed = false;
              let anyExecuting = false;

              let totalConfidence = 0;
              let confidenceCount = 0;

              for (const taskId of taskIds) {
                const folderName = await resolveTaskFolder(
                  issuesDir,
                  folders,
                  String(taskId),
                  order.id,
                );
                let taskStatus: string = ORDER_STATUS.PENDING;
                let taskConf: number | null = null;

                if (folderName) {
                  const folderPath = path.join(
                    /* webpackIgnore: true */ /* turbopackIgnore: true */ issuesDir,
                    folderName,
                  );
                  try {
                    const files = await fs.readdir(folderPath);

                    const hasApproved = files.some(
                      (f: string) =>
                        f.startsWith("approved.") && f.endsWith(".md"),
                    );
                    const hasRejected = files.some(
                      (f: string) =>
                        f.startsWith("rejected.") && f.endsWith(".md"),
                    );
                    const hasSubmit =
                      files.includes("submit.executor.json") ||
                      files.includes("submit.md");
                    const hasExecutionLog =
                      files.includes("execution_log.json");
                    const failedMdFiles = files.filter(
                      (f: string) =>
                        f.startsWith("failed_") && f.endsWith(".md"),
                    );

                    if (hasApproved) taskStatus = ORDER_STATUS.COMPLETED;
                    else if (hasSubmit) taskStatus = ORDER_STATUS.COMPLETED;
                    else if (hasExecutionLog)
                      taskStatus = ORDER_STATUS.EXECUTING;
                    else if (failedMdFiles.length >= 3)
                      taskStatus = ORDER_STATUS.FAILED;
                    else taskStatus = ORDER_STATUS.EXECUTING;

                    let confidenceFileToRead = "";
                    if (hasApproved) {
                      confidenceFileToRead =
                        files.find(
                          (f: string) =>
                            f.startsWith("approved.") && f.endsWith(".md"),
                        ) || "";
                    } else if (hasRejected) {
                      confidenceFileToRead =
                        files.find(
                          (f: string) =>
                            f.startsWith("rejected.") && f.endsWith(".md"),
                        ) || "";
                    }

                    if (confidenceFileToRead) {
                      try {
                        const content = await fs.readFile(
                          path.join(
                            /* webpackIgnore: true */ /* turbopackIgnore: true */ folderPath,
                            confidenceFileToRead,
                          ),
                          "utf8",
                        );
                        const match = content.match(/- AI Confidence:\s*(\d+)/);
                        if (match && match[1]) {
                          taskConf = parseInt(match[1], 10);
                        }
                      } catch {}
                    }
                  } catch {
                    // Info: (20260427 - Luphia) Folder exists but readdir failed, treat as PENDING
                  }
                }

                if (taskStatus === ORDER_STATUS.FAILED) anyFailed = true;
                if (taskStatus === ORDER_STATUS.EXECUTING) anyExecuting = true;
                if (taskStatus !== ORDER_STATUS.COMPLETED) allCompleted = false;

                if (taskConf !== null) {
                  totalConfidence += taskConf;
                  confidenceCount++;
                }
              }

              if (anyFailed) executionStatus = ORDER_STATUS.FAILED;
              else if (allCompleted) executionStatus = ORDER_STATUS.COMPLETED;
              else if (
                anyExecuting ||
                (confidenceCount > 0 && confidenceCount < taskIds.length)
              ) {
                // Info: (20260517 - Luphia) If any task is executing, or some (but not all) are completed, the whole order is EXECUTING
                executionStatus = ORDER_STATUS.EXECUTING;
              } else executionStatus = ORDER_STATUS.PENDING;

              if (confidenceCount > 0) {
                executionConfidence = Math.round(
                  totalConfidence / confidenceCount,
                );
              }
            }
          } catch {
            // Info: (20260427 - Luphia) Ignore parse errors
          }
        }

        return {
          ...order,
          executionStatus,
          executionConfidence,
        };
      }),
    );
  }
}

export const orderIssueService = new OrderIssueService();
