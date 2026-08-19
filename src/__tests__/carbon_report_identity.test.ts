/**
 * Info: (20260814 - Emily) 查證識別欄位（issue 24）。
 *
 * 這一組測試守的是一個**政策**而不是一個演算法：沒填的欄位也要出現在紙上。
 * 演算法本身只有幾行，會壞的是有人為了「好看」把空欄位藏起來 ——
 * 而那正好會讓查證單位分不出「不適用」與「忘了填」。
 */
import { describe, it, expect } from "@jest/globals";
import {
  CARBON_REPORT_IDENTITY_FIELDS,
  buildIdentityRows,
  hasAnyIdentityField,
  missingIdentityFields,
} from "@/lib/utils/carbon_report_identity";

const LABELS = {
  inventoryYear: "盤查年度",
  preparedBy: "製作單位",
  verifiedBy: "查證單位",
  issuedOn: "更新日期",
} as const;

const rows = (identity?: Parameters<typeof buildIdentityRows>[0]["identity"]) =>
  buildIdentityRows({ identity, labels: LABELS, placeholder: "未填寫" });

describe("buildIdentityRows", () => {
  it("should always return all four rows in a fixed order", () => {
    // Info: (20260814 - Emily) 位置固定,「這份少了查證單位」才會缺在同一格
    expect(rows({}).map((row) => row.label)).toEqual([
      "盤查年度",
      "製作單位",
      "查證單位",
      "更新日期",
    ]);
    expect(rows(undefined)).toHaveLength(4);
  });

  it("should fill the placeholder for every field that is empty", () => {
    const result = rows({ inventoryYear: "2023" });

    expect(result).toEqual([
      { label: "盤查年度", value: "2023" },
      { label: "製作單位", value: "未填寫" },
      { label: "查證單位", value: "未填寫" },
      { label: "更新日期", value: "未填寫" },
    ]);
  });

  it("should treat whitespace only as not filled", () => {
    // Info: (20260814 - Emily) 一個空白不是「填了」—— 印一格空白比印「未填寫」更難察覺
    expect(rows({ verifiedBy: "   " })[2].value).toBe("未填寫");
  });

  it("should keep the value verbatim, including internal spacing", () => {
    const result = rows({ preparedBy: "溫室氣體盤查  推行委員會" });

    expect(result[1].value).toBe("溫室氣體盤查  推行委員會");
  });

  it("should trim the surrounding whitespace of a filled value", () => {
    expect(
      rows({ verifiedBy: "  亞瑞仕國際驗證股份有限公司  " })[2].value,
    ).toBe("亞瑞仕國際驗證股份有限公司");
  });

  it("should never drop a row, however many are empty", () => {
    /**
     * Info: (20260814 - Emily) 本檔的核心政策。若有人把這條改成「只印填過的」，
     * 第一頁就會從「查證單位：未填寫」變成「沒有查證單位那一行」——
     * 而後者看起來像這份報告不需要查證。
     */
    CARBON_REPORT_IDENTITY_FIELDS.forEach((field) => {
      expect(rows({ [field]: "有值" })).toHaveLength(4);
    });
    expect(rows({})).toHaveLength(4);
  });
});

describe("hasAnyIdentityField", () => {
  it("should tell apart nothing filled from something filled", () => {
    // Info: (20260814 - Emily) 「還沒開始」與「做到一半忘了」提示的措辭不同
    expect(hasAnyIdentityField(undefined)).toBe(false);
    expect(hasAnyIdentityField({})).toBe(false);
    expect(hasAnyIdentityField({ issuedOn: "  " })).toBe(false);
    expect(hasAnyIdentityField({ issuedOn: "2026-08-14" })).toBe(true);
  });
});

describe("missingIdentityFields", () => {
  it("should list what is still missing, in the printing order", () => {
    expect(missingIdentityFields({ inventoryYear: "2023" })).toEqual([
      "preparedBy",
      "verifiedBy",
      "issuedOn",
    ]);
  });

  it("should return every field when nothing is filled", () => {
    expect(missingIdentityFields()).toEqual([...CARBON_REPORT_IDENTITY_FIELDS]);
  });

  it("should return nothing when all four are filled", () => {
    expect(
      missingIdentityFields({
        inventoryYear: "2023",
        preparedBy: "溫室氣體盤查推行委員會",
        verifiedBy: "亞瑞仕國際驗證股份有限公司",
        issuedOn: "2026-08-14",
      }),
    ).toEqual([]);
  });
});
