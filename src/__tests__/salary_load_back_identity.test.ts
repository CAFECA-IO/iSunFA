import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";
import { resolveLoadBackIdentity } from "@/lib/utils/salary_load_back";
import {
  DEFAULT_EMPLOYEE_LEAVE,
  DEFAULT_EMPLOYEE_PROFILE,
} from "@/lib/utils/salary_employee_profile";

/**
 * Info: (20260901 - Julian) 「載回計算機」時這筆紀錄屬於誰。
 *
 * ## 這一支擋的是什麼
 *
 * 兩個缺陷，同一個地方，兩輪 review 各抓到一半：
 *
 * 1. 名單裡找不到那個人時沒有解除連結 → `selectedEmployeeId` 還停在**上一個人**
 *    → 按儲存 upsert **覆寫上一個人**該月原有的紀錄，畫面上沒有任何提示。
 * 2. 解除了連結但沒補寫身分 → 薪資單預覽與 PNG 檔名
 *    `${employeeName}_${date}.png` 印**上一個人**的姓名配這一筆真實的薪資數字；
 *    沒連結過任何人時印的是預設的「王小明」。而薪資單是對外憑據。
 *
 * 兩次的共同形狀是「判斷寫在 JSX、答案是錯的」（checklist §1.11），
 * 而它兩次都沒有任何判準 —— 第一次修好之後，下一個人把 `else` 順手刪掉照樣全綠。
 *
 * ## 兩層判準，分工明確
 *
 * - **純函式**（下面第一個 describe）：判斷本身答得對不對。
 * - **掃描**（第二個 describe）：元件真的呼叫了它，而且兩個分支都接上了。
 *   本專案 `testEnvironment: "node"`、沒有任何一支 render React，
 *   所以「元件有沒有照著做」只能用掃描 —— 這是 §1.11 明文的降級用法，
 *   前提是判斷本身已經被純函式測住了。
 */

const employeeOf = (
  overrides: Partial<ISalaryCalculatorEmployee> = {},
): ISalaryCalculatorEmployee => ({
  // Info: (20260902 - Julian) 常態屬性整組必填；放最前面，下面幾行才蓋得掉它
  ...DEFAULT_EMPLOYEE_PROFILE,
  ...DEFAULT_EMPLOYEE_LEAVE,
  // Info: (20260905 - Luphia) 完整度預設「沒有缺漏」；要驗警示的案例自己覆蓋（#6774）
  missingPeriods: [],
  id: "emp-1",
  name: "張三",
  number: "A001",
  email: "zhang@example.com",
  baseSalary: 40000,
  mealAllowance: 3000,
  ...overrides,
});

const RECORD_EMPLOYEE = { id: "emp-2", name: "李四", number: "A002" };

describe("resolveLoadBackIdentity", () => {
  it("名單上有這個人 → 建立連結，帶的是名單上的那一列", () => {
    const target = employeeOf({ id: "emp-2", name: "李四", number: "A002" });
    const identity = resolveLoadBackIdentity(
      [employeeOf(), target],
      RECORD_EMPLOYEE,
    );

    expect(identity.kind).toBe("linked");
    // Info: (20260901 - Julian) 帶的是名單那一列本身，不是重新拼出來的物件
    expect(identity.kind === "linked" && identity.employee).toBe(target);
  });

  /**
   * Info: (20260901 - Julian) 這一條就是阻擋 C 本身。
   *
   * 回 `record` 而不是「什麼都不回」——「不做事」正是先前那一版的行為，
   * 而它的症狀是畫面上留著上一個人的姓名。
   */
  it("名單上沒有這個人 → 不連結，身分取這筆紀錄上的姓名與編號", () => {
    const identity = resolveLoadBackIdentity([employeeOf()], RECORD_EMPLOYEE);

    expect(identity.kind).toBe("record");
    expect(identity.employee).toEqual({ name: "李四", number: "A002" });
  });

  /**
   * Info: (20260901 - Julian) 空名單也是「找不到」，而且是最常發生的一種。
   *
   * 名單那支 GET 還在飛、或失敗被吞成 `[]` 時都會走到這裡。
   * 這一格若回 `linked`（例如用 `employees[0]` 當退路），
   * 就會把李四的薪資掛到名單第一個人身上。
   */
  it("名單是空的 → 一樣走 record，不會退而求其次抓別人", () => {
    const identity = resolveLoadBackIdentity([], RECORD_EMPLOYEE);

    expect(identity.kind).toBe("record");
    expect(identity.employee.name).toBe("李四");
  });

  // Info: (20260901 - Julian) 比對的是 id，不是姓名 —— 同名同姓在同一本帳完全合法
  it("同名不同 id 不算找到", () => {
    const sameName = employeeOf({ id: "emp-9", name: "李四", number: "A099" });
    const identity = resolveLoadBackIdentity([sameName], RECORD_EMPLOYEE);

    expect(identity.kind).toBe("record");
    expect(identity.employee.number).toBe("A002");
  });

  // Info: (20260901 - Julian) `record` 那一支不得帶 email：紀錄上沒有，而留舊的會把薪資單寄錯人
  it("record 分支只帶姓名與編號，沒有 email", () => {
    const identity = resolveLoadBackIdentity([], RECORD_EMPLOYEE);

    expect(Object.keys(identity.employee).sort()).toEqual(["name", "number"]);
  });
});

const SRC = join(process.cwd(), "src");

const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const readSource = (...segments: string[]): string =>
  stripComments(readFileSync(join(SRC, ...segments), "utf-8"));

describe("薪資紀錄頁真的照著這個判斷做", () => {
  const page = readSource(
    "components",
    "salary_calculator",
    "salary_records_page_body.tsx",
  );

  it("載回流程走 resolveLoadBackIdentity，不是自己 find 一遍", () => {
    expect(page).toContain(
      'import { resolveLoadBackIdentity } from "@/lib/utils/salary_load_back"',
    );
    expect(page).toContain(
      "resolveLoadBackIdentity(employees, detail.employee)",
    );
    // Info: (20260901 - Julian) 元件裡不該再留一份自己的比對邏輯 —— 兩份會走樣
    expect(page).not.toContain("employees.find((item) => item.id");
  });

  it("兩個分支都接上：linked 走 linkEmployee，record 走 applyRecordEmployee", () => {
    expect(page).toContain("linkEmployee(identity.employee)");
    expect(page).toContain("applyRecordEmployee(identity.employee)");
  });

  /**
   * Info: (20260901 - Julian) 名單載入中與名單掛了都要擋在門外。
   *
   * 兩種情況下 `employees` 都是 `[]`，判斷會回 `record` —— 但那是**假的找不到**，
   * 那個人其實好好地在名單上。少了 `hasEmployeesError` 那一半的話，
   * 名單 GET 失敗時按鈕會重新可按，而畫面上沒有任何訊息說名單掛了。
   */
  it("載回鈕在名單載入中或載入失敗時都停用", () => {
    expect(page).toContain(
      "disabled={isEmployeesLoading || hasEmployeesError}",
    );
    expect(page).toContain("hasError: hasEmployeesError");
  });
});

describe("applyRecordEmployee 與 unlinkEmployee 的分工", () => {
  const context = readSource("contexts", "calculator_context.tsx");

  /**
   * Info: (20260901 - Julian) `unlinkEmployee` 只清連結，不清欄位 —— 這是刻意的。
   *
   * 它的呼叫端是 Step 1 那顆「解除連結」，使用者要的是「這次不要存到他身上」，
   * 不是「把畫面清空」。所以載回那條路不能只呼叫它。
   */
  it("unlinkEmployee 只動 selectedEmployeeId", () => {
    expect(context).toContain(
      "const unlinkEmployee = () => setSelectedEmployeeId(null);",
    );
  });

  it("applyRecordEmployee 同時寫身分、清 Email、斷連結", () => {
    const body = context.slice(
      context.indexOf("const applyRecordEmployee"),
      context.indexOf("const loadFromSnapshot"),
    );

    expect(body).toContain("setEmployeeName(employee.name)");
    expect(body).toContain("setEmployeeNumber(employee.number)");
    // Info: (20260901 - Julian) 紀錄上沒有 Email，留著上一個人的會把薪資單寄錯人
    expect(body).toContain('setEmployeeEmail("")');
    expect(body).toContain("setSelectedEmployeeId(null)");
  });
});
