import { describe, it, expect } from "@jest/globals";
import {
  addressLookupForms,
  canonicalizeAddressForKey,
  isSameAddress,
} from "@/lib/team/address_identity";
import { buildPendingInviteKey } from "@/lib/team/pending_invite_key";

/**
 * Info: (20260826 - Julian) 位址的「同一個對象」判定（review 1.2）。
 *
 * email 那一半三處同源（`inviteeEmailKey`、`emailKeys`、`pendingKey`），
 * 位址這一半原本只有 `buildPendingInviteKey` 做了正規化，查詢與判定都沒有。
 * 唯一鍵認得出同一個人、查詢認不出，而中間隔著一次席次扣款。
 */

// Info: (20260826 - Julian) 真實位址：有大小寫差異，全數字的測不出這件事
const CHECKSUM = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const LOWER = CHECKSUM.toLowerCase();

describe("canonicalizeAddressForKey", () => {
  it("大小寫與前後空白正規化", () => {
    expect(canonicalizeAddressForKey(`  ${CHECKSUM} `)).toBe(LOWER);
    expect(canonicalizeAddressForKey(LOWER)).toBe(LOWER);
  });

  /**
   * Info: (20260826 - Julian) 與 `buildPendingInviteKey` 同源。
   *
   * 那一行原本是自己寫的 `.trim().toLowerCase()`。抽出來之後這條釘住
   * 「鍵怎麼算」與「比對怎麼算」是同一個答案 —— 兩者分岔正是這個缺陷本身。
   */
  it("checksum 與小寫產生同一把 pendingKey", () => {
    expect(
      buildPendingInviteKey({ teamId: "t", inviteeAddress: CHECKSUM }),
    ).toBe(buildPendingInviteKey({ teamId: "t", inviteeAddress: LOWER }));
  });
});

describe("isSameAddress", () => {
  it("checksum 與小寫是同一個人", () => {
    expect(isSameAddress(CHECKSUM, LOWER)).toBe(true);
    expect(isSameAddress(` ${LOWER}`, CHECKSUM)).toBe(true);
  });

  it("不同位址不是同一個人（證明上一條不是一律回 true）", () => {
    expect(isSameAddress(CHECKSUM, `0x${"1".repeat(40)}`)).toBe(false);
  });

  /**
   * Info: (20260826 - Julian) 空值一律 false。
   *
   * `inviteeAddress` 是可空欄位（email 邀請沒有位址）。少了這一層，
   * `"" === ""` 會讓任何人對上一封沒有受邀位址的邀請 ——
   * 與 `isIntendedRecipient` 裡那層 `Boolean(...)` 防的是同一件事。
   */
  it.each([
    [null, LOWER],
    [LOWER, null],
    ["", ""],
    ["   ", "   "],
    [undefined, undefined],
  ])("其中一邊沒有值時不算同一個人（%s / %s）", (left, right) => {
    expect(isSameAddress(left, right)).toBe(false);
  });
});

describe("addressLookupForms", () => {
  /**
   * Info: (20260826 - Julian) 兩種形狀都要列出來。
   *
   * `User.address` 兩種形狀共存：viem 對合約回傳一律 EIP-55 checksum，
   * `setup.service.ts` 建的使用者是全小寫。只查其中一種，另一半的人
   * 永遠查不到 —— 而「已是團隊成員」那道檢查就是這樣靜默失效的。
   */
  it("小寫與 checksum 兩種形狀都在，且無論輸入哪一種都一樣", () => {
    expect(new Set(addressLookupForms(LOWER))).toEqual(
      new Set([LOWER, CHECKSUM]),
    );
    expect(new Set(addressLookupForms(CHECKSUM))).toEqual(
      new Set([LOWER, CHECKSUM]),
    );
  });

  // Info: (20260826 - Julian) 沒有字母的位址只有一種寫法，不要回兩筆一樣的
  it("checksum 與小寫相同時只回一筆", () => {
    const numeric = `0x${"1".repeat(40)}`;
    expect(addressLookupForms(numeric)).toEqual([numeric]);
  });

  /**
   * Info: (20260826 - Julian) 不是合法位址時不得丟例外。
   *
   * viem 的 `getAddress` 對非法輸入會拋，而這支函式在 repo 層被呼叫 ——
   * 拋出去就是 500。route 已經先驗過格式，這一層是給其他呼叫端的保底。
   */
  it("非法位址原樣（小寫）回傳而不是拋錯", () => {
    expect(addressLookupForms("not-an-address")).toEqual(["not-an-address"]);
    expect(addressLookupForms("   ")).toEqual([]);
  });
});
