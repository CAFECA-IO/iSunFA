"use client";

import { useState, useEffect, ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import {
  ANALYSIS_BASE_COSTS,
  REWARD_AMOUNTS,
  SUBSCRIPTION_PLAN_CREDITS,
  SUBSCRIPTION_PLAN_PRICE,
} from "@/constants/price";
import { CREDIT_PLANS } from "@/config/credit_plans";
import PricingCard from "@/components/pricing/pricing_card";
import { Check, Loader2 } from "lucide-react";
import ConfirmModal from "@/components/common/confirm_modal";
import { MoneyUtil } from "@/lib/utils/money";

import AuthModal from "@/components/auth/auth_modal";
import PaymentModal from "@/components/pricing/payment_modal";
import { PaymentStep } from "@/interfaces/payment";
import BusinessModelSection from "@/components/pricing/business_model_section";
import SolutionsPricingSection from "@/components/pricing/solutions_pricing_section";

type PendingBillingIntervalType = "month" | "year" | undefined;
export default function PricingPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab");
  const activeTab =
    tabParam === "subscription"
      ? "subscription"
      : tabParam === "credits"
        ? "credits"
        : tabParam === "solutions"
          ? "solutions"
          : "business_model";
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month",
  );
  const [pricingPlans, setPricingPlans] = useState<typeof CREDIT_PLANS>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string | ReactNode;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState<PaymentStep>(
    PaymentStep.confirm,
  );
  const [pendingAmount, setPendingAmount] = useState<string>("0");
  const [pendingCredits, setPendingCredits] = useState<string>("0");
  const [pendingBaseCredits, setPendingBaseCredits] = useState<string>("0");
  const [pendingBonusCredits, setPendingBonusCredits] = useState<string>("0");
  const [pendingDisplayPrice, setPendingDisplayPrice] = useState("");
  const [pendingTxHash, setPendingTxHash] = useState<string | undefined>();
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState<string>("");
  const [pendingPlanId, setPendingPlanId] = useState<string>("");
  const [pendingBillingInterval, setPendingBillingInterval] =
    useState<PendingBillingIntervalType>();

  // Info: (20260119 - Luphia) Allow guest users to select free plan to trigger login
  const currentPlan = user
    ? user.plan === "personal" || !user.plan
      ? "free"
      : user.plan
    : undefined;

  const showComingSoon = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: t("pricing.coming_soon_title"),
      message: (
        <span>
          {t("pricing.coming_soon_prefix")}
          <a
            href="https://www.economic.ntpc.gov.tw/Api/News/Page?id=8173"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 underline decoration-orange-600/30 hover:text-orange-500 hover:decoration-orange-500"
          >
            {t("pricing.coming_soon_program")}
          </a>
          {t("pricing.coming_soon_middle")}
          <a
            href="mailto:contact@isunfa.com"
            className="text-orange-600 underline decoration-orange-600/30 hover:text-orange-500 hover:decoration-orange-500"
          >
            {t("pricing.coming_soon_email")}
          </a>
          {t("pricing.coming_soon_suffix")}
        </span>
      ),
    });
  };

  const onSelectSubscription = (
    planKey: keyof typeof SUBSCRIPTION_PLAN_PRICE,
    title: string,
  ) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const amount =
      SUBSCRIPTION_PLAN_PRICE[planKey][
        billingInterval === "month" ? "monthly" : "yearly"
      ].toString();
    const credits = SUBSCRIPTION_PLAN_CREDITS[planKey].toString();

    setPendingAmount(amount);
    setPendingCredits(credits);
    setPendingBaseCredits(credits);
    setPendingBonusCredits("0");
    setPendingDisplayPrice(amount);
    setPendingTitle(title);
    setPendingPlanId(planKey);
    setPendingBillingInterval(billingInterval);
    setModalInitialStep(PaymentStep.confirm);
    setPaymentModalOpen(true);
  };

  useEffect(() => {
    // Info: (20260302 - Tzuhan) [流程 5-1: 接收應援科技(OEN)回傳結果] 當結帳跳轉 OEN 完畢後，OEN 會將用戶導轉回此頁面，並附帶 URL 查詢參數
    const paymentSuccess = searchParams.get("payment_success");
    const paymentFailure = searchParams.get("payment_failure");
    if (paymentSuccess === "true") {
      // Info: (20260302 - Tzuhan) [流程 5-2: 處理成功跳轉] 如果從 OEN 跳轉回來帶有付款成功訊息，從 URL 中解析出金額、點數及訂單 ID
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

      // Info: (20260302 - Tzuhan) [流程 5-3: 開啟處理中彈窗] 確認收到應援科技回傳後，重置瀏覽器 URL 並開啟付款處理中彈窗，並傳入 orderId 給 modal 進行輪詢
      setModalInitialStep(PaymentStep.processing);
      setPaymentModalOpen(true);

      router.replace(pathname, { scroll: false });
    } else if (paymentFailure === "true") {
      // Info: (20260302 - Tzuhan) [流程 5-4: 處理失敗跳轉] 如果付款失敗，開啟付款失敗的彈窗
      setModalInitialStep(PaymentStep.error);
      setPaymentModalOpen(true);

      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const response = await request<{ payload: typeof CREDIT_PLANS }>(
          "/api/v1/pricing/plans",
        );
        if (response && response.payload) {
          setPricingPlans(response.payload);
        } else {
          console.error(
            "Deprecate: (20260310 - Tzuhan) ",
            "Invalid plans response",
          );
        }
      } catch (e) {
        console.error(
          "Deprecate: (20260310 - Tzuhan) ",
          "Failed to fetch plans",
          e,
        );
      } finally {
        setLoadingPlans(false);
      }
    };

    if (activeTab === "credits") {
      fetchPlans();
    }
  }, [activeTab]);

  const getPrice = (plan: (typeof CREDIT_PLANS)[0]) => {
    switch (language) {
      case "zh-TW":
        return `NT$ ${plan.price.twd.toLocaleString()}`;
      case "zh-CN":
        return `¥ ${plan.price.cny.toLocaleString()}`;
      case "ja":
        return `¥ ${plan.price.jpy.toLocaleString()}`;
      case "ko":
        return `₩ ${plan.price.krw.toLocaleString()}`;
      default:
        return `$${plan.price.usd.toLocaleString()}`;
    }
  };

  const handlePaymentSuccess = async (txHash: string) => {
    setPendingTxHash(txHash);
  };

  return (
    <div className="bg-white">
      <main className="isolate">
        <div className="relative pt-14 text-center sm:pt-20 lg:pt-32">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {activeTab === "subscription"
              ? t("pricing.title")
              : activeTab === "business_model"
                ? t("pricing.business_model.title")
                : activeTab === "solutions"
                  ? t("pricing.solutions.title")
                  : t("pricing.credits.title")}
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            {activeTab === "subscription"
              ? t("pricing.subtitle")
              : activeTab === "business_model"
                ? t("pricing.business_model.subtitle")
                : activeTab === "solutions"
                  ? t("pricing.solutions.subtitle")
                  : t("pricing.credits.subtitle")}
          </p>
        </div>

        {/* Info: (20260104 - Luphia) Tab Switcher */}
        <div className="mt-8 flex justify-center px-4 sm:px-0">
          <div className="grid w-full max-w-md grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 sm:flex sm:max-w-none sm:flex-nowrap sm:justify-center">
            <button
              onClick={() =>
                router.push(`${pathname}?tab=credits`, { scroll: false })
              }
              className={`${
                activeTab === "credits"
                  ? "bg-white shadow-sm"
                  : "hover:bg-gray-50"
              } w-full rounded-md px-6 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none sm:w-auto`}
            >
              {t("pricing.credits.tab_credits")}
            </button>
            <button
              onClick={() =>
                router.push(`${pathname}?tab=subscription`, { scroll: false })
              }
              className={`${
                activeTab === "subscription"
                  ? "bg-white shadow-sm"
                  : "hover:bg-gray-50"
              } w-full rounded-md px-6 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none sm:w-auto`}
            >
              {t("pricing.credits.tab_subscription")}
            </button>
            <button
              onClick={() =>
                router.push(`${pathname}?tab=business_model`, { scroll: false })
              }
              className={`${
                activeTab === "business_model"
                  ? "bg-white shadow-sm"
                  : "hover:bg-gray-50"
              } w-full rounded-md px-6 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none sm:w-auto`}
            >
              {t("pricing.business_model.tab")}
            </button>
            <button
              onClick={() =>
                router.push(`${pathname}?tab=solutions`, { scroll: false })
              }
              className={`${
                activeTab === "solutions"
                  ? "bg-white shadow-sm"
                  : "hover:bg-gray-50"
              } w-full rounded-md px-6 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none sm:w-auto`}
            >
              {t("pricing.solutions.tab")}
            </button>
          </div>
        </div>

        {activeTab === "subscription" && (
          <>
            {/* Info: (20260104 - Luphia) Billing Interval Toggle */}
            <div className="mt-8 flex justify-center">
              <div className="relative flex rounded-full bg-gray-100 p-1">
                <button
                  onClick={() => setBillingInterval("month")}
                  className={`${
                    billingInterval === "month"
                      ? "bg-white shadow-sm"
                      : "hover:bg-gray-50"
                  } relative rounded-full px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
                >
                  {t("pricing.monthly")}
                </button>
                <button
                  onClick={() => setBillingInterval("year")}
                  className={`${
                    billingInterval === "year"
                      ? "bg-white shadow-sm"
                      : "hover:bg-gray-50"
                  } relative rounded-full px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
                >
                  {t("pricing.yearly")}
                </button>
                {billingInterval === "year" && (
                  <span className="absolute top-2 -right-20 -rotate-12 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    {t("pricing.save_percent")}
                  </span>
                )}
              </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 lg:px-8">
              <div className="mx-auto mt-4 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                <PricingCard
                  planKey="free"
                  billingInterval={billingInterval}
                  currentPlan={currentPlan}
                  features={[
                    t("pricing.plans.free.features.fido"),
                    {
                      text: t("pricing.plans.free.features.daily_credits", {
                        amount: REWARD_AMOUNTS.DAILY_CHECKIN_REWARD,
                      }),
                      tooltip: t("pricing.plans.free.features.credit_limit"),
                    },
                    {
                      text: t("pricing.plans.free.features.consults", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.free /
                            ANALYSIS_BASE_COSTS.AI_CONSULTING,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.free.features.consults_tooltip",
                        { price: ANALYSIS_BASE_COSTS.AI_CONSULTING },
                      ),
                    },
                    {
                      text: t("pricing.plans.free.features.vouchers", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.free /
                            ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.free.features.vouchers_overage_tooltip",
                        { price: ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS },
                      ),
                    },
                    {
                      text: t("pricing.plans.free.features.logistics", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.free /
                            ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.free.features.logistics_tooltip",
                        {
                          price:
                            ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                        },
                      ),
                    },
                    {
                      text: t("pricing.plans.free.features.ai_reports", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.free /
                            ANALYSIS_BASE_COSTS.AI_REPORT,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.free.features.ai_overage_tooltip",
                      ),
                    },
                  ]}
                  onSelect={showComingSoon}
                />
                <PricingCard
                  planKey="team"
                  billingInterval={billingInterval}
                  popular={true}
                  currentPlan={currentPlan}
                  onSelect={() =>
                    onSelectSubscription("team", t("pricing.plans.team.name"))
                  }
                  features={[
                    {
                      text: t("pricing.plans.team.features.fido"),
                      tooltip: t("pricing.plans.team.features.fido_tooltip"),
                    },
                    {
                      text: t("pricing.plans.team.features.monthly_credits", {
                        amount: SUBSCRIPTION_PLAN_CREDITS.team,
                      }),
                      tooltip: t(
                        "pricing.plans.team.features.monthly_credits_tooltip",
                      ),
                    },
                    {
                      text: t("pricing.plans.team.features.consults", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.team /
                            ANALYSIS_BASE_COSTS.AI_CONSULTING,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.team.features.consults_tooltip",
                        { price: ANALYSIS_BASE_COSTS.AI_CONSULTING },
                      ),
                    },
                    {
                      text: t("pricing.plans.team.features.vouchers", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.team /
                            ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.team.features.vouchers_overage_tooltip",
                        { price: ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS },
                      ),
                    },
                    {
                      text: t("pricing.plans.team.features.logistics", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.team /
                            ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.team.features.logistics_tooltip",
                        {
                          price:
                            ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                        },
                      ),
                    },
                    {
                      text: t("pricing.plans.team.features.ai_reports", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.team /
                            ANALYSIS_BASE_COSTS.AI_REPORT,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.team.features.ai_overage_tooltip",
                      ),
                    },
                    t("pricing.plans.team.features.analytics"),
                    t("pricing.plans.team.features.support"),
                  ]}
                />
                <PricingCard
                  planKey="business"
                  billingInterval={billingInterval}
                  currentPlan={currentPlan}
                  onSelect={() =>
                    onSelectSubscription(
                      "business",
                      t("pricing.plans.business.name"),
                    )
                  }
                  features={[
                    {
                      text: t("pricing.plans.business.features.fido"),
                      tooltip: t(
                        "pricing.plans.business.features.fido_tooltip",
                      ),
                    },
                    {
                      text: t(
                        "pricing.plans.business.features.monthly_credits",
                        { amount: SUBSCRIPTION_PLAN_CREDITS.business },
                      ),
                      tooltip: t(
                        "pricing.plans.business.features.monthly_credits_tooltip",
                      ),
                    },
                    {
                      text: t("pricing.plans.business.features.consults", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.business /
                            ANALYSIS_BASE_COSTS.AI_CONSULTING,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.business.features.consults_tooltip",
                        { price: ANALYSIS_BASE_COSTS.AI_CONSULTING },
                      ),
                    },
                    {
                      text: t("pricing.plans.business.features.vouchers", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.business /
                            ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.business.features.vouchers_overage_tooltip",
                        { price: ANALYSIS_BASE_COSTS.CERTIFICATE_ANALYSIS },
                      ),
                    },
                    {
                      text: t("pricing.plans.business.features.logistics", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.business /
                            ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.business.features.logistics_tooltip",
                        {
                          price:
                            ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                        },
                      ),
                    },
                    {
                      text: t("pricing.plans.business.features.ai_reports", {
                        amount: Math.floor(
                          SUBSCRIPTION_PLAN_CREDITS.business /
                            ANALYSIS_BASE_COSTS.AI_REPORT,
                        ),
                      }),
                      tooltip: t(
                        "pricing.plans.business.features.ai_overage_tooltip",
                      ),
                    },
                    t("pricing.plans.business.features.analytics"),
                    t("pricing.plans.business.features.support"),
                    {
                      text: t("pricing.plans.business.features.migration"),
                      tooltip: t(
                        "pricing.plans.business.features.migration_tooltip",
                      ),
                    },
                    {
                      text: t("pricing.plans.business.features.custom_tools"),
                      tooltip: t(
                        "pricing.plans.business.features.custom_tools_tooltip",
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === "business_model" && (
          <BusinessModelSection onSelect={showComingSoon} />
        )}

        {activeTab === "solutions" && (
          <SolutionsPricingSection onSelect={showComingSoon} />
        )}

        {activeTab === "credits" && (
          <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 lg:px-8">
            {loadingPlans ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
              </div>
            ) : (
              <div className="mx-auto mt-4 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                {pricingPlans.map((plan) => {
                  const popular = plan.popular;
                  const baseCredits = plan.price.usd * 30;
                  const bonus = Math.max(0, plan.credits - baseCredits);
                  const percent =
                    baseCredits > 0
                      ? Math.round((bonus / baseCredits) * 100)
                      : 0;

                  return (
                    <div
                      key={plan.id}
                      className={`relative flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 xl:p-10 ${popular ? "ring-2 ring-orange-600" : "ring-gray-200"}`}
                    >
                      {popular && (
                        <div className="absolute -top-4 right-0 left-0 mx-auto w-32 rounded-full bg-orange-600 px-3 py-1 text-center text-sm font-semibold text-white shadow-sm">
                          Most Popular
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg leading-8 font-semibold text-gray-900">
                          {t(`pricing.credits.plans.${plan.id}.credits`, {
                            count: plan.credits.toLocaleString(),
                          })}
                        </h3>
                        <p className="mt-4 text-sm leading-6 text-gray-600">
                          {t(`pricing.credits.plans.${plan.id}.desc`, {
                            bonus: bonus.toLocaleString(),
                            percent: percent.toString(),
                          })}
                        </p>
                        <p className="mt-6 flex items-baseline gap-x-1">
                          <span className="text-4xl font-bold tracking-tight text-gray-900">
                            {t(`pricing.credits.plans.${plan.id}.price`, {
                              price: getPrice(plan),
                            })}
                          </span>
                        </p>
                        <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                          <li className="flex gap-x-3">
                            <Check
                              className="h-6 w-5 flex-none text-orange-600"
                              aria-hidden="true"
                            />
                            {t("pricing.credits.items.validity")}
                          </li>
                          <li className="flex gap-x-3">
                            <Check
                              className="h-6 w-5 flex-none text-orange-600"
                              aria-hidden="true"
                            />
                            {t("pricing.credits.items.all_features")}
                          </li>
                        </ul>
                      </div>
                      <button
                        onClick={() => {
                          // Info: (20260302 - Tzuhan) [流程 1-1: 選擇方案] 使用者在定價頁面點擊某個方案的「購買」按鈕
                          if (!user) {
                            // Info: (20260302 - Tzuhan) [流程 1-2: 檢查登入狀態] 若尚未登入，則喚起登入/註冊流程
                            setAuthModalOpen(true);
                            return;
                          }

                          // Info: (20260302 - Tzuhan) [流程 1-3: 準備付款狀態] 記錄選擇的方案點數、金額以及顯示的價格，將狀態傳遞給後續的 PaymentModal 開啟使用
                          setPendingCredits(String(plan.credits));
                          setPendingBaseCredits(String(baseCredits));
                          setPendingBonusCredits(String(bonus));
                          setPendingAmount(
                            language === "zh-TW"
                              ? String(plan.price.twd)
                              : String(plan.price.usd),
                          );
                          setPendingDisplayPrice(getPrice(plan));

                          // Info: (20260302 - Tzuhan) 移除直接在此處檢查 isVerified 的邏輯，改由 PaymentModal 進行。
                          // Info: (20260302 - Tzuhan) [流程 1-4: 開啟付款彈窗] 使用者點擊後直接開啟 PaymentModal，讓使用者先看到明細與條款
                          setModalInitialStep(PaymentStep.confirm);
                          setPaymentModalOpen(true);
                        }}
                        className={`mt-8 block flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-center text-sm leading-6 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          popular
                            ? "bg-orange-600 text-white shadow-sm hover:bg-orange-500 focus-visible:outline-orange-600"
                            : "bg-orange-50 text-orange-600 hover:bg-orange-100 focus-visible:outline-orange-600"
                        }`}
                      >
                        {t("pricing.credits.buy_btn")}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />

        <PaymentModal
          isOpen={paymentModalOpen}
          initialStep={modalInitialStep}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
          amount={pendingAmount}
          credits={pendingCredits}
          baseCredits={pendingBaseCredits}
          bonusCredits={pendingBonusCredits}
          displayPrice={pendingDisplayPrice}
          transactionHash={pendingTxHash}
          orderId={pendingOrderId}
          title={pendingTitle}
          planId={pendingPlanId}
          billingInterval={pendingBillingInterval}
        />

        {/* Info: (20260116 - Luphia) Coming Soon Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          }
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={t("common.close")}
        />
      </main>
    </div>
  );
}
