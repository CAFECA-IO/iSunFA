import { describe, it, expect, afterEach, beforeEach } from "@jest/globals";
import { openSecret, sealSecret, VaultPurpose } from "@/lib/auth/key_vault";

/**
 * Info: (20260818 - Luphia) 密文要綁在它該屬於的那一列上（PR #6652 第三輪 C-5）。
 *
 * GCM 的 authTag 保證「密文沒被竄改」，**不保證「這份密文屬於這一列」**。
 * 沒有 AAD 時，有 DB 寫入權的人可以把 A 的四個欄位整組複製到 B 的列上，
 * B 下次讀取就解出 A 的明文——而 authTag 完全不會察覺，因為密文本身是完整的。
 *
 * 對費思記憶而言，那代表 A 的對話偏好會被注入 B 的 prompt。
 * 規範 §6.2 與 ADR 018 都宣稱「密文與列綁定」，而在此之前並沒有。
 */

/**
 * Info: (20260818 - Luphia) 主密鑰的環境變數名是 `SECRET_VAULT_MASTER_KEY`。
 *
 * 原本這裡設的是 `VAULT_MASTER_KEY`——一個不存在的名字。本機仍然全綠，
 * 因為 `.env` 裡有真的那一個；CI 沒有 `.env`，於是五條全部以
 * 「Server configuration missing」失敗。**測試自己準備的前提要真的生效**，
 * 否則綠燈只是說明「這台機器剛好有那個值」。
 */
const ORIGINAL_MASTER_KEY = process.env.SECRET_VAULT_MASTER_KEY;

beforeEach(() => {
  // Info: (20260818 - Luphia) 派生金鑰需要主密鑰；測試用固定值即可（長度須 >= 32）
  process.env.SECRET_VAULT_MASTER_KEY = "a".repeat(64);
});

// Info: (20260818 - Luphia) 還原，避免影響同一個 worker 內的其他測試
afterEach(() => {
  if (ORIGINAL_MASTER_KEY === undefined) {
    delete process.env.SECRET_VAULT_MASTER_KEY;
  } else {
    process.env.SECRET_VAULT_MASTER_KEY = ORIGINAL_MASTER_KEY;
  }
});

const AAD_A = "faith-memory:user-a:team-1";
const AAD_B = "faith-memory:user-b:team-1";

describe("sealSecret / openSecret 的 AAD 綁定", () => {
  it("同一組 AAD 解得開", () => {
    const sealed = sealSecret("回答請簡短", VaultPurpose.FAITH_MEMORY, AAD_A);
    expect(openSecret(sealed, VaultPurpose.FAITH_MEMORY, AAD_A)).toBe(
      "回答請簡短",
    );
  });

  /**
   * Info: (20260818 - Luphia) 本檔最重要的一條：把 A 的密文搬到 B 的列上
   * （＝以 B 的 AAD 解開）必須失敗。這正是「密文與列綁定」的全部內容。
   */
  it("換成別人的 AAD 解不開", () => {
    const sealed = sealSecret("回答請簡短", VaultPurpose.FAITH_MEMORY, AAD_A);
    expect(() =>
      openSecret(sealed, VaultPurpose.FAITH_MEMORY, AAD_B),
    ).toThrow();
  });

  // Info: (20260818 - Luphia) 漏傳 AAD 同樣解不開——防的是「忘記綁」而不只是「綁錯」
  it("封裝時綁了、解開時沒帶，同樣失敗", () => {
    const sealed = sealSecret("回答請簡短", VaultPurpose.FAITH_MEMORY, AAD_A);
    expect(() => openSecret(sealed, VaultPurpose.FAITH_MEMORY)).toThrow();
  });

  /**
   * Info: (20260818 - Luphia) AAD 是**選填**，而且必須維持選填。
   *
   * 既有的託管金鑰與系統設定密文是在沒有 AAD 的情況下封裝的；
   * 把參數改成必填會讓它們全部解不開。這一條守的是那個相容性。
   */
  it("不帶 AAD 的封裝與解開仍然可用", () => {
    const sealed = sealSecret("secret", VaultPurpose.SYSTEM_SETTING);
    expect(openSecret(sealed, VaultPurpose.SYSTEM_SETTING)).toBe("secret");
  });

  // Info: (20260818 - Luphia) 子金鑰仍然分離：purpose 不同一樣解不開
  it("換成別的 purpose 解不開", () => {
    const sealed = sealSecret("回答請簡短", VaultPurpose.FAITH_MEMORY, AAD_A);
    expect(() =>
      openSecret(sealed, VaultPurpose.SYSTEM_SETTING, AAD_A),
    ).toThrow();
  });
});

/**
 * Info: (20260818 - Luphia) 記憶的 repo 必須真的傳 AAD（第三輪 C-5）。
 *
 * 以原始碼比對釘住：AAD 的值來自 `(userId, teamId)`，而漏傳的症狀是
 * 「一切正常運作」——密文照樣解得開，只是不再綁定任何列。
 * 行為測試看不出差別，只有跨列複製時才會顯現，而那不是單元測試能構造的情境。
 */
describe("記憶的密文有綁定", () => {
  it("seal 與 open 都帶上以 userId/teamId 組成的 AAD", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const repo = readFileSync(
      join(process.cwd(), "src", "repositories", "faith_memory.repo.ts"),
      "utf8",
    );

    expect(repo).toMatch(
      /function memoryAad\(userId: string, teamId: string\)/,
    );
    // Info: (20260818 - Luphia) 兩側都要帶，只帶一側會變成永遠解不開
    const calls = repo.match(/memoryAad\(userId, teamId\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});
