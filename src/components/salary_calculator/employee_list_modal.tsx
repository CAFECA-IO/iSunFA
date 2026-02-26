import React, { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { X, Search, User, Hash } from "lucide-react";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { dummyEmployeeForCalc, IEmployeeForCalc } from "@/interfaces/employees";

interface IEmployeeListModalProps {
  modalVisibleHandler: () => void;
}

const EmployeeItem: React.FC<{
  employee: IEmployeeForCalc;
  handleClick: () => void;
}> = ({ employee, handleClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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
      className="group flex items-center bg-surface-neutral-surface-lv2 px-24px py-12px hover:cursor-pointer hover:bg-surface-brand-primary-soft"
    >
      <div className="flex flex-1 items-center gap-8px">
        <User
          size={16}
          className="text-text-neutral-tertiary group-hover:text-text-neutral-primary"
        />
        <p className="font-medium text-text-neutral-secondary group-hover:text-text-neutral-primary">
          {employee.name}
        </p>
      </div>
      <div className="flex items-center gap-8px text-sm font-medium">
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

const EmployeeListModal: React.FC<IEmployeeListModalProps> = ({
  modalVisibleHandler,
}) => {
  const { t } = useTranslation();

  const [keyword, setKeyword] = useState<string>("");
  const {
    changeEmployeeName,
    changeEmployeeNumber,
    changeEmployeeEmail,
    setBaseSalary,
  } = useCalculatorCtx();

  // Info: (20250711 - Julian) Get data from API
  const employeesList = dummyEmployeeForCalc.filter(
    (employee) =>
      employee.name.toLowerCase().includes(keyword.toLowerCase()) ||
      employee.number?.toLowerCase().includes(keyword.toLowerCase()),
  );

  // ToDo: (20250711 - Julian) Search by keyword
  const changeKeyword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value);
  };

  const displayedEmployeesList =
    employeesList.length > 0 ? (
      employeesList.map((employee) => {
        // Info: (20250711 - Julian) 填入員工姓名、編號和本薪
        const handleClick = () => {
          changeEmployeeName(employee.name);
          changeEmployeeNumber(employee.number ?? "");
          changeEmployeeEmail(employee.email);
          setBaseSalary(employee.baseSalary);
          modalVisibleHandler();
        };

        return (
          <EmployeeItem
            key={employee.id}
            employee={employee}
            handleClick={handleClick}
          />
        );
      })
    ) : (
      <div className="p-20px">
        <p className="text-center text-text-neutral-secondary">
          {t("calculator.employee_list.no_data")}
        </p>
      </div>
    );

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex w-90vw flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-440px">
        {/* Info: (20250711 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-40px py-16px">
          <h2 className="text-lg font-bold text-card-text-primary">
            {t("calculator.employee_list.main_title")}
          </h2>
          <button
            type="button"
            onClick={modalVisibleHandler}
            className="absolute right-20px"
          >
            <X scale={24} />
          </button>
        </div>
        {/* Info: (20250711 - Julian) Modal Body */}
        <div className="flex flex-col gap-24px px-40px py-24px">
          {/* Info: (20250711 - Julian) Search bar */}
          <div className="flex items-center rounded-sm border border-input-stroke-input">
            <div className="px-12px py-10px text-icon-surface-single-color-primary">
              <Search size={16} />
            </div>
            <input
              type="text"
              aria-label={t("calculator.employee_list.search_placeholder")}
              value={keyword}
              onChange={changeKeyword}
              placeholder={t("calculator.employee_list.search_placeholder")}
              className="flex-1 bg-transparent px-12px py-10px outline-none placeholder:text-input-text-input-placeholder"
            />
          </div>
          {/* Info: (20250711 - Julian) Employee list content */}
          <div className="flex max-h-500px flex-col divide-y divide-stroke-neutral-quaternary overflow-y-auto pb-30px">
            {displayedEmployeesList}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeListModal;
