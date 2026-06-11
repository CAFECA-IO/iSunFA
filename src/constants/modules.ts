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
  QrCode,
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
  Trophy,
  Computer,
  Tag,
  Database,
} from "lucide-react";

export const MODULES = [
  { key: "dashboard", icon: LayoutDashboard, basic: true },
  { key: "journal", icon: ScanLine, basic: true },
  { key: "voucher", icon: BookOpen, basic: true },
  { key: "esg", icon: Leaf, basic: true },
  { key: "financial_report", icon: FileText, basic: true },
  { key: "analysis", icon: PieChart, basic: true },
  { key: "pos", icon: Computer, basic: false },
  { key: "digital_product_passport", icon: QrCode, basic: true },
  { key: "signing", icon: FileSignature, basic: false },
  { key: "cashier", icon: Wallet, basic: false },
  { key: "tax", icon: Landmark, basic: false },
  { key: "salary", icon: Users, basic: false },
];

export const PUBLIC_MODULES = [
  { key: "analysis", icon: PieChart, basic: true, nav: true },
  { key: "ai_consultation_room", icon: Bot, basic: true, nav: true },
  { key: "digital_product_passport", icon: QrCode, basic: true, nav: true },
  { key: "salary_calculator", icon: Wallet, basic: true, nav: true },
  {
    key: "transportation_carbon_footprint_calculator",
    icon: Truck,
    basic: true,
    nav: true,
  },
  { key: "coupon", icon: Tag, basic: true, nav: false },
  { key: "business_monitor", icon: Tag, basic: true, nav: true },
  { key: "document_simulation", icon: FileText, basic: true, nav: true },
];

export const ADMIN_MODULES = [
  { key: "dashboard", icon: LayoutDashboard, basic: true },
  { key: "mission_board", icon: Target, basic: true },
  { key: "order_management", icon: BadgeCheck, basic: true },
  { key: "blockchain", icon: Blocks, basic: true },
  { key: "user", icon: Users, basic: true },
  { key: "billing", icon: CreditCard, basic: true },
  { key: "campaign", icon: Trophy, basic: true },
  { key: "coupon", icon: Tag, basic: true },
  { key: "pdf_tool", icon: FileText, basic: true },
  { key: "carbon_emission_database", icon: Database, basic: true },
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
    case "pos":
      return "features.items.pos.title";
    case "tax":
      return "features.items.tax.title";
    case "signing":
      return "features.items.signing.title";
    case "digital_product_passport":
      return "features.items.digital_product_passport.title";
    case "campaign":
      return "admin_campaign.title";
    case "coupon":
      return isAdminContext ? "admin_coupon.title" : "user_coupon.title";
    case "pdf_tool":
      return "common.pdf_tool";
    case "carbon_emission_database":
      return "admin_carbon_emission_database.title";
    default:
      return `${key}.title`;
  }
}
