import fs from "fs/promises";
import path from "path";
import { ORDER_STATUS } from "@/constants/status";

export class OrderIssueService {
  async getExecutionStatusesForOrders<
    T extends { status: string; mission?: unknown },
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
              let anyPending = false;
              let anyExecuting = false;

              let totalConfidence = 0;
              let confidenceCount = 0;

              for (const taskId of taskIds) {
                const folderName = folders.find((f) =>
                  f.endsWith(`_${taskId}`),
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
                if (taskStatus === ORDER_STATUS.PENDING) anyPending = true;
                if (taskStatus === ORDER_STATUS.EXECUTING) anyExecuting = true;
                if (taskStatus !== ORDER_STATUS.COMPLETED) allCompleted = false;

                if (taskConf !== null) {
                  totalConfidence += taskConf;
                  confidenceCount++;
                }
              }

              if (anyFailed) executionStatus = ORDER_STATUS.FAILED;
              else if (anyPending) executionStatus = ORDER_STATUS.PENDING;
              else if (anyExecuting) executionStatus = ORDER_STATUS.EXECUTING;
              else if (allCompleted) executionStatus = ORDER_STATUS.COMPLETED;

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
