import { prisma } from "@/lib/prisma";
import { calculateStatelessAmortizationForMonth } from "@/lib/utils/amortization_math";
import Decimal from "decimal.js";
import { keccak256, toUtf8Bytes } from "ethers";
import fs from "fs/promises";
import path from "path";
import { getPriorityEnvConfig } from "@/services/env.service";
import { SystemWorkerSource } from "@/constants/enums";

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

    // Info: (20260526 - Tzuhan) Create Unique Task ID using keccak256
    const hashInput = `${schedule.accountBookId}_${yearMonth}_${schedule.assetAccountCode}_${schedule.id}`;
    const hashHex = keccak256(toUtf8Bytes(hashInput));

    console.log(
      `[AmortizationWorker] Creating task on MissionBoard with idempotent hash: ${hashHex}...`,
    );
    let taskIdStr = "";

    // Info: (20260526 - Tzuhan) Check if we already created it locally (or we can just let blockchain revert)
    const adminAccount = await import("@/lib/wallet/admin_wallet").then((m) =>
      m.getAdminAccount(),
    );
    const {
      createPublicClient,
      createWalletClient,
      http,
      parseAbi,
      decodeEventLog,
      parseAbiItem,
    } = await import("viem");
    const { isuncoin } = await import("@/lib/viem_public");

    const rpcUrl = setupConfig.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:20024";
    const mbAddress =
      setupConfig.NEXT_PUBLIC_MISSION_BOARD_ADDRESS as `0x${string}`;

    const publicClient = createPublicClient({ transport: http(rpcUrl) });
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: isuncoin,
      transport: http(rpcUrl),
    });

    const MB_ABI = parseAbi([
      "function createTask(string calldata cid, uint256 initialReward) external returns (uint256)",
      "event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 reward, string contentCid)",
    ]);

    try {
      const { request } = await publicClient.simulateContract({
        account: adminAccount,
        address: mbAddress,
        abi: MB_ABI,
        functionName: "createTask",
        args: [hashHex, 0n],
      });

      const createTx = await walletClient.writeContract(request);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: createTx,
      });

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: MB_ABI,
            data: log.data,
            topics: log.topics,
            eventName: "TaskCreated",
          });
          if (decoded && decoded.args && "taskId" in decoded.args) {
            taskIdStr = String(decoded.args.taskId);
            break;
          }
        } catch {}
      }
    } catch (e) {
      console.log(
        `[AmortizationWorker] createTask reverted for ${hashHex}. Likely duplicate (unique constraint). Entering Healing Mode..., Error: ${e}`,
      );

      // Info: (20260527 - Tzuhan) === Healing Mode ===
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const MAX_BLOCKS = (30n * 24n * 60n * 60n) / 2n; // Approx 30 days (assuming 2s block time)
        const fromBlock =
          currentBlock > MAX_BLOCKS ? currentBlock - MAX_BLOCKS : 0n;

        console.log(
          `[AmortizationWorker] [Healing Mode] Scanning logs from block ${fromBlock} for ${hashHex}...`,
        );

        const logs = await publicClient.getLogs({
          address: mbAddress,
          event: parseAbiItem(
            "event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 reward, string contentCid)",
          ),
          fromBlock,
          toBlock: "latest",
        });

        let recoveredTaskIdStr = "";
        for (const log of logs) {
          if (log.args && log.args.contentCid === hashHex) {
            recoveredTaskIdStr = String(log.args.taskId);
            break;
          }
        }

        if (recoveredTaskIdStr) {
          const taskDir = path.join(missionDirPath, recoveredTaskIdStr);
          try {
            await fs.access(path.join(taskDir, "result.md"));
            console.log(
              `[AmortizationWorker] [Healing Mode] Local file exists for ${recoveredTaskIdStr}. Normal duplicate, skipping.`,
            );
            continue; // Info: (20260527 - Tzuhan) Pure execution collision, safe to skip
          } catch {
            console.log(
              `[AmortizationWorker] [Healing Mode] Recovered Ghost Task for taskId: ${recoveredTaskIdStr}. Rebuilding local payload...`,
            );
            taskIdStr = recoveredTaskIdStr;
            // Info: (20260527 - Tzuhan) Healing successful, let it proceed down to create the files!
          }
        } else {
          console.log(
            `[AmortizationWorker] [Healing Mode] Could not find TaskCreated event for ${hashHex}. Giving up.`,
          );
          continue;
        }
      } catch (healingError) {
        console.error(
          `[AmortizationWorker] [Healing Mode] Failed to recover task:`,
          healingError,
        );
        continue;
      }
    }

    if (!taskIdStr) {
      console.log(
        `[AmortizationWorker] Failed to extract taskId for ${hashHex}.`,
      );
      continue;
    }

    console.log(
      `[AmortizationWorker] Task created! Sequential Task ID: ${taskIdStr}`,
    );

    const taskDir = path.join(missionDirPath, taskIdStr);
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
