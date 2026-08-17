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
});

describe("費思記憶的 AAD 回填（真資料庫）", () => {
  /**
   * Info: (20260818 - Luphia) 先確認前提成立：舊格式的列以新 AAD **讀不到**，
   * 而且 repo 會誠實回報 `unreadable`（第四輪 B-4 的另一半）。
   * 若這一條變綠色了（讀得到），那代表 AAD 綁定失效——比回填沒跑更嚴重。
   */
  it("回填之前：舊格式的列讀不到，且被標為 unreadable", async () => {
    const record = await faithMemoryRepo.get(userId, teamId);
    expect(record?.items).toEqual([]);
    expect(record?.unreadable).toBe(true);
    expect(record?.lostItemCount).toBe(ITEMS.length);
  });

  // Info: (20260818 - Luphia) 預演只統計、不得寫入：讀不到的狀態必須維持原樣
  it("預演會算出要重新封裝的列數，但不寫入", async () => {
    const summary = await run(false);
    expect(summary.resealed).toBeGreaterThanOrEqual(1);
    expect(summary.unreadable).toEqual([]);

    const record = await faithMemoryRepo.get(userId, teamId);
    expect(record?.unreadable).toBe(true);
  });

  /**
   * Info: (20260818 - Luphia) 本檔最重要的一條：`--commit` 之後 repo 讀回**原本的內容**。
   * 不只是「不再 unreadable」——內容一致才代表重新封裝用的是解出來的明文。
   */
  it("實際執行後讀得回原本的偏好", async () => {
    await run(true);

    const record = await faithMemoryRepo.get(userId, teamId);
    expect(record?.unreadable).toBeUndefined();
    expect(record?.items).toEqual(ITEMS);
  });

  // Info: (20260818 - Luphia) 冪等：已遷移的列算進 already，不會被二次封裝
  it("重跑時已遷移的列不再被處理", async () => {
    const summary = await run(true);
    expect(summary.already).toBeGreaterThanOrEqual(1);

    const record = await faithMemoryRepo.get(userId, teamId);
    expect(record?.items).toEqual(ITEMS);
  });
});
