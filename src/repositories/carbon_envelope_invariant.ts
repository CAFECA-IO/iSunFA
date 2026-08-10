/**
 * Info: (20260810 - Emily) 三張碳盤查儲存表共用的「寫得進去就讀得出來」不變式
 * (PR review 第 2/3/4 點)。
 *
 * ## 這條規則守的是什麼
 *
 * 三個服務的讀取端寫法一字不差:
 *   `encryptedContent && keyDerivationHint ? { ...envelope } : null`
 * 因此只有密文而沒有 hint 的紀錄會讀成 `envelope: null`;前端判定為
 * 「存在但不可讀」並保留真實 version 不覆蓋 —— 那筆紀錄從此永遠卡住,只能 DELETE。
 * 同理,密文與明文都空的紀錄也讀不出任何內容,是同一類終態。
 *
 * 擋在寫入而不是讀取:讀取端無法區分「本來就沒加密」與「加密了但 hint 掉了」,
 * 而寫入端知道。**一個寫得進去就再也讀不出來的狀態,不該是可達的。**
 *
 * ## 它與 schema 的分工
 *
 * schema(`CarbonReportDraftPutSchema`)擋的是業務規則「envelope 與 plainContent 恰一」;
 * 這裡擋的是儲存層的完整性「不得寫入讀不出來的紀錄」。兩者不是同一條規則的兩半:
 * 「兩者皆有」違反前者但**讀得出來**,所以不在這裡擋 —— 這一層只涵蓋不可讀的終態,
 * 在它自己的層次上是完整的。
 *
 * ## 為什麼即使目前不可觸發也要留
 *
 * 走 API 的唯一寫入路徑上,envelope 的兩個欄位由 schema 一起必填,
 * 因此 `hasCipher !== hasHint` **現在到不了**。留著的理由不是「這個情形會發生」,
 * 而是「這是一條不變式,寫入端不該能違反」—— repo 是唯一的 DB 閘口,
 * 任何繞過 API 的呼叫(腳本、遷移、未來的新端點)都經過這裡。
 *
 * 這與同一批修正裡移除 notice route 那段死分支的判準並不衝突:
 * 那段是**執行期檢查**,而它守的條件已由更前面的 schema 擋掉,留著只是雜訊;
 * 這裡是**儲存層不變式**,它守的邊界(繞過 API 的寫入)沒有其他人守。
 * 判準是「這個位置有沒有它才成立的邊界」,不是「今天有沒有觸發過」。
 */

export class CarbonEnvelopeInvariantError extends Error {
  constructor(
    public readonly table: string,
    public readonly reason: string,
    detail: string,
  ) {
    super(`${table}: ${reason} (${detail})`);
    this.name = "CarbonEnvelopeInvariantError";
  }
}

export interface IStorableEnvelope {
  encryptedContent?: string | null;
  keyDerivationHint?: string | null;
  plainContent?: string | null;
}

/**
 * Info: (20260810 - Emily) 寫入前檢查;違反即丟具名錯誤。
 *
 * 丟具名型別而不是原生 Error:服務層一律把 `catch` 到的東西轉成
 * `IS_DB_FAILED`(500),而這個守衛觸發時 DB 其實好得很 ——
 * 呼叫端會看到一個與成因無關的 500,那正是這批修正要消滅的症狀
 * (見 review 第 5 點:「不要在底層炸開,後者完全看不出缺的是什麼」)。
 * 服務層據此把它轉成 `VL_SCHEMA_ERROR`。
 */
export const assertStorableEnvelope = (
  table: string,
  params: IStorableEnvelope,
): void => {
  const hasCipher = Boolean(params.encryptedContent);
  const hasHint = Boolean(params.keyDerivationHint);
  const hasPlain = Boolean(params.plainContent);

  if (hasCipher !== hasHint) {
    throw new CarbonEnvelopeInvariantError(
      table,
      "encryptedContent and keyDerivationHint must be written together or not at all",
      `encryptedContent=${hasCipher}, keyDerivationHint=${hasHint}`,
    );
  }

  if (!hasCipher && !hasPlain) {
    throw new CarbonEnvelopeInvariantError(
      table,
      "a record must carry either an envelope or plainContent",
      `encryptedContent=${hasCipher}, plainContent=${hasPlain}`,
    );
  }
};
