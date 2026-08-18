"use client";

import { ReactNode, useEffect, useState } from "react";
import HrHeader from "@/components/hr_management/hr_header";
import HrSidebar from "@/components/hr_management/hr_sidebar";
import { HR_IDENTITY_API } from "@/constants/hr_identity_api";
import { IHrIdentityView } from "@/interfaces/hr_identity";
import { IEnvelopeLike, request } from "@/lib/utils/request";

/**
 * Info: (20260810 - Julian) 人事管理系統的外框：頂部列 + 左側選單 + 主內容區。
 */
export default function HrManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /**
   * Info: (20260818 - Julian) 身分在**外框**取一次，兩個子元件共用。
   *
   * 頂部列要顯示「我是誰」、側邊欄要決定「簽核入口該不該出現」，兩者問的是
   * 同一個問題。各自去查會是同一頁兩支重複請求，而它們還可能在不同時刻
   * 得到不同答案（中間有人被指派了 HR 職能），於是畫面自相矛盾。
   *
   * `null` 有兩個意思：還沒回來、或查不到（未登入、未綁定員工檔、端點掛掉）。
   * 兩者對子元件都是「不知道」，而**不知道一律往顯示倒** ——
   * 這個 layout 連沒有登入的頁面都會渲染，少藏一個空選單可以接受，
   * 把主管的入口藏掉不行。
   */
  const [identity, setIdentity] = useState<IHrIdentityView | null>(null);

  useEffect(() => {
    let active = true;
    request<IEnvelopeLike<IHrIdentityView>>(HR_IDENTITY_API.ME)
      .then((response) => {
        if (active) setIdentity(response.payload ?? null);
      })
      .catch(() => {
        // Info: (20260818 - Julian) 401／離線／端點掛掉都停在 null，見上面的說明
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <HrHeader
        identity={identity}
        onToggleSidebar={() => setIsSidebarOpen(true)}
      />

      <div className="flex">
        <HrSidebar
          identity={identity}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
