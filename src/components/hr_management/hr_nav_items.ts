import {
  Building2,
  CalendarOff,
  ClipboardCheck,
  Clock4,
  FileText,
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  LucideIcon,
  MapPin,
  Radar,
  Repeat,
  Settings,
  Stamp,
  Users,
} from "lucide-react";
import { HR_MANAGEMENT_ROUTE } from "@/constants/hr_management";

export interface IHrNavItem {
  key: string;
  href: string;
  labelKey: string;
  icon: LucideIcon;
  disabled: boolean; // Info: (20260810 - Julian) 尚未開發的頁面先標記為 disabled
}

// Info: (20260810 - Julian) 側邊選單項目
export const HR_NAV_ITEMS: IHrNavItem[] = [
  {
    key: "dashboard",
    href: HR_MANAGEMENT_ROUTE.DASHBOARD,
    labelKey: "hr_management.nav.dashboard",
    icon: LayoutDashboard,
    disabled: false,
  },
  {
    key: "organization",
    href: HR_MANAGEMENT_ROUTE.ORGANIZATION,
    labelKey: "hr_management.nav.organization",
    icon: Building2,
    disabled: false,
  },
  {
    key: "employee",
    href: HR_MANAGEMENT_ROUTE.EMPLOYEE,
    labelKey: "hr_management.nav.employee",
    icon: Users,
    disabled: false,
  },
  {
    key: "movement",
    href: HR_MANAGEMENT_ROUTE.MOVEMENT,
    labelKey: "hr_management.nav.movement",
    icon: Repeat,
    disabled: false,
  },
  {
    key: "attendance",
    href: HR_MANAGEMENT_ROUTE.ATTENDANCE,
    labelKey: "hr_management.nav.attendance",
    icon: MapPin,
    disabled: false,
  },
  {
    key: "attendance_presence",
    href: HR_MANAGEMENT_ROUTE.ATTENDANCE_PRESENCE,
    labelKey: "hr_management.nav.attendance_presence",
    icon: Radar,
    disabled: false,
  },
  {
    key: "attendance_schedule",
    href: HR_MANAGEMENT_ROUTE.ATTENDANCE_SCHEDULE,
    labelKey: "hr_management.nav.attendance_schedule",
    icon: CalendarDays,
    disabled: false,
  },
  {
    key: "attendance_result",
    href: HR_MANAGEMENT_ROUTE.ATTENDANCE_RESULT,
    labelKey: "hr_management.nav.attendance_result",
    icon: ClipboardList,
    disabled: false,
  },
  {
    key: "leave",
    href: HR_MANAGEMENT_ROUTE.LEAVE,
    labelKey: "hr_management.nav.leave",
    icon: CalendarOff,
    disabled: false,
  },
  {
    key: "leave_approval",
    href: HR_MANAGEMENT_ROUTE.LEAVE_APPROVAL,
    labelKey: "hr_management.nav.leave_approval",
    icon: Stamp,
    disabled: false,
  },
  {
    key: "overtime",
    href: HR_MANAGEMENT_ROUTE.OVERTIME,
    labelKey: "hr_management.nav.overtime",
    icon: Clock4,
    disabled: false,
  },
  {
    key: "overtime_approval",
    href: HR_MANAGEMENT_ROUTE.OVERTIME_APPROVAL,
    labelKey: "hr_management.nav.overtime_approval",
    icon: ClipboardCheck,
    disabled: false,
  },
  {
    key: "document",
    href: HR_MANAGEMENT_ROUTE.DOCUMENT,
    labelKey: "hr_management.nav.document",
    icon: FileText,
    disabled: true,
  },
  {
    key: "setting",
    href: HR_MANAGEMENT_ROUTE.SETTING,
    labelKey: "hr_management.nav.setting",
    icon: Settings,
    disabled: true,
  },
];

/**
 * Info: (20260818 - Julian) 目前選中哪一項：**最長的那一個前綴，只有一項**。
 *
 * ## 為什麼不是每一項各自比對
 *
 * 前一版由側邊選單各自算 `pathname.startsWith(item.href)`，只有儀表板特判全等。
 * 那個寫法在巢狀路由上必然多亮：`/hr_management/attendance/presence` 會讓
 * 「出勤打卡」與「現場狀態」同時亮，`/hr_management/leave/approval` 會讓
 * 「我的請假」與「待我簽核」同時亮 —— 而每加一層子路由就會再犯一次。
 *
 * 選中是一個**全域**的決定（十二項裡挑一項），不是十二個各自獨立的布林值。
 * 寫成回傳單一 key，「同時亮兩項」在型別上就不再表示得出來。
 * 改成最長匹配之後儀表板也不必再特判：`/hr_management` 是所有頁的前綴，
 * 但任何子頁都存在更長的匹配。
 *
 * ## 為什麼比對到路徑段為止
 *
 * `href` 或 `href/…`，不是裸的 `startsWith` —— 否則日後出現
 * `/hr_management/leave_policy` 會被 `/hr_management/leave` 吃掉。
 *
 * 沒有自己選單項的頁面（如 `/hr_management/leave/request/:id`）會落在它的列表上，
 * 那是刻意的：詳情頁仍要亮著帶它進來的那一項。
 */
export const activeHrNavKeyOf = (pathname: string): string | null => {
  let matched: IHrNavItem | null = null;

  for (const item of HR_NAV_ITEMS) {
    const hit = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!hit) continue;
    if (matched === null || item.href.length > matched.href.length) {
      matched = item;
    }
  }

  return matched === null ? null : matched.key;
};
