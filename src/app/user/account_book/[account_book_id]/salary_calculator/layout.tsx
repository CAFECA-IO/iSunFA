import { ReactNode } from "react";
import { CalculatorProvider } from "@/contexts/calculator_context";

/**
 * Info: (20260901 - Julian) 帳本版薪資計算機三個頁面共用**同一個** CalculatorProvider。
 *
 * ## 為什麼要提到 layout
 *
 * 原本三個 `page.tsx` 各自包一層 provider。同一份程式碼、不同的實例 ——
 * 於是薪資紀錄頁的「載回計算機」寫進去的是紀錄頁那顆 provider 的 state，
 * 而 `router.push` 導到計算機頁時，那顆 provider 隨著頁面卸載，
 * 計算機頁掛上的是一顆全新的、停在預設值的 provider。按鈕看起來沒有反應。
 *
 * App Router 的 layout 在同層路由之間切換時**不會重新掛載**，
 * 所以把 provider 提到這一層，state 才跨得過那次導頁。
 *
 * ## 這一層不做登入閘
 *
 * 登入來自 `src/app/user/layout.tsx` 的 `AuthGuard`，
 * 帳本 id 的 `"default"` 解析來自 `../layout.tsx`。這裡只提供 context。
 */
export default function AccountBookSalaryCalculatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <CalculatorProvider>{children}</CalculatorProvider>;
}
