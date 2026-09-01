import fs from "fs/promises";
import path from "path";
import { orderRepo } from "@/repositories/order.repo";
import { analysisRepo } from "@/repositories/analysis.repo";
import {
  notifyAnalysisCompleted,
  notifyAnalysisFailed,
} from "@/services/notification.service";
import { ORDER_STATUS, isTerminalOrderStatus } from "@/constants/status";
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

        /**
         * Info: (20260825 - Julian) 沒有 `approved.*.md` 不代表沒事發生（計畫書 D18）。
         *
         * 上鏈提交被連續拒絕 3 次時，`mission.closer.service.ts` 會在
         * MISSION_DIR 寫下 `giveup.md`，executor / commitor / closer 之後都跳過
         * 這筆任務。而這裡只掃 `approved.*.md` —— 於是這筆任務對本服務**永遠不存在**。
         *
         * 後果不是「少一則通知」：本服務是全站**唯一**寫入訂單終態的地方
         *（mission.* 與 issue.validator 都不碰 `ORDER_STATUS`），所以訂單會永遠卡在
         * `EXECUTING`／`PAID`，`becameFailed` 不成立，使用者既收不到完成也收不到失敗。
         * 他付了錢、送出分析，然後那件事安靜地消失。
         */
        if (!approvedFile) {
          const gaveUp = await this.recordGiveUp({
            taskDir,
            folderName,
            taskId,
            missionDirBase: setupConfig.MISSION_DIR || "missions",
          });
          if (gaveUp) {
            recordedTask = true;
            break; // Info: (20260825 - Julian) 與成功路徑一致：一輪只處理一筆
          }
          continue;
        }

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
          /**
           * Info: (20260825 - Julian) 訂單與 analysis 的解析抽成共用方法。
           *
           * 放棄（`giveup.md`）那條路要用同一套優先序找訂單，而那套規則裡有
           * 三處帶日期的註解記著踩過的坑（taskId 是鏈上流水號、本地鏈重置後會重複；
           * 舊資料只有 mission.json）。抄第二份的代價不是重複，是**兩份會分岔** ——
           * 而分岔的症狀是「有些任務失敗了卻找不到訂單」，沒有人會發現。
           */
          const resolved = await this.resolveAnalysisAndOrder(
            taskDir,
            taskId,
            localContextObj,
          );
          analysis = resolved.analysis;
          const order = resolved.order;

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
              | Record<string, unknown>
              | undefined;
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

          /**
           * Info: (20260826 - Julian) 完成通知移到 DB 同步**之後**（review B2）。
           *
           * 原本它緊接在 `updateAnalysisResult` 後面無條件發出，而下面那段
           * DB 同步失敗時（CERTIFICATE_ANALYSIS 少了 `dbSyncPayload`、
           * 或同步本身拋錯）會把訂單寫成 FAILED，於是同一份工作再發一則
           * 失敗通知 —— 使用者**同時**收到「已完成」與「失敗」。兩則的
           * `dedupeKey` 都是永久唯一鍵，收不回也蓋不掉。
           *
           * ## 條件為什麼是 `finalOrderStatus`，不是 `newOrderStatus`
           *
           * review 建議移到 `orderRepo.update` 之後、改判
           * `newOrderStatus === COMPLETED`。那樣會修掉這個缺陷，但同時
           * **靜默漏掉通知**：`Analysis.orderId` 沒有唯一約束，一張訂單可以有
           * 多個分析（`findByOrderIdAndTaskId` 以 `missionTaskId` 對應），
           * 而 recorder 一次只處理一個 task。前面幾個 task 完成時
           * `newOrderStatus` 是 `EXECUTING`，只有最後一個才是 `COMPLETED` ——
           * 於是前面每一份分析的完成通知都不會發，而使用者無從得知。
           *
           * `finalOrderStatus` 才是「**這一輪**有沒有踩到同步失敗」：它初始為
           * COMPLETED，只被上面那段同步邏輯改成 FAILED。用它就能既擋掉矛盾，
           * 又保住逐 task 的粒度。
           *
           * ## 但 `finalOrderStatus` 只看得到這一個任務（review 阻擋級）
           *
           * 上面那段論證只在**單一任務內**成立。`finalOrderStatus` 從不讀
           * `order.status`，所以跨任務、跨訂單狀態的兩種情況它一概看不到：
           *
           * 1. 使用者已 `CANCEL` 訂單，之後某個任務的 `approved.*.md` 被記錄、
           *    同步成功 —— 他收到「你的分析已完成，點擊查看結果」
           * 2. 多任務訂單的前一個任務同步失敗、訂單已寫成 FAILED 並發過
           *    「你的分析失敗了」，後一個任務完成時再發一則「已完成」
           *
           * 兩則的 `dedupeKey` 都是永久唯一鍵，收不回也蓋不掉 —— 與這段註解
           * 開頭要修的缺陷是同一種傷害，只是換了一個觸發路徑。
           *
           * 所以第三個條件補上終態守門，並刻意用 `isTerminalOrderStatus`
           * 而不是多列幾個 `!==`：訂單狀態的更新（下方）與放棄路徑都用同一支，
           * 三處同源。D30 的教訓就是「兩處各寫一串比較遲早會分岔」。
           *
           * `COMPLETED` 也擋：訂單已經完成表示使用者已經被通知過了，
           * 而同一份 analysis 的重複通知本來就由 dedupeKey 擋住 ——
           * 會走到這裡的只有「同一張訂單、另一份 analysis，而訂單已宣告完成」，
           * 那個狀態本身就不該存在（`allDone` 要求每個 taskId 都有旗標）。
           *
           * ## 為什麼不放進下面的 `if (order)`
           *
           * `analysis` 可以在 `order` 為 null 時存在，而那個情況**確實走得到這裡**
           * —— 但比原本這段註解說的窄，值得寫清楚：
           *
           * 一般路徑上「orderId 反查不到訂單」到不了這一行，上游的 `if (!order)`
           * 會寫旗標並 `continue`。唯一走得到、而 `order` 仍為 null 的，是
           * `context.json` 帶 `source: AMORTIZATION_WORKER` 的內部任務 ——
           * 那條路刻意繞過訂單要求（攤銷分錄沒有訂單）。
           *
           * 所以終態守門寫成 `!(order && …)` 而不是 `order && !…`：
           * `order` 為 null 時**照發**。後者會讓攤銷任務的完成通知靜靜消失。
           */
          if (
            analysis &&
            finalOrderStatus !== ORDER_STATUS.FAILED &&
            !(order && isTerminalOrderStatus(order.status))
          ) {
            /**
             * Info: (20260821 - Luphia) `notifyAnalysisCompleted` 永不拋錯且以
             * dedupeKey 冪等 —— recorder 重試同一個 task 不會發第二則，
             * 通知失敗也不會影響已經寫入的結果。
             */
            await notifyAnalysisCompleted({
              userId: analysis.userId,
              analysisId: analysis.id,
              analysisType: analysis.type,
            });
          }

          if (order) {
            // Info: (20260517 - Luphia) Calculate accumulated tokens
            const newTokens = (order.tokens || 0) + tokensConsumed;

            let newOrderStatus = order.status;
            /**
             * Info: (20260826 - Julian) 終態一律不重算（review）。
             *
             * 原本只擋 FAILED，於是已經 `COMPLETED` 的訂單在某個任務的
             * DB 同步失敗時會被改回 FAILED；已 `CANCEL` 的也會被改成 FAILED。
             * 這是放棄路徑那個缺陷的**原版** —— 那一處是從這裡複製過去的，
             * 所以兩處要一起修，否則下次還是會被複製一次。
             */
            if (!isTerminalOrderStatus(newOrderStatus)) {
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
                // Info: (20260825 - Julian) 帶上類別，讓通知說得出是哪一份報告
                analysisType: analysis?.type,
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

  /**
   * Info: (20260825 - Julian) 依既有優先序把一筆任務對應回 `Analysis` 與 `Order`。
   *
   * 這段原本內嵌在成功路徑裡，`recordGiveUp` 出現後成為第二個消費者，
   * 因此抽出來共用。優先序與各層 fallback 的理由保留原註解 —— 那是踩過的坑，
   * 不是可以簡化的樣板。
   */
  private async resolveAnalysisAndOrder(
    taskDir: string,
    taskId: string,
    localContextObj: Record<string, string>,
  ): Promise<{
    analysis: Awaited<ReturnType<typeof analysisRepo.findById>> | null;
    order: Awaited<ReturnType<typeof orderRepo.findFirst>> | null;
  }> {
    let analysis = null;
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

    return { analysis, order };
  }

  /**
   * Info: (20260825 - Julian) 被放棄的任務也要走到終態（計畫書 D18）。
   *
   * `mission.closer.service.ts` 在上鏈提交被連續拒絕 3 次時寫下 `giveup.md`，
   * 那是一個**終局**：executor 與 commitor 之後都不再碰這筆任務。
   * 但它不會產生 `approved.*.md`，而本服務原本只認那個檔案。
   *
   * ## 為什麼修在這裡，而不是讓 closer 自己標記訂單
   *
   * 本服務目前是全站唯一寫入訂單終態的地方 —— `mission.planner` /
   * `executor` / `commitor` / `closer` 與 `issue.validator` 都不碰 `ORDER_STATUS`。
   * 那是個有價值的性質：要回答「訂單為什麼變成這個狀態」時只有一個地方要讀。
   * 讓 closer 也寫一次會換來兩個寫入者，而它們對「什麼算終局」的判斷會慢慢分岔。
   *
   * ## 冪等
   *
   * 三層，由外而內：`recorded.flag` 擋重掃、`order.status` 已是 FAILED 就不重發、
   * 而真正保證「一張訂單只發一則」的是 `analysis-failed:<orderId>` 這把
   * dedupeKey（永久唯一鍵）。前兩層只是省掉注定撞鍵的往返。
   *
   * @returns 這一輪有沒有真的處理掉一筆（讓呼叫端決定要不要結束本 tick）
   */
  private async recordGiveUp(params: {
    taskDir: string;
    folderName: string;
    taskId: string;
    missionDirBase: string;
  }): Promise<boolean> {
    const giveupPath = path.join(
      process.cwd(),
      params.missionDirBase,
      params.folderName,
      "giveup.md",
    );
    try {
      await fs.access(giveupPath);
    } catch {
      // Info: (20260825 - Julian) 沒放棄也沒核可：還在跑，不是本服務的事
      return false;
    }

    const flagFile = path.join(params.taskDir, "recorded.flag");
    try {
      await fs.access(flagFile);
      return false;
    } catch {
      /* Info: (20260825 - Julian) proceeding to record the give-up */
    }

    let localContextObj: Record<string, string> = {};
    try {
      const contextContent = await fs.readFile(
        path.join(params.taskDir, "context.json"),
        "utf8",
      );
      localContextObj = JSON.parse(contextContent);
    } catch {
      // Info: (20260825 - Julian) context.json 可能不存在（與成功路徑一致）
    }

    try {
      const { analysis, order } = await this.resolveAnalysisAndOrder(
        params.taskDir,
        params.taskId,
        localContextObj,
      );

      if (!order) {
        /**
         * Info: (20260825 - Julian) 找不到訂單就沒有收件人，通知不了。
         *
         * 仍然寫旗標：不寫的話每一輪都會重掃這筆、重查一次資料庫，
         * 而答案永遠一樣。旗標的內容寫明原因，讓「為什麼這筆沒通知」
         * 在檔案系統上留得下線索。
         */
        console.warn(
          `[MissionRecorder] Given-up Task ID ${params.taskId} has no Order in database.`,
        );
        await fs.writeFile(
          flagFile,
          `Given up at ${new Date().toISOString()}, but no matching order was found.`,
          "utf8",
        );
        return false;
      }

      /**
       * Info: (20260826 - Julian) **已在終態就不動**，而不是「不是 FAILED 就寫成 FAILED」（review）。
       *
       * 原本的條件擋得住重複標記，擋不住覆寫：多任務訂單已經 `COMPLETED`、
       * 或使用者已經 `CANCEL` 時，一個任務被放棄會把整張訂單改成 FAILED
       * 並發一則「你的分析失敗了」—— 而那兩件事都是把已經定案的事實推翻。
       *
       * 用 `isTerminalOrderStatus` 而不是多列幾個 `!==`：同一道守門在成功路徑
       * 也要有一份（見下方 `becameFailed`），兩處各寫一串比較遲早會分岔。
       */
      if (!isTerminalOrderStatus(order.status)) {
        await orderRepo.update({
          where: { id: order.id },
          data: { status: ORDER_STATUS.FAILED },
        });
        /**
         * Info: (20260825 - Julian) 通知放在狀態寫入之後。
         *
         * 反過來的話，通知發出去而狀態寫入失敗，使用者會收到一則
         * 「你的分析失敗了」而訂單在畫面上還顯示執行中 —— 兩個事實互相矛盾，
         * 而他沒有辦法判斷哪一個是真的。
         */
        await notifyAnalysisFailed({
          userId: order.userId,
          orderId: order.id,
          // Info: (20260825 - Julian) 帶上類別，讓通知說得出是哪一份報告
          analysisType: analysis?.type,
        });
        console.log(
          `[MissionRecorder] Task ${params.taskId} was given up; Order ${order.id} marked FAILED and the user was notified.`,
        );
      }

      /**
       * Info: (20260826 - Julian) 旗標要寫**實際發生的事**，不是預期發生的事。
       *
       * 這行原本寫死 "set to FAILED"，而訂單已在終態時我們根本沒動它 ——
       * 那會在檔案系統上留下一句與資料庫不符的紀錄，而這個旗標存在的
       * 唯一理由就是「事後查得出這筆為什麼這樣處理」。
       */
      await fs.writeFile(
        flagFile,
        isTerminalOrderStatus(order.status)
          ? `Recorded give-up at ${new Date().toISOString()}. Order ${order.id} left untouched (already ${order.status}).`
          : `Recorded give-up at ${new Date().toISOString()}. Order ${order.id} set to FAILED.`,
        "utf8",
      );
      return true;
    } catch (error) {
      /**
       * Info: (20260825 - Julian) 這裡**不寫旗標**：寫了就等於把這筆任務
       * 永久標成處理過，而它其實沒有。下一輪重試比靜默放棄好。
       */
      console.error(
        `[MissionRecorder] Error recording give-up for Task ID ${params.taskId}:`,
        error,
      );
      return false;
    }
  }
}

export const issueRecorderService = new IssueRecorderService();
