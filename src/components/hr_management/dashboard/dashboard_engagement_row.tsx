"use client";

import { FC } from "react";
import { CakeSlice, PartyPopper, UserPlus } from "lucide-react";
import DashboardActionCard, {
  DashboardActionRow,
} from "@/components/hr_management/dashboard/dashboard_action_card";
import { DASHBOARD_LIST_LIMIT } from "@/constants/hr_management";
import { IEngagementItem } from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { useTranslation } from "@/i18n/i18n_context";

interface IDashboardEngagementRowProps {
  recentHires: IEngagementItem[];
  birthdays: IEngagementItem[];
  anniversaries: IEngagementItem[];
}

/**
 * Info: (20260810 - Julian) 區塊二下半：動態與關懷。
 *
 * 橫跨整個版面而不是塞在左欄，是因為這三張卡每列都很短，
 * 擠在半欄會讓右側圖表下方空一大塊，而它們本身也不需要那麼高。
 */
const DashboardEngagementRow: FC<IDashboardEngagementRowProps> = ({
  recentHires,
  birthdays,
  anniversaries,
}) => {
  const { t } = useTranslation();

  const renderRow = (item: IEngagementItem, trailingText: string) => (
    <DashboardActionRow
      key={item.employeeId}
      initials={getEmployeeInitials(item.employeeName)}
      title={item.employeeName}
      subtitle={`${item.departmentName ?? t("hr_management.value.none")}・${item.jobTitle ?? t("hr_management.value.none")}`}
      trailing={
        <span className="bg-brand-soft text-brand-on-soft rounded-full px-2 py-0.5 text-[11px] font-semibold">
          {trailingText}
        </span>
      }
    />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DashboardActionCard
        icon={UserPlus}
        iconClass="text-sky-500"
        title={t("hr_management.dashboard.card_new_hire")}
        total={recentHires.length}
        emptyText={t("hr_management.dashboard.empty_engagement")}
      >
        {recentHires
          .slice(0, DASHBOARD_LIST_LIMIT)
          .map((item) =>
            renderRow(
              item,
              t("hr_management.dashboard.hired_on", { date: item.eventDate }),
            ),
          )}
      </DashboardActionCard>

      <DashboardActionCard
        icon={CakeSlice}
        iconClass="text-pink-500"
        title={t("hr_management.dashboard.card_birthday")}
        total={birthdays.length}
        emptyText={t("hr_management.dashboard.empty_engagement")}
      >
        {birthdays.slice(0, DASHBOARD_LIST_LIMIT).map((item) =>
          renderRow(
            item,
            /**
             * Info: (20260812 - Julian) 壽星的 `eventDate` 本來就只有 `MM-DD`。
             *
             * 原本是拿完整生日再 `slice(5)` 切掉年份 —— 現在年份根本不會
             * 進到前端（ADR 018 §7：生日改帶 `birthMonthDay` 衍生值），
             * 再切一次會把月份也切掉。
             */
            t("hr_management.dashboard.birthday_on", {
              date: item.eventDate,
            }),
          ),
        )}
      </DashboardActionCard>

      <DashboardActionCard
        icon={PartyPopper}
        iconClass="text-violet-500"
        title={t("hr_management.dashboard.card_anniversary")}
        total={anniversaries.length}
        emptyText={t("hr_management.dashboard.empty_engagement")}
      >
        {anniversaries.slice(0, DASHBOARD_LIST_LIMIT).map((item) =>
          renderRow(
            item,
            t("hr_management.dashboard.anniversary_years", {
              years: item.anniversaryYears ?? 0,
            }),
          ),
        )}
      </DashboardActionCard>
    </div>
  );
};

export default DashboardEngagementRow;
