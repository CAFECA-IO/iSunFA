import { useTranslation } from "@/i18n/i18n_context";
import { Check, HelpCircle } from "lucide-react";

// Info: (20260102 - Luphia) Renamed to IPricingProps for lint compliance
interface IPricingProps {
  planKey: "free" | "team" | "business";
  /**
   * Info: (20260819 - Luphia) 價格由呼叫端自方案目錄傳入（集中化 20260819）。
   * 卡片原本自己 import `SUBSCRIPTION_PLAN_PRICE`——那是「有哪些方案、多少錢」
   * 的第三份讀法，而它與 server 實際收的金額之間沒有任何東西保證一致。
   */
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  billingInterval: "month" | "year";
  features: (string | { text: string; tooltip?: string })[];
  popular?: boolean;
  currentPlan?: string;
  onSelect?: () => void;
}

export default function PricingCard({
  planKey,
  monthlyPrice,
  yearlyPrice,
  billingInterval,
  features,
  popular = false,
  currentPlan = undefined,
  onSelect = undefined,
}: IPricingProps) {
  const { t } = useTranslation();
  /**
   * Info: (20260820 - Luphia) 目前方案**只標記、不停用**（self-review A-1 / A-2）。
   *
   * 原本 `disabled={isCurrentPlan}`，於是同一個方案再也按不下去——而伺服器端對
   * 這兩件事都是支援的：
   *
   * - **改計費週期**（月繳改年繳）：方案沒變，只能從這一格進去，而它被停用了。
   * - **提早延長一期**：付款履行已改為展延（不再從現在重算），因此提早買不吃虧。
   *
   * 另一個理由更難察覺：`currentPlan` 來自**顯示**答案（鏈上為準）。鏈上卡片
   * 虛高時（履行漏掉、DB 還原舊備份）這一格會被停用，於是使用者**買不回**
   * 自己實際沒有的方案。停用一個購買鈕的代價，比多一次確認高得多。
   */
  const isCurrentPlan = currentPlan === planKey;

  const planPriceValue =
    billingInterval === "month" ? monthlyPrice : yearlyPrice;
  /**
   * Info: (20260820 - Luphia) 價格取不到時**不顯示數字、也不讓人按**
   *（self-review 風險 3）。
   *
   * 顯示 0 會被讀成「免費」——那是對外報價出錯，而錯的方向是我們吃虧之外還得
   * 跟客戶解釋。停用購買鈕與 `PricingContainer` 的 `unknown planKey` 一致，
   * 兩處不會再互相矛盾。
   */
  const priceUnavailable = planPriceValue === null;
  const price = priceUnavailable
    ? "—"
    : planPriceValue === 0
      ? t("pricing.free_cost")
      : `NT$ ${planPriceValue.toLocaleString()}`;

  return (
    <div
      className={`relative isolate flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 xl:p-10 ${popular ? "ring-2 ring-orange-600" : "ring-gray-200"}`}
    >
      {popular && (
        <div className="absolute -top-4 right-0 left-0 mx-auto w-32 rounded-full bg-orange-600 px-3 py-1 text-center text-sm font-semibold text-white shadow-sm">
          Most Popular
        </div>
      )}
      <div>
        <div className="flex items-center justify-between gap-x-4">
          <h3
            id={planKey}
            className={`text-lg leading-8 font-semibold ${popular ? "text-orange-600" : "text-gray-900"}`}
          >
            {t(`pricing.plans.${planKey}.name`)}
          </h3>
          {isCurrentPlan && (
            <span className="rounded-full bg-orange-600/10 px-2.5 py-0.5 text-xs font-semibold text-orange-600 ring-1 ring-orange-600/20 ring-inset">
              {t("pricing.current_plan")}
            </span>
          )}
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-600">
          {t(`pricing.plans.${planKey}.desc`)}
        </p>
        <p className="mt-6 flex items-baseline gap-x-1">
          <span className="text-4xl font-bold tracking-tight text-gray-900">
            {price}
          </span>
          {/**
           * Info: (20260814 - Luphia) 付費方案的單位是**每席**（規範 §1 拍板、席次計費已實作）：
           * 只寫「月繳」會讓人把卡片上的數字讀成團隊總額，而實收是這個數字乘上人數。
           * 免費版不依人數計費，維持原本的月繳／年繳。
           */}
          <span className="text-sm leading-6 font-semibold text-gray-600">
            /{" "}
            {(planPriceValue ?? 0) > 0
              ? t(
                  billingInterval === "month"
                    ? "pricing.per_seat_monthly"
                    : "pricing.per_seat_yearly",
                )
              : t(
                  billingInterval === "month"
                    ? "pricing.monthly"
                    : "pricing.yearly",
                )}
          </span>
        </p>
        {/**
         * Info: (20260812 - Luphia) 付費方案於價格下方明示要乘上團隊成員數（產品拍板 20260812，
         * 規範 team_seat_billing_and_email_invitation.md §1）：卡片上的數字是**每位成員**的費用，
         * 不是團隊總額。免費版不依人數計費，故不顯示此行。
         */}
        {(planPriceValue ?? 0) > 0 && (
          <p className="mt-2 text-xs leading-5 text-gray-500">
            {t("pricing.price_multiply_note")}
          </p>
        )}
        <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
          {features.map((feature, index) => {
            const isObject = typeof feature === "object";
            const text = isObject ? feature.text : feature;
            const tooltip = isObject ? feature.tooltip : undefined;

            return (
              <li key={index} className="flex items-center gap-x-3">
                <Check
                  className="h-6 w-5 flex-none text-orange-600"
                  aria-hidden="true"
                />
                <span>{text}</span>
                {tooltip && (
                  <div className="group relative flex items-center">
                    <HelpCircle className="h-4 w-4 cursor-help text-gray-400" />
                    {/* Info: (20260807 - Luphia) tooltip 為刻意深底白字：用不翻轉的 zinc，
                        gray-900 會被主題層在深色模式翻成近白，變白底白字（variant trap） */}
                    <span className="absolute bottom-full left-1/2 z-10 w-max max-w-xs -translate-x-1/2 rounded bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {tooltip}
                      <span className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 border-4 border-transparent border-t-zinc-900"></span>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <button
        aria-describedby={planKey}
        disabled={priceUnavailable}
        onClick={onSelect}
        className={`mt-8 block w-full rounded-md px-3 py-2 text-center text-sm leading-6 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          priceUnavailable
            ? "cursor-not-allowed bg-gray-100 text-gray-400 ring-1 ring-gray-200"
            : popular
              ? "bg-orange-600 text-white shadow-sm hover:bg-orange-500 focus-visible:outline-orange-600"
              : "bg-orange-50 text-orange-600 hover:bg-orange-100 focus-visible:outline-orange-600"
        }`}
      >
        {isCurrentPlan ? t("pricing.extend_plan") : t("pricing.select_plan")}
      </button>
    </div>
  );
}
