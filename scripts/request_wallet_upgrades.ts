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
 * （探針已是 true）。探針問不到鏈上的人（RPC 不通等）這輪不發也不收，
 * 計入「無法判定」並讓 exit code 非 0 —— 見 `walletCanReceive`。
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
import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  ExecutionRevertedError,
} from "viem";
import { userRepo } from "@/repositories/user.repo";
import { disconnectPrisma } from "@/repositories/prisma_lifecycle.repo";
import { publicClient } from "@/lib/viem";
import {
  dismissWalletUpgrade,
  listUsersWithPendingWalletUpgrade,
  notifyWalletUpgradeRequested,
} from "@/services/notification.service";

// Info: (20260821 - Luphia) IERC721Receiver 的 interfaceId（與 worker 探針同值）
const RECEIVER_INTERFACE_ID = "0x150b7a02";

/**
 * Info: (20260825 - Julian) 探針問不到答案時丟這個，而不是回 false。
 *
 * 分開一個型別的理由是統計要分得開：「問到了，答案是還沒升級」與
 * 「根本沒問到」在報表上必須是兩個數字。
 */
class ProbeUndeterminedError extends Error {}

/**
 * Info: (20260825 - Julian) 只有**鏈上真的回答了**才算 false。
 *
 * 原本的寫法是 `catch { return false }`，理由是「V1 錢包沒有這個函式，
 * revert 就是 false」—— 那句話對，但那個 catch 接的不只 revert。
 * 它同樣接住 RPC 連不上、節點超時、chainId 設錯、address 根本不是合法
 * 位址。這幾種情況下這支腳本會把**全部使用者**判成尚待升級，而它發出的
 * 是一次性的 rollout 通知：dedupeKey 永久唯一，發錯了收不回來，
 * 使用者看到的是一則叫他去升級一個早就升級好的錢包的待辦。
 *
 * 預設值選 false 是把「不知道」講成「否」。這裡改成：
 *
 * - 合約 revert（V1 錢包沒有這個函式）→ false，如原設計
 * - 位址上沒有程式碼、回傳空資料（`0x`）→ false，同樣是鏈上的答案
 * - 其他任何錯誤 → 丟出去，計入「無法判定」，該位使用者這輪不發也不收
 *
 * 「合約 revert」在 viem 裡有兩種形狀，兩種都要接：節點回得出 revert data
 * 時是 `ContractFunctionRevertedError`（解得出 reason），只回一句
 * `execution reverted` 時是 RPC 層的 `ExecutionRevertedError`。
 * **沒有 `supportsInterface` 的 V1 錢包走的是後者** —— 也就是這裡最主要
 * 要接住的那一種。只接前者的話，正常的 V1 錢包會被誤判成「無法判定」。
 *
 * 值得多說一句的是最後一條的代價：RPC 掛掉時這支腳本會整批失敗而不是
 * 整批誤發。那正是要的方向 —— 沒發出去的通知下次重跑就補上了，
 * 發錯的收不回來。
 */
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
  } catch (error) {
    const answeredOnChain =
      error instanceof BaseError &&
      error.walk(
        (inner) =>
          inner instanceof ContractFunctionRevertedError ||
          inner instanceof ExecutionRevertedError ||
          inner instanceof ContractFunctionZeroDataError,
      ) !== null;
    // Info: (20260821 - Luphia) V1 錢包沒有這個函式：revert 就是 false
    if (answeredOnChain) return false;
    throw new ProbeUndeterminedError(
      `探針無法判定：${error instanceof BaseError ? error.shortMessage : String(error)}`,
      { cause: error },
    );
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

  const users = await userRepo.findMany({
    where: onlyUserId ? { id: onlyUserId } : {},
    select: { id: true, address: true },
  });
  out(`掃描 ${users.length} 位使用者`);

  /**
   * Info: (20260825 - Julian) 預演也要答得出「會收掉幾則」。
   *
   * 這支腳本重跑時同時做兩件事：發該發的、收該收的。預演原本只講得出
   * 前者 —— 而它是拿來在 `--commit` 之前確認數字合不合理的，
   * 少講一半等於它只驗了一半。
   *
   * 一支查詢查完整批（不是逐人問）：掃全站時後者是 N 次往返，
   * 而預演已經要為每個人做一次 eth_call 了，不該再加一層。
   */
  const pendingDismissal = await listUsersWithPendingWalletUpgrade({
    userIds: users.map((user) => user.id),
  });

  /**
   * Info: (20260826 - Julian) **先全部探完，再決定要不要動作**（review）。
   *
   * 原本探針與發送寫在同一個迴圈裡，於是「全體都判為尚待升級」這道
   * 健全性警告只可能出現在**預演**分支 —— 加了 `--commit` 的那一次，
   * 通知在警告有機會印出來之前就已經發完了。
   *
   * 而那正是最需要它的時候：RPC 或 chainId 指錯鏈時，`eth_call` 回 `0x`
   * 被判為 false（不是「無法判定」），於是這支腳本會對**全站每一個人**
   * 發一則永久、收不回的待辦（`dedupeKey` 唯一，補不回也撤不掉）。
   *
   * 兩段式的代價是要把探針結果留在記憶體裡；那是一個位址一個布林，
   * 而換到的是「決定」與「動作」分開，兩種模式看到的是同一份判斷。
   */
  const capableUsers: { id: string; address: string }[] = [];
  const pendingUsers: { id: string; address: string }[] = [];
  let undetermined = 0;

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
        capableUsers.push(user);
      } else {
        pendingUsers.push(user);
      }
    } catch (error) {
      if (error instanceof ProbeUndeterminedError) undetermined += 1;
      failures.push(
        `${user.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const capable = capableUsers.length;
  const pendingUpgrade = pendingUsers.length;

  /**
   * Info: (20260826 - Julian) 部署檢查表 §2.1 的規則寫進程式裡（review §1.9）。
   *
   * 那份文件寫著「探針分三態，『無法判定』不是 0 就不能加 `--commit`」，
   * 而先前那句話**只存在於文件裡** —— 一個人記得就成立，忘了就不成立。
   * 這裡讓它變成不需要有人記得的東西。
   *
   * 兩道守門都是**中止**而不是警告後照跑：這支腳本發出的是永久、
   * 收不回的通知，而它沒發出去的部分下次重跑就補上了。
   * 錯誤的方向必須是「少發」，不能是「發錯」。
   */
  const blockers: string[] = [];
  if (undetermined > 0) {
    blockers.push(
      `有 ${undetermined} 位使用者的探針無法判定。鏈上沒答覆時不能推測，` +
        `先修好 RPC 再重跑（部署檢查表 §2.1）。`,
    );
  }
  /**
   * Info: (20260825 - Julian) 「全部人都尚待升級」剩下的那個可疑情況。
   *
   * 探針已經會把問不到的情形算進「無法判定」，所以這裡不再是猜的：
   * 鏈上真的回答了，而答案是所有人都沒升級。剩下最可能的解釋是
   * 問錯了鏈 —— chainId 或 RPC 指向另一個網路，合約不在那上面，
   * 回傳空資料同樣被判為 false。
   */
  if (users.length > 1 && pendingUpgrade === users.length) {
    blockers.push(
      "鏈上回答了，但所有人都判為尚待升級。先確認 NEXT_PUBLIC_RPC_URL 與 " +
        "NEXT_PUBLIC_ISUNCOIN_CHAIN_ID 指向的是部署錢包合約的那條鏈，" +
        "再用 --user <已升級的 userId> 單獨驗一次。",
    );
  }

  let sent = 0;
  let dismissed = 0;
  let wouldDismiss = 0;

  if (blockers.length > 0) {
    process.stderr.write(
      `\n🛑 健全性檢查未通過（${commit ? "已中止，未發出任何通知" : "預演"}）：\n`,
    );
    blockers.forEach((line) => process.stderr.write(`  - ${line}\n`));
    process.exitCode = 1;
  }

  // Info: (20260826 - Julian) 守門沒過就**完全不動作**，連收掉待辦都不做
  const mayAct = commit && blockers.length === 0;

  if (mayAct) {
    for (const user of capableUsers) {
      try {
        // Info: (20260825 - Julian) 升級完成 → 收掉那則還掛著的待辦（見檔頭）
        dismissed += await dismissWalletUpgrade({
          userId: user.id,
          nowMs: Date.now(),
        });
      } catch (error) {
        failures.push(
          `${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    for (const user of pendingUsers) {
      try {
        if (await notifyWalletUpgradeRequested({ userId: user.id })) {
          sent += 1;
        }
      } catch (error) {
        failures.push(
          `${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } else if (!commit) {
    wouldDismiss = capableUsers.filter((user) =>
      pendingDismissal.has(user.id),
    ).length;
  }

  // Info: (20260825 - Julian) 三個數字加起來要等於掃描人數，少一個就是有人被漏掉
  out(`已具備接收能力（不發）：${capable}`);
  out(`尚待升級：${pendingUpgrade}`);
  out(`無法判定（探針沒問到鏈上）：${undetermined}`);
  if (mayAct) {
    out(`本次新發出：${sent}（其餘為先前已發過，dedupe 擋下）`);
    out(`已升級而收掉的待辦：${dismissed}`);
  } else if (commit) {
    out("\n（健全性檢查未通過，本次未發出也未收掉任何通知）");
  } else {
    out(`將收掉的待辦（已升級但仍掛著）：${wouldDismiss}`);
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
    await disconnectPrisma();
  });
