"use client";

import { useState, FC, ChangeEvent, useMemo } from "react";

import { useTranslation } from "@/i18n/i18n_context";
import { Search, User, Hash, Mail, Plus, Edit, Trash, X } from "lucide-react";
import { numberWithCommas } from "@/lib/utils/common";
import { useSalaryEmployees } from "@/hooks/use_salary_employees";
import {
  ISalaryCalculatorEmployee,
  ISalaryCalculatorEmployeeWriteInput,
} from "@/interfaces/salary_record";
import EmployeeActionModal from "@/components/salary_calculator/employee_action_modal";
import RemoveEmployeeModal from "@/components/salary_calculator/remove_employee_modal";

const cellStyle =
  "table-cell align-middle border-b border-stroke-neutral-quaternary px-[24px] py-[12px]";

const headerStyle = `${cellStyle} text-text-neutral-primary font-semibold`;

const iconBtnStyle =
  "flex h-[32px] w-[32px] items-center justify-center rounded-md transition-colors hover:bg-surface-hover";

const EmployeeItem: FC<{
  employee: ISalaryCalculatorEmployee;
  editHandler: (employee: ISalaryCalculatorEmployee) => void;
  removeHandler: (employee: ISalaryCalculatorEmployee) => void;
}> = ({ employee, editHandler, removeHandler }) => {
  const { t } = useTranslation();
  const { name, number, email, baseSalary } = employee;

  return (
    <div className="table-row">
      {/* Info: (20250715 - Julian) Name */}
      <div className={cellStyle}>
        <div className="flex items-center gap-[8px]">
          <User size={16} className="text-text-neutral-tertiary" />
          <span className="text-text-neutral-primary font-semibold">
            {name}
          </span>
        </div>
      </div>
      {/* Info: (20250715 - Julian) Number */}
      <div className={cellStyle}>
        <div className="flex items-center gap-[8px]">
          <Hash size={16} className="text-text-neutral-tertiary" />
          {number}
        </div>
      </div>
      {/* Info: (20250715 - Julian) Email */}
      <div className={cellStyle}>
        <div className="flex items-center gap-[8px]">
          <Mail size={16} className="text-text-neutral-tertiary" />
          {email}
        </div>
      </div>
      {/* Info: (20260831 - Julian) 本薪：這份名單存在的理由，藏在編輯彈窗裡等於每次都要點開才看得到 */}
      <div className={`${cellStyle} text-text-neutral-primary text-right`}>
        {numberWithCommas(baseSalary)}
      </div>
      {/* Info: (20250715 - Julian) Action */}
      <div className={cellStyle}>
        <div className="flex items-center justify-end gap-[8px]">
          <button
            type="button"
            aria-label={`${name} ${t("calculator.employee_list.edit_employee")}`}
            onClick={() => editHandler(employee)}
            className={`text-text-neutral-secondary ${iconBtnStyle}`}
          >
            <Edit size={16} />
          </button>
          <button
            type="button"
            aria-label={`${name} ${t("calculator.employee_list.remove_employee_title")}`}
            onClick={() => removeHandler(employee)}
            className={`text-text-state-error ${iconBtnStyle}`}
          >
            <Trash size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

interface IEmployeeListProps {
  accountBookId: string;
}

const EmployeeList: FC<IEmployeeListProps> = ({ accountBookId }) => {
  const { t } = useTranslation();
  const {
    employees,
    isLoading,
    hasError,
    createEmployee,
    updateEmployee,
    removeEmployee,
  } = useSalaryEmployees(accountBookId);

  const [keyword, setKeyword] = useState<string>("");
  // Info: (20250715 - Julian) 操作 Modal 類型，'add' 為新增員工，'edit' 為編輯員工
  const [action, setAction] = useState<"add" | "edit">("add");
  const [dataToEdit, setDataToEdit] =
    useState<ISalaryCalculatorEmployee | null>(null);
  const [isShowModal, setIsShowModal] = useState<boolean>(false);
  const [employeeToRemove, setEmployeeToRemove] =
    useState<ISalaryCalculatorEmployee | null>(null);

  const changeKeyword = (e: ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };
  const clearKeyword = () => setKeyword("");

  /**
   * Info: (20260831 - Julian) 前端過濾。
   *
   * 原本 `keyword` 只有 setState、下面直接 map 全部 —— 搜尋框打字沒有任何作用。
   * 名單不分頁（數十人的量級），一次取回再過濾就夠（計劃書 §8.5）。
   */
  const filteredEmployees = useMemo(() => {
    const trimmed = keyword.trim().toLowerCase();
    if (trimmed === "") return employees;

    return employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(trimmed) ||
        employee.number.toLowerCase().includes(trimmed) ||
        employee.email.toLowerCase().includes(trimmed),
    );
  }, [employees, keyword]);

  const clickAddEmployeeHandler = () => {
    setAction("add");
    setDataToEdit(null);
    setIsShowModal(true);
  };

  const editHandler = (employeeToEdit: ISalaryCalculatorEmployee) => {
    setAction("edit");
    setDataToEdit(employeeToEdit);
    setIsShowModal(true);
  };

  const modalVisibleHandler = () => setIsShowModal((prev) => !prev);

  // Info: (20260831 - Julian) 同一個彈窗，依 dataToEdit 決定打 POST 還是 PUT
  const submitEmployeeHandler = async (
    input: ISalaryCalculatorEmployeeWriteInput,
  ) => {
    if (dataToEdit) {
      await updateEmployee(dataToEdit.id, input);
      return;
    }
    await createEmployee(input);
  };

  const addEmployeeBtn = (
    <button
      type="button"
      onClick={clickAddEmployeeHandler}
      className="flex h-[44px] shrink-0 items-center justify-center gap-[8px] rounded-lg bg-orange-600 px-[20px] text-sm font-bold text-white transition-colors hover:bg-orange-700"
    >
      <Plus size={16} />
      <p>{t("calculator.employee_list.add_employee")}</p>
    </button>
  );

  const displayedEmployees = filteredEmployees.map((employee) => (
    <EmployeeItem
      key={employee.id}
      employee={employee}
      editHandler={editHandler}
      removeHandler={setEmployeeToRemove}
    />
  ));

  // Info: (20260831 - Julian) 完全沒有員工：搜尋列不出現，因為沒有東西可以搜
  const emptyState = (
    <div className="bg-surface-neutral-surface-lv2 border-stroke-neutral-quaternary flex w-full flex-col items-center gap-[16px] rounded-lg border px-[32px] py-[56px] text-center">
      <User size={30} className="text-text-brand-primary-lv1" />
      <div className="flex max-w-[460px] flex-col gap-[6px]">
        <p className="text-text-neutral-primary text-lg font-bold">
          {t("calculator.employee_list.empty_title")}
        </p>
        <p className="text-text-neutral-secondary text-sm leading-relaxed">
          {t("calculator.employee_list.empty_desc")}
        </p>
      </div>
      {addEmployeeBtn}
    </div>
  );

  // Info: (20260831 - Julian) 有員工但搜尋不到：搜尋列留著，給一條清除搜尋的路
  const noSearchResult = (
    <div className="bg-surface-neutral-surface-lv2 border-stroke-neutral-quaternary flex w-full flex-col items-center gap-[12px] rounded-lg border px-[32px] py-[48px] text-center">
      <Search size={26} className="text-text-neutral-tertiary" />
      <p className="text-text-neutral-primary text-base font-semibold">
        {t("calculator.employee_list.no_search_result", { keyword })}
      </p>
      <button
        type="button"
        onClick={clearKeyword}
        className="text-text-brand-primary-lv1 text-sm font-semibold underline"
      >
        {t("calculator.employee_list.clear_search")}
      </button>
    </div>
  );

  const employeeTable = (
    <div className="bg-surface-neutral-surface-lv2 text-text-neutral-secondary table w-full text-sm font-medium">
      <div className="table-header-group">
        <div className="table-row">
          <div className={headerStyle}>
            {t("calculator.employee_list.name")}
          </div>
          <div className={headerStyle}>
            {t("calculator.employee_list.number")}
          </div>
          <div className={headerStyle}>
            {t("calculator.employee_list.email")}
          </div>
          <div className={`${headerStyle} text-right`}>
            {t("calculator.employee_list.base_salary")}
          </div>
          <div className={`${headerStyle} text-right`}>
            {t("calculator.employee_list.action")}
          </div>
        </div>
      </div>
      <div className="table-row-group">{displayedEmployees}</div>
    </div>
  );

  const listBody = (() => {
    if (isLoading) {
      return (
        <p className="text-text-neutral-tertiary py-[48px] text-center text-sm">
          {t("common.loading")}
        </p>
      );
    }
    if (hasError) {
      return (
        <p className="text-text-state-error py-[48px] text-center text-sm">
          {t("calculator.employee_list.load_failed")}
        </p>
      );
    }
    if (employees.length === 0) return emptyState;
    if (filteredEmployees.length === 0) return noSearchResult;
    return employeeTable;
  })();

  // Info: (20260831 - Julian) 沒有員工時整條搜尋列都不出現
  const hasAnyEmployee = !isLoading && !hasError && employees.length > 0;

  return (
    <>
      <div className="flex flex-col items-center gap-[24px]">
        {hasAnyEmployee && (
          <div className="flex w-full items-center gap-[24px]">
            {/* Info: (20250715 - Julian) Search bar */}
            <div className="border-input-stroke-input flex flex-1 items-center rounded-lg border">
              <div className="text-text-neutral-tertiary px-[12px] py-[10px]">
                <Search size={16} />
              </div>
              <input
                type="text"
                aria-label={t("calculator.employee_list.search_placeholder")}
                value={keyword}
                onChange={changeKeyword}
                placeholder={t("calculator.employee_list.search_placeholder")}
                className="placeholder:text-input-text-input-placeholder flex-1 bg-transparent px-[12px] py-[10px] outline-none"
              />
              {keyword !== "" && (
                <button
                  type="button"
                  aria-label={t("calculator.employee_list.clear_search")}
                  onClick={clearKeyword}
                  className={`text-text-neutral-tertiary mr-[6px] ${iconBtnStyle}`}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <p className="text-text-neutral-tertiary shrink-0 text-sm">
              {keyword === ""
                ? t("calculator.employee_list.total_count", {
                    count: employees.length,
                  })
                : t("calculator.employee_list.filtered_count", {
                    count: filteredEmployees.length,
                    total: employees.length,
                  })}
            </p>

            {/* Info: (20250715 - Julian) Add New Employee button */}
            {addEmployeeBtn}
          </div>
        )}

        {listBody}
      </div>

      {/* Info: (20250715 - Julian) Add/Edit Employee Modal */}
      {isShowModal && (
        <EmployeeActionModal
          type={action}
          data={dataToEdit}
          modalVisibleHandler={modalVisibleHandler}
          submitHandler={submitEmployeeHandler}
        />
      )}

      {/* Info: (20260831 - Julian) 移除員工確認 */}
      {employeeToRemove && (
        <RemoveEmployeeModal
          employee={employeeToRemove}
          closeHandler={() => setEmployeeToRemove(null)}
          removeHandler={() => removeEmployee(employeeToRemove.id)}
        />
      )}
    </>
  );
};

export default EmployeeList;
