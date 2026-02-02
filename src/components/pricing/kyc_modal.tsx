'use client';

import { Fragment, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Upload, Loader2 } from 'lucide-react';
// import { useTranslation } from '@/i18n/i18n_context';
import { request } from '@/lib/utils/request';

interface IKYCModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function KYCModal({ isOpen, onClose, onSuccess }: IKYCModalProps) {
    // const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Mock form data
    const [formData, setFormData] = useState({
        fullName: '',
        idNumber: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Info: (20260129 - Tzuhan) Submit KYC data and trigger Identity deployment
            await request('/api/v1/user/kyc', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    submittedAt: new Date().toISOString(),
                    // Todo: (20260129 - Tzuhan) Photo upload is skipped as per requirement "現在都可以不用傳"
                }),
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error('KYC Submission failed:', err);
            setError('Verification failed. Please try again.');
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
                                            Identity Verification (KYC)
                                        </DialogTitle>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Please provide your details to verify your identity.
                                            </p>
                                        </div>

                                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                            <div>
                                                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                                                    Full Name
                                                </label>
                                                <input
                                                    aria-label="Full Name"
                                                    type="text"
                                                    id="fullName"
                                                    required
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-3 py-2 border text-gray-500"
                                                    value={formData.fullName}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="idNumber" className="block text-sm font-medium text-gray-700">
                                                    ID Number
                                                </label>
                                                <input
                                                    aria-label="ID Number"
                                                    type="text"
                                                    id="idNumber"
                                                    required
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-3 py-2 border text-gray-500"
                                                    value={formData.idNumber}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, idNumber: e.target.value }))}
                                                />
                                            </div>

                                            {/* Photo Upload Placeholder */}
                                            <div className="mt-4">
                                                <label htmlFor="photoId" className="block text-sm font-medium text-gray-700">
                                                    Photo ID (Optional)
                                                </label>
                                                <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                                                    <div className="space-y-1 text-center">
                                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                                        <div className="flex text-sm text-gray-600">
                                                            <span className="relative cursor-pointer rounded-md bg-white font-medium text-orange-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 hover:text-orange-500">
                                                                <span>Upload a file</span>
                                                            </span>
                                                            <p className="pl-1">or drag and drop</p>
                                                        </div>
                                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                                    </div>
                                                </div>
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
                                                    {loading ? 'Submitting & Deploying...' : 'Submit & Verify'}
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
