import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useUserCtx } from '@/contexts/user_context';
import { Hash } from '@/constants/hash';
import { ISUNFA_ROUTE } from '@/constants/url';
import { Button } from '@/components/button/button';
import TermsOfService from '@/components/login/terms_of_service';
import { useState } from 'react';

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
  const [isChecked, setIsChecked] = useState(false);
  const handleCheckboxChange = () => setIsChecked((prev) => !prev);

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

  return isModalVisible ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="absolute max-h-100vh w-full max-w-800px rounded-xs bg-surface-neutral-surface-lv1 p-16px pt-0 shadow-lg">
        <div className="my-16px mb-32px flex items-center justify-between">
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

        <hr className="absolute left-0 top-0 mt-60px w-full border-divider-stroke-lv-4" />

        <div className="mx-40px mb-20px mt-60px max-h-60vh overflow-hidden rounded-sm border border-surface-brand-secondary bg-surface-neutral-main-background">
          <div className="h-full max-h-60vh overflow-y-auto p-40px">
            <TermsOfService />
          </div>
        </div>

        <label htmlFor="termsCheckbox" className="mx-40px flex cursor-pointer items-center gap-8px">
          <input
            id="termsCheckbox"
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            className="h-10px w-10px accent-checkbox-surface-selected"
          />
          <span className="text-checkbox-text-primary">
            {t('terms:MODAL.I_AGREE_WITH_THE_TERM_AFTER_READING_IT_CAREFULLY')}
          </span>
        </label>

        <div className="mx-16px mb-12px flex justify-end gap-16px">
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
            disabled={!isChecked}
            onClick={onAgree}
            variant="tertiary"
            className="px-4 py-2 text-sm lg:text-lg"
          >
            {t('terms:MODAL.CONFIRM')}
          </Button>
        </div>
      </div>
    </div>
  ) : null;
};

export default TermsOfServiceModal;
