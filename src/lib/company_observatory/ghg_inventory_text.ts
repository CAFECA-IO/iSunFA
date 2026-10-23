import {
  EMISSION_SCOPE_MARKER,
  EmissionScope,
} from "@/constants/business_monitor";
import { IEmissionScope } from "@/interfaces/business_monitor";

/**
 * Info: (20261023 - Luphia) 把溫室氣體盤查純文字（`renderGhgInventoryText` 的輸出）讀回範疇一～三。純函數。
 *
 * 文字是我們自己以固定格式渲染的：每行「揭露項目｜欄位：值」。這裡只取項目名稱含「範疇一／二／三」
 * 且名稱裡有「排放量」的項目，欄位依標題對應；值原樣保留（含千分位），不換算、不加總。
 * 讀既有檔案而不是重新下載：溫室氣體文件「不重抓」，已下載的年度都只有這份文字。
 */

const LINE = /^(.+?)｜(.+?)：(.*)$/;
const EMISSION_ITEM_KEYWORD = "排放量";

const FIELD_OF_TITLE: Record<string, keyof IEmissionScope> = {
  數據: "value",
  資料邊界: "boundary",
  確信機構: "assurer",
  確信標準: "standard",
  確信意見: "opinion",
};

function scopeOf(label: string): EmissionScope | null {
  if (!label.includes(EMISSION_ITEM_KEYWORD)) return null;
  const entry = (
    Object.entries(EMISSION_SCOPE_MARKER) as [EmissionScope, string][]
  ).find(([, marker]) => label.includes(marker));
  return entry ? entry[0] : null;
}

export function parseGhgInventoryText(text: string): IEmissionScope[] {
  const scopes = new Map<string, IEmissionScope>();
  for (const rawLine of text.split("\n")) {
    const match = rawLine.trim().match(LINE);
    if (!match) continue;
    const [, label, title, value] = match;
    const scope = scopeOf(label);
    const field = FIELD_OF_TITLE[title];
    if (!scope || !field) continue;
    const current = scopes.get(label) ?? {
      label,
      scope,
      value: "",
      boundary: "",
      assurer: "",
      standard: "",
      opinion: "",
      changePercent: null,
      boundaryChanged: false,
    };
    scopes.set(label, { ...current, [field]: value.trim() });
  }
  // Info: (20261023 - Luphia) 沒有「數據」的項目不算揭露了排放量
  return Array.from(scopes.values())
    .filter((scope) => scope.value !== "")
    .sort((a, b) => a.scope.localeCompare(b.scope));
}
