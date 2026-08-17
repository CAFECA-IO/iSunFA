import { prisma } from "@/lib/prisma";
import { openSecret, sealSecret, VaultPurpose } from "@/lib/auth/key_vault";

/**
 * Info: (20260818 - Luphia) 把既有的費思記憶密文重新封裝成 AAD 綁定的版本。
 *
 * 為什麼需要：AAD 綁定（PR #6652 第三輪 C-5）之後，`faithMemoryRepo` 讀取時會帶
 * `faith-memory:{userId}:{teamId}` 當 AAD，而**在那之前封裝的密文沒有 AAD**——
 * GCM 驗證必定失敗。症狀不是報錯，是安靜的資料遺失：
 *
 *   解不開 → 回 `items: []` → 使用者下一句話 → 合併結果只有新條目 → upsert 覆寫
 *
 * 也就是說，不跑這支的話，每一位在改動前累積過偏好的使用者，
 * 都會在他下一次對話時失去那些偏好。程式端已補上一道防線（覆寫時寫入
 * `CIPHERTEXT_UNREADABLE` 稽核列並告警），但那是「記錄損失」，不是「避免損失」。
 * 這支才是避免損失的那一半。
 *
 * 執行順序很重要：**schema 套用之後、開放使用者對話之前**。晚跑一步，
 * 已經對話過的那些人就已經失去偏好了，而重新封裝救不回被覆寫的列。
 *
 * 執行方式：
 *   npx tsx scripts/backfill_faith_memory_aad.ts                    # 預演，只統計不寫入
 *   npx tsx scripts/backfill_faith_memory_aad.ts --commit           # 實際重新封裝
 *   npx tsx scripts/backfill_faith_memory_aad.ts --user <userId>    # 只處理某一位（可與 --commit 併用）
 *
 * `--user` 供逐位重跑：全域跑完之後若有列落在 `unreadable`，修好主密鑰設定
 * （或確認那批列該刪）之後可以只重跑那一位，不必再掃全表。
 *
 * 冪等：已經是 AAD 版本的列會被判為 `already`（以新 AAD 解得開）而跳過，
 * 重跑不會改動它們，也不會二次封裝。
 *
 * **不印任何明文**：這支會解開使用者的偏好內容，而它的輸出可能進 CI log。
 * 只印計數與 id。
 */

export interface IBackfillSummary {
  total: number;
  // Info: (20260818 - Luphia) 本次重新封裝的列數（--commit 時才會真的寫入）
  resealed: number;
  // Info: (20260818 - Luphia) 已是 AAD 版本，跳過
  already: number;
  /**
   * Info: (20260818 - Luphia) 兩種方式都解不開：不是遷移問題（金鑰輪替失誤、
   * 密文毀損、或主密鑰不對）。**刻意不動這些列**——重新封裝需要明文，
   * 而這裡拿不到明文，硬寫只會用錯的內容覆蓋掉還可能救得回來的密文。
   */
  unreadable: string[];
}

function memoryAad(userId: string, teamId: string): string {
  return `faith-memory:${userId}:${teamId}`;
}

/**
 * Info: (20260818 - Luphia) 匯出供 e2e 呼叫（`free_plan_invite_cap` 同一個作法）。
 * 回填腳本的正確性只能對真資料驗——而「遷移沒跑對」的後果是使用者的偏好消失。
 */
export async function run(
  commit: boolean,
  options: { userId?: string } = {},
): Promise<IBackfillSummary> {
  const rows = await prisma.faithMemory.findMany({
    // Info: (20260818 - Luphia) 未指定 userId 即全表；指定時只處理那一位的列
    where: options.userId ? { userId: options.userId } : undefined,
    select: {
      id: true,
      userId: true,
      teamId: true,
      itemsCipher: true,
      itemsIv: true,
      itemsTag: true,
      keyVersion: true,
    },
  });

  const summary: IBackfillSummary = {
    total: rows.length,
    resealed: 0,
    already: 0,
    unreadable: [],
  };

  for (const row of rows) {
    const sealed = {
      ciphertext: row.itemsCipher,
      iv: row.itemsIv,
      authTag: row.itemsTag,
      keyVersion: row.keyVersion,
    };
    const aad = memoryAad(row.userId, row.teamId);

    // Info: (20260818 - Luphia) 先試新版本：已遷移的列在這裡就會被認出來
    try {
      openSecret(sealed, VaultPurpose.FAITH_MEMORY, aad);
      summary.already += 1;
      continue;
    } catch {
      // Info: (20260818 - Luphia) 解不開屬預期：可能是舊格式，往下試
    }

    let plaintext: string;
    try {
      // Info: (20260818 - Luphia) 舊格式＝沒有 AAD（`aad` 參數是選填的，正是為此保留）
      plaintext = openSecret(sealed, VaultPurpose.FAITH_MEMORY);
    } catch {
      summary.unreadable.push(row.id);
      continue;
    }

    summary.resealed += 1;
    if (!commit) continue;

    const next = sealSecret(plaintext, VaultPurpose.FAITH_MEMORY, aad);
    await prisma.faithMemory.update({
      where: { id: row.id },
      data: {
        itemsCipher: next.ciphertext,
        itemsIv: next.iv,
        itemsTag: next.authTag,
        keyVersion: next.keyVersion,
      },
    });
  }

  return summary;
}

async function main(): Promise<void> {
  const commit = process.argv.includes("--commit");
  const userFlag = process.argv.indexOf("--user");
  const userId = userFlag === -1 ? undefined : process.argv[userFlag + 1];
  if (userFlag !== -1 && !userId) {
    console.error("[backfill_faith_memory_aad] --user 後面要接 userId");
    process.exitCode = 1;
    return;
  }

  const summary = await run(commit, { userId });

  console.log(
    `[backfill_faith_memory_aad] ${commit ? "COMMIT" : "DRY-RUN"} ` +
      `${userId ? `user=${userId} ` : ""}` +
      `total=${summary.total} resealed=${summary.resealed} ` +
      `already=${summary.already} unreadable=${summary.unreadable.length}`,
  );

  if (summary.unreadable.length > 0) {
    /**
     * Info: (20260818 - Luphia) 這些列需要人看一眼，不該被當成「跑完了」。
     * 兩種方式都解不開代表問題不在 AAD——先確認 `SECRET_VAULT_MASTER_KEY`
     * 是不是這個環境當初封裝時用的那一把，再決定要救還是要刪。
     */
    console.error(
      `[backfill_faith_memory_aad] 以下列兩種方式都解不開，未做任何變更：\n` +
        summary.unreadable.map((id) => `  - ${id}`).join("\n"),
    );
  }

  if (!commit && summary.resealed > 0) {
    console.log(
      "[backfill_faith_memory_aad] 以 --commit 重跑才會實際寫入；" +
        "請在開放使用者對話之前完成。",
    );
  }
}

/**
 * Info: (20260818 - Luphia) 只有直接執行時才跑 main：這個檔案會被 e2e 匯入，
 * 而匯入時自動連線、自動 `$disconnect` 會把測試自己的連線關掉。
 */
if (process.argv[1]?.includes("backfill_faith_memory_aad")) {
  main()
    .catch((error: unknown) => {
      console.error("[backfill_faith_memory_aad] failed:", error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
