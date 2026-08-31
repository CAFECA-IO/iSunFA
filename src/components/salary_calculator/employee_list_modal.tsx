"use client";

import { useState, FC, KeyboardEvent, ChangeEvent, useMemo } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { X, Search, User, Hash } from "lucide-react";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { useSalaryEmployees } from "@/hooks/use_salary_employees";
import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";

interface IEmployeeListModalProps {
  accountBookId: string;
  modalVisibleHandler: () => void;
}

const EmployeeItem: FC<{
  employee: ISalaryCalculatorEmployee;
  handleClick: () => void;
}> = ({ employee, handleClick }) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      key={employee.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className="group bg-surface-neutral-surface-lv2 hover:bg-surface-brand-primary-soft flex items-center px-[24px] py-[12px] hover:cursor-pointer"
    >
      <div className="flex flex-1 items-center gap-[8px]">
        <User
          size={16}
          className="text-text-neutral-tertiary group-hover:text-text-neutral-primary"
        />
        <p className="text-text-neutral-secondary group-hover:text-text-neutral-primary font-medium">
          {employee.name}
        </p>
      </div>
      <div className="flex items-center gap-[8px] text-sm font-medium">
        <Hash
          size={16}
          className="text-text-neutral-tertiary group-hover:text-text-neutral-primary"
        />
        <p className="text-text-neutral-secondary group-hover:text-text-neutral-primary">
          {employee.number}
        </p>
      </div>
    </div>
  );
};

const EmployeeListModal: FC<IEmployeeListModalProps> = ({
  accountBookId,
  modalVisibleHandler,
}) => {
  const { t } = useTranslation();

  const [keyword, setKeyword] = useState<string>("");
  const { employees, isLoading } = useSalaryEmployees(accountBookId);

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

  const displayedEmployeesList = (() => {
    if (isLoading) {
      return (
        <div className="p-[20px]">
          <p className="text-text-neutral-secondary text-center">
            {t("common.loading")}
          </p>
        </div>
      );
    }

    if (filteredEmployees.length === 0) {
      return (
        <div className="p-[20px]">
          <p className="text-text-neutral-secondary text-center">
            {t("calculator.employee_list.no_data")}
          </p>
        </div>
      );
    }

    return filteredEmployees.map((employee) => {
      // Info: (20250711 - Julian) 填入員工資料並記住連結的員工 id
      const handleClick = () => {
        linkEmployee(employee);
        modalVisibleHandler();
      };

      return (
        <EmployeeItem
          key={employee.id}
          employee={employee}
          handleClick={handleClick}
        />
      );
    });
  })();

  return (
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="bg-surface-neutral-surface-lv2 relative flex w-[90vw] flex-col rounded-2xl md:w-[440px]">
        {/* Info: (20250711 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-[40px] py-[16px]">
          <h2 className="text-card-text-primary text-lg font-bold">
            {t("calculator.employee_list.main_title")}
          </h2>
          <button
            type="button"
            onClick={modalVisibleHandler}
            className="absolute right-[20px]"
          >
            <X scale={24} />
          </button>
        </div>
        {/* Info: (20250711 - Julian) Modal Body */}
        <div className="flex flex-col gap-[24px] px-[40px] py-[24px]">
          {/* Info: (20250711 - Julian) Search bar */}
          <div className="border-input-stroke-input flex items-center rounded-lg border">
            <div className="text-icon-surface-single-color-primary px-[12px] py-[10px]">
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
          </div>
          {/* Info: (20250711 - Julian) Employee list content */}
          <div className="divide-stroke-neutral-quaternary flex max-h-[500px] flex-col divide-y overflow-y-auto pb-[30px]">
            {displayedEmployeesList}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeListModal;
