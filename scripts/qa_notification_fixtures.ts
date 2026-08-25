/**
 * Info: (20260825 - Julian) 小鈴鐺手動驗收用的造資料工具。
 *
 * 驗收清單裡有五項需要「能造資料的環境」：26 則未讀的截斷提示、
 * 待辦點不掉、失敗通知、三分頁只響一次、跑一個分析到完成。
 * 本機沒有跑得完的分析管線，這支腳本補上前四項。
 *
 * ## 它驗得到什麼、驗不到什麼
 *
 * 這支腳本**呼叫的是 service 的真正發射函式**（`notifyAnalysisCompleted`
 * 等），不是自己 insert —— 所以 dedupeKey 的格式、payload 的形狀、
 * 唯一約束的行為都與正式路徑同一條。
 *
 * 但它取代掉了**觸發那一段**：真正的通知是 worker 跑完分析後由
 * `issue.recorder.service.ts` 在 `becameFailed` / 完成時呼叫的。
 * 所以：
 *
 * - ✅ 驗得到：摘要 API → 清單 API → 畫面渲染 → 搖動 → 音效 → 徽章 →
 *   已讀行為 → 待辦不被收掉 → 截斷提示
 * - ❌ 驗不到：**分析完成／失敗時到底有沒有人呼叫那支發射函式**
 *
 * 後者是驗收清單第 3、9 兩項的真正內容，只有跑一個真的分析才算數，
 * 那要等 staging。拿這支腳本的結果去打勾第 3、9 項，就是把
 * 「替身答對了」記成「系統答對了」。
 *
 * ## 用法
 *
 *     npx tsx scripts/qa_notification_fixtures.ts --list-users
 *     npx tsx scripts/qa_notification_fixtures.ts --user <userId> --status
 *     npx tsx scripts/qa_notification_fixtures.ts --user <userId> --scenario todo
 *     npx tsx scripts/qa_notification_fixtures.ts --user <userId> --scenario arrival
 *     npx tsx scripts/qa_notification_fixtures.ts --user <userId> --scenario failed
 *     npx tsx scripts/qa_notification_fixtures.ts --user <userId> --scenario many
 *     npx tsx scripts/qa_notification_fixtures.ts --user <userId> --clear --yes
 */
import { userRepo } from "@/repositories/user.repo";
import { notificationRepo } from "@/repositories/notification.repo";
import { disconnectPrisma } from "@/repositories/prisma_lifecycle.repo";
import {
  notifyAnalysisCompleted,
  notifyAnalysisFailed,
  notifyWalletUpgradeRequested,
} from "@/services/notification.service";

// Info: (20260825 - Julian) 🛑 正式機實體隔離（與 e2e 測試同一條規矩）
if (process.env.NODE_ENV === "production") {
  throw new Error("🚨 [FATAL] 這支腳本會造假資料，嚴禁在正式機執行。");
}

const out = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

/**
 * Info: (20260825 - Julian) 一次跑用同一個戳記，讓同一輪造出來的資料看得出是一組。
 * 不用亂數：重跑時想重現同一組會很麻煩，而時間戳看得出先後。
 */
const STAMP = Date.now();

const SCENARIOS = ["todo", "arrival", "failed", "many"] as const;
type Scenario = (typeof SCENARIOS)[number];

function argOf(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function listUsers(): Promise<void> {
  const users = await userRepo.findMany({
    select: { id: true, name: true, address: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  if (users.length === 0) {
    out("資料庫裡沒有使用者。先用 npm run dev 註冊一個。");
    return;
  }
  out(`最近 ${users.length} 位使用者：`);
  users.forEach((user) => {
    out(`  ${user.id}  ${user.name ?? "(無名)"}  ${user.address}`);
  });
}

async function printStatus(userId: string): Promise<void> {
  /**
   * Info: (20260825 - Julian) 只印**未讀**，不印總數。
   *
   * 總數要另一支查詢，而驗收真正在對的是徽章 —— 徽章數的就是未讀。
   * 想看歷史有幾則就打開面板，那正是這次改動要驗的東西。
   */
  const { counts } = await notificationRepo.summarizeUnread(userId);

  if (counts.size === 0) {
    out("這位使用者目前沒有未讀通知。");
    return;
  }
  out("型別                  未讀");
  [...counts.entries()].forEach(([type, count]) => {
    out(`  ${type.padEnd(20)} ${String(count).padStart(3)}`);
  });
  const totalUnread = [...counts.values()].reduce((sum, n) => sum + n, 0);
  out(`\n徽章上應該顯示：${totalUnread > 99 ? "99+" : totalUnread}`);
}

/**
 * Info: (20260825 - Julian) 清空要指名使用者、要 `--yes`、而且先報數字。
 *
 * 刪資料不可逆，而這支腳本的使用時機正好是「畫面怪怪的，先清掉重來」——
 * 那是最容易手滑刪到別人資料的時候。沒有「清全部使用者」這個選項是刻意的。
 */
async function clearFor(userId: string, confirmed: boolean): Promise<void> {
  if (!confirmed) {
    out("將刪除這一位使用者的所有通知。確定的話加上 --yes。");
    return;
  }
  const deleted = await notificationRepo.deleteAllByUser(userId);
  out(`已刪除 ${deleted} 則。`);
  /**
   * Info: (20260825 - Julian) 這裡用 DELETE 而不是標記已讀是有意義的。
   *
   * `dedupeKey` 是永久唯一鍵：把錢包升級待辦標成已讀，那一列還在，
   * 重跑 `request_wallet_upgrades.ts` 會撞 P2002 而不補發 —— 之後就再也
   * 造不出這個情境了。刪掉才是真的回到原點。
   */
  out("（錢包升級待辦已一併刪除，可以重跑 request_wallet_upgrades.ts 補發）");
}

async function runScenario(userId: string, scenario: Scenario): Promise<void> {
  switch (scenario) {
    case "todo": {
      const created = await notifyWalletUpgradeRequested({ userId });
      out(
        created
          ? "已發出 1 則錢包升級待辦。"
          : "先前已發過（dedupe 擋下）。要重造請先 --clear --yes。",
      );
      out("\n驗收第 7 項：點一下鈴鐺再關掉，重新整理 —— 那則待辦必須還在。");
      break;
    }
    case "arrival": {
      await notifyAnalysisCompleted({
        userId,
        analysisId: `qa-${STAMP}`,
        analysisType: "carbon_footprint",
      });
      out("已發出 1 則分析完成通知。");
      out(
        "\n下一次輪詢（最多 60 秒；切走分頁再切回來會立刻補抓一次）應該搖動＋響一聲。",
      );
      break;
    }
    case "failed": {
      await notifyAnalysisFailed({ userId, orderId: `qa-${STAMP}` });
      out("已發出 1 則分析失敗通知。");
      out("\n驗收第 9 項的**呈現**半邊：面板上該是紅色驚嘆號圖示。");
      out("「重試中不發」那半邊要跑真的分析才驗得到。");
      break;
    }
    case "many": {
      await notifyWalletUpgradeRequested({ userId });
      // Info: (20260825 - Julian) 逐則 await 而不是 Promise.all：25 則同時寫
      // 會讓本機 pool 排隊，而這裡不趕時間，逐則失敗也看得出是第幾則
      for (let index = 0; index < 25; index += 1) {
        await notifyAnalysisCompleted({
          userId,
          analysisId: `qa-${STAMP}-${index}`,
          analysisType: "carbon_footprint",
        });
      }
      out("已造出 1 則待辦 + 25 則完成 = 26 則未讀。");
      out("\n驗收第 8 項的判準（三個數字要同時成立）：");
      out("  徽章 = 26");
      out("  待辦區 1 則、完成區 20 則");
      out("  完成區底下出現「還有更多未讀通知」");
      out("\n少了第三行就是 D4 復發：畫面把 20 則讀成全部，而徽章說 26。");
      break;
    }
    default:
      break;
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--list-users")) {
    await listUsers();
    return;
  }

  const userId = argOf("--user");
  if (!userId) {
    out("必須指名 --user <userId>（先跑 --list-users 找）。");
    process.exitCode = 1;
    return;
  }

  const user = await userRepo.findById(userId);
  if (!user) {
    out(`找不到使用者 ${userId}。`);
    process.exitCode = 1;
    return;
  }

  if (process.argv.includes("--clear")) {
    await clearFor(userId, process.argv.includes("--yes"));
    return;
  }

  if (process.argv.includes("--status")) {
    await printStatus(userId);
    return;
  }

  const scenario = argOf("--scenario");
  if (!scenario || !SCENARIOS.includes(scenario as Scenario)) {
    out(`--scenario 必須是其中之一：${SCENARIOS.join(" / ")}`);
    process.exitCode = 1;
    return;
  }

  await runScenario(userId, scenario as Scenario);
  out("");
  await printStatus(userId);
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
