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

const SEND_VERIFICATION_EMAIL_RES_SUCCESS = {
  success: true,
  code: '200',
  message: 'Success',
  data: {
    expiredAt: '1746706335',
    coolDown: 180,
    coolDownAt: 1746706515,
  },
};

const VERIFY_CODE_RESULT_SUCCESS = {
  success: true,
  code: '200',
  message: 'Success',
  data: {
    id: 10000001,
    name: 'Lisa',
    email: 'lisa@gmail.com',
    imageId: '10000000',
    agreementList: [],
    createdAt: 1725359150,
    updatedAt: 1725359150,
  },
};

export interface NewLoginPageProps {
  invitation: string;
  action: string;
}

const NewLoginPageBody = ({ invitation, action }: NewLoginPageProps) => {
  const { isAuthLoading, authenticateUser, isSignIn, isAgreeTermsOfService } = useUserCtx();

  const [step, setStep] = useState<'inputEmail' | 'verifyCode'>('inputEmail'); // 當前步驟
  const [inputEmail, setInputEmail] = useState<string>(''); // 使用者輸入的 email
  const [isEmailNotValid, setIsEmailNotValid] = useState<boolean>(false); // email 格式是否正確
  const [verificationCode, setVerificationCode] = useState<string>(''); // 使用者輸入的驗證碼
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false); // 是否正在寄送驗證信，用於切換 loading 圖案與按鈕狀態
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false); // 是否正在驗證驗證碼
  const [isResendingEmail, setIsResendingEmail] = useState<boolean>(false); // 是否正在重新寄送驗證信
  const [verifyCountdown, setVerifyCountdown] = useState<number>(0); // 驗證碼的有效時間倒數(例如 180 秒)
  const [resendCountdown, setResendCountdown] = useState<number>(0); // 重新寄送驗證信的冷卻時間倒數(例如 180 秒)
  const [sendEmailError, setSendEmailError] = useState<string>(''); // 寄送驗證信的錯誤訊息
  const [verifyCodeError, setVerifyCodeError] = useState<string>(''); // 驗證碼的錯誤訊息

  // Info: (20250509 - Liz) 回到輸入 email 的步驟，並重置所有的狀態
  const goBackToInputEmailStep = () => {
    setStep('inputEmail');
    setInputEmail('');
    setVerificationCode('');
    setVerifyCountdown(0);
    setResendCountdown(0);
    setIsEmailNotValid(false);
    setIsSendingEmail(false);
    setIsVerifyingCode(false);
    setIsResendingEmail(false);
    setSendEmailError('');
    setVerifyCodeError('');
  };

  // Info: (20250509 - Liz) 當使用者輸入 email 時，更新 email 狀態、清除錯誤訊息
  const updateInputEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputEmail(e.target.value);
    setIsEmailNotValid(false);
    setSendEmailError('');
    setResendCountdown(0);
  };

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

      // Info: (20250508 - Liz) 先使用假資料 SEND_VERIFICATION_EMAIL_RES_SUCCESS 來模擬 API 回傳
      const { success, message } = SEND_VERIFICATION_EMAIL_RES_SUCCESS;
      const coolDown = SEND_VERIFICATION_EMAIL_RES_SUCCESS.data?.coolDown ?? undefined;

      if (!success) {
        setSendEmailError('驗證信寄送失敗');
        // Deprecated: (20250509 - Liz)
        // eslint-disable-next-line no-console
        console.log(`寄送驗證信失敗: ${message}`);

        if (coolDown) setResendCountdown(coolDown);
        return;
      }

      if (coolDown) setVerifyCountdown(coolDown); // Info: (20250509 - Liz) 驗證碼的有效時間
      setStep('verifyCode');
    } catch (err) {
      setSendEmailError('寄送驗證信失敗，請稍後再試');
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

      // Info: (20250508 - Liz) 先使用假資料 VERIFY_CODE_RESULT_SUCCESS 來模擬 API 回傳
      const { success, message } = VERIFY_CODE_RESULT_SUCCESS;

      if (!success) {
        setVerifyCodeError('驗證碼錯誤');
        // Deprecated: (20250509 - Liz)
        // eslint-disable-next-line no-console
        console.log(`驗證碼錯誤: ${message}`);
        return;
      }

      // Deprecated: (20250508 - Liz) 暫時顯示驗證成功的提示，之後會刪除
      // eslint-disable-next-line no-alert
      window.alert('驗證成功');

      // ToDo: (20250508 - Liz) 驗證成功後，進行登入或其他操作(例如打 API 登入、打 API 獲取使用者資料、跳轉頁面等)
    } catch (err) {
      setVerifyCodeError('驗證失敗，請稍後再試');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Info: (20250508 - Liz) 重新寄出驗證信
  const handleResend = async () => {
    setIsResendingEmail(true);
    setVerifyCodeError('');
    try {
      // ToDo: (20250508 - Liz) 打 API 寄送驗證信 (SEND_VERIFICATION_EMAIL)

      // Info: (20250508 - Liz) 先使用假資料 SEND_VERIFICATION_EMAIL_RES_SUCCESS 來模擬 API 回傳
      const { success, message } = SEND_VERIFICATION_EMAIL_RES_SUCCESS;
      const coolDown = SEND_VERIFICATION_EMAIL_RES_SUCCESS.data?.coolDown ?? undefined;
      if (coolDown) setResendCountdown(coolDown); // Info: (20250509 - Liz) 從 API 回傳的資料中取得重新寄出驗證信的冷卻時間 coolDown

      if (!success) {
        setVerifyCodeError('重新寄送驗證信失敗');
        // Deprecated: (20250509 - Liz)
        // eslint-disable-next-line no-console
        console.log(`重新寄送驗證信失敗: ${message}`);
        return;
      }

      if (coolDown) setVerifyCountdown(coolDown); // Info: (20250509 - Liz) 驗證碼的有效時間
    } catch (err) {
      setVerifyCodeError('重新寄送驗證信失敗，請稍後再試');
    } finally {
      setIsResendingEmail(false);
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

  // Info: (20250508 - Liz) 每秒減一，直到 0 (不能太快重新寄送驗證信，需要冷卻時間)
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
              updateInputEmail={updateInputEmail}
              isEmailNotValid={isEmailNotValid}
              sendLoginEmail={sendLoginEmail}
              googleAuthSignIn={googleAuthSignIn}
              isSendingEmail={isSendingEmail}
              sendEmailError={sendEmailError}
              resendCountdown={resendCountdown}
            />
          )}
          {step === 'verifyCode' && (
            <VerifyCodeStep
              verificationCode={verificationCode}
              setVerificationCode={setVerificationCode}
              verifyCountdown={verifyCountdown}
              resendCountdown={resendCountdown}
              handleVerifyCode={handleVerifyCode}
              handleResend={handleResend}
              isResendingEmail={isResendingEmail}
              isVerifyingCode={isVerifyingCode}
              verifyCodeError={verifyCodeError}
              goBackToInputEmailStep={goBackToInputEmailStep}
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
