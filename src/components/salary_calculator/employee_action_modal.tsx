"use client";

import { useState, FC, ChangeEvent } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { ApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  ISalaryCalculatorEmployee,
  ISalaryCalculatorEmployeeWriteInput,
} from "@/interfaces/salary_record";
import AmountInput from "@/components/salary_calculator/amount_input";
import { User, X, Plus, Check, Loader2 } from "lucide-react";

interface IEmployeeActionModalProps {
  type: "add" | "edit";
  data: ISalaryCalculatorEmployee | null;
  modalVisibleHandler: () => void;
  // Info: (20260831 - Julian) 由呼叫端決定要打 POST 還是 PUT；失敗時 reject，讓這裡顯示訊息
  submitHandler: (input: ISalaryCalculatorEmployeeWriteInput) => Promise<void>;
}

const EmployeeActionModal: FC<IEmployeeActionModalProps> = ({
  type,
  data,
  modalVisibleHandler,
  submitHandler,
}) => {
  const { t } = useTranslation();

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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");

  /**
   * Info: (20260831 - Julian) 編號是身分（帳本內唯一）故必填；Email 只在寄薪資單時要用，
   * 可以留白 —— 但填了就必須是合法格式。
   */
  const submitDisabled =
    !nameInput ||
    !numberInput ||
    !isEmailValid ||
    baseSalaryInput === 0 ||
    isSubmitting;

  // Info: (20250715 - Julian) 根據 type 設定標題文字
  const isAdd = type === "add";
  const titleStr = isAdd
    ? t("calculator.employee_list.add_employee")
    : t("calculator.employee_list.edit_employee");
  const submitLabel = isAdd
    ? t("calculator.employee_list.add_employee")
    : t("calculator.employee_list.save_changes");

  const changeNameHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setNameInput(e.target.value);
  };
  const changeNumberHandler = (e: ChangeEvent<HTMLInputElement>) => {
    setNumberInput(e.target.value);
  };
  const changeEmailHandler = (e: ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setEmailInput(email);

    // Info: (20250715 - Julian) Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(emailRegex.test(email));
  };

  const clickSubmitHandler = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      await submitHandler({
        name: nameInput.trim(),
        number: numberInput.trim(),
        email: emailInput.trim() || undefined,
        baseSalary: baseSalaryInput,
        mealAllowance: mealAllowanceInput,
      });
      modalVisibleHandler();
    } catch (error) {
      /**
       * Info: (20260831 - Julian) 編號撞號是使用者的輸入問題，要指回那個欄位；
       * 其他錯誤才給一句通用訊息。後端回的是 CF_SALARY_EMPLOYEE_NUMBER_TAKEN（409）。
       */
      const isNumberTaken =
        error instanceof ApiError &&
        (error.data as { errorCode?: string } | null)?.errorCode ===
          API_ERRORS.CF_SALARY_EMPLOYEE_NUMBER_TAKEN.code;

      setSubmitError(
        isNumberTaken
          ? t("calculator.employee_list.number_taken")
          : t("calculator.employee_list.save_failed"),
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="bg-surface-neutral-surface-lv2 relative flex w-[90vw] flex-col rounded-2xl md:w-[450px]">
        {/* Info: (20250715 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-[40px] py-[16px]">
          <h2 className="text-card-text-primary text-lg font-bold">
            {titleStr}
          </h2>
          <button
            type="button"
            onClick={modalVisibleHandler}
            className="absolute right-[20px]"
          >
            <X scale={24} />
          </button>
        </div>
        {/* Info: (20250715 - Julian) Modal Body */}
        <div className="flex flex-col gap-[24px] px-[40px] py-[24px]">
          {/* Info: (20250715 - Julian) Employee Name Input */}
          <div className="flex flex-col gap-[8px]">
            <p className="text-input-text-primary text-sm font-semibold">
              {t("calculator.employee_list.name")}{" "}
              <span className="text-text-state-error">*</span>
            </p>
            <div className="border-input-stroke-input flex items-center rounded-lg border">
              <div className="text-text-neutral-tertiary p-[10px]">
                <User size={16} />
              </div>
              <input
                type="text"
                aria-label={t("calculator.employee_list.name")}
                value={nameInput}
                onChange={changeNameHandler}
                className="placeholder:text-input-text-input-placeholder flex-1 bg-transparent px-[12px] py-[10px] outline-none"
                placeholder={t("calculator.employee_list.name_placeholder")}
              />
            </div>
          </div>
          {/* Info: (20250715 - Julian) Employee Number Input */}
          <div className="flex flex-col gap-[8px]">
            <p className="text-input-text-primary text-sm font-semibold">
              {t("calculator.employee_list.number")}
            </p>
            <div className="border-input-stroke-input flex items-center rounded-lg border">
              <input
                type="text"
                aria-label={t("calculator.employee_list.number")}
                value={numberInput}
                onChange={changeNumberHandler}
                className="placeholder:text-input-text-input-placeholder flex-1 bg-transparent px-[12px] py-[10px] outline-none"
                placeholder={t("calculator.employee_list.number_placeholder")}
              />
            </div>
          </div>
          {/* Info: (20250715 - Julian) Base Salary Input */}
          <div className="flex flex-col gap-[8px]">
            <AmountInput
              title={t("calculator.base_pay_form.base_salary")}
              value={baseSalaryInput}
              setValue={setBaseSalaryInput}
              minimum={0}
              required
            />
          </div>
          {/* Info: (20250715 - Julian) Meal Allowance Input */}
          <div className="flex flex-col gap-[8px]">
            <AmountInput
              title={t("calculator.base_pay_form.meal_allowance")}
              value={mealAllowanceInput}
              setValue={setMealAllowanceInput}
              minimum={0}
            />
          </div>
          {/* Info: (20250715 - Julian) Email Input */}
          <div className="flex flex-col gap-[8px]">
            <p className="text-input-text-primary text-sm font-semibold">
              {t("calculator.employee_list.email")}{" "}
              <span className="text-text-state-error">*</span>
            </p>
            <div
              className={`flex items-center rounded-lg border ${isEmailValid ? "border-input-stroke-input" : "border-text-state-error text-input-text-error"}`}
            >
              <input
                type="text"
                aria-label={t("calculator.employee_list.email")}
                value={emailInput}
                onChange={changeEmailHandler}
                className="placeholder:text-input-text-input-placeholder flex-1 bg-transparent px-[12px] py-[10px] outline-none"
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
        {/* Info: (20260831 - Julian) 送出失敗的訊息就地顯示，不依賴不存在的 Toast 系統 */}
        {submitError && (
          <p className="text-text-state-error px-[40px] text-sm font-medium">
            {submitError}
          </p>
        )}
        {/* Info: (20250715 - Julian) Modal Footer */}
        <div className="flex items-center gap-[12px] px-[20px] py-[16px]">
          <button
            type="button"
            className="w-full"
            onClick={modalVisibleHandler}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="w-full"
            disabled={submitDisabled}
            onClick={clickSubmitHandler}
          >
            {/* Info: (20260831 - Julian) 編輯模式原本也顯示「新增員工」，一併修掉 */}
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isAdd ? (
              <Plus size={16} />
            ) : (
              <Check size={16} />
            )}
            <p>{submitLabel}</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeActionModal;
