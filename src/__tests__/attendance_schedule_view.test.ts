import { describe, it, expect } from "@jest/globals";
import { ShiftPatternKind, WorkDayType } from "@/constants/attendance";
import {
  applyCellUpdate,
  buildShiftLabels,
  buildShiftStyles,
  filterScheduleRows,
  resolveScheduleCellStyle,
  scheduleDepartmentOptions,
} from "@/lib/utils/attendance_schedule_view";
import { isoWeekday } from "@/lib/utils/attendance_format";
import {
  IScheduleDayCell,
  IScheduleRow,
  IShiftPatternSummary,
} from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 排班月曆的顯示邏輯。
 *
 * 最值得守的一條是**簡稱的唯一性**：資料裡沒有「一個字的班別代號」這一欄，
 * 而任何從名稱切出來的簡稱都可能碰撞。碰撞的症狀是
 * 「排班表看起來完全正常，只是有兩欄的意思是反的」——
 * 在 demo 的四個班別下不會發生，在客戶的八個班別下一定會。
 */

const pattern = (
  id: string,
  code: string,
  name: string,
): IShiftPatternSummary => ({
  id,
  code,
  name,
  kind: ShiftPatternKind.FIXED,
  window: {
    windowStartMinute: 450,
    windowEndMinute: 1020,
    coreStartMinute: 450,
    coreEndMinute: 1020,
    requiredWorkMinutes: 480,
    breakMinutes: 60,
  },
});

const cell = (overrides: Partial<IScheduleDayCell>): IScheduleDayCell => ({
  workDate: "2026-08-12",
  dayType: WorkDayType.WORK,
  shiftPatternId: "p1",
  shiftCode: "SITE-DAY",
  shiftName: "工地日班",
  shiftKind: ShiftPatternKind.FIXED,
  ...overrides,
});

const row = (overrides: Partial<IScheduleRow>): IScheduleRow => ({
  employeeId: "emp-2",
  employeeNo: "EMP002",
  name: "王小明",
  departmentId: "dept-1",
  departmentName: "第一工務所",
  jobTitle: "工地工程師",
  days: [cell({})],
  ...overrides,
});

describe("attendance_schedule_view", () => {
  describe("班別簡稱", () => {
    it("名稱首字互不相同時就用一個字", () => {
      const labels = buildShiftLabels([
        pattern("p1", "SITE-DAY", "工地日班"),
        pattern("p2", "SITE-NIGHT", "夜間施工班"),
        pattern("p3", "OFFICE", "本部行政班"),
      ]);

      expect([...labels.values()]).toEqual(["工", "夜", "本"]);
    });

    it("首字碰撞時整體升到兩個字，不是只加長碰撞的那幾個", () => {
      /**
       * Info: (20260813 - Julian)「工地日班」與「工程師彈性班」首字都是「工」。
       * 只把碰撞的那兩個加長，表上就會出現一個字與兩個字並存，
       * 而讀的人會以為那個長度有意義。
       */
      const labels = buildShiftLabels([
        pattern("p1", "SITE-DAY", "工地日班"),
        pattern("p2", "ENG-FLEX", "工程師彈性班"),
        pattern("p3", "OFFICE", "本部行政班"),
      ]);

      expect([...labels.values()]).toEqual(["工地", "工程", "本部"]);
    });

    it("兩個字仍碰撞時退回 code —— 那有資料庫的唯一鍵保證", () => {
      const labels = buildShiftLabels([
        pattern("p1", "SITE-A", "工地日班甲"),
        pattern("p2", "SITE-B", "工地日班乙"),
      ]);

      expect([...labels.values()]).toEqual(["SITE-A", "SITE-B"]);
    });

    it("任何情況下產生的簡稱都互不相同", () => {
      const patterns = [
        pattern("p1", "A", "早班"),
        pattern("p2", "B", "早班加強"),
        pattern("p3", "C", "晚班"),
        pattern("p4", "D", "晚班加強"),
      ];
      const labels = [...buildShiftLabels(patterns).values()];
      expect(new Set(labels).size).toBe(labels.length);
    });

    it("班別清單為空時不炸", () => {
      expect(buildShiftLabels([]).size).toBe(0);
    });
  });

  describe("配色", () => {
    it("依清單順序取用，因此同一本帳本每次都拿到同一個顏色", () => {
      const patterns = [pattern("p1", "A", "早"), pattern("p2", "B", "晚")];
      const first = buildShiftStyles(patterns);
      const second = buildShiftStyles(patterns);
      expect(first.get("p1")).toBe(second.get("p1"));
      expect(first.get("p1")).not.toBe(first.get("p2"));
    });

    it("無排班與休假是兩種顏色 —— 前者是還沒排，後者是明確不用上班", () => {
      const styles = buildShiftStyles([pattern("p1", "A", "早")]);

      const unscheduled = resolveScheduleCellStyle(
        cell({ dayType: null, shiftPatternId: null, shiftName: null }),
        styles,
      );
      const off = resolveScheduleCellStyle(
        cell({
          dayType: WorkDayType.REGULAR_OFF,
          shiftPatternId: null,
          shiftName: null,
        }),
        styles,
      );

      expect(unscheduled).not.toBe(off);
      expect(unscheduled).toContain("transparent");
    });

    it("上班日取該班別的顏色", () => {
      const styles = buildShiftStyles([pattern("p1", "A", "早")]);
      expect(resolveScheduleCellStyle(cell({}), styles)).toBe(styles.get("p1"));
    });
  });

  describe("部門選項與篩選", () => {
    const rows = [
      row({
        employeeId: "a",
        departmentId: "d2",
        departmentName: "第二工務所",
      }),
      row({ employeeId: "b", departmentId: "d1", departmentName: "本部" }),
      row({ employeeId: "c", departmentId: "d1", departmentName: "本部" }),
      row({ employeeId: "d", departmentId: null, departmentName: null }),
    ];

    it("選項取自資料本身且去重", () => {
      expect(scheduleDepartmentOptions(rows)).toEqual([
        { id: "d1", name: "本部" },
        { id: "d2", name: "第二工務所" },
      ]);
    });

    it("未指定部門時不篩掉任何人，包含沒有部門的", () => {
      expect(filterScheduleRows(rows, null)).toHaveLength(4);
    });

    it("指定部門只留該部門", () => {
      expect(
        filterScheduleRows(rows, "d1").map((item) => item.employeeId),
      ).toEqual(["b", "c"]);
    });
  });

  describe("改完只換那一格", () => {
    const rows = [
      row({
        employeeId: "emp-2",
        days: [
          cell({ workDate: "2026-08-11" }),
          cell({ workDate: "2026-08-12" }),
        ],
      }),
      row({ employeeId: "emp-5", days: [cell({ workDate: "2026-08-11" })] }),
    ];

    it("只有指定的那一格改變", () => {
      const updated = applyCellUpdate(
        rows,
        "emp-2",
        cell({
          workDate: "2026-08-12",
          dayType: WorkDayType.REGULAR_OFF,
          shiftPatternId: null,
          shiftName: null,
        }),
      );

      expect(updated[0].days[0].dayType).toBe(WorkDayType.WORK);
      expect(updated[0].days[1].dayType).toBe(WorkDayType.REGULAR_OFF);
      expect(updated[1].days[0].dayType).toBe(WorkDayType.WORK);
    });

    it("回傳新陣列，否則 React 靠參考比對會認為沒變", () => {
      const updated = applyCellUpdate(rows, "emp-2", cell({}));
      expect(updated).not.toBe(rows);
      expect(updated[0]).not.toBe(rows[0]);
      // Info: (20260813 - Julian) 沒被改到的列可以沿用同一個參考，省下重繪
      expect(updated[1]).toBe(rows[1]);
    });
  });

  describe("星期以 UTC 解析", () => {
    it("2026-08-13 是星期四", () => {
      expect(isoWeekday("2026-08-13")).toBe(4);
    });

    it("週六與週日算得出來 —— 排班表要一眼看出週末", () => {
      expect(isoWeekday("2026-08-15")).toBe(6);
      expect(isoWeekday("2026-08-16")).toBe(0);
    });
  });
});
