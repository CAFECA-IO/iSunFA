/**
 * Info: (20260908 - Julian) 帳本本身的 API 位址。
 *
 * 形狀照 `salary_calculator_api.ts`：帶路徑參數的一律寫成函式，
 * 不讓呼叫端自己接字串。
 *
 * 這個模組目前只有一支，是因為在這之前每個呼叫端都是就地寫字串
 * （`app/user/account_book/page.tsx`、`hooks/use_carbon_chat.ts` 等五處）。
 * 這次不動那五處 —— 它們散在不同模組，收斂是另一件事 ——
 * 但新的呼叫端從這裡取，這樣「帳本 API 長什麼樣」至少有一個答案是寫下來的。
 */
export const accountBookItemApi = (accountBookId: string): string =>
  `/api/v1/user/account_book/${accountBookId}`;
