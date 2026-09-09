"use client";

import { ChangeEvent, FC, useState } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  Hash,
  History,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash,
  User,
  X,
} from "lucide-react";
import { numberWithCommas } from "@/lib/utils/common";
import { useSalaryEmployees } from "@/hooks/use_salary_employees";
import {
  ISalaryCalculatorEmployee,
  ISalaryProfileChangeRequest,
} from "@/interfaces/salary_record";
import {
  countMissingEmail,
  countMissingHireDate,
  countMissingRecords,
  filterEmployees,
  hasNoEmail,
} from "@/lib/utils/salary_employee_filter";
import CoverageAlert from "@/components/salary_calculator/coverage_alert";
import EmployeeActionModal from "@/components/salary_calculator/employee_action_modal";
import EmployeeListFilters from "@/components/salary_calculator/employee_list_filters";
import EmployeeListIssueFilters from "@/components/salary_calculator/employee_list_issue_filters";
import EmployeeListTable from "@/components/salary_calculator/employee_list_table";
import RemoveEmployeeModal from "@/components/salary_calculator/remove_employee_modal";
import EmployeeHistoryModal from "@/components/salary_calculator/employee_history_modal";

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
  historyHandler: () => void;
}> = ({
  employee,
  withEmail,
  pickHandler = undefined,
  editHandler,
  removeHandler,
  historyHandler,
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
      {/**
       * Info: (20260905 - Luphia) 缺薪資單的標記（#6774）。**兩種 variant 都顯示。**
       *
       * 與信箱欄不同：挑人彈窗裡看到「這個人缺六月」正是最有用的時機 ——
       * 使用者當下就在挑人算薪水，補的路就在他手上。
       *
       * Info: (20260907 - Julian) 月份清單原本掛在 `title` 上，20260907 換成
       * `CoverageAlert`（自繪的 div + portal）。原生 tooltip 有兩個治不了的
       * 問題：瀏覽器自己的延遲規則會讓它整段跳過不顯示，而純文字的折行
       * 會斷在頓號後面 —— 讀起來像一句被切斷的話而不是一份清單。
       */}
      <CoverageAlert missingPeriods={employee.missingPeriods} display="badge" />
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
        {/**
         * Info: (20260908 - Julian) 「異動紀錄」放在編輯**之前**。
         *
         * 這兩顆按鈕的關係是有順序的：要調薪的人多半想先看看上次是什麼時候、
         * 從多少調到多少。放在編輯之後的話，那個順序得靠使用者自己想到。
         *
         * 用 `History` 而不是 `Clock`：後者在這個 icon 集合裡讀起來像
         * 「工時」或「排程」，而這一列旁邊就有工時相關的東西。
         */}
        <button
          type="button"
          aria-label={`${employee.name} ${t("calculator.employee_list.history_title")}`}
          onClick={historyHandler}
          className={`text-text-neutral-secondary ${iconBtnStyle}`}
        >
          <History size={16} />
        </button>
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
  // Info: (20260905 - Luphia) 只看有薪資單缺漏的人（#6774）。與上面那個各自獨立
  const [onlyMissingRecords, setOnlyMissingRecords] = useState<boolean>(false);
  // Info: (20260906 - Luphia) 只看沒有到職日的人 —— 上游的問題，見下方橫幅
  const [onlyMissingHireDate, setOnlyMissingHireDate] =
    useState<boolean>(false);
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
  /**
   * Info: (20260908 - Julian) 正在看誰的歷程。`null` = 沒有打開。
   *
   * 存整個員工物件而不只是 id：彈窗標題要顯示姓名與編號，
   * 而只存 id 的話彈窗得自己去名單裡找 —— 那份名單可能正在重新載入。
   */
  const [employeeForHistory, setEmployeeForHistory] =
    useState<ISalaryCalculatorEmployee | null>(null);

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
    onlyMissingRecords,
    onlyMissingHireDate,
  });
  const missingEmailCount = countMissingEmail(employees);
  const missingRecordsCount = countMissingRecords(employees);
  const missingHireDateCount = countMissingHireDate(employees);

  const changeKeyword = (e: ChangeEvent<HTMLInputElement>) =>
    setKeyword(e.target.value);
  const clearKeyword = () => setKeyword("");

  /**
   * Info: (20260908 - Julian) 彈窗送出時把「本次異動」一起轉下去（計劃書 §4）。
   *
   * 新增那一側也收得到這個參數，但彈窗在新增模式不顯示那個欄位，
   * 所以它會是彈窗的預設值（當月）—— 與伺服器的補值一致，不衝突。
   */
  const submitEmployeeHandler = (
    input: Parameters<typeof createEmployee>[0],
    change: ISalaryProfileChangeRequest,
  ) =>
    editing !== null && editing !== "add"
      ? updateEmployee(editing.id, input, change)
      : createEmployee(input, change);

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

  // Info: (20260905 - Luphia) 條件都要清，否則按了還是篩不到（#6774）
  const clearFilters = () => {
    clearKeyword();
    setOnlyMissingEmail(false);
    setOnlyMissingRecords(false);
    setOnlyMissingHireDate(false);
  };

  // Info: (20260901 - Julian) 一位員工都沒有：給一條建立第一位的路，而不只是「無資料」
  const emptyState = (
    <div className="flex flex-col items-center gap-[14px] px-[24px] py-[8px] text-center">
      <User size={28} className="text-text-brand-primary-lv1 shrink-0" />
      <p className="text-text-neutral-primary font-bold">
        {t("calculator.employee_list.empty_title")}
      </p>
      <p className="text-text-neutral-secondary max-w-sm text-sm leading-relaxed">
        {t("calculator.employee_list.empty_desc")}
      </p>
      {addEmployeeBtn}
    </div>
  );

  // Info: (20260901 - Julian) 有員工但篩不到：留一條清除條件的路，不要看起來像資料掉了
  const noResultState = (
    <div className="flex flex-col items-center gap-[10px] px-[24px] py-[8px] text-center">
      <Search size={24} className="text-text-neutral-tertiary" />
      <p className="text-text-neutral-primary text-sm font-semibold">
        {keyword.trim() === ""
          ? t("calculator.employee_list.no_filter_result")
          : t("calculator.employee_list.no_search_result", { keyword })}
      </p>
      <button
        type="button"
        onClick={clearFilters}
        className="text-text-brand-primary-lv1 text-sm font-semibold underline"
      >
        {t("calculator.employee_list.clear_search")}
      </button>
    </div>
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

    if (employees.length === 0)
      return <div className="py-[32px]">{emptyState}</div>;

    if (filteredEmployees.length === 0) {
      return <div className="py-[32px]">{noResultState}</div>;
    }

    return filteredEmployees.map((employee) => (
      <EmployeeRow
        key={employee.id}
        employee={employee}
        withEmail={withEmail}
        pickHandler={onPick ? () => onPick(employee) : undefined}
        editHandler={() => setEditing(employee)}
        removeHandler={() => setEmployeeToRemove(employee)}
        historyHandler={() => setEmployeeForHistory(employee)}
      />
    ));
  })();

  const hasAnyEmployee = !isLoading && !hasError && employees.length > 0;

  const editModals = (
    <>
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

  /**
   * Info: (20260907 - Julian) 整頁版：篩選列與列表是**兩張卡片**。
   *
   * 原本三塊（搜尋、三條提示、清單）塞在同一張卡片裡，讓「條件」與「結果」
   * 看起來是同一件東西 —— 而使用者改條件時第一個要找的就是那條邊界。
   * 列表換成全庫共用的 `DataTable`，順帶補上原本沒有的表頭
   * （使用者看不出中間那一格是信箱還是別的什麼）。
   *
   * 彈窗版一個像素都沒動 —— 560px 放不下六欄的表格，而那裡一列是一個選項、
   * 不是一筆資料。兩邊共用的是狀態與行為，不是版面。
   */
  if (withEmail) {
    return (
      <>
        <div className="flex flex-col gap-4">
          <EmployeeListFilters
            keyword={keyword}
            onKeywordChange={changeKeyword}
            onKeywordClear={clearKeyword}
            shownCount={filteredEmployees.length}
            totalCount={employees.length}
            addEmployeeBtn={addEmployeeBtn}
            /**
             * Info: (20260907 - Julian) 三個勾選 filter **進篩選卡片**。
             *
             * 20260907 前一版刻意把它們拉出去當獨立的一塊，理由是「條件、
             * 提示、結果是三件事」—— 那個判斷對當時的形狀是對的：橫幅是
             * 通知，不是條件。改成勾選之後它們就是條件，家在篩選區裡；
             * 拉在外面反而讓「搜尋」與「只看缺信箱」看起來是兩種不同的東西。
             *
             * 所以整頁版現在是**兩塊**（條件、結果），不是三塊。
             */
            issueFilters={
              hasAnyEmployee ? (
                <EmployeeListIssueFilters
                  missingEmailCount={missingEmailCount}
                  missingHireDateCount={missingHireDateCount}
                  missingRecordsCount={missingRecordsCount}
                  onlyMissingEmail={onlyMissingEmail}
                  onlyMissingHireDate={onlyMissingHireDate}
                  onlyMissingRecords={onlyMissingRecords}
                  toggleMissingEmail={() =>
                    setOnlyMissingEmail((prev) => !prev)
                  }
                  toggleMissingHireDate={() =>
                    setOnlyMissingHireDate((prev) => !prev)
                  }
                  toggleMissingRecords={() =>
                    setOnlyMissingRecords((prev) => !prev)
                  }
                />
              ) : null
            }
          />

          {hasError ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-16 text-center text-sm text-rose-600 shadow-sm">
              {t("calculator.employee_list.load_failed")}
            </div>
          ) : (
            <EmployeeListTable
              employees={filteredEmployees}
              isLoading={isLoading}
              editHandler={(employee) => setEditing(employee)}
              removeHandler={(employee) => setEmployeeToRemove(employee)}
              emptyState={employees.length === 0 ? emptyState : noResultState}
            />
          )}
        </div>

        {editModals}
      </>
    );
  }

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

      {/* Info: (20260908 - Julian) 調薪歷程 */}
      {employeeForHistory && (
        <EmployeeHistoryModal
          accountBookId={accountBookId}
          employee={employeeForHistory}
          modalVisibleHandler={() => setEmployeeForHistory(null)}
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
