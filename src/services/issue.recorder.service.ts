import fs from "fs/promises";
import path from "path";
import { orderRepo } from "@/repositories/order.repo";
import { analysisRepo } from "@/repositories/analysis.repo";
import { Prisma } from "@/generated/client";
import { ORDER_STATUS } from "@/constants/status";
import { syncDocumentResultToDatabase } from "@/skills/utils/document_parser_db_sync";
import { getPriorityEnvConfig } from "@/services/env.service";

export class IssueRecorderService {
  async processNext() {
    console.log(
      "[MissionRecorder] Scanning ISSUE_DIR for approved submissions to record...",
    );

    const setupConfig = await getPriorityEnvConfig();
    const issueDirBase = setupConfig.ISSUE_DIR || "issues";
    const issueDirPath = path.join(process.cwd(), issueDirBase);

    let recordedTask = false;

    try {
      const folders = await fs.readdir(issueDirPath, { withFileTypes: true });

      for (const folder of folders) {
        if (!folder.isDirectory()) continue;
        const folderName = folder.name;
        const taskDir = path.join(issueDirPath, folderName);

        const parts = folderName.split("_");
        if (parts.length < 2) continue; // Info: (20260427 - Luphia) Skip invalid formats
        const taskId = parts[parts.length - 1];

        // Info: (20260420 - Luphia) Find approved.*.md files
        const files = await fs.readdir(taskDir);
        const approvedFile = files.find(
          (f) => f.startsWith("approved.") && f.endsWith(".md"),
        );

        if (!approvedFile) continue;

        // Info: (20260420 - Luphia) Extract subIndex
        const subIndexStr = approvedFile.split(".")[1];
        const resultFile = path.join(taskDir, `${subIndexStr}.md`);
        const flagFile = path.join(taskDir, "recorded.flag");

        try {
          await fs.access(flagFile);
          // Info: (20260420 - Luphia) Already recorded to database
          continue;
        } catch {
          /* Info: (20260426 - Luphia) proceeding to record */
        }

        recordedTask = true;
        console.log(
          `[MissionRecorder] Found approved task to record: Task ID ${taskId}`,
        );

        try {
          // Info: (20260420 - Luphia) Find the Order
          const order = await orderRepo.findFirst({
            where: {
              mission: { contains: `"${taskId}"` },
              status: { in: [ORDER_STATUS.EXECUTING, ORDER_STATUS.COMPLETED] },
            },
          });

          if (!order) {
            console.warn(
              `[MissionRecorder] Task ID ${taskId} has no EXECUTING/COMPLETED Order in database.`,
            );
            // Info: (20260420 - Luphia) mark flag anyway to skip
            await fs.writeFile(flagFile, "No matching order found", "utf8");
            continue;
          }

          // Info: (20260420 - Luphia) Read the actual result text
          const resultContent = await fs.readFile(resultFile, "utf8");

          // Info: (20260420 - Luphia) Update Order Status loosely
          await orderRepo.update({
            where: { id: order.id },
            data: { status: ORDER_STATUS.COMPLETED },
          });

          /**
           * Info: (20260420 - Luphia) Wait, if it has an Analysis, update Analysis.result
           * "Cancel, temporarily keep mission and task table". Thus Analysis might still exist.
           * Let's find analysis by orderId and update its result
           */
          let analysis = await analysisRepo.findFirst({
            where: {
              orderId: order.id,
              data: { path: ["missionTaskId"], equals: taskId },
            },
          });

          if (!analysis) {
            analysis = await analysisRepo.findFirst({
              where: { orderId: order.id },
            });
          }

          if (analysis) {
            let parsedResult: unknown = resultContent;
            try {
              parsedResult = JSON.parse(resultContent);
            } catch {
              // Info: (20260420 - Luphia) fallback to string
            }

            await analysisRepo.update({
              where: { id: analysis.id },
              data: { result: parsedResult as Prisma.InputJsonValue },
            });

            // Info: (20260420 - Luphia) Save Analysis tags if present
            if (typeof parsedResult === "object" && parsedResult !== null) {
              const tags = (parsedResult as Record<string, unknown>).tags;
              if (Array.isArray(tags)) {
                await analysisRepo.syncAnalysisTags(
                  analysis.id,
                  tags.map((t) => String(t)),
                );
              }
            }
          }

          // Info: (20260426 - Luphia) Sync document results to DB via dbSyncPayload from IPFS result (moved from Executor)
          try {
            let parsedResult: Record<string, unknown> | undefined = undefined;
            try {
              parsedResult = JSON.parse(resultContent) as Record<
                string,
                unknown
              >;
            } catch {}

            if (
              parsedResult &&
              parsedResult.dbSyncPayload &&
              typeof parsedResult.dbSyncPayload === "object"
            ) {
              const payload = parsedResult.dbSyncPayload as Record<
                string,
                Record<string, unknown>
              >;
              for (const fileId of Object.keys(payload)) {
                const fileResult = payload[fileId];
                await syncDocumentResultToDatabase(
                  fileId,
                  fileResult.accountBookId as string,
                  fileResult as unknown as import("@/skills/utils/document_parser_db_sync").IAggregatedDocumentResult,
                );
              }
              console.log(
                `[MissionRecorder] Synced document results to DB for Task ID ${taskId}`,
              );
            }
          } catch (e) {
            console.error(
              `[MissionRecorder] Failed to sync document results to DB for Task ID ${taskId}:`,
              e,
            );
          }

          // Info: (20260420 - Luphia) Write flag to prevent reprocessing
          await fs.writeFile(
            flagFile,
            `Recorded at ${new Date().toISOString()}`,
            "utf8",
          );
          console.log(
            `[MissionRecorder] Successfully updated Order ${order.id} to COMPLETED.`,
          );

          break; // Info: (20260420 - Luphia) process one at a time
        } catch (err) {
          console.error(
            `[MissionRecorder] Error recording Task ID ${taskId}:`,
            err,
          );
        }
      }
    } catch (e) {
      console.log("[MissionRecorder] Invalid ISSUE_DIR or none exists yet.", e);
    }

    if (!recordedTask) {
      console.log("[MissionRecorder] No approved tasks pending record update.");
    }
  }
}

export const issueRecorderService = new IssueRecorderService();
