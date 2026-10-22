import {
  ICompanyRegistrationDirector,
  ICompanyRegistrationField,
} from "@/interfaces/business_monitor";

/**
 * Info: (20261022 - Luphia) 把公司登記純文字（`renderGcisRegistrationText` 的輸出）讀回欄位。純函數。
 *
 * 那份文字是我們自己以固定格式渲染的：基本資料一行一個「標籤：值」，空行之後是董監事表，
 * 一行一位、以「｜」分隔四欄。這裡照同一個格式拆回去，值一律原樣保留，不換算、不補值；
 * 對不上格式的行直接略過，不猜。
 */

const FIELD_SEPARATOR = "：";
const DIRECTOR_SEPARATOR = "｜";
const DIRECTOR_COLUMNS = 4;

export function parseRegistrationText(text: string): {
  fields: ICompanyRegistrationField[];
  directors: ICompanyRegistrationDirector[];
} {
  const fields: ICompanyRegistrationField[] = [];
  const directors: ICompanyRegistrationDirector[] = [];
  let inDirectorSection = false;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "") {
      inDirectorSection = true;
      continue;
    }
    if (!inDirectorSection) {
      const at = line.indexOf(FIELD_SEPARATOR);
      if (at <= 0) continue;
      const value = line.slice(at + FIELD_SEPARATOR.length).trim();
      if (value !== "") {
        fields.push({ label: line.slice(0, at), value });
      }
      continue;
    }
    const columns = line.split(DIRECTOR_SEPARATOR);
    // Info: (20261022 - Luphia) 表頭那一行也有四欄，但它帶著括號說明；以「持有股份數」欄是否為數字區分
    if (columns.length !== DIRECTOR_COLUMNS || !/^\d*$/.test(columns[3])) {
      continue;
    }
    directors.push({
      position: columns[0],
      name: columns[1],
      representing: columns[2],
      shares: columns[3],
    });
  }
  return { fields, directors };
}
