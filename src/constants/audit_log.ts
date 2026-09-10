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
  /**
   * Info: (20260909 - Julian) 薪資紀錄的刪除軌跡。`dataId` 填 `SalaryRecord.id`。
   *
   * 薪資紀錄就是**工資清冊**的那一列，而勞基法 §23 II 要求工資清冊保存五年。
   * 20260909 之前這張表是硬刪且完全沒有軌跡 —— 按一次刪除，那個月的清冊
   * 連同它的寄送紀錄一起永久消失，事後查不出是誰、什麼時候刪的。
   *
   * 只記 `DELETE`，不記 `CREATE` / `UPDATE`：建立與覆寫的軌跡本來就在
   * 紀錄自己身上（`createdByUserId`、`updatedAt`、以及員工檔的調薪歷程），
   * 而刪除是唯一一個「做完之後就沒有東西可以問」的動作。
   * 每次儲存都寫一筆的話，這張表會被沖爆，真正該被看見的刪除反而被淹沒
   * —— 同 `READ` 那一條的理由。
   */
  SALARY_RECORD = "SALARY_RECORD",
}
