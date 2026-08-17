import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { sealSecret, VaultPurpose } from "@/lib/auth/key_vault";
import { faithMemoryRepo } from "@/repositories/faith_memory.repo";
import { run } from "@/../scripts/backfill_faith_memory_aad";
import { TeamRole } from "@/constants/team";
import type { IFaithMemoryItem } from "@/lib/faith_memory/items";
import { FAITH_MEMORY_CATEGORY } from "@/constants/faith_memory";

/**
 * Info: (20260818 - Luphia) AAD 遷移的回填腳本（PR #6652 第四輪 B-4）。
 *
 * 這支對**真資料庫**跑，因為它守的正是「遷移沒跑對」的後果：AAD 綁定
 * （第三輪 C-5）之前封裝的密文以新 AAD 解必定失敗，而失敗的症狀不是報錯，
 * 是安靜的資料遺失——回 `items: []` → 使用者下一句話 → 合併後覆寫 → 偏好消失。
 *
 * 回填腳本的正確性沒辦法用 mock 證明：mock 掉 `openSecret` 之後剩下的只是
 * 「有沒有呼叫 update」，而真正要證明的是「舊格式的密文解得開、重新封裝之後
 * repo 讀得回同樣的內容」。那需要真的加解密與真的一列資料。
 */

// Info: (20260818 - Luphia) 🛑 正式機實體隔離（與同層 e2e 一致）
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免改寫真實使用者的記憶密文！",
  );
}

const ITEMS: IFaithMemoryItem[] = [
  {
    category: FAITH_MEMORY_CATEGORY.ANSWER_STYLE,
    statement: "回答請簡短",
    // Info: (20260818 - Luphia) epoch 秒（見 IFaithMemoryItem），固定值以便比對
    updatedAt: 1_760_000_000,
  },
];

let userId = "";
let teamId = "";

/**
 * Info: (20260818 - Luphia) 自己備好主密鑰（第四輪自審）。
 *
 * CI 沒有 `.env`，而封裝與解封都需要 `SECRET_VAULT_MASTER_KEY`——不設就會在
 * `beforeAll` 以「Server configuration missing」整支失敗。這正是本輪修掉的
 * `key_vault_aad.test.ts` 同一個形狀：**本機綠是因為這台機器剛好有那個值**。
 *
 * 用固定的測試金鑰而非真實金鑰是安全的：回填腳本對「兩種方式都解不開」的列
 * 刻意不做任何變更，而本檔又以 `--user` 限定只處理自己建的那一列。
 */
const TEST_MASTER_KEY = "b".repeat(64);
const ORIGINAL_MASTER_KEY = process.env.SECRET_VAULT_MASTER_KEY;

/**
 * Info: (20260818 - Luphia) 以**舊格式**（不帶 AAD）封裝，模擬遷移前的既有列。
 * 這是本檔的前提：`sealSecret` 的 `aad` 參數是選填的，正是為了這批資料。
 */
function sealWithoutAad(items: IFaithMemoryItem[]) {
  const sealed = sealSecret(JSON.stringify(items), VaultPurpose.FAITH_MEMORY);
  return {
    itemsCipher: sealed.ciphertext,
    itemsIv: sealed.iv,
    itemsTag: sealed.authTag,
    keyVersion: sealed.keyVersion,
    itemCount: items.length,
  };
}

beforeAll(async () => {
  process.env.SECRET_VAULT_MASTER_KEY = TEST_MASTER_KEY;

  const user = await prisma.user.create({
    data: { address: `e2e_aad_${Date.now()}`, name: "E2E AAD" },
  });
  userId = user.id;
  const team = await prisma.team.create({
    data: { name: `e2e-aad-${Date.now()}` },
  });
  teamId = team.id;
  await prisma.teamMember.create({
    data: { teamId, userId, role: TeamRole.OWNER },
  });
  await prisma.faithMemory.create({
    data: { userId, teamId, ...sealWithoutAad(ITEMS) },
  });
});

afterAll(async () => {
  await prisma.faithMemory.deleteMany({ where: { userId } });
  await prisma.faithMemoryDeletionLog.deleteMany({ where: { userId } });
  await prisma.teamMember.deleteMany({ where: { teamId } });
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();

  if (ORIGINAL_MASTER_KEY === undefined) {
    delete process.env.SECRET_VAULT_MASTER_KEY;
  } else {
    process.env.SECRET_VAULT_MASTER_KEY = ORIGINAL_MASTER_KEY;
  }
});

describe("費思記憶的 AAD 回填（真資料庫）", () => {
  /**
   * Info: (20260818 - Luphia) 遷移是一條**有順序的流程**，因此寫成單一測試。
   *
   * 拆成四條 `it` 會讓後面三條依賴前面幾條留下的資料庫狀態——那種耦合是隱性的，
   * 單獨重跑其中一條就會失敗，而 jest 的執行順序不是測試該依賴的東西。
   *
   * 每一步的斷言意義都寫在該步旁邊。
   */
  it("讀不到 → 預演不寫入 → commit 後讀回原內容 → 重跑冪等", async () => {
    /**
     * Info: (20260818 - Luphia) 第 1 步先確認前提成立：舊格式的列以新 AAD **讀不到**，
     * 而且 repo 誠實回報 `unreadable`（第四輪 B-4 的另一半）。
     * 若這一步讀得到，代表 AAD 綁定失效——那比回填沒跑更嚴重。
     */
    const before = await faithMemoryRepo.get(userId, teamId);
    expect(before?.items).toEqual([]);
    expect(before?.unreadable).toBe(true);
    expect(before?.lostItemCount).toBe(ITEMS.length);

    // Info: (20260818 - Luphia) 第 2 步：預演只統計、不得寫入
    const dryRun = await run(false, { userId });
    expect(dryRun.total).toBe(1);
    expect(dryRun.resealed).toBe(1);
    expect(dryRun.already).toBe(0);
    expect(dryRun.unreadable).toEqual([]);
    expect((await faithMemoryRepo.get(userId, teamId))?.unreadable).toBe(true);

    /**
     * Info: (20260818 - Luphia) 第 3 步是本檔最重要的斷言：`--commit` 之後
     * repo 讀回**原本的內容**。不只是「不再 unreadable」——內容一致才代表
     * 重新封裝用的是解出來的明文，而不是別的東西。
     */
    const committed = await run(true, { userId });
    expect(committed.resealed).toBe(1);

    const after = await faithMemoryRepo.get(userId, teamId);
    expect(after?.unreadable).toBeUndefined();
    expect(after?.items).toEqual(ITEMS);

    // Info: (20260818 - Luphia) 第 4 步：冪等——已遷移的列算進 already，不再處理
    const rerun = await run(true, { userId });
    expect(rerun.already).toBe(1);
    expect(rerun.resealed).toBe(0);
    expect((await faithMemoryRepo.get(userId, teamId))?.items).toEqual(ITEMS);
  });

  /**
   * Info: (20260818 - Luphia) `--user` 限定範圍：不得動到別人的列。
   *
   * 這一條有兩個用途：ops 逐位重跑，以及讓這支測試不會在開發者的資料庫上
   * 重新封裝別人的記憶（全表模式會掃到那些列）。
   */
  it("--user 只處理指定的那一位", async () => {
    const summary = await run(false, { userId: "no-such-user" });
    expect(summary.total).toBe(0);
    expect(summary.resealed).toBe(0);
  });
});
