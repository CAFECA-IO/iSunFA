import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { getAnalysisCost, AnalysisCostParams } from "@/lib/analysis/pricing";
import { storageService } from "@/services/storage.service";
import { getPriorityEnvConfig } from "@/services/env.service";
import {
  computeTaskReward,
  formatTaskReward,
  issueTask,
} from "@/services/mission_board.service";
import { missionFolderName } from "@/constants/mission_board";
import { orderRepo } from "@/repositories/order.repo";
import { ORDER_STATUS } from "@/constants/status";
import { analysisRepo } from "@/repositories/analysis.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { esgRepo } from "@/repositories/esg.repo";
import { ANALYSIS_CATEGORY } from "@/constants/analysis";
import type { Analysis } from "@/generated";

export async function processNext() {
  console.log("[MissionIssuer] Scanning for PAID orders to issue missions...");

  // Info: (20260420 - Luphia) Find the first PAID order that has not been converted to a mission
  const order = await orderRepo.findFirst({
    where: { status: ORDER_STATUS.PAID },
    orderBy: { createdAt: "asc" },
  });

  if (!order) {
    console.log("[MissionIssuer] No pending PAID orders found.");
    return null;
  }

  console.log(`[MissionIssuer] Processing Order ${order.id}...`);

  try {
    // Info: (20260429 - Luphia) Optimistic lock: set to EXECUTING immediately to prevent double processing in next loop
    await orderRepo.update({
      where: { id: order.id },
      data: { status: ORDER_STATUS.EXECUTING },
    });

    const orderDataObj = (order.data as Record<string, unknown>) || {};
    const payloadData = (orderDataObj.data as Record<string, unknown>) || {};
    const category = (payloadData.category || orderDataObj.category) as string;
    const files = (payloadData.files || orderDataObj.files) as
      | { hash: string; name: string }[]
      | undefined;

    let itemsToProcess = [
      { fileInfo: null as { hash: string; name: string } | null, index: 0 },
    ];
    if (
      category === ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS &&
      Array.isArray(files) &&
      files.length > 0
    ) {
      itemsToProcess = files.map((f, i) => ({ fileInfo: f, index: i }));
    }

    const generatedTaskIds: string[] = [];
    const analysisDbPromises: Promise<unknown>[] = [];

    const setupConfig = await getPriorityEnvConfig();

    /**
     * Info: (20261015 - Luphia) 每筆任務的懸賞只做紀錄。
     *
     * 鏈上版本在這裡要先鑄 ICP、approve 給 MissionBoard，再被 minReward 墊高；
     * 任務看板改存 DB 後沒有代幣要轉，那三步一併移除，只留「這筆任務估多少」。
     */
    const actualParams = (orderDataObj.data ||
      orderDataObj) as unknown as AnalysisCostParams;
    const computedCost = getAnalysisCost(actualParams);
    const baseReward = computeTaskReward(computedCost, itemsToProcess.length);

    // Info: (20260427 - Luphia) 2: Parallel IPFS Uploads
    console.log(
      `[MissionIssuer] Preparing and uploading ${itemsToProcess.length} mission(s) to IPFS concurrently...`,
    );

    // Info: (20260523 - Luphia) Retrieve existing Analyses for this order upfront to reuse placeholders
    const existingAnalyses = await analysisRepo.findMany({
      where: {
        orderId: order.id,
        type: category,
      },
    });

    const preparedItems = await Promise.all(
      itemsToProcess.map(async (item) => {
        let localContextObj: Record<string, unknown> | null = null;
        let analysisId: string | undefined = undefined;
        let reusedAnalysis = false;
        let existingAnalysisObj: Analysis | null = null;

        if (item.fileInfo) {
          const fileInfoObj = item.fileInfo as Record<string, unknown>;
          if (category === ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS) {
            const match = existingAnalyses.find((a) => {
              const dataObj = (a.data as Record<string, unknown>) || {};
              const innerData = (dataObj.data as Record<string, unknown>) || {};
              const files = innerData.files;
              return (
                Array.isArray(files) &&
                files.some((f: unknown) => {
                  if (typeof f === "string") return f === item.fileInfo!.hash;
                  if (f && typeof f === "object" && "hash" in f) {
                    return (
                      (f as Record<string, unknown>).hash ===
                      item.fileInfo!.hash
                    );
                  }
                  return false;
                })
              );
            });
            if (match) {
              analysisId = match.id;
              reusedAnalysis = true;
              existingAnalysisObj = match;
            } else {
              analysisId = crypto.randomUUID();
            }
          }
          localContextObj = {
            analysisId,
            journalId: fileInfoObj.journalId,
            voucherId: fileInfoObj.voucherId,
            esgRecordId: fileInfoObj.esgRecordId,
          };
        }

        const missionData = item.fileInfo
          ? JSON.parse(
              JSON.stringify({ ...orderDataObj, fileId: item.fileInfo.hash }),
            )
          : JSON.parse(JSON.stringify(orderDataObj));

        // Info: (20260516 - Luphia) 移除不應外流至 AI 分析節點的訂單私密與計價資料
        delete missionData.items;
        delete missionData.amount;
        delete missionData.unit;
        delete missionData.type;
        delete missionData.orderId;
        delete missionData.cost;

        // Info: (20260516 - Luphia) 將 accountBookId 轉換為完整的 accountBook JSON 給 AI 解析器
        const accBookId =
          missionData.accountBookId || missionData.data?.accountBookId;
        if (accBookId && category === ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS) {
          try {
            const accBook = await accountBookRepo.getAccountBookById(
              accBookId as string,
            );
            if (accBook) {
              missionData.accountBook = accBook;
              const tenantCustomCoefficients = await esgRepo.getEsgCoefficients(
                accBook.id,
              );
              if (!missionData.prerequisiteData)
                missionData.prerequisiteData = {};
              missionData.prerequisiteData.coefficients =
                tenantCustomCoefficients;
            }
          } catch (e) {
            console.warn(
              `[MissionIssuer] Failed to fetch accountBook ${accBookId}`,
              e,
            );
          }
        }

        // Info: (20260506 - Luphia) Deeply strip sensitive info from missionData for IPFS
        if (missionData.data && Array.isArray(missionData.data.files)) {
          missionData.data.files = missionData.data.files
            .filter(
              (f: Record<string, unknown>) =>
                !item.fileInfo || f.hash === item.fileInfo.hash,
            )
            .map((f: Record<string, unknown>) => ({
              hash: f.hash,
              name: f.name,
            }));
        } else if (missionData.files && Array.isArray(missionData.files)) {
          missionData.files = missionData.files
            .filter(
              (f: Record<string, unknown>) =>
                !item.fileInfo || f.hash === item.fileInfo.hash,
            )
            .map((f: Record<string, unknown>) => ({
              hash: f.hash,
              name: f.name,
            }));
        }

        const missionJsonStr = JSON.stringify(missionData, null, 2);
        const missionBlob = new Blob([missionJsonStr], {
          type: "application/json",
        });
        const missionFile = new globalThis.File([missionBlob], "mission.json", {
          type: "application/json",
        });

        const cid = await storageService.uploadLaria(missionFile);
        return {
          item,
          cid,
          missionJsonStr,
          missionData,
          localContextObj,
          analysisId,
          reusedAnalysis,
          existingAnalysisObj,
        };
      }),
    );

    /**
     * Info: (20260427 - Luphia) 3: Sequential task creation & Local Files
     * Info: (20261015 - Luphia) 依序建立任務，讓 taskId 與 itemsToProcess 的順序一致
     */
    for (const {
      item,
      cid,
      missionJsonStr,
      missionData,
      localContextObj,
      analysisId,
      reusedAnalysis,
      existingAnalysisObj,
    } of preparedItems) {
      let taskId = "";

      /**
       * Info: (20260525 - Luphia) Check if this task was already successfully created in a previous attempt to achieve idempotence/resume capability.
       *
       * Info: (20261015 - Luphia) 只接續帶 `missionFolder` 標記的紀錄。
       * 舊鏈發的 taskId 從 0 起算、DB 流水號從 1 起算，同一個數字兩邊都可能存在；
       * 沒有標記的 `missionTaskId` 指的是已退役的鏈上任務，沿用會把這筆訂單
       * 接到另一張訂單的 DB 任務上。這種紀錄改為重新建一筆任務。
       */
      if (
        existingAnalysisObj &&
        existingAnalysisObj.data &&
        typeof existingAnalysisObj.data === "object"
      ) {
        const existingData = existingAnalysisObj.data as Record<
          string,
          unknown
        >;
        if (
          typeof existingData.missionTaskId === "string" &&
          existingData.missionTaskId &&
          existingData.missionFolder ===
            missionFolderName(existingData.missionTaskId)
        ) {
          taskId = existingData.missionTaskId;
          console.log(
            `[MissionIssuer] Task already created in previous attempt! Reusing Task ID: ${taskId}`,
          );
        }
      }

      if (!taskId) {
        console.log(
          `[MissionIssuer] Creating task on MissionBoard with CID ${cid} (reward ${formatTaskReward(baseReward)})...`,
        );
        const task = await issueTask({ contentCid: cid, reward: baseReward });
        taskId = String(task.id);
        console.log(`[MissionIssuer] Task created! Task ID: ${taskId}`);
      }

      // Info: (20260427 - Luphia) Store Files Locally
      const issueDirBase = setupConfig.ISSUE_DIR || "issues";
      const taskDir = path.join(
        process.cwd(),
        issueDirBase,
        missionFolderName(taskId),
      );
      await fs.mkdir(taskDir, { recursive: true });
      await fs.writeFile(
        path.join(taskDir, "mission.json"),
        missionJsonStr,
        "utf8",
      );

      // Info: (20260728 - Tzuhan) 一律寫入 orderId(+analysisId):Recorder 回寫的唯一可靠關聯。
      // Info: (20260728 - Tzuhan) 修復斷鏈:mission.json 出於隱私刻意刪除 orderId(不外流 AI 節點),
      // Info: (20260728 - Tzuhan) 但 context.json 僅存本地 worker 目錄、不進 IPFS,可安全攜帶關聯;
      // Info: (20260728 - Tzuhan) 過去只有 CERTIFICATE_ANALYSIS 寫 context.json,運輸分析僅能靠
      // Info: (20260728 - Tzuhan) mission contains taskId 反查 — 本地鏈重置後 taskId 重複即誤配舊單。
      const taskContext: Record<string, unknown> = {
        ...(localContextObj ?? {}),
        orderId: order.id,
        ...(analysisId ? { analysisId } : {}),
      };
      await fs.writeFile(
        path.join(taskDir, "context.json"),
        JSON.stringify(taskContext, null, 2),
        "utf8",
      );

      const planValidatorContent = `# Plan Validator
This is an automated validation plan.
## Verifications
1. Check if the output follows the expected analysis structure for category: ${category}.
2. Ensure the resulting numerical figures are accurately derived from ${missionData.type}.
${category === ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT ? "3. Accept raw JSON output directly as it represents a highly precise logistics calculation data structure." : ""}
${category === ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS ? "3. CRITICAL: The result MUST contain a `dbSyncPayload` object. If `dbSyncPayload` is missing, you MUST rate confidence below 60 and reject it.\n4. CRITICAL: If the `dbSyncPayload` contains an \`esg\` object, it MUST contain complete fields, including non-empty \`coefficientId\`, \`amount\`, \`unit\`, and \`emissions\`. If any of these fields are missing or empty, you MUST rate confidence below 60 and reject the task." : ""}
`;
      await fs.writeFile(
        path.join(taskDir, "plan.validator.md"),
        planValidatorContent,
        "utf8",
      );
      generatedTaskIds.push(taskId);

      // Info: (20260427 - Luphia) Prepare DB writes
      if (
        item.fileInfo &&
        category === ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS &&
        analysisId
      ) {
        if (reusedAnalysis && existingAnalysisObj) {
          const existingData =
            (existingAnalysisObj.data as Record<string, unknown>) || {};
          analysisDbPromises.push(
            analysisRepo.update({
              where: { id: analysisId },
              data: {
                data: {
                  ...existingData,
                  missionName: `Analysis-${category}-${item.fileInfo.name}`,
                  missionTaskId: taskId,
                  missionFolder: missionFolderName(taskId),
                  category: category,
                  cost: (orderDataObj.cost as number) || 0,
                  generatedAt: new Date().toISOString(),
                  periodType: "unknown",
                  periodValue: "unknown",
                  year: new Date().getFullYear(),
                  keyword: item.fileInfo.name,
                  isExternal: false,
                  fileHash: item.fileInfo.hash,
                },
              },
            }),
          );
        } else {
          analysisDbPromises.push(
            analysisRepo.create({
              reportId: analysisId,
              userId: order.userId,
              orderId: order.id,
              category: category,
              data: {
                missionName: `Analysis-${category}-${item.fileInfo.name}`,
                missionTaskId: taskId,
                missionFolder: missionFolderName(taskId),
                category: category,
                cost: (orderDataObj.cost as number) || 0,
                generatedAt: new Date().toISOString(),
                periodType: "unknown",
                periodValue: "unknown",
                year: new Date().getFullYear(),
                keyword: item.fileInfo.name,
                isExternal: false,
                fileHash: item.fileInfo.hash,
              },
            }),
          );
        }
      }
    }

    // Info: (20260427 - Luphia) Parallel DB Updates
    if (analysisDbPromises.length > 0) {
      await Promise.all(analysisDbPromises);
    }

    await orderRepo.update({
      where: { id: order.id },
      data: {
        mission: JSON.stringify(generatedTaskIds),
      },
    });

    console.log(
      `[MissionIssuer] Order ${order.id} transitioned to EXECUTING. Task IDs: ${generatedTaskIds.join(", ")}`,
    );
    return generatedTaskIds[0];
  } catch (e) {
    console.error(`[MissionIssuer] Error processing order ${order.id}:`, e);
    // Info: (20260429 - Luphia) Rollback to PAID so it can be retried
    try {
      await orderRepo.update({
        where: { id: order.id },
        data: { status: ORDER_STATUS.PAID },
      });
    } catch (rollbackErr) {
      console.error(
        `[MissionIssuer] Failed to rollback order ${order.id} to PAID:`,
        rollbackErr,
      );
    }
    throw e;
  }
}
