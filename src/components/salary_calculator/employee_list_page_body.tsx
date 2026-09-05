"use client";

import { FC } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import SalaryCalculatorShell from "@/components/salary_calculator/salary_calculator_shell";
import EmployeeList from "@/components/salary_calculator/employee_list";

interface IEmployeeListPageBodyProps {
  // Info: (20260831 - Julian) 員工列表只存在於帳本版，因此這裡不可為 null（計劃書 §2.4）
  accountBookId: string;
}

/**
 * Info: (20260904 - Julian) 員工列表頁。
 *
 * 20260901（03fd6075e）移除過一次，理由是「與薪資紀錄頁看的是同一批人」。
 * 補回來的理由不是那個判斷變了，而是這個模組長出了以「人」為單位的狀態：
 * 寄薪資單要 email，沒填的人寄不出去，而在此之前唯一看得出誰沒填的方法
 * 是在挑人彈窗裡逐一點開編輯。彈窗只有 560px，放不下那一欄，
 * 也不該在「挑一個人出來算薪水」的當下談整份名單的完整度。
 *
 * 名單本身仍然只有一份實作（`EmployeeList`），頁面與彈窗是它的兩個 `variant` ——
 * 當初那一頁與彈窗各寫一份、各自演化，才是真正該避免的事。
 */
const EmployeeListPageBody: FC<IEmployeeListPageBodyProps> = ({
  accountBookId,
}) => {
  const { t } = useTranslation();

  return (
    <SalaryCalculatorShell accountBookId={accountBookId}>
      {/* Info: (20260904 - Julian) 外距由 user/layout.tsx 的 <main> 提供，這裡不再補 px/py */}
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("calculator.employee_list.main_title")}
        </h1>

        {/**
         * Info: (20260904 - Julian) 卡片外框與薪資紀錄頁同一套
         * （`rounded-xl border border-gray-200 bg-white shadow-sm`），
         * 但列的內部沿用彈窗原本的樣式權杖 —— 這次是把程式碼搬到共用的位置，
         * 不是順手重畫一遍列表。兩件事混在同一個改動裡，出問題時分不出是哪一件。
         */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white pt-[16px] shadow-sm">
          <EmployeeList accountBookId={accountBookId} variant="page" />
        </div>
      </div>
    </SalaryCalculatorShell>
  );
};

export default EmployeeListPageBody;
