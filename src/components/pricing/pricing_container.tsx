"use client";

import { useState, useEffect, ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";
import { MoneyUtil } from "@/lib/utils/money";
import { CREDIT_PLANS } from "@/config/credit_plans";
import { PaymentStep } from "@/interfaces/payment";
import { PendingBillingIntervalType } from "@/types/pricing";
import type { IPlanCatalogEntry } from "@/services/plan.service";

import ConfirmModal from "@/components/common/confirm_modal";
import AuthModal from "@/components/auth/auth_modal";
import PaymentModal from "@/components/pricing/payment_modal";
import { usePurchaseTarget } from "@/hooks/use_purchase_target";

import { PricingProvider } from "@/contexts/pricing_context";

interface IPricingContainerProps {
  activeTab: "subscription" | "credits" | "on_premise" | "solutions";
  /**
   * Info: (20260819 - Luphia) 方案目錄由 server 端的 `plan.service` 傳入（集中化 20260819）。
   *
   * 這個容器原本自己 import 價格常數來算揭露金額。價格與「有哪些方案」只能有一個來源：
   * 兩份讀法的代價不是重複，是**畫面顯示的金額與 server 計算的金額可以不一樣**，
   * 而使用者只會在帳單上發現。
   */
  plans: IPlanCatalogEntry[];
  children: ReactNode;
}

export default function PricingContainer({
  activeTab,
  plans,
  children,
}: IPricingContainerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState<PaymentStep>(
    PaymentStep.confirm,
  );
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string | ReactNode;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

  const [pendingAmount, setPendingAmount] = useState<string>("0");
  const [pendingCredits, setPendingCredits] = useState<string>("0");
  const [pendingBaseCredits, setPendingBaseCredits] = useState<string>("0");
  const [pendingBonusCredits, setPendingBonusCredits] = useState<string>("0");
  const [pendingDisplayPrice, setPendingDisplayPrice] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState<string>("");
  const [pendingPlanId, setPendingPlanId] = useState<string>("");
  const [pendingBillingInterval, setPendingBillingInterval] =
    useState<PendingBillingIntervalType>();
  const [pendingDetails, setPendingDetails] = useState<string[] | undefined>();
  /**
   * Info: (20260814 - Luphia) 點數包 id：團隊購點端點以 creditPlanId 建單（設計書 §6.1），
   * 不是自己算金額——價格由後端的 credit_plans 決定，前端算一份只會有機會算錯。
   */
  const [pendingCreditPlanId, setPendingCreditPlanId] = useState<string>("");

  /**
   * Info: (20260814 - Luphia) 訂閱 / 購點的歸屬對象（設計書 §6.1、§7）：
   * 訂閱一定屬於某個團隊（額度掛在 TeamSubscription 上），點數則可個人或團隊。
   * 選定團隊後由 hook 改走 team-scoped 端點建單，訂單才帶得到 teamId。
   */
  const purchaseTarget = usePurchaseTarget({
    planId: pendingPlanId,
    billingInterval: pendingBillingInterval,
    creditPlanId: pendingCreditPlanId,
    // Info: (20260814 - Luphia) 方案卡上的價格是**單一席次**的單價（規範 P2）
    unitPrice: Number(pendingAmount) || undefined,
  });

  /**
   * Info: (20260814 - Luphia) 訂閱選定團隊後，付款畫面顯示的是「席次 × 單價」的總額。
   * 沿用方案卡的單價會讓五人團隊看到 840、卡卻被扣 4,200——價目與實收不一致
   * 是最不能出現在結帳畫面上的東西。實收金額仍由 server 依當下人數計算。
   */
  const effectiveAmount =
    purchaseTarget.seatAmount !== null
      ? String(purchaseTarget.seatAmount)
      : pendingAmount;
  const effectiveDisplayPrice =
    purchaseTarget.seatAmount !== null
      ? `NT$ ${purchaseTarget.seatAmount.toLocaleString()}`
      : pendingDisplayPrice;

  const onSelectSubscription = (
    planKey: string,
    title: string,
    billingInterval: "month" | "year",
  ) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const plan = plans.find((entry) => entry.id === planKey);
    /**
     * Info: (20260819 - Luphia) 目錄裡沒有這個方案就**不開付款畫面**。
     *
     * 先前的寫法是 `SUBSCRIPTION_PLAN_PRICE[planKey as keyof ...]`——那個 `as`
     * 讓未知的 planKey 在型別上看起來合法，執行時取到 undefined 再 `[...]`
     * 直接丟 TypeError（畫面卡住、沒有任何訊息）。價格揭露寧可不開，不能猜。
     */
    if (!plan) {
      console.warn(`[Pricing] unknown planKey: ${planKey}`);
      return;
    }
    const amount = (
      billingInterval === "month" ? plan.monthlyPrice : plan.yearlyPrice
    ).toString();
    /**
     * Info: (20260815 - Luphia) 訂閱不帶點數（PR #6652 第二輪 D）。
     *
     * `SUBSCRIPTION_PLAN_CREDITS` 是**對外承諾的保守值**，只用於方案頁把額度換算成
     * 「每月最多諮詢 N 個問題」（見 constants/price.ts 的說明）。先前把它灌進 modal
     * 的 credits state，靠 modal 內三道 `isTeamSubscription` 判斷才不會顯示出來——
     * 不變式應該放在資料來源，而不是散在呈現層的三個條件裡。
     */
    setPendingAmount(amount);
    setPendingCredits("0");
    setPendingBaseCredits("0");
    setPendingBonusCredits("0");
    setPendingDisplayPrice(`NT$ ${Number(amount).toLocaleString()}`);
    setPendingTitle(title);
    setPendingCreditPlanId("");
    setPendingPlanId(planKey);
    setPendingBillingInterval(billingInterval);
    setPendingDetails(undefined);
    setModalInitialStep(PaymentStep.confirm);
    setPaymentModalOpen(true);
  };

  const onSelectCustomPlan = (
    planId: string,
    title: string,
    amount: number,
    interval?: "month" | "year",
    details?: string[],
  ) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    setPendingAmount(amount.toString());
    setPendingCredits("0");
    setPendingBaseCredits("0");
    setPendingBonusCredits("0");
    setPendingDisplayPrice(`NT$ ${amount.toLocaleString()}`);
    setPendingTitle(title);
    setPendingCreditPlanId("");
    setPendingPlanId(planId);
    setPendingBillingInterval(interval);
    setPendingDetails(details);
    setModalInitialStep(PaymentStep.confirm);
    setPaymentModalOpen(true);
  };

  const onSelectCredit = (
    plan: (typeof CREDIT_PLANS)[0],
    displayPrice: string,
  ) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    const baseCredits = MoneyUtil.toDecimal(plan.price.usd)
      .times(30)
      .toNumber();
    const bonus = plan.credits - baseCredits;

    setPendingAmount(plan.price.twd.toString());
    setPendingCredits(plan.credits.toString());
    setPendingBaseCredits(baseCredits.toString());
    setPendingBonusCredits((bonus > 0 ? bonus : 0).toString());
    setPendingDisplayPrice(displayPrice);
    setPendingTitle(t("pricing.credits.title"));
    setPendingCreditPlanId(plan.id);
    setPendingPlanId("");
    setPendingBillingInterval(undefined);
    setPendingDetails(undefined);
    setModalInitialStep(PaymentStep.confirm);
    setPaymentModalOpen(true);
  };

  useEffect(() => {
    const paymentSuccess = searchParams.get("payment_success");
    const paymentFailure = searchParams.get("payment_failure");
    if (paymentSuccess === "true") {
      const qsAmount = MoneyUtil.toDecimal(
        searchParams.get("amount") || 0,
      ).toString();
      const qsCredits = MoneyUtil.toDecimal(
        searchParams.get("credits") || 0,
      ).toString();
      const orderId = searchParams.get("order_id");

      setPendingAmount(qsAmount);
      setPendingCredits(qsCredits);
      if (orderId) setPendingOrderId(orderId);

      const matchedPlan = CREDIT_PLANS.find(
        (p) => p.credits.toString() === qsCredits,
      );
      let estimatedBase = qsCredits;
      let estimatedBonus = "0";

      if (matchedPlan) {
        estimatedBase = MoneyUtil.toDecimal(matchedPlan.price.usd)
          .times(30)
          .toString();
        estimatedBonus = MoneyUtil.toDecimal(matchedPlan.credits)
          .minus(estimatedBase)
          .isPositive()
          ? MoneyUtil.toDecimal(matchedPlan.credits)
              .minus(estimatedBase)
              .toString()
          : "0";
      }

      setPendingBaseCredits(estimatedBase);
      setPendingBonusCredits(estimatedBonus);
      setModalInitialStep(PaymentStep.processing);
      setPaymentModalOpen(true);

      const cleanPathname = pathname.split("?")[0];
      router.replace(cleanPathname, { scroll: false });
    } else if (paymentFailure === "true") {
      setModalInitialStep(PaymentStep.error);
      setPaymentModalOpen(true);
      const cleanPathname = pathname.split("?")[0];
      router.replace(cleanPathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  const tabs = [
    {
      id: "credits",
      label: t("pricing.credits.tab_credits"),
      path: "/pricing/credits",
    },
    {
      id: "subscription",
      label: t("pricing.credits.tab_subscription"),
      path: "/pricing/subscription",
    },
    {
      id: "on_premise",
      label: t("pricing.on_premise.tab"),
      path: "/pricing/on_premise",
    },
    {
      id: "solutions",
      label: t("pricing.solutions.tab"),
      path: "/pricing/solutions",
    },
  ];

  const handleTabClick = (path: string) => {
    router.push(path, { scroll: false });
  };

  const contextValue = {
    onSelectSubscription,
    onSelectCustomPlan,
    onSelectCredit,
    setAuthModalOpen,
    setConfirmModal,
  };

  return (
    <PricingProvider value={contextValue}>
      <div className="bg-white">
        <main className="isolate">
          <div className="relative pt-14 text-center sm:pt-20 lg:pt-32">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {activeTab === "subscription"
                ? t("pricing.title")
                : activeTab === "on_premise"
                  ? t("pricing.on_premise.title")
                  : activeTab === "solutions"
                    ? t("pricing.solutions.title")
                    : t("pricing.credits.title")}
            </h1>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              {activeTab === "subscription"
                ? t("pricing.subtitle")
                : activeTab === "on_premise"
                  ? t("pricing.on_premise.subtitle")
                  : activeTab === "solutions"
                    ? t("pricing.solutions.subtitle")
                    : t("pricing.credits.subtitle")}
            </p>
          </div>

          <div className="mt-8 flex justify-center px-4 sm:px-0">
            <div className="grid max-w-md grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 sm:flex sm:max-w-none sm:flex-nowrap sm:justify-center">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.path)}
                  className={`${
                    activeTab === tab.id
                      ? "bg-white shadow-sm"
                      : "hover:bg-gray-50"
                  } w-full rounded-md px-6 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none sm:w-auto`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pricing-content-wrapper">{children}</div>
        </main>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {}}
          initialStep={modalInitialStep}
          amount={effectiveAmount}
          credits={pendingCredits}
          baseCredits={pendingBaseCredits}
          bonusCredits={pendingBonusCredits}
          displayPrice={effectiveDisplayPrice}
          orderId={pendingOrderId}
          title={pendingTitle}
          planId={pendingPlanId}
          billingInterval={pendingBillingInterval}
          details={pendingDetails}
          targetSelector={purchaseTarget.targetNode}
          orderCreator={purchaseTarget.orderCreator}
          purchaseBlockingMessage={purchaseTarget.blockingMessage}
        />
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          title={confirmModal.title}
          message={confirmModal.message}
        />
      </div>
    </PricingProvider>
  );
}
