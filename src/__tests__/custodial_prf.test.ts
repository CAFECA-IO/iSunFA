import { describe, it, expect, beforeAll, jest } from "@jest/globals";
import { WalletCustodyType } from "@/constants/auth_provider";
import { derivePurposeSecret, VaultPurpose } from "@/lib/auth/key_vault";

/**
 * Info: (20260812 - Luphia) 託管帳號的 PRF 替身。
 *
 * 這組測試守的是三件事，每一件壞掉的後果都不同：
 * 1. **決定性** —— 不決定性的話，同一份包裝下次就解不開，使用者的對話直接失聯。
 * 2. **隔離** —— 不同使用者、不同 salt 必須得到不同秘密，否則一個人的秘密解得開別人的。
 * 3. **passkey 帳號一律拒絕** —— 否則這支端點就是一條把非託管帳號降級成
 *    「伺服器可解密」的路徑，而呼叫端只要少傳一個參數就會踩到。
 */
const resolveCustodyType = jest.fn<(userId: string) => Promise<string>>();

jest.mock("@/lib/auth/user_approval", () => ({
  resolveCustodyType: (userId: string) => resolveCustodyType(userId),
}));

// Info: (20260812 - Luphia) mock 之後才能載入 service，否則它綁到的是真實實作
const loadService = async () => {
  const loaded = await import("@/services/custodial_prf.service");
  return loaded.custodialPrfService;
};

describe("custodial PRF surrogate", () => {
  const SALT = "c2FsdC0x";

  beforeAll(() => {
    process.env.SECRET_VAULT_MASTER_KEY =
      "test-master-key-at-least-32-characters-long";
  });

  it("should derive the same secret for the same user and salt", async () => {
    resolveCustodyType.mockResolvedValue(WalletCustodyType.CUSTODIAL);
    const service = await loadService();

    const first = await service.derive({ userId: "user-1", prfSalt: SALT });
    const second = await service.derive({ userId: "user-1", prfSalt: SALT });

    expect(first).toBe(second);
    // Info: (20260812 - Luphia) 32 bytes 的 base64 是 44 字元（含一個 padding）
    expect(first).toHaveLength(44);
  });

  it("should isolate different users and different salts", async () => {
    resolveCustodyType.mockResolvedValue(WalletCustodyType.CUSTODIAL);
    const service = await loadService();

    const mine = await service.derive({ userId: "user-1", prfSalt: SALT });
    const theirs = await service.derive({ userId: "user-2", prfSalt: SALT });
    const otherSalt = await service.derive({
      userId: "user-1",
      prfSalt: "c2FsdC0y",
    });

    expect(theirs).not.toBe(mine);
    expect(otherSalt).not.toBe(mine);
  });

  /**
   * Info: (20260812 - Luphia) passkey 帳號的秘密只該由自己的驗證器產生。
   * 在伺服器擋而不是靠前端不要傳 —— 前端的自律不是安全邊界。
   */
  it("should refuse a passkey account", async () => {
    resolveCustodyType.mockResolvedValue(WalletCustodyType.PASSKEY);
    const service = await loadService();

    await expect(
      service.derive({ userId: "user-1", prfSalt: SALT }),
    ).rejects.toThrow();
  });

  /**
   * Info: (20260812 - Luphia) 用途隔離:service 必須用 `CUSTODIAL_PRF` 派生，
   * 不得沿用簽章私鑰的保管用途。共用會讓「解開對話」與「動用資金」
   * 落在同一個信任邊界內，而兩者的外洩後果完全不同。
   *
   * 斷言的是 **service 的實際輸出**而不是只比較兩個 `derivePurposeSecret` ——
   * 後者只證明兩個用途不同，證明不了 service 選了哪一個。
   * （實測:只比較兩者的版本，把 service 改用 CUSTODIAL_KEY 不會有任何測試變紅。）
   */
  it("should derive with the PRF purpose, not the signing purpose", async () => {
    resolveCustodyType.mockResolvedValue(WalletCustodyType.CUSTODIAL);
    const service = await loadService();

    const actual = await service.derive({ userId: "user-1", prfSalt: SALT });
    const info = `user-1:${SALT}`;

    expect(actual).toBe(
      derivePurposeSecret(VaultPurpose.CUSTODIAL_PRF, info).toString("base64"),
    );
    expect(actual).not.toBe(
      derivePurposeSecret(VaultPurpose.CUSTODIAL_KEY, info).toString("base64"),
    );
  });
});
