import { SystemSettingKey } from "@/constants/system_setting";
import { parseRetentionDays } from "@/lib/faith_memory/retention";
import { DEFAULT_FAITH_MEMORY_RETENTION_DAYS } from "@/constants/llm";
import { systemSettingService } from "@/services/system_setting.service";

/**
 * Info: (20260812 - Luphia) 費思個人化記憶 Service（規範
 * documents/architecture/ai_and_analytics/faith_personal_memory.md）。
 *
 * 本檔目前僅承載「保留期設定的解析」——記憶的儲存、萃取、注入與刪除編排為 P1–P3，
 * 須於 v0.13.0 釋出前補齊（規範 §9 Release Gate）。
 */

/**
 * Info: (20260812 - Luphia) 生效中的記憶保留天數（規範 §7）。
 *
 * 保留期是營運設定，存於 DB 的簽章式系統設定（ADR 017），可由後台調整、不需重啟；
 * 讀不到或值不合法時退回 DEFAULT_FAITH_MEMORY_RETENTION_DAYS（fail-safe）。
 * **所有需要天數的地方都必須經過這裡**，不得直接引用常數當生效值，
 * 否則後台調整後畫面與刪除行為會各用一個數字。
 */
export async function resolveFaithMemoryRetentionDays(): Promise<number> {
  try {
    const raw = await systemSettingService.get(
      SystemSettingKey.FAITH_MEMORY_RETENTION_DAYS,
    );
    return parseRetentionDays(raw);
  } catch (error) {
    /**
     * Info: (20260812 - Luphia) 兩種失敗都退回承諾值：DB 連線抖動，以及設定驗簽失敗
     * （UNTRUSTED，systemSettingService.get() 會丟錯）。
     *
     * 這裡不照 ADR 017 的「拒絕服務」處置，因為本值不是憑證也不授權任何事；
     * 而退回 90 恰好是**較保守**的方向——被竄改成 3650 天也不會讓該刪的記憶留下來。
     */
    console.error("Failed to resolve faith memory retention days:", error);
    return DEFAULT_FAITH_MEMORY_RETENTION_DAYS;
  }
}
