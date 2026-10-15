import { prisma } from "@/lib/prisma";
import { calculateStatelessAmortizationForMonth } from "@/lib/utils/amortization_math";
import Decimal from "decimal.js";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { getPriorityEnvConfig } from "@/services/env.service";
import { SystemWorkerSource } from "@/constants/enums";
import {
  findTaskByContentCid,
  issueTask,
} from "@/services/mission_board.service";
import { missionFolderName } from "@/constants/mission_board";

export async function processAmortization() {
  console.log("[AmortizationWorker] Scanning ACTIVE schedules...");

  const targetDate = new Date();
  const yearMonth = `${targetDate.getUTCFullYear()}-${String(targetDate.getUTCMonth() + 1).padStart(2, "0")}`;

  const schedules = await prisma.amortizationSchedule.findMany({
    where: { status: "ACTIVE" },
  });

  if (schedules.length === 0) {
    console.log("[AmortizationWorker] No ACTIVE schedules found.");
    return;
  }

  const setupConfig = await getPriorityEnvConfig();
  const missionDirBase = setupConfig.MISSION_DIR || "missions";
  const missionDirPath = path.join(process.cwd(), missionDirBase);
  await fs.mkdir(missionDirPath, { recursive: true }).catch(() => {});

  for (const schedule of schedules) {
    // Info: (20260527 - Tzuhan) Pro-rata temporis Math (Stateless Upgrade)
    const totalAmt = new Decimal(schedule.totalAmount.toString());

    const amountForMonth = calculateStatelessAmortizationForMonth(
      totalAmt,
      schedule.startDate,
      schedule.endDate,
      targetDate,
    );

    if (amountForMonth.lte(0)) {
      continue;
    }

    /**
     * Info: (20260526 - Tzuhan) Create Unique Task ID using keccak256
     * Info: (20261015 - Luphia) 改用 sha256：只需要一個決定性的冪等鍵，不再依賴鏈上的雜湊函式
     */
    const hashInput = `${schedule.accountBookId}_${yearMonth}_${schedule.assetAccountCode}_${schedule.id}`;
    const hashHex = `0x${crypto.createHash("sha256").update(hashInput, "utf8").digest("hex")}`;

    let taskIdStr = "";

    /**
     * Info: (20261015 - Luphia) 冪等改由 DB 判斷（取代「送交易 → revert → 掃 30 天事件」的 Healing Mode）。
     *
     * 同一個雜湊已有任務：本地 result.md 在就是正常重複，跳過；
     * 不在就是任務建了但檔案沒寫成（ghost task），沿用同一個 taskId 重建本地檔。
     */
    try {
      const existingTask = await findTaskByContentCid(hashHex);
      if (existingTask) {
        const existingIdStr = existingTask.id.toString();
        const existingDir = path.join(
          missionDirPath,
          missionFolderName(existingTask.id),
        );
        try {
          await fs.access(path.join(existingDir, "result.md"));
          console.log(
            `[AmortizationWorker] Task ${existingIdStr} already exists for ${hashHex}. Normal duplicate, skipping.`,
          );
          continue; // Info: (20260527 - Tzuhan) Pure execution collision, safe to skip
        } catch {
          console.log(
            `[AmortizationWorker] Recovered Ghost Task for taskId: ${existingIdStr}. Rebuilding local payload...`,
          );
          taskIdStr = existingIdStr;
        }
      } else {
        console.log(
          `[AmortizationWorker] Creating task on MissionBoard with idempotent hash: ${hashHex}...`,
        );
        // Info: (20261015 - Luphia) 建立者標成攤銷 worker：planner 只規劃平台發的任務，不會去下載這個雜湊
        const task = await issueTask({
          contentCid: hashHex,
          reward: 0n,
          creator: SystemWorkerSource.AMORTIZATION_WORKER,
        });
        taskIdStr = task.id.toString();
      }
    } catch (e) {
      console.error(
        `[AmortizationWorker] Failed to create or look up task for ${hashHex}:`,
        e,
      );
      continue;
    }

    console.log(`[AmortizationWorker] Using Task ID: ${taskIdStr}`);

    const taskDir = path.join(missionDirPath, missionFolderName(taskIdStr));
    try {
      await fs.mkdir(taskDir, { recursive: true });
    } catch {
      console.log(
        `[AmortizationWorker] Task directory already exists for ${taskIdStr}, skipping...`,
      );
      continue;
    }

    const dbSyncPayload = {
      dbSyncPayload: {
        amortization: {
          voucherBase: {
            tradingDate: targetDate.toISOString().split("T")[0],
          },
          journal: {
            date: targetDate.toISOString(),
            amount: amountForMonth.toNumber(),
            currency: "TWD",
            exchangeRate: 1,
            description: `[System Amortization (Daily Pro-rata)] ${schedule.assetAccountCode} -> ${schedule.expenseAccountCode}`,
            referenceId: schedule.id,
            accountBookId: schedule.accountBookId,
            generationSource: "SYSTEM_DETERMINISTIC",
            isVerified: false,
          },
          voucherLines: {
            lines: [
              {
                accountingCode: schedule.expenseAccountCode,
                particular: `Amortization Expense for ${yearMonth}`,
                amount: amountForMonth.toNumber(),
                isDebit: true,
                isVerified: false,
                generationSource: "SYSTEM_DETERMINISTIC",
              },
              {
                accountingCode: schedule.assetAccountCode,
                particular: `Amortization deduction for ${yearMonth}`,
                amount: amountForMonth.toNumber(),
                isDebit: false,
                isVerified: false,
                generationSource: "SYSTEM_DETERMINISTIC",
              },
            ],
          },
        },
      },
      usage: { totalTokens: 0 },
    };

    const resultMd = JSON.stringify(dbSyncPayload, null, 2);
    await fs.writeFile(path.join(taskDir, "result.md"), resultMd, "utf8");

    const metaJson = {
      taskId: taskIdStr,
      scheduleId: schedule.id,
      yearMonth,
    };
    await fs.writeFile(
      path.join(taskDir, "meta.json"),
      JSON.stringify(metaJson, null, 2),
      "utf8",
    );

    const contextJson = {
      source: SystemWorkerSource.AMORTIZATION_WORKER,
      accountBookId: schedule.accountBookId,
      scheduleId: schedule.id,
    };
    await fs.writeFile(
      path.join(taskDir, "context.json"),
      JSON.stringify(contextJson, null, 2),
      "utf8",
    );

    console.log(
      `[AmortizationWorker] Submitted task ${taskIdStr} to MISSION_DIR.`,
    );
  }
}
