import {
  BookOpen,
  Blocks,
  Wallet,
  PieChart,
  Landmark,
  Users,
  FileText,
  FileSignature,
  ScanLine,
  Network,
  Leaf,
  BadgeCheck,
  LayoutDashboard,
  Library,
  CreditCard,
  Settings,
  LogOut,
  Target,
  Bot,
  Truck,
} from "lucide-react";

export const MODULES = [
  { key: "dashboard", icon: LayoutDashboard, basic: true },
  { key: "journal", icon: ScanLine, basic: true },
  { key: "voucher", icon: BookOpen, basic: true },
  { key: "esg", icon: Leaf, basic: true },
  { key: "financial_report", icon: FileText, basic: true },
  { key: "analysis", icon: PieChart, basic: false },
  { key: "signing", icon: FileSignature, basic: false },
  { key: "cashier", icon: Wallet, basic: false },
  { key: "tax", icon: Landmark, basic: false },
  { key: "salary", icon: Users, basic: false },
  { key: "integration", icon: Network, basic: false },
  { key: "audit", icon: BadgeCheck, basic: false },
];

export const PUBLIC_MODULES = [
  { key: "analysis", icon: PieChart, basic: true },
  { key: "ai_consultation_room", icon: Bot, basic: true },
  { key: "salary_calculator", icon: Wallet, basic: true },
  {
    key: "transportation_carbon_footprint_calculator",
    icon: Truck,
    basic: true,
  },
];

export const ADMIN_MODULES = [
  { key: "dashboard", icon: LayoutDashboard, basic: true },
  { key: "mission_board", icon: Target, basic: true },
  { key: "order_management", icon: BadgeCheck, basic: true },
  { key: "blockchain", icon: Blocks, basic: true },
  { key: "user", icon: Users, basic: true },
  { key: "billing", icon: CreditCard, basic: true },
];

export const SYSTEM_MODULES = [
  {
    id: "account_book",
    icon: Library,
    href: "/user/account_book",
    labelKey: "sidebar.account_book",
    enable: true,
  },
  {
    id: "team",
    icon: Users,
    href: "/user/team",
    labelKey: "sidebar.team",
    enable: true,
  },
  {
    id: "billing",
    icon: CreditCard,
    href: "/user/billing",
    labelKey: "sidebar.billing",
    enable: true,
  },
  {
    id: "settings",
    icon: Settings,
    href: "/user/settings",
    labelKey: "sidebar.settings",
    enable: false,
  },
  {
    id: "logout",
    icon: LogOut,
    action: "logout",
    labelKey: "header.logout",
    isDestructive: true,
    enable: true,
  },
];

export function getModuleI18nKey(key: string, isAdminContext: boolean = false) {
  switch (key) {
    case "dashboard":
      return "dashboard.title";
    case "voucher":
      return "voucher.title";
    case "esg":
      return "esg.title";
    case "journal":
      return "journal.title";
    case "analysis":
      return "analysis.title";
    case "billing":
      return isAdminContext ? "admin_billing.page.title" : "billing.title";
    case "user":
      return "admin_member.page.title";
    case "blockchain":
      return "admin_blockchain.page.title";
    case "mission_board":
      return "admin_mission_board.page.title";
    case "financial_report":
      return "report_view.title";
    case "other":
      return "common.other";
    case "cashier":
      return "features.items.cashier.title";
    case "salary":
      return "features.items.salary.title";
    case "audit":
      return "features.items.audit.title";
    case "tax":
      return "features.items.tax.title";
    case "signing":
      return "features.items.signing.title";
    case "integration":
      return "features.items.integration.title";
    default:
      return `${key}.title`;
  }
}
