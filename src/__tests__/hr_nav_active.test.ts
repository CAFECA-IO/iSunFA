import { describe, it, expect } from "@jest/globals";
import {
  activeHrNavKeyOf,
  HR_NAV_ITEMS,
} from "@/components/hr_management/hr_nav_items";
import { HR_MANAGEMENT_ROUTE } from "@/constants/hr_management";

/**
 * Info: (20260818 - Julian) 側邊選單的選中判定。
 *
 * ## 為什麼需要這一支
 *
 * 前一版是「儀表板比對全等、其餘一律 `startsWith`」，於是每多一層巢狀路由
 * 就多一組同時亮的項目：`/hr_management/attendance/presence` 讓「出勤打卡」
 * 與「現場狀態」一起亮，`/hr_management/leave/approval` 讓「我的請假」與
 * 「待我簽核」一起亮。
 *
 * 這是一個**看得見卻不會報錯**的退化 —— tsc、eslint、build 全綠，
 * 只有打開那一頁的人看得到。假勤是它第二次發生，所以在這裡釘住。
 *
 * ## 為什麼斷言的是「是哪一項」而不是「有沒有亮」
 *
 * 「該亮的有亮」對壞掉的那一版也成立 —— 它正是壞在多亮了一個。
 * 唯一性現在由型別給（`activeHrNavKeyOf` 回單一 key，側邊選單只比對它），
 * 所以測試要驗的是**挑中的是不是最深的那一項**。
 */

describe("activeHrNavKeyOf", () => {
  it("每一個選單項在自己的路徑上被選中", () => {
    for (const item of HR_NAV_ITEMS) {
      expect(activeHrNavKeyOf(item.href)).toBe(item.key);
    }
  });

  /**
   * Info: (20260818 - Julian) 這四條就是回報的災情本身。
   * 父項是子項的前綴，最長匹配必須落在子項上。
   */
  it.each([
    [HR_MANAGEMENT_ROUTE.ATTENDANCE_PRESENCE, "attendance_presence"],
    [HR_MANAGEMENT_ROUTE.ATTENDANCE_SCHEDULE, "attendance_schedule"],
    [HR_MANAGEMENT_ROUTE.ATTENDANCE_RESULT, "attendance_result"],
    [HR_MANAGEMENT_ROUTE.LEAVE_APPROVAL, "leave_approval"],
  ])("%s 選中子項而不是父項", (pathname, expected) => {
    expect(activeHrNavKeyOf(pathname)).toBe(expected);
  });

  /**
   * Info: (20260818 - Julian) 詳情頁沒有自己的選單項，落在帶它進來的列表上。
   * 這是刻意的行為，不是最長匹配的副作用 —— 換掉演算法時要保住它。
   */
  it("假單明細頁亮著「我的請假」", () => {
    expect(
      activeHrNavKeyOf(`${HR_MANAGEMENT_ROUTE.LEAVE}/request/abc-123`),
    ).toBe("leave");
  });

  /**
   * Info: (20260818 - Julian) 儀表板是所有頁的前綴，只有全等時才選中。
   * 這一條原本靠特判，現在靠「任何子頁都有更長的匹配」自然成立。
   */
  it("儀表板只在自己的路徑上選中", () => {
    expect(activeHrNavKeyOf(HR_MANAGEMENT_ROUTE.DASHBOARD)).toBe("dashboard");
    expect(activeHrNavKeyOf(HR_MANAGEMENT_ROUTE.EMPLOYEE)).toBe("employee");
  });

  /**
   * Info: (20260818 - Julian) 比對到路徑段為止：日後若出現 `/hr_management/leave_policy`，
   * 它不該被 `/hr_management/leave` 吃掉。裸的 `startsWith` 會。
   */
  it("同名前綴但不同路徑段不會被吃掉", () => {
    expect(activeHrNavKeyOf(`${HR_MANAGEMENT_ROUTE.LEAVE}_policy`)).not.toBe(
      "leave",
    );
  });

  it("人事模組以外的路徑不選中任何一項", () => {
    expect(activeHrNavKeyOf("/admin/settings")).toBeNull();
    expect(activeHrNavKeyOf("/")).toBeNull();
  });

  // Info: (20260818 - Julian) 回傳的 key 必須真的存在，否則側邊選單會全部不亮
  it("回傳的 key 一定是選單裡的項目", () => {
    const keys = HR_NAV_ITEMS.map((item) => item.key);
    const probes = [
      HR_MANAGEMENT_ROUTE.DASHBOARD,
      HR_MANAGEMENT_ROUTE.ATTENDANCE_PRESENCE,
      HR_MANAGEMENT_ROUTE.LEAVE_APPROVAL,
      `${HR_MANAGEMENT_ROUTE.LEAVE}/request/abc-123`,
    ];

    for (const probe of probes) {
      expect(keys).toContain(activeHrNavKeyOf(probe));
    }
  });
});
