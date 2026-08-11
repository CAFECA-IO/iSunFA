"use client";

import { FC, useMemo, useState } from "react";
import { Building2, IdCard, Layers, Network, Plus, Users } from "lucide-react";
import DepartmentDetail from "@/components/hr_management/department_detail";
import DepartmentOrgChart from "@/components/hr_management/department_org_chart";
import DepartmentTree from "@/components/hr_management/department_tree";
import JobTitleTable from "@/components/hr_management/job_title_table";
import {
  ORGANIZATION_TAB_I18N_KEY,
  ORGANIZATION_TABS,
  ORGANIZATION_VIEW_MODE_I18N_KEY,
  ORGANIZATION_VIEW_MODES,
  OrganizationTab,
  OrganizationViewMode,
} from "@/constants/hr_management";
import { MOCK_HR_EMPLOYEES } from "@/constants/mock_hr_employees";
import {
  MOCK_HR_DEPARTMENTS,
  MOCK_HR_JOB_TITLES,
} from "@/constants/mock_hr_organization";
import {
  buildDepartmentTree,
  buildJobTitleList,
  findDepartmentNode,
  flattenDepartmentTree,
  isHeadcountEmployee,
} from "@/lib/utils/hr_organization";
import { useTranslation } from "@/i18n/i18n_context";

// Info: (20260810 - Julian) 頂部的四張統計卡
const StatCard: FC<{
  icon: typeof Building2;
  label: string;
  value: number;
  unit: string;
}> = ({ icon: Icon, label, value, unit }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-gray-400 uppercase">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </p>
    <p className="mt-2 flex items-baseline gap-1">
      <span className="text-2xl font-bold text-gray-800">{value}</span>
      {unit && <span className="text-xs text-gray-400">{unit}</span>}
    </p>
  </div>
);

/**
 * Info: (20260810 - Julian) 組織架構的主內容區（架構圖的 Main Content）。
 *
 * 部門與職稱都由 mock 常數推導：樹狀結構、人數統計全部經過
 * `@/lib/utils/hr_organization` 的純函式，接上 API 時只要換掉這兩個
 * 常數的來源，UI 與計算都不必動。
 */
const OrganizationPageBody: FC = () => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<OrganizationTab>(
    OrganizationTab.DEPARTMENT,
  );
  const [viewMode, setViewMode] = useState<OrganizationViewMode>(
    OrganizationViewMode.LIST,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const departmentTree = useMemo(
    () => buildDepartmentTree(MOCK_HR_DEPARTMENTS, MOCK_HR_EMPLOYEES),
    [],
  );

  const jobTitles = useMemo(
    () => buildJobTitleList(MOCK_HR_JOB_TITLES, MOCK_HR_EMPLOYEES),
    [],
  );

  /**
   * Info: (20260810 - Julian) 沒有點選過任何部門時，預設選中第一個根部門。
   * 用衍生值而不是在 effect 裡 setState，可以少一次多餘的 render，
   * 資料換成 API 回傳後也不會有「先空一下再跳出來」的閃動。
   */
  const selectedNode = selectedId
    ? findDepartmentNode(departmentTree, selectedId)
    : (departmentTree[0] ?? null);

  const parentName = useMemo(() => {
    if (!selectedNode?.parentId) return null;
    return (
      findDepartmentNode(departmentTree, selectedNode.parentId)?.name ?? null
    );
  }, [departmentTree, selectedNode]);

  // Info: (20260810 - Julian) 成員清單與「本部門人數」採同一個口徑，離職者兩邊都不算
  const members = useMemo(() => {
    if (!selectedNode) return [];
    return MOCK_HR_EMPLOYEES.filter(
      (employee) =>
        employee.departmentId === selectedNode.id &&
        isHeadcountEmployee(employee),
    );
  }, [selectedNode]);

  const stats = useMemo(() => {
    const flattened = flattenDepartmentTree(departmentTree);
    return {
      departmentCount: flattened.length,
      jobTitleCount: jobTitles.length,
      headcount: MOCK_HR_EMPLOYEES.filter(isHeadcountEmployee).length,
      maxDepth:
        flattened.reduce((max, node) => Math.max(max, node.depth), 0) + 1,
    };
  }, [departmentTree, jobTitles]);

  const handleToggle = (departmentId: string) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(departmentId)) next.delete(departmentId);
      else next.add(departmentId);
      return next;
    });
  };

  // Info: (20260810 - Julian) 從組織圖點選部門時切回清單模式，因為詳情只在清單模式看得到
  const handleSelectFromChart = (departmentId: string) => {
    setSelectedId(departmentId);
    setViewMode(OrganizationViewMode.LIST);
  };

  const handleCollapseAll = () => {
    setCollapsedIds(
      new Set(
        flattenDepartmentTree(departmentTree)
          .filter((node) => node.children.length > 0)
          .map((node) => node.id),
      ),
    );
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Info: (20260810 - Julian) 頁面標題列 */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-800">
              <Network className="size-6 shrink-0 text-orange-500" />
              {t("hr_management.organization.title")}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {t("hr_management.organization.subtitle")}
            </p>
          </div>

          {/* ToDo: (20260810 - Julian) 部門與職稱的新增 API 完成後接上 Modal */}
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
          >
            <Plus className="size-4 shrink-0" />
            {activeTab === OrganizationTab.DEPARTMENT
              ? t("hr_management.organization.add_department")
              : t("hr_management.organization.add_job_title")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Building2}
            label={t("hr_management.organization.stat_department")}
            value={stats.departmentCount}
            unit={t("hr_management.organization.unit_department")}
          />
          <StatCard
            icon={IdCard}
            label={t("hr_management.organization.stat_job_title")}
            value={stats.jobTitleCount}
            unit={t("hr_management.organization.unit_department")}
          />
          <StatCard
            icon={Users}
            label={t("hr_management.organization.stat_headcount")}
            value={stats.headcount}
            unit={t("hr_management.value.headcount_unit")}
          />
          <StatCard
            icon={Layers}
            label={t("hr_management.organization.stat_depth")}
            value={stats.maxDepth}
            unit={t("hr_management.organization.unit_level")}
          />
        </div>

        {/* Info: (20260810 - Julian) 分頁與檢視模式切換 */}
        <div className="flex flex-col gap-3 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-6">
            {ORGANIZATION_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-current={activeTab === tab ? "page" : undefined}
                className={`pb-2 text-base font-bold transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-orange-600 text-gray-900"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {t(ORGANIZATION_TAB_I18N_KEY[tab])}
              </button>
            ))}
          </div>

          {activeTab === OrganizationTab.DEPARTMENT && (
            <div className="mb-2 flex gap-1 rounded-xl bg-gray-100 p-1">
              {ORGANIZATION_VIEW_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    viewMode === mode
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t(ORGANIZATION_VIEW_MODE_I18N_KEY[mode])}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === OrganizationTab.JOB_TITLE && (
          <JobTitleTable jobTitles={jobTitles} />
        )}

        {activeTab === OrganizationTab.DEPARTMENT &&
          viewMode === OrganizationViewMode.LIST && (
            <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
              <DepartmentTree
                nodes={departmentTree}
                selectedId={selectedNode?.id ?? null}
                collapsedIds={collapsedIds}
                onSelect={setSelectedId}
                onToggle={handleToggle}
                onExpandAll={() => setCollapsedIds(new Set())}
                onCollapseAll={handleCollapseAll}
              />
              <DepartmentDetail
                department={selectedNode}
                parentName={parentName}
                members={members}
              />
            </div>
          )}

        {activeTab === OrganizationTab.DEPARTMENT &&
          viewMode === OrganizationViewMode.CHART && (
            <DepartmentOrgChart
              nodes={departmentTree}
              selectedId={selectedNode?.id ?? null}
              onSelect={handleSelectFromChart}
            />
          )}
      </div>
    </div>
  );
};

export default OrganizationPageBody;
