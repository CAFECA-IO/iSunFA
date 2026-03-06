"use client";

import React, { useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { IEmployeeForCalc } from "@/interfaces/employees";
import AmountInput from "@/components/salary_calculator/amount_input";
import { User, X, Plus } from "lucide-react";

interface IEmployeeActionModalProps {
  type: "add" | "edit";
  data: IEmployeeForCalc | null;
  modalVisibleHandler: () => void;
}

const EmployeeActionModal: React.FC<IEmployeeActionModalProps> = ({
  type,
  data,
  modalVisibleHandler,
}) => {
  const { t } = useTranslation();

  // ToDo: (20260224 - Julian) =========== 這裡要實作 Toast
  // const { toastHandler } = useModalContext();

  // Info: (20250715 - Julian) 編輯時應有預設值，新增時則為空
  const defaultName = data?.name || "";
  const defaultNumber = data?.number || "";
  const defaultBaseSalary = data?.baseSalary || 0;
  const defaultMealAllowance = data?.mealAllowance || 0;
  const defaultEmail = data?.email || "";

  const [nameInput, setNameInput] = useState<string>(defaultName);
  const [numberInput, setNumberInput] = useState<string>(defaultNumber);
  const [baseSalaryInput, setBaseSalaryInput] =
    useState<number>(defaultBaseSalary);
  const [mealAllowanceInput, setMealAllowanceInput] =
    useState<number>(defaultMealAllowance);
  const [emailInput, setEmailInput] = useState<string>(defaultEmail);
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);

  const submitDisabled =
    !nameInput || !emailInput || !isEmailValid || baseSalaryInput === 0;

  // Info: (20250715 - Julian) 根據 type 設定標題文字
  const titleStr =
    type === "add"
      ? t("calculator.employee_list.add_employee")
      : t("calculator.employee_list.edit_employee");

  const changeNameHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameInput(e.target.value);
  };
  const changeNumberHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumberInput(e.target.value);
  };
  const changeEmailHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setEmailInput(email);

    // Info: (20250715 - Julian) Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(emailRegex.test(email));
  };

  const addEmployee = () => {
    // ToDo: (20250715 - Julian) Add employee API call logic here

    console.log("Employee added:", {
      name: nameInput,
      number: numberInput,
      baseSalary: baseSalaryInput,
      mealAllowance: mealAllowanceInput,
      email: emailInput,
    });

    // Info: (20250715 - Julian) 顯示成功提示
    // toastHandler({
    //   id: 'employee-add-success',
    //   type: ToastType.SUCCESS,
    //   content: t('calculator.employee_list.add_success_toast'),
    //   closeable: true,
    // });
  };

  const editEmployee = () => {
    // ToDo: (20250715 - Julian) Edit employee API call logic here

    console.log("Employee edited:", {
      id: data?.id,
      name: nameInput,
      number: numberInput,
      baseSalary: baseSalaryInput,
      mealAllowance: mealAllowanceInput,
      email: emailInput,
    });

    // Info: (20250715 - Julian) 顯示成功提示
    // toastHandler({
    //   id: 'employee-edit-success',
    //   type: ToastType.SUCCESS,
    //   content: t('calculator.employee_list.edit_success_toast'),
    //   closeable: true,
    // });
  };

  const submitHandler = () => {
    if (type === "add") {
      addEmployee();
    } else if (type === "edit" && data) {
      editEmployee();
    }
    modalVisibleHandler();
  };

  return (
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="w-90vw bg-surface-neutral-surface-lv2 md:w-450px relative flex flex-col rounded-sm">
        {/* Info: (20250715 - Julian) Modal Header */}
        <div className="px-40px py-16px relative flex items-start justify-center">
          <h2 className="text-card-text-primary text-lg font-bold">
            {titleStr}
          </h2>
          <button
            type="button"
            onClick={modalVisibleHandler}
            className="right-20px absolute"
          >
            <X scale={24} />
          </button>
        </div>
        {/* Info: (20250715 - Julian) Modal Body */}
        <div className="gap-24px px-40px py-24px flex flex-col">
          {/* Info: (20250715 - Julian) Employee Name Input */}
          <div className="gap-8px flex flex-col">
            <p className="text-input-text-primary text-sm font-semibold">
              {t("calculator.employee_list.name")}{" "}
              <span className="text-text-state-error">*</span>
            </p>
            <div className="border-input-stroke-input flex items-center rounded-sm border">
              <div className="p-10px text-text-neutral-tertiary">
                <User size={16} />
              </div>
              <input
                type="text"
                aria-label={t("calculator.employee_list.name")}
                value={nameInput}
                onChange={changeNameHandler}
                className="px-12px py-10px placeholder:text-input-text-input-placeholder flex-1 bg-transparent outline-none"
                placeholder={t("calculator.employee_list.name_placeholder")}
              />
            </div>
          </div>
          {/* Info: (20250715 - Julian) Employee Number Input */}
          <div className="gap-8px flex flex-col">
            <p className="text-input-text-primary text-sm font-semibold">
              {t("calculator.employee_list.number")}
            </p>
            <div className="border-input-stroke-input flex items-center rounded-sm border">
              <input
                type="text"
                aria-label={t("calculator.employee_list.number")}
                value={numberInput}
                onChange={changeNumberHandler}
                className="px-12px py-10px placeholder:text-input-text-input-placeholder flex-1 bg-transparent outline-none"
                placeholder={t("calculator.employee_list.number_placeholder")}
              />
            </div>
          </div>
          {/* Info: (20250715 - Julian) Base Salary Input */}
          <div className="gap-8px flex flex-col">
            <AmountInput
              title={t("calculator.base_pay_form.base_salary")}
              value={baseSalaryInput}
              setValue={setBaseSalaryInput}
              minimum={0}
              required
            />
          </div>
          {/* Info: (20250715 - Julian) Meal Allowance Input */}
          <div className="gap-8px flex flex-col">
            <AmountInput
              title={t("calculator.base_pay_form.meal_allowance")}
              value={mealAllowanceInput}
              setValue={setMealAllowanceInput}
              minimum={0}
            />
          </div>
          {/* Info: (20250715 - Julian) Email Input */}
          <div className="gap-8px flex flex-col">
            <p className="text-input-text-primary text-sm font-semibold">
              {t("calculator.employee_list.email")}{" "}
              <span className="text-text-state-error">*</span>
            </p>
            <div
              className={`flex items-center rounded-sm border ${isEmailValid ? "border-input-stroke-input" : "border-text-state-error text-input-text-error"}`}
            >
              <input
                type="text"
                aria-label={t("calculator.employee_list.email")}
                value={emailInput}
                onChange={changeEmailHandler}
                className="px-12px py-10px placeholder:text-input-text-input-placeholder flex-1 bg-transparent outline-none"
                placeholder={t("calculator.employee_list.email_placeholder")}
              />
            </div>
            <p
              className={`text-text-state-error text-right text-sm font-medium ${isEmailValid ? "opacity-0" : "opacity-100"}`}
            >
              {t("calculator.employee_list.email_valid")}
            </p>
          </div>
        </div>
        {/* Info: (20250715 - Julian) Modal Footer */}
        <div className="gap-12px px-20px py-16px flex items-center">
          <button className="w-full" onClick={modalVisibleHandler}>
            {t("common.cancel")}
          </button>
          <button
            className="w-full"
            disabled={submitDisabled}
            onClick={submitHandler}
          >
            <Plus size={16} />
            <p>{t("calculator.employee_list.add_employee")}</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeActionModal;
