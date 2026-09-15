"use client";

import { createContext, useContext, useMemo, FC, ReactNode } from "react";

interface ISalaryAccessContext {
  /**
   * Info: (20260915 - Julian) 這個人在這本帳的角色，`null` = 問不到。
   *
   * 不在這裡判斷「能不能做某件事」——判斷交給 `isSalaryAccessAllowed`，
   * 它讀的是前後端共用的 `SALARY_ACCESS_ROLES`。這裡只負責把角色帶下來，
   * 否則前端會長出第二份角色清單，而兩份不一致的症狀是
   * 「畫面讓你按、伺服器擋你」。
   */
  role: string | null;
}

const SalaryAccessContext = createContext<ISalaryAccessContext | null>(null);

/**
 * Info: (20260915 - Julian) 把角色從 `SalaryAccessGate` 帶給底下的頁面（review S1）。
 *
 * ## 為什麼需要它
 *
 * 角色閘只回答「進不進得來」（`READ`）。但這一區裡有一支端點的**寫**是
 * `SETTINGS_WRITE`（只有 `OWNER`）—— 公司設定。`EDITOR` 進得來、看得到，
 * 而且表單完全可用，按下儲存必定 403，畫面只說「儲存失敗，請稍後再試」。
 *
 * 那句話是假的：沒有壞掉，是他沒有權限。記帳士會把公司名、統編、負責人、
 * 地址、特休制度全部打一遍才發現，而打的東西全部丟掉。
 *
 * ## 為什麼是 context，而不是頁面自己再問一次
 *
 * `useSalaryAccess` 刻意掛在 layout 上，理由寫在它自己的檔頭：
 * 「這一層不隨頁面切換重新掛載，所以角色只問一次、四個頁面共用」。
 * 頁面各自再呼叫一次 hook 就是回到「問四次」——而角色閘本來就已經拿著它，
 * 只是沒有交出來。
 *
 * ## 沒有 provider 就丟例外
 *
 * 同 `usePaySlipToast`：這一區的四個頁面一律活在 `SalaryAccessGate` 之內，
 * 拿不到 provider 是接線錯誤，不是一種要靜靜處理的狀態。
 * 回一個 `null` 的話，症狀會是「所有人都變成沒有權限」——
 * 而那看起來像權限設錯，不像程式接錯。
 */
export const SalaryAccessProvider: FC<{
  role: string | null;
  children: ReactNode;
}> = ({ role, children }) => {
  const value = useMemo(() => ({ role }), [role]);

  return (
    <SalaryAccessContext.Provider value={value}>
      {children}
    </SalaryAccessContext.Provider>
  );
};

export function useSalaryRole(): string | null {
  const context = useContext(SalaryAccessContext);
  if (context === null) {
    throw new Error("useSalaryRole 必須用在 SalaryAccessGate 之內");
  }
  return context.role;
}
