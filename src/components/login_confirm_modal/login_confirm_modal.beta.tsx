import React from 'react';
import { useTranslation } from 'react-i18next';
import InformationStatement from './information_statement';
import TermsOfServiceAndPrivacyPolicy from './term_n_privacy';

interface ILoginConfirmProps {
  isModalVisible: boolean;
  modalData: {
    title: string;
    content: string;
    buttonText: string;
  };
  onAgree: () => void;
  onCancel: () => void;
}

const LoginConfirmModal: React.FC<ILoginConfirmProps> = ({
  isModalVisible,
  modalData,
  onAgree,
  onCancel,
}) => {
  const { t } = useTranslation('common');
  return (
    isModalVisible && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="max-h-80vh w-full max-w-xl rounded-xs bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">{modalData.title}</h2>
          <div className="overflow-y-auto rounded-xs border border-navyBlue p-4 mb-4 h-50vh">
            {modalData.content === 'info_collection_statement' && <InformationStatement />}
            {modalData.content === 'term_n_privacy' && <TermsOfServiceAndPrivacyPolicy />}
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="mr-2 rounded-xs border border-navyBlue px-4 py-2 text-navyBlue hover:bg-gray-100"
            >
              {t('COMMON.CANCEL')}
            </button>
            <button
              type="button"
              onClick={onAgree}
              className="rounded-xs bg-navyBlue px-4 py-2 text-white hover:bg-blue-700"
            >
              {modalData.buttonText}
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default LoginConfirmModal;
