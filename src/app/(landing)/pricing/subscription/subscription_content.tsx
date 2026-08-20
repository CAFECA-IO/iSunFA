"use client";

import { useState } from "react";
import PricingCard from "@/components/pricing/pricing_card";
import { ANALYSIS_BASE_COSTS } from "@/constants/price";
import { TEAM_PLAN, type TeamPlanId } from "@/constants/subscription_quota";
import type { IPlanCatalogEntry } from "@/services/plan.service";
import {
  isTeamPlanId,
  resolveUnanimousPlan,
} from "@/lib/subscription/plan_rules";
import { usePricing } from "@/contexts/pricing_context";
import { useAuth } from "@/contexts/auth_context";
import { useTranslation } from "@/i18n/i18n_context";

interface ISubscriptionContentProps {
  /**
   * Info: (20260819 - Luphia) 方案目錄（`plan.service.listPlans()`，由 server 端傳入）。
   *
   * 這個檔案原本自己 import 月配點與儲存空間常數，方案卡另外自己 import 價格——
   * 於是「有哪些方案、各自的數字」有三份讀法。目錄化之後只有 `plan.service`
   * 讀得到那些來源，這裡拿到的是同一份事實（見 CLAUDE.md §3「單一來源」）。
   */
  plans: IPlanCatalogEntry[];
  // Info: (20260809 - Luphia) 額度倍數由 server 端計算後傳入（見 page.tsx 的 hydration 說明）
  teamQuotaMultiple: number;
  businessQuotaMultiple: number;
  /**
   * Info: (20260812 - Luphia) 費思記憶保留天數同為 DB 系統設定，由 server 端讀妥傳入；
   * 嚴禁在此直接引用 DEFAULT_FAITH_MEMORY_RETENTION_DAYS，那會讓後台調整後
   * 方案頁仍顯示舊天數，而條款與實際刪除行為卻已改變。
   */
  faithMemoryRetentionDays: number;
  /**
   * Info: (20260815 - Luphia) 免費版人數上限（PR #6652 第二輪 B-4）：同為 DB 系統設定，
   * 由 server 端讀妥傳入。服務條款 §3.1 寫的是「以方案頁標示為準」——
   * 這個數字就是那個標示，因此不得在此寫死或改引用程式常數。
   */
}

export default function SubscriptionContent({
  plans,
  teamQuotaMultiple,
  businessQuotaMultiple,
  faithMemoryRetentionDays,
}: ISubscriptionContentProps) {
  const { onSelectSubscription, setAuthModalOpen, setConfirmModal } =
    usePricing();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month",
  );

  /**
   * Info: (20260809 - Luphia) 方案功能列僅列出「費思人工智能代理人」（產品調整 20260809）：
   * 不再於此揭露計費費率與 token 計算方式，費率揭露改以服務條款 §3.4 為準。
   *
   * Info: (20260812 - Luphia) 記憶分兩層（服務條款 §3.7）：任務短期記憶各方案皆具備，
   * 長期記憶與回饋學習為付費訂閱權益。故免費版 tooltip 只述短期記憶，
   * 團隊版 / 企業版列「（專屬記憶）」並述兩層記憶；細節與保留天數由方案格下方段落承載
   * （天數自 server 傳入的系統設定值插值，見 props，與條款同源）。
   */
  /**
   * Info: (20260819 - Luphia) 目錄查表。缺項時回一組零值而不是丟錯：
   * 方案頁是公開頁面，少一個方案的數字不該讓整頁 500。
   */
  const planOf = (id: TeamPlanId): IPlanCatalogEntry =>
    plans.find((entry) => entry.id === id) ?? {
      id,
      isPaid: id !== TEAM_PLAN.FREE,
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyCredits: 0,
      storageGb: 0,
      quota: { per5h: 0, perWeek: 0 },
    };

  const faithAgentFeature = {
    text: t("pricing.faith_agent"),
    tooltip: t("pricing.faith_agent_free_tooltip"),
  };
  const faithAgentMemoryFeature = {
    text: t("pricing.faith_agent_memory"),
    tooltip: t("pricing.faith_agent_memory_tooltip", {
      days: faithMemoryRetentionDays,
    }),
  };

  /**
   * Info: (20260819 - Luphia) 「目前方案」標記改由**擁有的團隊**決定（修正 20260819）。
   *
   * 原本讀 `user.plan`，而 `/auth/me` 從來沒回過那個欄位：於是它永遠是 undefined，
   * 三格裡永遠是免費版被標成「目前方案」——付了團隊版的人打開方案頁，
   * 看到的仍然是「免費版 = 目前方案」。
   *
   * 規則是**全體一致才標**（`resolveUnanimousPlan`），不是取最高：這個標記會停用
   * 購買鈕，若某人擁有一個免費團隊與一個團隊版團隊而標成團隊版，
   * 他就再也無法為那個免費團隊訂閱團隊版。方案不一致時不標任何一格，
   * 三個鈕都可用，實際買給哪個團隊由付款畫面的歸屬選擇決定。
   */
  const currentPlan = resolveUnanimousPlan(
    (user?.ownedPlans ?? []).filter(isTeamPlanId),
  );

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

  return (
    <>
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
            monthlyPrice={planOf(TEAM_PLAN.FREE).monthlyPrice}
            yearlyPrice={planOf(TEAM_PLAN.FREE).yearlyPrice}
            billingInterval={billingInterval}
            currentPlan={currentPlan}
            features={[
              {
                text: t("pricing.plans.free.features.consults", {
                  amount: Math.floor(
                    planOf(TEAM_PLAN.FREE).monthlyCredits /
                      ANALYSIS_BASE_COSTS.AI_CONSULTING,
                  ),
                }),
                tooltip: t("pricing.plans.free.features.consults_tooltip", {
                  price: ANALYSIS_BASE_COSTS.AI_CONSULTING,
                }),
              },
              {
                text: t("pricing.plans.free.features.vouchers", {
                  amount: Math.floor(
                    planOf(TEAM_PLAN.FREE).monthlyCredits /
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
                    planOf(TEAM_PLAN.FREE).monthlyCredits /
                      ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                  ),
                }),
                tooltip: t("pricing.plans.free.features.logistics_tooltip", {
                  price: ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                }),
              },
              {
                text: t("pricing.plans.free.features.ai_reports", {
                  amount: Math.floor(
                    planOf(TEAM_PLAN.FREE).monthlyCredits /
                      ANALYSIS_BASE_COSTS.AI_REPORT,
                  ),
                }),
                tooltip: t("pricing.plans.free.features.ai_overage_tooltip"),
              },
              faithAgentFeature,
              t("pricing.plans.free.features.storage", {
                gb: planOf(TEAM_PLAN.FREE).storageGb,
              }),
              {
                /**
                 * Info: (20260819 - Luphia) 免費版**不限人數**（產品決定 20260819）。
                 *
                 * 原本這裡標示的是人數上限，而上限存在的理由是「額度依成員各自計算」。
                 * 免費版的額度已改為**全隊共用一份**，加人不再產生額度，上限因此移除。
                 * 這一格改成講清楚那件事——不標示的話，使用者會以為免費版的額度
                 * 也隨人數增加。
                 */
                text: t("pricing.plans.free.features.member_limit"),
                tooltip: t("pricing.plans.free.features.member_limit_tooltip"),
              },
            ]}
            onSelect={showComingSoon}
          />
          <PricingCard
            planKey="team"
            monthlyPrice={planOf(TEAM_PLAN.TEAM).monthlyPrice}
            yearlyPrice={planOf(TEAM_PLAN.TEAM).yearlyPrice}
            billingInterval={billingInterval}
            popular={true}
            currentPlan={currentPlan}
            onSelect={() =>
              onSelectSubscription(
                "team",
                t("pricing.plans.team.name"),
                billingInterval,
              )
            }
            features={[
              t("pricing.plans.team.features.quota_multiple", {
                multiple: teamQuotaMultiple,
              }),
              {
                text: t("pricing.plans.team.features.consults", {
                  amount: Math.floor(
                    planOf(TEAM_PLAN.TEAM).monthlyCredits /
                      ANALYSIS_BASE_COSTS.AI_CONSULTING,
                  ),
                }),
                tooltip: t("pricing.plans.team.features.consults_tooltip", {
                  price: ANALYSIS_BASE_COSTS.AI_CONSULTING,
                }),
              },
              {
                text: t("pricing.plans.team.features.vouchers", {
                  amount: Math.floor(
                    planOf(TEAM_PLAN.TEAM).monthlyCredits /
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
                    planOf(TEAM_PLAN.TEAM).monthlyCredits /
                      ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                  ),
                }),
                tooltip: t("pricing.plans.team.features.logistics_tooltip", {
                  price: ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                }),
              },
              {
                text: t("pricing.plans.team.features.ai_reports", {
                  amount: Math.floor(
                    planOf(TEAM_PLAN.TEAM).monthlyCredits /
                      ANALYSIS_BASE_COSTS.AI_REPORT,
                  ),
                }),
                tooltip: t("pricing.plans.team.features.ai_overage_tooltip"),
              },
              faithAgentMemoryFeature,
              t("pricing.plans.team.features.analytics"),
              t("pricing.plans.team.features.support"),
              t("pricing.plans.team.features.storage", {
                gb: planOf(TEAM_PLAN.TEAM).storageGb,
              }),
            ]}
          />
          <PricingCard
            planKey="business"
            monthlyPrice={planOf(TEAM_PLAN.BUSINESS).monthlyPrice}
            yearlyPrice={planOf(TEAM_PLAN.BUSINESS).yearlyPrice}
            billingInterval={billingInterval}
            currentPlan={currentPlan}
            onSelect={() =>
              onSelectSubscription(
                "business",
                t("pricing.plans.business.name"),
                billingInterval,
              )
            }
            features={[
              t("pricing.plans.business.features.quota_multiple", {
                multiple: businessQuotaMultiple,
              }),
              {
                text: t("pricing.plans.business.features.consults", {
                  amount: Math.floor(
                    planOf(TEAM_PLAN.BUSINESS).monthlyCredits /
                      ANALYSIS_BASE_COSTS.AI_CONSULTING,
                  ),
                }),
                tooltip: t("pricing.plans.business.features.consults_tooltip", {
                  price: ANALYSIS_BASE_COSTS.AI_CONSULTING,
                }),
              },
              {
                text: t("pricing.plans.business.features.vouchers", {
                  amount: Math.floor(
                    planOf(TEAM_PLAN.BUSINESS).monthlyCredits /
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
                    planOf(TEAM_PLAN.BUSINESS).monthlyCredits /
                      ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                  ),
                }),
                tooltip: t(
                  "pricing.plans.business.features.logistics_tooltip",
                  {
                    price: ANALYSIS_BASE_COSTS.TRANSPORTATION_CARBON_FOOTPRINT,
                  },
                ),
              },
              {
                text: t("pricing.plans.business.features.ai_reports", {
                  amount: Math.floor(
                    planOf(TEAM_PLAN.BUSINESS).monthlyCredits /
                      ANALYSIS_BASE_COSTS.AI_REPORT,
                  ),
                }),
                tooltip: t(
                  "pricing.plans.business.features.ai_overage_tooltip",
                ),
              },
              faithAgentMemoryFeature,
              t("pricing.plans.business.features.analytics"),
              t("pricing.plans.business.features.support"),
              {
                text: t("pricing.plans.business.features.migration"),
                tooltip: t("pricing.plans.business.features.migration_tooltip"),
              },
              {
                text: t("pricing.plans.business.features.custom_tools"),
                tooltip: t(
                  "pricing.plans.business.features.custom_tools_tooltip",
                ),
              },
              t("pricing.plans.business.features.storage", {
                gb: planOf(TEAM_PLAN.BUSINESS).storageGb,
              }),
            ]}
          />
        </div>

        {/**
         * Info: (20260812 - Luphia) 席次計費的補充說明（服務條款 §3.1 / §3.6，規範
         * team_seat_billing_and_email_invitation.md）：卡片上的數字是每席單價，
         * 「總額怎麼算」與「期中加人怎麼收」都影響購買決策，必須在價目牌旁講清楚。
         */}
        <section className="mx-auto mt-16 max-w-3xl rounded-2xl bg-gray-50 p-6 ring-1 ring-gray-200 sm:p-8">
          <h3 className="text-base font-semibold text-gray-900">
            {t("pricing.seat_billing_note_title")}
          </h3>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {t("pricing.seat_billing_note")}
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {t("pricing.seat_billing_note_change")}
          </p>
        </section>

        {/**
         * Info: (20260812 - Luphia) 費思專屬記憶的補充說明（服務條款 §3.7、隱私權政策 §5）：
         * 「記憶會累積」與「停止訂閱後會刪除」都影響購買決策，卡片的 tooltip 容不下，
         * 故於方案格下方以完整段落說明，並回指條款供查證。
         */}
        <section className="mx-auto mt-8 max-w-3xl rounded-2xl bg-gray-50 p-6 ring-1 ring-gray-200 sm:p-8">
          <h3 className="text-base font-semibold text-gray-900">
            {t("pricing.faith_memory_note_title")}
          </h3>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {t("pricing.faith_memory_note")}
          </p>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {t("pricing.faith_memory_note_retention", {
              days: faithMemoryRetentionDays,
            })}
          </p>
        </section>
      </div>
    </>
  );
}
