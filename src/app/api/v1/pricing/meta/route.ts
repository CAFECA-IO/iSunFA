import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { FAITH_TOKENS_PER_CREDIT } from "@/constants/llm";

/**
 * Info: (20260807 - Luphia) 定價中繼資料（設計書 §5.3 定價揭露）。
 * 費思費率必須標註在訂閱方案內且「數字不寫死在文案」——前端自此端點取得
 * runtime env 同源的費率插值渲染，調 env 即全站同步，避免標示與實扣不符。
 * 獨立端點而非改 /pricing/plans：該端點回傳裸陣列，改結構會破壞既有消費端。
 */
export async function GET() {
  try {
    return jsonOk({ faithTokensPerCredit: FAITH_TOKENS_PER_CREDIT });
  } catch (error) {
    console.error("Failed to fetch pricing meta:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_FETCH_PRICING_PLANS);
  }
}
