import useStateRef from 'react-usestateref';
import eventManager from '@/lib/utils/event_manager';
import {
  createContext,
  // SetStateAction, // Deprecated: (20240927 - Liz)
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ICompany } from '@/interfaces/company';
import { IUser } from '@/interfaces/user';
import { throttle } from '@/lib/utils/common';
import { Hash } from '@/constants/hash';
// import { STATUS_MESSAGE } from '@/constants/status_code'; // Deprecated: (20240927 - Liz)
import { clearAllItems } from '@/lib/utils/indexed_db/ocr';
// import { FREE_COMPANY_ID } from '@/constants/config'; // Deprecated: (20240927 - Liz) 之後要做選擇公司的功能再用
// ====================================================================================================
// Deprecated: (20240927 - Liz) 不懂為什麼要把 signIn 和 signOut 寫在 context 裡面?
// import { Provider } from '@/constants/provider';
import { signOut } from 'next-auth/react';
// import { ILoginPageProps } from '@/interfaces/page_props';
// ====================================================================================================

interface UserContextType {
  credential: string | null;
  userAuth: IUser | null;
  username: string | null;
  isSignIn: boolean;
  isAgreeTermsOfService: boolean;
  isAgreePrivacyPolicy: boolean;
  isSignInError: boolean;
  selectedCompany: ICompany | null;
  successSelectCompany: boolean | undefined;
  errorCode: string | null;
  isAuthLoading: boolean;
  toggleIsSignInError: () => void;
  checkIsRegistered: () => Promise<{
    isRegistered: boolean;
    credentials: PublicKeyCredential | null;
  }>;

  // signOut: () => void; // Deprecated: (20240927 - Liz) 不懂為什麼要把 signOut 寫在 context 裡面?
  // selectCompany: (company: ICompany | null, isPublic?: boolean) => Promise<void>; // Deprecated: (20240927 - Liz) Beta 版登入流程不需要選擇公司，所以先關起來，之後要做選擇公司的功能再用
  // returnUrl: string | null; // Deprecated: (20240927 - Liz)

  /*  // Deprecated: (20240927 - Liz)
  // userAgreeResponse: {
  //   success: boolean;
  //   data: null;
  //   code: string;
  //   error: Error | null;
  // } | null;
  */

  // handleUserAgree: (hash: Hash) => Promise<void>; // Deprecated: (20240927 - Liz)
  // authenticateUser: (selectProvider: Provider, props: ILoginPageProps) => Promise<void>; // Deprecated: (20240927 - Liz)
}

export const UserContext = createContext<UserContextType>({
  credential: null,
  userAuth: null,
  username: null,
  isSignIn: false,
  isAgreeTermsOfService: false,
  isAgreePrivacyPolicy: false,
  isSignInError: false,
  selectedCompany: null,
  successSelectCompany: undefined,
  errorCode: null,
  toggleIsSignInError: () => {},
  isAuthLoading: false,
  checkIsRegistered: async () => {
    return { isRegistered: false, credentials: null };
  },

  // signOut: () => {}, // Deprecated: (20240927 - Liz) 不懂為什麼要把 signOut 寫在 context 裡面?
  // selectCompany: async () => {}, // Deprecated: (20240927 - Liz) Beta 版登入流程不需要選擇公司，所以先關起來，之後要做選擇公司的功能再用
  // returnUrl: null, // Deprecated: (20240927 - Liz)
  // userAgreeResponse: null, // Deprecated: (20240927 - Liz)
  // handleUserAgree: async () => {}, // Deprecated: (20240927 - Liz)
  // authenticateUser: async () => {}, // Deprecated: (20240927 - Liz)
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const EXPIRATION_TIME = 1000 * 60 * 60 * 1; // 1 hour

  const [, setIsSignIn, isSignInRef] = useStateRef(false);
  const [, setCredential, credentialRef] = useStateRef<string | null>(null);
  const [, setUserAuth, userAuthRef] = useStateRef<IUser | null>(null);
  const [, setUsername, usernameRef] = useStateRef<string | null>(null);
  const [, setSelectedCompany, selectedCompanyRef] = useStateRef<ICompany | null>(null);
  const [, setSuccessSelectCompany, successSelectCompanyRef] = useStateRef<boolean | undefined>(
    undefined
  );
  const [, setIsSignInError, isSignInErrorRef] = useStateRef(false);
  const [, setErrorCode, errorCodeRef] = useStateRef<string | null>(null);
  const [, setIsAuthLoading, isAuthLoadingRef] = useStateRef(false);
  const [, setIsAgreeTermsOfService, isAgreeTermsOfServiceRef] = useStateRef(false);
  const [, setIsAgreePrivacyPolicy, isAgreePrivacyPolicyRef] = useStateRef(false);

  // const [returnUrl, setReturnUrl, returnUrlRef] = useStateRef<string | null>(null); // Deprecated: (20240927 - Liz)

  // const [, setUserAgreeResponse, userAgreeResponseRef] = useStateRef<{
  //   success: boolean;
  //   data: null;
  //   code: string;
  //   error: Error | null;
  // } | null>(null);

  const isRouteChanging = useRef(false);

  // Deprecated: (20240927 - Liz) 已經不用 FIDO2
  // const { trigger: signOutAPI } = APIHandler<void>(APIName.SIGN_OUT, {
  //   body: { credential: credentialRef.current },
  // });

  const { trigger: createChallengeAPI } = APIHandler<string>(APIName.CREATE_CHALLENGE);
  const { trigger: getStatusInfoAPI } = APIHandler<{ user: IUser; company: ICompany }>(
    APIName.STATUS_INFO_GET
  );

  // const { trigger: selectCompanyAPI } = APIHandler<ICompany>(APIName.COMPANY_SELECT); // Deprecated: (20240927 - Liz)
  // const { trigger: agreementAPI } = APIHandler<null>(APIName.AGREE_TO_TERMS); // Deprecated: (20240927 - Liz) 確認是否有簽署條款，可以改成當使用者點擊登入按鈕時再檢查

  const toggleIsSignInError = () => {
    setIsSignInError(!isSignInErrorRef.current);
  };

  const clearState = () => {
    setUserAuth(null);
    setUsername(null);
    setCredential(null);
    setIsSignIn(false);
    setIsSignInError(false);
    setSelectedCompany(null);
    setSuccessSelectCompany(undefined);
    localStorage.removeItem('userId');
    localStorage.removeItem('expired_at');
    clearAllItems(); // Info: 清空 IndexedDB 中的數據 (20240822 - Shirley)
  };

  // ====================================================================================================
  // Deprecated: (20240927 - Liz) 改成使用 HOC 的方式，進入一個受保護的路由時會先檢查是否登入，如果沒有登入就導向登入頁面

  // Info: (20240530 - Shirley) 在瀏覽器被重新整理後，如果沒有登入，就 redirect to login page
  const handleNotSignedIn = () => {
    clearState();
    // // Info: (20240927 - Liz) 驗證路徑是否由 users 開頭，並且不包含 login，如果是，就導向 login 頁面 :
    // if (router.pathname.startsWith('/users') && !router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
    //   router.push(ISUNFA_ROUTE.LOGIN);
    // }
  };

  // Deprecated: (20240927 - Liz) 確認是否有簽署條款，可以改成當使用者點擊登入按鈕時再檢查
  // const handleSignInRoute = () => {
  //   if (isAgreeTermsOfServiceRef.current && isAgreePrivacyPolicyRef.current) {
  //     router.push(ISUNFA_ROUTE.SELECT_COMPANY);
  //   }
  // };

  // ====================================================================================================
  // Deprecated: (20240927 - Liz) Beta 版只有 Google 和 Apple 登入，還需要生物辨識嗎？
  // Info: (20240927 - Liz) 這段程式碼是一個非同步函式 checkIsRegistered，用來檢查使用者是否已經註冊了生物辨識（例如指紋或臉部辨識）

  const checkIsRegistered = async (): Promise<{
    isRegistered: boolean;
    credentials: PublicKeyCredential | null;
  }> => {
    // Info: (20240730 - Tzuhan) 生成挑戰
    const { data: newChallengeBase64, success, code } = await createChallengeAPI();

    if (!success || !newChallengeBase64) {
      throw new Error(code);
    }

    // Info: (20240730 - Tzuhan) 將 base64 轉換成 Uint8Array
    const newChallenge = Uint8Array.from(atob(newChallengeBase64), (c) => c.charCodeAt(0));

    // Info: (20240730 - Tzuhan) 檢查是否已有綁定的憑證
    const credentials = (await navigator.credentials.get({
      publicKey: {
        challenge: newChallenge, // Info: (20240730 - Tzuhan)  使用生成的挑戰
        allowCredentials: [], // Info: (20240730 - Tzuhan)  查詢已綁定的憑證
        timeout: 60000,
        userVerification: 'required',
      },
    })) as PublicKeyCredential;

    // Info: (20240927 - Liz) 如果找到了憑證，回傳 isRegistered: true 和找到的憑證。否則，回傳 isRegistered: false 和 null 憑證。
    if (credentials) {
      return {
        isRegistered: true,
        credentials,
      };
    }
    return {
      isRegistered: false,
      credentials: null,
    };
  };
  // ====================================================================================================
  // Deprecated: (20240927 - Liz) 不需要這個 function。檢查是否有同意條款，如果有同意就表示登入成功，會自動導向原先的路由（如果沒有可以返回的頁面就會自動導向預設路由），這一段會在登入頁面處理

  // Info: (20240926 - Liz) handleReturnUrl 用來處理使用者完成認證後的重新導向邏輯
  // Info: (20240926 - Liz) 首先檢查使用者是否同意服務條款和隱私權政策
  // Info: (20240926 - Liz) 如果有 returnUrl，將其解碼並重新導向到該 URL
  // Info: (20240926 - Liz) 如果沒有 returnUrl，但目前路徑包含選擇公司頁面，或者已選擇公司且在登入頁面，則重新導向到儀表板

  /* ---
  const handleReturnUrl = () => {
    if (isAgreeTermsOfServiceRef.current && isAgreePrivacyPolicyRef.current) {
      if (returnUrl) {
        const urlString = decodeURIComponent(returnUrl);
        setReturnUrl(null);
        router.push(urlString);
      } else if (
        router.pathname.includes(ISUNFA_ROUTE.SELECT_COMPANY) ||
        (selectedCompanyRef.current && router.pathname.includes(ISUNFA_ROUTE.LOGIN))
      ) {
        router.push(ISUNFA_ROUTE.DASHBOARD);
      }
    }
  };
  --- */

  // ====================================================================================================

  // Deprecated: (20240927 - Liz) 登出功能為什麼要寫在 context 裡面?
  // const signOut = async () => {
  //   await signOutAPI();
  //   await authSignOut({ redirect: false });
  //   handleNotSignedIn();
  // };

  // ====================================================================================================

  // Info: (20240927 - Liz) 這段程式碼是用來檢查是否需要重新 fetch statusInfo
  const isProfileFetchNeeded = () => {
    const userId = localStorage.getItem('userId');
    const expiredAt = localStorage.getItem('expired_at');
    const isUserAuthAvailable = !!userAuthRef.current;

    // Info: (20240822-Tzuhan) 如果 state 中沒有用戶資料，且 localStorage 中有記錄，則應該重新獲取 profile
    if (!isUserAuthAvailable && userId && expiredAt) {
      // Info: (20240822-Tzuhan) 如果 expiredAt 未過期，應該重新獲取 profile
      if (Date.now() < Number(expiredAt)) {
        return true;
      } else {
        signOut();
        return false;
      }
    }

    // Info: (20240822-Tzuhan) 如果 state 中有用戶資料，且 localStorage 中沒有記錄，則應該重新獲取 profile
    if (isUserAuthAvailable && (!userId || !expiredAt)) {
      return true;
    }

    // Info: (20240822-Tzuhan) 如果 state 和 localStorage 中都沒有用戶資料，則應該重新獲取 profile
    if (!isUserAuthAvailable && (!userId || !expiredAt)) {
      return true;
    }

    // Info: (20240822-Tzuhan) 以上情況都不滿足，則不需要重新獲取 profile
    return false;
  };

  // ====================================================================================================
  // Deprecated: (20240927 - Liz) 沒有監聽事件的話，就不需要這個 getStateInfo 函數

  // Info: (20240927 - Liz) 處理使用者認證資訊，設定使用者狀態，並在 localStorage 中儲存使用者 ID 和過期時間。
  const handleUserAuth = (user: IUser) => {
    setUserAuth(user);
    setUsername(user.name);
    setIsSignIn(true);
    setIsSignInError(false);
    localStorage.setItem('userId', user.id.toString());
    localStorage.setItem('expired_at', (Date.now() + EXPIRATION_TIME).toString());
  };

  // Info: (20240927 - Liz) 檢查使用者是否同意服務條款和隱私政策，並更新相應的狀態
  const handleUserAgreements = (user: IUser) => {
    const hasHashForTermsOfService = user.agreementList.includes(Hash.HASH_FOR_TERMS_OF_SERVICE);
    const hasHashForPrivacyPolicy = user.agreementList.includes(Hash.HASH_FOR_PRIVACY_POLICY);
    setIsAgreeTermsOfService(hasHashForTermsOfService);
    setIsAgreePrivacyPolicy(hasHashForPrivacyPolicy);
  };

  // Info: (20240927 - Liz) 設定選擇的公司
  const handleCompanySelection = (company: ICompany) => {
    if (company && Object.keys(company).length > 0) {
      setSelectedCompany(company);
      setSuccessSelectCompany(true);
    } else {
      setSuccessSelectCompany(undefined);
      setSelectedCompany(null);
    }
  };

  // Info: (20240927 - Liz) getStatusInfo 是使用 useCallback 包裝的非同步函式，用於獲取使用者狀態資訊
  const getStatusInfo = useCallback(async () => {
    // Info: (20240927 - Liz) 首先檢查是否需要獲取 profile
    const isNeed = isProfileFetchNeeded();
    if (!isNeed) return;

    // Info: (20240927 - Liz) 設定 loading 狀態
    setIsAuthLoading(true);

    try {
      // Info: (20240927 - Liz) 發送 API 請求，獲取使用者狀態資訊
      const { data: statusInfo, success, code } = await getStatusInfoAPI();

      // Info: (20240927 - Liz) 重置選擇公司狀態
      setSelectedCompany(null);
      setSuccessSelectCompany(undefined);

      // Info: (20240927 - Liz) 如果 API 請求失敗，處理未登入的情況
      if (!success) {
        handleNotSignedIn();
        setIsSignInError(true);
        setErrorCode(code ?? '');
        return;
      }

      // Info: (20240927 - Liz) 檢查 API 回傳的資訊是否包含有效的使用者資料
      if (!statusInfo || !('user' in statusInfo) || !statusInfo.user) {
        handleNotSignedIn();
        return;
      }

      // Info: (20240927 - Liz) API 回傳的資訊包含有效的使用者資料，處理使用者認證資訊、同意條款和選擇公司
      handleUserAuth(statusInfo.user);
      handleUserAgreements(statusInfo.user);
      handleCompanySelection(statusInfo.company);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in getStatusInfo:', error);
      handleNotSignedIn();
      setIsSignInError(true);
    } finally {
      // Info: (20240927 - Liz) 關閉 loading 狀態
      setIsAuthLoading(false);
    }
  }, [router.pathname]);

  // ====================================================================================================

  // Deprecated: (20240927 - Liz) 簽署完條款後的自動導向功能不用在這裡做，應該在登入頁面做
  // Info: (20240903 - Shirley) 第一次登入，在用戶同意後，重新導向到選擇公司的頁面
  // useEffect(() => {
  //   handleSignInRoute();
  // }, [userAgreeResponseRef.current]);

  // ====================================================================================================

  // Deprecated: (20240927 - Liz) 驗證使用者是否同意服務條款和隱私權政策，這個功能應該在登入頁面做
  // Info: (20240927 - Liz) 透過呼叫 API 更新使用者對不同政策（服務條款或隱私政策）的同意狀態

  // const handleUserAgree = async (hash: Hash) => {
  //   try {
  //     setIsAuthLoading(true);
  //     const response = await agreementAPI({
  //       params: { userId: userAuth?.id },
  //       body: { agreementHash: hash },
  //     });
  //     setUserAgreeResponse(response);
  //     setIsAuthLoading(false);
  //     if (hash === Hash.HASH_FOR_TERMS_OF_SERVICE) {
  //       setIsAgreeTermsOfService(true);
  //     }
  //     if (hash === Hash.HASH_FOR_PRIVACY_POLICY) {
  //       setIsAgreePrivacyPolicy(true);
  //     }
  //   } catch (error) {
  //     setUserAgreeResponse({
  //       success: false,
  //       data: null,
  //       code: '',
  //       error: error as Error,
  //     });
  //   }
  // };

  // ====================================================================================================

  // Deprecated: (20240927 - Liz) 這個功能應該在登入頁面做，不懂為什麼要寫在 context 裡面
  // Info: (20240927 - Liz) 透過呼叫 next-auth/react 的 signIn 函數，進行使用者認證，並處理認證後的狀態

  // const authenticateUser = async (selectProvider: Provider, props: ILoginPageProps) => {
  //   try {
  //     setIsAuthLoading(true);
  //     const response = await authSignIn(
  //       selectProvider,
  //       { redirect: false },
  //       // Info: (20240909 - Anna) TypeScript 本身已經有型別檢查系統。因此 ESLint 不需要針對 TypeScript 檔案強制使用 prop-types。因此這裡的ESLint註解不做移除。
  //       // eslint-disable-next-line react/prop-types
  //       { invitation: props.invitation }
  //     );

  //     if (response?.error) {
  //       throw new Error(response.error);
  //     }
  //   } catch (error) {
  //     // TODO: (20240814-Tzuhan) [Beta] handle error
  //   }
  // };

  // ====================================================================================================

  // Deprecated: (20240927 - Liz) Beta 版在登入流程不需要選擇公司，所以這個功能先關起來

  /* ---
  // Info: (20240927 - Liz) 處理選擇公司後的回應
  const handleSelectCompanyResponse = async (response: {
    success: boolean;
    data: ICompany | null;
    code: string;
    error: Error | null;
  }) => {
    // Info: (20240927 - Liz) 如果選擇公司成功且有回傳資料：設定選擇的公司, 標記選擇公司成功, 執行 handleReturnUrl 函數處理重新導向至預設路由(Alpha: Dashboard)
    if (response.success && response.data !== null) {
      setSelectedCompany(response.data);
      setSuccessSelectCompany(true);
      // handleReturnUrl(); // Deprecated: (20240927 - Liz)
    }
    // Info: (20240927 - Liz) 如果選擇公司失敗：清除選擇的公司, 標記選擇公司失敗, 設定錯誤代碼
    if (response.success === false) {
      setSelectedCompany(null);
      setSuccessSelectCompany(false);
      setErrorCode(response.code ?? '');
    }
  };

  // Info: (20240513 - Julian) 選擇公司的功能
  const selectCompany = async (company: ICompany | null, isPublic = false) => {
    setSelectedCompany(null);
    setSuccessSelectCompany(undefined);

    const res = await selectCompanyAPI({
      params: {
        companyId: !company && !isPublic ? -1 : (company?.id ?? FREE_COMPANY_ID),
      },
    });

    if (!company && !isPublic) {
      router.push(ISUNFA_ROUTE.SELECT_COMPANY);
      return;
    }
    await handleSelectCompanyResponse(res);
  };
  --- */

  // ====================================================================================================

  // Deprecated: (20240927 - Liz) 可以透過 BroadcastChannel API 來處理多個頁面之間的通訊，不需要使用 eventManager 來處理
  // Deprecated: (20240927 - Liz) 驗證身分的自動導向功能不用在這裡做，可以在 HOC 中做

  // Info: (20240927 - Liz) 以下是監聽事件: visibilitychange, routeChangeStart, routeChangeComplete
  const throttledGetStatusInfo = useCallback(
    throttle(() => {
      getStatusInfo();
    }, 100),
    [getStatusInfo]
  );

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && !isRouteChanging.current) {
      throttledGetStatusInfo();
    }
  }, [throttledGetStatusInfo]);

  const handleRouteChangeStart = useCallback(() => {
    if (router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
      isRouteChanging.current = true;
      throttledGetStatusInfo();
    }
  }, [throttledGetStatusInfo, router.pathname]);

  const handleRouteChangeComplete = useCallback(() => {
    isRouteChanging.current = false;
  }, []);

  useEffect(() => {
    getStatusInfo();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [handleVisibilityChange, handleRouteChangeStart, handleRouteChangeComplete, router.events]);

  useEffect(() => {
    const handleUnauthorizedAccess = () => {
      signOut();
    };

    // Info: (20240822-Tzuhan) 確保只有一個監聽器
    eventManager.off('Unauthorized access', handleUnauthorizedAccess);
    eventManager.on('Unauthorized access', handleUnauthorizedAccess);

    return () => {
      eventManager.off('Unauthorized access', handleUnauthorizedAccess);
    };
  }, [signOut]);

  // ====================================================================================================

  // Info: (20240522 - Shirley) dependency array 的值改變，才會讓更新後的 value 傳到其他 components
  const value = useMemo(
    () => ({
      credential: credentialRef.current,
      userAuth: userAuthRef.current,
      username: usernameRef.current,
      isSignIn: isSignInRef.current,
      isAgreeTermsOfService: isAgreeTermsOfServiceRef.current,
      isAgreePrivacyPolicy: isAgreePrivacyPolicyRef.current,
      isSignInError: isSignInErrorRef.current,
      selectedCompany: selectedCompanyRef.current,
      successSelectCompany: successSelectCompanyRef.current,
      errorCode: errorCodeRef.current,
      isAuthLoading: isAuthLoadingRef.current,
      toggleIsSignInError,
      checkIsRegistered,
      // signOut, // Deprecated: (20240927 - Liz) 登出功能為什麼要寫在 context 裡面?
      // selectCompany, // Deprecated: (20240927 - Liz) Beta 版登入流程不需要選擇公司，所以先關起來，之後要做選擇公司的功能再用
      // returnUrl: returnUrlRef.current, // Deprecated: (20240927 - Liz)
      // handleUserAgree, // Deprecated: (20240927 - Liz)
      // authenticateUser, // Deprecated: (20240927 - Liz)
      // userAgreeResponse: userAgreeResponseRef.current, // Deprecated: (20240927 - Liz) 確認是否有簽署條款，可以改成當使用者點擊登入按鈕時再檢查
    }),
    [
      credentialRef.current,
      selectedCompanyRef.current,
      successSelectCompanyRef.current,
      errorCodeRef.current,
      isSignInErrorRef.current,
      isAuthLoadingRef.current,
      router.pathname,
      userAuthRef.current,
      // returnUrlRef.current, // Deprecated: (20240927 - Liz)
    ]
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserCtx = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserCtx must be used within a UserProvider');
  }
  return context;
};

/** Info: (20240903 - Shirley)
 * 前端登入流程：
 * 1. 當用戶點擊登入按鈕時，會調用 `authenticateUser` 函數，傳入選擇的登入方式（如 Google 或 Apple）和登入頁面的 props。
 * 2. `authenticateUser` 函數會調用 `authSignIn` 函數（來自 `next-auth/react`），傳入選擇的登入方式和額外的參數，開始 OAuth2.0 的登入流程。
 * 3. 登入流程跳轉到 `[...nextauth].ts` 中的 `/api/auth/signin` 路由，該路由由 NextAuth 處理。
 * 4. NextAuth 根據選擇的登入方式（如 Google 或 Apple），跳轉到相應的 OAuth 提供者進行用戶認證。
 * 5. 用戶在 OAuth 提供者的頁面上輸入憑證並授權應用訪問其資料。
 * 6. OAuth 提供者認證成功後，會將用戶重定向回應用的 `/api/auth/callback/:provider` 路由，該路由也由 NextAuth 處理。
 * 7. NextAuth 在 `[...nextauth].ts` 的 `signIn` 回調函數中處理登入成功後的邏輯：
 *    - 檢查用戶是否已存在於資料庫中，如果不存在則創建新用戶。
 *    - 調用 `setSession` 函數（來自 `session.ts`）將用戶的 ID 存儲在 session 中。
 * 8. 登入成功後，NextAuth 會將用戶重定向到應用的主頁面(iSunFA login page)。
 * 9. 在主頁面(iSunFA login page)中，`UserProvider` 組件會調用 `getStatusInfo` 函數來獲取當前登入用戶和公司的資料。
 *    - `getStatusInfo` 函數會調用 `getStatusInfoAPI`，該 API 會攜帶 NextAuth 管理的 session。
 *    - 在 `status_info.ts` 中的 `handleGetRequest` 函數中，通過調用 `getSession` 函數（來自 `session.ts`）獲取當前請求的 session，並從中獲取用戶的 ID 和公司 ID。
 *    - 根據獲取到的用戶 ID 和公司 ID，從資料庫中獲取相應的用戶和公司資料，並返回給前端。
 *    - 如果回傳的資料有 user 但沒有 company，透過 `handleSignInRoute` 將用戶導向選擇公司的頁面，有 user 跟 company 則透過 `handleReturnUrl` 將用戶導向之前儀表板/嘗試訪問的頁面。
 * 10. 如果 `getStatusInfoAPI` 請求成功，並且返回的數據中包含用戶和公司的資訊：
 *     - 將這些資料存儲到 React 的 state 中。
 *     - 將用戶 ID 存儲到 localStorage 中。
 *     - 設定一個過期時間（例如 1 小時後），並將其存儲到 localStorage 中。
 * 11. React state 中的用戶和公司資料會通過 `UserContext` 提供給應用的其他組件使用。
 * 12. 檢查用戶是否已同意所有必要的條款：
 *     - 如果用戶尚未同意所有必要的條款（如資訊收集同意書和服務條款），系統會顯示相應的同意書頁面。
 *     - 用戶需要閱讀並同意這些條款。
 * 13. 當用戶同意條款時：
 *     - 調用 `handleUserAgree` 函數，該函數會發送 API 請求（`agreementAPI`）來更新用戶的同意狀態。
 *     - 如果 API 請求成功，更新本地 state 中的用戶同意狀態（`setIsAgreeTermsOfService` 和 `setIsAgreePrivacyPolicy`）。
 * 14. 當用戶同意所有必要的條款後：
 *     - 如果用戶尚未選擇公司，系統會將用戶重定向到選擇公司的頁面。
 *     - 如果用戶已經選擇了公司，系統會將用戶重定向到儀表板或之前嘗試訪問的頁面（如果有的話）。
 * 15. 在每次頁面加載或路由變更時，系統會檢查 localStorage 中的用戶 ID 和過期時間：
 *     - 如果存在有效的用戶 ID 和未過期的時間戳，系統會嘗試重新獲取用戶狀態（調用 `getStatusInfo`）。
 *     - 如果 localStorage 中的數據已過期或不存在，系統會清除 state 並將用戶重定向到登入頁面。
 *
 * 總結：
 * - NextAuth 負責管理 OAuth2.0 的登入流程，並在登入成功後調用 `setSession` 函數將用戶的 ID 存儲在 session 中。
 * - 在主頁面(iSunFA login page)中，`getStatusInfo` 函數會調用 `getStatusInfoAPI`，該 API 通過 `getSession` 函數從 NextAuth 管理的 session 中獲取當前登入用戶的 ID 和公司 ID，並根據這些 ID 從資料庫中獲取相應的用戶和公司資料。
 * - 獲取到的用戶和公司資料會存儲到 React 的 state 中，並通過 `UserContext` 提供給應用的其他組件使用。
 * - 用戶 ID 和登入狀態的過期時間會被存儲在 localStorage 中，用於在頁面刷新或重新訪問時快速恢復用戶狀態。
 * - `session.ts` 中提供的 `getSession` 和 `setSession` 函數封裝了 `next-session` 庫的功能，不僅 NextAuth 可以使用這些函數來操作 session，其他後端檔案（如 API 路由）也可以通過調用這些函數來讀取和修改 session。
 * - 登入流程包含了檢查和處理用戶同意條款的邏輯，確保用戶在使用系統之前已經同意了所有必要的條款。
 * - 用戶同意條款的狀態會被更新到資料庫中，並反映在本地 state 中，影響後續的導航邏輯。
 * - 系統使用 localStorage 來保存用戶的登入狀態，以提高用戶體驗並減少不必要的 API 請求。
 */
