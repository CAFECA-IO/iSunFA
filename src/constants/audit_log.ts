export enum AuditLogAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  /**
   * Info: (20260811 - Julian) 唯讀動作，目前僅用於 EMPLOYEE_PII。
   *
   * 財務資料是「改了才需要留痕」，個資則是「被看過本身就是事件」——
   * 個資法 §12 的通知義務與 §27 的安全維護措施都要求能回答
   * 「外洩時，誰在什麼時候接觸過哪些人的資料」，而那個問題無法用寫入軌跡回答。
   *
   * 刻意不對其他 dataType 開放：如果每次讀 Journal 都寫一筆 AuditLog，
   * 這張表會被沖爆，真正該被看見的個資存取反而被淹沒。
   */
  READ = "READ",
}

export enum AuditLogDataType {
  JOURNAL = "JOURNAL",
  VOUCHER = "VOUCHER",
  ESG_RECORD = "ESG_RECORD",
  /**
   * Info: (20260811 - Julian) 人事敏感個資的存取軌跡。
   *
   * `dataId` 一律填所屬的 `Employee.id`，即使被讀的是 BankAccount 或 Dependent ——
   * 個資外洩事故的調查軸線是「哪些**人**受影響」，不是「哪張表被讀」。
   * 填子表 id 會讓「這名員工的資料被誰看過」這個最常問的問題需要先反查父表。
   */
  EMPLOYEE_PII = "EMPLOYEE_PII",
}
