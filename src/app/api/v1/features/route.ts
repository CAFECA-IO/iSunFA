import { jsonOk } from "@/lib/utils/response";
import { getFeatureFlags } from "@/services/feature_flag.service";

export const dynamic = "force-dynamic";

/**
 * Info: (20261028 - Luphia) 各功能是否開啟（公開、不需登入）：導覽列據此決定要不要顯示入口。
 * GET /api/v1/features → { features: { business_monitor: false } }
 */
export async function GET() {
  return jsonOk({ features: await getFeatureFlags() });
}
