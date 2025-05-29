import { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { TbLogout } from 'react-icons/tb';
import { useTranslation } from 'next-i18next';
import { cn } from '@/lib/utils/common';

interface VerifyCodeStepProps {
  verificationCode: string;
  setVerificationCode: Dispatch<SetStateAction<string>>;
  verifyCountdown: number;
  resendCountdown: number;
  handleVerifyCode: () => void;
  handleResend: () => void;
  isResendingEmail: boolean;
  isVerifyingCode: boolean;
  verifyCodeError: string;
  goBackToInputEmailStep: () => void;
}

const VerifyCodeStep = ({
  verificationCode,
  setVerificationCode,
  verifyCountdown,
  resendCountdown,
  handleVerifyCode,
  handleResend,
  isResendingEmail,
  isVerifyingCode,
  verifyCodeError,
  goBackToInputEmailStep,
}: VerifyCodeStepProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="z-10 flex w-280px flex-col gap-40px rounded-md bg-surface-neutral-main-background p-24px shadow-Dropshadow_XS tablet:w-480px tablet:p-40px">
      <div className="flex items-center justify-center gap-10px">
        <Image src="/logo/isunfa_logo_new_icon.svg" alt="logo" width={38.371} height={33.997} />
        <Image src="/logo/isunfa_text_logo.svg" alt="logo" width={74.769} height={18.506} />
      </div>

      <section className="flex flex-col gap-24px">
        <h1 className="text-center text-28px font-bold leading-44px text-text-brand-secondary-lv2 tablet:text-start tablet:text-4xl">
          {t('dashboard:LOGIN.ENTER_THE_CODE')}
        </h1>

        <div className="flex flex-col gap-8px">
          <h4 className="text-start text-xl font-bold leading-8 text-text-neutral-primary">
            {t('dashboard:LOGIN.VERIFICATION_CODE')}
          </h4>
          <div className="flex flex-col gap-8px">
            <input
              type="number"
              placeholder={t('dashboard:LOGIN.VERIFICATION_CODE_PLACEHOLDER')}
              onKeyDown={(e) => {
                if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
              }}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className={cn(
                'rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder',
                {
                  'border-text-state-error text-input-text-error': verifyCodeError,
                }
              )}
            />
          </div>

          {resendCountdown === 0 && (
            <button
              type="button"
              className="self-end text-base font-medium text-text-neutral-link"
              onClick={handleResend}
            >
              {t('dashboard:LOGIN.DID_NOT_GET_THE_CODE')}
            </button>
          )}

          {resendCountdown > 0 && (
            <p className="text-end text-xs font-medium text-text-state-error">
              {`${t('dashboard:LOGIN.SENT_CODE_MESSAGE')} (${resendCountdown} ${t('dashboard:LOGIN.S')})`}
            </p>
          )}
        </div>

        {/* Info: (20250509 - Liz) Confirm Button */}
        {verifyCountdown > 0 ? (
          <button
            type="button"
            onClick={handleVerifyCode}
            className="self-center rounded-xs bg-button-surface-strong-primary px-24px py-10px text-base font-medium text-button-text-primary-solid hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable disabled:text-button-text-disable"
            disabled={isVerifyingCode || verificationCode.trim() === '' || isResendingEmail}
          >
            {`${t('dashboard:LOGIN.CONFIRM')} (${verifyCountdown} ${t('dashboard:LOGIN.S')})`}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="self-center rounded-xs bg-button-surface-strong-primary px-24px py-10px hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable"
          >
            {t('dashboard:LOGIN.RESEND_CODE')}
          </button>
        )}

        {/* Info: (20250509 - Liz) Back to Login */}
        <button
          type="button"
          className="flex items-center gap-8px self-start"
          onClick={goBackToInputEmailStep}
        >
          <TbLogout size={20} className="text-stroke-brand-secondary-moderate" />
          <span className="text-base font-semibold text-text-brand-secondary-lv2">
            {t('dashboard:LOGIN.BACK_TO_LOGIN')}
          </span>
        </button>
      </section>
    </div>
  );
};

export default VerifyCodeStep;
