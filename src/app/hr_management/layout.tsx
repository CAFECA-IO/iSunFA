"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/auth/auth_guard";
import HrHeader from "@/components/hr_management/hr_header";
import HrSidebar from "@/components/hr_management/hr_sidebar";
import { HR_IDENTITY_API } from "@/constants/hr_identity_api";
import { IHrIdentityView } from "@/interfaces/hr_identity";
import { IEnvelopeLike, request } from "@/lib/utils/request";

/**
 * Info: (20260810 - Julian) 人事管理系統的外框：頂部列 + 左側選單 + 主內容區。
 *
 * Info: (20260821 - Julian) 包在 `<AuthGuard>` 裡（review 第 16 輪）。
 *
 * ## 這裡先前沒有守衛，而 `/user/**` 與 `/admin/**` 都有
 *
 * `/user/**` 用 `<AuthGuard>`、`/admin/**` 用 `<AdminAuthGuard>`，
 * 而這一支兩個都沒有 —— 於是未登入者打得開 `/hr_management/*` 的外框：
 * 頂部列、側邊選單、每一頁的空狀態。**資料沒有外洩**（37 支 `/hr/` 端點
 * 全部走 `getIdentityFromDeWT`，無票一律 401），洩的是「這個系統有哪些
 * 功能、選單怎麼分組」。
 *
 * ## 為什麼不是環境變數的路徑閘
 *
 * 上一版在 `proxy.ts` 加了一道 `HR_MODULE_ENABLED` 的路徑閘，關著時
 * `/hr_management/*` 與任何一段是 `hr` 的 API 全回 404。它擋掉的**不只是
 * 本 PR 新增的東西**：`hr/attendance/**` 的 13 支 API 與 8 個頁面早就在
 * `origin/develop` 上（#6651），而 develop 的部署流程沒有那個環境變數 ——
 * merge 進去的那一刻打卡就整組 404。它又是 **build 時**的旗標
 * （Next 會把 `process.env` 內聯），改了面板不重新部署不會生效。
 *
 * 它多擋的只有「未登入者看得到空外框」這一件事，而那正是 `<AuthGuard>`
 * 本來就在做的事，且與全站同一個標準。
 *
 * ## 這道守衛擋不了什麼
 *
 * 它是 client-side 的（同 `/user/**`）：外框的 JS 仍然會送到瀏覽器，
 * 擋的是「渲染出來並且能操作」。真正的牆是每一支端點的 401 與
 * `assertMay*` —— 那些檢查一條都不能因為有了這層而省略。
 * 已登入的員工猜到網址仍然進得去 leave/overtime，那是刻意的：
 * 側邊選單本來就直接連過去。
 */
export default function HrManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  /**
   * Info: (20260818 - Julian) 換頁就回到最上方。
   *
   * ## 為什麼要自己做
   *
   * 這一層是 App Router 的共用 layout，切換子路由時 `<main>` 換了內容、
   * 外層的捲動容器卻沒有換 —— 於是捲軸停在原處。在桌機上頂多是小瑕疵，
   * 在手機上是**新頁面一進來就從中段開始**：使用者從「我的請假」捲到底
   * 點進「我的加班」，看到的是統計卡以下的某個位置，而畫面上沒有任何
   * 東西暗示上面還有內容。
   *
   * 不分裝置一律執行：桌機本來多半就在頂端，再捲一次沒有代價，
   * 而用 `matchMedia` 分流會多出一條只在某個寬度成立的路徑。
   */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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
    <AuthGuard>
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
    </AuthGuard>
  );
}
