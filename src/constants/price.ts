import { type AnalysisPeriod } from "@/constants/analysis";

export const BANK_TRANSFER = "bank_transfer";

/**
 * Info: (20260128 - Luphia) Pricing Logic:
 * - Base Cost:
 *   - Financial Reports (Balance/Cash/Income): 100
 *   - Advanced (Compliance/Health/IRSC): 200
 *   - External (Market/Industry/Rating): 500
 * - Multipliers by Period:
 *   - Daily: x1
 *   - Weekly: x1.5
 *   - Monthly: x3
 *   - Seasonly: x5
 *   - Yearly: x10
 */

export const CURRENCY_UNIT = {
  TWD: "TWD",
  ICP: "ICP",
  ISC: "ISC",
} as const;

export type CurrencyUnit = (typeof CURRENCY_UNIT)[keyof typeof CURRENCY_UNIT];

/**
 * Info: (20260809 - Luphia) DAILY_CHECKIN_REWARD 與 FREE_PLAN_LIMIT 已移除：
 * 登入贈點機制於 20260809 取消（產品決策）。歷史訂單的 CHECK_IN_REWARD
 * 型別保留於 ORDER_TYPE 供點數歷程顯示，不受影響。
 */
export const REWARD_AMOUNTS = {
  REGISTRATION_REWARD: 100,
} as const;

export {
  ANALYSIS_CATEGORY,
  type AnalysisCategory,
  ANALYSIS_PERIOD,
  type AnalysisPeriod,
} from "@/constants/analysis";

export const ANALYSIS_BASE_COSTS: Record<string, number> = {
  // Info: (20260128 - Luphia) Basic Financials
  BALANCE_SHEET: 10,
  CASH_FLOW: 10,
  INCOME_STATEMENT: 10,

  // Info: (20260128 - Luphia) Advanced
  FINANCIAL_COMPLIANCE: 20,
  FINANCIAL_HEALTH: 20,
  IRSC: 20,
  CARBON_HEALTH_CHECK: 50,
  NET_ZERO_EMISSIONS: 50,

  // Info: (20260128 - Luphia) External
  MARKET_TRENDS: 50,
  INDUSTRY_DEVELOPMENT: 50,
  FINANCIAL_PRODUCT_RATING: 50,

  // Info: (20260408 - Luphia) AI Features
  AI_CONSULTING: 5,
  CERTIFICATE_ANALYSIS: 3,
  TRANSPORTATION_CARBON_FOOTPRINT: 5,
  AI_REPORT: 100,
};

export const ANALYSIS_PERIOD_MULTIPLIERS: Record<AnalysisPeriod, number> = {
  // Info: (20260128 - Luphia) Multipliers by Period
  DAILY: 1,
  WEEKLY: 1.5,
  MONTHLY: 3,
  SEASONLY: 5,
  YEARLY: 10,
};

export const ANALYSIS_ADDON_COSTS = {
  BOOKKEEPER: 3000,
  CPA: 30000,
  THIRD_PARTY: 100000,
} as const;

export const ENTERPRISE_PLAN_PRICE = {
  MACHINE: {
    X86_5060TI: 84000 * 1.05,
    ASUS_ASCENT_GX10: 168000 * 1.05,
  },
  USER: 100 * 1.05 * 12,
  MODULE: 2000 * 1.05 * 12,
  UPDATE: 3000 * 1.05 * 12,
} as const;

export const SUBSCRIPTION_PLAN_PRICE = {
  free: {
    monthly: 0,
    yearly: 0,
  },
  team: {
    monthly: 840,
    yearly: 8400,
  },
  business: {
    monthly: 2940,
    yearly: 29400,
  },
} as const;

/**
 * Info: (20260814 - Luphia) **對外承諾的保守值**，不是實際發放的點數（產品拍板 20260814）。
 *
 * 用途只有一個：在方案頁把「每月可做多少事」換算成具體數字
 * （如 1,500 ÷ 每題 5 點 = 每月最多諮詢 300 個問題）。
 *
 * 訂閱**不發任何點數**——履行路徑只寫 `TeamSubscription`，不 mint 鏈上點數也不入團隊池
 * （設計書 §5.4.2）。實際可用量是額度視窗：團隊版每位成員每週 750 點（≈ 每 30 天 3,214 點），
 * 高於這裡列的 1,500。刻意讓承諾低於實際：對外少報不會有人受損，多報就是不實陳述。
 *
 * 因此**嚴禁**把這個常數當成發點依據帶進訂單或錢包——那正是它先前在付款畫面上
 * 變成「獲得點數 1,500 點」的原因，而那筆點數從未存在。
 */
export const SUBSCRIPTION_PLAN_CREDITS = {
  free: 150,
  team: 1500,
  business: 15000,
} as const;

export const BUSINESS_MODEL_PRICE = {
  CLOUD: 29400,
  ON_PREMISE: 303660,
} as const;

export const SOLUTION_PLAN_PRICE = {
  BASIC: 94500,
  PRO: 283500,
  ENTERPRISE: 567000,
} as const;
