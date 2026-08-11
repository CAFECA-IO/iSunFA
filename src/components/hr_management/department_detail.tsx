"use client";

import { FC } from "react";
import { Building2, Pencil, UserRound } from "lucide-react";
import EmployeeStatusBadge from "@/components/hr_management/employee_status_badge";
import {
  IDepartmentTreeNode,
  IEmployeeListItem,
} from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { useTranslation } from "@/i18n/i18n_context";

interface IDepartmentDetailProps {
  department: IDepartmentTreeNode | null;
  parentName: string | null;
  members: IEmployeeListItem[];
}

// Info: (20260810 - Julian) 單一欄位的標籤與值，右側詳情裡重複五次
const DetailField: FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <p className="text-xs font-bold tracking-wider text-gray-400 uppercase">
      {label}
    </p>
    <p className="mt-1 text-sm font-medium text-gray-700">{value}</p>
  </div>
);

/**
 * Info: (20260810 - Julian) 右側部門詳情。
 *
 * 成員清單與「本部門人數」用同一份定義（不含離職者），
 * 否則使用者會看到人數 3 但只列出 2 個人，卻無從得知差在哪裡。
 */
const DepartmentDetail: FC<IDepartmentDetailProps> = ({
  department,
  parentName,
  members,
}) => {
  const { t } = useTranslation();

  if (!department) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
        <div>
          <Building2 className="mx-auto size-8 shrink-0 text-gray-300" />
          <p className="mt-3 text-sm text-gray-400">
            {t("hr_management.organization.detail_empty")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Building2 className="size-5 shrink-0 text-orange-500" />
            {department.name}
          </h2>
          {department.description && (
            <p className="mt-1 text-sm text-gray-500">
              {department.description}
            </p>
          )}
        </div>
        {/* ToDo: (20260810 - Julian) 部門編輯 API 完成後接上 Modal */}
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          <Pencil className="h-3.5 w-3.5 shrink-0" />
          {t("hr_management.organization.edit")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <DetailField
          label={t("hr_management.organization.detail_code")}
          value={department.code}
        />
        <DetailField
          label={t("hr_management.organization.detail_parent")}
          value={parentName ?? t("hr_management.organization.no_parent")}
        />
        <DetailField
          label={t("hr_management.organization.detail_manager")}
          value={
            department.managerName ?? t("hr_management.organization.no_manager")
          }
        />
        <DetailField
          label={t("hr_management.organization.detail_direct")}
          value={`${department.directHeadcount} ${t("hr_management.value.headcount_unit")}`}
        />
        <DetailField
          label={t("hr_management.organization.detail_total")}
          value={`${department.totalHeadcount} ${t("hr_management.value.headcount_unit")}`}
        />
        <DetailField
          label={t("hr_management.organization.detail_children")}
          value={`${department.children.length} ${t("hr_management.organization.unit_department")}`}
        />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-bold text-gray-700">
          {t("hr_management.organization.detail_members")}
        </h3>

        {members.length === 0 ? (
          <p className="mt-3 rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
            {t("hr_management.organization.member_empty")}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-gray-100">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
                  {getEmployeeInitials(member.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {member.name}
                    {member.id === department.managerId && (
                      <span className="bg-brand-soft text-brand-on-soft ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold">
                        <UserRound className="size-3 shrink-0" />
                        {t("hr_management.organization.detail_manager")}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {member.jobTitle ?? t("hr_management.value.none")}
                  </p>
                </div>
                <EmployeeStatusBadge status={member.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DepartmentDetail;
