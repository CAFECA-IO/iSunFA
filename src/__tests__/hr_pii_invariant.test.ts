import { describe, it, expect } from "@jest/globals";
import {
  assertStorablePii,
  HrPiiInvariantError,
} from "@/repositories/hr_pii_invariant";
import { HrPiiTable } from "@/constants/hr_pii";

/**
 * Info: (20260811 - Julian) 這條不變式守的是「寫得進去卻永遠讀不出來的終態」。
 *
 * 密文能不能解開，完全取決於同一列的 `piiKeyVersion`。少了它，
 * 金鑰輪替之後沒有任何辦法試回來 —— 而重建那筆資料所需要的明文，
 * 正好只存在於那筆解不開的紀錄裡。下面每一個被擋下的組合都對應這種紀錄。
 */
describe("assertStorablePii", () => {
  const table = HrPiiTable.EMPLOYEE;

  it("should accept ciphertext written together with a key version", () => {
    expect(() =>
      assertStorablePii(table, {
        ciphers: { nationalIdCipher: "cipher", phoneCipher: "cipher" },
        keyVersion: 1,
        algorithm: "AES-256-GCM",
      }),
    ).not.toThrow();
  });

  it("should accept a row with no PII at all", () => {
    expect(() =>
      assertStorablePii(HrPiiTable.DEPENDENT, {
        ciphers: { nationalIdCipher: null, birthdayCipher: undefined },
        keyVersion: null,
        algorithm: "AES-256-GCM",
      }),
    ).not.toThrow();
  });

  it("should reject ciphertext without a key version", () => {
    expect(() =>
      assertStorablePii(table, {
        ciphers: { nationalIdCipher: "cipher" },
        keyVersion: null,
        algorithm: "AES-256-GCM",
      }),
    ).toThrow(HrPiiInvariantError);
  });

  // Info: (20260811 - Julian) undefined 與 null 是兩條不同的路徑（漏傳 vs 明確清空），兩條都要擋
  it("should reject ciphertext with an undefined key version", () => {
    expect(() =>
      assertStorablePii(table, {
        ciphers: { nationalIdCipher: "cipher" },
        keyVersion: undefined,
        algorithm: "AES-256-GCM",
      }),
    ).toThrow(HrPiiInvariantError);
  });

  it("should reject ciphertext without an algorithm tag", () => {
    expect(() =>
      assertStorablePii(table, {
        ciphers: { phoneCipher: "cipher" },
        keyVersion: 1,
        algorithm: null,
      }),
    ).toThrow(HrPiiInvariantError);
  });

  /**
   * Info: (20260811 - Julian) 反向組合不會讓資料讀不出來，擋它是為了金鑰輪替腳本的盤點：
   * 腳本靠 keyVersion 決定哪些列還沒輪替完，這種列會被永遠算進待處理集合。
   */
  it("should reject a key version recorded without any ciphertext", () => {
    expect(() =>
      assertStorablePii(HrPiiTable.BANK_ACCOUNT, {
        ciphers: { accountNumberCipher: null, accountHolderCipher: null },
        keyVersion: 1,
        algorithm: "AES-256-GCM",
      }),
    ).toThrow(HrPiiInvariantError);
  });

  // Info: (20260811 - Julian) 錯誤訊息要點出是哪幾個欄位，否則批次寫入時無從得知是哪一筆出事
  it("should name the offending fields in the error message", () => {
    try {
      assertStorablePii(table, {
        ciphers: { nationalIdCipher: "cipher", addressCipher: null },
        keyVersion: null,
        algorithm: "AES-256-GCM",
      });
      throw new Error("expected assertStorablePii to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HrPiiInvariantError);
      expect((error as HrPiiInvariantError).message).toContain(
        "nationalIdCipher",
      );
      expect((error as HrPiiInvariantError).message).not.toContain(
        "addressCipher",
      );
    }
  });

  // Info: (20260811 - Julian) 空字串是「有欄位但沒值」，不該被當成有密文而要求 keyVersion
  it("should treat an empty string as absent ciphertext", () => {
    expect(() =>
      assertStorablePii(HrPiiTable.EMERGENCY_CONTACT, {
        ciphers: { phoneCipher: "", altPhoneCipher: "" },
        keyVersion: null,
        algorithm: "AES-256-GCM",
      }),
    ).not.toThrow();
  });
});
