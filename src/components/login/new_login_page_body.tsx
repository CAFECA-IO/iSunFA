import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TbHome } from 'react-icons/tb';
import { useUserCtx } from '@/contexts/user_context';
import { Provider } from '@/constants/provider';
import { ISUNFA_ROUTE } from '@/constants/url';
import I18n from '@/components/i18n/i18n';
import useOuterClick from '@/lib/hooks/use_outer_click';
import Loader from '@/components/loader/loader';
import TermsOfServiceModal from '@/components/login/terms_of_service_modal';
import InputEmailStep from '@/components/login/input_email_step';
import VerifyCodeStep from '@/components/login/verify_code_step';
import { useModalContext } from '@/contexts/modal_context';
import { ToastType, ToastPosition } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ICoolDown, IOneTimePasswordResult } from '@/interfaces/email';
import { IUser } from '@/interfaces/user';
import { useRouter } from 'next/router';
import loggerFront from '@/lib/utils/logger_front';

enum LOGIN_STEP {
  INPUT_EMAIL = 'inputEmail',
  VERIFY_CODE = 'verifyCode',
}

interface NewLoginPageProps {
  invitation: string;
  action: string;
}

const NewLoginPageBody = ({ invitation, action }: NewLoginPageProps) => {
  const { isAuthLoading, authenticateUser, isSignIn, isAgreeTermsOfService } = useUserCtx();
  const { toastHandler } = useModalContext();
  const router = useRouter();

  /* Info: (20250625 - Luphia)
   * 獲取外部服務參數 service, uid
   */
  const { provider, uid } = router.query as { provider?: string; uid?: string };
  const [step, setStep] = useState<LOGIN_STEP.INPUT_EMAIL | LOGIN_STEP.VERIFY_CODE>(
    LOGIN_STEP.INPUT_EMAIL
  ); // Info: (20250509 - Liz) 當前步驟
  const [inputEmail, setInputEmail] = useState<string>(''); // Info: (20250509 - Liz) 使用者輸入的 email
  const [isEmailNotValid, setIsEmailNotValid] = useState<boolean>(false); // Info: (20250509 - Liz) email 格式是否正確
  const [verificationCode, setVerificationCode] = useState<string>(''); // Info: (20250509 - Liz) 使用者輸入的驗證碼
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false); // Info: (20250509 - Liz) 是否正在寄送驗證信，用於切換 loading 圖案與按鈕狀態
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false); // Info: (20250509 - Liz) 是否正在驗證驗證碼
  const [isResendingEmail, setIsResendingEmail] = useState<boolean>(false); // Info: (20250509 - Liz) 是否正在重新寄送驗證信
  const [verifyCountdown, setVerifyCountdown] = useState<number>(0); // Info: (20250509 - Liz) 驗證碼的有效時間倒數 (例如 180 秒)
  const [resendCountdown, setResendCountdown] = useState<number>(0); // Info: (20250509 - Liz) 重新寄送驗證信的冷卻時間倒數 (例如 180 秒)
  const [sendEmailError, setSendEmailError] = useState<string>(''); // Info: (20250509 - Liz) 寄送驗證信的錯誤訊息
  const [verifyCodeError, setVerifyCodeError] = useState<string>(''); // Info: (20250509 - Liz) 驗證碼的錯誤訊息
  const [validateEmail, setValidateEmail] = useState<string>(''); // Info: (20250509 - Liz) 已通過格式驗證的 email (傳給 API 使用)

  // Info: (20250509 - Liz) 回到輸入 email 的步驟，並重置所有的狀態
  const goBackToInputEmailStep = () => {
    setStep(LOGIN_STEP.INPUT_EMAIL);
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

  // Info: (20250509 - Liz) 寄送驗證信 API
  const { trigger: sendVerificationEmailAPI } = APIHandler<IOneTimePasswordResult | ICoolDown>(
    APIName.SEND_VERIFICATION_EMAIL
  );

  // Info: (20250508 - Liz) 使用者點擊登入按鈕後，會先進行 email 格式驗證，接著會打 API 寄送驗證信
  const sendLoginEmail = async () => {
    const trimmedEmail = inputEmail.trim();
    if (!trimmedEmail) return;

    // Info: (20250508 - Liz) 簡單的 email 格式驗證
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!isValidEmail) {
      setIsEmailNotValid(true);
      return;
    }
    setValidateEmail(trimmedEmail);
    setIsEmailNotValid(false);

    // Info: (20250509 - Liz) 打 API 寄送驗證信 (SEND_VERIFICATION_EMAIL)
    setIsSendingEmail(true);
    setSendEmailError('');
    try {
      const query = provider && uid ? { provider, uid } : undefined;
      const { success, error, data } = await sendVerificationEmailAPI({
        query,
        params: {
          email: trimmedEmail,
        },
      });
      const coolDown = data?.coolDown ?? undefined;

      if (!success) {
        setSendEmailError('驗證信寄送失敗');
        loggerFront.log(`寄送驗證信失敗: ${error?.message}`);

        if (coolDown) setResendCountdown(coolDown);
        return;
      }

      if (coolDown) setVerifyCountdown(coolDown); // Info: (20250509 - Liz) 驗證碼的有效時間
      setStep(LOGIN_STEP.VERIFY_CODE);
    } catch (err) {
      (err as Error).message += ' (寄送驗證信失敗)';
      setSendEmailError('寄送驗證信失敗，請稍後再試');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Info: (20250509 - Liz) 驗證驗證碼 API
  const { trigger: verifyCodeAPI } = APIHandler<IUser | ICoolDown>(APIName.VERIFY_CODE);

  // Info: (20250508 - Liz) 驗證使用者輸入的驗證碼
  const handleVerifyCode = async () => {
    setIsVerifyingCode(true);
    setVerifyCodeError('');
    try {
      // Info: (20250509 - Liz) 打 API 驗證驗證碼 (VERIFY_CODE)
      const { success, error, data } = await verifyCodeAPI({
        params: { email: validateEmail },
        body: { code: verificationCode },
      });

      const maxAttempts: number = data && 'maxAttempts' in data ? data.maxAttempts : 0;

      if (!success) {
        setVerifyCodeError('驗證碼錯誤');
        loggerFront.log(`驗證碼錯誤: ${error?.message}`);

        if (maxAttempts > 0) {
          toastHandler({
            id: ToastId.VERIFY_CODE_ERROR,
            type: ToastType.ERROR,
            content: `Incorrect code. You have ${maxAttempts} more attempts remaining.`,
            closeable: true,
            position: ToastPosition.TOP_CENTER,
          });
        }
        return;
      }

      // Info: (20250630 - Luphia) 驗證成功跳轉回到登入頁面，該頁面會處理服務條款確認、角色創建、角色選擇等流程
      router.push(ISUNFA_ROUTE.LOGIN);
    } catch (err) {
      (err as Error).message += ' (驗證碼驗證失敗)';
      setVerifyCodeError('驗證失敗，請稍後再試');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Info: (20250508 - Liz) 重新寄出驗證信
  const handleResend = async () => {
    setVerificationCode('');
    setIsResendingEmail(true);
    setVerifyCodeError('');
    try {
      // Info: (20250509 - Liz) 打 API 寄送驗證信 (SEND_VERIFICATION_EMAIL)
      const { success, error, data } = await sendVerificationEmailAPI({
        params: {
          email: validateEmail,
        },
      });

      const coolDown = data?.coolDown ?? undefined;
      if (coolDown) setResendCountdown(coolDown); // Info: (20250509 - Liz) 從 API 回傳的資料中取得重新寄出驗證信的冷卻時間 coolDown

      if (!success) {
        setVerifyCodeError('重新寄送驗證信失敗');
        loggerFront.log(`重新寄送驗證信失敗: ${error?.message}`);
        return;
      }

      if (coolDown) setVerifyCountdown(coolDown); // Info: (20250509 - Liz) 驗證碼的有效時間
    } catch (err) {
      (err as Error).message += ' (重新寄送驗證信失敗)';
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
    componentVisible: isMenuOpen,
    setComponentVisible: setIsMenuOpen,
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

      <section className="absolute right-0 top-0 z-0 mr-40px mt-40px flex items-center gap-12px text-button-text-secondary">
        <div ref={globalRef}>
          <I18n isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        </div>
        <Link
          href={ISUNFA_ROUTE.LANDING_PAGE}
          className="p-10px text-icon-surface-single-color-primary hover:text-button-text-primary-hover disabled:text-button-text-disable"
        >
          <TbHome size={20} />
        </Link>
      </section>

      {isAuthLoading ? (
        <Loader />
      ) : (
        <>
          {step === LOGIN_STEP.INPUT_EMAIL && (
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
          {step === LOGIN_STEP.VERIFY_CODE && (
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

      {/* Info: (20241206 - Liz) 服務條款彈窗 */}
      <TermsOfServiceModal
        isModalVisible={isTermsOfServiceModalVisible}
        closeTermsOfServiceModal={closeTermsOfServiceModal}
      />
    </main>
  );
};

export default NewLoginPageBody;
