import {
  Building2,
  FileText,
  LayoutDashboard,
  ClipboardList,
  LucideIcon,
  MapPin,
  Repeat,
  Settings,
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
    key: "attendance_result",
    href: HR_MANAGEMENT_ROUTE.ATTENDANCE_RESULT,
    labelKey: "hr_management.nav.attendance_result",
    icon: ClipboardList,
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
