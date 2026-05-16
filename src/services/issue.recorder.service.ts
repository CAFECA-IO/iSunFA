import fs from "fs/promises";
import path from "path";
import { orderRepo } from "@/repositories/order.repo";
import { analysisRepo } from "@/repositories/analysis.repo";
import { ORDER_STATUS } from "@/constants/status";
import { syncDocumentResultToDatabase } from "@/skills/utils/document_parser_db_sync";
import { getPriorityEnvConfig } from "@/services/env.service";
import type { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";
import type { JSONValue } from "@/validators";

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
          // Info: (20260506 - Luphia) Read mission.json to get the exact orderId
          let orderId = "";
          try {
            const missionContent = await fs.readFile(
              path.join(taskDir, "mission.json"),
              "utf8",
            );
            const missionData = JSON.parse(missionContent);
            if (missionData && missionData.orderId) {
              orderId = missionData.orderId;
            }
          } catch {
            console.warn(
              `[MissionRecorder] Could not read mission.json for Task ID ${taskId}`,
            );
          }

          let order = null;
          if (orderId) {
            order = await orderRepo.findFirst({
              where: {
                id: orderId,
              },
            });
          } else {
            // Info: (20260506 - Luphia) Fallback for older missions
            order = await orderRepo.findFirst({
              where: {
                mission: { contains: `"${taskId}"` },
              },
            });
          }

          if (!order) {
            console.warn(
              `[MissionRecorder] Task ID ${taskId} has no Order in database.`,
            );
            // Info: (20260420 - Luphia) mark flag anyway to skip
            await fs.writeFile(flagFile, "No matching order found", "utf8");
            continue;
          }

          // Info: (20260420 - Luphia) Read the actual result text
          const resultContent = await fs.readFile(resultFile, "utf8");

          let tokensConsumed = 0;
          try {
            const parsedResult = JSON.parse(resultContent) as Record<
              string,
              unknown
            >;
            const usage = parsedResult?.usage as
              | Record<string, unknown>
              | undefined;
            if (usage?.totalTokens) tokensConsumed = Number(usage.totalTokens);
            else if (usage?.total_tokens)
              tokensConsumed = Number(usage.total_tokens);
            else if (parsedResult?.tokens)
              tokensConsumed = Number(parsedResult.tokens);
            else if (parsedResult?.totalTokens)
              tokensConsumed = Number(parsedResult.totalTokens);
          } catch {}

          try {
            // Info: (20260510 - Luphia) Try reading from missions directory if local execution
            const missionLogPath = path.join(
              process.cwd(),
              setupConfig.MISSION_DIR || "missions",
              folderName,
              "execution_log.json",
            );
            const logStr = await fs.readFile(missionLogPath, "utf8");
            const logs = JSON.parse(logStr);
            if (Array.isArray(logs)) {
              let logTokens = 0;
              for (const log of logs) {
                if (log.totalTokens) logTokens += Number(log.totalTokens);
              }
              if (logTokens > 0) tokensConsumed = logTokens;
            }
          } catch {}

          let finalOrderStatus: string = ORDER_STATUS.COMPLETED;
          let syncErrorMessage = "";

          /**
           * Info: (20260420 - Luphia) Wait, if it has an Analysis, update Analysis.result
           * "Cancel, temporarily keep mission and task table". Thus Analysis might still exist.
           * Let's find analysis by orderId and update its result
           */
          let analysis = await analysisRepo.findByOrderIdAndTaskId(
            order.id,
            taskId,
          );

          if (!analysis) {
            analysis = await analysisRepo.findByOrderId(order.id);
          }

          if (analysis) {
            let parsedResult: JSONValue = resultContent;
            try {
              // Info: (20260511 - Julian) 解析 JSON 格式
              parsedResult = JSON.parse(resultContent) as JSONValue;
            } catch {
              // Info: (20260420 - Luphia) fallback to string
            }

            await analysisRepo.updateAnalysisResult(analysis.id, parsedResult);

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

            let localContextObj: Record<string, string> = {};
            try {
              const contextContent = await fs.readFile(
                path.join(taskDir, "context.json"),
                "utf8",
              );
              localContextObj = JSON.parse(contextContent);
            } catch {
              // Info: (20260506 - Luphia) context.json might not exist
            }

            // Info: (20260516 - Luphia) Extract accountBookId dynamically from the original order
            const orderDataObj = (order.data as Record<string, unknown>) || {};
            const payloadData =
              (orderDataObj.data as Record<string, unknown>) || {};
            const dbAccountBookId =
              payloadData.accountBookId || orderDataObj.accountBookId;

            if (
              parsedResult &&
              parsedResult.dbSyncPayload &&
              typeof parsedResult.dbSyncPayload === "object"
            ) {
              const payload = parsedResult.dbSyncPayload as Record<
                string,
                Record<string, unknown>
              >;
              for (const recordKey of Object.keys(payload)) {
                const fileResult = payload[recordKey];

                if (!fileResult.journal) {
                  console.warn(
                    `[MissionRecorder] ⚠️ 警告：Task ID ${taskId} 的 dbSyncPayload (recordKey: ${recordKey}) 缺少 journal 屬性。請確認 MissionExecutor 是否正確打包了 JOURNAL_PARSING 的結果。`,
                  );
                }

                const fileIdToSync =
                  typeof fileResult.fileId === "string"
                    ? fileResult.fileId
                    : recordKey;
                await syncDocumentResultToDatabase({
                  fileId: fileIdToSync,
                  accountBookId: (dbAccountBookId ||
                    fileResult.accountBookId) as string,
                  result: fileResult as unknown as IAggregatedDocumentResult,
                  voucherIdContext:
                    localContextObj.voucherId ||
                    (fileResult.voucherIdContext as string | undefined),
                  esgRecordIdContext:
                    localContextObj.esgRecordId ||
                    (fileResult.esgRecordIdContext as string | undefined),
                  journalIdContext:
                    localContextObj.journalId ||
                    (fileResult.journalIdContext as string | undefined),
                });
              }
              console.log(
                `[MissionRecorder] Synced document results to DB for Task ID ${taskId}`,
              );
            } else {
              const orderDataObj =
                (order.data as Record<string, unknown>) || {};
              const payloadData =
                (orderDataObj.data as Record<string, unknown>) || {};
              const orderCategory =
                payloadData.category || orderDataObj.category;
              if (orderCategory === "CERTIFICATE_ANALYSIS") {
                finalOrderStatus = ORDER_STATUS.FAILED;
                syncErrorMessage =
                  "Expected dbSyncPayload for CERTIFICATE_ANALYSIS but none was found in result.";
                console.warn(
                  `[MissionRecorder] ⚠️ ${syncErrorMessage} Task ID: ${taskId}`,
                );
              }
            }
          } catch (e) {
            finalOrderStatus = ORDER_STATUS.FAILED;
            syncErrorMessage = `DB Sync Error: ${e instanceof Error ? e.message : String(e)}`;
            console.error(
              `[MissionRecorder] Failed to sync document results to DB for Task ID ${taskId}:`,
              e,
            );
          }

          // Info: (20260517 - Luphia) Calculate accumulated tokens
          const newTokens = (order.tokens || 0) + tokensConsumed;

          let newOrderStatus = order.status;
          if (newOrderStatus !== ORDER_STATUS.FAILED) {
            if (finalOrderStatus === ORDER_STATUS.FAILED) {
              newOrderStatus = ORDER_STATUS.FAILED;
            } else {
              // Info: (20260517 - Luphia) Check if all sub-tasks are completed
              try {
                const taskIds = order.mission
                  ? JSON.parse(order.mission as string)
                  : [];
                if (Array.isArray(taskIds) && taskIds.length > 0) {
                  let allDone = true;
                  for (const tId of taskIds) {
                    if (tId === taskId) continue; // Info: (20260517 - Luphia) Current task is implicitly done

                    const folderEntry = folders.find((f) =>
                      f.name.endsWith(`_${tId}`),
                    );
                    if (!folderEntry) {
                      allDone = false;
                      break;
                    }

                    const tFlagPath = path.join(
                      issueDirPath,
                      folderEntry.name,
                      "recorded.flag",
                    );
                    try {
                      await fs.access(tFlagPath);
                    } catch {
                      allDone = false;
                      break;
                    }
                  }
                  newOrderStatus = allDone
                    ? ORDER_STATUS.COMPLETED
                    : ORDER_STATUS.EXECUTING;
                } else {
                  newOrderStatus = ORDER_STATUS.COMPLETED;
                }
              } catch {
                newOrderStatus = ORDER_STATUS.COMPLETED;
              }
            }
          }

          // Info: (20260517 - Luphia) Update Order Status accurately based on DB sync result and accumulate tokens
          await orderRepo.update({
            where: { id: order.id },
            data: {
              status: newOrderStatus,
              tokens: newTokens > 0 ? newTokens : undefined,
            },
          });

          // Info: (20260420 - Luphia) Write flag to prevent reprocessing
          const flagContent =
            finalOrderStatus === ORDER_STATUS.FAILED
              ? `Recorded with FAILED status at ${new Date().toISOString()}. Reason: ${syncErrorMessage}`
              : `Recorded at ${new Date().toISOString()}`;
          await fs.writeFile(flagFile, flagContent, "utf8");
          console.log(
            `[MissionRecorder] Successfully updated Order ${order.id} to ${finalOrderStatus}.`,
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
