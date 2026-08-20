/**
 * Info: (20260820 - Julian) 人事管理模組的上線閘。
 *
 * ## 為什麼需要它
 *
 * `/hr_management/*` 與它的 37 支 API 都已經在 `src/app` 下，也就是
 * **已經部署出去了** —— 而這個模組還在開發中。它沒有從任何全站導覽連出去，
 * 但那不是保護：路徑是猜得到的，而 layout 的註解自己寫著
 * 「這個 layout 連沒有登入的頁面都會渲染」。
 *
 * ## 為什麼是路徑判斷而不是逐支端點加檢查
 *
 * 逐支加等於 37 個各自可能忘記的地方，而**忘記的症狀是「那一支照樣通」** ——
 * 沒有任何錯誤訊息。路徑判斷只有一份，且**下一支新增的端點自動被涵蓋**。
 * `hr_module_gate.test.ts` 會掃檔案系統確認這一點：新增一支落在規則外的
 * 路由，那支測試會紅。
 *
 * ## 為什麼判準放在這裡而不是寫在 middleware 裡
 *
 * 測試要驗的就是這個判準。寫在 middleware 裡的話，測試只能手抄一份規則，
 * 而一份手抄的規則與缺陷完全相容（checklist §1.9）。
 */

/**
 * Info: (20260820 - Julian) 這個路徑屬於人事管理模組嗎。
 *
 * 逐段比對而不是 `includes("hr")`：後者會把
 * `/api/v1/threshold/...` 這種只是字串裡有 `hr` 的路徑也擋掉，
 * 而一道會誤擋的閘遲早會被人整個關掉。
 */
export const isHrModulePath = (pathname: string): boolean => {
  const segments = pathname.split("/").filter((part) => part.length > 0);
  if (segments.length === 0) return false;

  // Info: (20260820 - Julian) 畫面：/hr_management 與它底下的一切
  if (segments[0] === "hr_management") return true;

  /**
   * Info: (20260820 - Julian) API：路徑上任何一段恰好是 `hr`。
   *
   * 涵蓋現行的兩種形狀 —— `/api/v1/hr/...`（人事主檔，端點尚未實作）
   * 與 `/api/v1/user/account_book/{id}/hr/...`（假勤，37 支）。
   * 用「任何一段」而不是寫死那兩個前綴：帳本 id 是動態段，
   * 而下一個模組可能掛在第三種位置上。
   */
  if (segments[0] === "api") return segments.includes("hr");

  return false;
};

/**
 * Info: (20260820 - Julian) 模組開著嗎。**預設關**。
 *
 * 預設關而不是預設開：一個忘記設定的環境應該是「看不到這個模組」，
 * 不是「對外開放一個開發中的模組」。兩種遺漏都會發生，
 * 而只有一種會讓外人看到不該看的東西。
 *
 * ⚠️ **這是 build 時的開關，不是 runtime 的。** Next.js 會把 middleware 裡的
 * `process.env.X` 在打包時內聯成字面值 —— 改了 `.env` 之後**必須重新 build**，
 * 重啟不算。在部署平台上改環境變數而沒有觸發重新部署時，這道閘不會變。
 *
 * 只接受字面的 `"true"`：`"1"` / `"yes"` / `"TRUE"` 一律視為關。
 * 寬鬆的解析會讓一個打錯的值意外地把模組打開，而那正是這道閘要防的事。
 */
export const isHrModuleEnabled = (
  value: string | undefined = process.env.HR_MODULE_ENABLED,
): boolean => value === "true";
