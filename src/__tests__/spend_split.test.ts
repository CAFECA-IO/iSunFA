import { describe, it, expect } from "@jest/globals";
import {
  resolveQuotaAvailable,
  splitRefund,
  splitSpend,
} from "@/lib/quota/spend_split";
import { SPEND_PRIORITY } from "@/constants/subscription_quota";

/**
 * Info: (20260813 - Luphia) 扣費拆帳的純函式測試（設計書 §5.4）。
 *
 * 這一層決定「剩 3 點的用戶能不能送出一則預扣 5 點的訊息」。
 * 舊行為是不能（整筆擋下，剩餘額度到期作廢）；新規則是能——額度用光 3 點、
 * 差額扣錢包，錢包也不夠就封頂到可用餘額。
 */

const bi = (value: number) => BigInt(value);

describe("resolveQuotaAvailable", () => {
  it("takes the smaller remaining of the two windows", () => {
    // Info: (20260813 - Luphia) 週額度還很多也不能突破 5 小時上限：兩個視窗同時生效
    expect(
      resolveQuotaAvailable({
        limit5h: bi(10),
        used5h: bi(7),
        limitWeek: bi(40),
        usedWeek: bi(7),
      }),
    ).toBe(bi(3));
    expect(
      resolveQuotaAvailable({
        limit5h: bi(100),
        used5h: bi(0),
        limitWeek: bi(750),
        usedWeek: bi(749),
      }),
    ).toBe(bi(1));
  });

  it("floors an over-consumed window at zero instead of going negative", () => {
    // Info: (20260813 - Luphia) 追補（topup）會讓視窗超額，可用量必須收斂為 0 而非負數
    expect(
      resolveQuotaAvailable({
        limit5h: bi(10),
        used5h: bi(14),
        limitWeek: bi(40),
        usedWeek: bi(14),
      }),
    ).toBe(bi(0));
  });
});

describe("splitSpend", () => {
  it("uses quota only when the quota can absorb the whole cost", () => {
    const split = splitSpend(bi(3), bi(10), bi(100));
    expect(split).toEqual({
      hold: bi(3),
      quotaPart: bi(3),
      walletPart: bi(0),
      capped: false,
    });
  });

  /**
   * Info: (20260813 - Luphia) 拆帳的核心情境：額度剩 2、本次要 5。
   * 舊行為整筆改扣錢包 5 點，那 2 點額度到期作廢——用戶多付了 3 點。
   */
  it("drains the quota first and takes the shortfall from the wallet", () => {
    const split = splitSpend(bi(5), bi(2), bi(100));
    expect(split).toEqual({
      hold: bi(5),
      quotaPart: bi(2),
      walletPart: bi(3),
      capped: false,
    });
  });

  it("uses the wallet alone once the quota is exhausted", () => {
    const split = splitSpend(bi(5), bi(0), bi(100));
    expect(split).toEqual({
      hold: bi(5),
      quotaPart: bi(0),
      walletPart: bi(5),
      capped: false,
    });
  });

  /**
   * Info: (20260813 - Luphia) 「有點數就能用」：可用餘額不足全額時封頂放行，
   * 並標記 capped——結算時的 actual > held 由此而來，屬預期情形而非估算異常。
   */
  it("caps the hold at the available balance and flags it", () => {
    expect(splitSpend(bi(5), bi(2), bi(1))).toEqual({
      hold: bi(3),
      quotaPart: bi(2),
      walletPart: bi(1),
      capped: true,
    });
    expect(splitSpend(bi(5), bi(1), bi(0))).toEqual({
      hold: bi(1),
      quotaPart: bi(1),
      walletPart: bi(0),
      capped: true,
    });
  });

  it("returns a zero hold only when both sources are empty", () => {
    const split = splitSpend(bi(5), bi(0), bi(0));
    expect(split.hold).toBe(bi(0));
    expect(split.capped).toBe(true);
  });

  it("treats negative balances as zero rather than trusting them", () => {
    // Info: (20260813 - Luphia) 錢包的負餘額不該存在（repo 有條件扣款防線），但若出現不得放大可用量
    expect(splitSpend(bi(5), bi(-3), bi(-9)).hold).toBe(bi(0));
    expect(splitSpend(bi(5), bi(2), bi(-9))).toEqual({
      hold: bi(2),
      quotaPart: bi(2),
      walletPart: bi(0),
      capped: true,
    });
  });
});

describe("splitRefund", () => {
  it("returns the wallet leg first", () => {
    // Info: (20260813 - Luphia) 分配點數是買來的資產；額度到期即歸零，退額度沒有價值
    expect(splitRefund(bi(3), bi(4))).toEqual({
      walletRefund: bi(3),
      quotaRefund: bi(0),
    });
  });

  it("spills the remainder into the quota once the wallet leg is fully returned", () => {
    expect(splitRefund(bi(5), bi(2))).toEqual({
      walletRefund: bi(2),
      quotaRefund: bi(3),
    });
  });

  it("returns nothing when there is no difference to refund", () => {
    expect(splitRefund(bi(0), bi(4))).toEqual({
      walletRefund: bi(0),
      quotaRefund: bi(0),
    });
    expect(splitRefund(bi(-2), bi(4))).toEqual({
      walletRefund: bi(0),
      quotaRefund: bi(0),
    });
  });
});

/**
 * Info: (20260814 - Luphia) `splitSpend` 的 priority 參數仍保留（純函式、無副作用），
 * 但已無呼叫端使用：分配上鏈後第二層是成員的個人資產，順序固定為「先額度、後個人點數」
 * （PR #6652 第二輪 A-1）。這些測試留著是為了在日後真的出現兩個對等來源時，
 * 這支函式的行為仍然被釘住。
 */
describe("splitSpend priority parameter", () => {
  it("uses the wallet alone when it can absorb the whole cost", () => {
    expect(
      splitSpend(
        BigInt(5),
        BigInt(100),
        BigInt(50),
        SPEND_PRIORITY.ALLOCATION_FIRST,
      ),
    ).toEqual({
      hold: BigInt(5),
      quotaPart: BigInt(0),
      walletPart: BigInt(5),
      capped: false,
    });
  });

  /**
   * Info: (20260813 - Luphia) 順序只改變「先動哪一邊」，不改變總額與封頂行為：
   * 兩邊加起來仍不足時，一樣封頂放行而非擋下。
   */
  it("caps the same way regardless of priority", () => {
    const quotaFirst = splitSpend(BigInt(9), BigInt(2), BigInt(3));
    const allocationFirst = splitSpend(
      BigInt(9),
      BigInt(2),
      BigInt(3),
      SPEND_PRIORITY.ALLOCATION_FIRST,
    );
    expect(quotaFirst.hold).toBe(BigInt(5));
    expect(allocationFirst.hold).toBe(BigInt(5));
    expect(quotaFirst.capped).toBe(true);
    expect(allocationFirst.capped).toBe(true);
    // Info: (20260813 - Luphia) 總額相同，兩邊的分配互為鏡像
    expect(quotaFirst.quotaPart).toBe(BigInt(2));
    expect(allocationFirst.walletPart).toBe(BigInt(3));
  });
});
