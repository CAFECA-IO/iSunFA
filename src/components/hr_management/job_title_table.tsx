"use client";

import { FC, useMemo } from "react";
import { Users } from "lucide-react";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import { IJobTitleListItem } from "@/interfaces/hr_management";
import { useTranslation } from "@/i18n/i18n_context";

interface IJobTitleTableProps {
  jobTitles: IJobTitleListItem[];
}

// Info: (20260810 - Julian) 職稱職等表。清單已在 buildJobTitleList 依職等由高至低排序
const JobTitleTable: FC<IJobTitleTableProps> = ({ jobTitles }) => {
  const { t } = useTranslation();

  const columns = useMemo<IDataTableColumn<IJobTitleListItem>[]>(
    () => [
      {
        key: "code",
        label: t("hr_management.organization.job_title_code"),
        render: (jobTitle) => (
          <span className="font-mono text-xs text-gray-400">
            {jobTitle.code}
          </span>
        ),
      },
      {
        key: "title",
        label: t("hr_management.organization.job_title_name"),
        render: (jobTitle) => (
          <span className="font-semibold text-gray-800">{jobTitle.title}</span>
        ),
      },
      {
        key: "level",
        label: t("hr_management.organization.job_title_level"),
        render: (jobTitle) => (
          <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600">
            {t("hr_management.organization.level_badge", {
              level: jobTitle.level,
            })}
          </span>
        ),
      },
      {
        key: "headcount",
        label: t("hr_management.organization.job_title_headcount"),
        render: (jobTitle) => (
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {jobTitle.headcount}
            {t("hr_management.value.headcount_unit")}
          </span>
        ),
      },
      {
        key: "description",
        label: t("hr_management.organization.job_title_description"),
        render: (jobTitle) => (
          <span className="text-sm text-gray-500">
            {jobTitle.description ?? t("hr_management.value.none")}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <DataTable<IJobTitleListItem>
      columns={columns}
      data={jobTitles}
      rowKey={(jobTitle) => jobTitle.id}
      emptyStateText={t("hr_management.organization.job_title_empty")}
    />
  );
};

export default JobTitleTable;
