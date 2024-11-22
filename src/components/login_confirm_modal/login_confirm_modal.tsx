import React from 'react';
import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import TermsOfService from '@/components/login_confirm_modal/terms_of_service';
import PrivacyPolicy from '@/components/login_confirm_modal/privacy_policy';
import { useUserCtx } from '@/contexts/user_context';
import { Hash } from '@/constants/hash';
import { Button } from '@/components/button/button';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useRouter } from 'next/router';

interface ILoginConfirmProps {
  id: string;
  isModalVisible: boolean;
  modalData: {
    title: string;
    content: string;
    buttonText: string;
  };
  toggleTermsOfServiceConfirmModal: (visibility: boolean) => void;
  togglePrivacyPolicyConfirmModal: (visibility: boolean) => void;
}

const LoginConfirmModal: React.FC<ILoginConfirmProps> = ({
  id,
  isModalVisible,
  modalData,
  toggleTermsOfServiceConfirmModal,
  togglePrivacyPolicyConfirmModal,
}) => {
  const { t } = useTranslation('terms');
  const { handleUserAgree, signOut } = useUserCtx();
  const router = useRouter();

  const onAgree = async () => {
    if (id === 'terms-of-service') {
      const success = await handleUserAgree(Hash.HASH_FOR_TERMS_OF_SERVICE);
      if (!success) return;

      toggleTermsOfServiceConfirmModal(false);
      togglePrivacyPolicyConfirmModal(true);
    }
    if (id === 'privacy-policy') {
      const success = await handleUserAgree(Hash.HASH_FOR_PRIVACY_POLICY);
      if (!success) return;

      togglePrivacyPolicyConfirmModal(false);
      router.push(ISUNFA_ROUTE.SELECT_ROLE);
    }
  };
  const onCancel = () => {
    toggleTermsOfServiceConfirmModal(false);
    togglePrivacyPolicyConfirmModal(false);
    signOut();
  };

  const displayModal = isModalVisible ? (
    <div id={id} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="absolute max-h-80vh w-full max-w-xl rounded-xs bg-surface-neutral-surface-lv1 p-4 pt-0 shadow-lg">
        <div className="my-4 mb-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-neutral-primary">{modalData.title}</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-icon-surface-single-color-primary"
          >
            <RxCross2 size={20} />
          </button>
        </div>
        <hr className="absolute left-0 top-60px w-full max-w-xl border-divider-stroke-lv-4" />
        <div className="m-4 h-50vh overflow-y-auto rounded-xs border border-surface-brand-secondary bg-surface-neutral-main-background lg:p-4">
          {modalData.content === 'terms_of_service' && <TermsOfService />}
          {modalData.content === 'privacy_policy' && <PrivacyPolicy />}
        </div>
        <div className="mx-4 flex justify-end space-x-4">
          <Button
            type="button"
            onClick={onCancel}
            variant="tertiaryOutline"
            className="mr-2 px-4 py-2 text-sm lg:text-lg"
          >
            {t('terms:MODAL.CANCEL')}
          </Button>
          <Button
            type="button"
            onClick={onAgree}
            variant="tertiary"
            className="px-4 py-2 text-sm lg:text-lg"
          >
            {modalData.buttonText}
          </Button>
        </div>
      </div>
    </div>
  ) : null;
  return displayModal;
};

export default LoginConfirmModal;
