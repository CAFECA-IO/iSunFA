import { describe, it, expect } from "@jest/globals";
import { calculateTenure, getEmployeeInitials } from "@/lib/utils/hr_employee";
import { parseIsoDate } from "@/lib/utils/hr_date";
import { EmployeeStatus, Gender } from "@/constants/hr_management";
import { IEmployeeListItem } from "@/interfaces/hr_management";

/**
 * Info: (20260811 - Julian) 檔名帶 `.tz`：由 `scripts/jest_tz.mjs` 固定在
 * America/New_York 執行（見該檔說明）。
 *
 * `calculateTenure` 原本用 `new Date(employee.hireDate)` 解析 "YYYY-MM-DD"，
 * 會被當成 UTC 午夜，在 UTC 以西的時區退一天 —— 而年資計算完全建立在
 * `getMonth()` / `getDate()` 上。這個 bug 在台灣跑測試永遠不會現形，
 * 所以這支測試必須跑在西半球時區才有意義。
 */
const buildEmployee = (
  hireDate: string,
  leaveDate: string | null = null,
): IEmployeeListItem => ({
  id: "emp-1",
  employeeNo: "EMP001",
  name: "王小明",
  englishName: null,
  gender: Gender.MALE,
  email: "ming@example.com",
  maskedPhone: "*******678",
  birthMonthDay: null,
  age: null,
  status: leaveDate ? EmployeeStatus.RESIGNED : EmployeeStatus.ACTIVE,
  hireDate,
  leaveDate,
  departmentId: null,
  departmentName: null,
  jobTitleId: null,
  jobTitle: null,
  managerName: null,
});

describe("calculateTenure", () => {
  /**
   * Info: (20260811 - Julian) 回歸測試：修正前這一組在台北算 2y11m、在紐約算 3y0m。
   * 先釘住「原生解析在此時區確實退一天」，再確認年資不受它影響 ——
   * 只斷言 2y11m 的話，看不出這條測試在防什麼。
   */
  it("should not shift the hire date when the runtime is west of UTC", () => {
    expect(new Date("2024-01-01").getDate()).toBe(31);
    expect(new Date("2024-01-01").getMonth()).toBe(11);

    expect(
      calculateTenure(buildEmployee("2024-01-01"), parseIsoDate("2026-12-31")),
    ).toEqual({ years: 2, months: 11 });
  });

  // Info: (20260811 - Julian) 同一組到職日／基準日在月初也不該漂移
  it("should stay stable across a month boundary", () => {
    expect(
      calculateTenure(buildEmployee("2024-01-02"), parseIsoDate("2026-01-01")),
    ).toEqual({ years: 1, months: 11 });
  });

  it("should count exact anniversaries", () => {
    expect(
      calculateTenure(buildEmployee("2025-08-10"), parseIsoDate("2026-08-10")),
    ).toEqual({ years: 1, months: 0 });
  });

  // Info: (20260811 - Julian) 當月日數還沒到到職日那天，該月不算滿
  it("should not count a partial month", () => {
    expect(
      calculateTenure(buildEmployee("2025-08-10"), parseIsoDate("2026-08-09")),
    ).toEqual({ years: 0, months: 11 });
  });

  it("should return zero for the hire date itself", () => {
    expect(
      calculateTenure(buildEmployee("2026-08-10"), parseIsoDate("2026-08-10")),
    ).toEqual({ years: 0, months: 0 });
  });

  // Info: (20260811 - Julian) 基準日早於到職日（預先建檔的新人）不該回負數
  it("should clamp a future hire date to zero", () => {
    expect(
      calculateTenure(buildEmployee("2026-12-01"), parseIsoDate("2026-08-10")),
    ).toEqual({ years: 0, months: 0 });
  });

  /**
   * Info: (20260811 - Julian) 離職者以離職日為終點，基準日往後推也不該讓年資繼續長。
   * 這是離職者年資顯示的核心 —— 算錯會讓已離職的人在報表上持續累積年資。
   */
  it("should freeze tenure at the leave date", () => {
    const resigned = buildEmployee("2024-01-15", "2025-07-15");
    expect(calculateTenure(resigned, parseIsoDate("2026-08-10"))).toEqual({
      years: 1,
      months: 6,
    });
    expect(calculateTenure(resigned, parseIsoDate("2030-01-01"))).toEqual({
      years: 1,
      months: 6,
    });
  });

  it("should handle a month-end hire date", () => {
    expect(
      calculateTenure(buildEmployee("2025-01-31"), parseIsoDate("2025-02-28")),
    ).toEqual({ years: 0, months: 0 });
    expect(
      calculateTenure(buildEmployee("2025-01-31"), parseIsoDate("2025-03-31")),
    ).toEqual({ years: 0, months: 2 });
  });
});

describe("getEmployeeInitials", () => {
  // Info: (20260811 - Julian) 註解的主張：slice(0, 2) 會讓「陳」開頭的同事看起來一模一樣
  it("should take the last two characters of a Chinese name", () => {
    expect(getEmployeeInitials("王小明")).toBe("小明");
    expect(getEmployeeInitials("陳大文")).toBe("大文");
    expect(getEmployeeInitials("陳大華")).not.toBe(
      getEmployeeInitials("陳大文"),
    );
  });

  it("should take initials from a Latin name", () => {
    expect(getEmployeeInitials("John Smith")).toBe("JS");
    expect(getEmployeeInitials("john smith")).toBe("JS");
  });

  // Info: (20260811 - Julian) 三個字以上只取前兩個，避免頭像塞不下
  it("should use only the first two parts of a long Latin name", () => {
    expect(getEmployeeInitials("John Ronald Reuel Tolkien")).toBe("JR");
  });

  it("should handle a single-part name in both scripts", () => {
    expect(getEmployeeInitials("Madonna")).toBe("M");
    expect(getEmployeeInitials("陳")).toBe("陳");
  });

  it("should trim surrounding whitespace and tolerate an empty name", () => {
    expect(getEmployeeInitials("  John Smith  ")).toBe("JS");
    expect(getEmployeeInitials("   ")).toBe("");
    expect(getEmployeeInitials("")).toBe("");
  });

  // Info: (20260811 - Julian) 中英混名不是 pure ASCII，走中文分支取後兩字
  it("should treat a mixed-script name as non-Latin", () => {
    expect(getEmployeeInitials("王小明 Ming")).toBe("ng");
  });
});
