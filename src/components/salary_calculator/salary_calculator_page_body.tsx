"use client";

import { useState, FC } from "react";
import Image from "next/image";
import { useTranslation } from "@/i18n/i18n_context";
import { ArrowRight } from "lucide-react";
import { ISUNFA_ROUTE } from "@/constants/url";
import SalaryResultSection from "@/components/salary_calculator/salary_result_section";
import SalaryFormSection from "@/components/salary_calculator/salary_form_section";
import SalaryCalculatorShell from "@/components/salary_calculator/salary_calculator_shell";
import ProgressBar from "@/components/salary_calculator/progress_bar";
import { useAuth } from "@/contexts/auth_context";
import Link from "next/link";

enum CalcTab {
  CALCULATOR = "calculator",
  PAY_SLIP = "paySlip",
}

interface ISalaryCalculatorPageBodyProps {
  // Info: (20260831 - Julian) null = 公開試算模式；有值 = 帳本版（計劃書 §2.4）
  accountBookId: string | null;
}

const SalaryCalculatorPageBody: FC<ISalaryCalculatorPageBodyProps> = ({
  accountBookId,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [currentTab, setCurrentTab] = useState<CalcTab>(CalcTab.CALCULATOR);

  const isCalculatorTab = currentTab === CalcTab.CALCULATOR;
  const isPaySlipTab = currentTab === CalcTab.PAY_SLIP;

  const calculatorClickHandler = () => setCurrentTab(CalcTab.CALCULATOR);
  const paySlipClickHandler = () => setCurrentTab(CalcTab.PAY_SLIP);

  return (
    <SalaryCalculatorShell accountBookId={accountBookId}>
      {/* Info: (20260831 - Julian) 公開版通往帳本版的入口 */}
      {accountBookId === null && user && (
        <div className="flex flex-col gap-3 bg-orange-50 p-4 ring-1 ring-orange-100">
          <p className="text-base font-bold text-orange-900">
            {t("calculator.account_book_entry.title")}
          </p>
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <ul className="flex list-inside list-disc flex-col gap-1 text-xs text-gray-600">
              <li>{t("calculator.account_book_entry.hint_save")}</li>
              <li>{t("calculator.account_book_entry.hint_select")}</li>
              {/* Info: (20260831 - Julian) 誠實告知：跨路由帶 34 個輸入欄位是另一個議題（計劃書 §12） */}
              <li>{t("calculator.account_book_entry.hint_no_carry")}</li>
            </ul>
            <Link
              href={ISUNFA_ROUTE.SALARY_CALCULATOR_ACCOUNT_BOOK_ENTRY}
              className="ml-auto flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-300"
            >
              {t("calculator.account_book_entry.button")}
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      )}

      {/* Info: (20250887 - Julian) Main Content Desktop */}
      <div className="hidden gap-[84px] overflow-x-auto p-[40px] lg:flex">
        {/* Info: (20250708 - Julian) Form Part */}
        <SalaryFormSection accountBookId={accountBookId} />
        {/* Info: (20250708 - Julian) Result Part */}
        <SalaryResultSection accountBookId={accountBookId} />
      </div>

      {/* Info: (20250887 - Julian) Main Content Mobile */}
      <div className="flex flex-col gap-4 px-5 py-7 md:gap-7 lg:hidden">
        {/* Info: (20250828 - Julian) Mobile Tabs */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={calculatorClickHandler}
            className={`${isCalculatorTab ? "border-orange-600 text-orange-900" : "border-gray-200 text-gray-500"} flex items-center justify-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 hover:border-orange-600 hover:text-orange-900`}
          >
            <Image
              src="/icons/calculator_tab.svg"
              alt="calculator_icon"
              width={24}
              height={24}
            />
            <p>{t("calculator.tabs.calculator")}</p>
          </button>
          <button
            type="button"
            onClick={paySlipClickHandler}
            className={`${isPaySlipTab ? "border-orange-600 text-orange-900" : "border-gray-200 text-gray-500"} flex items-center justify-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 hover:border-orange-600 hover:text-orange-900`}
          >
            <Image
              src="/icons/pay_slip_tab.svg"
              alt="pay_slip_icon"
              width={24}
              height={24}
            />
            <p>{t("calculator.tabs.pay_slip")}</p>
          </button>
        </div>
        {/* Info: (20250828 - Julian) Form Part */}
        {isCalculatorTab && <SalaryFormSection accountBookId={accountBookId} />}
        {/* Info: (20250828 - Julian) Result Part */}
        {isPaySlipTab && (
          <div className="flex flex-col gap-7">
            <ProgressBar />
            <SalaryResultSection accountBookId={accountBookId} />
          </div>
        )}
      </div>
    </SalaryCalculatorShell>
  );
};

export default SalaryCalculatorPageBody;
