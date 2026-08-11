import fs from "fs/promises";
import path from "path";
import { getPriorityEnvConfig } from "@/services/env.service";
import { ChatService } from "@/services/chat.service";
import { EsgGenerationSource, CountryCode } from "@/constants/enums";
import { CurrencyCode } from "@/constants/exchange_rate";
import { VoucherPipelineOrchestrator } from "@/services/voucher.pipeline.orchestrator";
import { skillRegistry } from "@/skills";
import { IMissionDefinition } from "@/lib/worker/mission.generator";
import { ITaskDefinition } from "@/lib/worker/task.generator";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { Schema } from "@google/generative-ai";
import { JSONValue } from "@/validators/common";
import { acquireMissionLock, isMissionLocked } from "@/lib/worker/mission_lock";
import { MISSION_MAX_EXECUTION_FAILURES } from "@/constants/mission_executor";
import { LLM_WORKER_TIMEOUT_MS } from "@/constants/llm";

/**
 * Info: (20260516 - Luphia) 禁止在此處撰寫工作流程相關邏輯
 * 工作流程邏輯應記錄於 skills 資料夾內，此函式根據任務類別呼叫對應的 skill
 * This executor MUST remain generic and stateless.
 * DO NOT add any specific task execution logic (e.g., routing intercepts, fallback mechanisms for specific types) here.
 * All domain-specific logic MUST be implemented within the respective skills under `src/skills`.
 */

export async function processNext() {
  console.log("[MissionExecutor] Scanning MISSION_DIR for tasks to execute...");

  const setupConfig = await getPriorityEnvConfig();
  const missionDirBase = setupConfig.MISSION_DIR || "missions";
  const missionDirPath = path.join(process.cwd(), missionDirBase);

  /**
   * Info: (20260812 - Luphia) 金鑰交給 ChatService 解析,不從 `.env` 檔案預先取。
   *
   * 原本讀的是 `getPriorityEnvConfig()`(直接解析 `.env.setup` / `.env` 檔案),
   * 比 `process.env` 更外層,再把值當「明確傳入」交給 ChatService ——
   * 於是 Worker 行程完全在系統設定機制之外:管理員在 /admin/settings
   * 輪替或撤銷金鑰,背景任務照樣用檔案裡的舊值。
   *
   * 拿掉的那個 `console.warn` 沒有換成別的:金鑰現在由 ChatService 在需要時解析
   * (資料庫 > 環境變數),這裡無從判斷「缺不缺」—— 而它原本的訊息也只是
   * 「might fail if ChatService is required」,真正缺的時候 ChatService 會明確拋錯。
   */
  const chatService = new ChatService();

  try {
    const folders = await fs.readdir(missionDirPath, { withFileTypes: true });

    let targetFolderInfo: { name: string; useJsonPlan: boolean } | null = null;
    let fallbackTargetFolderInfo: {
      name: string;
      useJsonPlan: boolean;
    } | null = null;

    for (const folder of folders) {
      if (!folder.isDirectory()) continue;
      const taskDir = path.join(missionDirPath, folder.name);

      try {
        await fs.access(path.join(taskDir, "result.md"));
        continue; // Info: (20260420 - Luphia) Already executed
      } catch {}

      try {
        await fs.access(path.join(taskDir, "giveup.md"));
        continue; // Info: (20260502 - Luphia) Given up after 3 rejections
      } catch {}

      /**
       * Info: (20260811 - Luphia) 檢查執行鎖（見 lib/worker/mission_lock）。
       *
       * 舊版在這裡 inline 判斷「時間戳是否超過一小時」，於是 worker 被強制中斷留下的
       * 孤兒鎖會讓該 mission 整整停擺一小時。現在以 heartbeat 判斷存活，
       * 並在同一台機器上比對 pid——持有行程消失時可立即接手。過期的鎖由這支函式順手清掉。
       */
      if (await isMissionLocked(taskDir)) {
        continue;
      }

      let useJsonPlan = true;
      try {
        await fs.access(path.join(taskDir, "plan.executor.json"));
      } catch {
        try {
          await fs.access(path.join(taskDir, "plan.executor.md"));
          useJsonPlan = false;
        } catch {
          continue; // Info: (20260420 - Luphia) No plan available
        }
      }

      const taskFiles = await fs.readdir(taskDir);
      const failedFiles = taskFiles.filter(
        (f) => f.startsWith("failed_") && f.endsWith(".md"),
      );

      if (failedFiles.length >= MISSION_MAX_EXECUTION_FAILURES) {
        continue; // Info: (20260422 - Luphia) Max retries exceeded
      }

      if (failedFiles.length > 0) {
        if (!fallbackTargetFolderInfo)
          fallbackTargetFolderInfo = { name: folder.name, useJsonPlan };
      } else {
        targetFolderInfo = { name: folder.name, useJsonPlan };
        break; // Info: (20260422 - Luphia) Found immediate priority task
      }
    }

    const activeFolderInfo = targetFolderInfo || fallbackTargetFolderInfo;
    if (!activeFolderInfo) {
      console.log("[MissionExecutor] No pending executions found.");
      return;
    }

    const { name: folderName, useJsonPlan } = activeFolderInfo;
    const taskDir = path.join(missionDirPath, folderName);
    const executorPlanPath = path.join(taskDir, "plan.executor.json");
    const resultPath = path.join(taskDir, "result.md");
    const missionJsonPath = path.join(taskDir, "mission.json");

    /**
     * Info: (20260811 - Luphia) 取得執行鎖並啟動 heartbeat。
     * 以 `wx` 建檔保證原子性：多個 worker 同時掃到同一個 mission 時只有一個成功。
     */
    const lock = await acquireMissionLock(taskDir);
    if (!lock) {
      console.log(
        `[MissionExecutor] Folder ${folderName} is already locked by another process. Skipping.`,
      );
      return;
    }

    try {
      console.log(
        `[MissionExecutor] Found pending execution for Task ID: ${folderName} (Using ${useJsonPlan ? "JSON" : "MD"} Plan)`,
      );

      let aggregatedResult: JSONValue = "Execution completed statically.";
      const aggregatedResultsByFileId: Record<
        string,
        Record<string, JSONValue>
      > = {};

      try {
        // Info: (20260420 - Luphia) Read mission data
        const missionJsonStr = await fs.readFile(missionJsonPath, "utf8");
        const missionData = JSON.parse(missionJsonStr) as Record<
          string,
          unknown
        >;
        const pseudoMission: IPseudoMission = {
          id: String(folderName || "MOCK_MISSION"),
          data: missionData,
        };

        if (useJsonPlan) {
          // Info: (20260420 - Luphia) Complex LLM & Skill sequence execution
          const planStr = await fs.readFile(executorPlanPath, "utf8");
          const missionDef = JSON.parse(planStr) as IMissionDefinition;

          const tasksConfig = missionDef.tasks || [];
          console.log(
            `[MissionExecutor] Executing ${tasksConfig.length} tasks in sequence...`,
          );

          // Info: (20260420 - Luphia) In-memory kv store for passing context between tasks (simulates DB previous task results)
          const priorResults = new Map<string, string>();
          const executionLogs: Record<string, unknown>[] = [];

          for (const subTaskConfig of tasksConfig) {
            const taskKey = subTaskConfig.data?.key || "UNKNOWN";
            console.log(
              `[MissionExecutor]   -> Running sub-task [${taskKey}] (${subTaskConfig.type})`,
            );
            const pseudoTask: IPseudoTask = {
              id: taskKey,
              type: subTaskConfig.type,
              data: JSON.parse(JSON.stringify(subTaskConfig.data)),
              order: subTaskConfig.order,
            };

            // Info: (20260420 - Luphia) Build Prompt
            const fullPrompt = await buildTaskPrompt(
              subTaskConfig,
              missionData,
              priorResults,
            );
            let taskResultStr = "";
            const skill = skillRegistry[subTaskConfig.type];
            if (skill) {
              console.log(
                `[MissionExecutor]      Invoking Skill: ${skill.name}`,
              );
              taskResultStr = await skill.execute(
                pseudoTask,
                pseudoMission,
                fullPrompt,
                chatService,
                priorResults,
              );
            } else {
              console.log(
                `[MissionExecutor]      Invoking raw ChatService LLM...`,
              );
              const responseSchema = subTaskConfig.data?.responseSchema as
                | Schema
                | undefined;
              taskResultStr = await chatService.generateRaw(
                fullPrompt,
                responseSchema,
                // Info: (20260811 - Luphia) 逾時上限，見 LLM_WORKER_TIMEOUT_MS
                { timeoutMs: LLM_WORKER_TIMEOUT_MS },
              );

              // Info: (20260516 - Tzuhan) Add AI_GENERATED tag to raw LLM output if it is JSON
              try {
                const parsed = JSON.parse(taskResultStr);
                if (typeof parsed === "object" && parsed !== null) {
                  if (parsed.data) {
                    parsed.data.generationSource =
                      EsgGenerationSource.AI_GENERATED;
                  } else {
                    parsed.generationSource = EsgGenerationSource.AI_GENERATED;
                  }
                  taskResultStr = JSON.stringify(parsed);
                }
              } catch {}
            }

            // Info: (20260420 - Luphia) Track execution tokens and content
            const inputTokens = await chatService.countTokens(fullPrompt);
            const outputTokens = await chatService.countTokens(taskResultStr);

            executionLogs.push({
              taskKey,
              type: subTaskConfig.type,
              order: subTaskConfig.order,
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens,
              input: fullPrompt,
              output: taskResultStr,
              timestamp: new Date().toISOString(),
            });

            // Info: (20260420 - Luphia) Save in memory for next step
            priorResults.set(taskKey, taskResultStr);

            let cleanedTaskResultStr = taskResultStr.trim();
            // Info: (20260514 - Tzuhan) 即使廢除了 Regex 擷取，LLM 有時還是會固執地包上 Markdown，必須移除前後綴
            if (cleanedTaskResultStr.startsWith("```json")) {
              cleanedTaskResultStr = cleanedTaskResultStr
                .replace(/^```json/, "")
                .replace(/```$/, "")
                .trim();
            } else if (cleanedTaskResultStr.startsWith("```")) {
              cleanedTaskResultStr = cleanedTaskResultStr
                .replace(/^```/, "")
                .replace(/```$/, "")
                .trim();
            }

            let isJson = false;
            let parsedVal: JSONValue | undefined;

            try {
              // Info: (20260514 - Tzuhan) Phase 1.1: Strict JSON Schema parsing, removing Regex fallback
              parsedVal = JSON.parse(cleanedTaskResultStr) as JSONValue;
              isJson = true;
            } catch {
              // Info: (20260514 - Tzuhan) If it fails to parse, we log the failure but do NOT fallback to Regex
              console.error(
                `[MissionExecutor] ❌ JSON Parsing Failed for Task ${taskKey}. Expected strict JSON from AI. Raw: ${cleanedTaskResultStr.substring(0, 50)}...`,
              );
              cleanedTaskResultStr = taskResultStr;
            }

            if (isJson && parsedVal !== undefined) {
              // Info: (20260420 - Luphia) Track for database sync grouped by fileId
              if (useJsonPlan && subTaskConfig.data?.context) {
                try {
                  const ctx = JSON.parse(subTaskConfig.data.context as string);
                  const recordKey =
                    ctx.fileId ||
                    ctx.voucherId ||
                    ctx.esgRecordId ||
                    ctx.journalId ||
                    "default";

                  if (recordKey) {
                    if (!aggregatedResultsByFileId[recordKey]) {
                      aggregatedResultsByFileId[recordKey] = {
                        fileId: ctx.fileId || "",
                        voucherIdContext: ctx.voucherId || "",
                        esgRecordIdContext: ctx.esgRecordId || "",
                        journalIdContext: ctx.journalId || "",
                      };
                    }

                    if (
                      subTaskConfig.type === "JOURNAL_PARSING" ||
                      subTaskConfig.type === "JOURNAL" ||
                      subTaskConfig.data?.key === "JOURNAL"
                    )
                      aggregatedResultsByFileId[recordKey].journal = parsedVal;
                    if (
                      subTaskConfig.type === "VOUCHER_BASE_PARSING" ||
                      subTaskConfig.type === "VOUCHER_BASE" ||
                      subTaskConfig.data?.key === "VOUCHER_BASE"
                    )
                      aggregatedResultsByFileId[recordKey].voucherBase =
                        parsedVal;
                    if (
                      subTaskConfig.type === "VOUCHER_LINES_PARSING" ||
                      subTaskConfig.type === "VOUCHER_LINES" ||
                      subTaskConfig.data?.key === "VOUCHER_LINES"
                    )
                      aggregatedResultsByFileId[recordKey].voucherLines =
                        parsedVal;
                    if (
                      subTaskConfig.type === "ESG_PARSING" ||
                      subTaskConfig.type === "ESG" ||
                      subTaskConfig.data?.key === "ESG"
                    )
                      aggregatedResultsByFileId[recordKey].esg = parsedVal;
                  }
                } catch {}
              }

              if (useJsonPlan && tasksConfig.length > 1) {
                if (typeof aggregatedResult === "string") aggregatedResult = {};
                (aggregatedResult as Record<string, unknown>)[taskKey] =
                  parsedVal;
              } else {
                aggregatedResult = parsedVal as JSONValue;
              }
            } else {
              if (useJsonPlan && tasksConfig.length > 1) {
                if (typeof aggregatedResult === "string") aggregatedResult = {};
                (aggregatedResult as Record<string, unknown>)[taskKey] =
                  cleanedTaskResultStr;
              } else {
                aggregatedResult = cleanedTaskResultStr; // Info: (20260420 - Luphia) Fallback to raw string
              }
            }
          }

          // Info: (20260420 - Luphia) Write execution logs array
          await fs.writeFile(
            path.join(taskDir, "execution_log.json"),
            JSON.stringify(executionLogs, null, 2),
            "utf8",
          );

          // Info: (20260420 - Luphia) Transform multi-step result into standardized { answer, tags } UI format
          if (
            tasksConfig.length > 1 &&
            typeof aggregatedResult === "object" &&
            aggregatedResult !== null
          ) {
            const agg = aggregatedResult as Record<string, unknown>;

            const serializeVal = (val: unknown): string => {
              if (typeof val === "object" && val !== null) {
                return JSON.stringify(val, null, 2);
              }
              return String(val);
            };

            const finalTaskKey = tasksConfig[tasksConfig.length - 1]?.data
              ?.key as string;
            let finalAnswer =
              finalTaskKey && agg[finalTaskKey]
                ? serializeVal(agg[finalTaskKey])
                : "";

            if (!finalAnswer) {
              const stepKeys = Object.keys(agg)
                .filter(
                  (k) =>
                    k.startsWith("STEP_") || k === "MARKET_FORMATTED_OUTPUT",
                )
                .sort();
              const fallbackKey = agg["STEP_5"]
                ? "STEP_5"
                : stepKeys.length > 0
                  ? stepKeys[stepKeys.length - 1]
                  : null;
              finalAnswer = fallbackKey ? serializeVal(agg[fallbackKey]) : "";
            }

            let tags: string[] = [];
            if (agg["STEP_2"]) {
              const step2Str = serializeVal(agg["STEP_2"]);
              const lines = step2Str.split("\n");
              let capturingTags = false;
              for (const line of lines) {
                // Info: (20260420 - Luphia) Some models output tags under a specific heading
                if (
                  line.includes("最終決定的標籤清單") ||
                  line.includes("Final Tags")
                ) {
                  capturingTags = true;
                }

                const match = line.match(
                  /^(?:[*-]|\d+\.)\s+(?:\*\*)?(#.*?[^\*])(?:\*\*)?\s*$/,
                );
                if (match && (capturingTags || step2Str.length < 500)) {
                  tags.push(match[1].trim());
                } else if (
                  !match &&
                  capturingTags &&
                  line.match(
                    /^(?:[*-]|\d+\.)\s+(?:\*\*)?([^#\*\s].*?[^\*])(?:\*\*)?\s*$/,
                  )
                ) {
                  // Info: (20260420 - Luphia) Sometimes AI forgets the # symbol
                  const tagMatch = line.match(
                    /^(?:[*-]|\d+\.)\s+(?:\*\*)?([^#\*\s].*?[^\*])(?:\*\*)?\s*$/,
                  );
                  if (tagMatch) tags.push(`#${tagMatch[1].trim()}`);
                }
              }

              if (tags.length === 0) {
                const matchArray = step2Str.match(
                  /最終決定的標籤清單[：:][\[【](.*?)[\]】]/,
                );
                if (matchArray) {
                  tags = matchArray[1].split(/[,、]/).map((t) => t.trim());
                }
              }
            }

            const finalResult: Record<string, JSONValue> = {
              answer: finalAnswer,
              tags: tags,
            };
            if (Object.keys(aggregatedResultsByFileId).length > 0) {
              finalResult.dbSyncPayload = aggregatedResultsByFileId;
            }
            aggregatedResult = finalResult;
          } else if (
            tasksConfig.length === 1 &&
            typeof aggregatedResult === "object" &&
            aggregatedResult !== null &&
            useJsonPlan
          ) {
            const finalResult: Record<string, JSONValue> = {
              ...(aggregatedResult as Record<string, JSONValue>),
            };
            if (Object.keys(aggregatedResultsByFileId).length > 0) {
              finalResult.dbSyncPayload = aggregatedResultsByFileId;
            }
            aggregatedResult = finalResult;
          }
        } else {
          // Info: (20260420 - Luphia) Fallback MD behavior
          console.log(
            `[MissionExecutor] Executing basic simulated logic for category: ${missionData.category}...`,
          );
          aggregatedResult = {
            answer: `The systematic analysis for ${missionData.category} has been successfully conducted.`,
            tags: ["simulated", "fallback"],
            aiNote: "Simulated output due to missing JSON execution plan.",
          };
        }

        // ToDo: (20260528 - Tzuhan) 應該根據類型放在各自的 documents/skill裡面
        // Info: (20260528 - Tzuhan) 決定論管線洗淨 (Washing)
        // Info: (20260528 - Tzuhan) Delegate Early Normalization, Cut-off splitting, and Interceptor execution to the Pipeline Orchestrator
        if (
          typeof aggregatedResult === "object" &&
          aggregatedResult !== null &&
          "dbSyncPayload" in aggregatedResult
        ) {
          const resultObj = aggregatedResult as Record<string, unknown>;
          const ab = (missionData.accountBook || {}) as Record<string, unknown>;
          const bookCurrency = (ab.currency as string) || CurrencyCode.TWD;
          const bookCountry = (ab.country as string) || CountryCode.TW;

          resultObj.dbSyncPayload =
            await VoucherPipelineOrchestrator.processDbSyncPayload(
              resultObj.dbSyncPayload as Record<string, unknown>,
              bookCurrency,
              bookCountry,
            );
        }

        const resultPayloadStr =
          typeof aggregatedResult === "string"
            ? aggregatedResult
            : JSON.stringify(aggregatedResult, null, 2);

        // Info: (20260426 - Luphia) Write result.md ONLY after database sync payload is saved to avoid premature commit by Commitor
        await fs.writeFile(resultPath, resultPayloadStr, "utf8");
        console.log(
          `[MissionExecutor] Execution successful. Final Result extracted to result.md`,
        );
      } catch (execErr) {
        console.error(
          `[MissionExecutor] Execution error for Task ID ${folderName}:`,
          execErr,
        );
        const errorMessage = `[Error at ${new Date().toISOString()}]\n${execErr instanceof Error ? execErr.message : String(execErr)}\n`;

        // Info: (20260514 - Tzuhan) 解決 Worker 殭屍狀態：將錯誤包裝進 dbSyncPayload，讓 IssueRecorder 得以標記為 FAILED
        const errorResult: Record<string, JSONValue> = {
          answer: "Execution failed.",
          tags: ["error"],
        };

        if (Object.keys(aggregatedResultsByFileId).length > 0) {
          for (const key of Object.keys(aggregatedResultsByFileId)) {
            aggregatedResultsByFileId[key].failureReason =
              execErr instanceof Error ? execErr.message : String(execErr);
          }
          errorResult.dbSyncPayload = aggregatedResultsByFileId;
        } else {
          errorResult.dbSyncPayload = {
            default: {
              failureReason:
                execErr instanceof Error ? execErr.message : String(execErr),
            },
          };
        }

        await fs.writeFile(
          path.join(taskDir, "result.md"),
          JSON.stringify(errorResult, null, 2),
          "utf8",
        );

        await fs.writeFile(
          path.join(taskDir, `failed_${Date.now()}.md`),
          errorMessage,
          "utf8",
        );
      }
    } finally {
      // Info: (20260811 - Luphia) 一併停掉 heartbeat，否則計時器會繼續刷新一個已刪除的鎖檔
      await lock.release();
    }
  } catch (e) {
    console.log("[MissionExecutor] Invalid MISSION_DIR or none exists yet.", e);
  }
}

async function buildTaskPrompt(
  taskConfig: ITaskDefinition,
  missionData: Record<string, unknown>,
  priorResults: Map<string, string>,
): Promise<string> {
  let interpolatedPrompt = taskConfig.data.prompt || "";

  const currentDate = new Date().toISOString().split("T")[0];
  let startDate = missionData.startDate || "N/A";
  let endDate = missionData.endDate || "N/A";
  let marketName = missionData.marketName || "臺灣";
  let targetKeyword = missionData.target || "General";
  let esgRecordsContext = missionData.esgRecordsContext || "";

  if (
    taskConfig.data.context &&
    taskConfig.data.context.trim().startsWith("{")
  ) {
    try {
      const parsedCtx = JSON.parse(taskConfig.data.context);
      startDate = parsedCtx.startDate || startDate;
      endDate = parsedCtx.endDate || endDate;
      marketName = parsedCtx.marketName || marketName;
      targetKeyword = parsedCtx.target || targetKeyword;
      esgRecordsContext = parsedCtx.esgRecordsContext || esgRecordsContext;
    } catch {
      /* Info: (20260420 - Luphia) nothing to do */
    }
  }

  interpolatedPrompt = interpolatedPrompt
    .replace(/\{Period_Start\}/g, () => String(startDate))
    .replace(/\{Period_End\}/g, () => String(endDate))
    .replace(/\{Market_Name\}/g, () => String(marketName))
    .replace(/\{Current_Date\}/g, () => String(currentDate))
    .replace(/\{Target_Keyword\}/g, () => String(targetKeyword))
    .replace(/\{Esg_Records_Context\}/g, () => String(esgRecordsContext));

  const histTags = Array.isArray(missionData.historicalTags)
    ? missionData.historicalTags
    : [];
  const tagsString = histTags.length > 0 ? histTags.join(", ") : "無歷史標籤";

  interpolatedPrompt = interpolatedPrompt.replace(
    /\{Historical_Tags_List\}/g,
    () => tagsString,
  );

  // Info: (20260420 - Luphia) Context replacement from prior tasks
  if (taskConfig.order && taskConfig.order > 0) {
    for (const [key, value] of priorResults.entries()) {
      interpolatedPrompt = interpolatedPrompt.replace(
        `[${key}_CONTENT]`,
        value,
      );

      // Info: (20260420 - Luphia) Specific step 2 tag extraction magic
      if (key === "STEP_2") {
        const match = value.match(/最終決定的標籤清單：\[(.*?)\]/);
        const tags = match ? match[1] : "";
        interpolatedPrompt = interpolatedPrompt.replace(
          /\{Step_2_Final_Tags\}/g,
          tags,
        );
      }
    }
  }

  let fullPrompt = "";
  if (taskConfig.data.context) {
    if (taskConfig.data.context.trim().startsWith("{")) {
      try {
        const parsedContext = JSON.parse(taskConfig.data.context);
        const targetString = `Category: ${parsedContext.category || "N/A"} / Keyword: ${parsedContext.targetCompany || parsedContext.target || "N/A"} / Country: ${parsedContext.country || parsedContext.marketName || "N/A"} / Period: ${parsedContext.period || "N/A"} (Year: ${parsedContext.year || "N/A"})`;

        let contextStr = `${targetString}`;
        if (parsedContext.internalDataContext) {
          contextStr += `\n\n${parsedContext.internalDataContext}`;
        }
        if (parsedContext.financialDataPayload) {
          contextStr += `\n\n【原始明細數據】：\n${JSON.stringify(parsedContext.financialDataPayload, null, 2)}`;
        }

        fullPrompt = `${contextStr}\n\n${interpolatedPrompt}`;
      } catch {
        fullPrompt = `${taskConfig.data.context}\n\n${interpolatedPrompt}`;
      }
    } else {
      fullPrompt = `${taskConfig.data.context}\n\n${interpolatedPrompt}`;
    }
  } else {
    fullPrompt = interpolatedPrompt;
  }

  return fullPrompt;
}
