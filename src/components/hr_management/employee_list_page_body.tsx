"use client";

import { FC, useEffect, useMemo, useState } from "react";
import {
  Download,
  Mail,
  Phone,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import EmployeeHireCell from "@/components/hr_management/employee_hire_cell";
import EmployeeStatusBadge from "@/components/hr_management/employee_status_badge";
import EmployeeSummaryCards from "@/components/hr_management/employee_summary_cards";
import {
  EmployeeSortKey,
  EmployeeStatus,
  EMPLOYEE_LIST_PAGE_SIZE,
  EMPLOYEE_STATUS_I18N_KEY,
  EMPLOYEE_SUMMARY_STATUSES,
  HR_FILTER_ALL,
  HR_PENDING_ACTION_CLASS,
} from "@/constants/hr_management";
import { MOCK_HR_EMPLOYEES } from "@/constants/mock_hr_employees";
import { MOCK_HR_DEPARTMENTS } from "@/constants/mock_hr_organization";
import {
  buildDepartmentTree,
  flattenDepartmentTree,
} from "@/lib/utils/hr_organization";
import { IEmployeeListItem } from "@/interfaces/hr_management";
import { getEmployeeInitials } from "@/lib/utils/hr_employee";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260810 - Julian) 員工列表的主內容區（架構圖的 Main Content）。
 *
 * 目前資料來自 `MOCK_HR_EMPLOYEES`，篩選、排序、分頁全在前端完成。
 * 這三段刻意寫成「輸入陣列 → 輸出陣列」的獨立 useMemo，接上
 * `/api/v1/hr/employee` 時只要把它們換成 query string 即可，UI 不必動。
 */
const EmployeeListPageBody: FC = () => {
  const { t } = useTranslation();

  const [keyword, setKeyword] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>(HR_FILTER_ALL);
  const [status, setStatus] = useState<string>(HR_FILTER_ALL);
  const [sortBy, setSortBy] = useState<string>(EmployeeSortKey.HIRE_DATE);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);

  /**
   * Info: (20260810 - Julian) 年資的計算基準點在掛載後才決定。
   *
   * 直接在 render 內取 `new Date()`，伺服器與瀏覽器會算到不同的時刻，
   * 跨日或跨月的那一瞬間兩邊的年資會差一個月，React 會報 hydration 不一致。
   * 未取得基準點前只顯示到職日，不顯示年資。
   */
  const [referenceDate, setReferenceDate] = useState<Date | null>(null);

  useEffect(() => {
    setReferenceDate(new Date());
  }, []);

  /**
   * Info: (20260810 - Julian) 部門下拉選單依組織層級縮排。
   *
   * 部門有父子關係（技術部下還有前端組、後端組），攤平成同一層列出來
   * 會讓「前端組」看起來與「技術部」平行。`<option>` 不吃 CSS 縮排，
   * 因此用全形空白墊在名稱前面。
   */
  const departmentOptions = useMemo(
    () =>
      flattenDepartmentTree(
        buildDepartmentTree(MOCK_HR_DEPARTMENTS, MOCK_HR_EMPLOYEES),
      ),
    [],
  );

  const isFiltered =
    keyword.trim() !== "" ||
    departmentId !== HR_FILTER_ALL ||
    status !== HR_FILTER_ALL;

  // Info: (20260810 - Julian) 統計卡讀全體員工，不受篩選影響
  const statusCounts = useMemo<Record<EmployeeStatus, number>>(() => {
    const initial = {
      [EmployeeStatus.ACTIVE]: 0,
      [EmployeeStatus.PROBATION]: 0,
      [EmployeeStatus.LEAVE_WITHOUT_PAY]: 0,
      [EmployeeStatus.RESIGNED]: 0,
    };
    return MOCK_HR_EMPLOYEES.reduce((acc, employee) => {
      acc[employee.status] += 1;
      return acc;
    }, initial);
  }, []);

  const filteredEmployees = useMemo<IEmployeeListItem[]>(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return MOCK_HR_EMPLOYEES.filter((employee) => {
      const matchedKeyword =
        normalizedKeyword === "" ||
        employee.name.toLowerCase().includes(normalizedKeyword) ||
        (employee.englishName ?? "")
          .toLowerCase()
          .includes(normalizedKeyword) ||
        employee.employeeNo.toLowerCase().includes(normalizedKeyword) ||
        employee.email.toLowerCase().includes(normalizedKeyword);

      const matchedDepartment =
        departmentId === HR_FILTER_ALL ||
        employee.departmentId === departmentId;

      const matchedStatus =
        status === HR_FILTER_ALL || employee.status === status;

      return matchedKeyword && matchedDepartment && matchedStatus;
    });
  }, [keyword, departmentId, status]);

  const sortedEmployees = useMemo<IEmployeeListItem[]>(() => {
    const direction = sortOrder === "asc" ? 1 : -1;

    // Info: (20260810 - Julian) 依排序鍵取出要比較的字串，統一用 localeCompare 比較
    const sortValue = (employee: IEmployeeListItem): string => {
      switch (sortBy) {
        case EmployeeSortKey.DEPARTMENT:
          return employee.departmentName ?? "";
        case EmployeeSortKey.STATUS:
          return employee.status;
        case EmployeeSortKey.HIRE_DATE:
          return employee.hireDate;
        case EmployeeSortKey.EMPLOYEE:
        default:
          return employee.employeeNo;
      }
    };

    return [...filteredEmployees].sort(
      (a, b) => sortValue(a).localeCompare(sortValue(b), "zh-Hant") * direction,
    );
  }, [filteredEmployees, sortBy, sortOrder]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedEmployees.length / EMPLOYEE_LIST_PAGE_SIZE),
  );

  // Info: (20260810 - Julian) 篩選後頁數縮水時，把停在空白頁的使用者拉回最後一頁
  const currentPage = Math.min(page, totalPages);

  const paginatedEmployees = useMemo<IEmployeeListItem[]>(
    () =>
      sortedEmployees.slice(
        (currentPage - 1) * EMPLOYEE_LIST_PAGE_SIZE,
        currentPage * EMPLOYEE_LIST_PAGE_SIZE,
      ),
    [sortedEmployees, currentPage],
  );

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleResetFilter = () => {
    setKeyword("");
    setDepartmentId(HR_FILTER_ALL);
    setStatus(HR_FILTER_ALL);
    setPage(1);
  };

  const columns = useMemo<IDataTableColumn<IEmployeeListItem>[]>(
    () => [
      {
        key: EmployeeSortKey.EMPLOYEE,
        label: t("hr_management.employee.table.employee"),
        sortable: true,
        render: (employee) => (
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-600">
              {getEmployeeInitials(employee.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-gray-800">
                {employee.name}
                {employee.englishName && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {employee.englishName}
                  </span>
                )}
              </div>
              <div className="mt-0.5 font-mono text-xs text-gray-400">
                {employee.employeeNo}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: EmployeeSortKey.DEPARTMENT,
        label: t("hr_management.employee.table.department"),
        sortable: true,
        render: (employee) => (
          <div className="min-w-0">
            <div className="truncate font-medium text-gray-700">
              {employee.departmentName ?? t("hr_management.value.none")}
            </div>
            <div className="mt-0.5 truncate text-xs text-gray-400">
              {employee.jobTitle ?? t("hr_management.value.none")}
            </div>
          </div>
        ),
      },
      {
        key: "managerName",
        label: t("hr_management.employee.table.manager"),
        render: (employee) => (
          <span className="text-sm text-gray-600">
            {employee.managerName ?? t("hr_management.value.none")}
          </span>
        ),
      },
      {
        key: EmployeeSortKey.STATUS,
        label: t("hr_management.employee.table.status"),
        sortable: true,
        render: (employee) => <EmployeeStatusBadge status={employee.status} />,
      },
      {
        key: EmployeeSortKey.HIRE_DATE,
        label: t("hr_management.employee.table.hire_date"),
        sortable: true,
        render: (employee) => (
          <EmployeeHireCell employee={employee} referenceDate={referenceDate} />
        ),
      },
      {
        key: "contact",
        label: t("hr_management.employee.table.contact"),
        render: (employee) => (
          <div className="flex flex-col gap-1">
            <a
              href={`mailto:${employee.email}`}
              className="flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-orange-600"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {employee.email}
            </a>
            {/**
             * Info: (20260812 - Julian) 電話顯示遮罩後的值。
             * 它是 Tier 2 CONFIDENTIAL（ADR 018 §2），列表一次帶一百多人的
             * 完整號碼，等於把整份通訊錄放在一個畫面上。
             */}
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {employee.maskedPhone}
            </span>
          </div>
        ),
      },
      {
        key: "action",
        label: t("hr_management.employee.table.action"),
        align: "right",
        render: () => (
          // ToDo: (20260810 - Julian) 員工詳情頁完成後改為 Link 導向 /hr_management/employee/[id]
          <button
            type="button"
            title={t("hr_management.value.feature_pending")}
            disabled
            className={`inline-flex items-center justify-center rounded-xl bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600 transition hover:bg-orange-100 ${HR_PENDING_ACTION_CLASS}`}
          >
            {t("hr_management.employee.table.view")}
          </button>
        ),
      },
    ],
    [t, referenceDate],
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Info: (20260810 - Julian) 頁面標題列 */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-800">
              <Users className="size-6 shrink-0 text-orange-500" />
              {t("hr_management.employee.title")}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {t("hr_management.employee.subtitle")}
              <span className="mx-2 text-gray-300">|</span>
              {t("hr_management.employee.total", {
                count: MOCK_HR_EMPLOYEES.length,
              })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              title={t("hr_management.value.feature_pending")}
              disabled
              className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 ${HR_PENDING_ACTION_CLASS}`}
            >
              <Download className="size-4 shrink-0" />
              {t("hr_management.employee.export")}
            </button>
            <button
              type="button"
              title={t("hr_management.value.feature_pending")}
              disabled
              className={`inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 ${HR_PENDING_ACTION_CLASS}`}
            >
              <UserPlus className="size-4 shrink-0" />
              {t("hr_management.employee.add")}
            </button>
          </div>
        </div>

        <EmployeeSummaryCards counts={statusCounts} />

        {/* Info: (20260810 - Julian) 篩選列 */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 shrink-0 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              aria-label={t(
                "hr_management.employee.filter.keyword_placeholder",
              )}
              placeholder={t(
                "hr_management.employee.filter.keyword_placeholder",
              )}
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm text-gray-700 transition-all placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
            />
          </div>

          <select
            aria-label={t("hr_management.employee.filter.department")}
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none lg:w-44"
          >
            <option value={HR_FILTER_ALL}>
              {t("hr_management.employee.filter.all_departments")}
            </option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {`${"\u3000".repeat(department.depth)}${department.name}`}
              </option>
            ))}
          </select>

          <select
            aria-label={t("hr_management.employee.filter.status")}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none lg:w-40"
          >
            <option value={HR_FILTER_ALL}>
              {t("hr_management.employee.filter.all_status")}
            </option>
            {EMPLOYEE_SUMMARY_STATUSES.map((employeeStatus) => (
              <option key={employeeStatus} value={employeeStatus}>
                {t(EMPLOYEE_STATUS_I18N_KEY[employeeStatus])}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <span className="text-xs text-gray-400">
              {t("hr_management.employee.filter.result", {
                count: filteredEmployees.length,
              })}
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                {t("hr_management.employee.filter.reset")}
              </button>
            )}
          </div>
        </div>

        <DataTable<IEmployeeListItem>
          columns={columns}
          data={paginatedEmployees}
          rowKey={(employee) => employee.id}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
          pagination={{
            page: currentPage,
            limit: EMPLOYEE_LIST_PAGE_SIZE,
            totalPages,
            totalElements: sortedEmployees.length,
          }}
          onPageChange={setPage}
          emptyStateText={t("hr_management.employee.table.empty")}
        />
      </div>
    </div>
  );
};

export default EmployeeListPageBody;
