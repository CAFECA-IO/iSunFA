/**
 * Info: (20260814 - Emily) 查證用的四個識別欄位
 * (`data/issue_drafts/open/24_report_identity_fields.md`)。
 *
 * ## 為什麼這四個
 *
 * 原始報告都有，我們都沒有。而它們的共同點是**不能從內容推導**：
 *
 * | 欄位 | 能不能從內容推導 |
 * | --- | --- |
 * | 盤查年度 | 2.1 節寫了涵蓋期間，推得出來 —— 但抽錯的代價是封面寫錯年度 |
 * | 製作單位 | 否 |
 * | 查證單位 | **完全否**，原文裡根本沒有 |
 * | 更新日期 | 否 —— 現在印的是「下載當下」，而需要的是定稿／更新日 |
 *
 * 所以它們是文件的中繼資料，跟報告名稱一樣住在外殼裡，而不是內容裡
 * （ADR 014：`content` 必須逐字照抄原文）。
 *
 * ## 沒填的欄位也要印出來
 *
 * 這是本檔最重要的一個決定。藏起來的話，「這一項不適用」與「我們忘了填」
 * 在紙上完全同形 —— 而讀這份文件的是查證單位。
 *
 * 空著但看得見，才會有人去填它。這與目錄頁碼找不到就留白、
 * 圖畫不出來也要說、認不出的符號原樣留著，是同一個判準：
 * **不知道的事要說出來，不要用「沒有那一行」來表示。**
 *
 * ## 順序固定
 *
 * 由寬到嚴：年度 → 誰做的 → 誰查的 → 何時定稿。
 * 決定性的順序讓兩份報告的第一頁可以並排對照，
 * 也讓「這份少了查證單位」一眼看得出來（位置固定，缺就缺在同一格）。
 */

/** Info: (20260814 - Emily) 四個欄位的鍵;順序即列印順序 */
export const CARBON_REPORT_IDENTITY_FIELDS = [
  "inventoryYear",
  "preparedBy",
  "verifiedBy",
  "issuedOn",
] as const;

export type CarbonReportIdentityField =
  (typeof CARBON_REPORT_IDENTITY_FIELDS)[number];

/**
 * Info: (20260814 - Emily) 每一項都是選填的。
 *
 * `undefined` 與 `""` 在這裡是同一件事（都當成沒填），
 * 與 `IReportData.reportName` 刻意不同 —— 那個欄位要靠
 * `undefined` 分辨「還沒命名」與「名稱是空的」，因為它有既有草稿的退回邏輯。
 * 識別欄位沒有退回來源可退，所以不需要那個區分。
 */
export type ICarbonReportIdentity = {
  readonly [K in CarbonReportIdentityField]?: string;
};

export interface IIdentityRow {
  readonly label: string;
  readonly value: string;
}

/**
 * Info: (20260814 - Emily) 組出要印在第一頁的那四列。決定性：同樣的輸入必得同樣的四列。
 *
 * 文案（標籤與「未填寫」）由呼叫端傳入，不在這裡寫死 ——
 * 這支不知道使用者的語言，與 `ICarbonReportShell` 的 brand／systemReport 同一個立場。
 *
 * 回傳**一律四列**。要少印的話那是呼叫端的決定（例如公開分享頁整區不帶），
 * 不是這支挑著印 —— 挑著印就回到「缺的那一項看不出來」。
 */
export const buildIdentityRows = (input: {
  readonly identity?: ICarbonReportIdentity;
  readonly labels: Readonly<Record<CarbonReportIdentityField, string>>;
  readonly placeholder: string;
}): IIdentityRow[] =>
  CARBON_REPORT_IDENTITY_FIELDS.map((field) => {
    const filled = (input.identity?.[field] ?? "").trim();
    return {
      label: input.labels[field],
      value: filled === "" ? input.placeholder : filled,
    };
  });

/**
 * Info: (20260814 - Emily) 有沒有任何一項填過 —— 給呼叫端決定要不要提醒使用者。
 *
 * 「一項都沒填」與「填了一半」是兩種狀態：前者是還沒開始，
 * 後者是做到一半忘了。分得開，提示的措辭才對得上。
 */
export const hasAnyIdentityField = (
  identity?: ICarbonReportIdentity,
): boolean =>
  CARBON_REPORT_IDENTITY_FIELDS.some(
    (field) => (identity?.[field] ?? "").trim() !== "",
  );

/** Info: (20260814 - Emily) 還沒填的欄位;給「還缺三項」這種提示用 */
export const missingIdentityFields = (
  identity?: ICarbonReportIdentity,
): CarbonReportIdentityField[] =>
  CARBON_REPORT_IDENTITY_FIELDS.filter(
    (field) => (identity?.[field] ?? "").trim() === "",
  );
