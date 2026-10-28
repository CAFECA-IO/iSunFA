import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BusinessMonitorPageBody from "@/components/business_monitor/business_monitor_page_body";
import { isFeatureEnabled } from "@/services/feature_flag.service";
import { FEATURE_FLAG } from "@/constants/feature_flag";

// Info: (20261028 - Luphia) 每次請求都讀開關：後台關閉後立即生效，不被建置時的靜態結果留住
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "iSunFA Business Monitor",
  openGraph: { title: "iSunFA Business Monitor" },
};

/**
 * Info: (20261028 - Luphia) 企業觀測站預設隱藏：後台未開啟時回 404，對外就是沒有這一頁。
 * 原本是 client 元件加 next/head（App Router 不處理 next/head），改為伺服器元件以便在渲染前檢查開關。
 */
export default async function BusinessMonitorPage() {
  if (!(await isFeatureEnabled(FEATURE_FLAG.BUSINESS_MONITOR))) notFound();
  return <BusinessMonitorPageBody />;
}
