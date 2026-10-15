/**
 * Info: (20260914 - Julian) 「這本帳還沒有公司設定」提示的兩件純邏輯。
 *
 * 畫面在 `components/salary_calculator/company_profile_hint.tsx`。
 * 抽出來是因為本專案的測試**不 render React** —— 留在元件裡的判準
 * 沒有任何東西守得住，而這兩件正好是會靜靜地壞掉的那兩件：
 * 壞了的症狀都是「提示沒出現」，而那與「沒有提示」長得一模一樣。
 */

/**
 * Info: (20260914 - Julian) 關閉旗標的 `localStorage` 鍵。**一定要帶 `accountBookId`。**
 *
 * 共用一個鍵的話，在 A 帳本設定完順手關掉提示，B 帳本（從來沒設定過）
 * 的提示也跟著消失 —— 而那正是最需要看到它的那一本。
 *
 * 前綴 `isunfa:` 是因為 `localStorage` 以來源分區，同一個網域底下所有頁面
 * 共用一個命名空間；短鍵（`dismissed`）撞號時兩邊都不會報錯。
 *
 * **這一點與既有的兩處不一致**（`cookie_consent`、`guest_usage` 都是裸鍵），
 * 是刻意的：那兩個是全站唯一的旗標，而這個鍵是**一本帳一個**，
 * 本來就會長出很多把 —— 撞號的機會與後果都不同。
 * 不回頭改那兩處，因為改鍵名等於把所有既有使用者的設定清掉。
 *
 * 關閉只是「我知道了」，不是「已處理」：設定完成之後 `isConfigured` 為真，
 * 這一則本來就不會再出現，所以沒有清掉旗標的必要。
 */
export const companyProfileHintDismissKeyOf = (accountBookId: string): string =>
  `isunfa:salary:company-profile-hint-dismissed:${accountBookId}`;

/**
 * Info: (20260914 - Julian) 這一則提示什麼時候該出現。
 *
 * 四個條件全部成立才出現，而**每一個都是為了避免一種說錯話的方式**：
 *
 * | 條件 | 不加會怎樣 |
 * | --- | --- |
 * | 已經設定好就不出現 | 對著填好的帳本喊「你還沒設定」 |
 * | 讀取中不出現 | 每次進頁面閃一下，包含設定好的帳本 |
 * | 讀失敗不出現 | **不知道**有沒有設定，卻斷言沒有 —— 使用者會去把資料重打一次 |
 * | 已關閉不出現 | 關不掉的提示 |
 *
 * `isDismissed` 收 `boolean | null`，`null` ＝ 還沒讀過 `localStorage`。
 * 那時候一律不出現：初值當成「沒關過」的話，已經關掉的人每次進頁面
 * 都會看到它閃一下。
 */
export const shouldShowCompanyProfileHint = ({
  isConfigured,
  isLoading,
  loadFailed,
  isDismissed,
}: {
  isConfigured: boolean;
  isLoading: boolean;
  loadFailed: boolean;
  isDismissed: boolean | null;
}): boolean =>
  !isConfigured && !isLoading && !loadFailed && isDismissed === false;
