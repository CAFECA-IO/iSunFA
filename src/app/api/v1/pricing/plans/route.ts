import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { CREDIT_PLANS } from "@/config/credit_plans";
import { jsonOk, jsonFail } from "@/lib/utils/response";

export async function GET() {
  try {
    return jsonOk(CREDIT_PLANS);
  } catch (error) {
    console.error("Failed to fetch pricing plans:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_FETCH_PRICING_PLANS);
  }
}
