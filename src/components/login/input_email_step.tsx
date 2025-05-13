import Image from 'next/image';
import { FiArrowRight } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { cn } from '@/lib/utils/common';
import Loader, { LoaderSize } from '@/components/loader/loader';

interface InputEmailStepProps {
  inputEmail: string;
  updateInputEmail: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEmailNotValid: boolean;
  sendLoginEmail: () => void;
  googleAuthSignIn: () => void;
  isSendingEmail: boolean;
  sendEmailError: string;
  resendCountdown: number;
}

const InputEmailStep = ({
  inputEmail,
  updateInputEmail,
  isEmailNotValid,
  sendLoginEmail,
  googleAuthSignIn,
  isSendingEmail,
  sendEmailError,
  resendCountdown,
}: InputEmailStepProps) => {
  const { t } = useTranslation('dashboard');

  return (
    <div className="z-10 flex w-480px flex-col gap-40px rounded-md bg-surface-neutral-main-background p-40px shadow-Dropshadow_XS">
      <div className="flex items-center justify-center gap-10px">
        <Image src="/logo/isunfa_logo_new_icon.svg" alt="logo" width={38.371} height={33.997} />
        <Image src="/logo/isunfa_text_logo.svg" alt="logo" width={74.769} height={18.506} />
      </div>

      <section className="flex flex-col gap-24px">
        <h1 className="text-start text-4xl font-bold leading-44px text-text-brand-secondary-lv2">
          {t('dashboard:LOGIN.LOGIN')}
        </h1>

        <div className="flex flex-col gap-8px">
          <h4 className="text-start text-xl font-bold leading-8 text-text-neutral-primary">
            {t('dashboard:LOGIN.EMAIL')}
          </h4>
          <div className="flex flex-col gap-8px">
            <input
              type="text"
              placeholder={t('dashboard:LOGIN.ENTER_YOUR_EMAIL_ADDRESS')}
              value={inputEmail}
              onChange={updateInputEmail}
              className={cn(
                'rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder',
                {
                  'border-text-state-error text-input-text-error': isEmailNotValid,
                }
              )}
            />
            <p
              className={`text-start text-xs font-medium text-text-state-error ${isEmailNotValid ? 'visible' : 'invisible'}`}
            >
              {t('dashboard:LOGIN.INVALID_EMAIL_FORMAT')}
            </p>
          </div>
        </div>

        {isSendingEmail ? (
          <Loader size={LoaderSize.MEDIUM} notScreen />
        ) : (
          <div className="flex flex-col items-center gap-8px">
            <button
              type="button"
              onClick={sendLoginEmail}
              disabled={isEmailNotValid || resendCountdown > 0}
              className="flex items-center gap-8px rounded-xs bg-button-surface-strong-primary px-24px py-10px hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable"
            >
              <span className="text-base font-medium text-button-text-primary-solid">
                {t('dashboard:LOGIN.LOGIN')}
              </span>
              <FiArrowRight size={20} />
            </button>
            {sendEmailError && (
              <p className="text-xs font-medium text-text-state-error">{sendEmailError}</p>
            )}
            {resendCountdown > 0 && (
              <p className="text-xs font-medium text-text-state-error">
                {t('dashboard:LOGIN.SENT_EMAIL_MESSAGE')} ({resendCountdown}
                {t('dashboard:LOGIN.S')})
              </p>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-16px">
        <div className="flex items-center gap-24px">
          <hr className="flex-auto border-t border-stroke-neutral-mute" />
          <p className="text-base font-medium text-text-neutral-mute">
            {t('dashboard:LOGIN.OR_LOGIN_WITH')}
          </p>
          <hr className="flex-auto border-t border-stroke-neutral-mute" />
        </div>

        <button
          type="button"
          onClick={googleAuthSignIn}
          className="flex items-center justify-center gap-15px rounded-sm bg-white p-15px shadow-Dropshadow_SM"
        >
          <Image src="/icons/google_logo.svg" alt="google_logo" width="24" height="24"></Image>
          <p className="text-xl font-medium text-gray-500">
            {t('dashboard:LOGIN.LOG_IN_WITH_GOOGLE')}
          </p>
        </button>
      </div>
    </div>
  );
};

export default InputEmailStep;
