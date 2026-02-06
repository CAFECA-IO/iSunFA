'use client';

import { Fragment, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Loader2 } from 'lucide-react';
import { request } from '@/lib/utils/request';

interface IPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (txHash: string) => void;
    amount: number;
    credits: number;
}

export default function PaymentModal({ isOpen, onClose, onSuccess, amount, credits }: IPaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        bankAccountLast5: '',
        transferDate: new Date().toISOString().split('T')[0],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await request<{ txHash: string; message: string }>('/api/v1/token/mint', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    credits,
                    bankAccountLast5: formData.bankAccountLast5,
                    transferDate: formData.transferDate,
                }),
            });

            if (response.txHash) {
                onClose();
                alert(`Payment Successful! Transaction Hash: ${response.txHash}`);
                onSuccess(response.txHash);
            } else {
                throw new Error(response.message || 'Minting failed');
            }

        } catch (err) {
            console.error('Payment Submission failed:', err);
            setError((err as Error).message || 'Payment processing failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => !loading && onClose()}>
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
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                                        onClick={onClose}
                                        disabled={loading}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="sm:flex sm:items-start w-full">
                                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                                        <DialogTitle as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                            Bank Transfer Details
                                        </DialogTitle>
                                        <div className="mt-2 text-sm text-gray-500">
                                            <p>Please transfer the amount of <strong className="text-gray-900">{amount} NTD</strong> to the following account:</p>
                                            <div className="mt-3 bg-gray-50 p-3 rounded-md border border-gray-200">
                                                <p>Bank: <span className="font-medium text-gray-900">iSun Bank (000)</span></p>
                                                <p>Account: <span className="font-medium text-gray-900">123-456-7890123</span></p>
                                                <p>Name: <span className="font-medium text-gray-900">iSunFA Platform</span></p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                            <div>
                                                <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700">
                                                    Your Bank Account (Last 5 Digits)
                                                </label>
                                                <input
                                                    aria-label="Your Bank Account (Last 5 Digits)"
                                                    type="text"
                                                    id="bankAccount"
                                                    maxLength={5}
                                                    minLength={5}
                                                    required
                                                    placeholder="12345"
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-3 py-2 border text-gray-500"
                                                    value={formData.bankAccountLast5}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountLast5: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="transferDate" className="block text-sm font-medium text-gray-700">
                                                    Transfer Date
                                                </label>
                                                <input
                                                    aria-label="Transfer Date"
                                                    type="date"
                                                    id="transferDate"
                                                    required
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-3 py-2 border text-gray-500"
                                                    value={formData.transferDate}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, transferDate: e.target.value }))}
                                                />
                                            </div>

                                            {error && (
                                                <div className="text-red-500 text-sm mt-2">
                                                    {error}
                                                </div>
                                            )}

                                            <div className="mt-6 sm:flex sm:flex-row-reverse">
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="inline-flex w-full justify-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 disabled:opacity-50 sm:ml-3 sm:w-auto items-center gap-2"
                                                >
                                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                                    {loading ? 'Processing...' : 'Confirm Payment'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                                    onClick={onClose}
                                                    disabled={loading}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
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
