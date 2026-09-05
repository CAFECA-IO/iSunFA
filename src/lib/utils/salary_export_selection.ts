/**
 * Info: (20260904 - Julian) 薪資紀錄列表的「勾選要匯出哪幾筆」。
 *
 * ## 為什麼是純函式而不是寫在元件裡
 *
 * 這裡有三個判斷會出錯而且**不會有人發現**：跨頁保留、全選只作用於本頁、
 * 以及空頁的表頭勾選框。本專案的測試不 render React（`testEnvironment: "node"`），
 * 留在元件裡等於它們永遠只能靠手動點過。
 *
 * ## 為什麼跨頁保留
 *
 * 列表是分頁的。使用者要匯出十個人而他們散在兩頁時，
 * 換頁就清空等於逼他分兩次匯出、自己合併兩個 CSV。
 *
 * ## 為什麼全選只管本頁
 *
 * 表頭那個勾選框旁邊沒有寫「幾筆」，使用者按下去的時候看到的就是眼前這一頁。
 * 讓它一次勾走三百筆看不見的紀錄，是把「我以為我知道我選了什麼」直接打破 ——
 * 而匯出的是薪資。要整批匯出有另一顆明確寫著「全部符合篩選」的按鈕。
 */

/** Info: (20260904 - Julian) 勾選狀態就是一組 id；CSV 的內容由伺服器依 id 產生 */
export type SalaryExportPicks = ReadonlySet<string>;

export const togglePick = (
  picked: SalaryExportPicks,
  recordId: string,
): Set<string> => {
  const next = new Set(picked);
  if (next.has(recordId)) next.delete(recordId);
  else next.add(recordId);
  return next;
};

/**
 * Info: (20260904 - Julian) 整頁勾選／取消。
 *
 * 取消時**只移除這一頁的 id**，不是清空 —— 其他頁勾選的那些必須留著，
 * 否則「跨頁保留」在使用者取消一次全選之後就悄悄失效了。
 */
export const setPagePicked = (
  picked: SalaryExportPicks,
  pageIds: readonly string[],
  shouldPick: boolean,
): Set<string> => {
  const next = new Set(picked);
  pageIds.forEach((id) => {
    if (shouldPick) next.add(id);
    else next.delete(id);
  });
  return next;
};

/**
 * Info: (20260904 - Julian) 這一頁是不是整頁都勾了（決定表頭勾選框的狀態）。
 *
 * **空頁一律回 false。** `every` 對空陣列回 true，於是「還在載入」或
 * 「這組篩選沒有結果」的畫面上，表頭那個勾選框會顯示成已勾選 ——
 * 而它代表的是零筆。按一下取消還會讓它看起來「終於正常了」，
 * 沒有人會回頭懷疑那一格。
 */
export const isPageAllPicked = (
  picked: SalaryExportPicks,
  pageIds: readonly string[],
): boolean => pageIds.length > 0 && pageIds.every((id) => picked.has(id));

/**
 * Info: (20260904 - Julian) 這一頁勾了一部分（表頭勾選框要顯示成 indeterminate）。
 *
 * 沒有這一格的話，勾了三筆裡的一筆，表頭是空的 —— 與「一筆都沒勾」長得一樣。
 */
export const isPagePartiallyPicked = (
  picked: SalaryExportPicks,
  pageIds: readonly string[],
): boolean =>
  pageIds.some((id) => picked.has(id)) && !isPageAllPicked(picked, pageIds);
