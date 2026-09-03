import {
  INVENTORY_YEAR_MIN,
  INVENTORY_YEAR_STORAGE_MAX,
} from "@/constants/carbon_chatbot";

/**
 * Info: (20260902 - Emily) 盤查年度的裁決(issue_drafts/open/69)。
 *
 * 收下一段自由文字,只在**能唯一確定**時給出數字,其餘一律 `undefined`:
 * - `2024` / `2024年` / ` 2024 ` → 2024(前後的非數字字樣不影響唯一性)
 * - `113`(民國年)→ 退回。**不在這裡 +1911**:三位數字也可能是頁碼、
 *   表號或模型截斷的產物,而換算會把「抄錯」變成一個看起來很正常的年度。
 *   prompt 已要求模型自己換算;它沒照做就是沒抽到,交給使用者填。
 * - `2023-2024` / `2023、2024` → 退回:兩個年度代表這份報告的歸屬本身有歧義,
 *   由使用者裁決而不是由我們挑一個。
 * - 範圍外(過早或未來太遠)→ 退回。盤查報告不會早於 `INVENTORY_YEAR_MIN`,
 *   也不會晚於明年。
 *
 * 判準是「抽錯比抽不到嚴重」:抽不到會在預覽卡上要求使用者填,
 * 抽錯則會靜默改變跨年度合併時哪些分錄被剔除,而畫面上看不出異狀。
 *
 * Info: (20260903 - Luphia) 住在 lib 而不是 service(review):
 * 萃取端(service)與輸入端(預覽卡元件)**必須用同一支裁決** ——
 * 元件不得 import service(分層),而各寫一份就是兩個會分岔的判準,
 * 分岔的症狀是「畫面收下了、儲存讀不回來」。放在 lib 讓兩邊都拿得到。
 */
export const normalizeInventoryYear = (
  raw: string | undefined,
  currentYear: number = new Date().getFullYear(),
): number | undefined => {
  if (raw === undefined) return undefined;
  const matched = /^\D*(\d{4})\D*$/.exec(raw.trim());
  if (matched === null) return undefined;
  const year = Number(matched[1]);
  if (year < INVENTORY_YEAR_MIN || year > currentYear + 1) return undefined;
  return year;
};

/**
 * Info: (20260903 - Luphia) 儲存端讀得回來的年度才收(review 阻-2)。
 *
 * 抽成純函式而不是寫在 hook 裡:寫在 hook 裡的判斷在這個 repo **測不到**
 *(jest 是 node 環境,沒有 jsdom),於是把守門改壞不會有任何測試變紅 ——
 * 我第一版就是那樣寫的,mutation 實測全綠。判斷在這裡、hook 只負責呼叫,
 * 逐條輸入→輸出測得到,掃描則降級為「hook 真的呼叫了這支」(§1.11 的修法)。
 *
 * 界的語意見 `constants/carbon_chatbot` 的那則不變式:
 * **輸入端能產出的年度必須是儲存端能讀回的子集。**
 */
export const isStorableInventoryYear = (
  year: number | undefined,
): year is number =>
  year !== undefined &&
  Number.isInteger(year) &&
  year >= INVENTORY_YEAR_MIN &&
  year <= INVENTORY_YEAR_STORAGE_MAX;

/**
 * Info: (20260903 - Luphia) 報告識別那格盤查年度的**單向**預填(review 不阻擋項)。
 *
 * 回傳「要寫進去的值」,`undefined` = 不要寫。兩條規則:
 * 1. 沒有確認過的年度 → 不寫(沒有東西可預填)
 * 2. 識別那格已經有字 → 不寫。那格是自由文字、逐字印在報告第一頁,
 *    使用者寫「2023 年度」是合法的;預填是建議不是指令,不該蓋掉他要印出去的字。
 *
 * 抽成純函式的理由同 `isStorableInventoryYear`:寫在 hook 裡就測不到,
 * 而「會不會覆蓋」正是這條唯一需要守的行為。
 */
export const resolveIdentityYearPrefill = (
  existing: string | undefined,
  confirmed: number | undefined,
): string | undefined => {
  if (confirmed === undefined) return undefined;
  if ((existing ?? "").trim().length > 0) return undefined;
  return String(confirmed);
};
