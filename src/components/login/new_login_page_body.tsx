import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiHome } from 'react-icons/fi';
import { useUserCtx } from '@/contexts/user_context';
import { Provider } from '@/constants/provider';
import { ISUNFA_ROUTE } from '@/constants/url';
import I18n from '@/components/i18n/i18n';
import useOuterClick from '@/lib/hooks/use_outer_click';
import Loader from '@/components/loader/loader';
import TermsOfServiceModal from '@/components/login/terms_of_service_modal';
import InputEmailStep from '@/components/login/input_email_step';
import VerifyCodeStep from '@/components/login/verify_code_step';

const SEND_VERIFICATION_EMAIL_RESULT = {
  success: true,
  message: '驗證信已寄送',
};

const VERIFY_CODE_RESULT = {
  success: true,
  message: '驗證成功',
};

export interface NewLoginPageProps {
  invitation: string;
  action: string;
}

const NewLoginPageBody = ({ invitation, action }: NewLoginPageProps) => {
  const { isAuthLoading, authenticateUser, isSignIn, isAgreeTermsOfService } = useUserCtx();
  const [step, setStep] = useState<'inputEmail' | 'verifyCode'>('inputEmail'); // 當前步驟
  const [inputEmail, setInputEmail] = useState<string>(''); // 使用者輸入的 email
  const [isEmailNotValid, setIsEmailNotValid] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState(''); // 使用者輸入的驗證碼
  const [isSendingEmail, setIsSendingEmail] = useState(false); // 是否正在寄送驗證信，用於切換 loading 圖案與按鈕狀態
  const [isVerifyingCode, setIsVerifyingCode] = useState(false); // 是否正在驗證驗證碼
  const [verifyCountdown, setVerifyCountdown] = useState(0); // 驗證碼的有效時間倒數(例如 60 秒)
  const [resendCountdown, setResendCountdown] = useState(0); // 重新寄送驗證信的冷卻倒數(例如 180 秒)
  const [sendEmailError, setSendEmailError] = useState(''); // 寄送驗證信的錯誤訊息
  const [verifyCodeError, setVerifyCodeError] = useState(''); // 驗證碼的錯誤訊息

  // Info: (20250508 - Liz) 使用者點擊登入按鈕後，會先進行 email 格式驗證，接著會打 API 寄送驗證信
  const sendLoginEmail = () => {
    const trimmedEmail = inputEmail.trim();
    if (!trimmedEmail) return;

    // Info: (20250508 - Liz) 簡單的 email 格式驗證
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!isValidEmail) {
      setIsEmailNotValid(true);
      return;
    }
    setIsEmailNotValid(false);

    // ToDo: (20250508 - Liz) 打 API 寄送驗證信 (SEND_VERIFICATION_EMAIL)
    setIsSendingEmail(true);
    setSendEmailError('');
    try {
      // ToDo: (20250508 - Liz) 打 API 寄送驗證信 (SEND_VERIFICATION_EMAIL)
      if (SEND_VERIFICATION_EMAIL_RESULT.success) {
        // Info: (20250508 - Liz) 先使用假資料 SEND_VERIFICATION_EMAIL_RESULT 來模擬 API 回傳
        setStep('verifyCode');
        setVerifyCountdown(60);
      } else {
        setSendEmailError('驗證信寄送失敗');
      }
    } catch (err) {
      setSendEmailError('發生錯誤，請稍後再試');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Info: (20250508 - Liz) 驗證使用者輸入的驗證碼
  const handleVerifyCode = async () => {
    setIsVerifyingCode(true);
    setVerifyCodeError('');
    try {
      // ToDo: (20250508 - Liz) 打 API 驗證驗證碼 (VERIFY_CODE)
      if (VERIFY_CODE_RESULT.success) {
        // Info: (20250508 - Liz) 先使用假資料 VERIFY_CODE_RESULT 來模擬 API 回傳
        // Deprecated: (20250508 - Liz) 暫時顯示驗證成功的提示，之後會刪除
        // eslint-disable-next-line no-alert
        window.alert('驗證成功');

        // ToDo: (20250508 - Liz) 驗證成功後，進行登入或其他操作
      } else {
        setVerifyCodeError('驗證碼錯誤');
      }
    } catch (err) {
      setVerifyCodeError('驗證失敗，請稍後再試');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Info: (20250508 - Liz) 重新寄出驗證信
  const handleResend = async () => {
    setVerifyCodeError('');
    try {
      // ToDo: (20250508 - Liz) 打 API 重新寄送驗證信 (SEND_VERIFICATION_EMAIL)
      setResendCountdown(180);
    } catch (err) {
      setVerifyCodeError('重新寄送失敗');
    }
  };

  // Info: (20250508 - Liz) Google 登入
  const googleAuthSignIn = () => {
    authenticateUser(Provider.GOOGLE, {
      invitation,
      action,
    });
  };

  // Info: (20250508 - Liz) 服務條款彈窗
  const [isTermsOfServiceModalVisible, setIsTermsOfServiceModalVisible] = useState<boolean>(false);
  const closeTermsOfServiceModal = () => {
    setIsTermsOfServiceModalVisible(false);
  };

  // Info: (20250508 - Liz) 當使用者登入後，顯示服務條款彈窗
  useEffect(() => {
    if (!isSignIn) return;
    setIsTermsOfServiceModalVisible(!isAgreeTermsOfService);
  }, [isSignIn, isAgreeTermsOfService]);

  // Info: (20250508 - Liz) I18n 語言選單的外部點擊事件
  const {
    targetRef: globalRef,
    componentVisible: isMenuVisible,
    setComponentVisible: setIsMenuVisible,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20250508 - Liz) 每秒減一，直到 0（驗證碼有效時間）
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (verifyCountdown > 0) {
      timer = setInterval(() => {
        setVerifyCountdown((prev) => {
          if (prev <= 1) clearInterval(timer);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [verifyCountdown]);

  // Info: (20250508 - Liz) 每秒減一，直到 0（不能連續重寄太快）
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) clearInterval(timer);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  return (
    <main className="relative flex h-screen flex-col items-center justify-center text-center">
      <div className="absolute inset-0 z-0 h-full w-full bg-login_bg bg-cover bg-center bg-no-repeat blur-md"></div>

      <section className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-40px text-button-text-secondary">
        <div ref={globalRef}>
          <I18n isMenuVisible={isMenuVisible} setIsMenuVisible={setIsMenuVisible} />
        </div>
        <Link href={ISUNFA_ROUTE.LANDING_PAGE}>
          <FiHome size={22} />
        </Link>
      </section>

      {isAuthLoading ? (
        <Loader />
      ) : (
        <>
          {step === 'inputEmail' && (
            <InputEmailStep
              inputEmail={inputEmail}
              setInputEmail={setInputEmail}
              isEmailNotValid={isEmailNotValid}
              setIsEmailNotValid={setIsEmailNotValid}
              sendLoginEmail={sendLoginEmail}
              googleAuthSignIn={googleAuthSignIn}
              isSendingEmail={isSendingEmail}
              sendEmailError={sendEmailError}
            />
          )}
          {step === 'verifyCode' && (
            <VerifyCodeStep
              verificationCode={verificationCode}
              setVerificationCode={setVerificationCode}
              handleVerifyCode={handleVerifyCode}
              isVerifyingCode={isVerifyingCode}
              verifyCountdown={verifyCountdown}
              resendCountdown={resendCountdown}
              handleResend={handleResend}
              verifyCodeError={verifyCodeError}
            />
          )}
        </>
      )}

      {/* // Info: (20241206 - Liz) 服務條款彈窗 */}
      <TermsOfServiceModal
        isModalVisible={isTermsOfServiceModalVisible}
        closeTermsOfServiceModal={closeTermsOfServiceModal}
      />
    </main>
  );
};

export default NewLoginPageBody;
