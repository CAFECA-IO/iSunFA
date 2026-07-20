// Info: (20260720 - Emily) 數量字串決定性解析(純函式,零依賴):
// Info: (20260720 - Emily) 自 carbon_calculation.service 抽出 — 該服務經 EmissionFactorRepo 連動真實
// Info: (20260720 - Emily) prisma(pg Pool),守恆勾稽(#6520)等純邏輯呼叫端若 import 它,單元測試會
// Info: (20260720 - Emily) 連帶開啟 DB 連線造成 jest worker 無法退出;純函式歸 lib,服務歸服務

/**
 * Info: (20260716 - Emily) 全形轉半形、去千分位/空白;
 * 合法格式僅「非負十進位數」;其餘(科學記號/負數/文字)回 null → 待補,絕不猜。
 */
export const parseActivityQuantity = (raw: string): string | null => {
  const halfWidth = raw.replace(/[０-９．]/g, (ch) =>
    ch === "．" ? "." : String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
  const cleaned = halfWidth.replace(/[,\s，]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return cleaned;
};
