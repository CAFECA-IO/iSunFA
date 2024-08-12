import React from 'react';
import { useTranslation } from 'react-i18next';

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
        <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold">{modalData.title}</h2>
          <p className="mb-6">{modalData.content}</p>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700"
            >
              {t('COMMON.CANCEL')}
            </button>
            <button
              type="button"
              onClick={onAgree}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white"
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
