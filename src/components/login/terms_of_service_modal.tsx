import React from 'react';
import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useUserCtx } from '@/contexts/user_context';
import { Hash } from '@/constants/hash';
import { ISUNFA_ROUTE } from '@/constants/url';
import { Button } from '@/components/button/button';
import TermsOfService from '@/components/login/terms_of_service';

interface TermsOfServiceModalProps {
  isModalVisible: boolean;
  closeTermsOfServiceModal: () => void;
}

const TermsOfServiceModal = ({
  isModalVisible,
  closeTermsOfServiceModal,
}: TermsOfServiceModalProps) => {
  const { t } = useTranslation('terms');
  const { handleUserAgree, signOut } = useUserCtx();
  const router = useRouter();

  const onAgree = async () => {
    const success = await handleUserAgree(Hash.HASH_FOR_TERMS_OF_SERVICE);
    if (!success) return;

    closeTermsOfServiceModal();
    router.push(ISUNFA_ROUTE.SELECT_ROLE);
  };
  const onCancel = () => {
    closeTermsOfServiceModal();
    signOut();
  };

  const displayModal = isModalVisible ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="absolute max-h-80vh w-full max-w-xl rounded-xs bg-surface-neutral-surface-lv1 p-4 pt-0 shadow-lg">
        <div className="my-4 mb-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-neutral-primary">
            {t('terms:MODAL.PLEASE_READ_AND_AGREE_THE_FIRST_TIME_YOU_LOGIN')}
          </h2>
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
          <TermsOfService />
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
            {t('terms:MODAL.AGREE_TO_OUR_TERMS_OF_SERVICE')}
          </Button>
        </div>
      </div>
    </div>
  ) : null;
  return displayModal;
};

export default TermsOfServiceModal;
