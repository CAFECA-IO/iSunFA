'use client';

import { Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Coins, X, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';

interface IPaymentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cost: number;
  analysisType: string;
  period: string;
  country?: string;
  keyword?: string;
  isLoading?: boolean;
}

export default function PaymentConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  cost,
  analysisType,
  period,
  country,
  keyword,
  isLoading = false,
}: IPaymentConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={isLoading ? () => { } : onClose}>
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
                    disabled={isLoading}
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
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-4">
                      {t('analysis.confirm_desc')}
                    </p>

                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('analysis.category')}</span>
                        <span className="font-medium text-gray-900">{analysisType}</span>
                      </div>

                      {/* Info: (20260120 - Luphia) Country Display */}
                      {country && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">{t('analysis.country')}</span>
                          <span className="font-medium text-gray-900">{t(`analysis.countries.${country}`)}</span>
                        </div>
                      )}

                      {/* Info: (20260120 - Luphia) Keyword Display */}
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

                    {/* Info: (20260120 - Luphia) Mock Balance Hint */}
                    <p className="text-xs text-right text-gray-400 mt-2">
                      {t('analysis.confirm_balance')}: <span className="font-medium">10,000 - {cost} = 9,500</span>
                    </p>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <button
                    type="button"
                    disabled={isLoading}
                    className="inline-flex w-full justify-center items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:col-start-2 transition-all disabled:opacity-70 disabled:cursor-wait"
                    onClick={onConfirm}
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('analysis.confirm_action')}
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0 transition-all disabled:opacity-50"
                    onClick={onClose}
                  >
                    {t('analysis.cancel')}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
