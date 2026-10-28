import {
  FEATURE_FLAG_SETTING,
  FEATURE_FLAGS,
  FeatureFlag,
} from "@/constants/feature_flag";
import { SYSTEM_SETTING_SWITCH } from "@/constants/system_setting";
import { systemSettingService } from "@/services/system_setting.service";
import { logger } from "@/lib/utils/logger";

/**
 * Info: (20261028 - Luphia) 功能開關。只有設定值完全等於 "true" 才算開啟；
 * 未設定（保底值 "false"）、讀取失敗、設定簽章驗不過（UNTRUSTED）一律視為關閉——
 * 關閉的代價是功能暫時看不到，開錯的代價是背景 worker 開始對外抓資料，兩者不對稱。
 */
export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  try {
    const value = await systemSettingService.get(FEATURE_FLAG_SETTING[flag]);
    return value === SYSTEM_SETTING_SWITCH.ON;
  } catch (error) {
    logger.warn("feature flag unreadable; treating as disabled", {
      flag,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function getFeatureFlags(): Promise<Record<FeatureFlag, boolean>> {
  const entries = await Promise.all(
    FEATURE_FLAGS.map(
      async (flag) => [flag, await isFeatureEnabled(flag)] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<FeatureFlag, boolean>;
}
