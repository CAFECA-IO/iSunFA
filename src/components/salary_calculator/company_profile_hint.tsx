"use client";

import { FC, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { salaryCalculatorUrlOf } from "@/constants/url";
import {
  companyProfileHintDismissKeyOf,
  shouldShowCompanyProfileHint,
} from "@/lib/utils/company_profile_hint";

/**
 * Info: (20260914 - Julian) 「這本帳還沒有公司設定」的提示。
 *
 * ## 為什麼是提示而不是擋門
 *
 * 原版計劃要做「沒設定公司就不准寄薪資單」。前提被否證之後那個擋門拿掉了 ——
 * 施行細則 §14-1 四款與勞基法 §23 II 三項全是金額，**雇主名稱在兩邊都不是
 * 法定必載**，系統沒有立場因為它沒填就擋住使用者發薪資或匯出。
 * 詳見 `documents/architecture/salary_company_profile_plan.md` §5.3。
 *
 * ## 那為什麼還是要提示
 *
 * 因為沒設定的後果**在發生的當下完全看不出來**：匯出照樣成功、檔案照樣下載，
 * 只是清冊沒有表頭、檔名退回 `salary-records-{時間戳}.csv`。
 * 使用者要把檔案打開、而且要知道本來該有表頭，才會發現少了東西。
 * 這一則提示就是把那個沉默的分支說出來 —— 它守的不是法遵，是可發現性。
 *
 * ## 出現的判準與關閉旗標都不在這裡
 *
 * 兩者都在 `@/lib/utils/company_profile_hint`，因為它們是這一則提示
 * **唯二會靜靜地壞掉**的地方，而本專案的測試不 render React ——
 * 留在元件裡就沒有任何東西守得住（理由寫在那個檔案裡）。
 * 這裡只負責畫。
 */
interface ICompanyProfileHintProps {
  accountBookId: string;
  isConfigured: boolean;
  isLoading: boolean;
  /**
   * Info: (20260914 - Julian) 讀失敗時不出現。
   *
   * 讀失敗代表**不知道**有沒有設定，而這一則的內容是斷言
   * 「你還沒設定」—— 對一個已經設定好的帳本說這句話，
   * 會讓使用者跑去設定頁把原本的資料重打一次。
   */
  loadFailed: boolean;
}

const CompanyProfileHint: FC<ICompanyProfileHintProps> = ({
  accountBookId,
  isConfigured,
  isLoading,
  loadFailed,
}) => {
  const { t } = useTranslation();

  /**
   * Info: (20260914 - Julian) `null` ＝ 還沒讀過 `localStorage`，這時候什麼都不畫。
   *
   * 初值給 `false` 的話，已經關過的人每次進頁面都會看到它閃一下；
   * 給 `true` 的話，沒關過的人反而要等一個 render 才看得到。
   * 用第三個狀態把「還不知道」與「知道了」分開，兩邊都不閃。
   *
   * 讀取放在 effect 而不是 `useState` 的初始化函式：這是 server component
   * 底下的 client component，初始化函式會在 SSR 時跑而那裡沒有 `window`，
   * 兩邊結果不一致就是 hydration 警告。
   */
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setIsDismissed(
        window.localStorage.getItem(
          companyProfileHintDismissKeyOf(accountBookId),
        ) === "1",
      );
    } catch {
      // Info: (20260914 - Julian) 無痕模式會丟例外；讀不到就當作沒關過
      setIsDismissed(false);
    }
  }, [accountBookId]);

  const dismissHandler = () => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(
        companyProfileHintDismissKeyOf(accountBookId),
        "1",
      );
    } catch {
      // Info: (20260914 - Julian) 存不起來就只是這一次關掉，不影響畫面行為
    }
  };

  if (
    !shouldShowCompanyProfileHint({
      isConfigured,
      isLoading,
      loadFailed,
      isDismissed,
    })
  ) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <Building2 className="mt-0.5 size-5 shrink-0 text-orange-600" />

      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm font-semibold text-orange-900">
          {t("calculator.records.company_profile_hint_title")}
        </p>
        <p className="text-sm text-orange-800">
          {t("calculator.records.company_profile_hint_body")}
        </p>
        <Link
          href={salaryCalculatorUrlOf(accountBookId).COMPANY_SETTING}
          className="mt-1 w-fit text-sm font-bold text-orange-700 underline underline-offset-2 transition-colors hover:text-orange-900"
        >
          {t("calculator.records.company_profile_hint_action")}
        </Link>
      </div>

      <button
        type="button"
        onClick={dismissHandler}
        aria-label={t("calculator.records.company_profile_hint_dismiss")}
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-orange-600 transition-colors hover:bg-orange-100 hover:text-orange-900"
      >
        <X className="size-4" />
      </button>
    </div>
  );
};

export default CompanyProfileHint;
