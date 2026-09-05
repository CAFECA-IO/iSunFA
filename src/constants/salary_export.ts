/**
 * Info: (20260904 - Julian) 薪資紀錄 CSV 匯出的界限值。
 *
 * 放在 `constants` 而不是 service 旁邊：validator、service、前端與測試都要用到它，
 * 而這個檔案不 import 任何 repository（同 `salary_delivery.ts` 的理由）。
 */

/**
 * Info: (20260904 - Julian) 一次最多匯出幾筆。
 *
 * 上限存在的理由不是效能，是**這是一次批次擷取**：不設限的話，一個請求
 * 就能把整本帳所有年月的完整薪資明細打包帶走。500 遠大於任何一次
 * 正常的對帳量（一本帳一個月數十人），而它擋得住「把整張表當成一次查詢」。
 *
 * 這個數字同時是前端的守門：勾超過就把匯出鈕停用並說出原因，
 * 而不是讓使用者按下去才收到 400。
 */
export const SALARY_EXPORT_MAX_RECORDS = 500;
