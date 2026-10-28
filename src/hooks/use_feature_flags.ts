import { useEffect, useState } from "react";
import { FeatureFlag } from "@/constants/feature_flag";
import { request } from "@/lib/utils/request";

type FeatureFlags = Partial<Record<FeatureFlag, boolean>>;

// Info: (20261028 - Luphia) 同一個頁面的多個元件（桌面導覽、手機選單）共用同一次請求
let pending: Promise<FeatureFlags> | null = null;

function loadFeatureFlags(): Promise<FeatureFlags> {
  if (!pending) {
    pending = request<{ payload: { features: FeatureFlags } }>(
      "/api/v1/features",
    )
      .then((res) => res?.payload?.features ?? {})
      .catch((error) => {
        console.error("Failed to load feature flags", error);
        // Info: (20261028 - Luphia) 失敗不快取，下一個元件掛載時再試；這一次一律當作關閉
        pending = null;
        return {};
      });
  }
  return pending;
}

/**
 * Info: (20261028 - Luphia) 讀後台的功能開關（企業觀測站等）。回傳 null 代表還沒讀回來。
 */
export const useFeatureFlags = (): FeatureFlags | null => {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  useEffect(() => {
    let active = true;
    loadFeatureFlags().then((result) => {
      if (active) setFlags(result);
    });
    return () => {
      active = false;
    };
  }, []);
  return flags;
};
