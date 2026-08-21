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
 * （探針已是 true）。已發出但後來升級完成的待辦，由使用者開鈴鐺已讀收掉
 * ——不自動撤回，因為「你已完成升級」本身也值得被看見一次。
 *
 * 用法（預設預演，不寫入）：
 *
 *     npx tsx scripts/request_wallet_upgrades.ts
 *     npx tsx scripts/request_wallet_upgrades.ts --commit
 *     npx tsx scripts/request_wallet_upgrades.ts --user <userId> --commit
 */
import { prisma } from "@/lib/prisma";
import { publicClient } from "@/lib/viem";
import { notifyWalletUpgradeRequested } from "@/services/notification.service";

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
  for (const user of users) {
    if (await walletCanReceive(user.address)) {
      capable += 1;
      continue;
    }
    pendingUpgrade += 1;
    if (!commit) continue;
    if (await notifyWalletUpgradeRequested({ userId: user.id })) {
      sent += 1;
    }
  }

  out(`已具備接收能力（不發）：${capable}`);
  out(`尚待升級：${pendingUpgrade}`);
  if (commit) {
    out(`本次新發出：${sent}（其餘為先前已發過，dedupe 擋下）`);
  } else {
    out("\n加上 --commit 才會實際發送。");
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
