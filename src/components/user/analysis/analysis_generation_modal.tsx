'use client';

import { Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { FileBarChart, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';

export type AnalysisStatus = 'idle' | 'signing' | 'analyzing' | 'success' | 'error';

interface IAnalysisGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    status: AnalysisStatus;
    errorMessage?: string;
}

export default function AnalysisGenerationModal({
    isOpen,
    onClose,
    onConfirm,
    status,
    errorMessage,
}: IAnalysisGenerationModalProps) {
    const { t } = useTranslation();

    const isProcessing = ['signing', 'analyzing'].includes(status);
    const isSuccess = status === 'success';

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
                                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                                            <FileBarChart className="h-5 w-5" />
                                        </div>
                                        {t('analysis.generate_title') || 'Generate Report'}
                                    </DialogTitle>

                                    <div className="mt-4">
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
                                                <div className="space-y-2">
                                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                    </div>
                                                    <p className="text-sm text-green-600 font-bold">{t('analysis.steps.analysis_success') || 'Report Generated!'}</p>
                                                </div>
                                            ) : isProcessing ? (
                                                <div className="space-y-4">
                                                    <Loader2 className="h-8 w-8 text-orange-600 animate-spin mx-auto" />
                                                    <p className="text-sm text-gray-700 font-medium animate-pulse">
                                                        {status === 'signing' ? t('analysis.steps.signing_analysis') : t('analysis.steps.analyzing')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500">
                                                    {t('analysis.confirm_generate_desc') || 'Payment confirmed. You can now generate your report.'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 sm:mt-8 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                    {!isProcessing && !isSuccess && (
                                        <>
                                            <button
                                                type="button"
                                                className="inline-flex w-full justify-center items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:col-start-2 transition-all"
                                                onClick={onConfirm}
                                            >
                                                {t('analysis.generate')}
                                            </button>
                                            <button
                                                type="button"
                                                className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1 sm:mt-0 transition-all"
                                                onClick={onClose}
                                            >
                                                {t('analysis.cancel')}
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
