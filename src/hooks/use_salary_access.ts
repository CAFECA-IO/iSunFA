"use client";

import { useCallback, useEffect, useState } from "react";
import { request, IEnvelopeLike } from "@/lib/utils/request";
import { accountBookItemApi } from "@/constants/account_book_api";
import { IAccountBook } from "@/interfaces/account_book";
import { isSalaryAccessAllowed, SalaryAccess } from "@/constants/salary_access";

/**
 * Info: (20260908 - Julian) 這個人在這本帳裡看不看得到薪資功能。
 *
 * ## 這不是安全邊界
 *
 * 安全邊界是伺服器：十三支端點各自呼叫
 * `assertSalaryAccountBookAccess(..., SalaryAccess.READ | WRITE)`，
 * `VIEWER` 一律 403。這支 hook 只決定**畫面要不要出現**。
 *
 * 為什麼還是要有它：`VIEWER` 點進帳本版薪資計算機時，
 * 三個頁面會各自發請求、各自吃到 403，於是畫面顯示
 * 「員工列表載入失敗，請稍後再試」—— 那句話是錯的，
 * 沒有壞掉，是他不該進來。讓人以為系統故障是 UX 缺陷，不是安全缺陷。
 *
 * ## 角色從哪裡來
 *
 * `GET /api/v1/user/account_book/:id` 回應裡的 `userRole`
 * （`account_book.service.ts` 從 `TeamMember.role` 帶出來的）。
 * 它早就在那裡了 —— 帳本選擇頁已經在顯示它 —— 所以這次不必新增欄位或端點。
 *
 * 判斷本身交給 `isSalaryAccessAllowed`，**不在前端另寫一份角色清單**。
 * 前後端讀同一張表，才不會出現「畫面讓你進去、伺服器擋你」的分岔。
 */
export type SalaryAccessStatus =
  | { state: "loading" }
  | { state: "allowed"; role: string }
  | { state: "denied"; role: string | null }
  | { state: "error" };

/**
 * Info: (20260908 - Julian) 角色 → 狀態。**取不到角色時 fail closed。**
 *
 * `IAccountBook.userRole` 是選填的（`string | undefined`），
 * 而「拿到一本帳但它沒帶角色」只可能是伺服器那邊出了預期外的事。
 * 那種時候要嘛放行、要嘛擋下，沒有第三個選項 —— 擋下。
 * 放行的代價是薪資資料，擋下的代價是一個看得懂的錯誤訊息。
 *
 * 抽成純函式是為了測得到：`testEnvironment` 是 node，
 * 沒有任何測試 render React，所以 hook 本身測不了，這一段可以。
 */
export function toSalaryAccessStatus(
  role: string | null | undefined,
): SalaryAccessStatus {
  // Info: (20260909 - Julian) 不需要 `as string`：`isSalaryAccessAllowed` 是型別謂詞
  if (isSalaryAccessAllowed(role, SalaryAccess.READ)) {
    return { state: "allowed", role };
  }
  return { state: "denied", role: role ?? null };
}

export function useSalaryAccess(accountBookId: string): SalaryAccessStatus {
  const [status, setStatus] = useState<SalaryAccessStatus>({
    state: "loading",
  });

  const check = useCallback(async () => {
    setStatus({ state: "loading" });
    try {
      const response = await request<IEnvelopeLike<IAccountBook>>(
        accountBookItemApi(accountBookId),
      );
      const book = response.payload;

      /**
       * Info: (20260908 - Julian) 抓不到這本帳（不是成員、id 不存在）算「錯誤」不算「無權限」。
       *
       * 兩者在畫面上都是擋下來，差別只有那句話。而說「您的角色無權檢視」
       * 是在斷言一件我們其實不知道的事 —— 我們連他是不是這個團隊的人都沒問到。
       */
      if (!book) {
        setStatus({ state: "error" });
        return;
      }

      setStatus(toSalaryAccessStatus(book.userRole));
    } catch {
      // Info: (20260908 - Julian) 401 已由 request 集中通報；這裡只需要讓畫面知道問不到
      setStatus({ state: "error" });
    }
  }, [accountBookId]);

  useEffect(() => {
    check();
  }, [check]);

  return status;
}
