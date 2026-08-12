import { describe, it, expect } from "@jest/globals";
import {
  EmployeeStatus,
  Gender,
  ProbationResult,
} from "@/constants/hr_management";
import {
  IEmployeeListItem,
  IProbationOutcome,
} from "@/interfaces/hr_management";
import { parseIsoDate } from "@/lib/utils/hr_date";
import {
  applyProbationOutcomes,
  buildProbationMetrics,
  buildProbationRows,
} from "@/lib/utils/hr_movement";

/**
 * Info: (20260812 - Julian) 考核結果寫回名冊的三條分支。
 *
 * 這一段最容易寫錯的不是算式，而是「生效時機」：通過轉正填的是一個日期。
 * 如果把它當成立刻，一個 9/1 才轉正的人會在 8/10 就被算進正式員工，
 * 而那個數字會被編制與薪資引用。畫面測試看不到這件事 ——
 * 它只能驗證「送出後那一列不見了」，看不出來是哪一天不見的。
 *
 * 三條分支彼此獨立（PASS 改狀態、EXTEND 改到期日、FAIL 兩者都不改），
 * 因此各測各的，而不是靠同一份表單走一遍。
 */

const TODAY = parseIsoDate("2026-08-10");

const buildPerson = (
  overrides: Partial<IEmployeeListItem> = {},
): IEmployeeListItem => ({
  id: "emp-001",
  employeeNo: "EMP001",
  name: "王小明",
  englishName: null,
  gender: Gender.MALE,
  email: "emp001@isunfa.com",
  maskedPhone: "*******678",
  birthMonthDay: null,
  age: null,
  status: EmployeeStatus.PROBATION,
  // Info: (20260812 - Julian) 試用期三個月，到期日為 2026-07-22 —— 以 TODAY 而言已逾期 19 天
  hireDate: "2026-04-22",
  leaveDate: null,
  departmentId: "dep-001",
  departmentName: "技術部",
  jobTitleId: "jt-005",
  jobTitle: "後端工程師",
  managerName: "張大明",
  ...overrides,
});

const outcomes = (
  entries: Record<string, Partial<IProbationOutcome>>,
): Map<string, IProbationOutcome> =>
  new Map(
    Object.entries(entries).map(([id, value]) => [
      id,
      {
        result: ProbationResult.PASS,
        effectiveDate: "",
        extendUntil: "",
        ...value,
      },
    ]),
  );

describe("applyProbationOutcomes", () => {
  it("should turn a probationer into a regular employee once the effective date has arrived", () => {
    const result = applyProbationOutcomes(
      [buildPerson()],
      outcomes({
        "emp-001": {
          result: ProbationResult.PASS,
          effectiveDate: "2026-07-23",
        },
      }),
      TODAY,
    );
    expect(result[0].status).toBe(EmployeeStatus.ACTIVE);
  });

  // Info: (20260812 - Julian) 生效當天就算生效，不是隔天
  it("should treat the effective date itself as effective", () => {
    const result = applyProbationOutcomes(
      [buildPerson()],
      outcomes({
        "emp-001": {
          result: ProbationResult.PASS,
          effectiveDate: "2026-08-10",
        },
      }),
      TODAY,
    );
    expect(result[0].status).toBe(EmployeeStatus.ACTIVE);
  });

  /**
   * Info: (20260812 - Julian) 這一條是整支測試存在的理由。
   * 生效日還沒到就改狀態，等於讓一個還在試用期的人提前被算成正式員工。
   */
  it("should keep the employee on probation before the effective date", () => {
    const result = applyProbationOutcomes(
      [buildPerson()],
      outcomes({
        "emp-001": {
          result: ProbationResult.PASS,
          effectiveDate: "2026-09-01",
        },
      }),
      TODAY,
    );
    expect(result[0].status).toBe(EmployeeStatus.PROBATION);
  });

  it("should not change status for extend or fail", () => {
    const [extended] = applyProbationOutcomes(
      [buildPerson()],
      outcomes({
        "emp-001": {
          result: ProbationResult.EXTEND,
          extendUntil: "2026-10-22",
        },
      }),
      TODAY,
    );
    const [failed] = applyProbationOutcomes(
      [buildPerson()],
      outcomes({ "emp-001": { result: ProbationResult.FAIL } }),
      TODAY,
    );
    expect(extended.status).toBe(EmployeeStatus.PROBATION);
    expect(failed.status).toBe(EmployeeStatus.PROBATION);
  });

  /**
   * Info: (20260812 - Julian) 只有試用期中的人會被轉正。
   * 少了這道守衛，一筆殘留的舊考核會把已離職者改回在職。
   */
  it("should ignore employees who are no longer on probation", () => {
    const result = applyProbationOutcomes(
      [buildPerson({ status: EmployeeStatus.RESIGNED })],
      outcomes({
        "emp-001": {
          result: ProbationResult.PASS,
          effectiveDate: "2026-07-23",
        },
      }),
      TODAY,
    );
    expect(result[0].status).toBe(EmployeeStatus.RESIGNED);
  });

  it("should leave employees without an outcome untouched", () => {
    const people = [buildPerson(), buildPerson({ id: "emp-002" })];
    const result = applyProbationOutcomes(people, outcomes({}), TODAY);
    expect(result.map((item) => item.status)).toEqual([
      EmployeeStatus.PROBATION,
      EmployeeStatus.PROBATION,
    ]);
  });
});

describe("buildProbationRows", () => {
  it("should derive the end date from the hire date when there is no outcome", () => {
    const [row] = buildProbationRows([buildPerson()], TODAY);
    expect(row.probationEndDate).toBe("2026-07-22");
    expect(row.isExtended).toBe(false);
    expect(row.isOverdue).toBe(true);
  });

  /**
   * Info: (20260812 - Julian) 延長試用之後紅燈必須熄掉。
   * 到期日原本是由到職日推得的衍生值 —— 不讓考核覆寫它，
   * 主管填了「延長至 10/22」清單仍會顯示逾期 19 天，那張紅燈就永遠消不掉。
   */
  it("should move the end date to the extended date and clear the overdue flag", () => {
    const [row] = buildProbationRows(
      [buildPerson()],
      TODAY,
      outcomes({
        "emp-001": {
          result: ProbationResult.EXTEND,
          extendUntil: "2026-10-22",
        },
      }),
    );
    expect(row.probationEndDate).toBe("2026-10-22");
    expect(row.isExtended).toBe(true);
    expect(row.isOverdue).toBe(false);
    expect(row.daysUntilEnd).toBe(73);
  });

  // Info: (20260812 - Julian) 只填了結果、日期還空著時不要把到期日算成 Invalid Date
  it("should fall back to the derived date when the extended date is blank", () => {
    const [row] = buildProbationRows(
      [buildPerson()],
      TODAY,
      outcomes({ "emp-001": { result: ProbationResult.EXTEND } }),
    );
    expect(row.probationEndDate).toBe("2026-07-22");
    expect(row.isExtended).toBe(false);
  });

  // Info: (20260812 - Julian) 節點仍以到職日為準，延長不會把三個關懷節點一起往後推
  it("should keep milestones anchored to the hire date after an extension", () => {
    const [base] = buildProbationRows([buildPerson()], TODAY);
    const [extended] = buildProbationRows(
      [buildPerson()],
      TODAY,
      outcomes({
        "emp-001": {
          result: ProbationResult.EXTEND,
          extendUntil: "2026-10-22",
        },
      }),
    );
    expect(extended.milestones).toEqual(base.milestones);
  });
});

describe("buildProbationMetrics", () => {
  /**
   * Info: (20260812 - Julian) 「本月通過轉正」數的是生效日落在本月的考核，
   * 不是清單上還看得到的人 —— 轉正生效後那個人就不在清單裡了，
   * 數 rows 的話這個數字會在生效當天自己歸零。
   */
  it("should count passes by effective month even after the row is gone", () => {
    const people = applyProbationOutcomes(
      [buildPerson()],
      outcomes({
        "emp-001": {
          result: ProbationResult.PASS,
          effectiveDate: "2026-08-01",
        },
      }),
      TODAY,
    );
    const rows = buildProbationRows(people, TODAY);
    expect(rows).toHaveLength(0);

    const metrics = buildProbationMetrics(
      rows,
      TODAY,
      outcomes({
        "emp-001": {
          result: ProbationResult.PASS,
          effectiveDate: "2026-08-01",
        },
      }),
    );
    expect(metrics.passedThisMonth).toBe(1);
  });

  it("should not count passes that take effect in another month", () => {
    const metrics = buildProbationMetrics(
      [],
      TODAY,
      outcomes({
        "emp-001": {
          result: ProbationResult.PASS,
          effectiveDate: "2026-07-23",
        },
        "emp-002": {
          result: ProbationResult.PASS,
          effectiveDate: "2026-09-01",
        },
      }),
    );
    expect(metrics.passedThisMonth).toBe(0);
  });

  // Info: (20260812 - Julian) 已送出考核的人不該再被催辦，不論結果是什麼
  it("should count only unreviewed overdue rows", () => {
    const rows = buildProbationRows(
      [buildPerson(), buildPerson({ id: "emp-002" })],
      TODAY,
    );
    const reviewed = rows.map((row, index) =>
      index === 0 ? { ...row, result: ProbationResult.EXTEND } : row,
    );
    expect(buildProbationMetrics(reviewed, TODAY).overdue).toBe(1);
  });
});
