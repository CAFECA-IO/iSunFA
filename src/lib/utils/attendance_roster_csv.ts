import { PresenceStatus } from "@/constants/attendance";
import { isoDateTimeLabel } from "@/lib/utils/attendance_format";
import { IPresenceRoster } from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 緊急疏散點名名單的 CSV。純函數。
 *
 * ## 這支函式的使用場合決定了它的每一個細節
 *
 * 母文件 §D10.5：「職安場景下，『現場有幾個人、分別是誰』是必須在事故當下
 * 答得出來的問題。」這份檔案會被列印、被帶到集合點、被貼進事故調查報告 ——
 * 因此它不是一份「資料匯出」，是一份**證據**。三個後果：
 *
 * 1. **表頭必須有產出時間與產出者。**「這份名單是幾點幾分產出的」
 *    與名單本身同等重要 —— 事故發生在 14:20，一份 14:05 產出的名單
 *    與一份 14:22 產出的名單是完全不同的東西。
 * 2. **每個時間都要自己說得出是哪一天。** 跨夜班的進場時間是昨天，
 *    只印 "20:05" 的話，看的人會以為那是今晚。
 * 3. **`STALE` 的人一定要在名單上，而且要標出來。** 他們是最需要
 *    優先打電話確認的對象 —— 系統不知道他們在不在，那件事本身就是要傳達的資訊。
 */

/**
 * Info: (20260813 - Julian) CSV 的欄位標題與狀態文案由呼叫端注入。
 *
 * 這一層是純函數，沒有 i18n context；而把中文寫死在這裡，
 * 就等於決定了這份檔案永遠只有一個語言版本。
 */
export interface IRosterCsvLabels {
  generatedAt: string;
  generatedBy: string;
  timeZone: string;
  location: string;
  employeeNo: string;
  name: string;
  department: string;
  jobTitle: string;
  since: string;
  status: string;
  statusOnSite: string;
  statusStale: string;
  none: string;
}

export interface IRosterCsvInput {
  rosters: IPresenceRoster[];
  labels: IRosterCsvLabels;
  /** Info: (20260813 - Julian) 產出時間，已格式化為當地時間字串 */
  generatedAt: string;
  /** Info: (20260813 - Julian) 產出者，姓名加工號 —— 只有姓名在事故調查時不夠指認 */
  generatedBy: string;
  timeZone: string;
}

/**
 * Info: (20260813 - Julian) CSV 欄位跳脫。
 *
 * 逗號、雙引號、換行任一出現就整欄加引號，引號本身加倍。
 * 這不是理論上的顧慮 —— 工區名稱是人打的（「第二工區（南側）, 臨時便道」
 * 這種名字真的會出現），而一個沒跳脫的逗號會讓整份名單的欄位往後錯一格，
 * 在事故現場沒有人會發現。
 */
const escapeField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const toRow = (fields: string[]): string => fields.map(escapeField).join(",");

export function buildRosterCsv(input: IRosterCsvInput): string {
  const { rosters, labels, generatedAt, generatedBy, timeZone } = input;

  const statusLabel = (status: PresenceStatus): string =>
    status === PresenceStatus.STALE ? labels.statusStale : labels.statusOnSite;

  const lines: string[] = [
    toRow([labels.generatedAt, generatedAt]),
    toRow([labels.generatedBy, generatedBy]),
    toRow([labels.timeZone, timeZone]),
    "",
    toRow([
      labels.location,
      labels.employeeNo,
      labels.name,
      labels.department,
      labels.jobTitle,
      labels.since,
      labels.status,
    ]),
  ];

  for (const roster of rosters) {
    for (const entry of roster.entries) {
      lines.push(
        toRow([
          roster.name,
          entry.employeeNo,
          entry.name,
          entry.departmentName ?? labels.none,
          entry.jobTitle ?? labels.none,
          isoDateTimeLabel(entry.workDate, entry.sinceMinute),
          statusLabel(entry.status),
        ]),
      );
    }
  }

  /**
   * Info: (20260813 - Julian) BOM + CRLF。
   *
   * 沒有 BOM，Excel 會以系統預設編碼開啟 UTF-8 檔案，中文姓名全成亂碼 ——
   * 而這份檔案的第一個讀者幾乎必然是用 Excel 打開它的人。
   * CRLF 同理：Excel 對純 LF 的容忍度取決於版本，而這不是演示當天該賭的事。
   */
  return `﻿${lines.join("\r\n")}\r\n`;
}
