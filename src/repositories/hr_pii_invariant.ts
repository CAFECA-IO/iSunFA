/**
 * Info: (20260811 - Julian) 四張人事個資表共用的「寫得進去就必須讀得出來」不變式。
 *
 * ## 這條規則守的是什麼
 *
 * 讀取端要解開任何一個 `*Cipher` 欄位，都必須知道用哪一代金鑰 ——
 * 也就是同一列的 `piiKeyVersion`。一筆有密文卻沒有 keyVersion 的紀錄，
 * 在金鑰輪替之後就再也試不出來（試錯代金鑰只會得到 GCM 驗章失敗），
 * 那是一個**寫得進去卻永遠讀不出來的終態**，只能刪掉重建 ——
 * 而重建需要的原始明文，正好就在那筆讀不出來的紀錄裡。
 *
 * 這與 `carbon_envelope_invariant.ts` 是同一條規則的同一種形狀：
 * 密文與解密線索必須一起寫入，或一起不寫。差別只在碳盤查的線索是
 * HD 派生路徑，這裡的線索是金鑰代次。
 *
 * ## 為什麼擋在寫入而不是讀取
 *
 * 讀取端無法區分「這欄本來就沒填」與「填了但 keyVersion 掉了」——
 * 兩者都是 `cipher ? decrypt(...) : null` 的 null 分支。寫入端知道。
 *
 * ## 為什麼即使目前不可觸發也要留
 *
 * 走 repository 的正常路徑上，加密與 keyVersion 由 `encryptPii()` 的回傳值
 * 一起產生，因此現在到不了。留著的理由是「這是一條不變式，寫入端不該能違反」——
 * repository 是唯一的 DB 閘口，任何繞過 service 的呼叫（種子腳本、資料遷移、
 * 金鑰輪替作業、未來的批次匯入）都會經過這裡。
 * 金鑰輪替腳本尤其：那支腳本的工作就是同時改寫密文與 keyVersion，
 * 是這條不變式最可能被違反的地方，也是違反後果最不可逆的地方。
 */

import { HrPiiTable } from "@/constants/hr_pii";

export class HrPiiInvariantError extends Error {
  constructor(
    public readonly table: HrPiiTable,
    public readonly reason: string,
    detail: string,
  ) {
    super(`${table}: ${reason} (${detail})`);
    this.name = "HrPiiInvariantError";
  }
}

export interface IStorablePii {
  /**
   * Info: (20260811 - Julian) 該列所有 `*Cipher` 欄位的值（含 null / undefined）。
   * 傳整組而不是「有沒有密文」的布林值：呼叫端自己算那個布林值，
   * 就等於把不變式的判斷邏輯複製到每個呼叫點，而複製出去的那份會走樣。
   */
  ciphers: Readonly<Record<string, string | null | undefined>>;
  keyVersion: number | null | undefined;
  algorithm: string | null | undefined;
}

/**
 * Info: (20260811 - Julian) 寫入前檢查；違反即丟具名錯誤，由 service 層轉成 `VL_SCHEMA_ERROR`。
 *
 * 丟具名型別的理由同碳盤查：service 一律把 catch 到的東西包成 `IS_DB_FAILED`(500)，
 * 而這個守衛觸發時 DB 完全正常，呼叫端會收到一個與成因無關的 500。
 */
export function assertStorablePii(
  table: HrPiiTable,
  params: IStorablePii,
): void {
  const filled = Object.entries(params.ciphers).filter(([, value]) =>
    Boolean(value),
  );
  const hasCipher = filled.length > 0;
  const hasKeyVersion =
    params.keyVersion !== null && params.keyVersion !== undefined;

  if (hasCipher && !hasKeyVersion) {
    throw new HrPiiInvariantError(
      table,
      "ciphertext written without a key version; the row would be permanently undecryptable",
      `fields=[${filled.map(([name]) => name).join(", ")}], keyVersion=${params.keyVersion}`,
    );
  }

  if (hasCipher && !params.algorithm) {
    throw new HrPiiInvariantError(
      table,
      "ciphertext written without an algorithm tag",
      `fields=[${filled.map(([name]) => name).join(", ")}], algorithm=${params.algorithm}`,
    );
  }

  /**
   * Info: (20260811 - Julian) 反向也擋：沒有任何密文卻標了 keyVersion。
   *
   * 這個方向不會讓資料讀不出來，擋它的理由不同 —— 一列「宣稱用 v2 金鑰加密、
   * 實際上沒有任何密文」的紀錄，會讓金鑰輪替腳本的盤點失準：
   * 腳本靠 keyVersion 決定哪些列還沒輪替完，而這種列會被永遠算進待處理集合。
   */
  if (!hasCipher && hasKeyVersion) {
    throw new HrPiiInvariantError(
      table,
      "key version recorded without any ciphertext",
      `keyVersion=${params.keyVersion}, ciphers=[${Object.keys(params.ciphers).join(", ")}]`,
    );
  }
}
