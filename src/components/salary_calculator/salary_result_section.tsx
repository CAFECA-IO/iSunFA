"use client";

import { useEffect, useRef, useState, FC } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Loader2, Save, Send } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import SendingPaySlipModal from "@/components/salary_calculator/sending_pay_slip_modal";
import AuthModal from "@/components/auth/auth_modal";
import PaySlip from "@/components/salary_calculator/pay_slip";
import EmployeeListModal from "@/components/salary_calculator/employee_list_modal";
import {
  OverwriteConfirmModal,
  UnlinkedEmployeeModal,
} from "@/components/salary_calculator/save_record_dialogs";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { useSalaryEmployees } from "@/hooks/use_salary_employees";
import {
  diffEmployeeProfile,
  IProfileDiffEntry,
} from "@/lib/utils/salary_employee_profile";
import ProfileDiffModal from "@/components/salary_calculator/profile_diff_modal";
import { useSalaryRecordSave } from "@/hooks/use_salary_record_save";
import { MONTHS } from "@/constants/month";
import { salaryCalculatorUrlOf } from "@/constants/url";
import {
  CalcTab,
  EMPLOYEE_NUMBER_INPUT_ID,
} from "@/constants/salary_calculator";
import { downloadNodeAsPng } from "@/lib/utils/pay_slip_download";
import {
  ISalaryCalculatorEmployee,
  ISalaryRecordSummary,
} from "@/interfaces/salary_record";
import { ApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

interface ISalaryResultSectionProps {
  // Info: (20260831 - Julian) null = 公開試算模式，儲存按鈕整顆不出現（計劃書 §2.4）
  accountBookId: string | null;
}

const SalaryResultSection: FC<ISalaryResultSectionProps> = ({
  accountBookId,
}) => {
  const { t } = useTranslation();

  const {
    completeSteps,
    switchStep,
    switchTab,
    employeeName,
    employeeNumber,
    employeeEmail,
    selectedYear,
    selectedMonth,
    selectedEmployeeId,
    linkEmployee,
    getSalaryCalculatorOptions,
    getEmployeeProfile,
    salaryCalculatorResult,
  } = useCalculatorCtx();

  const downloadRef = useRef<HTMLDivElement>(null);
  const [isShowLoginModal, setIsShowLoginModal] = useState<boolean>(false);
  const [isShowSendingModal, setIsShowSendingModal] = useState<boolean>(false);

  const toggleShowLoginModal = () => setIsShowLoginModal((prev) => !prev);
  const toggleShowSendingModal = () => setIsShowSendingModal((prev) => !prev);

  /**
   * Info: (20260901 - Julian) 公開版沒有帳本。
   *
   * `useSalaryRecordSave` 裡沒有任何 mount effect，它的每一支都要有人按按鈕才會動，
   * 而公開版的儲存按鈕根本不存在 —— 所以空字串進去不會被呼叫到。
   * `useSalaryEmployees` 不一樣：它有一支無條件的 mount effect，
   * 空字串會讓匿名訪客一打開頁面就打一支 `account_book//...` 的請求，
   * 所以那一支收 `null`（理由寫在該 hook 的檔頭）。
   */
  const bookId = accountBookId ?? "";
  const { isSaving, savedRecord, hasError, findExisting, save, clearSaved } =
    useSalaryRecordSave(bookId);
  const { employees, createEmployee, updateEmployee, reload } =
    useSalaryEmployees(accountBookId);

  /**
   * Info: (20260901 - Julian) 待確認覆蓋的那一筆，連「要存給誰」一起記。
   *
   * 原本只記紀錄、確認時再去讀 context 的 `selectedEmployeeId`。
   * 從員工列表選完人就直接儲存之後，那個 id 有可能還沒進到 context
   * （`linkEmployee` 是 setState）—— 把它跟紀錄綁在一起，就不必去猜當下讀不讀得到。
   */
  const [pendingOverwrite, setPendingOverwrite] = useState<{
    employeeId: string;
    existing: ISalaryRecordSummary;
  } | null>(null);
  const [isShowUnlinkedModal, setIsShowUnlinkedModal] =
    useState<boolean>(false);
  const [isShowPickModal, setIsShowPickModal] = useState<boolean>(false);

  /**
   * Info: (20260901 - Julian) 「探有沒有既有紀錄」那一段的忙碌狀態。
   *
   * `isSaving` 只涵蓋 POST，不含前面那次 GET。從員工列表選完人的那條路上，
   * 彈窗一關就進到這段 —— 沒有它的話畫面會有一小段完全沒有反應，
   * 而「按了沒反應」正是這個流程原本的問題。
   */
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const isBusy = isPreparing || isSaving;

  // Info: (20260901 - Julian) 例外 B 對話框裡的錯誤訊息（名單過期時後端仍會擋下來）
  const [unlinkedError, setUnlinkedError] = useState<string | null>(null);

  // Info: (20260901 - Julian) 「修改員工編號」按下之後，等 Step 1 掛上來再聚焦
  const [isFocusingNumber, setIsFocusingNumber] = useState<boolean>(false);

  /**
   * Info: (20260902 - Julian) 計算機上的常態屬性與員工檔不一致時待確認的那一筆。
   *
   * 連員工一起記，理由同 `pendingOverwrite`：確認的那一刻再去讀 context
   * 有可能讀到還沒生效的 setState。
   */
  const [pendingProfileDiff, setPendingProfileDiff] = useState<{
    employee: ISalaryCalculatorEmployee;
    diff: IProfileDiffEntry[];
  } | null>(null);

  const selectedMonthNumber =
    MONTHS.findIndex((month) => month.name === selectedMonth.name) + 1;
  const selectedYearNumber = parseInt(selectedYear, 10);

  // Info: (20260831 - Julian) 真正落地的那一步。employeeId 到這裡一定已經確定
  const saveRecordFor = async (employeeId: string) => {
    await save({
      employeeId,
      year: selectedYearNumber,
      month: selectedMonthNumber,
      input: getSalaryCalculatorOptions(),
      result: salaryCalculatorResult,
    });
    setPendingOverwrite(null);
    setIsShowUnlinkedModal(false);
    setIsShowPickModal(false);
  };

  /**
   * Info: (20260901 - Julian) 「要存給誰」確定之後的共用流程：先探再存。
   *
   * 三條路（已連結、從列表選、直接新增）最後都走這裡，
   * 所以「同年月已有紀錄要先問一句」這件事不會因為走哪一條而漏掉。
   * 員工 id 由參數傳入而不是讀 context —— 從列表選的那條路上，
   * `linkEmployee` 的 setState 還沒生效。
   */
  const proceedSaveFor = async (employeeId: string) => {
    setIsPreparing(true);
    try {
      const existing = await findExisting({
        employeeId,
        year: selectedYearNumber,
        month: selectedMonthNumber,
      });

      if (existing) {
        setPendingOverwrite({ employeeId, existing });
        return;
      }

      await saveRecordFor(employeeId);
    } finally {
      setIsPreparing(false);
    }
  };

  /**
   * Info: (20260901 - Julian) 計算機上這個編號是不是已經有人在用。
   *
   * 編號在帳本內唯一，所以「直接新增員工」用一個已存在的編號一定會被後端以 409 擋下。
   * 先從已載入的名單問出答案，就能在按下去之前把人指出來，而不是撞牆之後才解釋。
   * 名單可能過期（別人剛新增），所以 `createAndSaveHandler` 仍然要接住 409。
   */
  const trimmedNumber = employeeNumber.trim();
  const numberConflict =
    trimmedNumber === ""
      ? null
      : (employees.find((employee) => employee.number === trimmedNumber) ??
        null);

  /**
   * Info: (20260831 - Julian) 按下「儲存薪資紀錄」。
   *
   * 已連結員工 → 先探這個年月有沒有紀錄，有就先問一句，沒有就直接存完。
   * 未連結 → 開例外 B 問要存給誰。兩條路都不會要求使用者重填員工或年月。
   */
  /**
   * Info: (20260902 - Julian) 儲存前的三道問句，順序是定死的：
   *
   * 1. **要存給誰**（未連結員工）—— 沒有答案的話後面兩題沒有意義
   * 2. **員工檔要不要跟著更新**（常態屬性有差異）—— 產品決策 D2 的「問一句」
   * 3. **要不要覆蓋既有紀錄**（同年月已有一筆）—— 在 `proceedSaveFor` 裡
   *
   * 三者可能同時成立。順序倒過來的話，使用者會先被問「要覆蓋嗎」，
   * 而那時候連「存給誰」都還沒確定。
   */
  const clickSaveHandler = async () => {
    clearSaved();
    setUnlinkedError(null);

    if (selectedEmployeeId === null) {
      setIsShowUnlinkedModal(true);
      return;
    }

    /**
     * Info: (20260902 - Julian) 名單上找不到這個人時**不問**，直接存。
     *
     * 那代表名單還在飛或抓失敗（hook 把錯誤吞成 `[]`）——
     * 此時 `diff` 會拿計算機的值去跟「什麼都沒有」比，列出 15 條全部是差異，
     * 而那是假的。沒有可信的對照組就不要問。
     */
    const stored = employees.find(
      (employee) => employee.id === selectedEmployeeId,
    );

    if (stored !== undefined) {
      const diff = diffEmployeeProfile(getEmployeeProfile(), stored);
      if (diff.length > 0) {
        setPendingProfileDiff({ employee: stored, diff });
        return;
      }
    }

    await proceedSaveFor(selectedEmployeeId);
  };

  // Info: (20260902 - Julian) 「更新員工檔並儲存」：先 PUT 員工，再走原本的儲存流程
  const updateProfileAndSaveHandler = async () => {
    if (pendingProfileDiff === null) return;

    const { employee } = pendingProfileDiff;
    await updateEmployee(employee.id, {
      ...getEmployeeProfile(),
      name: employee.name,
      number: employee.number,
      email: employee.email || undefined,
    });

    setPendingProfileDiff(null);
    await proceedSaveFor(employee.id);
  };

  // Info: (20260902 - Julian) 「只存這一次」：員工檔不動，這次的值仍然照樣進快照
  const saveWithoutProfileUpdateHandler = async () => {
    if (pendingProfileDiff === null) return;

    const { employee } = pendingProfileDiff;
    setPendingProfileDiff(null);
    await proceedSaveFor(employee.id);
  };

  /**
   * Info: (20260901 - Julian) 例外 B 的次要路徑：從員工列表選一位，選完就直接存。
   *
   * 原本選完只是把人灌進計算機、關掉彈窗，使用者還要再按一次儲存 ——
   * 而他按下儲存才走到這裡，意圖早就表達過了，不該再要求一次。
   */
  const pickedEmployeeHandler = async (employeeId: string) => {
    setIsShowPickModal(false);
    await proceedSaveFor(employeeId);
  };

  /**
   * Info: (20260901 - Julian) 編號撞號時的出路：改存給編號原本的那位員工。
   *
   * 一樣走 `proceedSaveFor`，所以「他這個年月已經有紀錄」還是會先問一句。
   */
  const useConflictEmployeeHandler = async () => {
    if (numberConflict === null) return;
    linkEmployee(numberConflict);
    setIsShowUnlinkedModal(false);
    await proceedSaveFor(numberConflict.id);
  };

  /**
   * Info: (20260901 - Julian) 第三條路：編號打錯了，回去改。
   *
   * 編號欄被**兩層**條件渲染擋著，兩層都要打開，少一層就又是「按了沒反應」：
   *
   * 1. **分頁**（只有手機版有）：結果與表單是兩個分頁，而儲存鈕在
   *    `PAY_SLIP` 那一頁；編號欄在 `CALCULATOR` 那一頁。桌機版兩塊並排，
   *    切了也無害。
   * 2. **步驟**：表單一次只掛一個步驟（`salary_form_section.tsx` 是
   *    `currentStep === 1 ? <BasicInfoForm/> : …`），而儲存鈕要四步都完成才亮，
   *    所以按下去的當下使用者多半停在 Step 4。
   *
   * 聚焦因此不能寫在這裡：兩個切換都是 setState，欄位要等下一次 commit 才存在。
   * 立旗標、交給下面的 effect 做。
   */
  const editNumberHandler = () => {
    setIsShowUnlinkedModal(false);
    setUnlinkedError(null);
    switchTab(CalcTab.CALCULATOR);
    switchStep(1);
    setIsFocusingNumber(true);
  };

  /**
   * Info: (20260901 - Julian) 等表單分頁與 Step 1 真的掛上來之後才捲動並聚焦。
   *
   * effect 跑在 commit 之後，此時 `BasicInfoForm` 已經在畫面上。
   * `block: "center"` 是因為欄位常在視窗上緣之外，只 focus 的話畫面不會動。
   */
  useEffect(() => {
    if (!isFocusingNumber) return;
    setIsFocusingNumber(false);

    const input = document.getElementById(EMPLOYEE_NUMBER_INPUT_ID);
    if (!(input instanceof HTMLInputElement)) return;

    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
    input.select();
  }, [isFocusingNumber]);

  const confirmOverwriteHandler = async () => {
    if (pendingOverwrite === null) return;
    await saveRecordFor(pendingOverwrite.employeeId);
  };

  /**
   * Info: (20260831 - Julian) 例外 B 的主要路徑：用計算機上已經填好的欄位建員工再存。
   *
   * `createEmployee` 之後重抓名單，才找得回剛建立的那一筆的 id ——
   * POST 的回應也有 id，但走同一份名單可以確保畫面與資料一致。
   */
  const createAndSaveHandler = async () => {
    // Info: (20260901 - Julian) 建立 + 重抓名單這段也要鎖住，否則連按兩次會送出兩次 POST
    setIsPreparing(true);
    setUnlinkedError(null);
    try {
      /**
       * Info: (20260902 - Julian) 帶的是**計算機當下的 15 個常態欄位**，不是預設值。
       *
       * 使用者剛在計算機把投保狀態、扶養人數、自提比例、到職日都設好了，
       * 這顆按鈕的語意就是「把這個人連同這些設定建起來」。
       * 只帶姓名與兩個金額的話，建出來的檔其餘欄位全是 schema 的 `@default` ——
       * 下個月選這個人，那些預設值會覆蓋掉他今天設好的東西，而且完全靜默。
       */
      await createEmployee({
        ...getEmployeeProfile(),
        name: employeeName.trim(),
        number: employeeNumber.trim(),
        email: employeeEmail.trim() || undefined,
      });

      const refreshed = await reload();
      // Info: (20260831 - Julian) 用編號找回剛建立的那一筆 —— 它是帳本內唯一的那一欄
      const created = refreshed.find(
        (employee) => employee.number === employeeNumber.trim(),
      );
      if (!created) return;

      linkEmployee(created);
      /**
       * Info: (20260901 - Julian) 剛建立的員工不可能已經有這個年月的紀錄，
       * 所以直接存，不必再探一次。
       */
      await saveRecordFor(created.id);
    } catch (error) {
      /**
       * Info: (20260901 - Julian) 撞號的保險。
       *
       * 正常情況 `numberConflict` 會先把「直接新增」擋掉，走不到這裡；
       * 但名單是進頁面時抓的，別人在這段期間新增了同編號的員工就會漏過去。
       * 沒有這一段的話，錯誤會變成沒人接的 rejection —— 對話框留在原地、
       * 什麼也沒發生，使用者只會覺得按鈕壞了。
       */
      const isNumberTaken =
        error instanceof ApiError &&
        (error.data as { errorCode?: string } | null)?.errorCode ===
          API_ERRORS.CF_SALARY_EMPLOYEE_NUMBER_TAKEN.code;

      setUnlinkedError(
        isNumberTaken
          ? t("calculator.employee_list.number_taken")
          : t("calculator.save_record.save_failed"),
      );

      // Info: (20260901 - Julian) 重抓名單，下一次 render 就會出現「改存給他」那條路
      await reload();
    } finally {
      setIsPreparing(false);
    }
  };

  /**
   * Info: (20260831 - Julian) 四個步驟都走過才能下載或儲存。
   *
   * 原本只擋姓名未填。但沒走過的步驟裡是**預設值**（本薪是當年最低工資、
   * 加班與請假時數全 0、三個投保旗標全開）—— 那些預設值照樣算得出一張薪資單，
   * 而使用者會以為那是他自己填的。下載或存下去的東西必須是他真的看過的。
   *
   * 公開版與帳本版共用同一條規則。
   */
  const isAllStepsCompleted = completeSteps.every((step) => step.completed);
  const btnDisabled = employeeName === "" || !isAllStepsCompleted;

  const showingName = employeeName !== "" ? employeeName : "-";
  // Info: (20250709 - Julian) 格式化日期
  const formattedMonth =
    selectedMonth.name.length > 3
      ? `${selectedMonth.name.slice(0, 3)}.`
      : selectedMonth.name;
  const formattedDate = `${formattedMonth}${selectedYear}`;

  // Info: (20250710 - Julian) 下載圖片功能
  const downloadPng = () => {
    if (!downloadRef.current) return;

    downloadNodeAsPng(
      downloadRef.current,
      `${employeeName}_${formattedDate}.png`,
    ).catch((err) => {
      console.error("oops, something went wrong!", err);
    });
  };

  /**
   * Info: (20260904 - Julian) 寄出薪資單。**要先存過才寄得出去。**
   *
   * 寄送的對象是一筆薪資紀錄（`record_id` 是端點唯一的輸入），
   * 而計算機畫面上的數字在按下「儲存」之前不是任何一筆紀錄 ——
   * 沒有 `savedRecord` 就沒有東西可以寄。
   *
   * 上一版這一段連同按鈕一起被註解掉（`ToDo: (20260225) 暫時隱藏按鈕`），
   * 因為那時後端還沒有寄送端點。現在有了。
   *
   * 登入判斷不必自己做：這一整顆按鈕只在帳本版出現，而帳本版本來就要登入。
   */
  const sendingBtnClickHandler = () => toggleShowSendingModal();

  /**
   * Info: (20260904 - Julian) 停用的原因要說得出來，而且三種原因不一樣。
   *
   * 「沒填完」「還沒存」「這位員工沒有信箱」的下一步完全不同。
   * 共用一句「請完成必填欄位」的話，沒有信箱的那個人會回頭一格一格檢查
   * 一張已經填完的表（同員工表單分頁那一組紅點的處置：停用的按鈕一定要說得出為什麼）。
   */
  const sendDisabledReason = (() => {
    if (btnDisabled) return "calculator.button.send_disabled_incomplete";
    if (!savedRecord) return "calculator.button.send_disabled_unsaved";
    if (employeeEmail.trim() === "")
      return "calculator.button.send_disabled_no_email";
    return null;
  })();

  return (
    <>
      <div className="flex flex-col gap-6 lg:w-fit">
        {/* Info: (20250708 - Julian) Result */}
        {/**
         * Info: (20260901 - Julian) 卡片外框在**外層**，`downloadRef` 在內層。
         *
         * 畫面上的薪資單仍然是一張卡片（外框、圓角、陰影都在外層那個 div），
         * 但下載截的是內層 —— 於是存出來的 PNG 只有內容與留白，沒有懸空的框和陰影。
         * 那張圖是要寄給員工看的，一道浮在白底上的陰影只會像去背沒去乾淨。
         *
         * 內距放在內層（截圖的那一層），不能放外層：放外層的話 PNG 會變成
         * 內容整個貼齊邊緣。
         */}
        <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl lg:w-[650px]">
          <div ref={downloadRef} className="bg-white p-6">
            <PaySlip
              employeeName={showingName}
              employeeNumber={employeeNumber}
              selectedMonth={formattedMonth}
              selectedYear={selectedYear}
              resultData={salaryCalculatorResult}
              variant="plain"
            />
          </div>
        </div>
        {/* Info: (20250708 - Julian) Buttons */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/**
           * Info: (20260831 - Julian) 下載改成外框樣式。
           * 它與「儲存薪資紀錄」並排且同為實心橘時只差一階色，看起來像上錯色
           * 而不是刻意的層級 —— 儲存才是這一頁的主要動作。
           */}
          <button
            type="button"
            onClick={downloadPng}
            disabled={btnDisabled}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-orange-600 ring-1 ring-orange-600 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:ring-0"
          >
            {t("calculator.button.download")} <Download size={20} />
          </button>

          {/* Info: (20260831 - Julian) 帳本版才有儲存；公開版這一格空著，格線維持兩欄 */}
          {accountBookId !== null && (
            <button
              type="button"
              onClick={clickSaveHandler}
              disabled={btnDisabled || isBusy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isBusy
                ? t("calculator.save_record.saving")
                : t("calculator.save_record.save")}
              {isBusy ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
            </button>
          )}
          {/**
           * Info: (20260904 - Julian) 寄出薪資單：**帳本版限定**，且要先存過。
           *
           * 公開版沒有帳本也沒有員工檔，寄不出去也不該看得到這顆按鈕
           * （同上面那顆「儲存」的處置）。
           */}
          {accountBookId !== null && (
            <button
              type="button"
              onClick={sendingBtnClickHandler}
              disabled={sendDisabledReason !== null}
              className="col-span-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-orange-600 ring-1 ring-orange-600 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:ring-0 lg:col-span-2"
            >
              {t("calculator.button.send")} <Send size={20} />
            </button>
          )}
        </div>

        {/* Info: (20260904 - Julian) 為什麼寄不出去。三種原因的下一步不同，所以分開講 */}
        {accountBookId !== null && sendDisabledReason !== null && (
          <p className="text-text-neutral-tertiary text-xs">
            {t(sendDisabledReason)}
          </p>
        )}

        {/* Info: (20260831 - Julian) 講清楚為什麼按鈕是灰的，否則使用者只會看到一顆不能按的按鈕 */}
        {btnDisabled && (
          <p className="text-text-neutral-tertiary text-xs">
            {t("calculator.button.disabled_hint")}
          </p>
        )}

        {/* Info: (20260831 - Julian) 存完就地回饋，不導頁也不跳 Modal —— 多半還要繼續調數字存下一個月 */}
        {savedRecord && (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-700" />
            <p className="flex-1 text-sm font-semibold text-emerald-800">
              {t("calculator.save_record.saved", {
                name: savedRecord.employee.name,
                year: savedRecord.year,
                month: savedRecord.month,
              })}
            </p>
            {accountBookId !== null && (
              <Link
                href={salaryCalculatorUrlOf(accountBookId).RECORDS}
                className="text-sm font-bold text-emerald-700 underline"
              >
                {t("calculator.save_record.view_record")}
              </Link>
            )}
          </div>
        )}

        {hasError && (
          <p className="text-text-state-error text-sm font-medium">
            {t("calculator.save_record.save_failed")}
          </p>
        )}
      </div>

      {/* Info: (20250723 - Julian) Login Modal */}
      <AuthModal isOpen={isShowLoginModal} onClose={toggleShowLoginModal} />

      {/* Info: (20250723 - Julian) Sending Pay Slip Modal */}
      {isShowSendingModal && accountBookId !== null && savedRecord && (
        <SendingPaySlipModal
          accountBookId={accountBookId}
          /* Info: (20260904 - Julian) 寄的是剛存下來的那一筆，不是畫面上的數字 */
          recordId={savedRecord.id}
          employeeName={savedRecord.employee.name}
          employeeEmail={employeeEmail}
          monthLabel={t(
            `date.month_name.${selectedMonth.name.toLowerCase().slice(0, 3)}`,
          )}
          modalVisibleHandler={toggleShowSendingModal}
        />
      )}

      {/* Info: (20260831 - Julian) 例外 A：同員工同年月已經有紀錄 */}
      {pendingOverwrite && (
        <OverwriteConfirmModal
          existing={pendingOverwrite.existing}
          isSaving={isBusy}
          closeHandler={() => setPendingOverwrite(null)}
          confirmHandler={confirmOverwriteHandler}
        />
      )}

      {/* Info: (20260831 - Julian) 例外 B：姓名是手打的，沒有對應的員工 */}
      {isShowUnlinkedModal && (
        <UnlinkedEmployeeModal
          employeeName={employeeName}
          employeeNumber={trimmedNumber}
          canCreate={trimmedNumber !== ""}
          isSaving={isBusy}
          conflictEmployee={numberConflict}
          errorMessage={unlinkedError}
          closeHandler={() => {
            setIsShowUnlinkedModal(false);
            setUnlinkedError(null);
          }}
          createHandler={createAndSaveHandler}
          pickHandler={() => {
            setIsShowUnlinkedModal(false);
            setUnlinkedError(null);
            setIsShowPickModal(true);
          }}
          useConflictHandler={useConflictEmployeeHandler}
          editNumberHandler={editNumberHandler}
        />
      )}

      {pendingProfileDiff !== null && (
        <ProfileDiffModal
          employeeName={pendingProfileDiff.employee.name}
          diff={pendingProfileDiff.diff}
          closeHandler={() => setPendingProfileDiff(null)}
          updateAndSaveHandler={updateProfileAndSaveHandler}
          saveOnlyHandler={saveWithoutProfileUpdateHandler}
        />
      )}

      {isShowPickModal && accountBookId !== null && (
        <EmployeeListModal
          accountBookId={accountBookId}
          modalVisibleHandler={() => setIsShowPickModal(false)}
          onPicked={(employee) => pickedEmployeeHandler(employee.id)}
        />
      )}
    </>
  );
};

export default SalaryResultSection;
