import {
  BookOpen,
  Sliders,
  Wallet,
  PieChart,
  Landmark,
  Users,
  FileText,
  FileSignature,
  ScanLine,
  Network,
  Leaf,
  BadgeCheck
} from 'lucide-react';

export const MODULES = [
  { key: 'ocr', icon: ScanLine, basic: true },
  { key: 'bookkeeping', icon: BookOpen, basic: true },
  { key: 'esg', icon: Leaf, basic: true },
  { key: 'financial_report', icon: FileText, basic: true },
  { key: 'adjustment', icon: Sliders, basic: false },
  { key: 'cashier', icon: Wallet, basic: false },
  { key: 'analysis', icon: PieChart, basic: false },
  { key: 'tax', icon: Landmark, basic: false },
  { key: 'salary', icon: Users, basic: false },
  { key: 'signing', icon: FileSignature, basic: false },
  { key: 'integration', icon: Network, basic: false },
  { key: 'audit', icon: BadgeCheck, basic: false },
];
