"use client";

import { Fragment, useState, useEffect, useRef, FormEvent } from "react";

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
import { MoneyUtil } from "@/lib/utils/money";
import { requestAssertion } from "@/lib/auth/assertion_client";
import { encodeWebAuthnSignature } from "@/lib/auth/crypto_utils";
import {
  IPaymentModalProps,
  IOenCheckoutResponse,
  IOrderStatusResponse,
  PaymentStep,
  IOenCallbackData,
} from "@/interfaces/payment";
import { ORDER_STATUS, ORDER_TYPE } from "@/constants/status";
import { BANK_TRANSFER } from "@/constants/price";
import {
  PURCHASE_MODE,
  resolvePurchaseMode,
} from "@/lib/purchase/purchase_target";
import { HTTP_METHOD } from "@/constants/http";
import { IJSONObject } from "@/validators/common";
import EditCardModal from "@/components/user/billing/edit_card_modal";

interface IPaymentMethod {
  id: string;
  provider: string;
  data?: IJSONObject;
  isDefault: boolean;
  createdAt: string;
}

const parseCardInfo = (data: IOenCallbackData) => {
  const brand = "信用卡";
  const last4 = data?.paymentInfo ? String(data.paymentInfo) : "****";
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
  title,
  planId,
  billingInterval,
  details,
  targetSelector = undefined,
  orderCreator = undefined,
  purchaseBlockingMessage = null,
}: IPaymentModalProps) {
  const { t } = useTranslation();
  const { user, refreshAuth, loading: authLoading, sessionExpired } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<PaymentStep>(
    initialStep || PaymentStep.confirm,
  );
  const [originalCredits, setOriginalCredits] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(transactionHash || null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>("new");
  // Info: (20260302 - Tzuhan) 新增 isInitializingKyc 狀態，用於顯示「正在初始化身分與建立訂單...」的提示
  const [isInitializingKyc, setIsInitializingKyc] = useState(false);
  const [legalDoc, setLegalDoc] = useState<
    "terms_of_service" | "privacy_policy" | "refund_policy" | null
  >(null);

  const [internalOrderId, setInternalOrderId] = useState<string | null>(
    orderId || null,
  );

  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [requireSetupCard, setRequireSetupCard] =
    useState<IPaymentMethod | null>(null);

  // Info: (20260705 - Luphia) Bank transfer form state
  const [bankTransferInfo, setBankTransferInfo] = useState({
    companyName: "",
    taxId: "",
    contactPhone: "",
    mailingAddress: "",
  });

  const isBankTransferPlan =
    planId === "on_premise" ||
    (planId &&
      (planId.startsWith("iso14064") ||
        planId.startsWith("iso14067") ||
        planId.startsWith("carbon_label")));

  /**
   * Info: (20260814 - Luphia) 訂閱與購點的畫面語意完全不同：訂閱買到的是**額度視窗**
   * （每 5 小時 / 每週自動重置），不是錢包點數。沿用購點文案會承諾一筆從未發放的點數——
   * 履行路徑只寫 TeamSubscription，不 mint、不入池（設計書 §7）。
   */
  const isTeamSubscription =
    resolvePurchaseMode(planId, undefined) === PURCHASE_MODE.SUBSCRIPTION;

  const orderType =
    planId === "on_premise"
      ? ORDER_TYPE.BILLING_ON_PREMISE
      : isBankTransferPlan
        ? ORDER_TYPE.BILLING_SOLUTION
        : ORDER_TYPE.OEN_PAYMENT;

  const wasOpen = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setStep(initialStep || PaymentStep.confirm);
      setError(null);
      setLoading(false);
      setTxHash(transactionHash || null);

      if (initialStep !== PaymentStep.success) {
        setOriginalCredits(null);
      }

      setAgreedToTerms(false);
      setSelectedPaymentMethodId("new");

      const fetchPaymentMethods = async () => {
        try {
          setLoadingPaymentMethods(true);
          const pmResponse = await request<{
            payload: { paymentMethods: IPaymentMethod[] };
          }>("/api/v1/user/payment_method", {
            method: HTTP_METHOD.GET,
          });
          if (
            pmResponse &&
            pmResponse.payload &&
            pmResponse.payload.paymentMethods
          ) {
            setPaymentMethods(pmResponse.payload.paymentMethods);
            if (pmResponse.payload.paymentMethods.length > 0) {
              setSelectedPaymentMethodId(
                pmResponse.payload.paymentMethods[0].id,
              );
            }
          } else {
            setPaymentMethods([]);
          }
        } catch (err) {
          console.warn("Failed to fetch payment methods:", err);
          setPaymentMethods([]);
        } finally {
          setLoadingPaymentMethods(false);
        }
      };

      if (user) {
        fetchPaymentMethods();
      }
    }
    wasOpen.current = isOpen;
  }, [initialStep, isOpen, transactionHash, user]);

  // Info: (20260302 - Tzuhan) 確保載入完畢後再給予正確的原有點數，避免載入太慢導致顯示 0 或導致無限 Loading
  useEffect(() => {
    if (isOpen && !authLoading && originalCredits === null) {
      if (user !== null) {
        setOriginalCredits(user.credits || "0");
      } else {
        setOriginalCredits("0");
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
      // Info: (20260303 - Tzuhan) 若狀態已經不是處理中，或沒有 internalOrderId，或元件已卸載，則直接終止
      if (step !== "processing" || !internalOrderId || !mounted) return;

      try {
        // Info: (20260302 - Tzuhan) [流程 5-5: 呼叫訂單狀態 API] 檢查訂單是否更新
        const res = await request<{ payload?: IOrderStatusResponse }>(
          `/api/v1/user/order/${internalOrderId}`,
        );

        console.log(
          `[PaymentModal] pollOrderStatus: ${internalOrderId}, IOrderStatusResponse res:`,
          res,
        );

        // Info: (20260303 - Tzuhan) 防禦：如果等待 API 期間使用者關閉了彈窗（元件卸載），不應繼續更新 State
        if (!mounted) return;

        if (res?.payload) {
          const { status, transactionHash: tHash, errorMessage } = res.payload;

          if (status === ORDER_STATUS.COMPLETED) {
            // Info: (20260302 - Tzuhan) [流程 5-6a: 訂單完成]
            await refreshAuth();
            if (tHash) setTxHash(tHash);

            setStep(PaymentStep.success);
            if (tHash) onSuccess(tHash);
            return; // Info: (20260303 - Tzuhan) 成功即終止，不再呼叫 setTimeout
          } else if (
            status === ORDER_STATUS.FAILED ||
            status === ORDER_STATUS.PAYMENT_FAILED ||
            status === ORDER_STATUS.MINT_FAILED
          ) {
            // Info: (20260302 - Tzuhan) [流程 5-6b: 訂單失敗]
            setError(
              errorMessage ||
                t("pricing.credits.payment_modal.processing_failed"),
            );
            setStep(PaymentStep.error);
            return; // Info: (20260303 - Tzuhan) 失敗即終止，不再呼叫 setTimeout
          }
        }

        // Info: (20260302 - Tzuhan) 若狀態仍為 PENDING，排程下一次輪詢
        // Info: (20260303 - Tzuhan) 使用 setTimeout 的好處：確保是「前一次請求完成後」才開始倒數 3 秒，絕對不會發生請求堆疊
        if (mounted) {
          timeoutId = setTimeout(pollOrderStatus, 3000);
        }
      } catch (err) {
        console.error(
          "Deprecate: (20260310 - Tzuhan) ",
          "Failed to poll order status:",
          err,
        );
        // Info: (20260303 - Tzuhan) 遇到網路瞬斷也可以容錯，繼續排程下一次輪詢
        if (mounted) {
          timeoutId = setTimeout(pollOrderStatus, 3000);
        }
      }
    };

    // Info: (20260303 - Tzuhan) 滿足條件時觸發第一次輪詢
    if (step === "processing" && internalOrderId) {
      pollOrderStatus();
    }

    // Info: (20260303 - Tzuhan) 清理函式 (Cleanup Function)
    return () => {
      mounted = false; // Info: (20260303 - Tzuhan) 標記元件已卸載，阻斷尚未回來的 API 更新 State
      if (timeoutId) {
        clearTimeout(timeoutId); // Info: (20260303 - Tzuhan) 清除尚未執行的計時器
      }
    };
  }, [t, step, internalOrderId, refreshAuth, onSuccess]);

  const handleBindNewCard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await request<{
        message?: string;
        payload?: IOenCheckoutResponse;
      }>("/api/v1/user/payment_method", {
        method: HTTP_METHOD.POST,
      });
      console.log(`[PaymentModal] handleBindNewCard response:`, response);
      if (response.payload?.requireBinding && response.payload.redirectUrl) {
        window.location.href = response.payload.redirectUrl;
        onClose();
        return;
      } else {
        throw new Error(response.message || "Binding failed");
      }
    } catch (err) {
      console.error("Binding failed:", err);
      setError(t("pricing.credits.payment_modal.processing_failed"));
      setStep(PaymentStep.error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Info: (20260814 - Luphia) 簽章 + 扣款：兩條建單路徑（通用建單、團隊建單）共用。
   * 抽出來是因為團隊路徑必須走完全一樣的後續流程——不共用就會有一條分支慢慢長歪。
   */
  const completeCheckout = async (orderId: string, challenge: string) => {
    // Info: (20260306 - Tzuhan) 2. FIDO Signature
    if (!user?.pubKeyX || !user?.pubKeyY) {
      throw new Error("Missing public keys. Please re-login.");
    }

    /**
     * Info: (20260811 - Luphia) 走 requestAssertion，託管帳號才不會卡在永遠不會成功的系統對話框。
     * 這裡簽的是訂單自己的 challenge（伺服器產生的 sha256），
     * 託管路徑會以「這張訂單屬於本人且尚未付款」作為代簽的出處驗證。
     */
    const transferAuth = await requestAssertion({
      challenge,
      custody: user.custody,
      passkeyOptions: { allowCredentials: [] },
    });

    const encodedSignature = encodeWebAuthnSignature(
      transferAuth,
      BigInt(user.pubKeyX),
      BigInt(user.pubKeyY),
    );

    // Info: (20260306 - Tzuhan) 3. Submit Checkout
    const response = await request<{
      message?: string;
      payload?: IOenCheckoutResponse;
    }>(`/api/v1/user/payment_method/${selectedPaymentMethodId}/checkout`, {
      method: HTTP_METHOD.POST,
      body: JSON.stringify({
        orderId,
        authentication: {
          ...transferAuth,
          signature: encodedSignature,
        },
      }),
    });

    /**
     * Info: (20260814 - Luphia) 成功的判準不能只看 txHash：團隊訂閱與團隊購點是**離鏈履行**
     * （套用方案、點數入池），本來就沒有鏈上交易。只認 txHash 會把成功的團隊付款
     * 判成失敗，讓用戶在已扣款的情況下看到錯誤畫面。
     */
    const payload = response.payload;
    const fulfilled = Boolean(payload && !payload.requireBinding);
    if (!fulfilled || (!payload?.txHash && !payload?.success)) {
      throw new Error(response.message || "Payment failed");
    }

    await refreshAuth();
    setTxHash(payload.txHash ?? "");
    setStep(PaymentStep.success);
    onSuccess(payload.txHash ?? "");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isBankTransferPlan && step === PaymentStep.confirm) {
      setStep(PaymentStep.bank_transfer);
      return;
    }

    if (isBankTransferPlan && step === PaymentStep.bank_transfer) {
      setLoading(true);
      setError(null);
      try {
        // Info: (20260705 - Luphia) Create a pending order for bank transfer
        const res = await request<{ payload: { orderId: string } }>(
          "/api/v1/user/order",
          {
            method: HTTP_METHOD.POST,
            body: JSON.stringify({
              type: orderType, // Info: (20260705 - Luphia) Use the correct type
              amount,
              credits,
              paymentMethodId: BANK_TRANSFER,
              title,
              baseCredits,
              bonusCredits,
              planId,
              billingInterval,
              data: {
                ...bankTransferInfo,
                paymentMethod: BANK_TRANSFER,
              },
              items: [
                {
                  name: title,
                  quantity: 1,
                  unitPrice: amount,
                  amount: amount,
                  remark: BANK_TRANSFER,
                },
              ],
            }),
          },
        );

        if (res.payload?.orderId) {
          setInternalOrderId(res.payload.orderId);
        }
        setStep(PaymentStep.bank_transfer_success);
      } catch (err) {
        console.error("Bank transfer submission failed:", err);
        setError(t("pricing.credits.payment_modal.processing_failed"));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Info: (20260303 - Tzuhan) [流程 2-1: 確認付款] 使用者在付款彈窗中勾選同意條款並點擊確認付款
    setLoading(true);
    setError(null);

    try {
      // Info: (20260302 - Tzuhan) 將 KYC 部署時機延後至使用者勾選同意條款、點選「確認付款」後才執行
      // Info: (20260302 - Tzuhan) [流程 2-1a: 檢查並初始化身分] 若使用者目前無 KYC 身分，則先打 /api/v1/user/kyc，等它回傳成功後，緊接著後續流程
      if (user && !user.isVerified) {
        setIsInitializingKyc(true);
        await request("/api/v1/user/kyc", {
          method: HTTP_METHOD.POST,
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

      // Info: (20260305 - Tzuhan) 如果是新卡，應在選擇時就跳轉，這裡為防呆保護
      if (selectedPaymentMethodId === "new") {
        await handleBindNewCard();
        return;
      }

      // Info: (20260409 - Luphia) Check if the selected card requires setup
      const currentPm = paymentMethods.find(
        (p) => p.id === selectedPaymentMethodId,
      );
      if (currentPm) {
        const pmData = currentPm.data || {};
        if (!pmData.email || !pmData.buyerName || !pmData.billingAddress) {
          setRequireSetupCard(currentPm);
          setLoading(false);
          return;
        }
      }

      /**
       * Info: (20260814 - Luphia) 1. 建立訂單取得 challenge。
       * 歸屬團隊時由 orderCreator 走 team-scoped 端點建單（訂單帶 teamId，
       * 履行路徑才套得到方案 / 入得了池）；個人歸屬維持原本的通用建單。
       */
      if (orderCreator) {
        const teamOrder = await orderCreator(selectedPaymentMethodId);
        await completeCheckout(teamOrder.orderId, teamOrder.challenge);
        return;
      }

      const orderRes = await request<{
        payload: { orderId: string; challenge: string };
      }>("/api/v1/user/order", {
        method: HTTP_METHOD.POST,
        body: JSON.stringify({
          type: orderType,
          amount,
          credits,
          paymentMethodId: selectedPaymentMethodId,
          title,
          baseCredits,
          bonusCredits,
          planId,
          billingInterval,
          items: planId
            ? [
                {
                  name: title || "會員訂閱",
                  quantity: 1,
                  unitPrice: amount,
                  amount: amount,
                  remark: "購買會員資格",
                },
              ]
            : [
                {
                  name: `iSunFA ${baseCredits || credits} 點`,
                  quantity: 1,
                  unitPrice: amount,
                  amount: amount,
                  remark: `購買 ${baseCredits || credits} 點`,
                },
                ...(bonusCredits && bonusCredits !== "0"
                  ? [
                      {
                        name: `iSunFA ${bonusCredits} 點（贈品）`,
                        quantity: 1,
                        unitPrice: 0,
                        amount: 0,
                        remark: `贈送 ${bonusCredits} 點`,
                      },
                    ]
                  : []),
              ],
        }),
      });

      if (!orderRes?.payload) throw new Error("Failed to create payment order");
      const { orderId, challenge } = orderRes.payload;
      await completeCheckout(orderId, challenge);
    } catch (err) {
      // Info: (20260303 - Tzuhan) [流程 2-3c: 捕捉錯誤] 若扣款 API 發生異常，顯示失敗畫面
      console.error(
        "Deprecate: (20260310 - Tzuhan) ",
        "Payment Submission failed:",
        err,
      );
      const errorMessage =
        (err as Error).message ||
        t("pricing.credits.payment_modal.processing_failed");
      if (errorMessage !== "OK") {
        setError(errorMessage);
      } else {
        setError(t("pricing.credits.payment_modal.processing_failed"));
      }
      setStep(PaymentStep.error);
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
                <DialogPanel className="relative w-full transform overflow-hidden rounded-2xl bg-white px-4 pt-5 pb-4 text-left shadow-2xl ring-1 ring-black/5 transition-all sm:my-8 sm:max-w-lg sm:p-6">
                  <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={handleClose}
                      disabled={loading || step === "processing"}
                    >
                      <span className="sr-only">{t("common.close")}</span>
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="w-full">
                    <div className="mt-3 w-full text-left sm:mt-0">
                      {authLoading ||
                      (step === "success" && originalCredits === null) ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center py-16">
                          <Loader2 className="mb-4 h-10 w-10 animate-spin text-orange-500" />
                          <p className="font-medium text-gray-500">
                            {t("pricing.credits.payment_modal.syncing_status")}
                          </p>
                        </div>
                      ) : (
                        <>
                          {step === "processing" && (
                            <div className="flex flex-col items-center py-8">
                              <div className="mx-auto flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 sm:mx-0 sm:h-16 sm:w-16">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                              </div>
                              <DialogTitle
                                as="h3"
                                className="mt-6 text-xl leading-6 font-semibold text-gray-900"
                              >
                                {t(
                                  "pricing.credits.payment_modal.processing_title",
                                )}
                              </DialogTitle>

                              <div className="mt-4 w-full px-4 text-center">
                                <p className="text-sm text-gray-500">
                                  {t(
                                    "pricing.credits.payment_modal.processing_message",
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          {step === "confirm" && (
                            <>
                              <DialogTitle
                                as="h3"
                                className="text-xl font-bold tracking-tight text-gray-900"
                              >
                                {t("pricing.credits.payment_modal.title")}
                              </DialogTitle>
                              <div className="mt-6 space-y-4 rounded-xl border border-gray-200/60 bg-gray-50/80 p-4 shadow-sm sm:p-5">
                                <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                                  <span className="text-sm font-medium text-gray-500">
                                    {t(
                                      "pricing.credits.payment_modal.amount_to_pay",
                                    )}
                                  </span>
                                  <span className="text-xl font-bold tracking-tight text-gray-900">
                                    {displayPrice || `$${amount}`}
                                  </span>
                                </div>
                                {Number(baseCredits) > 0 &&
                                  !isTeamSubscription && (
                                    <div className="flex items-start justify-between px-2">
                                      <span className="pt-1 text-sm font-medium text-gray-500">
                                        {t(
                                          "pricing.credits.payment_modal.tokens_to_receive",
                                        )}
                                      </span>
                                      <div className="flex flex-col items-end text-right">
                                        <span className="text-lg font-bold text-orange-600">
                                          {Number(baseCredits).toLocaleString()}{" "}
                                          {t(
                                            "pricing.credits.payment_modal.credits_unit_short",
                                            { count: "" },
                                          ).trim()}
                                        </span>
                                        {bonusCredits !== "0" && (
                                          <span className="mt-1 inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-600 ring-1 ring-orange-600/20 ring-inset">
                                            +{" "}
                                            {t(
                                              "pricing.credits.payment_modal.bonus_points",
                                              {
                                                count:
                                                  Number(
                                                    bonusCredits,
                                                  ).toLocaleString(),
                                              },
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                {details && details.length > 0 && (
                                  <div className="flex flex-col px-2">
                                    <span className="mb-2 text-sm font-medium text-gray-500">
                                      {t(
                                        "pricing.credits.payment_modal.selected_modules",
                                      )}
                                    </span>
                                    <ul className="max-h-48 space-y-1 overflow-y-auto pr-2">
                                      {details.map((detail, index) => (
                                        <li
                                          key={index}
                                          className="flex items-start text-sm font-medium text-gray-700"
                                        >
                                          <CheckCircle2 className="mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-orange-500" />
                                          {detail}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {isTeamSubscription && (
                                  <div className="mt-2 rounded-md bg-orange-50 p-3">
                                    <p className="text-xs font-medium text-orange-800">
                                      {t(
                                        "pricing.credits.payment_modal.subscription_quota_note",
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/**
                               * Info: (20260814 - Luphia) 歸屬對象放在付款方式之前：
                               * 「買給誰」決定了這筆訂單的性質（團隊方案 / 團隊點數 / 個人點數），
                               * 是比「用哪張卡」更前面的決定。
                               */}
                              {user &&
                                !isBankTransferPlan &&
                                targetSelector && (
                                  <div className="mt-6">{targetSelector}</div>
                                )}

                              {user && !isBankTransferPlan && (
                                <div className="mt-6 space-y-3">
                                  <h4 className="flex items-center text-sm font-semibold text-gray-900">
                                    {t(
                                      "pricing.credits.payment_modal.payment_method",
                                    )}
                                    {loadingPaymentMethods && (
                                      <Loader2 className="ml-2 h-4 w-4 animate-spin text-gray-400" />
                                    )}
                                  </h4>
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {paymentMethods.map((pm) => {
                                      const { brand, last4 } = parseCardInfo(
                                        pm.data as IOenCallbackData,
                                      );
                                      const isSelected =
                                        selectedPaymentMethodId === pm.id;

                                      return (
                                        <label
                                          key={pm.id}
                                          htmlFor={`pm-${pm.id}`}
                                          className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm transition-all duration-200 focus:outline-none ${
                                            isSelected
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
                                            onChange={() =>
                                              setSelectedPaymentMethodId(pm.id)
                                            }
                                            className="sr-only"
                                            aria-label={`${brand} **** ${last4}`}
                                          />
                                          <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center">
                                              <div className="text-sm">
                                                <p
                                                  className={`font-semibold ${isSelected ? "text-orange-900" : "text-gray-900"}`}
                                                >
                                                  {(pm.data?.name as string) ||
                                                    brand}
                                                </p>
                                                <div
                                                  className={`mt-1 flex items-center gap-2 ${isSelected ? "text-orange-700" : "text-gray-500"}`}
                                                >
                                                  <span className="text-xs">
                                                    ••••
                                                  </span>
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

                                    <button
                                      type="button"
                                      onClick={handleBindNewCard}
                                      aria-label={t(
                                        "pricing.credits.payment_modal.bind_new_card",
                                      )}
                                      className="relative flex w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:border-orange-300 hover:bg-orange-50/30 focus:outline-none"
                                    >
                                      <div className="flex w-full items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50">
                                            <svg
                                              className="h-4 w-4 text-gray-400"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 4v16m8-8H4"
                                              />
                                            </svg>
                                          </div>
                                          <span className="text-sm font-semibold text-gray-900">
                                            {t(
                                              "pricing.credits.payment_modal.bind_new_card",
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isBankTransferPlan && (
                                <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50/50 p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                                      <svg
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                        />
                                      </svg>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-orange-900">
                                        {t("pricing.bank_transfer.title")}
                                      </p>
                                      <p className="mt-1 text-xs text-orange-700">
                                        {t(
                                          "pricing.bank_transfer.bank_info_note",
                                        )}
                                      </p>
                                      <div className="mt-3 space-y-2 border-t border-orange-200/50 pt-3">
                                        <div className="flex justify-between text-[11px] sm:text-xs">
                                          <span className="text-orange-800/70">
                                            {t(
                                              "pricing.bank_transfer.bank_name",
                                            )}
                                          </span>
                                          <span className="text-right font-semibold text-orange-900">
                                            {t(
                                              "pricing.bank_transfer.isunfa_bank_name",
                                            )}{" "}
                                            (
                                            {t(
                                              "pricing.bank_transfer.isunfa_bank_code",
                                            )}
                                            )
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-[11px] sm:text-xs">
                                          <span className="text-orange-800/70">
                                            {t(
                                              "pricing.bank_transfer.branch_name",
                                            )}
                                          </span>
                                          <span className="text-right font-semibold text-orange-900">
                                            {t(
                                              "pricing.bank_transfer.isunfa_branch_name",
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-[11px] sm:text-xs">
                                          <span className="text-orange-800/70">
                                            {t(
                                              "pricing.bank_transfer.account_name",
                                            )}
                                          </span>
                                          <span className="text-right font-semibold text-orange-900">
                                            {t(
                                              "pricing.bank_transfer.isunfa_account_name",
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-[11px] sm:text-xs">
                                          <span className="font-medium text-orange-800/70">
                                            {t(
                                              "pricing.bank_transfer.account_number",
                                            )}
                                          </span>
                                          <span className="text-right font-bold text-orange-600">
                                            {t(
                                              "pricing.bank_transfer.isunfa_account_number",
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
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
                                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                                    />
                                  </div>
                                  <div className="ml-3 text-sm leading-6">
                                    <label
                                      htmlFor="tos-payment"
                                      className="flex cursor-pointer flex-wrap items-center gap-x-1 font-medium text-gray-900"
                                    >
                                      <span>{t("auth_modal.tos_agree")}</span>
                                      <button
                                        type="button"
                                        className="font-semibold text-orange-600 underline decoration-transparent transition-all hover:text-orange-500 hover:decoration-orange-500"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setLegalDoc("terms_of_service");
                                        }}
                                      >
                                        {t("auth_modal.tos_link")}
                                      </button>
                                      <span>{t("auth_modal.and")}</span>
                                      <button
                                        type="button"
                                        className="font-semibold text-orange-600 underline decoration-transparent transition-all hover:text-orange-500 hover:decoration-orange-500"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setLegalDoc("refund_policy");
                                        }}
                                      >
                                        {t("footer.refund")}
                                      </button>
                                    </label>
                                  </div>
                                </div>
                              </div>

                              <form
                                onSubmit={handleSubmit}
                                className="mt-6 space-y-4"
                              >
                                {/**
                                 * Info: (20260814 - Luphia) 登入過期就不要讓他按下去：
                                 * 按了只會拿到 401，而錯誤訊息長得像系統故障。
                                 */}
                                {sessionExpired && (
                                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                                    {t("auth_modal.session_expired")}
                                  </p>
                                )}
                                {purchaseBlockingMessage && (
                                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                                    {purchaseBlockingMessage}
                                  </p>
                                )}
                                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4">
                                  <button
                                    type="submit"
                                    disabled={
                                      loading ||
                                      !agreedToTerms ||
                                      // Info: (20260814 - Luphia) 登入過期／歸屬對象未備妥都不讓送出
                                      sessionExpired ||
                                      Boolean(purchaseBlockingMessage) ||
                                      (!isBankTransferPlan &&
                                        paymentMethods.length <= 0)
                                    }
                                    className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:from-orange-500 hover:to-orange-400 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:flex-none"
                                  >
                                    {loading && (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    {loading
                                      ? isInitializingKyc
                                        ? // Info: (20260302 - Tzuhan) 當正在初始化身分時，顯示符合預期的等待訊息
                                          t(
                                            "pricing.credits.payment_modal.initializing_kyc",
                                          )
                                        : t(
                                            "pricing.credits.payment_modal.processing",
                                          )
                                      : t(
                                          isBankTransferPlan
                                            ? "common.next"
                                            : "pricing.credits.payment_modal.confirm_btn",
                                        )}
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex w-full flex-1 justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all ring-inset hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:flex-none"
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
                                className="mt-4 text-lg leading-6 font-semibold text-gray-900"
                              >
                                {t(
                                  "pricing.credits.payment_modal.success_title",
                                )}
                              </DialogTitle>

                              <div className="mt-4 w-full space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                                {/**
                                 * Info: (20260814 - Luphia) 訂閱不動個人點數，也不發錢包點數：
                                 * 顯示個人餘額前後與「獲得點數 +N」都是與事實相反的數字。
                                 */}
                                {!isTeamSubscription && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-500">
                                      {t(
                                        "pricing.credits.payment_modal.original_credits",
                                      )}
                                    </span>
                                    <span className="text-base font-medium text-gray-700">
                                      {MoneyUtil.format(originalCredits || "0")}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                                  <span className="text-sm text-gray-500">
                                    {t(
                                      "pricing.credits.payment_modal.amount_paid",
                                    )}
                                  </span>
                                  <span className="text-base font-medium text-gray-700">
                                    {displayPrice || `$${amount}`}
                                  </span>
                                </div>
                                {!isTeamSubscription && (
                                  <>
                                    <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                                      <span className="text-sm text-gray-500">
                                        {t(
                                          "pricing.credits.payment_modal.tokens_received",
                                        )}
                                      </span>
                                      <span className="text-base font-medium text-green-600">
                                        +{baseCredits.toLocaleString()}{" "}
                                        {t(
                                          "pricing.credits.payment_modal.credits_unit_short",
                                          { count: "" },
                                        ).trim()}
                                        {bonusCredits !== "0" && (
                                          <span className="ml-1 text-sm font-normal">
                                            (
                                            {t(
                                              "pricing.credits.payment_modal.bonus_points",
                                              {
                                                count:
                                                  bonusCredits.toLocaleString(),
                                              },
                                            )}
                                            )
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                                      <span className="text-sm font-medium text-gray-900">
                                        {t(
                                          "pricing.credits.payment_modal.current_credits",
                                        )}
                                      </span>
                                      <span className="text-lg font-bold text-gray-900">
                                        {(user?.credits || 0).toLocaleString()}
                                      </span>
                                    </div>
                                  </>
                                )}

                                {/**
                                 * Info: (20260814 - Luphia) 訂閱成功要說的是「方案已啟用、額度即刻生效」，
                                 * 而不是任何點數數字——這條路徑一點錢包點數都沒有發出去。
                                 */}
                                {isTeamSubscription && (
                                  <div className="border-t border-gray-200 pt-3 text-sm text-gray-600">
                                    {t(
                                      "pricing.credits.payment_modal.subscription_activated",
                                    )}
                                  </div>
                                )}
                              </div>

                              {txHash && (
                                <div className="mt-4 flex w-full justify-center">
                                  <a
                                    href={`https://baifa.io/chain/isuncoin/txs/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-orange-600"
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
                                      <line
                                        x1="10"
                                        y1="14"
                                        x2="21"
                                        y2="3"
                                      ></line>
                                    </svg>
                                  </a>
                                </div>
                              )}

                              <div className="mt-6 flex w-full justify-center sm:justify-end">
                                <button
                                  type="button"
                                  className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-orange-500 hover:to-orange-400 hover:shadow-lg sm:w-auto"
                                  onClick={handleClose}
                                >
                                  {t("pricing.credits.payment_modal.close_btn")}
                                </button>
                              </div>
                            </div>
                          )}

                          {step === PaymentStep.bank_transfer && (
                            <div className="space-y-6">
                              <DialogTitle
                                as="h3"
                                className="text-xl font-bold tracking-tight text-gray-900"
                              >
                                {t("pricing.bank_transfer.company_info_title")}
                              </DialogTitle>
                              <form
                                onSubmit={handleSubmit}
                                className="space-y-5"
                              >
                                <div className="space-y-4">
                                  <div className="space-y-1.5">
                                    <label
                                      htmlFor="companyName"
                                      className="block text-sm font-semibold text-gray-700"
                                    >
                                      {t("pricing.bank_transfer.company_name")}
                                    </label>
                                    <input
                                      type="text"
                                      id="companyName"
                                      required
                                      placeholder={t(
                                        "pricing.bank_transfer.company_name",
                                      )}
                                      value={bankTransferInfo.companyName}
                                      onChange={(e) =>
                                        setBankTransferInfo({
                                          ...bankTransferInfo,
                                          companyName: e.target.value,
                                        })
                                      }
                                      className="block w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-3 text-gray-900 transition-all outline-none placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label
                                      htmlFor="taxId"
                                      className="block text-sm font-semibold text-gray-700"
                                    >
                                      {t("pricing.bank_transfer.tax_id")}
                                    </label>
                                    <input
                                      type="text"
                                      id="taxId"
                                      required
                                      placeholder={t(
                                        "pricing.bank_transfer.tax_id",
                                      )}
                                      value={bankTransferInfo.taxId}
                                      onChange={(e) =>
                                        setBankTransferInfo({
                                          ...bankTransferInfo,
                                          taxId: e.target.value,
                                        })
                                      }
                                      className="block w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-3 text-gray-900 transition-all outline-none placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label
                                      htmlFor="contactPhone"
                                      className="block text-sm font-semibold text-gray-700"
                                    >
                                      {t("pricing.bank_transfer.contact_phone")}
                                    </label>
                                    <input
                                      type="tel"
                                      id="contactPhone"
                                      required
                                      placeholder={t(
                                        "pricing.bank_transfer.contact_phone",
                                      )}
                                      value={bankTransferInfo.contactPhone}
                                      onChange={(e) =>
                                        setBankTransferInfo({
                                          ...bankTransferInfo,
                                          contactPhone: e.target.value,
                                        })
                                      }
                                      className="block w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-3 text-gray-900 transition-all outline-none placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label
                                      htmlFor="mailingAddress"
                                      className="block text-sm font-semibold text-gray-700"
                                    >
                                      {t(
                                        "pricing.bank_transfer.mailing_address",
                                      )}
                                    </label>
                                    <textarea
                                      id="mailingAddress"
                                      required
                                      rows={2}
                                      placeholder={t(
                                        "pricing.bank_transfer.mailing_address",
                                      )}
                                      value={bankTransferInfo.mailingAddress}
                                      onChange={(e) =>
                                        setBankTransferInfo({
                                          ...bankTransferInfo,
                                          mailingAddress: e.target.value,
                                        })
                                      }
                                      className="block w-full resize-none rounded-xl border-gray-200 bg-gray-50/50 px-4 py-3 text-gray-900 transition-all outline-none placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                                    />
                                  </div>
                                </div>

                                <div className="mt-8 flex flex-col gap-3">
                                  <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-orange-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-orange-500 hover:to-orange-400 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {loading ? (
                                      <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                      t("pricing.bank_transfer.submit_btn")
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setStep(PaymentStep.confirm)}
                                    className="inline-flex w-full justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {t("common.back")}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}

                          {step === PaymentStep.bank_transfer_success && (
                            <div className="flex flex-col items-center">
                              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                <CheckCircle2
                                  className="h-6 w-6 text-green-600"
                                  aria-hidden="true"
                                />
                              </div>
                              <DialogTitle
                                as="h3"
                                className="mt-4 text-center text-lg leading-6 font-semibold text-gray-900"
                              >
                                {t("pricing.bank_transfer.success_message")}
                              </DialogTitle>

                              <div className="mt-6 w-full space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
                                <h4 className="border-b border-gray-200 pb-2 text-sm font-bold text-gray-900">
                                  {t("pricing.bank_transfer.title")}
                                </h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                      {t("pricing.bank_transfer.bank_name")}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {t(
                                        "pricing.bank_transfer.isunfa_bank_name",
                                      )}{" "}
                                      (
                                      {t(
                                        "pricing.bank_transfer.isunfa_bank_code",
                                      )}
                                      )
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                      {t("pricing.bank_transfer.branch_name")}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {t(
                                        "pricing.bank_transfer.isunfa_branch_name",
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                      {t("pricing.bank_transfer.account_name")}
                                    </span>
                                    <span className="font-medium text-gray-900">
                                      {t(
                                        "pricing.bank_transfer.isunfa_account_name",
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                      {t(
                                        "pricing.bank_transfer.account_number",
                                      )}
                                    </span>
                                    <span className="font-bold text-orange-600">
                                      {t(
                                        "pricing.bank_transfer.isunfa_account_number",
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                  type="button"
                                  className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-orange-500 hover:to-orange-400 hover:shadow-lg sm:w-auto"
                                  onClick={() => {
                                    window.location.href =
                                      "/user/billing?tab=orders";
                                    handleClose();
                                  }}
                                >
                                  {t(
                                    "pricing.credits.payment_modal.track_order_btn",
                                    {
                                      defaultValue: "追蹤訂單",
                                    },
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex w-full justify-center rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 sm:w-auto"
                                  onClick={handleClose}
                                >
                                  {t("pricing.credits.payment_modal.close_btn")}
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
                                className="mt-4 text-lg leading-6 font-semibold text-gray-900"
                              >
                                {t("pricing.credits.payment_modal.error_title")}
                              </DialogTitle>

                              <div className="mt-4 w-full text-center">
                                <p className="text-sm text-gray-500">
                                  {error ||
                                    t(
                                      "pricing.credits.payment_modal.processing_failed",
                                    )}
                                </p>
                              </div>

                              <div className="mt-6 flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-center sm:gap-4">
                                <button
                                  type="button"
                                  className="inline-flex w-full flex-1 justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all ring-inset hover:bg-gray-50 sm:w-auto sm:flex-none"
                                  onClick={handleClose}
                                >
                                  {t("pricing.credits.payment_modal.close_btn")}
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex w-full flex-1 justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-500 sm:w-auto sm:flex-none"
                                  onClick={() => setStep(PaymentStep.confirm)}
                                >
                                  {t("pricing.credits.payment_modal.retry_btn")}
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
      {requireSetupCard && (
        <EditCardModal
          isOpen={!!requireSetupCard}
          onClose={() => setRequireSetupCard(null)}
          onSave={async (data) => {
            try {
              const res = await request<{ payload: { success: boolean } }>(
                `/api/v1/user/payment_method/${requireSetupCard.id}`,
                {
                  method: "PATCH",
                  body: JSON.stringify(data),
                },
              );
              if (res?.payload?.success) {
                setPaymentMethods((prev) =>
                  prev.map((p) =>
                    p.id === requireSetupCard.id
                      ? { ...p, data: { ...p.data, ...data } }
                      : p,
                  ),
                );
                setRequireSetupCard(null);
                // Info: (20260409 - Luphia) Users must manually click 'Confirm' again after setup to avoid unexpected immediate charges
              }
            } catch (err) {
              console.error(err);
              setError(t("pricing.credits.payment_modal.processing_failed"));
            }
          }}
          initialData={{
            name:
              (requireSetupCard.data?.name as string) ||
              requireSetupCard.provider,
            email: (requireSetupCard.data?.email as string) || "",
            taxId: (requireSetupCard.data?.taxId as string) || "",
            buyerName: (requireSetupCard.data?.buyerName as string) || "",
            billingAddress:
              (requireSetupCard.data?.billingAddress as string) || "",
          }}
        />
      )}
    </>
  );
}
