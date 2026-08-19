import { API_ERRORS, ApiError } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260813 - Luphia) 訂單金額 → 扣款金額的轉換（純函式）。
 *
 * 訂單以**有號數**記帳：消費為負（`generateAnalysisOrder` 寫的是 `-cost`），
 * 而扣費管線只收正整數。少了這層轉換，團隊額度付款會直接撞上
 * 「Spend amount must be a positive integer」（TW000007）——這正是
 * 團隊額度付款上線首日的症狀，且因為此前沒有任何前端呼叫端，它一直是潛伏的。
 *
 * 抽成純函式而非在 route 裡寫一個 `-amount`：這個轉換有兩個容易寫錯的邊界
 * （零金額、以及不知情的正值訂單），值得有測試釘住。
 */
export function resolveOrderSpendCost(amount: bigint): bigint {
  if (typeof amount !== "bigint" || amount === BigInt(0)) {
    throw new ApiError(
      API_ERRORS.TW_INVALID_SPEND_AMOUNT.code,
      API_ERRORS.TW_INVALID_SPEND_AMOUNT.message,
      API_ERRORS.TW_INVALID_SPEND_AMOUNT.status,
    );
  }
  // Info: (20260813 - Luphia) 取絕對值而非假設一定是負數：正值訂單同樣扣得出金額，
  // Info: (20260813 - Luphia) 硬性要求負值只會在資料慣例改變時變成無法解釋的失敗
  return amount < BigInt(0) ? -amount : amount;
}
