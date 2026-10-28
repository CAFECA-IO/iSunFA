import { SystemSettingKey } from "@/constants/system_setting";

/**
 * Info: (20261028 - Luphia) 預設關閉、由後台系統設定開啟的功能。
 *
 * 值同時是前端模組的 key（`/business_monitor`），導覽列以它判斷要不要顯示。
 * 每個功能對應一個開關型系統設定（"true" / "false"），經超級管理員簽章才生效。
 */
export const FEATURE_FLAG = {
  BUSINESS_MONITOR: "business_monitor",
} as const;

export type FeatureFlag = (typeof FEATURE_FLAG)[keyof typeof FEATURE_FLAG];

export const FEATURE_FLAGS: readonly FeatureFlag[] =
  Object.values(FEATURE_FLAG);

export const FEATURE_FLAG_SETTING: Record<FeatureFlag, SystemSettingKey> = {
  business_monitor: SystemSettingKey.BUSINESS_MONITOR_ENABLED,
};
