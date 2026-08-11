/**
 * Info: (20260811 - Julian) 人事個資的遮罩。API 預設回遮罩值，完整值另走一條會寫稽核的路徑。
 *
 * 遮罩不是加密的替代品，是它的互補：加密防的是資料庫被讀走，
 * 遮罩防的是「有權限的人不小心看到不需要看到的東西」——
 * HR 承辦人開員工列表時不需要看到每個人的完整身分證，
 * 而一旦畫面上有，它就會被截圖、被貼進通訊軟體、被印出來。
 *
 * 遮罩一律在伺服器端做完才回傳。前端遮罩等於沒遮：完整值已經在 response 裡，
 * 開 DevTools 就看得到，也會進瀏覽器快取與任何中間的 log。
 */

import { HR_PII_MASK_CHAR, HR_PII_MASK_VISIBLE_TAIL } from "@/constants/hr_pii";

/**
 * Info: (20260811 - Julian) 通用尾碼遮罩：保留末 N 碼，其餘以遮罩字元等長取代。
 *
 * 等長取代而不是固定幾顆星：長度本身通常不敏感（身分證固定 10 碼、
 * 銀行帳號長度公開），而保留長度能讓使用者確認「這是我那張卡」。
 */
export function maskTail(
  value: string | null | undefined,
  visibleTail: number = HR_PII_MASK_VISIBLE_TAIL,
): string | null {
  if (!value) return null;

  // Info: (20260811 - Julian) 值比要保留的尾碼還短時全遮 —— 否則等於原樣回傳，遮了跟沒遮一樣
  if (value.length <= visibleTail) {
    return HR_PII_MASK_CHAR.repeat(value.length);
  }

  const hidden = value.length - visibleTail;
  return HR_PII_MASK_CHAR.repeat(hidden) + value.slice(hidden);
}

/**
 * Info: (20260811 - Julian) 身分證字號：保留首字母與末 3 碼（例 `A****789`）。
 *
 * 首字母是縣市碼，留著讓承辦人能在列表上分辨兩筆相似資料；
 * 中間全遮。留首字母不會顯著縮小猜測空間 —— 縣市碼只有 26 種，
 * 而末 3 碼已是 `HR_PII_MASK_VISIBLE_TAIL` 權衡過的結果。
 */
export function maskNationalId(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (value.length <= HR_PII_MASK_VISIBLE_TAIL + 1) {
    return HR_PII_MASK_CHAR.repeat(value.length);
  }

  const head = value.slice(0, 1);
  const tail = value.slice(value.length - HR_PII_MASK_VISIBLE_TAIL);
  const hidden = value.length - HR_PII_MASK_VISIBLE_TAIL - 1;
  return head + HR_PII_MASK_CHAR.repeat(hidden) + tail;
}

// Info: (20260811 - Julian) 銀行帳號：僅保留末 3 碼，首碼不留（開頭幾碼是分行代碼，已另存明文欄位）
export function maskBankAccountNumber(
  value: string | null | undefined,
): string | null {
  return maskTail(value);
}

/**
 * Info: (20260811 - Julian) 戶名：只留姓氏（首字），其餘遮掉（例 `王**`）。
 *
 * 與號碼不同，姓名遮尾碼沒有意義 —— 中文姓名保留末 3 碼幾乎等於全部露出。
 */
export function maskAccountHolder(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (value.length <= 1) return HR_PII_MASK_CHAR.repeat(value.length);
  return value.slice(0, 1) + HR_PII_MASK_CHAR.repeat(value.length - 1);
}

// Info: (20260811 - Julian) 電話：保留末 3 碼（例 `*******678`）
export function maskPhone(value: string | null | undefined): string | null {
  return maskTail(value);
}

/**
 * Info: (20260811 - Julian) 生日：只回年份（例 `1990`）。
 *
 * 生日的敏感點在「完整的年月日」—— 那是各種身分驗證的常見備用答案。
 * 年份足以支撐年資、退休試算、年齡級距統計這些實際用途。
 */
export function maskBirthday(value: string | null | undefined): string | null {
  if (!value) return null;
  const year = value.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

/**
 * Info: (20260811 - Julian) 地址：只回到縣市層級（前 3 個字）。
 *
 * 郵寄需求由後端直接取完整值組信封，畫面上不需要門牌 ——
 * 門牌是可以直接找到人的資訊，屬於本模組最不該出現在列表頁的東西。
 */
export function maskAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 3) return value;
  return value.slice(0, 3) + HR_PII_MASK_CHAR.repeat(3);
}
