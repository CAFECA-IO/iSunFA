"use client";

import { useState, FC, ChangeEvent, useMemo } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { X, Search, User, Hash, Plus, Pencil, Trash } from "lucide-react";
import { numberWithCommas } from "@/lib/utils/common";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { useSalaryEmployees } from "@/hooks/use_salary_employees";
import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";
import EmployeeActionModal from "@/components/salary_calculator/employee_action_modal";
import RemoveEmployeeModal from "@/components/salary_calculator/remove_employee_modal";

interface IEmployeeListModalProps {
  accountBookId: string;
  modalVisibleHandler: () => void;
}

const iconBtnStyle =
  "flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-hover";

const EmployeeItem: FC<{
  employee: ISalaryCalculatorEmployee;
  pickHandler: () => void;
  editHandler: () => void;
  removeHandler: () => void;
}> = ({ employee, pickHandler, editHandler, removeHandler }) => {
  const { t } = useTranslation();

  return (
    <div className="group hover:bg-surface-brand-primary-soft flex items-center">
      {/**
       * Info: (20260901 - Julian) 選人本身是一顆真的 `<button>`。
       *
       * 原本整列是 `div role="button"` 外加手寫的 onKeyDown；現在列上多了編輯與
       * 刪除兩顆按鈕，巢狀在可點擊的 div 裡會讓鍵盤焦點與點擊範圍互相打架。
       * 拆成三顆按鈕之後，鍵盤操作由瀏覽器負責，不需要自己處理 Enter/Space。
       */}
      <button
        type="button"
        onClick={pickHandler}
        className="flex flex-1 items-center gap-[8px] px-[24px] py-[12px] text-left"
      >
        <User
          size={16}
          className="text-text-neutral-tertiary group-hover:text-text-neutral-primary shrink-0"
        />
        <p className="text-text-neutral-secondary group-hover:text-text-neutral-primary flex-1 font-medium">
          {employee.name}
        </p>
        <span className="text-text-neutral-tertiary group-hover:text-text-neutral-primary flex items-center gap-[6px] text-sm font-medium">
          <Hash size={14} className="shrink-0" />
          {employee.number}
        </span>
        <span
          title={t("calculator.employee_list.base_salary")}
          className="text-text-neutral-secondary group-hover:text-text-neutral-primary w-[90px] text-right text-sm font-semibold"
        >
          {numberWithCommas(employee.baseSalary)}
        </span>
      </button>

      <div className="flex items-center gap-[4px] pr-[16px]">
        <button
          type="button"
          aria-label={`${employee.name} ${t("calculator.employee_list.edit_employee")}`}
          onClick={editHandler}
          className={`text-text-neutral-secondary ${iconBtnStyle}`}
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          aria-label={`${employee.name} ${t("calculator.employee_list.remove_employee_title")}`}
          onClick={removeHandler}
          className={`text-text-state-error ${iconBtnStyle}`}
        >
          <Trash size={16} />
        </button>
      </div>
    </div>
  );
};

/**
 * Info: (20260901 - Julian) 選擇員工的彈窗，兼員工名單的管理入口。
 *
 * 原本管理（新增／編輯／移除）在獨立的員工列表頁，選人在這裡 —— 同一份名單兩個地方看。
 * 那一頁移除之後，管理併進來：列上多了編輯與刪除，工具列多了新增，
 * 沿用既有的 `EmployeeActionModal` 與 `RemoveEmployeeModal`，沒有新的對話框。
 */
const EmployeeListModal: FC<IEmployeeListModalProps> = ({
  accountBookId,
  modalVisibleHandler,
}) => {
  const { t } = useTranslation();

  const [keyword, setKeyword] = useState<string>("");
  const {
    employees,
    isLoading,
    hasError,
    createEmployee,
    updateEmployee,
    removeEmployee,
  } = useSalaryEmployees(accountBookId);

  // Info: (20260901 - Julian) null = 沒開；'add' 或某位員工 = 開著新增／編輯
  const [editing, setEditing] = useState<
    ISalaryCalculatorEmployee | "add" | null
  >(null);
  const [employeeToRemove, setEmployeeToRemove] =
    useState<ISalaryCalculatorEmployee | null>(null);

  /**
   * Info: (20260831 - Julian) 選人之後除了灌欄位，還要記住是哪一筆（linkEmployee）。
   * 那個 id 就是「按下儲存會存到誰身上」—— 原本只灌值不記 id，
   * 於是儲存時無從得知這次試算屬於誰。
   */
  const { linkEmployee } = useCalculatorCtx();

  const filteredEmployees = useMemo(() => {
    const trimmed = keyword.trim().toLowerCase();
    if (trimmed === "") return employees;

    return employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(trimmed) ||
        employee.number.toLowerCase().includes(trimmed),
    );
  }, [employees, keyword]);

  const changeKeyword = (e: ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };
  const clearKeyword = () => setKeyword("");

  const submitEmployeeHandler =
    editing !== null && editing !== "add"
      ? (input: Parameters<typeof createEmployee>[0]) =>
          updateEmployee(editing.id, input)
      : createEmployee;

  const addEmployeeBtn = (
    <button
      type="button"
      onClick={() => setEditing("add")}
      className="flex h-[40px] shrink-0 items-center justify-center gap-[6px] rounded-lg bg-orange-600 px-[16px] text-sm font-bold text-white transition-colors hover:bg-orange-700"
    >
      <Plus size={16} />
      {t("calculator.employee_list.add_employee")}
    </button>
  );

  const displayedEmployeesList = (() => {
    if (isLoading) {
      return (
        <p className="text-text-neutral-secondary py-[40px] text-center text-sm">
          {t("common.loading")}
        </p>
      );
    }

    if (hasError) {
      return (
        <p className="text-text-state-error py-[40px] text-center text-sm">
          {t("calculator.employee_list.load_failed")}
        </p>
      );
    }

    // Info: (20260901 - Julian) 一位員工都沒有：給一條建立第一位的路，而不只是「無資料」
    if (employees.length === 0) {
      return (
        <div className="flex flex-col items-center gap-[14px] px-[24px] py-[40px] text-center">
          <User size={28} className="text-text-brand-primary-lv1" />
          <p className="text-text-neutral-primary font-bold">
            {t("calculator.employee_list.empty_title")}
          </p>
          <p className="text-text-neutral-secondary text-sm leading-relaxed">
            {t("calculator.employee_list.empty_desc")}
          </p>
          {addEmployeeBtn}
        </div>
      );
    }

    // Info: (20260901 - Julian) 有員工但搜尋不到：留一條清除搜尋的路，不要看起來像資料掉了
    if (filteredEmployees.length === 0) {
      return (
        <div className="flex flex-col items-center gap-[10px] px-[24px] py-[40px] text-center">
          <Search size={24} className="text-text-neutral-tertiary" />
          <p className="text-text-neutral-primary text-sm font-semibold">
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
    }

    return filteredEmployees.map((employee) => (
      <EmployeeItem
        key={employee.id}
        employee={employee}
        pickHandler={() => {
          linkEmployee(employee);
          modalVisibleHandler();
        }}
        editHandler={() => setEditing(employee)}
        removeHandler={() => setEmployeeToRemove(employee)}
      />
    ));
  })();

  const hasAnyEmployee = !isLoading && !hasError && employees.length > 0;

  return (
    <>
      <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-[16px]">
        <div className="bg-surface-neutral-surface-lv2 relative flex max-h-[90vh] w-[90vw] flex-col rounded-2xl md:w-[560px]">
          {/* Info: (20250711 - Julian) Modal Header */}
          <div className="relative flex shrink-0 items-start justify-center px-[40px] py-[16px]">
            <h2 className="text-card-text-primary text-lg font-bold">
              {t("calculator.employee_list.main_title")}
            </h2>
            <button
              type="button"
              aria-label={t("common.cancel")}
              onClick={modalVisibleHandler}
              className={`text-text-neutral-secondary absolute right-[16px] ${iconBtnStyle}`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Info: (20250711 - Julian) Search bar */}
          {hasAnyEmployee && (
            <div className="flex shrink-0 items-center gap-[12px] px-[24px] pb-[16px]">
              <div className="border-input-stroke-input flex flex-1 items-center rounded-lg border">
                <div className="text-icon-surface-single-color-primary px-[12px] py-[10px]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  aria-label={t("calculator.employee_list.search_placeholder")}
                  value={keyword}
                  onChange={changeKeyword}
                  placeholder={t("calculator.employee_list.search_placeholder")}
                  className="placeholder:text-input-text-input-placeholder w-full flex-1 bg-transparent px-[4px] py-[10px] outline-none"
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
              {addEmployeeBtn}
            </div>
          )}

          {/* Info: (20250711 - Julian) Employee list content */}
          <div className="divide-stroke-neutral-quaternary flex min-h-0 flex-1 flex-col divide-y overflow-y-auto">
            {displayedEmployeesList}
          </div>

          {hasAnyEmployee && (
            <p className="text-text-neutral-tertiary shrink-0 px-[24px] py-[12px] text-xs">
              {keyword === ""
                ? t("calculator.employee_list.total_count", {
                    count: employees.length,
                  })
                : t("calculator.employee_list.filtered_count", {
                    count: filteredEmployees.length,
                    total: employees.length,
                  })}
            </p>
          )}
        </div>
      </div>

      {/* Info: (20260901 - Julian) 新增／編輯員工：沿用員工列表頁原本用的那一個 */}
      {editing !== null && (
        <EmployeeActionModal
          type={editing === "add" ? "add" : "edit"}
          data={editing === "add" ? null : editing}
          modalVisibleHandler={() => setEditing(null)}
          submitHandler={submitEmployeeHandler}
        />
      )}

      {/* Info: (20260901 - Julian) 移除員工確認 */}
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

export default EmployeeListModal;
