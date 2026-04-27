import fs from "fs/promises";
import path from "path";

export class OrderIssueService {
  async getExecutionStatusesForOrders<T extends { status: string; mission?: unknown }>(orders: T[]): Promise<(T & { executionStatus: string; executionConfidence: number | null })[]> {
    const issueDirBase = process.env.ISSUE_DIR || "issues";
    const issuesDir = path.join(process.cwd(), issueDirBase);
    let folders: string[] = [];
    try {
      folders = await fs.readdir(issuesDir);
    } catch {
      // Info: (20260427 - Luphia) issues directory might not exist yet
    }

    return Promise.all(orders.map(async (order) => {
      let executionStatus = "PENDING";
      let executionConfidence: number | null = null;

      if (order.status === "EXECUTING" || order.status === "COMPLETED") {
        try {
          const taskIds = order.mission ? JSON.parse(order.mission as string) : [];
          if (Array.isArray(taskIds) && taskIds.length > 0) {
            let allCompleted = true;
            let anyFailed = false;
            let anyPending = false;
            let anyExecuting = false;

            let totalConfidence = 0;
            let confidenceCount = 0;

            for (const taskId of taskIds) {
              const folderName = folders.find(f => f.endsWith(`_${taskId}`));
              let taskStatus = "PENDING";
              let taskConf: number | null = null;

              if (folderName) {
                const folderPath = path.join(issuesDir, folderName);
                try {
                  const files = await fs.readdir(folderPath);

                  const hasApproved = files.some((f: string) => f.startsWith("approved.") && f.endsWith(".md"));
                  const hasRejected = files.some((f: string) => f.startsWith("rejected.") && f.endsWith(".md"));
                  const hasSubmit = files.includes("submit.executor.json") || files.includes("submit.md");
                  const hasExecutionLog = files.includes("execution_log.json");
                  const failedMdFiles = files.filter((f: string) => f.startsWith("failed_") && f.endsWith(".md"));

                  if (hasApproved) taskStatus = "COMPLETED";
                  else if (hasSubmit) taskStatus = "COMPLETED";
                  else if (hasExecutionLog) taskStatus = "EXECUTING";
                  else if (failedMdFiles.length >= 3) taskStatus = "FAILED";
                  else taskStatus = "PENDING";

                  let confidenceFileToRead = "";
                  if (hasApproved) {
                    confidenceFileToRead = files.find((f: string) => f.startsWith("approved.") && f.endsWith(".md")) || "";
                  } else if (hasRejected) {
                    confidenceFileToRead = files.find((f: string) => f.startsWith("rejected.") && f.endsWith(".md")) || "";
                  }

                  if (confidenceFileToRead) {
                    try {
                      const content = await fs.readFile(path.join(folderPath, confidenceFileToRead), "utf8");
                      const match = content.match(/- AI Confidence:\s*(\d+)/);
                      if (match && match[1]) {
                        taskConf = parseInt(match[1], 10);
                      }
                    } catch { }
                  }
                } catch {
                  // Info: (20260427 - Luphia) Folder exists but readdir failed, treat as PENDING
                }
              }

              if (taskStatus === "FAILED") anyFailed = true;
              if (taskStatus === "PENDING") anyPending = true;
              if (taskStatus === "EXECUTING") anyExecuting = true;
              if (taskStatus !== "COMPLETED") allCompleted = false;

              if (taskConf !== null) {
                totalConfidence += taskConf;
                confidenceCount++;
              }
            }

            if (anyFailed) executionStatus = "FAILED";
            else if (anyPending) executionStatus = "PENDING";
            else if (anyExecuting) executionStatus = "EXECUTING";
            else if (allCompleted) executionStatus = "COMPLETED";

            if (confidenceCount > 0) {
              executionConfidence = Math.round(totalConfidence / confidenceCount);
            }
          }
        } catch {
          // Info: (20260427 - Luphia) Ignore parse errors
        }
      }

      return {
        ...order,
        executionStatus,
        executionConfidence
      };
    }));
  }
}

export const orderIssueService = new OrderIssueService();
