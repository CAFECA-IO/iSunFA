"use client";

import { FC, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, ShieldOff } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useSalaryAccess } from "@/hooks/use_salary_access";
import { ISUNFA_ROUTE } from "@/constants/url";

interface ISalaryAccessGateProps {
  accountBookId: string;
  children: ReactNode;
}

/**
 * Info: (20260908 - Julian) 帳本版薪資計算機的角色閘，四個頁面共用一個。
 *
 * ## 為什麼整區擋掉，而不是「能看、按鈕 disable」
 *
 * 曾經考慮讓 `VIEWER` 瀏覽員工列表、只把操作鈕停用 —— 那在多數列表頁是好設計，
 * 但**這一頁不是通訊錄，是一張薪資表**：`ISalaryCalculatorEmployee` 帶著
 * `baseSalary`、`mealAllowance`、加給與投保級距，列表也直接把本薪 render 出來。
 * 「能瀏覽」等於把要收掉的那批數字換一頁給他看。
 *
 * 而這一區的四個頁面沒有一樣是 `VIEWER` 用得到的：計算機／薪資紀錄／員工列表
 * 都要 `SalaryAccess`；「我的薪資單」的「已寄出」是帳本的寄件備份，
 * 「已收到」仍是 `dummyReceivedData`（要成立得先有「員工能登入本站」的概念，
 * 而 `SalaryCalculatorEmployee` 不是 `User` —— 計畫書 §10.6）。
 * 沒有東西可用的時候，正確的動作是不要讓他進來。
 *
 * ## 這一層擋的是誤解，不是存取
 *
 * 安全邊界在伺服器（十三支端點的 `assertSalaryAccountBookAccess`）。
 * 沒有這一層，`VIEWER` 進來看到的是「員工列表載入失敗，請稍後再試」——
 * 那句話會讓他去回報一個不存在的故障。這裡只是把那句話換成真話。
 *
 * ## 掛在 layout 而不是各頁
 *
 * `salary_calculator/layout.tsx` 在同層路由之間切換時不重新掛載
 * （這也是 `CalculatorProvider` 提到那一層的理由），
 * 所以角色只問一次，四個頁面共用；掛在各頁會變成問四次。
 *
 * ## 一律 fail closed
 *
 * 只有 `allowed` 這一個狀態 render `children`。載入中、問不到、
 * 角色不在表上，全都不放行 —— 差別只有畫面上那句話。
 */
const SalaryAccessGate: FC<ISalaryAccessGateProps> = ({
  accountBookId,
  children,
}) => {
  const { t } = useTranslation();
  const status = useSalaryAccess(accountBookId);

  if (status.state === "allowed") {
    return <>{children}</>;
  }

  if (status.state === "loading") {
    return (
      <div className="text-text-neutral-tertiary flex items-center justify-center gap-[10px] py-[80px] text-sm">
        <Loader2 size={18} className="animate-spin" />
        {t("calculator.access.checking")}
      </div>
    );
  }

  if (status.state === "error") {
    return (
      <p className="text-text-state-error py-[80px] text-center text-sm">
        {t("calculator.access.check_failed")}
      </p>
    );
  }

  /**
   * Info: (20260908 - Julian) 無權限：說清楚是誰、為什麼，並且留一條還走得通的路。
   *
   * 公開版計算機（`/salary_calculator`）不需要任何角色，功能一樣完整，
   * 只是不碰這本帳的資料 —— 被擋下來的人真正想做的事，那裡多半做得到。
   * 死路會變成客服單，有出口就不會。
   */
  return (
    <div className="flex flex-col items-center gap-[14px] px-[24px] py-[80px] text-center">
      <ShieldOff size={28} className="text-text-neutral-tertiary shrink-0" />
      <p className="text-text-neutral-primary font-bold">
        {t("calculator.access.denied_title")}
      </p>
      <p className="text-text-neutral-secondary max-w-[420px] text-sm leading-relaxed">
        {t("calculator.access.denied_desc")}
      </p>
      <Link
        href={ISUNFA_ROUTE.SALARY_CALCULATOR}
        className="text-text-brand-primary-lv1 mt-[6px] flex items-center gap-[6px] text-sm font-semibold hover:underline"
      >
        {t("calculator.access.denied_public_link")}
        <ArrowRight size={16} />
      </Link>
    </div>
  );
};

export default SalaryAccessGate;
