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
  { key: 'bookkeeping', icon: BookOpen, optional: false },
  { key: 'financial_report', icon: FileText, optional: false },
  { key: 'adjustment', icon: Sliders, optional: true },
  { key: 'cashier', icon: Wallet, optional: true },
  { key: 'analysis', icon: PieChart, optional: true },
  { key: 'tax', icon: Landmark, optional: true },
  { key: 'salary', icon: Users, optional: true },
  { key: 'signing', icon: FileSignature, optional: true },
  { key: 'ocr', icon: ScanLine, optional: true },
  { key: 'integration', icon: Network, optional: true },
  { key: 'esg', icon: Leaf, optional: true },
  { key: 'audit', icon: BadgeCheck, optional: true },
];
