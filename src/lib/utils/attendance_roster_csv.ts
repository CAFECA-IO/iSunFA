import { PresenceStatus } from "@/constants/attendance";
import { isoDateTimeLabel } from "@/lib/utils/attendance_format";
import { IPresenceRoster } from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 緊急疏散點名名單的 CSV。純函數。
 * 這份檔案會被列印、帶到集合點、貼進事故調查報告——它是證據，不是資料匯出，
 * 因此：表頭要有產出時間與產出者；每個時間都要自己說得出是哪一天；
 * `STALE` 的人一定要在名單上並標出來（他們是最需要優先打電話確認的對象，見母文件 §D10.5）。
 */

/**
 * Info: (20260813 - Julian) CSV 的欄位標題與狀態文案由呼叫端注入——這一層是純函數，
 * 沒有 i18n context，寫死中文等於決定了這份檔案永遠只有一個語言版本。
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
 * Info: (20260814 - Julian) 試算表會把 `=` `+` `-` `@`（及 TAB / CR）開頭的欄位當**公式求值**。
 * 工區名稱與姓名都是人打的，一個叫 `=HYPERLINK("http://…","點我")` 的工區，
 * 會讓這份名單在別人的 Excel 裡變成可點的連結。
 *
 * **加引號沒有用** —— `"=1+1"` 一樣會被求值；唯一有效的是在前面補一個單引號，
 * 那是試算表的「這一欄是文字」標記（Excel 內不顯示，純文字編輯器看得到）。
 *
 * 這份檔案的用途是列印、帶到集合點、貼進事故調查報告 ——
 * 是這個系統裡最不該挾帶可執行內容的產物。
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/**
 * Info: (20260813 - Julian) CSV 欄位跳脫：逗號、雙引號、換行任一出現就整欄加引號，引號本身加倍。
 * 工區名稱是人打的，未跳脫的逗號會讓整份名單欄位錯位，事故現場沒有人會發現。
 *
 * Info: (20260814 - Julian) 先中和公式再加引號，順序不可對調：
 * 對調的話 `=1+1,x` 會變成 `"=1+1,x"`，引號在最前面，`'` 補不到真正的開頭。
 */
const escapeField = (value: string): string => {
  const neutralized = FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(neutralized)
    ? `"${neutralized.replace(/"/g, '""')}"`
    : neutralized;
};

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
   * Info: (20260813 - Julian) BOM + CRLF：沒有 BOM，Excel 會用系統預設編碼開啟，中文姓名成亂碼；
   * CRLF 是因為 Excel 對純 LF 的容忍度依版本而異。
   */
  return `﻿${lines.join("\r\n")}\r\n`;
}
