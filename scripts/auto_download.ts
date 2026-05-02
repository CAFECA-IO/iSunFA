import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { companyRepo } from "@/repositories/company.repo";
import { reportDownloadTaskRepo } from "@/repositories/report_download_task.repo";
import { TaskType, TaskStatus } from "@/generated";

interface IDlqRecord {
  stockId: string;
  year: number;
  taskType: TaskType;
  dlqCount: number;
  firstFailedAt: string;
  lastErrorMsg: string | null;
  lastRecordedAt?: string;
}

// Info: (20260409 - Tzuhan) 台灣公開資訊觀測站的電子檔大約從 2013 (民國102年) 開始全面普及
const MIN_YEAR = 2013;
const CURRENT_YEAR = new Date().getFullYear();

// Info: (20260409 - Tzuhan) 定義 Dead Letter Queue (DLQ) 紀錄檔路徑 (存放在專案根目錄的 logs 資料夾下)
const DLQ_LOG_PATH = path.join(process.cwd(), "logs", "dlq_records.json");

// Info: (20260409 - Tzuhan) 讀取/儲存 DLQ 紀錄
function loadDLQRecords(): Record<string, IDlqRecord> {
  if (fs.existsSync(DLQ_LOG_PATH))
    return JSON.parse(fs.readFileSync(DLQ_LOG_PATH, "utf-8"));
  return {};
}

function saveDLQRecords(data: Record<string, IDlqRecord>) {
  fs.mkdirSync(path.dirname(DLQ_LOG_PATH), { recursive: true });
  fs.writeFileSync(DLQ_LOG_PATH, JSON.stringify(data, null, 4), "utf-8");
}

// Info: (20260409 - Tzuhan) 睡覺小工具
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("========================================");
  console.log(" 🏭 iSunFA 終極資料工廠自動化控制台 (支援睡覺復活版)");
  console.log("========================================\n");

  const args = process.argv.slice(2);
  const params = {
    sync: args.includes("--sync"),
    stockId:
      args.find((a) => a.startsWith("--stockId="))?.split("=")[1] || "ALL",
    year: args.find((a) => a.startsWith("--year="))?.split("=")[1] || "ALL",
    concurrency:
      args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] || "5",
    // Info: (20260409 - Tzuhan) 復活次數 (預設 2 次) 與 休息時間 (預設 10 分鐘)
    resurrections: parseInt(
      args.find((a) => a.startsWith("--resurrect="))?.split("=")[1] || "2",
    ),
    restMins: parseInt(
      args.find((a) => a.startsWith("--rest="))?.split("=")[1] || "10",
    ),
  };

  console.log(`📋 執行參數設定:`, params);

  // Info: (20260409 - Tzuhan) 2. 步驟一：同步最新公司名單 (若有加上 --sync 參數)
  if (params.sync) {
    console.log("\n🔄 [Step 1] 正在同步 TWSE / TPEx 最新公司名單...");
    spawnSync("npx", ["tsx", "scripts/sync_companies.ts"], {
      stdio: "inherit",
    });
    console.log("✅ 公司名單同步完成！");
  } else {
    console.log("\n⏭️ [Step 1] 跳過公司同步 (可加上 --sync 參數來執行)");
  }

  // Info: (20260409 - Tzuhan) 3. 步驟二：智慧撈取目標公司與年份
  console.log("\n🔍 [Step 2] 正在鎖定目標公司與年份...");
  const targetYears =
    params.year === "ALL"
      ? Array.from(
          { length: CURRENT_YEAR - MIN_YEAR + 1 },
          (_, i) => MIN_YEAR + i,
        )
      : [parseInt(params.year)];

  const companyQuery =
    params.stockId === "ALL"
      ? {}
      : { stockId: { in: params.stockId.split(",") } };

  const companies = await companyRepo.findMany({ where: companyQuery });

  if (companies.length === 0) {
    console.error(
      "❌ 找不到任何符合條件的公司，請確認資料庫是否已有資料或執行 --sync",
    );
    process.exit(1);
  }

  console.log(`🎯 鎖定公司數量: ${companies.length} 家`);
  console.log(`🎯 鎖定年份區間: ${targetYears.join(", ")}`);

  console.log("\n📝 [Step 3] 正在派發工單與執行 DLQ (死亡信件匣) 健檢...");
  const taskTypes = [
    TaskType.FIN_REPORT,
    TaskType.FIN_DATA,
    TaskType.ESG_REPORT,
    TaskType.ESG_METRICS,
  ];

  // Info: (20260409 - Tzuhan) 進入大迴圈：第 1 次執行 + N 次復活
  const totalRounds = params.resurrections + 1;

  for (let round = 1; round <= totalRounds; round++) {
    console.log(`\n========================================================`);
    console.log(` 🔄 啟動第 ${round} 回合下載作業 (共 ${totalRounds} 回合)`);
    console.log(`========================================================\n`);

    console.log("📝 [Step 3] 正在派發工單與執行 DLQ (死亡信件匣) 健檢...");
    let newTasksCount = 0;
    let resetTasksCount = 0;
    let skipTasksCount = 0;
    let severeAlertCount = 0;

    const dlqRecords = loadDLQRecords();

    // Info: (20260409 - Tzuhan) 每次回合重新從 DB 撈取最新狀態
    const existingTasks = await reportDownloadTaskRepo.findMany({
      where: {
        stockId: { in: companies.map((c) => c.stockId) },
        year: { in: targetYears },
      },
      select: {
        id: true,
        stockId: true,
        year: true,
        taskType: true,
        status: true,
        retryCount: true,
        errorMsg: true,
      },
    });

    const taskMap = new Map();
    existingTasks.forEach((t) =>
      taskMap.set(`${t.stockId}_${t.year}_${t.taskType}`, t),
    );

    const tasksToCreate = [];

    for (const company of companies) {
      for (const year of targetYears) {
        for (const taskType of taskTypes) {
          const key = `${company.stockId}_${year}_${taskType}`;
          const existingTask = taskMap.get(key);

          if (!existingTask) {
            // Info: (20260409 - Tzuhan) 新任務
            tasksToCreate.push({
              stockId: company.stockId,
              companyName: company.name,
              marketType: company.marketType,
              year: year,
              taskType: taskType,
              status: TaskStatus.PENDING,
              retryCount: 0,
            });
            newTasksCount++;
          } else if (existingTask.status === TaskStatus.SUCCESS) {
            skipTasksCount++; // Info: (20260409 - Tzuhan) 已成功，略過
          } else if (existingTask.status === TaskStatus.FAILED) {
            // Info: (20260409 - Tzuhan) 任務失敗達上限，進行 DLQ 記錄與復活重置
            if (existingTask.retryCount >= 3) {
              if (!dlqRecords[key]) {
                dlqRecords[key] = {
                  stockId: company.stockId,
                  year,
                  taskType,
                  dlqCount: 0,
                  firstFailedAt: new Date().toISOString(),
                  lastErrorMsg: existingTask.errorMsg,
                  lastRecordedAt: new Date().toISOString(),
                };
              }
              dlqRecords[key].dlqCount += 1;
              dlqRecords[key].lastErrorMsg = existingTask.errorMsg;
              dlqRecords[key].lastRecordedAt = new Date().toISOString();

              if (dlqRecords[key].dlqCount > 2) severeAlertCount++; // Info: (20260409 - Tzuhan) 死亡次數超過 2 次，發出嚴重警報
              // Info: (20260409 - Tzuhan) 復活重置
              await reportDownloadTaskRepo.update({
                where: { id: existingTask.id },
                data: {
                  status: TaskStatus.PENDING,
                  retryCount: 0,
                  errorMsg: null,
                },
              });
              resetTasksCount++;
            }
          }
        }
      }
    }

    // Info: (20260409 - Tzuhan) 寫入 DLQ 紀錄
    saveDLQRecords(dlqRecords);

    if (tasksToCreate.length > 0) {
      await reportDownloadTaskRepo.createMany({
        data: tasksToCreate,
        skipDuplicates: true,
      });
    }

    console.log(
      `✅ 檢查完畢！新增 ${newTasksCount} 筆，復活重置 ${resetTasksCount} 筆，略過 ${skipTasksCount} 筆。`,
    );

    if (severeAlertCount > 0) {
      console.log(
        `🚨 [警告] 有 ${severeAlertCount} 筆任務已累計死亡超過 2 次，可能是實體檔案遺失。`,
      );
      console.log(`👉 可以到查看 logs/dlq_records.json 進行人工排查！\n`);
    }

    const targetPendingCount = await reportDownloadTaskRepo.count({
      where: {
        stockId:
          params.stockId === "ALL"
            ? undefined
            : { in: params.stockId.split(",") },
        year: params.year === "ALL" ? undefined : { in: targetYears },
        OR: [
          { status: TaskStatus.PENDING },
          { status: TaskStatus.FAILED, retryCount: { lt: 3 } },
        ],
      },
    });

    // Info: (20260409 - Tzuhan) 如果真的都沒有需要跑的，才提早下班
    if (targetPendingCount === 0) {
      console.log(
        "\n🎉 所有指定條件的報告皆已就緒，無須再執行，提早結束作業！",
      );
      break;
    }

    console.log(
      `\n🚦 [Step 4] 啟動背景大腦 (Runner)，預定消化 ${targetPendingCount} 筆 PENDING 任務...`,
    );

    // Info: (20260409 - Tzuhan) 修復盲區 B：把參數一字不漏地傳遞給 Runner
    const runnerArgs = [
      "tsx",
      "scripts/download_runner.ts",
      `--limit=${targetPendingCount}`,
      `--concurrency=${params.concurrency}`,
    ];
    if (params.stockId !== "ALL")
      runnerArgs.push(`--stockId=${params.stockId}`);
    if (params.year !== "ALL") runnerArgs.push(`--year=${params.year}`);

    spawnSync("npx", runnerArgs, { stdio: "inherit" });

    // Info: (20260409 - Tzuhan) 如果還沒到最後一個回合，就執行睡覺倒數
    if (round < totalRounds) {
      console.log(
        `\n😴 本回合結束。系統將休息 ${params.restMins} 分鐘，等待伺服器釋放連線...`,
      );
      for (let m = params.restMins; m > 0; m--) {
        process.stdout.write(`... 距離下次復活還剩 ${m} 分鐘 ...\r`);
        await sleep(60 * 1000); // Info: (20260409 - Tzuhan) 睡 1 分鐘
      }
      console.log(`\n⏰ 休息結束！準備進行復活檢查...`);
    }
  }

  console.log("\n🏁 控制台作業全數結束！");
}

main()
  .catch(console.error)
  .finally(async () => {
    await reportDownloadTaskRepo.disconnect();
  });
