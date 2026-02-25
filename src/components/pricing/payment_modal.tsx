'use client';

import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { request } from '@/lib/utils/request';
import { useTranslation } from '@/i18n/i18n_context';
import { useAuth } from '@/contexts/auth_context';

interface IPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (txHash: string) => void;
    amount: number;
    credits: number;
    baseCredits: number;
    bonusCredits: number;
    displayPrice?: string;
}

export default function PaymentModal({ isOpen, onClose, onSuccess, amount, credits, baseCredits, bonusCredits, displayPrice }: IPaymentModalProps) {
    const { t } = useTranslation();
    const { user, refreshAuth } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'confirm' | 'success' | 'error'>('confirm');
    const [originalCredits, setOriginalCredits] = useState<number>(0);
    const [txHash, setTxHash] = useState<string | null>(null);

    const wasOpen = useRef(isOpen);

    useEffect(() => {
        if (isOpen && !wasOpen.current) {
            setStep('confirm');
            setError(null);
            setLoading(false);
            setTxHash(null);
            setOriginalCredits(user?.credits || 0);
        }
        wasOpen.current = isOpen;
    }, [isOpen, user?.credits]);

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await request<{ message?: string; payload?: { txHash: string; message: string } }>('/api/v1/token/mint', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    credits,
                }),
            });

            if (response.payload?.txHash) {
                await refreshAuth();
                setTxHash(response.payload.txHash);
                setStep('success');
                onSuccess(response.payload.txHash);
            } else {
                throw new Error(response.message || 'Minting failed');
            }

        } catch (err) {
            console.error('Payment Submission failed:', err);
            const errorMessage = (err as Error).message || 'Payment processing failed. Please try again.';
            if (errorMessage !== 'OK') {
                setError(errorMessage);
            } else {
                setError('Payment processing failed. Please try again.');
            }
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    return (
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
                            <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={handleClose}
                                        disabled={loading}
                                    >
                                        <span className="sr-only">{t('common.close')}</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="sm:flex sm:items-start w-full">
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">

                                        {step === 'confirm' && (
                                            <>
                                                <DialogTitle as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                                    {t('pricing.credits.payment_modal.title')}
                                                </DialogTitle>
                                                <div className="mt-4 bg-gray-50 p-4 rounded-md border border-gray-200 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-500">{t('pricing.credits.payment_modal.amount_to_pay') || t('pricing.credits.payment_modal.amount_paid')}</span>
                                                        <span className="text-lg font-bold text-gray-900">{displayPrice || `$${amount}`}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                                        <span className="text-sm text-gray-500">{t('pricing.credits.payment_modal.tokens_to_receive') || t('pricing.credits.payment_modal.tokens_received')}</span>
                                                        <span className="text-lg font-bold text-orange-600">
                                                            {baseCredits.toLocaleString()} {t('pricing.credits.payment_modal.credits_unit_short', { count: '' }).trim() || '點'}
                                                            {bonusCredits > 0 && <span className="text-sm text-orange-400 ml-1">+ {t('pricing.credits.payment_modal.bonus_points', { count: bonusCredits.toLocaleString() }) || `活動贈與 ${bonusCredits.toLocaleString()} 點`}</span>}
                                                        </span>
                                                    </div>
                                                </div>

                                                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                                    <div className="mt-6 sm:flex sm:flex-row-reverse">
                                                        <button
                                                            type="submit"
                                                            disabled={loading}
                                                            className="inline-flex w-full justify-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto items-center gap-2"
                                                        >
                                                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                                            {loading ? t('pricing.credits.payment_modal.processing') : t('pricing.credits.payment_modal.confirm_btn')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                            onClick={handleClose}
                                                            disabled={loading}
                                                        >
                                                            {t('common.cancel')}
                                                        </button>
                                                    </div>
                                                </form>
                                            </>
                                        )}

                                        {step === 'success' && (
                                            <div className="flex flex-col items-center">
                                                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                                    <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden="true" />
                                                </div>
                                                <DialogTitle as="h3" className="mt-4 text-lg font-semibold leading-6 text-gray-900">
                                                    {t('pricing.credits.payment_modal.success_title') || '購買成功'}
                                                </DialogTitle>

                                                <div className="mt-4 w-full bg-gray-50 p-4 rounded-md border border-gray-200 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-500">{t('pricing.credits.payment_modal.original_credits') || '原有點數'}</span>
                                                        <span className="text-base font-medium text-gray-700">{originalCredits.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                                        <span className="text-sm text-gray-500">{t('pricing.credits.payment_modal.amount_paid') || '支付金額'}</span>
                                                        <span className="text-base font-medium text-gray-700">{displayPrice || `$${amount}`}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                                        <span className="text-sm text-gray-500">{t('pricing.credits.payment_modal.tokens_received') || '獲得點數'}</span>
                                                        <span className="text-base font-medium text-green-600">
                                                            +{baseCredits.toLocaleString()} {t('pricing.credits.payment_modal.credits_unit_short', { count: '' }).trim() || '點'}
                                                            {bonusCredits > 0 && <span className="text-sm font-normal ml-1">({t('pricing.credits.payment_modal.bonus_points', { count: bonusCredits.toLocaleString() }) || `活動贈與 ${bonusCredits.toLocaleString()} 點`})</span>}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                                        <span className="text-sm font-medium text-gray-900">{t('pricing.credits.payment_modal.current_credits') || '現在點數'}</span>
                                                        <span className="text-lg font-bold text-gray-900">{(user?.credits || 0).toLocaleString()}</span>
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
                                                            <span>Transaction: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}</span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                                        {t('pricing.credits.payment_modal.close_btn') || t('common.close') || '關閉'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {step === 'error' && (
                                            <div className="flex flex-col items-center">
                                                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                                    <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
                                                </div>
                                                <DialogTitle as="h3" className="mt-4 text-lg font-semibold leading-6 text-gray-900">
                                                    {t('pricing.credits.payment_modal.error_title') || '購買失敗'}
                                                </DialogTitle>

                                                <div className="mt-4 w-full text-center">
                                                    <p className="text-sm text-gray-500">
                                                        {error || 'Payment processing failed. Please try again.'}
                                                    </p>
                                                </div>

                                                <div className="mt-6 w-full sm:flex sm:flex-row-reverse">
                                                    <button
                                                        type="button"
                                                        className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                                        onClick={handleClose}
                                                    >
                                                        {t('pricing.credits.payment_modal.close_btn') || t('common.close') || '關閉'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto sm:mt-0"
                                                        onClick={() => setStep('confirm')}
                                                    >
                                                        {t('pricing.credits.payment_modal.retry_btn') || '返回重試'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
