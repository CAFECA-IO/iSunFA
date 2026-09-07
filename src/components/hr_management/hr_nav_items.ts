import {
  Building2,
  CalendarOff,
  ClipboardCheck,
  ClipboardList,
  Clock4,
  CalendarDays,
  FileText,
  LayoutDashboard,
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

/**
 * Info: (20260818 - Julian) 側邊選單的分組：項目長到 14 個之後，分組把掃描範圍
 * 從 14 個縮到 4 個群組標題。
 *
 * 群組直接持有項目，而不是持有 key 再去查表 —— 查表版會有兩種漂移：群組裡列了
 * 不存在的 key（渲染出空白），或某項不屬於任何群組（一整頁從選單上消失），
 * **兩者都不會報錯**。讓扁平清單由分組推導，這兩種狀態在型別上就表示不出來。
 */
export interface IHrNavSection {
  key: string;
  /** Info: (20260818 - Julian) null 表不分組 —— 項目直接列出，沒有標題 */
  labelKey: string | null;
  items: IHrNavItem[];
}

export const HR_NAV_SECTIONS: IHrNavSection[] = [
  {
    // Info: (20260818 - Julian) 儀表板是模組首頁，收進群組會讓「回到總覽」變成要先找群組
    key: "overview",
    labelKey: null,
    items: [
      {
        key: "dashboard",
        href: HR_MANAGEMENT_ROUTE.DASHBOARD,
        labelKey: "hr_management.nav.dashboard",
        icon: LayoutDashboard,
        disabled: false,
      },
    ],
  },
  {
    key: "people",
    labelKey: "hr_management.nav_group.people",
    items: [
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
        key: "document",
        href: HR_MANAGEMENT_ROUTE.DOCUMENT,
        labelKey: "hr_management.nav.document",
        icon: FileText,
        disabled: true,
      },
    ],
  },
  {
    key: "attendance",
    labelKey: "hr_management.nav_group.attendance",
    items: [
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
    ],
  },
  {
    key: "leave",
    labelKey: "hr_management.nav_group.leave",
    items: [
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
    ],
  },
  {
    // Info: (20260818 - Julian) 系統設定不分組：它不屬於任何一個業務領域
    key: "system",
    labelKey: null,
    items: [
      {
        key: "setting",
        href: HR_MANAGEMENT_ROUTE.SETTING,
        labelKey: "hr_management.nav.setting",
        icon: Settings,
        disabled: true,
      },
    ],
  },
];

/**
 * Info: (20260818 - Julian) 扁平清單由分組推導，不是另外維護的第二份 ——
 * 兩份清單會有一天對不起來，而症狀是某一頁的選單項永遠不亮。
 */
export const HR_NAV_ITEMS: IHrNavItem[] = HR_NAV_SECTIONS.flatMap(
  (section) => section.items,
);

/**
 * Info: (20260818 - Julian) 目前選中哪一項：**最長的那一個前綴，只有一項**。
 *
 * 逐項各自算 `startsWith(item.href)` 在巢狀路由上必然多亮 ——
 * `/hr_management/attendance/presence` 會讓「出勤打卡」與「現場狀態」同時亮。
 * 選中是一個全域的決定（十四項裡挑一項），回傳單一 key 讓「同時亮兩項」
 * 表示不出來；改成最長匹配後儀表板也不必再特判全等。
 *
 * 比對到路徑段為止（`href` 或 `href/…`，不是裸的 `startsWith`），否則日後出現
 * `/hr_management/leave_policy` 會被 `/hr_management/leave` 吃掉。沒有自己選單項
 * 的頁面（如請假明細）會落在它的列表上，那是刻意的。
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
