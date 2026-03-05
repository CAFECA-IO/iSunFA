"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import LegalModal from "@/components/common/legal_modal";
import { IPaymentModalProps, IOenCheckoutResponse, IOrderStatusResponse } from "@/interfaces/payment";

const parseCardInfo = (data: unknown) => {
  const pmData = data as Record<string, unknown> | undefined;
  const brand = pmData?.cardBrand || pmData?.issuer ? String(pmData.cardBrand || pmData.issuer) : "信用卡";
  const last4 = pmData?.card4no ? String(pmData.card4no) : "****";
  return { brand, last4 };
};


export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  amount,
  credits,
  baseCredits,
  bonusCredits,
  displayPrice,
  initialStep,
  transactionHash,
  orderId,
}: IPaymentModalProps) {
  const { t } = useTranslation();
  const { user, refreshAuth, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"confirm" | "processing" | "success" | "error">(
    initialStep || "confirm",
  );
  const [originalCredits, setOriginalCredits] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(transactionHash || null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("new");
  // Info: (20260302 - Tzuhan) 新增 isInitializingKyc 狀態，用於顯示「正在初始化身分與建立訂單...」的提示
  const [isInitializingKyc, setIsInitializingKyc] = useState(false);
  const [legalDoc, setLegalDoc] = useState<
    "terms_of_service" | "privacy_policy" | "refund_policy" | null
  >(null);

  const wasOpen = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setStep(initialStep || "confirm");
      setError(null);
      setLoading(false);
      setTxHash(transactionHash || null);

      if (initialStep !== "success") {
        setOriginalCredits(null);
      }

      console.log("Deprecate: (20260310 - Tzuhan) ", "[PaymentModal] Initializing with user paymentMethods:", user?.paymentMethods);

      setAgreedToTerms(false);
      setSelectedPaymentMethodId(user?.paymentMethods?.[0]?.id || "new");
    }
    wasOpen.current = isOpen;
  }, [initialStep, isOpen, transactionHash, user]);

  // Info: (20260302 - Tzuhan) 確保載入完畢後再給予正確的原有點數，避免載入太慢導致顯示 0 或導致無限 Loading
  useEffect(() => {
    if (isOpen && !authLoading && originalCredits === null) {
      if (user !== null) {
        setOriginalCredits(user.credits || 0);
      } else {
        setOriginalCredits(0);
      }
    }
  }, [isOpen, authLoading, originalCredits, user]);

  const handleClose = () => {
    if (!loading && step !== "processing") {
      onClose();
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    // Info: (20260302 - Tzuhan) [流程 5-4: 啟動輪詢] 抽出輪詢邏輯為獨立的非同步函式
    const pollOrderStatus = async () => {
      // Info: (20260303 - Tzuhan) 若狀態已經不是處理中，或沒有 orderId，或元件已卸載，則直接終止
      if (step !== "processing" || !orderId || !mounted) return;

      try {
        // Info: (20260302 - Tzuhan) [流程 5-5: 呼叫訂單狀態 API] 檢查訂單是否更新
        const res = await request<{ payload?: IOrderStatusResponse }>(
          `/api/v1/user/order/${orderId}`
        );

        // Info: (20260303 - Tzuhan) 防禦：如果等待 API 期間使用者關閉了彈窗（元件卸載），不應繼續更新 State
        if (!mounted) return;

        if (res?.payload) {
          const { status, transactionHash: tHash, errorMessage, data } = res.payload;

          if (status === "COMPLETED") {
            // Info: (20260302 - Tzuhan) [流程 5-6a: 訂單完成]
            await refreshAuth();
            if (tHash) setTxHash(tHash);

            // Info: (20260303 - Tzuhan) Extract `previousCredits` from order metadata as original credits.
            if (data?.previousCredits !== undefined) {
              setOriginalCredits(data.previousCredits);
            }

            setStep("success");
            if (tHash) onSuccess(tHash);
            return; // Info: (20260303 - Tzuhan) 成功即終止，不再呼叫 setTimeout

          } else if (status === "FAILED" || status === "MINT_FAILED") {
            // Info: (20260302 - Tzuhan) [流程 5-6b: 訂單失敗]
            setError(errorMessage || t("pricing.credits.payment_modal.processing_failed") || "付款處理失敗。請重試。");
            setStep("error");
            return; // Info: (20260303 - Tzuhan) 失敗即終止，不再呼叫 setTimeout
          }
        }

        // Info: (20260302 - Tzuhan) 若狀態仍為 PENDING，排程下一次輪詢
        // Info: (20260303 - Tzuhan) 使用 setTimeout 的好處：確保是「前一次請求完成後」才開始倒數 3 秒，絕對不會發生請求堆疊
        if (mounted) {
          timeoutId = setTimeout(pollOrderStatus, 3000);
        }

      } catch (err) {
        console.error("Deprecate: (20260310 - Tzuhan) ", "Failed to poll order status:", err);
        // Info: (20260303 - Tzuhan) 遇到網路瞬斷也可以容錯，繼續排程下一次輪詢
        if (mounted) {
          timeoutId = setTimeout(pollOrderStatus, 3000);
        }
      }
    };

    // Info: (20260303 - Tzuhan) 滿足條件時觸發第一次輪詢
    if (step === "processing" && orderId) {
      pollOrderStatus();
    }

    // Info: (20260303 - Tzuhan) 清理函式 (Cleanup Function)
    return () => {
      mounted = false; // Info: (20260303 - Tzuhan) 標記元件已卸載，阻斷尚未回來的 API 更新 State
      if (timeoutId) {
        clearTimeout(timeoutId); // Info: (20260303 - Tzuhan) 清除尚未執行的計時器
      }
    };
  }, [t, step, orderId, refreshAuth, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Info: (20260303 - Tzuhan) [流程 2-1: 確認付款] 使用者在付款彈窗中勾選同意條款並點擊確認付款
    setLoading(true);
    setError(null);

    try {
      // Info: (20260302 - Tzuhan) 將 KYC 部署時機延後至使用者勾選同意條款、點選「確認付款」後才執行
      // Info: (20260302 - Tzuhan) [流程 2-1a: 檢查並初始化身分] 若使用者目前無 KYC 身分，則先打 /api/v1/user/kyc，等它回傳成功後，緊接著後續流程
      if (user && !user.isVerified) {
        setIsInitializingKyc(true);
        await request("/api/v1/user/kyc", {
          method: "POST",
          body: JSON.stringify({
            fullName: user.name || "User", // Info: (20260302 - Tzuhan) 傳遞最小資料自動部署身分
            idNumber: "N/A",
            submittedAt: new Date().toISOString(),
          }),
        });
        // Info: (20260302 - Tzuhan) 部署成功後，重新整理使用者身分狀態
        await refreshAuth();
        setIsInitializingKyc(false);
      }

      // Info: (20260302 - Tzuhan) [流程 2-2: 呼叫後端結帳 API] 若本身已有 KYC (或上方剛建立完畢)，直接發送請求至後端建立訂單
      // Info: (20260302 - Tzuhan) 取得應援科技(OEN)結帳頁面 URL 或是直接扣款結果
      const isNewCard = selectedPaymentMethodId === "new";
      const endpoint = isNewCard ? "/api/v1/payment/oen/bind" : "/api/v1/payment/oen/checkout";
      const payloadBody = isNewCard ? {
        amount,
        credits,
      } : {
        amount,
        credits,
        previousCredits: originalCredits,
        paymentMethodId: selectedPaymentMethodId,
      };

      const response = await request<{
        message?: string;
        payload?: IOenCheckoutResponse;
      }>(endpoint, {
        method: "POST",
        body: JSON.stringify(payloadBody),
      });

      if (
        !response.payload?.requireBinding &&
        response.payload?.txHash
      ) {
        // Info: (20260303 - Tzuhan) [流程 2-3b: 直接扣款成功] 若選擇使用已綁定的卡片，後端會直接發動扣款並鑄造代幣。前端取得成功的 txHash 後更新畫面為「付款成功」
        await refreshAuth();
        setTxHash(response.payload.txHash);
        setStep("success");
        onSuccess(response.payload.txHash);
      } else if (response.payload?.requireBinding && response.payload.redirectUrl) {
        // Info: (20260303 - Tzuhan) [流程 2-3a: 需要導向應援科技金流] 若使用者選擇綁定新卡或尚未綁卡，後端會回傳 OEN 的結帳頁面 URL，前端將畫面導向該位址進行刷卡
        window.location.href = response.payload.redirectUrl;
        onClose();
        return;
      } else {
        throw new Error(response.message || "Payment failed");
      }
    } catch (err) {
      // Info: (20260303 - Tzuhan) [流程 2-3c: 捕捉錯誤] 若扣款 API 發生異常，顯示失敗畫面
      console.error("Deprecate: (20260310 - Tzuhan) ", "Payment Submission failed:", err);
      const errorMessage =
        (err as Error).message ||
        t("pricing.credits.payment_modal.processing_failed") || "付款處理失敗。請重試。";
      if (errorMessage !== "OK") {
        setError(errorMessage);
      } else {
        setError(t("pricing.credits.payment_modal.processing_failed") || "付款處理失敗。請重試。");
      }
      setStep("error");
    } finally {
      setIsInitializingKyc(false);
      setLoading(false);
    }
  };

  return (
    <>
      <Transition show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleClose}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 ring-1 ring-black/5">
                  <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleClose}
                      disabled={loading || step === "processing"}
                    >
                      <span className="sr-only">{t("common.close")}</span>
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="sm:flex sm:items-start w-full">
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      {authLoading || (step === "success" && originalCredits === null) ? (
                        <div className="flex flex-col items-center justify-center py-16 min-h-[300px]">
                          <Loader2 className="h-10 w-10 text-orange-500 animate-spin mb-4" />
                          <p className="text-gray-500 font-medium">
                            {t("pricing.credits.payment_modal.syncing_status") || "正在同步您的帳戶狀態..."}
                          </p>
                        </div>
                      ) : (
                        <>
                          {step === "processing" && (
                            <div className="flex flex-col items-center py-8">
                              <div className="mx-auto flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 sm:mx-0 sm:h-16 sm:w-16">
                                <Loader2 className="h-8 w-8 text-orange-600 animate-spin" />
                              </div>
                              <DialogTitle
                                as="h3"
                                className="mt-6 text-xl font-semibold leading-6 text-gray-900"
                              >
                                {t("pricing.credits.payment_modal.processing_title") || "處理中"}
                              </DialogTitle>

                              <div className="mt-4 w-full text-center px-4">
                                <p className="text-sm text-gray-500">
                                  {t("pricing.credits.payment_modal.processing_message") ||
                                    "授權已成功，正在發行區塊鏈點數至您的錢包，請稍候..."}
                                </p>
                              </div>
                            </div>
                          )}

                          {step === "confirm" && (
                            <>
                              <DialogTitle
                                as="h3"
                                className="text-base font-semibold leading-6 text-gray-900"
                              >
                                {t("pricing.credits.payment_modal.title")}
                              </DialogTitle>
                              <div className="mt-6 bg-gray-50/80 p-5 rounded-xl border border-gray-200/60 shadow-sm space-y-4">
                                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                  <span className="text-sm font-medium text-gray-500">
                                    {t("pricing.credits.payment_modal.amount_to_pay") || t("pricing.credits.payment_modal.amount_paid")}
                                  </span>
                                  <span className="text-xl font-bold text-gray-900 tracking-tight">
                                    {displayPrice || `$${amount}`}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center px-2">
                                  <span className="text-sm font-medium text-gray-500">
                                    {t("pricing.credits.payment_modal.tokens_to_receive") || t("pricing.credits.payment_modal.tokens_received")}
                                  </span>
                                  <div className="text-right flex flex-col items-end">
                                    <span className="text-lg font-bold text-orange-600">
                                      {baseCredits.toLocaleString()}{" "}
                                      {t("pricing.credits.payment_modal.credits_unit_short", { count: "" }).trim() || "點"}
                                    </span>
                                    {bonusCredits > 0 && (
                                      <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600 ring-1 ring-inset ring-orange-600/20 mt-1">
                                        + {t("pricing.credits.payment_modal.bonus_points", { count: bonusCredits.toLocaleString() }) || `贈送 ${bonusCredits.toLocaleString()} 點`}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {user && (
                                <div className="mt-6 space-y-3">
                                  <h4 className="text-sm font-semibold text-gray-900">
                                    {t("pricing.credits.payment_modal.payment_method") || "付款方式"}
                                  </h4>
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {(user.paymentMethods || []).map((pm) => {
                                      const { brand, last4 } = parseCardInfo(pm.data);
                                      const isSelected = selectedPaymentMethodId === pm.id;

                                      return (
                                        <label
                                          key={pm.id}
                                          htmlFor={`pm-${pm.id}`}
                                          className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all duration-200 ${isSelected
                                            ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                                            : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/30"
                                            }`}
                                        >
                                          <input
                                            id={`pm-${pm.id}`}
                                            type="radio"
                                            name="paymentMethod"
                                            value={pm.id}
                                            checked={isSelected}
                                            onChange={() => setSelectedPaymentMethodId(pm.id)}
                                            className="sr-only"
                                            aria-label={`${brand} **** ${last4}`}
                                          />
                                          <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center">
                                              <div className="text-sm">
                                                <p className={`font-semibold ${isSelected ? "text-orange-900" : "text-gray-900"}`}>
                                                  {brand}
                                                </p>
                                                <div className={`mt-1 flex items-center gap-2 ${isSelected ? "text-orange-700" : "text-gray-500"}`}>
                                                  <span className="text-xs">••••</span>
                                                  <span>{last4}</span>
                                                </div>
                                              </div>
                                            </div>
                                            <CheckCircle2
                                              className={`h-5 w-5 ${isSelected ? "text-orange-600" : "text-transparent"}`}
                                              aria-hidden="true"
                                            />
                                          </div>
                                        </label>
                                      );
                                    })}

                                    <label
                                      htmlFor="pm-new"
                                      className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all duration-200 ${selectedPaymentMethodId === "new"
                                        ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                                        : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/30"
                                        }`}
                                    >
                                      <input
                                        id="pm-new"
                                        type="radio"
                                        name="paymentMethod"
                                        value="new"
                                        checked={selectedPaymentMethodId === "new"}
                                        onChange={() => setSelectedPaymentMethodId("new")}
                                        className="sr-only"
                                        aria-label={t("pricing.credits.payment_modal.bind_new_card") || "綁定新信用卡"}
                                      />
                                      <div className="flex w-full items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className={`flex h-8 w-8 items-center justify-center rounded-full border border-dashed ${selectedPaymentMethodId === "new" ? "border-orange-400 bg-orange-100/50" : "border-gray-300 bg-gray-50"}`}>
                                            <svg className={`h-4 w-4 ${selectedPaymentMethodId === "new" ? "text-orange-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                          </div>
                                          <span className={`text-sm font-semibold ${selectedPaymentMethodId === "new" ? "text-orange-900" : "text-gray-900"}`}>
                                            {t("pricing.credits.payment_modal.bind_new_card") || "綁定新信用卡"}
                                          </span>
                                        </div>
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              )}

                              <div className="mt-4 flex flex-col gap-2">
                                <div className="relative flex items-start">
                                  <div className="flex h-6 items-center">
                                    <input
                                      id="tos-payment"
                                      aria-label="tos-payment"
                                      type="checkbox"
                                      checked={agreedToTerms}
                                      onChange={(e) =>
                                        setAgreedToTerms(e.target.checked)
                                      }
                                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600 cursor-pointer"
                                    />
                                  </div>
                                  <div className="ml-3 text-sm leading-6">
                                    <label
                                      htmlFor="tos-payment"
                                      className="font-medium text-gray-900 cursor-pointer"
                                    >
                                      {t("auth_modal.tos_agree") || "我同意"}{" "}
                                      <button
                                        type="button"
                                        className="font-semibold text-orange-600 hover:text-orange-500 underline decoration-transparent hover:decoration-orange-500 transition-all"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setLegalDoc("terms_of_service");
                                        }}
                                      >
                                        {t("auth_modal.tos_link") ||
                                          "使用條款 (Terms of Service)"}
                                      </button>{" "}
                                      {t("auth_modal.and") || "與"}{" "}
                                      <button
                                        type="button"
                                        className="font-semibold text-orange-600 hover:text-orange-500 underline decoration-transparent hover:decoration-orange-500 transition-all"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setLegalDoc("refund_policy");
                                        }}
                                      >
                                        {t("footer.refund") ||
                                          "退費政策 (Refund Policy)"}
                                      </button>
                                    </label>
                                  </div>
                                </div>
                              </div>

                              <form
                                onSubmit={handleSubmit}
                                className="mt-6 space-y-4"
                              >
                                <div className="mt-6 sm:flex sm:flex-row-reverse">
                                  <button
                                    type="submit"
                                    disabled={loading || !agreedToTerms}
                                    className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-orange-500 hover:to-orange-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto items-center gap-2"
                                  >
                                    {loading && (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    {loading
                                      ? isInitializingKyc
                                        // Info: (20260302 - Tzuhan) 當正在初始化身分時，顯示符合預期的等待訊息
                                        ? "正在初始化身分與建立訂單..."
                                        : t("pricing.credits.payment_modal.processing")
                                      : t("pricing.credits.payment_modal.confirm_btn")}
                                  </button>
                                  <button
                                    type="button"
                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleClose}
                                    disabled={loading}
                                  >
                                    {t("common.cancel")}
                                  </button>
                                </div>
                              </form>
                            </>
                          )}

                          {step === "success" && (
                            <div className="flex flex-col items-center">
                              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                <CheckCircle2
                                  className="h-6 w-6 text-green-600"
                                  aria-hidden="true"
                                />
                              </div>
                              <DialogTitle
                                as="h3"
                                className="mt-4 text-lg font-semibold leading-6 text-gray-900"
                              >
                                {t("pricing.credits.payment_modal.success_title") ||
                                  "購買成功"}
                              </DialogTitle>

                              <div className="mt-4 w-full bg-gray-50 p-4 rounded-md border border-gray-200 space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-500">
                                    {t(
                                      "pricing.credits.payment_modal.original_credits",
                                    ) || "原有點數"}
                                  </span>
                                  <span className="text-base font-medium text-gray-700">
                                    {(originalCredits || 0).toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                  <span className="text-sm text-gray-500">
                                    {t(
                                      "pricing.credits.payment_modal.amount_paid",
                                    ) || "支付金額"}
                                  </span>
                                  <span className="text-base font-medium text-gray-700">
                                    {displayPrice || `$${amount}`}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                  <span className="text-sm text-gray-500">
                                    {t(
                                      "pricing.credits.payment_modal.tokens_received",
                                    ) || "獲得點數"}
                                  </span>
                                  <span className="text-base font-medium text-green-600">
                                    +{baseCredits.toLocaleString()}{" "}
                                    {t(
                                      "pricing.credits.payment_modal.credits_unit_short",
                                      { count: "" },
                                    ).trim() || "點"}
                                    {bonusCredits > 0 && (
                                      <span className="text-sm font-normal ml-1">
                                        (
                                        {t(
                                          "pricing.credits.payment_modal.bonus_points",
                                          { count: bonusCredits.toLocaleString() },
                                        ) ||
                                          `活動贈與 ${bonusCredits.toLocaleString()} 點`}
                                        )
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                  <span className="text-sm font-medium text-gray-900">
                                    {t(
                                      "pricing.credits.payment_modal.current_credits",
                                    ) || "現在點數"}
                                  </span>
                                  <span className="text-lg font-bold text-gray-900">
                                    {(user?.credits || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {txHash && (
                                <div className="mt-4 w-full flex justify-center">
                                  <a
                                    href={`https://baifa.io/chain/isuncoin/txs/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 transition-colors"
                                    title="View Transaction on Block Explorer"
                                  >
                                    <span>
                                      Transaction: {txHash.substring(0, 10)}...
                                      {txHash.substring(txHash.length - 8)}
                                    </span>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                      <polyline points="15 3 21 3 21 9"></polyline>
                                      <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                  </a>
                                </div>
                              )}

                              <div className="mt-6 w-full sm:flex sm:flex-row-reverse">
                                <button
                                  type="button"
                                  className="inline-flex w-full justify-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 sm:ml-3 sm:w-auto"
                                  onClick={handleClose}
                                >
                                  {t("pricing.credits.payment_modal.close_btn") ||
                                    t("common.close") ||
                                    "關閉"}
                                </button>
                              </div>
                            </div>
                          )}

                          {step === "error" && (
                            <div className="flex flex-col items-center">
                              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                <XCircle
                                  className="h-6 w-6 text-red-600"
                                  aria-hidden="true"
                                />
                              </div>
                              <DialogTitle
                                as="h3"
                                className="mt-4 text-lg font-semibold leading-6 text-gray-900"
                              >
                                {t("pricing.credits.payment_modal.error_title") ||
                                  "購買失敗"}
                              </DialogTitle>

                              <div className="mt-4 w-full text-center">
                                <p className="text-sm text-gray-500">
                                  {error ||
                                    t("pricing.credits.payment_modal.processing_failed") || "付款處理失敗。請重試。"}
                                </p>
                              </div>

                              <div className="mt-6 mr-2 w-full sm:flex sm:flex-row-reverse">
                                <button
                                  type="button"
                                  className="inline-flex w-full justify-center rounded-md bg-white ml-3 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                  onClick={handleClose}
                                >
                                  {t("pricing.credits.payment_modal.close_btn") ||
                                    t("common.close") ||
                                    "關閉"}
                                </button>
                                <button
                                  type="button"
                                  className="mt-3 inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto sm:mt-0"
                                  onClick={() => setStep("confirm")}
                                >
                                  {t("pricing.credits.payment_modal.retry_btn") ||
                                    "返回重試"}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
      <LegalModal
        isOpen={!!legalDoc}
        onClose={() => setLegalDoc(null)}
        documentType={legalDoc}
      />
    </>
  );
}
