// Info: (20260806 - Tzuhan) 排放期間(月別)的邊界常數。

/**
 * Info: (20260806 - Tzuhan) 交易時間戳的合理範圍(單位:**秒**)。
 *
 * 這個界不是形式主義。本專案同時存在兩種時間戳慣例 ——
 * repo 一律 `Math.floor(getTime() / 1000)`(秒),而 `Date.now()` 是毫秒。
 * 一旦有人誤傳毫秒,換算出來的年份會落在五萬多年後,
 * 而月別標籤照樣印得出來:圖上只是多一個看不懂的節點,沒有任何一處會報錯。
 *
 * 寧可判定為「未標註期間」也不要印一個假的月份 ——
 * 一個假日期在查核文件上比一個空白嚴重得多。
 */
export const EMISSION_TIMESTAMP_MIN_SECONDS = 0;

// Info: (20260806 - Tzuhan) 2200-01-01T00:00:00Z。取遠界而非「今年」:補列往年資料是正常作業,
// Info: (20260806 - Tzuhan) 這道界要擋的是單位搞錯(毫秒當秒),不是擋未來日期。
export const EMISSION_TIMESTAMP_MAX_SECONDS = 7258118400;

// Info: (20260806 - Tzuhan) 秒 → 毫秒(Date 建構子吃毫秒)
export const MILLISECONDS_PER_SECOND = 1000;

// Info: (20260806 - Tzuhan) 月別標籤補零位數(YYYY-MM 的 MM)
export const EMISSION_MONTH_LABEL_DIGITS = 2;
