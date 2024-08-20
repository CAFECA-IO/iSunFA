import React from 'react';
import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'react-i18next';
import InformationStatement from '@/components/login_confirm_modal/information_statement';
import TermsOfServiceAndPrivacyPolicy from '@/components/login_confirm_modal/term_n_privacy';
import { useUserCtx } from '@/contexts/user_context';
import { Hash } from '@/constants/hash';

interface ILoginConfirmProps {
  id: string;
  isModalVisible: boolean;
  modalData: {
    title: string;
    content: string;
    buttonText: string;
  };
  infoModalVisibilityHandler: (visibility: boolean) => void;
  tosModalVisibilityHandler: (visibility: boolean) => void;
}

const LoginConfirmModal: React.FC<ILoginConfirmProps> = ({
  id,
  isModalVisible,
  modalData,
  infoModalVisibilityHandler,
  tosModalVisibilityHandler,
}) => {
  const { t } = useTranslation('common');
  const { handleUserAgree, signOut } = useUserCtx();

  const onAgree = async () => {
    if (id === 'agree-with-information') {
      infoModalVisibilityHandler(false);
      await handleUserAgree(Hash.INFO_COLLECTION);
      tosModalVisibilityHandler(true);
    }
    if (id === 'tos-n-privacy-policy') {
      tosModalVisibilityHandler(false);
      await handleUserAgree(Hash.TOS_N_PP);
    }
  };
  const onCancel = () => {
    infoModalVisibilityHandler(false);
    tosModalVisibilityHandler(false);
    signOut();
  };
  const displayModal = isModalVisible ? (
    <div id={id} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="absolute max-h-80vh w-full max-w-xl rounded-xs bg-white p-4 pt-0 shadow-lg">
        <div className="my-4 mb-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navyBlue">{modalData.title}</h2>
          <button type="button" onClick={onCancel} className="text-navyBlue">
            <RxCross2 size={20} />
          </button>
        </div>
        <hr className="absolute left-0 top-60px w-full max-w-xl border-lightGray6" />
        <div className="m-4 h-50vh overflow-y-auto rounded-xs border border-navyBlue bg-lightGray7 lg:p-4">
          {modalData.content === 'info_collection_statement' && <InformationStatement />}
          {modalData.content === 'term_n_privacy' && <TermsOfServiceAndPrivacyPolicy />}
        </div>
        <div className="mx-4 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="mr-2 rounded-xs border border-navyBlue px-4 py-2 text-sm text-navyBlue hover:bg-gray-100 lg:text-lg"
          >
            {t('COMMON.CANCEL')}
          </button>
          <button
            type="button"
            onClick={onAgree}
            className="rounded-xs bg-navyBlue px-4 py-2 text-sm text-white hover:bg-navyBlue2 lg:text-lg"
          >
            {modalData.buttonText}
          </button>
        </div>
      </div>
    </div>
  ) : null;
  return displayModal;
};

export default LoginConfirmModal;
