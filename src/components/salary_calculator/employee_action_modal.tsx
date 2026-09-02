"use client";

import { useState, FC, ChangeEvent, ReactNode } from "react";
import { ISalaryEmployeeProfile } from "@/interfaces/salary_record";
import {
  DEFAULT_EMPLOYEE_PROFILE,
  EMPLOYMENT_TYPE_KEYS,
  employmentTypeI18nKey,
  fromDateInputValue,
  toDateInputValue,
} from "@/lib/utils/salary_employee_profile";
import { INDUSTRY_CATEGORY_OPTIONS } from "@/constants/industry_category";
import {
  MAX_PENSION_RATE_PERCENT,
  MIN_PENSION_RATE_PERCENT,
} from "@/lib/utils/salary_pension_rate";
import ToggleSwitch from "@/components/salary_calculator/toggle_switch";
import { useTranslation } from "@/i18n/i18n_context";
import { ApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  ISalaryCalculatorEmployee,
  ISalaryCalculatorEmployeeWriteInput,
} from "@/interfaces/salary_record";
import AmountInput from "@/components/salary_calculator/amount_input";
import { User, X, Plus, Check, Loader2 } from "lucide-react";

// Info: (20260902 - Julian) 欄位元件
const FormSection: FC<{ title: string; children: ReactNode }> = ({
  title,
  children,
}) => (
  <div className="flex flex-col gap-[16px]">
    <p className="text-text-neutral-tertiary border-stroke-neutral-quaternary border-b pb-[6px] text-xs font-bold tracking-wide">
      {title}
    </p>
    {children}
  </div>
);

const FieldLabel: FC<{ text: string; required?: boolean }> = ({
  text,
  required = false,
}) => (
  <p className="text-input-text-primary text-sm font-semibold">
    {text} {required && <span className="text-text-state-error">*</span>}
  </p>
);

const selectStyle =
  "border-input-stroke-input w-full rounded-lg border bg-transparent px-[12px] py-[10px] text-sm outline-none";

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

  /**
   * Info: (20260902 - Julian) 這張表單沒有介面的那 13 個常態欄位。
   *
   * 編輯：取這個人現在的值；新增：取預設值。兩者都只是**原樣帶回去**，
   * 因為 `ISalaryCalculatorEmployeeWriteInput` 是整組必填（少一欄會靜靜落到
   * schema 的 `@default`）。`baseSalary` / `mealAllowance` 由下面的輸入框覆蓋。
   */
  const baseProfile: ISalaryEmployeeProfile = data ?? DEFAULT_EMPLOYEE_PROFILE;

  const [nameInput, setNameInput] = useState<string>(defaultName);
  const [numberInput, setNumberInput] = useState<string>(defaultNumber);
  const [baseSalaryInput, setBaseSalaryInput] =
    useState<number>(defaultBaseSalary);
  const [mealAllowanceInput, setMealAllowanceInput] =
    useState<number>(defaultMealAllowance);
  const [emailInput, setEmailInput] = useState<string>(defaultEmail);
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);

  /**
   * Info: (20260902 - Julian) 其餘 13 個常態欄位的編輯狀態。
   *
   * 整組放一個 state 而不是 13 個 `useState`：它們一起被送出、一起被比對，
   * 而且 `ISalaryEmployeeProfile` 加一欄時這裡會編譯失敗而不是靜靜漏掉。
   * `baseSalary` / `mealAllowance` 另有自己的輸入框（`AmountInput` 收的是 setter），
   * 送出時由那兩個覆蓋。
   */
  const [profile, setProfile] = useState<ISalaryEmployeeProfile>(baseProfile);

  const patchProfile = (patch: Partial<ISalaryEmployeeProfile>) =>
    setProfile((prev) => ({ ...prev, ...patch }));

  /**
   * Info: (20260902 - Julian) `AmountInput` 的 `setValue` 收的是 `Dispatch<SetStateAction<number>>`
   * —— 它有可能傳一個 updater function 進來，不一定是值。
   * 直接寫 `(value) => patchProfile({ x: value })` 會在型別上炸，
   * 而硬轉型會讓「傳 updater 的那一次」靜靜寫進一個 function。
   */
  const amountSetter =
    (field: "otherAllowanceTaxable" | "otherAllowanceTaxFree") =>
    (next: number | ((prev: number) => number)) =>
      setProfile((prev) => ({
        ...prev,
        [field]: typeof next === "function" ? next(prev[field]) : next,
      }));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");

  /**
   * Info: (20260831 - Julian) 編號是身分（帳本內唯一）故必填；Email 只在寄薪資單時要用，
   * 可以留白 —— 但填了就必須是合法格式。
   */
  /**
   * Info: (20260902 - Julian) 離職日不得早於到職日。
   *
   * 兩個值都合法、只是順序反了 —— 後端有一條 `.refine` 會擋，但那時使用者
   * 看到的是一句通用的儲存失敗。在這裡先擋住，並指出是哪兩格。
   */
  const isDateOrderInvalid =
    profile.hireDate !== null &&
    profile.resignDate !== null &&
    profile.resignDate < profile.hireDate;

  const submitDisabled =
    !nameInput ||
    !numberInput ||
    !isEmailValid ||
    baseSalaryInput === 0 ||
    isDateOrderInvalid ||
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
      /**
       * Info: (20260902 - Julian) 常態屬性整組送出（`ISalaryCalculatorEmployeeWriteInput`
       * 是整組必填）。少一欄會靜靜落到 schema 的 `@default` —— 也就是
       * 「改個名字，順便把他的投保狀態、扶養人數、到職日全部重設」。
       *
       * 兩個金額走各自的 `AmountInput`，所以擺在 `...profile` 之後覆蓋掉它。
       */
      await submitHandler({
        ...profile,
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
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-[16px]">
      {/* Info: (20260901 - Julian) 五個欄位在矮視窗會超出畫面，比照其他彈窗限高 + 內容可捲 */}
      <div className="bg-surface-neutral-surface-lv2 relative flex max-h-[90vh] w-[90vw] flex-col rounded-2xl md:w-[450px]">
        {/* Info: (20250715 - Julian) Modal Header */}
        <div className="relative flex shrink-0 items-start justify-center px-[40px] py-[16px]">
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
        <div className="flex min-h-0 flex-1 flex-col gap-[28px] overflow-y-auto px-[20px] pb-[8px] md:px-[40px]">
          <FormSection title={t("calculator.employee_list.section_identity")}>
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
                {t("calculator.employee_list.number")}{" "}
                {/* Info: (20260901 - Julian) 編號改成身分鍵之後就是必填，星號要跟著搬過來 */}
                <span className="text-text-state-error">*</span>
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
            {/* Info: (20250715 - Julian) Email Input */}
            <div className="flex flex-col gap-[8px]">
              <p className="text-input-text-primary text-sm font-semibold">
                {/* Info: (20260901 - Julian) Email 改成可空（不少員工沒有公司信箱），不再標必填 */}
                {t("calculator.employee_list.email")}
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
          </FormSection>

          {/* Info: (20260902 - Julian) 薪資：四個會被自動帶進計算機的金額 */}
          <FormSection title={t("calculator.employee_list.section_pay")}>
            <AmountInput
              title={t("calculator.base_pay_form.base_salary")}
              value={baseSalaryInput}
              setValue={setBaseSalaryInput}
              minimum={0}
              required
            />
            <AmountInput
              title={t("calculator.base_pay_form.meal_allowance")}
              value={mealAllowanceInput}
              setValue={setMealAllowanceInput}
              minimum={0}
            />
            {/**
             * Info: (20260902 - Julian) 其他加給是**固定職務加給**（產品決策 20260902）。
             * 當月的獎金不填在這裡 —— 那要在計算機上當次輸入，否則下個月會跟著帶出來。
             */}
            <AmountInput
              title={t("calculator.employee_list.other_allowance_taxable")}
              value={profile.otherAllowanceTaxable}
              setValue={amountSetter("otherAllowanceTaxable")}
              minimum={0}
            />
            <AmountInput
              title={t("calculator.employee_list.other_allowance_tax_free")}
              value={profile.otherAllowanceTaxFree}
              setValue={amountSetter("otherAllowanceTaxFree")}
              minimum={0}
            />
            <p className="text-text-neutral-tertiary text-xs leading-relaxed">
              {t("calculator.employee_list.other_allowance_hint")}
            </p>
          </FormSection>

          {/* Info: (20260902 - Julian) 投保與勞退 */}
          <FormSection title={t("calculator.employee_list.section_insurance")}>
            <ToggleSwitch
              isOn={profile.isLaborInsured}
              handleToggle={() =>
                patchProfile({ isLaborInsured: !profile.isLaborInsured })
              }
              title={t("calculator.others_form.option_labor_insurance")}
            />
            <ToggleSwitch
              isOn={profile.isHealthInsured}
              handleToggle={() =>
                patchProfile({ isHealthInsured: !profile.isHealthInsured })
              }
              title={t("calculator.others_form.option_nhi")}
            />
            <ToggleSwitch
              isOn={profile.isPensionInsured}
              handleToggle={() =>
                patchProfile({ isPensionInsured: !profile.isPensionInsured })
              }
              title={t("calculator.others_form.option_labor_pension")}
            />
            <div className="flex flex-col gap-[8px]">
              <FieldLabel
                text={t("calculator.others_form.number_of_dependents")}
              />
              <input
                type="number"
                min={0}
                max={20}
                aria-label={t("calculator.others_form.number_of_dependents")}
                value={profile.dependentsCount}
                onChange={(e) =>
                  patchProfile({
                    // Info: (20260902 - Julian) 清空輸入框時 value 是 ""，Number("") 是 0 —— 這裡要的就是 0
                    dependentsCount: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="border-input-stroke-input w-full rounded-lg border bg-transparent px-[12px] py-[10px] outline-none"
              />
            </div>
            <div className="flex flex-col gap-[8px]">
              <FieldLabel
                text={t("calculator.employee_list.voluntary_pension_rate")}
              />
              {/**
               * Info: (20260902 - Julian) 存的是**百分點整數**（0–6），不是 0.06 那個小數。
               * 小數是計算機 UI 那一側的表示法，轉換在 `salary_pension_rate.ts`。
               */}
              <select
                aria-label={t(
                  "calculator.employee_list.voluntary_pension_rate",
                )}
                value={profile.voluntaryPensionRate}
                onChange={(e) =>
                  patchProfile({
                    voluntaryPensionRate: Number(e.target.value),
                  })
                }
                className={selectStyle}
              >
                {Array.from(
                  {
                    length:
                      MAX_PENSION_RATE_PERCENT - MIN_PENSION_RATE_PERCENT + 1,
                  },
                  (_, index) => MIN_PENSION_RATE_PERCENT + index,
                ).map((percent) => (
                  <option key={percent} value={percent}>
                    {percent}%
                  </option>
                ))}
              </select>
            </div>
          </FormSection>

          {/* Info: (20260902 - Julian) 其他常態屬性 */}
          <FormSection title={t("calculator.employee_list.section_other")}>
            <div className="flex flex-col gap-[8px]">
              <FieldLabel
                text={t("calculator.basic_info_form.industry_category")}
              />
              <select
                aria-label={t("calculator.basic_info_form.industry_category")}
                value={profile.industryCode}
                onChange={(e) =>
                  patchProfile({ industryCode: Number(e.target.value) })
                }
                className={selectStyle}
              >
                {INDUSTRY_CATEGORY_OPTIONS.map((item) => (
                  <option key={item.CODE} value={item.CODE}>
                    {item.CODE} {item.INDUSTRY}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-[8px]">
              <FieldLabel
                text={t("calculator.basic_info_form.tax_residency_status")}
              />
              <select
                aria-label={t(
                  "calculator.basic_info_form.tax_residency_status",
                )}
                value={profile.isForeignWorker ? "non_taiwan" : "taiwan"}
                onChange={(e) =>
                  patchProfile({ isForeignWorker: e.target.value !== "taiwan" })
                }
                className={selectStyle}
              >
                <option value="taiwan">
                  {t("calculator.basic_info_form.residency_option_taiwan")}
                </option>
                <option value="non_taiwan">
                  {t("calculator.basic_info_form.residency_option_non_taiwan")}
                </option>
              </select>
            </div>
            <div className="flex flex-col gap-[8px]">
              <FieldLabel
                text={t("calculator.employee_list.employment_type")}
              />
              {/**
               * Info: (20260902 - Julian) value 是 enum 的**鍵**（"FULL_TIME"），
               * 顯示才是 i18n 的字串。存值的話字典一改資料庫就會有兩種寫法。
               */}
              <select
                aria-label={t("calculator.employee_list.employment_type")}
                value={profile.employmentType}
                onChange={(e) =>
                  patchProfile({ employmentType: e.target.value })
                }
                className={selectStyle}
              >
                {EMPLOYMENT_TYPE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(employmentTypeI18nKey(key))}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-[8px]">
              <FieldLabel
                text={t("calculator.basic_info_form.payroll_days_base")}
              />
              <select
                aria-label={t("calculator.basic_info_form.payroll_days_base")}
                value={profile.baseSalary30Days ? "fixed" : "actual"}
                onChange={(e) =>
                  patchProfile({ baseSalary30Days: e.target.value === "fixed" })
                }
                className={selectStyle}
              >
                <option value="fixed">
                  {t("calculator.basic_info_form.payroll_option_fixed")}
                </option>
                <option value="actual">
                  {t("calculator.basic_info_form.payroll_option_actual")}
                </option>
              </select>
            </div>
            {/**
             * Info: (20260902 - Julian) 到職／離職日存的是**完整日期**，不是「當月第幾號」。
             * 計算機上那兩格由這裡推導出來，而且連結員工之後是唯讀的 ——
             * 這裡是它們唯一的編輯入口。
             */}
            <div className="flex flex-col gap-[8px]">
              <FieldLabel text={t("calculator.employee_list.hire_date")} />
              <input
                type="date"
                aria-label={t("calculator.employee_list.hire_date")}
                value={toDateInputValue(profile.hireDate)}
                onChange={(e) =>
                  patchProfile({ hireDate: fromDateInputValue(e.target.value) })
                }
                className="border-input-stroke-input w-full rounded-lg border bg-transparent px-[12px] py-[10px] outline-none"
              />
            </div>
            <div className="flex flex-col gap-[8px]">
              <FieldLabel text={t("calculator.employee_list.resign_date")} />
              <input
                type="date"
                aria-label={t("calculator.employee_list.resign_date")}
                value={toDateInputValue(profile.resignDate)}
                // Info: (20260902 - Julian) 離職日不得早於到職日，後端也有一條 refine 在守
                min={toDateInputValue(profile.hireDate) || undefined}
                onChange={(e) =>
                  patchProfile({
                    resignDate: fromDateInputValue(e.target.value),
                  })
                }
                className="border-input-stroke-input w-full rounded-lg border bg-transparent px-[12px] py-[10px] outline-none"
              />
            </div>
            {isDateOrderInvalid && (
              <p className="text-text-state-error text-sm font-medium">
                {t("calculator.employee_list.date_order_error")}
              </p>
            )}
          </FormSection>
        </div>
        {/* Info: (20260831 - Julian) 送出失敗的訊息就地顯示，不依賴不存在的 Toast 系統 */}
        {submitError && (
          <p className="text-text-state-error px-[40px] text-sm font-medium">
            {submitError}
          </p>
        )}
        {/* Info: (20250715 - Julian) Modal Footer */}
        <div className="flex shrink-0 items-center gap-[12px] px-[20px] py-[16px]">
          <button
            type="button"
            className="text-text-neutral-secondary ring-stroke-neutral-quaternary hover:bg-surface-hover flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold ring-1 transition-colors disabled:opacity-60"
            onClick={modalVisibleHandler}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-[8px] rounded-xl bg-orange-600 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
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
