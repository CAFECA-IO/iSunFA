import { FEATURE_FLAGS, FeatureFlag } from "@/constants/feature_flag";

/**
 * Info: (20261028 - Luphia) 模組入口要不要顯示。純函數。
 * 不受開關管的模組一律顯示；受開關管的模組只在確定開啟時顯示——
 * 開關還沒讀回來（null）或讀取失敗時先隱藏，入口不會一閃而過再消失。
 */
export function isModuleVisible(
  moduleKey: string,
  flags: Partial<Record<FeatureFlag, boolean>> | null,
): boolean {
  if (!(FEATURE_FLAGS as readonly string[]).includes(moduleKey)) return true;
  return flags?.[moduleKey as FeatureFlag] === true;
}
