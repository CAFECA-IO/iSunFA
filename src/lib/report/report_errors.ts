/**
 * Info: (20260728 - Julian)
 * 資料整合性違規：傳票明細無法勾稽（缺會計代碼/借貸方向）或違反決定論護欄。
 * 以具名類別供 Service / route 以 instanceof 判定，取代脆弱的錯誤字串比對（訊息改字不再靜默失效）。
 */
export class DataIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataIntegrityError";
  }
}
