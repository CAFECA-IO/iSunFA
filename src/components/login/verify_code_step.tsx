import { Dispatch, SetStateAction } from 'react';
import Image from 'next/image';
import { TbLogout } from 'react-icons/tb';

interface VerifyCodeStepProps {
  verificationCode: string;
  setVerificationCode: Dispatch<SetStateAction<string>>;
  verifyCountdown: number;
  resendCountdown: number;
  handleVerifyCode: () => void;
  handleResend: () => void;
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
  isVerifyingCode,
  verifyCodeError,
  goBackToInputEmailStep,
}: VerifyCodeStepProps) => {
  return (
    <div className="z-10 flex w-480px flex-col gap-40px rounded-md bg-surface-neutral-main-background p-40px shadow-Dropshadow_XS">
      <div className="flex items-center justify-center gap-10px">
        <Image src="/logo/isunfa_logo_new_icon.svg" alt="logo" width={38.371} height={33.997} />
        <Image src="/logo/isunfa_text_logo.svg" alt="logo" width={74.769} height={18.506} />
      </div>

      <section className="flex flex-col gap-24px">
        <h1 className="text-start text-4xl font-bold leading-44px text-text-brand-secondary-lv2">
          Enter the code
        </h1>

        <div className="flex flex-col gap-8px">
          <h4 className="text-start text-xl font-bold leading-8 text-text-neutral-primary">
            Verification code
          </h4>
          <div className="flex flex-col">
            <input
              type="text"
              placeholder="Ex: 123456"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px text-base font-medium shadow-Dropshadow_SM outline-none placeholder:text-input-text-input-placeholder"
            />
            {verifyCodeError && (
              <p className="text-start text-xs font-medium text-text-state-error">
                {verifyCodeError}
              </p>
            )}
          </div>

          {resendCountdown === 0 && (
            <button
              type="button"
              className="self-end text-base font-medium text-text-neutral-link"
              onClick={handleResend}
            >
              沒有收到驗證信?
            </button>
          )}

          {resendCountdown > 0 && (
            <p className="text-end text-xs font-medium text-text-state-error">
              {`驗證信已寄送，請稍後再試 (${resendCountdown} 秒)`}
            </p>
          )}
        </div>

        {/* Info: (20250509 - Liz) Confirm Button */}
        {verifyCountdown > 0 ? (
          <button
            type="button"
            onClick={handleVerifyCode}
            className="self-center rounded-xs bg-button-surface-strong-primary px-24px py-10px hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable"
            disabled={isVerifyingCode || verificationCode.trim() === ''}
          >
            確認驗證碼 ({verifyCountdown}s)
          </button>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="self-center rounded-xs bg-button-surface-strong-primary px-24px py-10px hover:bg-button-surface-strong-primary-hover disabled:bg-button-surface-strong-disable"
          >
            重新寄送驗證信
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
            Back to Login
          </span>
        </button>
      </section>
    </div>
  );
};

export default VerifyCodeStep;
