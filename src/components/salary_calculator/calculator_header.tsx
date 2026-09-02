"use client";

import { useState, FC } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import { ISUNFA_ROUTE } from "@/constants/url";
import LanguageSelector from "@/components/header/language_selector";
import ThemeToggle from "@/components/header/theme_toggle";
import BrandLogo from "@/components/header/brand_logo";
import UserActions from "@/components/header/user_actions";
import HeaderNav from "@/components/header/header_nav";
import MechanismModal from "@/components/salary_calculator/mechanism_modal";

const CalculatorHeader: FC = () => {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isMechanismModalOpen, setIsMechanismModalOpen] = useState(false);

  const isCalc = pathname === ISUNFA_ROUTE.SALARY_CALCULATOR;

  return (
    <header className="sticky top-0 z-50 w-full">
      {/**
       * Info: (20260826 - Julian) 毛玻璃移到**子層**，`<header>` 自己不帶 backdrop-filter。
       *
       * `backdrop-filter` 與 `transform` 一樣會讓元素成為子孫 `position: fixed`
       * 的**包含塊** —— 於是小鈴鐺面板的 `fixed inset-0 h-dvh` 不是相對視窗，
       * 而是相對這個 64px 高的 header 定位。實測（20260826）：面板 top 落在
       * 7742px、底部連結跟著跑到面板頂端下方，手機版因此既捲不到底、
       * 也點不到「查看全部通知」。
       *
       * 把 bg / blur / shadow / ring 放進一個 `absolute inset-0 -z-10` 的兄弟層，
       * 視覺完全相同，而 header 不再是包含塊。這比在面板那端補位移可靠 ——
       * 位移要猜 header 有多高、banner 在不在，而這個做法把前提直接拿掉。
       *
       * Info: (20260901 - Julian) 這一段是從 `origin/develop`（#6701）搬過來的，
       * 本分支尚未 rebase。先搬是因為兩邊都改了這個檔案，而解衝突時「取本分支這一側」
       * 是直覺選擇 —— 那會把上面那個修補靜默回退，而症狀出現在通知鈴鐺、不在薪資頁，
       * 沒有人會回頭懷疑這支 PR（checklist §6.1：缺陷的形狀是**沒有出現**的變更）。
       * 兩邊現在寫的是同一件事，rebase 時這一塊不再是一個要做判斷的衝突。
       */}
      <div className="bg-surface-raised/90 ring-border-default absolute inset-0 -z-10 shadow-sm ring-1 backdrop-blur-xl" />
      <nav
        className="flex items-center justify-between p-3 lg:px-8"
        aria-label="Global"
      >
        <div className="flex items-center gap-x-6">
          <BrandLogo />
          <div className="hidden items-center gap-x-4 lg:flex">
            <Link
              href={ISUNFA_ROUTE.SALARY_CALCULATOR}
              className={`hover:text-brand text-sm font-medium transition-colors ${isCalc ? "text-brand" : "text-text-secondary"}`}
            >
              {t("calculator.header.main_title")}
            </Link>

            <button
              onClick={() => setIsMechanismModalOpen(true)}
              className="text-text-muted hover:text-brand cursor-pointer border-none bg-transparent text-xs font-semibold transition-colors"
            >
              {t("calculator.header.how_it_works")}
            </button>
          </div>
          {/*
            Info: (20260831 - Julian) 這裡原本有兩條指向 /salary_calculator/pay_slip
            與 /salary_calculator/employee_list 的導覽連結（被註解掉）。
            那兩個頁面已經搬到 /user/account_book/[account_book_id]/salary_calculator 之下，
            公開版的 header 不該有入口 —— 帳本版的導覽由 UserHeader 負責。
          */}
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-8">
          <HeaderNav />
          <ThemeToggle />
          <LanguageSelector />
          <UserActions />
        </div>
      </nav>

      <MechanismModal
        isOpen={isMechanismModalOpen}
        onClose={() => setIsMechanismModalOpen(false)}
      />
    </header>
  );
};

export default CalculatorHeader;
