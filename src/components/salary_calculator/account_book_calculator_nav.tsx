"use client";

import { FC, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, HelpCircle, Wallet } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { salaryCalculatorUrlOf } from "@/constants/url";
import MechanismModal from "@/components/salary_calculator/mechanism_modal";

interface IAccountBookCalculatorNavProps {
  accountBookId: string;
}

/**
 * Info: (20260831 - Julian) 帳本版薪資計算機的導覽列。
 *
 * 帳本版不渲染 `CalculatorHeader`（`UserLayout` 已經有 header，再包一層會重複），
 * 而那顆 header 上掛著兩樣東西：模組之間的切換，以及「計算說明」。
 * 少了它，帳本版的使用者看不到計算說明 —— 那是解釋每個數字怎麼來的唯一入口。
 *
 * 所以這一列補回那兩件事，掛在 `SalaryCalculatorShell` 的帳本版分支上，
 * 兩個頁面（計算機／薪資紀錄）共用同一列。
 */
const AccountBookCalculatorNav: FC<IAccountBookCalculatorNavProps> = ({
  accountBookId,
}) => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isMechanismModalOpen, setIsMechanismModalOpen] =
    useState<boolean>(false);

  const urls = salaryCalculatorUrlOf(accountBookId);

  const linkStyle =
    "flex h-[36px] items-center gap-[6px] rounded-lg border px-[14px] text-xs md:text-sm font-semibold transition-colors";
  const activeStyle =
    "border-text-brand-primary-lv1 bg-surface-brand-primary-soft text-text-brand-primary-lv1";
  const idleStyle =
    "border-stroke-neutral-quaternary text-text-neutral-secondary hover:text-text-brand-primary-lv1";

  const styleOf = (href: string) =>
    `${linkStyle} ${pathname === href ? activeStyle : idleStyle}`;

  return (
    <>
      <nav className="flex flex-wrap items-center gap-[8px]">
        {/**
         * Info: (20260901 - Julian) 圖示與 header 取同一個來源。
         *
         * `PUBLIC_MODULES` 裡 salary_calculator 的 icon 是 `Wallet`
         * （constants/modules.ts:73），`HeaderNav` 就是拿那一份渲染的。
         * 這裡原本自己挑了 `BookText`，於是同一個模組在 header 與分頁列長得不一樣。
         */}
        <Link href={urls.CALCULATOR} className={styleOf(urls.CALCULATOR)}>
          <Wallet size={16} />
          {t("calculator.header.main_title")}
        </Link>
        <Link href={urls.RECORDS} className={styleOf(urls.RECORDS)}>
          <FileText size={16} />
          {t("calculator.records.main_title")}
        </Link>

        {/* Info: (20260831 - Julian) 計算說明：帳本版原本沒有入口，這裡補回來 */}
        <button
          type="button"
          onClick={() => setIsMechanismModalOpen(true)}
          className={`${linkStyle} ${idleStyle} ml-auto`}
        >
          <HelpCircle size={16} />
          {t("calculator.header.how_it_works")}
        </button>
      </nav>

      <MechanismModal
        isOpen={isMechanismModalOpen}
        onClose={() => setIsMechanismModalOpen(false)}
      />
    </>
  );
};

export default AccountBookCalculatorNav;
