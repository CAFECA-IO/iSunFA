"use client";

import { useCallback, useEffect, useState } from "react";
import { request, IEnvelopeLike } from "@/lib/utils/request";
import { salaryCalculatorApiOf } from "@/constants/salary_calculator_api";
import {
  IAccountBookCompanyProfile,
  IAccountBookCompanyProfileView,
} from "@/interfaces/salary_company_profile";

/**
 * Info: (20260914 - Julian) 帳本的公司設定。
 *
 * 計劃書：`documents/architecture/salary_company_profile_plan.md`
 *
 * 讀是 `READ`、寫是 `SETTINGS_WRITE`（只有 `OWNER`）—— 所以
 * **讀得到不等於改得動**，`saveProfile` 失敗時呼叫端要能分辨 403。
 * 這裡只回 `error`，由畫面決定怎麼說。
 */
const EMPTY: IAccountBookCompanyProfileView = {
  entityName: "",
  taxId: null,
  responsiblePerson: null,
  address: null,
  leaveYearScheme: null,
  leaveYearStartMonth: null,
  leaveYearStartDay: null,
  isConfigured: false,
};

export function useCompanyProfile(accountBookId: string | null) {
  const [profile, setProfile] = useState<IAccountBookCompanyProfileView>(EMPTY);
  // Info: (20260914 - Julian) 沒有帳本就不會發請求，一開始就不算「載入中」
  const [isLoading, setIsLoading] = useState<boolean>(accountBookId !== null);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);

  const reload = useCallback(async () => {
    /**
     * Info: (20260914 - Julian) 公開試算模式（`accountBookId === null`）沒有公司。
     *
     * 沿用 `useSalaryEmployees` 的慣例：hook 不能條件呼叫，
     * 所以把「有沒有帳本」判斷在 hook 內部，而不是讓呼叫端各自繞過。
     */
    if (accountBookId === null) {
      setProfile(EMPTY);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const response = await request<
        IEnvelopeLike<IAccountBookCompanyProfileView>
      >(salaryCalculatorApiOf(accountBookId).COMPANY_PROFILE);
      setProfile(response.payload ?? EMPTY);
    } catch {
      /**
       * Info: (20260914 - Julian) 讀失敗不要把畫面留在 `EMPTY`。
       *
       * 留在 `EMPTY` 的話，使用者看到的是一張空表單 —— 與「這本帳還沒設定過」
       * 長得一模一樣。他會照著填一次送出，而那會**覆寫掉**原本存在的設定。
       * 所以失敗要說出來，並且不讓他送出。
       */
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [accountBookId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveProfile = useCallback(
    async (next: IAccountBookCompanyProfile) => {
      // Info: (20260914 - Julian) 沒有帳本就沒有可存的對象（公開試算模式）
      if (accountBookId === null) return;
      const response = await request<
        IEnvelopeLike<IAccountBookCompanyProfileView>
      >(salaryCalculatorApiOf(accountBookId).COMPANY_PROFILE, {
        method: "PUT",
        body: JSON.stringify(next),
      });
      if (response.payload) setProfile(response.payload);
    },
    [accountBookId],
  );

  return { profile, isLoading, loadFailed, reload, saveProfile };
}
