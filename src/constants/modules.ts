import {
  BookOpen,
  Sliders,
  Wallet,
  PieChart,
  Landmark,
  Users,
  FileText,
  FileSignature
} from 'lucide-react';

export const MODULES = [
  { key: 'bookkeeping', icon: BookOpen, optional: false },
  { key: 'adjustment', icon: Sliders, optional: true },
  { key: 'cashier', icon: Wallet, optional: true },
  { key: 'analysis', icon: PieChart, optional: true },
  { key: 'tax', icon: Landmark, optional: true },
  { key: 'salary', icon: Users, optional: true },
  { key: 'financial_report', icon: FileText, optional: false },
  { key: 'signing', icon: FileSignature, optional: true },
];
