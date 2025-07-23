import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { Button } from '@/components/button/button';
import { ISUNFA_ROUTE } from '@/constants/url';

const LoginModal: React.FC<{
  modalVisibleHandler: () => void;
}> = ({ modalVisibleHandler }) => {
  const { t } = useTranslation(['calculator', 'common']);

  const router = useRouter();
  const goToLogin = () => {
    router.push(ISUNFA_ROUTE.LOGIN);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 font-barlow">
      <div className="relative flex w-90vw flex-col rounded-sm bg-surface-neutral-surface-lv2 md:w-fit">
        {/* Info: (20250723 - Julian) Modal Header */}
        <div className="relative flex items-start justify-center px-40px py-16px">
          <h2 className="text-lg font-bold text-card-text-primary">
            {t('calculator:LOGIN_MODAL.TITLE')}
          </h2>
          <button type="button" onClick={modalVisibleHandler} className="absolute right-20px">
            <RxCross2 scale={24} />
          </button>
        </div>
        {/* Info: (20250723 - Julian) Modal Content */}
        <div className="px-20px py-8px text-sm font-normal text-card-text-secondary">
          {t('calculator:LOGIN_MODAL.CONTENT')}
        </div>
        {/* Info: (20250723 - Julian) Buttons */}
        <div className="grid grid-cols-2 gap-12px px-20px py-16px">
          <Button
            type="button"
            variant="disabledYellow"
            className="w-full"
            onClick={modalVisibleHandler}
          >
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button type="button" variant="default" className="w-full" onClick={goToLogin}>
            {t('calculator:LOGIN_MODAL.SUBMIT')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
