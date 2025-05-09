import { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { FiArrowRight } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';

interface InputEmailStepProps {
  inputEmail: string;
  setInputEmail: Dispatch<SetStateAction<string>>;
  isEmailNotValid: boolean;
  setIsEmailNotValid: Dispatch<SetStateAction<boolean>>;
  sendLoginEmail: () => void;
  googleAuthSignIn: () => void;
  isSendingEmail: boolean;
  sendEmailError: string;
}

const InputEmailStep = ({
  inputEmail,
  setInputEmail,
  isEmailNotValid,
  setIsEmailNotValid,
  sendLoginEmail,
  googleAuthSignIn,
  isSendingEmail,
  sendEmailError,
}: InputEmailStepProps) => {
  const { t } = useTranslation('dashboard');
  const updateInputEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputEmail(e.target.value);
    setIsEmailNotValid(false);
  };

  return (
    <div className="z-10 flex w-480px flex-col gap-40px rounded-md bg-surface-neutral-main-background p-40px shadow-Dropshadow_XS">
      <div className="flex items-center justify-center gap-10px">
        <Image src="/logo/isunfa_logo_new_icon.svg" alt="logo" width={38.371} height={33.997} />
        <Image src="/logo/isunfa_text_logo.svg" alt="logo" width={74.769} height={18.506} />
      </div>

      <section className="flex flex-col gap-24px">
        <h1 className="text-start text-4xl font-bold leading-44px text-text-brand-secondary-lv2">
          Login
        </h1>

        <div className="flex flex-col gap-8px">
          <h4 className="text-start text-xl font-bold leading-8 text-text-neutral-primary">
            Email
          </h4>
          <div className="flex flex-col">
            <input
              type="text"
              placeholder="Enter your Email Address"
              value={inputEmail}
              onChange={updateInputEmail}
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
            />
            <p
              className={`text-end text-xs font-medium text-text-state-error ${isEmailNotValid ? 'visible' : 'invisible'}`}
            >
              請輸入有效的電子郵件地址
            </p>
            {sendEmailError && (
              <p className="text-start text-xs font-medium text-text-state-error">
                {sendEmailError}
              </p>
            )}
          </div>
        </div>

        {isSendingEmail ? (
          <p>驗證信正在寄送中...</p>
        ) : (
          <button
            type="button"
            onClick={sendLoginEmail}
            disabled={isEmailNotValid}
            className="flex items-center gap-8px self-center rounded-xs bg-button-surface-strong-primary px-24px py-10px hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable"
          >
            <span className="text-base font-medium text-button-text-primary-solid">Login</span>
            <FiArrowRight size={20} />
          </button>
        )}
      </section>

      <div className="flex flex-col gap-16px">
        <div className="flex items-center gap-24px">
          <hr className="flex-auto border-t border-stroke-neutral-mute" />
          <p className="text-base font-medium text-text-neutral-mute">Or Login with</p>
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
