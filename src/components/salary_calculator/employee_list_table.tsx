"use client";

import { FC, ReactNode } from "react";
import { CalendarPlus, Mail, Pencil, Trash } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { numberWithCommas } from "@/lib/utils/common";
import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";
import { hasNoEmail, hasNoHireDate } from "@/lib/utils/salary_employee_filter";
import { toDateInputValue } from "@/lib/utils/salary_employee_profile";
import DataTable, { IDataTableColumn } from "@/components/common/data_table";
import CoverageAlert from "@/components/salary_calculator/coverage_alert";

/**
 * Info: (20260907 - Julian) 員工列表頁的表格。
 *
 * ## 為什麼用共用的 `DataTable`
 *
 * 表頭、hover、空狀態、載入中、橫向捲動全在那裡（全庫 16 個列表頁在用）。
 * 手刻一份的話，這一頁會慢慢與其他列表長得不一樣，而每一次都只差一點點。
 * 原本的整頁版沒有表頭 —— 使用者看不出中間那一格是信箱還是別的什麼。
 *
 * ## 挑人彈窗不走這裡
 *
 * 彈窗只有 560px：六欄的表格會把姓名擠成兩行，而那裡一列就是一個選項，
 * 不是一筆資料。彈窗維持 `EmployeeList` 裡的緊湊清單（`EmployeeRow`）。
 * 兩邊共用的是**行為**（名單、搜尋、新增／編輯／移除、缺漏判斷），不是像素。
 *
 * ## 日後要加欄位的話
 *
 * 加一筆 `IDataTableColumn` 進 `columns` 就好，順序就是畫面順序。
 * 警示欄刻意排第一：使用者由上往下掃名單，「這個人有問題」要在他讀到
 * 姓名之前就看得見；排右邊的話那一格在窄螢幕上會被推到橫向捲軸外。
 */

export interface IEmployeeListTableProps {
  employees: ISalaryCalculatorEmployee[];
  isLoading: boolean;
  editHandler: (employee: ISalaryCalculatorEmployee) => void;
  removeHandler: (employee: ISalaryCalculatorEmployee) => void;
  /** Info: (20260907 - Julian) 一位員工都沒有／篩不到，兩種空狀態由呼叫端決定 */
  emptyState: ReactNode;
}

const EmployeeListTable: FC<IEmployeeListTableProps> = ({
  employees,
  isLoading,
  editHandler,
  removeHandler,
  emptyState,
}) => {
  const { t } = useTranslation();

  /**
   * Info: (20260907 - Julian) **刻意不包 `useMemo`**（同薪資紀錄頁）。
   *
   * `render` 裡關住了 `editHandler` 與 `removeHandler`，而它們綁著
   * `EmployeeList` 當下的 state；memo 沒跟上就會用舊的 handler 畫新的名單，
   * 而那是靜默的 —— 畫面看起來完全正常，按下去改到的是別人。
   */
  const columns: IDataTableColumn<ISalaryCalculatorEmployee>[] = [
    {
      key: "name",
      label: t("calculator.employee_list.name"),
      /**
       * Info: (20260907 - Julian) 警示圖示與姓名**同一格**，不是自成一欄。
       *
       * 初版把它獨立成第一欄並用 `className: "w-10 !px-3"` 壓窄 ——
       * 那個 class **只套到 `<th>`**（`data_table.tsx:92`），`<td>` 是寫死的
       * `px-6`（同檔 192 行）。於是表頭以為自己 40px 寬、內容格卻是
       * 24+18+24，欄寬由內容格決定，畫面上就變成圖示與姓名之間一段
       * 沒有東西的空白 —— 而那四位沒有缺漏的人，那一格整格是空的。
       *
       * 併進姓名這一格之後，欄寬由姓名決定，圖示仍然在列的最前面
       * （使用者由上往下掃時先看到它），而且它與它所描述的姓名相鄰。
       *
       * `w-5 shrink-0` 是**固定寬度的空位**：沒有警示的列也佔同樣的寬，
       * 所以每一列的姓名起點對齊。少了它，有圖示的那幾列姓名會被推右邊，
       * 一份名單看起來像沒對齊的清單。
       */
      render: (employee) => (
        <div className="flex items-center gap-2">
          <span className="flex w-5 shrink-0 justify-center">
            <CoverageAlert
              missingPeriods={employee.missingPeriods}
              display="icon"
            />
          </span>
          <span className="font-medium text-gray-900">{employee.name}</span>
        </div>
      ),
    },
    {
      key: "number",
      label: t("calculator.employee_list.number"),
      render: (employee) => (
        <span className="font-mono text-xs text-gray-500">
          {employee.number}
        </span>
      ),
    },
    {
      key: "email",
      label: t("calculator.employee_list.email"),
      render: (employee) =>
        hasNoEmail(employee) ? (
          /**
           * Info: (20260904 - Julian) 缺信箱的那一格**本身就是補上的入口**。
           *
           * 只標示不給路的話，使用者看到「未填寫」的下一個動作是回頭找
           * 那一列的鉛筆 —— 而他已經把游標放在問題上了。
           */
          <button
            type="button"
            onClick={() => editHandler(employee)}
            /**
             * Info: (20260907 - Julian) `-ml-[6px]` 把左內距抵銷掉。
             *
             * 這一格有時是純文字的信箱、有時是這顆按鈕，而按鈕的 `px-[6px]`
             * 會讓「未填寫」比上下兩列的信箱右移 6px —— 一整欄看起來沒對齊。
             * 內距要留（那是點擊範圍），所以用負左邊距把文字起點拉回來。
             */
            className="-ml-[6px] inline-flex items-center gap-[4px] rounded-md px-[6px] py-[2px] font-medium text-amber-600 transition-colors hover:bg-amber-50"
          >
            <Mail size={14} className="shrink-0" />
            {t("calculator.employee_list.no_email")}
          </button>
        ) : (
          <span className="text-gray-600">{employee.email}</span>
        ),
    },
    {
      key: "hireDate",
      label: t("calculator.employee_list.hire_date"),
      /**
       * Info: (20260907 - Julian) 到職日排在信箱之後、本薪之前。
       *
       * 兩個「填了沒」的欄位（信箱、到職日）相鄰，而它們正是上面兩個勾選
       * filter 在問的事 —— 勾了之後眼睛要落在同一區，不必左右跳。
       *
       * 這一欄同時把「沒有到職日」這件事從一個抽象的人數變成看得見的空格。
       * 在此之前那個提示得自己解釋為什麼重要，因為畫面上沒有任何地方
       * 顯示到職日。
       *
       * 走 `toDateInputValue` 而不是 `timestampToString`：到職日在這個模組
       * 一律 UTC 錨定（寫入是 `${value}T00:00:00.000Z`），用本地時區格式化
       * 會讓負偏移時區的使用者看到前一天。
       */
      render: (employee) =>
        hasNoHireDate(employee) ? (
          /**
           * Info: (20260907 - Julian) 沒填就是補上的入口，同信箱那一格的處置。
           * `-ml-[6px]` 抵銷按鈕的左內距，讓文字與上下列的日期對齊。
           */
          <button
            type="button"
            onClick={() => editHandler(employee)}
            className="-ml-[6px] inline-flex items-center gap-[4px] rounded-md px-[6px] py-[2px] font-medium text-sky-600 transition-colors hover:bg-sky-50"
          >
            <CalendarPlus size={14} className="shrink-0" />
            {t("calculator.employee_list.no_hire_date")}
          </button>
        ) : (
          <span className="font-mono text-xs text-gray-600">
            {toDateInputValue(employee.hireDate)}
          </span>
        ),
    },
    {
      key: "baseSalary",
      label: t("calculator.employee_list.base_salary"),
      align: "right",
      render: (employee) => (
        <span className="font-semibold text-gray-900">
          {numberWithCommas(employee.baseSalary)}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("common.actions"),
      align: "right",
      render: (employee) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={`${employee.name} ${t("calculator.employee_list.edit_employee")}`}
            onClick={() => editHandler(employee)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            aria-label={`${employee.name} ${t("calculator.employee_list.remove_employee_title")}`}
            onClick={() => removeHandler(employee)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable<ISalaryCalculatorEmployee>
      columns={columns}
      data={employees}
      loading={isLoading}
      rowKey={(employee) => employee.id}
      emptyStateText={emptyState}
    />
  );
};

export default EmployeeListTable;
