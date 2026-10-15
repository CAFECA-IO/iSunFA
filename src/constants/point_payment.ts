import { ORDER_STATUS } from "@/constants/status";
import { POINT_LEDGER_ENTRY_TYPE } from "@/constants/point_ledger";

/**
 * Info: (20261015 - Luphia) 以個人點數（DB 帳本）支付訂單的常數（區塊鏈退役）。
 *
 * 原本個人點數付款是「前端組 UserOp → bundler 上鏈 → TxTracker 確認」，
 * 訂單在中間停在 PAYING。帳本改為唯一真相後，扣點與標記 PAID 在同一次請求內完成，
 * 不再有 PAYING 這個在途狀態（舊的 PAYING 訂單由復原指令處理）。
 */

/**
 * Info: (20261015 - Luphia) 寫進 `Order.signature` 的付款來源標記。
 * 與團隊額度的 `{"verifiedVia":"team_quota"}` 同一個形狀，復原指令與稽核靠它分辨扣款來源。
 */
export const POINT_PAYMENT_VERIFIED_VIA = "point_ledger";

export const POINT_PAYMENT_SIGNATURE = JSON.stringify({
  verifiedVia: POINT_PAYMENT_VERIFIED_VIA,
});

/**
 * Info: (20261015 - Luphia) 「已付款」的訂單狀態：錢已經從帳上離開，且沒有因失敗而終結。
 *
 * 原本 `ensurePersonalCreditCharge` 只認 COMPLETED，而付款的結果是 PAID——
 * 於是使用者付完錢、重送同一則訊息，仍然拿到「請付款」。判準改成這一份，
 * 讓付款端、放行端與分析路由的「付過了沒」同源。
 *
 * - `PAID` / `EXECUTING` / `COMPLETED`：正常的付款後狀態
 * - `MINT_FAILED`：款已收、後續履行失敗（要走補償，不是再收一次）
 *
 * 不含 `PAYING`：那是鏈上付款在途的舊狀態，鏈已損毀、無從確認是否真的扣到。
 * 不含 `FAILED`：付款後失敗的訂單已退款（見 point_payment.service），重試應建新單。
 */
export const POST_PAYMENT_ORDER_STATUSES: readonly string[] = [
  ORDER_STATUS.PAID,
  ORDER_STATUS.EXECUTING,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.MINT_FAILED,
];

export function isPostPaymentOrderStatus(
  status: string | null | undefined,
): boolean {
  return (
    typeof status === "string" && POST_PAYMENT_ORDER_STATUSES.includes(status)
  );
}

/**
 * Info: (20261015 - Luphia) 伺服器以冪等鍵預建的個人扣款訂單（`ensurePersonalCreditCharge`）
 * 寫在 `Order.data.chargeKind` 的標記。
 *
 * 這種訂單不是分析訂單：付款後要放行的是可接續任務，不是產生一份分析報告。
 * 舊流程對它也呼叫 `fulfillPaidAnalysisOrder`，而那支因為缺 periodType 必定丟錯——
 * 錢扣了、回應卻是 500。
 */
export const PERSONAL_CREDIT_CHARGE_KIND = "PERSONAL_CREDIT_CHARGE";

/**
 * Info: (20261015 - Luphia) 後台 EXP 的計入分錄型別。
 *
 * 原本的 EXP 來自 MembershipSystem 合約：註冊獎勵 + 簽到獎勵 + `issuePurchasedPoints`
 * 的累計。那支合約函式是**所有發點**的共用出口（購點、後台發放、活動、團隊分配，
 * 連退款也走它），所以合約上的「累計購點」其實是「累計入帳」。
 *
 * 這裡保留「累計入帳」的語意，但排除退款與人工調整：退款是把花掉的點數還回來，
 * 算進 EXP 等於消費失敗一次就升級一次。
 */
export const MEMBERSHIP_EXP_ENTRY_TYPES: readonly string[] = [
  POINT_LEDGER_ENTRY_TYPE.REGISTRATION_REWARD,
  POINT_LEDGER_ENTRY_TYPE.CHECK_IN_REWARD,
  POINT_LEDGER_ENTRY_TYPE.PURCHASE,
  POINT_LEDGER_ENTRY_TYPE.ADMIN_ISSUED,
  POINT_LEDGER_ENTRY_TYPE.CAMPAIGN_BONUS,
  POINT_LEDGER_ENTRY_TYPE.TEAM_ALLOCATION,
];

// Info: (20261015 - Luphia) 會員等級門檻（沿用原本的合約時代數值）
export const MEMBERSHIP_TIER_THRESHOLD = {
  GOLD: BigInt(2000),
  SILVER: BigInt(500),
} as const;

// Info: (20261015 - Luphia) 值沿用後台 /admin/user 既有的顯示字串（頁面以 "Gold" / "Silver" 比對）
export const MEMBERSHIP_TIER = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
} as const;

export type MembershipTier =
  (typeof MEMBERSHIP_TIER)[keyof typeof MEMBERSHIP_TIER];

export const MEMBERSHIP_TIER_ZH: Record<MembershipTier, string> = {
  [MEMBERSHIP_TIER.BRONZE]: "銅卡",
  [MEMBERSHIP_TIER.SILVER]: "銀卡",
  [MEMBERSHIP_TIER.GOLD]: "金卡",
};
