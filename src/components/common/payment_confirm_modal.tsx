'use client';

import { Fragment, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Coins, X, Loader2, Copy, Check, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import { useAuth } from '@/contexts/auth_context';

export type PaymentStatus = 'idle' | 'preparing' | 'signing_payment' | 'submitting_payment' | 'payment_success' | 'error';

interface IPaymentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onNext?: () => void;
  cost: number;
  analysisType: string;
  period: string;
  country?: string;
  keyword?: string;
  isLoading?: boolean;
  status?: PaymentStatus;
  errorMessage?: string;
  txHash?: string;
}

export default function PaymentConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  onNext,
  cost,
  analysisType,
  period,
  country,
  keyword,
  isLoading = false,
  status = 'idle',
  errorMessage,
  txHash,
}: IPaymentConfirmModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (txHash) {
      await navigator.clipboard.writeText(txHash);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (!user || !user.credits) {
    return null;
  };

  const isProcessing = status !== 'idle' && status !== 'error' && status !== 'payment_success';
  const isSuccess = status === 'payment_success';

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={isProcessing ? () => { } : onClose}>
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
              <DialogPanel className="relative transform overflow-hidden rounded-xl bg-white px-4 pb-4 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
                    onClick={onClose}
                    disabled={isProcessing}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="text-center sm:mt-0 sm:text-left">
                  <DialogTitle as="h3" className="text-lg font-bold leading-6 text-gray-900 flex items-center gap-2">
                    <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                      <Coins className="h-5 w-5" />
                    </div>
                    {t('analysis.confirm_title')}
                  </DialogTitle>

                  {/* Processing / Error / Success View */}
                  {isProcessing || status === 'error' || isSuccess ? (
                    <div className="mt-6 space-y-6">

                      {/* Status Message */}
                      <div className="text-center bg-gray-50 rounded-lg p-6 min-h-[120px] flex flex-col items-center justify-center">
                        {status === 'error' ? (
                          <div className="space-y-2">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                              <X className="h-6 w-6 text-red-600" aria-hidden="true" />
                            </div>
                            <p className="text-sm text-red-600 font-medium">{errorMessage || t('auth_modal.failed')}</p>
                          </div>
                        ) : isSuccess ? (
                          <div className="space-y-2 w-full">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <p className="text-sm text-green-600 font-bold">{t('analysis.steps.payment_success')}</p>
                            {txHash && (
                              <div className="flex items-center justify-center gap-2 mt-2 bg-white p-2 rounded border border-gray-200 max-w-[200px] mx-auto">
                                <p className="text-xs font-mono text-gray-500 truncate" title={txHash}>
                                  {txHash}
                                </p>
                                <button
                                  type="button"
                                  onClick={handleCopy}
                                  className="p-1 hover:bg-gray-100 rounded-full transition-colors shrink-0"
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
                            <Loader2 className="h-8 w-8 text-orange-600 animate-spin mx-auto" />
                            <p className="text-sm text-gray-700 font-medium animate-pulse">
                              {t(`analysis.steps.${status}`)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Initial Confirmation View */
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-4">
                        {t('analysis.confirm_desc')}
                      </p>

                      <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">{t('analysis.category')}</span>
                          <span className="font-medium text-gray-900">{analysisType}</span>
                        </div>

                        {country && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">{t('analysis.country')}</span>
                            <span className="font-medium text-gray-900">{t(`analysis.countries.${country}`)}</span>
                          </div>
                        )}

                        {keyword && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">{t('analysis.keyword')}</span>
                            <span className="font-medium text-gray-900">{keyword}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">{t('analysis.period')}</span>
                          <span className="font-medium text-gray-900">{period}</span>
                        </div>

                        <div className="h-px bg-gray-200 my-2" />
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-900 font-semibold">{t('analysis.confirm_cost')}</span>
                          <span className="font-bold text-orange-600 flex items-center gap-1">
                            <Coins className="h-4 w-4" />
                            {cost}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-right text-gray-400 mt-2">
                        {t('analysis.confirm_balance')}: <span className="font-medium">{user.credits} - {cost} = {user.credits - cost}</span>
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 sm:mt-8 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  {!isProcessing && status !== 'error' && (
                    <>
                      {isSuccess ? (
                        <button
                          type="button"
                          className="inline-flex w-full justify-center items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:col-start-2 transition-all"
                          onClick={() => {
                            if (onNext) onNext();
                            else onClose();
                          }}
                        >
                          {t('common.next') || 'Next'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          className="inline-flex w-full justify-center items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:col-start-2 transition-all disabled:opacity-70 disabled:cursor-wait"
                          onClick={onConfirm}
                        >
                          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          {t('analysis.confirm_action')}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isLoading}
                        className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0 transition-all disabled:opacity-50"
                        onClick={onClose}
                      >
                        {isSuccess ? t('common.close') : t('analysis.cancel')}
                      </button>
                    </>
                  )}
                  {status === 'error' && (
                    <button
                      type="button"
                      className="inline-flex w-full justify-center items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-span-2 transition-all"
                      onClick={onClose}
                    >
                      {t('common.close')}
                    </button>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
