import { describe, it, expect } from "@jest/globals";
import {
  maskAccountHolder,
  maskAddress,
  maskBankAccountNumber,
  maskBirthday,
  maskNationalId,
  maskPhone,
  maskTail,
} from "@/lib/hr_pii_mask";

/**
 * Info: (20260811 - Julian) 遮罩的 bug 就是個資外洩，而且是安靜的那種 ——
 * 沒有例外、沒有 log，只是畫面上多露了幾碼，而沒有人會注意到。
 * 因此每個遮罩函式的邊界（空值、比保留長度還短的值）都要被釘住。
 */
describe("hr_pii_mask", () => {
  describe("maskNationalId", () => {
    it("should keep the leading letter and the last three digits", () => {
      expect(maskNationalId("A123456789")).toBe("A******789");
    });

    // Info: (20260811 - Julian) 遮罩後長度必須與原值相同，否則長度本身就洩漏了資訊差異
    it("should preserve the original length", () => {
      expect(maskNationalId("A123456789")).toHaveLength(10);
    });

    /**
     * Info: (20260811 - Julian) 短到留不住「首碼 + 末 3 碼」時全遮。
     * 若沿用一般規則，`A123` 會回 `A123` —— 遮了跟沒遮一樣，而這正是最容易漏的分支。
     */
    it("should fully mask values too short to keep both ends", () => {
      expect(maskNationalId("A123")).toBe("****");
      expect(maskNationalId("A")).toBe("*");
    });

    it("should return null for absent values", () => {
      expect(maskNationalId(null)).toBeNull();
      expect(maskNationalId(undefined)).toBeNull();
      expect(maskNationalId("")).toBeNull();
    });
  });

  describe("maskTail", () => {
    it("should keep only the last three characters by default", () => {
      expect(maskTail("0123456789")).toBe("*******789");
    });

    it("should fully mask values not longer than the visible tail", () => {
      expect(maskTail("789")).toBe("***");
      expect(maskTail("89")).toBe("**");
    });

    it("should honour an explicit visible tail", () => {
      expect(maskTail("0123456789", 5)).toBe("*****56789");
    });
  });

  describe("maskBankAccountNumber", () => {
    it("should keep only the last three digits", () => {
      expect(maskBankAccountNumber("822123456789012")).toBe("************012");
    });
  });

  describe("maskAccountHolder", () => {
    // Info: (20260811 - Julian) 姓名遮尾碼沒有意義：中文姓名留末 3 碼幾乎等於全部露出
    it("should keep only the surname", () => {
      expect(maskAccountHolder("王小明")).toBe("王**");
      expect(maskAccountHolder("陳")).toBe("*");
    });

    it("should return null for absent values", () => {
      expect(maskAccountHolder(null)).toBeNull();
    });
  });

  describe("maskPhone", () => {
    it("should keep only the last three digits", () => {
      expect(maskPhone("0912345678")).toBe("*******678");
    });
  });

  describe("maskBirthday", () => {
    it("should return the year only", () => {
      expect(maskBirthday("1990-04-21")).toBe("1990");
      expect(maskBirthday("1990-04-21T00:00:00.000Z")).toBe("1990");
    });

    // Info: (20260811 - Julian) 解不出年份時回 null，不回原值 —— 失敗要往「少露」的方向倒
    it("should return null when the value is not an ISO date", () => {
      expect(maskBirthday("民國79年")).toBeNull();
      expect(maskBirthday("bad")).toBeNull();
      expect(maskBirthday(null)).toBeNull();
    });
  });

  describe("maskAddress", () => {
    it("should keep only the city and district prefix", () => {
      expect(maskAddress("臺北市大安區信義路四段 1 號 12 樓")).toBe(
        "臺北市***",
      );
    });

    it("should leave very short values untouched", () => {
      expect(maskAddress("台北")).toBe("台北");
    });

    it("should return null for absent values", () => {
      expect(maskAddress(undefined)).toBeNull();
    });
  });
});
