"use client";

import { FC } from "react";
import Link from "next/link";
import { CalendarCheck, ClipboardList, LogOut, Users } from "lucide-react";
import { HR_MANAGEMENT_ROUTE } from "@/constants/hr_management";
import { IDashboardKpi } from "@/interfaces/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IDashboardKpiCardsProps {
  kpi: IDashboardKpi;
}

interface IKpiCardProps {
  icon: typeof Users;
  iconClass: string;
  label: string;
  value: number;
  unit: string;
  hint: string;
  href: string | null;
}

const CARD_CLASS =
  "flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors";

// Info: (20260810 - Julian) 卡片內容抽出來，讓「可跳轉」與「不可跳轉」共用同一份版面
const KpiCardInner: FC<Omit<IKpiCardProps, "href">> = ({
  icon: Icon,
  iconClass,
  label,
  value,
  unit,
  hint,
}) => (
  <>
    <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-400 uppercase">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />
      {label}
    </p>
    <p className="mt-2 flex items-baseline gap-1">
      <span className="text-3xl font-bold text-gray-800">{value}</span>
      <span className="text-xs text-gray-400">{unit}</span>
    </p>
    <p className="mt-1 text-xs text-gray-400">{hint}</p>
  </>
);

const KpiCard: FC<IKpiCardProps> = ({ href, ...rest }) => {
  if (!href) {
    // ToDo: (20260810 - Julian) 到離職頁完成後改為 Link 導向該頁的待辦清單
    return (
      <div className={CARD_CLASS}>
        <KpiCardInner {...rest} />
      </div>
    );
  }

  return (
    <Link href={href} className={`${CARD_CLASS} hover:border-orange-300`}>
      <KpiCardInner {...rest} />
    </Link>
  );
};

/**
 * Info: (20260810 - Julian) 區塊一：四張 KPI 卡。
 *
 * 每張都標了副標，因為單一個數字沒有基準就無法判讀 ——
 * 「本月離職 4」要配上離職率才知道是不是異常。
 */
const DashboardKpiCards: FC<IDashboardKpiCardsProps> = ({ kpi }) => {
  const { t } = useTranslation();

  const cards: (IKpiCardProps & { key: string })[] = [
    {
      key: "headcount",
      icon: Users,
      iconClass: "text-orange-500",
      label: t("hr_management.dashboard.kpi_headcount"),
      value: kpi.headcount,
      unit: t("hr_management.value.headcount_unit"),
      hint: t("hr_management.dashboard.kpi_headcount_hint", {
        active: kpi.activeCount,
        probation: kpi.probationCount,
      }),
      href: HR_MANAGEMENT_ROUTE.EMPLOYEE,
    },
    {
      key: "hired",
      icon: CalendarCheck,
      iconClass: "text-emerald-500",
      label: t("hr_management.dashboard.kpi_hired"),
      value: kpi.hiredThisMonth,
      unit: t("hr_management.value.headcount_unit"),
      hint: t("hr_management.dashboard.card_new_hire"),
      href: HR_MANAGEMENT_ROUTE.EMPLOYEE,
    },
    {
      key: "resigned",
      icon: LogOut,
      iconClass: "text-rose-500",
      label: t("hr_management.dashboard.kpi_resigned"),
      value: kpi.resignedThisMonth,
      unit: t("hr_management.value.headcount_unit"),
      hint: t("hr_management.dashboard.kpi_turnover", {
        rate: kpi.turnoverRate,
      }),
      href: HR_MANAGEMENT_ROUTE.EMPLOYEE,
    },
    {
      key: "pending",
      icon: ClipboardList,
      iconClass: "text-indigo-500",
      label: t("hr_management.dashboard.kpi_pending"),
      value: kpi.pendingTaskCount,
      unit: t("hr_management.dashboard.unit_case"),
      hint: t("hr_management.dashboard.kpi_pending_hint"),
      href: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ key, ...card }) => (
        <KpiCard key={key} {...card} />
      ))}
    </div>
  );
};

export default DashboardKpiCards;
