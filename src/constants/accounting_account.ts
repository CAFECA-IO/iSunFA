import { AccountType } from "@/constants/enums";

// Info: (20260706 - Julian) 定義不同科目類別的顏色，用於 Account Management Page
export const ACCOUNT_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; border: string; tab?: string }
> = {
  [AccountType.ASSET]: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    tab: "bg-emerald-500",
  },
  [AccountType.LIABILITY]: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    tab: "bg-rose-500",
  },
  [AccountType.EQUITY]: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    tab: "bg-blue-500",
  },
  [AccountType.REVENUE]: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    tab: "bg-amber-500",
  },
  [AccountType.INCOME]: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    tab: "bg-teal-500",
  },
  [AccountType.EXPENSE]: {
    bg: "bg-lime-50",
    text: "text-lime-700",
    border: "border-lime-200",
    tab: "bg-lime-500",
  },
  [AccountType.COST]: {
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
    tab: "bg-pink-500",
  },
  [AccountType.GAIN_OR_LOSS]: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    tab: "bg-violet-500",
  },
  [AccountType.CASH_FLOW]: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    tab: "bg-cyan-500",
  },
  [AccountType.OTHER_COMPREHENSIVE_INCOME]: {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    border: "border-fuchsia-200",
    tab: "bg-fuchsia-500",
  },
  [AccountType.OTHER]: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    tab: "bg-slate-500",
  },
};
