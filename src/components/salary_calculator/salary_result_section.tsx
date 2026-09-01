"use client";

import { useRef, useState, FC } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Loader2, Save /* Send */ } from "lucide-react";
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
import { useSalaryRecordSave } from "@/hooks/use_salary_record_save";
import { MONTHS } from "@/constants/month";
import { salaryCalculatorUrlOf } from "@/constants/url";
import { downloadNodeAsPng } from "@/lib/utils/pay_slip_download";
import { ISalaryRecordSummary } from "@/interfaces/salary_record";

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
    employeeName,
    employeeNumber,
    employeeEmail,
    selectedYear,
    selectedMonth,
    baseSalary,
    mealAllowance,
    selectedEmployeeId,
    linkEmployee,
    getSalaryCalculatorOptions,
    salaryCalculatorResult,
  } = useCalculatorCtx();

  const downloadRef = useRef<HTMLDivElement>(null);
  const [isShowLoginModal, setIsShowLoginModal] = useState<boolean>(false);
  const [isShowSendingModal, setIsShowSendingModal] = useState<boolean>(false);

  const toggleShowLoginModal = () => setIsShowLoginModal((prev) => !prev);
  const toggleShowSendingModal = () => setIsShowSendingModal((prev) => !prev);

  // Info: (20260831 - Julian) 公開版沒有帳本，這兩支 hook 拿到空字串也不會被呼叫到
  const bookId = accountBookId ?? "";
  const { isSaving, savedRecord, hasError, findExisting, save, clearSaved } =
    useSalaryRecordSave(bookId);
  const { createEmployee, reload } = useSalaryEmployees(bookId);

  const [existingRecord, setExistingRecord] =
    useState<ISalaryRecordSummary | null>(null);
  const [isShowUnlinkedModal, setIsShowUnlinkedModal] =
    useState<boolean>(false);
  const [isShowPickModal, setIsShowPickModal] = useState<boolean>(false);

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
    setExistingRecord(null);
    setIsShowUnlinkedModal(false);
  };

  /**
   * Info: (20260831 - Julian) 按下「儲存薪資紀錄」。
   *
   * 已連結員工 → 先探這個年月有沒有紀錄，有就先問一句，沒有就直接存完。
   * 未連結 → 開例外 B 問要存給誰。兩條路都不會要求使用者重填員工或年月。
   */
  const clickSaveHandler = async () => {
    clearSaved();

    if (selectedEmployeeId === null) {
      setIsShowUnlinkedModal(true);
      return;
    }

    const existing = await findExisting({
      employeeId: selectedEmployeeId,
      year: selectedYearNumber,
      month: selectedMonthNumber,
    });

    if (existing) {
      setExistingRecord(existing);
      return;
    }

    await saveRecordFor(selectedEmployeeId);
  };

  const confirmOverwriteHandler = async () => {
    if (selectedEmployeeId === null) return;
    await saveRecordFor(selectedEmployeeId);
  };

  /**
   * Info: (20260831 - Julian) 例外 B 的主要路徑：用計算機上已經填好的欄位建員工再存。
   *
   * `createEmployee` 之後重抓名單，才找得回剛建立的那一筆的 id ——
   * POST 的回應也有 id，但走同一份名單可以確保畫面與資料一致。
   */
  const createAndSaveHandler = async () => {
    await createEmployee({
      name: employeeName.trim(),
      number: employeeNumber.trim(),
      email: employeeEmail.trim() || undefined,
      baseSalary,
      mealAllowance,
    });

    const refreshed = await reload();
    // Info: (20260831 - Julian) 用編號找回剛建立的那一筆 —— 它是帳本內唯一的那一欄
    const created = refreshed.find(
      (employee) => employee.number === employeeNumber.trim(),
    );
    if (!created) return;

    linkEmployee(created);
    await saveRecordFor(created.id);
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

  // Info: (20250723 - Julian) 登入才能使用寄出薪資單的功能
  // const sendingBtnClickHandler = () => {
  //   if (isSignIn) {
  //     toggleShowSendingModal();
  //   } else {
  //     toggleShowLoginModal();
  //   }
  // };

  return (
    <>
      <div className="flex flex-col gap-6 lg:w-fit">
        {/* Info: (20250708 - Julian) Result */}
        <div ref={downloadRef} className="w-full shrink-0 lg:w-[650px]">
          <PaySlip
            employeeName={showingName}
            employeeNumber={employeeNumber}
            selectedMonth={formattedMonth}
            selectedYear={selectedYear}
            resultData={salaryCalculatorResult}
          />
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
              disabled={btnDisabled || isSaving}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isSaving
                ? t("calculator.save_record.saving")
                : t("calculator.save_record.save")}
              {isSaving ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Save size={20} />
              )}
            </button>
          )}
          {/* ToDo: (20260225 - Julian) 暫時隱藏按鈕 */}
          {/* <button
            type="button"
            onClick={sendingBtnClickHandler}
            disabled={btnDisabled}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-400 text-sm font-bold text-white shadow-md shadow-orange-100 transition-all duration-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            {t("calculator.button.send")} <Send size={20} />
          </button>
          */}
        </div>

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
      {isShowSendingModal && (
        <SendingPaySlipModal modalVisibleHandler={toggleShowSendingModal} />
      )}

      {/* Info: (20260831 - Julian) 例外 A：同員工同年月已經有紀錄 */}
      {existingRecord && (
        <OverwriteConfirmModal
          existing={existingRecord}
          isSaving={isSaving}
          closeHandler={() => setExistingRecord(null)}
          confirmHandler={confirmOverwriteHandler}
        />
      )}

      {/* Info: (20260831 - Julian) 例外 B：姓名是手打的，沒有對應的員工 */}
      {isShowUnlinkedModal && (
        <UnlinkedEmployeeModal
          employeeName={employeeName}
          canCreate={employeeNumber.trim() !== ""}
          isSaving={isSaving}
          closeHandler={() => setIsShowUnlinkedModal(false)}
          createHandler={createAndSaveHandler}
          pickHandler={() => {
            setIsShowUnlinkedModal(false);
            setIsShowPickModal(true);
          }}
        />
      )}

      {isShowPickModal && accountBookId !== null && (
        <EmployeeListModal
          accountBookId={accountBookId}
          modalVisibleHandler={() => setIsShowPickModal(false)}
        />
      )}
    </>
  );
};

export default SalaryResultSection;
