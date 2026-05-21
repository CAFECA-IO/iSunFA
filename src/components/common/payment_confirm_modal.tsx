"use client";

import { Fragment, useState, useEffect, ReactNode } from "react";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Coins, X, Loader2, Copy, Check, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/common/confirm_modal";
import { MoneyUtil } from "@/lib/utils/money";

export type PaymentStatus =
  | "idle"
  | "preparing"
  | "signing_payment"
  | "submitting_payment"
  | "payment_success"
  | "error";

export interface IPaymentDetailItem {
  label: string;
  value: ReactNode;
}

interface IPaymentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cost: string | number;
  items?: IPaymentDetailItem[];
  title?: string;
  description?: string;
  confirmBtnText?: string;
  isLoading?: boolean;
  status?: PaymentStatus;
  errorMessage?: string;
  txHash?: string;
  extraContent?: ReactNode;
}

const EMPTY_ITEMS: IPaymentDetailItem[] = [];

export default function PaymentConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  cost,
  items = EMPTY_ITEMS,
  title = undefined,
  description = undefined,
  confirmBtnText = undefined,
  isLoading = false,
  status = "idle",
  errorMessage = undefined,
  txHash = undefined,
  extraContent = undefined,
}: IPaymentConfirmModalProps) {
  const { t } = useTranslation();
  const { user, refreshAuth } = useAuth();

  useEffect(() => {
    if (isOpen) {
      refreshAuth();
    }
  }, [isOpen, refreshAuth]);
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);
  const [showInsufficient, setShowInsufficient] = useState(false);

  const handleCopy = async () => {
    if (txHash) {
      await navigator.clipboard.writeText(txHash);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (!user) {
    return null;
  }

  const currentCredits = user.credits ?? "0";

  const isProcessing =
    status !== "idle" && status !== "error" && status !== "payment_success";
  const isSuccess = status === "payment_success";

  const balance = MoneyUtil.subtract(currentCredits, cost);
  const isBalanceNegative = MoneyUtil.isNegative(balance);

  return (
    <>
      <Transition show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={isProcessing ? () => {} : onClose}
        >
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
                <DialogPanel className="relative transform overflow-hidden rounded-xl bg-white px-4 pt-5 pb-4 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                  <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                      onClick={onClose}
                      disabled={isProcessing}
                    >
                      <span className="sr-only">Close</span>
                      <X className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="text-center sm:mt-0 sm:text-left">
                    <DialogTitle
                      as="h3"
                      className="flex items-center gap-2 text-lg leading-6 font-bold text-gray-900"
                    >
                      <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                        <Coins className="h-5 w-5" />
                      </div>
                      {title || t("analysis.confirm_title")}
                    </DialogTitle>

                    {/* Info: (20260409 - Luphia) Processing / Error / Success View */}
                    {isProcessing || status === "error" || isSuccess ? (
                      <div className="mt-6 space-y-6">
                        {/* Info: (20260409 - Luphia) Status Message */}
                        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg bg-gray-50 p-6 text-center">
                          {status === "error" ? (
                            <div className="space-y-2">
                              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                                <X
                                  className="h-6 w-6 text-red-600"
                                  aria-hidden="true"
                                />
                              </div>
                              <p className="text-sm font-medium text-red-600">
                                {errorMessage || t("auth_modal.failed")}
                              </p>
                            </div>
                          ) : isSuccess ? (
                            <div className="w-full space-y-2">
                              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                              </div>
                              <p className="text-sm font-bold text-green-600">
                                {t("analysis.steps.payment_success")}
                              </p>
                              <p className="text-xs text-gray-500">
                                {t("analysis.success.message")}
                              </p>
                              {txHash && (
                                <div className="mx-auto mt-2 flex max-w-[200px] items-center justify-center gap-2 rounded border border-gray-200 bg-white p-2">
                                  <p
                                    className="truncate font-mono text-xs text-gray-500"
                                    title={txHash}
                                  >
                                    {txHash}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="shrink-0 rounded-full p-1 transition-colors hover:bg-gray-100"
                                    title="Copy TxHash"
                                  >
                                    {isCopied ? (
                                      <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <Copy className="h-3 w-3 text-gray-400" />
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-600" />
                              <p className="animate-pulse text-sm font-medium text-gray-700">
                                {t(`analysis.steps.${status}`)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Info: (20260409 - Luphia) Initial Confirmation View */
                      <div className="mt-4">
                        <p className="mb-4 text-sm text-gray-500">
                          {description || t("analysis.confirm_desc")}
                        </p>

                        <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
                          {items.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-500">
                                {item.label}
                              </span>
                              <span className="text-right font-medium text-gray-900">
                                {item.value}
                              </span>
                            </div>
                          ))}

                          {items.length > 0 && (
                            <div className="my-2 h-px bg-gray-200" />
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold text-gray-900">
                              {t("analysis.confirm_cost")}
                            </span>
                            <span className="flex items-center gap-1 font-bold text-orange-600">
                              <Coins className="h-4 w-4" />
                              {cost}
                            </span>
                          </div>
                        </div>

                        {extraContent && (
                          <div className="mt-4">{extraContent}</div>
                        )}

                        <div className="mt-4 flex items-center justify-end gap-1 text-right text-xs text-gray-400">
                          <p>{t("analysis.confirm_balance")}:</p>
                          <p className="font-medium">
                            {currentCredits} - {cost} ={" "}
                            <span
                              className={
                                isBalanceNegative
                                  ? "font-bold text-red-500"
                                  : ""
                              }
                            >
                              {balance}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 sm:mt-8 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    {!isProcessing && status !== "error" && (
                      <>
                        {isSuccess ? (
                          <button
                            type="button"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:col-span-2"
                            onClick={() => {
                              onClose();
                            }}
                          >
                            {t("common.close") || "Close"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isLoading}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-wait disabled:opacity-70 sm:col-start-2"
                            onClick={() => {
                              if (
                                MoneyUtil.toDecimal(currentCredits).lt(cost)
                              ) {
                                setShowInsufficient(true);
                              } else {
                                onConfirm();
                              }
                            }}
                          >
                            {isLoading && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            {confirmBtnText || t("analysis.confirm_action")}
                          </button>
                        )}

                        {!isSuccess && (
                          <button
                            type="button"
                            disabled={isLoading}
                            className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all ring-inset hover:bg-gray-50 disabled:opacity-50 sm:col-start-1 sm:mt-0"
                            onClick={onClose}
                          >
                            {t("common.cancel")}
                          </button>
                        )}
                      </>
                    )}
                    {status === "error" && (
                      <button
                        type="button"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 transition-all ring-inset hover:bg-gray-50 sm:col-span-2"
                        onClick={onClose}
                      >
                        {t("common.close")}
                      </button>
                    )}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <ConfirmModal
        isOpen={showInsufficient}
        onClose={() => setShowInsufficient(false)}
        title={t("analysis.insufficient_credits.title")}
        message={t("analysis.insufficient_credits.message")}
        confirmText={t("analysis.insufficient_credits.buy_btn")}
        onConfirm={() => {
          setShowInsufficient(false);
          onClose();
          router.push("/pricing?tab=credits");
        }}
      />
    </>
  );
}
