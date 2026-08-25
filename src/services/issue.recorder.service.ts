import fs from "fs/promises";
import path from "path";
import { orderRepo } from "@/repositories/order.repo";
import { analysisRepo } from "@/repositories/analysis.repo";
import {
  notifyAnalysisCompleted,
  notifyAnalysisFailed,
} from "@/services/notification.service";
import { ORDER_STATUS } from "@/constants/status";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
import {
  syncDocumentResultToDatabase,
  IAggregatedDocumentResult,
} from "@/skills/utils/document_parser_db_sync";
import { getPriorityEnvConfig } from "@/services/env.service";
import type { JSONValue } from "@/validators";
import { MoneyUtil } from "@/lib/utils/money";
import { SystemWorkerSource } from "@/constants/enums";
import { TransactionRepo } from "@/repositories/transaction.repo";

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

        let analysis = null;

        try {
          // Info: (20260522 - Julian) Find analysis first by analysisId if present
          if (localContextObj.analysisId) {
            analysis = await analysisRepo.findById(localContextObj.analysisId);
          }

          // Info: (20260506 - Luphia) Read mission.json to get the exact orderId
          // Info: (20260728 - Tzuhan) 優先序:analysis.orderId → context.json 的 orderId(發單時寫入,唯一可靠關聯)
          // Info: (20260728 - Tzuhan) → mission.json(舊資料)→ mission contains 反查(最後手段,可能誤配重複 taskId 的舊單)
          let orderId = "";
          if (analysis) {
            orderId = analysis.orderId;
          } else if (typeof localContextObj.orderId === "string") {
            orderId = localContextObj.orderId;
          } else {
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
            // Info: (20260728 - Tzuhan) 防呆:taskId 為鏈上流水號,本地鏈重置後會重複 —
            // Info: (20260728 - Tzuhan) 多筆匹配時取最新建立者並警告(舊行為 findFirst 無排序,曾誤配舊單)
            const candidates = await orderRepo.findMany({
              where: {
                mission: { contains: `"${taskId}"` },
              },
              orderBy: { createdAt: "desc" },
              take: 2,
            });
            if (candidates.length > 1) {
              console.warn(
                `[MissionRecorder] ⚠️ Task ID ${taskId} matches multiple orders (stale chain reset?); using the newest.`,
              );
            }
            order = candidates[0] ?? null;
          }

          if (!order) {
            if (
              localContextObj.source === SystemWorkerSource.AMORTIZATION_WORKER
            ) {
              console.log(
                `[MissionRecorder] Task ID ${taskId} is an amortization task. Bypassing order requirement.`,
              );
            } else {
              console.warn(
                `[MissionRecorder] Task ID ${taskId} has no Order in database.`,
              );
              // Info: (20260420 - Luphia) mark flag anyway to skip
              await fs.writeFile(flagFile, "No matching order found", "utf8");
              continue;
            }
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
              Record<string, unknown> | undefined;
            if (usage?.totalTokens)
              tokensConsumed = MoneyUtil.toDecimal(
                usage.totalTokens as string | number,
              ).toNumber();
            else if (usage?.total_tokens)
              tokensConsumed = MoneyUtil.toDecimal(
                usage.total_tokens as string | number,
              ).toNumber();
            else if (parsedResult?.tokens)
              tokensConsumed = MoneyUtil.toDecimal(
                parsedResult.tokens as string | number,
              ).toNumber();
            else if (parsedResult?.totalTokens)
              tokensConsumed = MoneyUtil.toDecimal(
                parsedResult.totalTokens as string | number,
              ).toNumber();
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
          if (!analysis && order) {
            analysis = await analysisRepo.findByOrderIdAndTaskId(
              order.id,
              taskId,
            );

            if (!analysis) {
              analysis = await analysisRepo.findByOrderId(order.id);
            }
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

            /**
             * Info: (20260821 - Luphia) 結果落地後通知小鈴鐺（ADR 021 補充）。
             * `notifyAnalysisCompleted` 永不拋錯且以 dedupeKey 冪等——
             * recorder 重試同一個 task 不會發第二則，通知失敗也不會
             * 影響已經寫入的結果。
             */
            await notifyAnalysisCompleted({
              userId: analysis.userId,
              analysisId: analysis.id,
              analysisType: analysis.type,
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

            // Info: (20260516 - Luphia) Extract accountBookId dynamically from the original order
            const orderDataObj = order
              ? (order.data as Record<string, unknown>) || {}
              : {};
            const payloadData =
              (orderDataObj.data as Record<string, unknown>) || {};
            /**
             * Info: (20260529 - Tzuhan)
             * 作為最終的 Fallback 機制。專門為了沒有實體 Order Payload 的內部背景任務設計（例如：AMORTIZATION_WORKER），
             * 確保從本地上下文中依然能萃取出正確的帳本 ID。
             */
            const dbAccountBookId =
              payloadData.accountBookId ||
              orderDataObj.accountBookId ||
              localContextObj.accountBookId;

            if (
              parsedResult &&
              parsedResult.dbSyncPayload &&
              typeof parsedResult.dbSyncPayload === "object"
            ) {
              const payload = parsedResult.dbSyncPayload as Record<
                string,
                Record<string, unknown>
              >;
              await TransactionRepo.run(async (tx) => {
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

                  const targetAccountBookId = (dbAccountBookId ||
                    fileResult.accountBookId) as string;

                  await syncDocumentResultToDatabase(
                    {
                      fileId: fileIdToSync,
                      accountBookId: targetAccountBookId,
                      result:
                        fileResult as unknown as IAggregatedDocumentResult,
                      voucherIdContext:
                        localContextObj.voucherId ||
                        (fileResult.voucherIdContext as string | undefined),
                      esgRecordIdContext:
                        localContextObj.esgRecordId ||
                        (fileResult.esgRecordIdContext as string | undefined),
                      journalIdContext:
                        localContextObj.journalId ||
                        (fileResult.journalIdContext as string | undefined),
                    },
                    tx,
                  );
                }
              });

              console.log(
                `[MissionRecorder] Synced document results to DB for Task ID ${taskId}`,
              );
            } else {
              const orderDataObj = order
                ? (order.data as Record<string, unknown>) || {}
                : {};
              const payloadData =
                (orderDataObj.data as Record<string, unknown>) || {};
              const orderCategory =
                payloadData.category || orderDataObj.category;
              if (
                orderCategory === ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS ||
                localContextObj.source ===
                  SystemWorkerSource.AMORTIZATION_WORKER
              ) {
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

          if (order) {
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
                    /**
                     * Info: (20260525 - Luphia) Prevent bypass bug when order.mission is null/empty during execution.
                     * If the order was currently EXECUTING or PAID, do not force COMPLETED since tasks are still being issued or processed.
                     */
                    if (
                      order.status === ORDER_STATUS.EXECUTING ||
                      order.status === ORDER_STATUS.PAID
                    ) {
                      newOrderStatus = ORDER_STATUS.EXECUTING;
                    } else {
                      newOrderStatus = ORDER_STATUS.COMPLETED;
                    }
                  }
                } catch {
                  newOrderStatus = ORDER_STATUS.COMPLETED;
                }
              }
            }

            /**
             * Info: (20260825 - Julian) 這一輪是不是「轉成失敗」的那一次（計畫書 D16）。
             *
             * 在 update 之前算：update 之後 `order.status` 這份記憶體副本
             * 仍是舊值，但把判斷寫在後面會讓下一個人以為它讀的是新值。
             *
             * 已經是 FAILED 的訂單被重掃時不重發 —— 而真正保證「只發一則」
             * 的是 `analysis-failed:<orderId>` 這把 dedupeKey，
             * 這個旗標只是省掉那些注定撞唯一鍵的往返。
             */
            const becameFailed =
              newOrderStatus === ORDER_STATUS.FAILED &&
              order.status !== ORDER_STATUS.FAILED;

            // Info: (20260517 - Luphia) Update Order Status accurately based on DB sync result and accumulate tokens
            await orderRepo.update({
              where: { id: order.id },
              data: {
                status: newOrderStatus,
                tokens: newTokens > 0 ? newTokens : undefined,
              },
            });
            console.log(
              `[MissionRecorder] Successfully updated Order ${order.id} to ${newOrderStatus}.`,
            );

            /**
             * Info: (20260825 - Julian) 終局失敗才通知（計畫書 D16）。
             *
             * `failed_*.md` 的第 1、2 次是系統內部重試，使用者收到只會是雜訊；
             * 這裡綁的是 `Order.status` 真的被寫成 FAILED 的那一次狀態轉換。
             * `notifyAnalysisFailed` 永不拋錯 —— 失敗處理路徑上再拋一個錯，
             * 只會把一個已經很難查的情境變得更難查。
             */
            if (becameFailed) {
              await notifyAnalysisFailed({
                userId: order.userId,
                orderId: order.id,
              });
            }
          }

          // Info: (20260420 - Luphia) Write flag to prevent reprocessing
          const flagContent =
            finalOrderStatus === ORDER_STATUS.FAILED
              ? `Recorded with FAILED status at ${new Date().toISOString()}. Reason: ${syncErrorMessage}`
              : `Recorded at ${new Date().toISOString()}`;
          await fs.writeFile(flagFile, flagContent, "utf8");

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
