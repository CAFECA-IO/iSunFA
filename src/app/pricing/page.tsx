"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import PricingCard from "@/components/pricing/pricing_card";
import Header from "@/components/landing_page/header";
import Footer from "@/components/landing_page/footer";
import { Check, Minus, Plus, Lock } from "lucide-react";
import Image from "next/image";
import { MODULES } from "@/constants/modules";

import ConfirmModal from "@/components/common/confirm_modal";
import AuthModal from "@/components/auth/auth_modal";
import PaymentModal from "@/components/pricing/payment_modal";
import { request } from "@/lib/utils/request";
import { Loader2 } from "lucide-react";
import { CREDIT_PLANS } from "@/config/credit_plans";

export default function PricingPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab =
    searchParams.get("tab") === "credits" ? "credits" : "subscription";

  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month",
  );
  const [activeTab, setActiveTab] = useState<"subscription" | "credits">(
    initialTab,
  );
  const [pricingPlans, setPricingPlans] = useState<typeof CREDIT_PLANS>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [modalInitialStep, setModalInitialStep] = useState<
    "confirm" | "processing" | "success" | "error"
  >("confirm");
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingCredits, setPendingCredits] = useState(0);
  const [pendingBaseCredits, setPendingBaseCredits] = useState(0);
  const [pendingBonusCredits, setPendingBonusCredits] = useState(0);
  const [pendingDisplayPrice, setPendingDisplayPrice] = useState("");
  const [pendingTxHash, setPendingTxHash] = useState<string | undefined>();
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  // Info: (20260119 - Luphia) Allow guest users to select free plan to trigger login
  const currentPlan = user
    ? user.plan === "personal" || !user.plan
      ? "free"
      : user.plan
    : undefined;

  // Info: (20260115 - Luphia) Pricing Calculator State
  const [userCount, setUserCount] = useState(5);
  const [selectedModules, setSelectedModules] = useState<string[]>(
    MODULES.filter((m) => m.basic).map((m) => m.key),
  );

  const toggleModule = (moduleKey: string) => {
    const targetModule = MODULES.find((m) => m.key === moduleKey);
    if (targetModule?.basic) return; // Info: (20260117 - Luphia) Cannot toggle basic modules

    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((k) => k !== moduleKey)
        : [...prev, moduleKey],
    );
  };

  const totalPrice = 6825 + userCount * 105 + selectedModules.length * 1575;

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
            className="text-orange-600 hover:text-orange-500 underline decoration-orange-600/30 hover:decoration-orange-500"
          >
            {t("pricing.coming_soon_program")}
          </a>
          {t("pricing.coming_soon_middle")}
          <a
            href="mailto:contact@isunfa.com"
            className="text-orange-600 hover:text-orange-500 underline decoration-orange-600/30 hover:decoration-orange-500"
          >
            {t("pricing.coming_soon_email")}
          </a>
          {t("pricing.coming_soon_suffix")}
        </span>
      ),
    });
  };

  useEffect(() => {
    // Info: (20260302 - Tzuhan) [流程 5-1: 接收應援科技(OEN)回傳結果] 當結帳跳轉 OEN 完畢後，OEN 會將用戶導轉回此頁面，並附帶 URL 查詢參數
    const paymentSuccess = searchParams.get("payment_success");
    const paymentFailure = searchParams.get("payment_failure");
    if (paymentSuccess === "true") {
      // Info: (20260302 - Tzuhan) [流程 5-2: 處理成功跳轉] 如果從 OEN 跳轉回來帶有付款成功訊息，從 URL 中解析出金額、點數及訂單 ID
      const qsAmount = Number(searchParams.get("amount")) || 0;
      const qsCredits = Number(searchParams.get("credits")) || 0;
      const orderId = searchParams.get("order_id");

      setPendingAmount(qsAmount);
      setPendingCredits(qsCredits);
      if (orderId) setPendingOrderId(orderId);

      const matchedPlan = CREDIT_PLANS.find((p) => p.credits === qsCredits);
      let estimatedBase = qsCredits;
      let estimatedBonus = 0;

      if (matchedPlan) {
        estimatedBase = matchedPlan.price.usd * 30;
        estimatedBonus = Math.max(0, matchedPlan.credits - estimatedBase);
      }

      setPendingBaseCredits(estimatedBase);
      setPendingBonusCredits(estimatedBonus);

      // Info: (20260302 - Tzuhan) [流程 5-3: 開啟處理中彈窗] 確認收到應援科技回傳後，重置瀏覽器 URL 並開啟付款處理中彈窗，並傳入 orderId 給 modal 進行輪詢
      setModalInitialStep("processing");
      setPaymentModalOpen(true);

      router.replace(pathname, { scroll: false });
    } else if (paymentFailure === "true") {
      // Info: (20260302 - Tzuhan) [流程 5-4: 處理失敗跳轉] 如果付款失敗，開啟付款失敗的彈窗
      setModalInitialStep("error");
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
          console.error("Deprecate: (20260310 - Tzuhan) ", "Invalid plans response");
        }
      } catch (e) {
        console.error("Deprecate: (20260310 - Tzuhan) ", "Failed to fetch plans", e);
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
      <Header />

      <main className="isolate">
        <div className="relative pt-14 text-center sm:pt-20 lg:pt-32">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {activeTab === "subscription"
              ? t("pricing.title")
              : t("pricing.credits.title")}
          </h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">
            {activeTab === "subscription"
              ? t("pricing.subtitle")
              : t("pricing.credits.subtitle")}
          </p>
        </div>

        {/* Info: (20260104 - Luphia) Tab Switcher */}
        <div className="mt-8 flex justify-center">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab("subscription")}
              className={`${activeTab === "subscription"
                ? "bg-white shadow-sm"
                : "hover:bg-gray-50"
                } rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
            >
              {t("pricing.credits.tab_subscription")}
            </button>
            <button
              onClick={() => setActiveTab("credits")}
              className={`${activeTab === "credits"
                ? "bg-white shadow-sm"
                : "hover:bg-gray-50"
                } rounded-md px-8 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
            >
              {t("pricing.credits.tab_credits")}
            </button>
          </div>
        </div>

        {activeTab === "subscription" ? (
          <>
            {/* Info: (20260104 - Luphia) Billing Interval Toggle */}
            <div className="mt-8 flex justify-center">
              <div className="relative flex rounded-full bg-gray-100 p-1">
                <button
                  onClick={() => setBillingInterval("month")}
                  className={`${billingInterval === "month"
                    ? "bg-white shadow-sm"
                    : "hover:bg-gray-50"
                    } relative rounded-full px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
                >
                  {t("pricing.monthly")}
                </button>
                <button
                  onClick={() => setBillingInterval("year")}
                  className={`${billingInterval === "year"
                    ? "bg-white shadow-sm"
                    : "hover:bg-gray-50"
                    } relative rounded-full px-4 py-2 text-sm font-semibold text-gray-900 transition-all duration-200 focus:outline-none`}
                >
                  {t("pricing.yearly")}
                </button>
                {billingInterval === "year" && (
                  <span className="absolute -right-20 top-2 -rotate-12 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    {t("pricing.save_percent")}
                  </span>
                )}
              </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24 pt-10">
              <div className="mx-auto mt-4 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                <PricingCard
                  planKey="free"
                  billingInterval={billingInterval}
                  currentPlan={currentPlan}
                  features={[
                    t("pricing.plans.free.features.fido"),
                    {
                      text: t("pricing.plans.free.features.vouchers"),
                      tooltip: t(
                        "pricing.plans.free.features.vouchers_overage_tooltip",
                      ),
                    },
                    {
                      text: t("pricing.plans.free.features.ai_reports"),
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
                  onSelect={showComingSoon}
                  features={[
                    {
                      text: t("pricing.plans.team.features.fido"),
                      tooltip: t("pricing.plans.team.features.fido_tooltip"),
                    },
                    {
                      text: t("pricing.plans.team.features.vouchers"),
                      tooltip: t(
                        "pricing.plans.team.features.vouchers_overage_tooltip",
                      ),
                    },
                    {
                      text: t("pricing.plans.team.features.ai_reports"),
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
                  onSelect={showComingSoon}
                  features={[
                    {
                      text: t("pricing.plans.business.features.fido"),
                      tooltip: t(
                        "pricing.plans.business.features.fido_tooltip",
                      ),
                    },
                    {
                      text: t("pricing.plans.business.features.vouchers"),
                      tooltip: t(
                        "pricing.plans.business.features.vouchers_overage_tooltip",
                      ),
                    },
                    {
                      text: t("pricing.plans.business.features.ai_reports"),
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
                      text: t("pricing.plans.business.features.local_node"),
                      tooltip: t(
                        "pricing.plans.business.features.local_node_tooltip",
                      ),
                    },
                  ]}
                />
              </div>

              {/* Info: (20260115 - Luphia) Enterprise AI Adoption Plan Section */}
              <div className="mt-16 rounded-3xl bg-gradient-to-b from-gray-900 to-gray-800 p-1 shadow-2xl shadow-orange-900/20 ring-1 ring-white/10">
                <div className="rounded-[22px] bg-gray-900/50 px-6 py-8 sm:px-12 lg:px-12 lg:py-12 backdrop-blur-xl">
                  <div className="mx-auto flex max-w-2xl flex-col gap-16 lg:mx-0 lg:max-w-none lg:flex-row lg:items-start">
                    <div className="w-full flex-auto">
                      <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 sm:text-4xl">
                        {t("pricing.ai_adoption.title")}
                      </h2>
                      <p className="mt-6 text-lg leading-8 text-gray-300">
                        {t("pricing.ai_adoption.description")}
                      </p>

                      <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 text-base leading-7 text-gray-300 sm:grid-cols-2">
                        {(
                          t<string[]>("pricing.ai_adoption.features")
                        ).map((feature, index) => (
                          <li key={index} className="flex gap-x-3 items-center">
                            <div className="flex-none rounded-full bg-orange-500/10 p-1">
                              <Check
                                className="h-5 w-5 text-orange-400"
                                aria-hidden="true"
                              />
                            </div>
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {/* Info: (20260117 - Luphia) Add-ons Section */}
                      <div className="mt-12 border-t border-white/10 pt-10">
                        <div className="space-y-10">
                          {/* Info: (20260117 - Luphia) Additional User */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
                            <div>
                              <span className="text-lg font-medium text-white block">
                                {t("pricing.ai_adoption.user_count")}
                              </span>
                              <span className="text-sm text-gray-400 mt-1 block">
                                {t("pricing.ai_adoption.add_user_price")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-x-4 bg-black/20 rounded-xl p-1.5 ring-1 ring-white/10 w-full sm:w-auto">
                              <button
                                onClick={() =>
                                  setUserCount((prev) => Math.max(5, prev - 1))
                                }
                                className="p-2 rounded-lg hover:bg-white/10 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                                disabled={userCount <= 5}
                              >
                                <Minus className="h-5 w-5" />
                              </button>
                              <span className="w-12 text-center text-lg font-bold text-white tabular-nums">
                                {userCount}
                              </span>
                              <button
                                onClick={() => setUserCount((prev) => prev + 1)}
                                className="p-2 rounded-lg hover:bg-white/10 text-white transition-all hover:scale-105 active:scale-95"
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            </div>
                          </div>

                          {/* Info: (20260117 - Luphia) Additional Module */}
                          <div>
                            <div className="flex items-center justify-between gap-x-4 mb-8">
                              <div>
                                <span className="text-lg font-medium text-white block">
                                  {t("pricing.ai_adoption.add_module")}
                                </span>
                                <span className="text-sm text-gray-400 mt-1 block">
                                  {t("pricing.ai_adoption.add_module_price")}
                                </span>
                              </div>
                              <span className="inline-flex items-center rounded-full bg-orange-400/10 px-3 py-1 text-sm font-medium text-orange-400 ring-1 ring-inset ring-orange-400/20">
                                {selectedModules.length}{" "}
                                {t("pricing.ai_adoption.selected")}
                              </span>
                            </div>
                            <ul className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
                              {MODULES.map((mod) => {
                                const isSelected = selectedModules.includes(
                                  mod.key,
                                );
                                const isMandatory = mod.basic;

                                return (
                                  <li key={mod.key}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        !isMandatory && toggleModule(mod.key)
                                      }
                                      disabled={isMandatory}
                                      className={`
                                        group relative w-full h-full flex flex-row items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 text-left overflow-hidden
                                        ${isSelected
                                          ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-900/20 ring-1 ring-orange-500"
                                          : "bg-white/5 text-gray-400 ring-1 ring-white/10 hover:bg-white/10 hover:text-gray-200 hover:ring-white/20"
                                        }
                                        ${isMandatory ? "cursor-not-allowed" : "cursor-pointer active:scale-[0.98]"}
                                      `}
                                    >
                                      <div
                                        className={`
                                        flex-none p-1.5 rounded-md transition-colors
                                        ${isSelected ? "bg-white/20 text-white" : "bg-white/5 text-gray-400 group-hover:text-gray-300"}
                                      `}
                                      >
                                        <mod.icon className="h-4 w-4" />
                                      </div>
                                      <span className="font-medium leading-tight text-sm truncate">
                                        {t(`features.items.${mod.key}.title`)}
                                      </span>

                                      {isMandatory && (
                                        <div className="ml-auto text-white/40">
                                          <Lock className="h-3.5 w-3.5" />
                                        </div>
                                      )}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full flex-none lg:w-96 lg:sticky lg:top-24 flex flex-col gap-6">
                      <div className="relative aspect-[4/5] w-full rounded-2xl bg-gray-800 object-cover shadow-2xl ring-1 ring-white/10 overflow-hidden">
                        <Image
                          src="/images/hardware_lease.png"
                          alt="Hardware Lease"
                          fill
                          className="object-cover grayscale-[0.2] opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                          <p className="text-sm font-medium text-orange-400 mb-2">
                            On-Premise Solution
                          </p>
                          <h4 className="text-2xl font-bold text-white mb-2">
                            {t("pricing.ai_adoption.local_node")}
                          </h4>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {t("pricing.ai_adoption.local_node_tooltip")}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur-sm">
                        <div className="flex flex-col gap-y-2">
                          <span className="text-base font-semibold leading-7 text-gray-300">
                            {t("pricing.ai_adoption.total_estimated")}
                          </span>
                          <div className="flex items-baseline gap-x-2">
                            <h3 className="text-3xl font-bold tracking-tight text-white">
                              {t("pricing.currency_prefix")}
                              {totalPrice.toLocaleString()}
                            </h3>
                            <span className="text-base font-semibold leading-7 text-gray-400">
                              {t("pricing.ai_adoption.period")}
                            </span>
                          </div>
                        </div>

                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={showComingSoon}
                            className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-900/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-orange-900/30 hover:from-orange-400 hover:to-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 overflow-hidden"
                          >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                              {t("pricing.select_plan")}
                            </span>
                            <div className="absolute inset-0 bg-white/20 transition-transform duration-300 -translate-x-full group-hover:translate-x-0" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24 pt-10">
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
                        <div className="absolute -top-4 left-0 right-0 mx-auto w-32 rounded-full bg-orange-600 px-3 py-1 text-center text-sm font-semibold text-white shadow-sm">
                          Most Popular
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold leading-8 text-gray-900">
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
                          // [流程 1-1: 選擇方案] 使用者在定價頁面點擊某個方案的「購買」按鈕
                          if (!user) {
                            // [流程 1-2: 檢查登入狀態] 若尚未登入，則喚起登入/註冊流程
                            setAuthModalOpen(true);
                            return;
                          }

                          // [流程 1-3: 準備付款狀態] 記錄選擇的方案點數、金額以及顯示的價格，將狀態傳遞給後續的 PaymentModal 開啟使用
                          setPendingCredits(plan.credits);
                          setPendingBaseCredits(baseCredits);
                          setPendingBonusCredits(bonus);
                          setPendingAmount(
                            language === "zh-TW"
                              ? plan.price.twd
                              : plan.price.usd,
                          );
                          setPendingDisplayPrice(getPrice(plan));

                          // Info: (20260302 - Tzuhan) 移除直接在此處檢查 isVerified 的邏輯，改由 PaymentModal 進行。
                          // Info: (20260302 - Tzuhan) [流程 1-4: 開啟付款彈窗] 使用者點擊後直接開啟 PaymentModal，讓使用者先看到明細與條款
                          setModalInitialStep("confirm");
                          setPaymentModalOpen(true);
                        }}
                        className={`mt-8 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center justify-center gap-2 ${popular
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

      <Footer />
    </div>
  );
}
