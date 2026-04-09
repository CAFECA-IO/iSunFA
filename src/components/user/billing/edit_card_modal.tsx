import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';

export interface IEditCardData {
  name: string;
  email: string;
  taxId: string;
  buyerName: string;
  billingAddress: string;
}

interface IEditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IEditCardData) => Promise<void>;
  initialData: IEditCardData;
}

export default function EditCardModal({ isOpen, onClose, onSave, initialData }: IEditCardModalProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<IEditCardData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setData(initialData);
    }
  }, [initialData, isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition show={isOpen}>
      <Dialog className="relative z-[60]" onClose={loading ? () => {} : onClose}>
        <TransitionChild
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
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col text-left">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <DialogTitle as="h3" className="text-lg font-semibold text-gray-900">
                    {t('billing.cards.edit_details', { defaultValue: 'Edit Card Details' })}
                  </DialogTitle>
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
          <label htmlFor="editCardName" className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t('billing.cards.rename')}</span>
            <input
              id="editCardName"
              aria-label="Card Name"
              type="text"
              value={data.name}
              onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. My Personal Card"
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent placeholder:text-gray-400"
            />
          </label>

          <label htmlFor="editCardEmail" className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t('billing.cards.email')} <span className="text-red-500">*</span></span>
            <input
              id="editCardEmail"
              aria-label="Email"
              type="email"
              value={data.email}
              onChange={(e) => setData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="e.g. hello@example.com"
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent placeholder:text-gray-400"
            />
          </label>

          <label htmlFor="editCardTaxId" className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t('billing.cards.tax_id')}</span>
            <input
              id="editCardTaxId"
              aria-label="Tax ID"
              type="text"
              value={data.taxId}
              onChange={(e) => setData(prev => ({ ...prev, taxId: e.target.value }))}
              placeholder="e.g. 12345678"
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent placeholder:text-gray-400"
            />
          </label>

          <label htmlFor="editCardBuyerName" className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t('billing.cards.buyer_name')} <span className="text-red-500">*</span></span>
            <input
              id="editCardBuyerName"
              aria-label="Buyer Name"
              type="text"
              value={data.buyerName}
              onChange={(e) => setData(prev => ({ ...prev, buyerName: e.target.value }))}
              placeholder="e.g. John Doe"
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent placeholder:text-gray-400"
            />
          </label>

          <label htmlFor="editCardBillingAddress" className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">{t('billing.cards.billing_address')} <span className="text-red-500">*</span></span>
            <input
              id="editCardBillingAddress"
              aria-label="Billing Address"
              type="text"
              value={data.billingAddress}
              onChange={(e) => setData(prev => ({ ...prev, billingAddress: e.target.value }))}
              placeholder="e.g. 123 Street Name"
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent placeholder:text-gray-400"
            />
          </label>
        </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                  >
                    {t('billing.cards.cancel', { defaultValue: 'Cancel' })}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading || !data.email || !data.buyerName || !data.billingAddress}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('billing.cards.save', { defaultValue: 'Save' })}
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
