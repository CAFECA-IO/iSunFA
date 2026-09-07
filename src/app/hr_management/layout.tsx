"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AttendanceAuthGate from "@/components/hr_management/attendance/attendance_auth_gate";
import HrHeader from "@/components/hr_management/hr_header";
import HrSidebar from "@/components/hr_management/hr_sidebar";
import { HR_IDENTITY_API } from "@/constants/hr_identity_api";
import { IHrIdentityView } from "@/interfaces/hr_identity";
import { IEnvelopeLike, request } from "@/lib/utils/request";

/**
 * Info: (20260810 - Julian) 人事管理系統的外框：頂部列 + 左側選單 + 主內容區。
 *
 * Info: (20260821 - Julian) 包在 `<AttendanceAuthGate>` 裡（review 第 16／17 輪）。
 *
 * ## 這裡先前沒有守衛，而 `/user/**` 與 `/admin/**` 都有
 *
 * `/user/**` 用 `<AuthGuard>`、`/admin/**` 用 `<AdminAuthGuard>`，
 * 而這一支兩個都沒有 —— 於是未登入者打得開 `/hr_management/*` 的外框：
 * 頂部列、側邊選單、每一頁的空狀態。洩的是「這個系統有哪些功能、
 * 選單怎麼分組」。
 *
 * ## 為什麼是 `AttendanceAuthGate` 而不是 `AuthGuard`
 *
 * 上一版用的是 `<AuthGuard>`，而**它會弄丟深連結**（review 第 17 輪）：
 * 未登入時 `AuthGuard` 直接 `router.replace("/")`，人落在行銷首頁。
 * 底下 13 個頁面本來**全部**包在 `AttendanceAuthGate` 裡，它未登入時
 * **就地**顯示登入卡並帶 `returnTo={pathname}`，登入後回到原頁 ——
 * 而 `AuthGuard` 在外層讓那個分支永遠到不了（`children` 從不掛載），
 * 約 125 行登入 UI 對匿名使用者變成死碼。
 *
 * 受害的是 QR code、書籤、假單通知連結，以及 session 過期的員工 ——
 * 那是**已經上線**的打卡流程。與被否決的那道環境變數閘同一類傷害
 * （它的罪是「merge 那一刻打卡整組 404」），較輕但同型。
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
 * 它是 client-side 的：外框的 JS 仍然會送到瀏覽器，擋的是「渲染出來並且
 * 能操作」。真正的牆是每一支端點的 401 與 `assertMay*` —— 那些檢查一條都
 * 不能因為有了這層而省略。已登入的員工猜到網址仍然進得去 leave/overtime，
 * 那是刻意的：側邊選單本來就直接連過去。
 *
 * **而「資料沒有外洩，因為端點會 401」這句話對 4 個頁面不成立**
 * （review 第 17 輪）：`employee` / `organization` / `movement` / 儀表板
 * 根本不打任何端點，它們讀的是打包進 JS bundle 的 `MOCK_HR_*` 常數。
 * 今天不外洩是因為**那些資料是假的**，不是因為 401 —— 而 `/api/v1/hr/*`
 * 上線那天那句話就會失效。見 `mock_hr_employees.ts` 的 ToDo。
 *
 * ## 底下每一頁也各自包了一次
 *
 * 那是外層守衛加上去之前就有的形狀，留著不影響正確性：children 只在
 * 已登入時掛載，內層那道立刻通過。
 * ToDo: (20260821 - Julian) 13 頁的內層 `AttendanceAuthGate` 可以收掉，
 * 但那是 13 個檔案的改動，與本輪的迴歸修復分開做。
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
    <AttendanceAuthGate>
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
    </AttendanceAuthGate>
  );
}
