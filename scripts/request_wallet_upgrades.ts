/**
 * Info: (20260821 - Luphia) 對「錢包尚不能收 ERC-721」的使用者發出升級待辦
 * （ADR 021 rollout 第 5 步；通知顯示在小鈴鐺的待辦區）。
 *
 * 判斷方式與會員卡 worker 的探針同一條：對使用者的錢包 eth_call
 * `supportsInterface(0x150b7a02)`——V1 錢包沒有這個函式（revert → 視為 false），
 * 升級完成的錢包回 true。**只發給探針為 false 的人**：已升級的人不該收到
 * 一則按了沒事做的待辦。
 *
 * 冪等：dedupeKey 一人一則，重跑不會重複發；已升級者再跑也不會補發
 * （探針已是 true）。
 *
 * Info: (20260825 - Julian) **已發出但後來升級完成的待辦，由這支腳本收掉**
 * （原本寫的是「由使用者開鈴鐺已讀收掉」，那條路已經拿掉）。
 *
 * 原因：待辦型與事件型的關閉條件不同。事件型讀過即已讀；待辦型要等
 * 「事情真的做完了」。而「打開鈴鐺就標記已讀」不分兩者，於是使用者
 * 點一下鈴鐺——連展開都不必——就把一則他還沒處理的升級待辦丟掉了，
 * 而 dedupeKey 是永久唯一鍵，重跑這支腳本會撞 P2002 並回報「先前已發過」，
 * 補不回來（計畫書 D1）。
 *
 * 現在的行為：探針回 true（錢包真的升級好了）→ 收掉那則未讀待辦。
 * 這也讓重跑這支腳本成為一次對帳：發該發的、收該收的。
 *
 * 用法（預設預演，不寫入）：
 *
 *     npx tsx scripts/request_wallet_upgrades.ts
 *     npx tsx scripts/request_wallet_upgrades.ts --commit
 *     npx tsx scripts/request_wallet_upgrades.ts --user <userId> --commit
 */
import { prisma } from "@/lib/prisma";
import { publicClient } from "@/lib/viem";
import {
  dismissWalletUpgrade,
  notifyWalletUpgradeRequested,
} from "@/services/notification.service";

// Info: (20260821 - Luphia) IERC721Receiver 的 interfaceId（與 worker 探針同值）
const RECEIVER_INTERFACE_ID = "0x150b7a02";

async function walletCanReceive(address: string): Promise<boolean> {
  try {
    const result = (await publicClient.readContract({
      address: address as `0x${string}`,
      abi: [
        {
          type: "function",
          name: "supportsInterface",
          stateMutability: "view",
          inputs: [{ name: "interfaceId", type: "bytes4" }],
          outputs: [{ name: "", type: "bool" }],
        },
      ] as const,
      functionName: "supportsInterface",
      args: [RECEIVER_INTERFACE_ID as `0x${string}`],
    })) as boolean;
    return result === true;
  } catch {
    // Info: (20260821 - Luphia) V1 錢包沒有這個函式：revert 就是 false
    return false;
  }
}

async function main(): Promise<void> {
  const argv = process.argv;
  const commit = argv.includes("--commit");
  const userIndex = argv.indexOf("--user");
  const onlyUserId = userIndex >= 0 ? argv[userIndex + 1] : undefined;
  // Info: (20260821 - Luphia) `--user` 少帶值時不要靜默變成全域（同 backfill 腳本的慣例）
  if (userIndex >= 0 && !onlyUserId) {
    process.stderr.write("--user 後面必須帶 userId\n");
    process.exitCode = 1;
    return;
  }

  const out = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };

  out(
    commit
      ? "=== 實際發送模式（--commit）"
      : "=== 預演（未加 --commit，不會發出任何通知）",
  );

  const users = await prisma.user.findMany({
    where: onlyUserId ? { id: onlyUserId } : {},
    select: { id: true, address: true },
  });
  out(`掃描 ${users.length} 位使用者`);

  let capable = 0;
  let pendingUpgrade = 0;
  let sent = 0;
  let dismissed = 0;
  /**
   * Info: (20260825 - Julian) 逐人 try/catch，失敗記下來繼續跑。
   *
   * `notifyWalletUpgradeRequested` 會拋（那是刻意的，見它的說明）。
   * 一路往上丟到 `main().catch` 的話，第 500 位使用者的連線中斷會讓
   * 剩下的一則都沒發，而這支腳本沒有續跑點也沒有進度檔 ——
   * 「已發出的 499 則保留、其餘全部沒發」而輸出只有一段 stack。
   */
  const failures: string[] = [];

  for (const user of users) {
    try {
      if (await walletCanReceive(user.address)) {
        capable += 1;
        // Info: (20260825 - Julian) 升級完成 → 收掉那則還掛著的待辦（見檔頭）
        if (commit) {
          dismissed += await dismissWalletUpgrade({
            userId: user.id,
            nowMs: Date.now(),
          });
        }
        continue;
      }
      pendingUpgrade += 1;
      if (!commit) continue;
      if (await notifyWalletUpgradeRequested({ userId: user.id })) {
        sent += 1;
      }
    } catch (error) {
      failures.push(
        `${user.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  out(`已具備接收能力（不發）：${capable}`);
  out(`尚待升級：${pendingUpgrade}`);
  if (commit) {
    out(`本次新發出：${sent}（其餘為先前已發過，dedupe 擋下）`);
    out(`已升級而收掉的待辦：${dismissed}`);
  } else {
    out("\n加上 --commit 才會實際發送。");
  }

  /**
   * Info: (20260825 - Julian) 失敗清單要印出來，而且要讓 exit code 非 0。
   * 只印數字的話，「500 人有 3 人沒發成功」在 CI 或排程裡看起來與全數成功一樣。
   */
  if (failures.length > 0) {
    process.stderr.write(`\n${failures.length} 位處理失敗：\n`);
    failures.forEach((line) => process.stderr.write(`  ${line}\n`));
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.stack : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
