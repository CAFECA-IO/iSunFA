import {
  BookOpen,
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
} from 'lucide-react';

export const MODULES = [
  { key: 'dashboard', icon: LayoutDashboard, basic: true },
  { key: 'journal', icon: ScanLine, basic: true },
  { key: 'voucher', icon: BookOpen, basic: true },
  { key: 'esg', icon: Leaf, basic: true },
  { key: 'financial_report', icon: FileText, basic: true },
  { key: 'analysis', icon: PieChart, basic: true },
  { key: 'signing', icon: FileSignature, basic: true },
  { key: 'cashier', icon: Wallet, basic: false },
  { key: 'tax', icon: Landmark, basic: false },
  { key: 'salary', icon: Users, basic: false },
  { key: 'integration', icon: Network, basic: false },
  { key: 'audit', icon: BadgeCheck, basic: false },
];
