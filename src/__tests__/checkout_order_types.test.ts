import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { ORDER_TYPE } from "@/constants/status";

/**
 * Info: (20260815 - Luphia) checkout 只接受「本來就由用戶互動付款」的訂單型別
 * （PR #6652 第二輪 C-10）。
 *
 * 這支端點的結尾是「鑄造個人點數」的 fallback，任何沒被前面分流攔下的型別都會落到那裡。
 * 席次補收中途失敗留下的 PENDING 訂單就是這樣被使用者拿 orderId 打進來——
 * 再刷一次卡、鑄 0 點、席次也不會增加。
 *
 * 白名單比逐一排除安全：新增訂單型別時必須明確歸類，忘記歸類的結果是「不能付」，
 * 而不是「悄悄走到鑄點 fallback」。
 */

const CHECKOUT_ROUTE = join(
  process.cwd(),
  "src",
  "app",
  "api",
  "v1",
  "user",
  "payment_method",
  "[payment_method_id]",
  "checkout",
  "route.ts",
);

describe("checkout payable order types", () => {
  const source = readFileSync(CHECKOUT_ROUTE, "utf8");

  it("guards the endpoint with a whitelist", () => {
    expect(source).toContain("CHECKOUT_PAYABLE_ORDER_TYPES");
    expect(source).toMatch(
      /if\s*\(!CHECKOUT_PAYABLE_ORDER_TYPES\.has\(order\.type\)\)/,
    );
  });

  /**
   * Info: (20260815 - Luphia) 伺服器自行發起的扣款不得出現在白名單裡。
   * 它們沒有「讓用戶付款」這個步驟，能被互動付款就是重複扣款的入口。
   */
  it("keeps server-initiated charges out of the whitelist", () => {
    const whitelist = source.slice(
      source.indexOf("CHECKOUT_PAYABLE_ORDER_TYPES: ReadonlySet<string> ="),
      source.indexOf("export async function POST"),
    );

    expect(whitelist).not.toContain(ORDER_TYPE.BILLING_SEAT_ADDITION);
    // Info: (20260815 - Luphia) 後台發放同樣不是用戶付款
    expect(whitelist).not.toContain(ORDER_TYPE.ADMIN_ISSUED);
  });

  it("still allows the order types users actually pay for", () => {
    const whitelist = source.slice(
      source.indexOf("CHECKOUT_PAYABLE_ORDER_TYPES: ReadonlySet<string> ="),
      source.indexOf("export async function POST"),
    );

    for (const type of [
      ORDER_TYPE.OEN_PAYMENT,
      ORDER_TYPE.BILLING_TEAM_POINT,
      ORDER_TYPE.BILLING_SUBSCRIBE,
    ]) {
      expect(whitelist).toContain(type);
    }
  });
});
