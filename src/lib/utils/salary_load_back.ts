import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";

/**
 * Info: (20260901 - Julian) 「載回計算機」時，這筆紀錄的身分要從哪裡來。
 *
 * - `linked`：名單上有這個人 —— 連結建立，姓名／編號／Email／本薪／伙食費
 *   全部取**名單上的現值**（本薪與伙食費隨後會被快照蓋回當時的值）。
 * - `record`：名單上沒有這個人（已被軟刪）—— **不建立連結**，
 *   姓名與編號取這筆**紀錄上**的值。
 *
 * ## 為什麼抽成純函式
 *
 * 這個判斷有後果，而且兩種後果都是靜默的：
 *
 * - 少了 `record` 這一支（只解除連結、不補寫身分），薪資單預覽與 PNG 檔名
 *   會印**上一個人**的姓名配這一筆真實的薪資數字；沒連結過任何人時是預設的
 *   「王小明」。而薪資單是對外憑據。
 * - 連 `unlink` 都沒做的話更糟：`selectedEmployeeId` 還停在上一個人，
 *   按儲存會 upsert **覆寫上一個人**該月原有的紀錄。
 *
 * 留在 JSX 裡的話，這兩件事只能靠掃描字串守（checklist §1.11 的處方是
 * 「抽成純函式逐條測，掃描測試降級為『元件真的呼叫了它』」）。
 * 本專案不 render React，所以這是唯一能對它下判準的形狀。
 *
 * ## 為什麼 `record` 那一支不回傳 email
 *
 * 薪資紀錄的回應（`ISalaryRecordSummary.employee`）只有 `id` / `name` / `number`。
 * 呼叫端會把 Email 清空 —— 留著上一個人的 Email 比空著危險得多，
 * 那一欄的用途是把薪資單寄出去。
 */
export type ILoadBackIdentity =
  | { kind: "linked"; employee: ISalaryCalculatorEmployee }
  | { kind: "record"; employee: { name: string; number: string } };

export const resolveLoadBackIdentity = (
  employees: readonly ISalaryCalculatorEmployee[],
  recordEmployee: { id: string; name: string; number: string },
): ILoadBackIdentity => {
  const linked = employees.find((item) => item.id === recordEmployee.id);

  if (linked) return { kind: "linked", employee: linked };

  return {
    kind: "record",
    employee: { name: recordEmployee.name, number: recordEmployee.number },
  };
};
