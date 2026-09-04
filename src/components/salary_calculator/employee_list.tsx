"use client";

import { ChangeEvent, FC, useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { Hash, Mail, Pencil, Plus, Search, Trash, User, X } from "lucide-react";
import { numberWithCommas } from "@/lib/utils/common";
import { useSalaryEmployees } from "@/hooks/use_salary_employees";
import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";
import {
  countMissingEmail,
  filterEmployees,
  hasNoEmail,
} from "@/lib/utils/salary_employee_filter";
import EmployeeActionModal from "@/components/salary_calculator/employee_action_modal";
import RemoveEmployeeModal from "@/components/salary_calculator/remove_employee_modal";

export const iconBtnStyle =
  "flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-hover";

/**
 * Info: (20260904 - Julian) 同一份名單的兩種呈現。
 *
 * - `modal`：計算機 Step 1 的挑人彈窗，寬 560px。放不下信箱，清單自己捲。
 * - `page`：`/salary_calculator/employee_list` 整頁。多一欄信箱與缺信箱的提示，
 *   捲動交給頁面。
 *
 * 用一個 `variant` 而不是三個布林（`withEmail` / `scrollList` / …）：那三件事
 * 從來不會各自變動，拆開只是讓「頁面版忘了打開其中一個」變成可能。
 */
export type IEmployeeListVariant = "modal" | "page";

interface IEmployeeListProps {
  accountBookId: string;
  variant: IEmployeeListVariant;
  /**
   * Info: (20260904 - Julian) 給了才是「挑人」模式：每一列的主要區域變成可按的選取鈕。
   *
   * 與 `variant` 分開，因為它真的獨立 —— 彈窗同時是挑人與管理的入口，
   * 而整頁只管理。把它併進 `variant` 的話，日後想在頁面上加「挑一位去試算」
   * 就得先把兩件事拆回來。
   */
  onPick?: (employee: ISalaryCalculatorEmployee) => void;
}

const EmployeeRow: FC<{
  employee: ISalaryCalculatorEmployee;
  withEmail: boolean;
  pickHandler?: () => void;
  editHandler: () => void;
  removeHandler: () => void;
}> = ({
  employee,
  withEmail,
  pickHandler = undefined,
  editHandler,
  removeHandler,
}) => {
  const { t } = useTranslation();
  const missingEmail = hasNoEmail(employee);

  const emailCell = missingEmail ? (
    /**
     * Info: (20260904 - Julian) 缺信箱的那一格**本身就是補上的入口**。
     *
     * 只標示不給路的話，使用者看到「未填寫」的下一個動作是回頭找那一列的鉛筆 ——
     * 而他已經把游標放在問題上了。這顆按鈕巢狀在列裡沒問題：整頁版的列不是
     * 按鈕（`pickHandler` 只有彈窗會傳），而彈窗版根本不顯示這一欄。
     */
    <button
      type="button"
      onClick={editHandler}
      className="flex items-center gap-[4px] rounded-md px-[6px] py-[2px] text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50"
    >
      <Mail size={14} className="shrink-0" />
      {t("calculator.employee_list.no_email")}
    </button>
  ) : (
    <span
      title={employee.email}
      className="text-text-neutral-secondary truncate text-sm"
    >
      {employee.email}
    </span>
  );

  const content = (
    <>
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
      {withEmail && (
        <span className="hidden w-[220px] justify-start md:flex">
          {emailCell}
        </span>
      )}
      <span
        title={t("calculator.employee_list.base_salary")}
        className="text-text-neutral-secondary group-hover:text-text-neutral-primary w-[90px] text-right text-sm font-semibold"
      >
        {numberWithCommas(employee.baseSalary)}
      </span>
    </>
  );

  const cellStyle =
    "flex flex-1 items-center gap-[8px] px-[12px] py-[12px] text-left md:px-[24px]";

  return (
    <div className="group hover:bg-surface-brand-primary-soft flex items-center">
      {/**
       * Info: (20260901 - Julian) 選人本身是一顆真的 `<button>`。
       *
       * 原本整列是 `div role="button"` 外加手寫的 onKeyDown；列上多了編輯與
       * 刪除兩顆按鈕之後，巢狀在可點擊的 div 裡會讓鍵盤焦點與點擊範圍互相打架。
       * 拆成三顆按鈕之後，鍵盤操作由瀏覽器負責。
       *
       * Info: (20260904 - Julian) 整頁版沒有「選人」這件事，所以不給 `pickHandler`
       * 的時候渲染的是 div —— 一顆按下去什麼都不會發生的按鈕，
       * 對鍵盤與螢幕閱讀器來說是雜訊。
       */}
      {pickHandler ? (
        <button type="button" onClick={pickHandler} className={cellStyle}>
          {content}
        </button>
      ) : (
        <div className={cellStyle}>{content}</div>
      )}

      <div className="flex items-center gap-[4px] pr-[8px] md:pr-[16px]">
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
 * Info: (20260904 - Julian) 帳本的員工名單：搜尋、新增、編輯、移除。
 *
 * 這份程式碼原本只活在挑人彈窗裡。20260904 補回獨立的員工列表頁時，
 * **沒有複製一份** —— 03fd6075e 移除舊頁的理由正是「同一份名單兩個地方看」，
 * 而那一頁與彈窗當時是兩份各自演化的實作（那一頁有新增，彈窗沒有；
 * 彈窗有搜尋，那一頁的搜尋壞掉沒人發現）。
 *
 * 所以這次的形狀是：一個元件、兩種 `variant`，頁面與彈窗渲染的是同一段程式碼。
 * `salary_employee_list_contract.test.ts` 釘住這件事。
 */
const EmployeeList: FC<IEmployeeListProps> = ({
  accountBookId,
  variant,
  onPick = undefined,
}) => {
  const { t } = useTranslation();
  const withEmail = variant === "page";

  const [keyword, setKeyword] = useState<string>("");
  const [onlyMissingEmail, setOnlyMissingEmail] = useState<boolean>(false);
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
   * Info: (20260904 - Julian) **刻意不包 `useMemo`。**
   *
   * 這份名單沒有分頁（數十人的量級，計劃書 §8.5），過濾成本遠低於
   * 「memo 的相依陣列漏了一項」帶來的靜默錯誤 —— 那會長成
   * 「打字了但列表不動」，而使用者只會以為搜尋壞了。
   */
  const filteredEmployees = filterEmployees(employees, {
    keyword,
    onlyMissingEmail,
  });
  const missingEmailCount = countMissingEmail(employees);

  const changeKeyword = (e: ChangeEvent<HTMLInputElement>) =>
    setKeyword(e.target.value);
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
          <User size={28} className="text-text-brand-primary-lv1 shrink-0" />
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

    // Info: (20260901 - Julian) 有員工但篩不到：留一條清除條件的路，不要看起來像資料掉了
    if (filteredEmployees.length === 0) {
      return (
        <div className="flex flex-col items-center gap-[10px] px-[24px] py-[40px] text-center">
          <Search size={24} className="text-text-neutral-tertiary" />
          <p className="text-text-neutral-primary text-sm font-semibold">
            {keyword.trim() === ""
              ? t("calculator.employee_list.no_filter_result")
              : t("calculator.employee_list.no_search_result", { keyword })}
          </p>
          <button
            type="button"
            onClick={() => {
              clearKeyword();
              setOnlyMissingEmail(false);
            }}
            className="text-text-brand-primary-lv1 text-sm font-semibold underline"
          >
            {t("calculator.employee_list.clear_search")}
          </button>
        </div>
      );
    }

    return filteredEmployees.map((employee) => (
      <EmployeeRow
        key={employee.id}
        employee={employee}
        withEmail={withEmail}
        pickHandler={onPick ? () => onPick(employee) : undefined}
        editHandler={() => setEditing(employee)}
        removeHandler={() => setEmployeeToRemove(employee)}
      />
    ));
  })();

  const hasAnyEmployee = !isLoading && !hasError && employees.length > 0;

  return (
    <>
      {/* Info: (20250711 - Julian) Search bar */}
      {hasAnyEmployee && (
        <div className="flex w-full shrink-0 flex-col gap-[12px] px-[24px] pb-[16px] md:flex-row md:items-center">
          <div className="border-input-stroke-input flex flex-1 items-center rounded-lg border">
            <div className="text-icon-surface-single-color-primary shrink-0 px-[12px] py-[10px]">
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
                className={`text-text-neutral-tertiary mr-[6px] shrink-0 ${iconBtnStyle}`}
              >
                <X size={16} />
              </button>
            )}
          </div>
          {addEmployeeBtn}
        </div>
      )}

      {/**
       * Info: (20260904 - Julian) 缺信箱的提示：**整頁版才有**。
       *
       * 這是這一頁補回來的主要理由。寄薪資單靠 email，沒填的人寄不出去，
       * 而在此之前唯一看得出「誰沒填」的方法是逐一點開編輯 ——
       * 五十個人就是五十次。
       *
       * 有數字就給得起「只看這幾位」，因為使用者接下來要做的正是逐一補完。
       * 彈窗不顯示這一條：那裡的任務是挑一個人出來算薪水，
       * 信箱齊不齊全在那個當下不是他要處理的事。
       */}
      {withEmail && hasAnyEmployee && missingEmailCount > 0 && (
        <div className="mx-[24px] mb-[16px] flex shrink-0 flex-col gap-[8px] rounded-lg border border-amber-200 bg-amber-50 px-[16px] py-[10px] md:flex-row md:items-center">
          <p className="flex-1 text-sm font-medium text-amber-800">
            {t("calculator.employee_list.missing_email_banner", {
              count: missingEmailCount,
            })}
          </p>
          <button
            type="button"
            onClick={() => setOnlyMissingEmail((prev) => !prev)}
            className="shrink-0 text-sm font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900"
          >
            {onlyMissingEmail
              ? t("calculator.employee_list.show_all")
              : t("calculator.employee_list.only_missing_email")}
          </button>
        </div>
      )}

      {/* Info: (20250711 - Julian) Employee list content */}
      <div
        className={`divide-stroke-neutral-quaternary flex min-h-0 flex-1 flex-col divide-y ${
          variant === "modal" ? "overflow-y-auto" : ""
        }`}
      >
        {displayedEmployeesList}
      </div>

      {hasAnyEmployee && (
        <p className="text-text-neutral-tertiary shrink-0 px-[24px] py-[12px] text-xs">
          {filteredEmployees.length === employees.length
            ? t("calculator.employee_list.total_count", {
                count: employees.length,
              })
            : t("calculator.employee_list.filtered_count", {
                count: filteredEmployees.length,
                total: employees.length,
              })}
        </p>
      )}

      {/* Info: (20260901 - Julian) 新增／編輯員工 */}
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

export default EmployeeList;
