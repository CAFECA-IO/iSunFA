import useStateRef from 'react-usestateref';
import eventManager from '@/lib/utils/event_manager';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { FREE_COMPANY_ID } from '@/constants/config';
import { ISUNFA_ROUTE } from '@/constants/url';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ICompany } from '@/interfaces/company';
import { IUser } from '@/interfaces/user';
import { throttle } from '@/lib/utils/common';
import { Provider } from '@/constants/provider';
import { signIn as authSignIn, signOut as authSignOut } from 'next-auth/react';
import { ILoginPageProps } from '@/interfaces/page_props';
import { Hash } from '@/constants/hash';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { clearAllItems } from '@/lib/utils/indexed_db/ocr';

interface UserContextType {
  credential: string | null;
  signOut: () => void;
  userAuth: IUser | null;
  username: string | null;
  signedIn: boolean;
  isAgreeInfoCollection: boolean;
  isAgreeTosNPrivacyPolicy: boolean;
  isSignInError: boolean;
  selectedCompany: ICompany | null;
  selectCompany: (company: ICompany | null, isPublic?: boolean) => Promise<void>;
  successSelectCompany: boolean | undefined;
  errorCode: string | null;
  toggleIsSignInError: () => void;
  isAuthLoading: boolean;
  returnUrl: string | null;
  checkIsRegistered: () => Promise<{
    isRegistered: boolean;
    credentials: PublicKeyCredential | null;
  }>;

  userAgreeResponse: {
    success: boolean;
    data: null;
    code: string;
    error: Error | null;
  } | null;
  handleUserAgree: (hash: Hash) => Promise<void>;
  authenticateUser: (selectProvider: Provider, props: ILoginPageProps) => Promise<void>;
}

export const UserContext = createContext<UserContextType>({
  credential: null,
  signOut: () => {},
  userAuth: null,
  username: null,
  signedIn: false,
  isAgreeInfoCollection: false,
  isAgreeTosNPrivacyPolicy: false,
  isSignInError: false,
  selectedCompany: null,
  selectCompany: async () => {},
  successSelectCompany: undefined,
  errorCode: null,
  toggleIsSignInError: () => {},
  isAuthLoading: false,
  returnUrl: null,
  checkIsRegistered: async () => {
    return { isRegistered: false, credentials: null };
  },

  userAgreeResponse: null,
  handleUserAgree: async () => {},
  authenticateUser: async () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const EXPIRATION_TIME = 1000 * 60 * 60 * 1; // Info: (20240822) 1 hours

  const [, setSignedIn, signedInRef] = useStateRef(false);
  const [, setCredential, credentialRef] = useStateRef<string | null>(null);
  const [userAuth, setUserAuth, userAuthRef] = useStateRef<IUser | null>(null);
  const [, setUsername, usernameRef] = useStateRef<string | null>(null);
  const [, setSelectedCompany, selectedCompanyRef] = useStateRef<ICompany | null>(null);
  const [, setSuccessSelectCompany, successSelectCompanyRef] = useStateRef<boolean | undefined>(
    undefined
  );
  const [, setIsSignInError, isSignInErrorRef] = useStateRef(false);
  const [, setErrorCode, errorCodeRef] = useStateRef<string | null>(null);
  const [, setIsAuthLoading, isAuthLoadingRef] = useStateRef(false);
  const [returnUrl, setReturnUrl, returnUrlRef] = useStateRef<string | null>(null);
  const [, setIsAgreeInfoCollection, isAgreeInfoCollectionRef] = useStateRef(false);
  const [, setIsAgreeTosNPrivacyPolicy, isAgreeTosNPrivacyPolicyRef] = useStateRef(false);
  const [, setUserAgreeResponse, userAgreeResponseRef] = useStateRef<{
    success: boolean;
    data: null;
    code: string;
    error: Error | null;
  } | null>(null);
  const isRouteChanging = useRef(false);

  const { trigger: signOutAPI } = APIHandler<void>(APIName.SIGN_OUT, {
    body: { credential: credentialRef.current },
  });
  const { trigger: createChallengeAPI } = APIHandler<string>(APIName.CREATE_CHALLENGE);
  const { trigger: selectCompanyAPI } = APIHandler<ICompany>(APIName.COMPANY_SELECT);
  const { trigger: getStatusInfoAPI } = APIHandler<{ user: IUser; company: ICompany }>(
    APIName.STATUS_INFO_GET
  );
  const { trigger: agreementAPI } = APIHandler<null>(APIName.AGREE_TO_TERMS);

  const toggleIsSignInError = () => {
    setIsSignInError(!isSignInErrorRef.current);
  };

  const clearState = () => {
    setUserAuth(null);
    setUsername(null);
    setCredential(null);
    setSignedIn(false);
    setIsSignInError(false);
    setSelectedCompany(null);
    setSuccessSelectCompany(undefined);
    localStorage.removeItem('userId');
    localStorage.removeItem('expired_at');
    clearAllItems(); // Info: 清空 IndexedDB 中的數據 (20240822 - Shirley)
  };

  // Info: (20240530 - Shirley) 在瀏覽器被重新整理後，如果沒有登入，就 redirect to login page
  const handleNotSignedIn = () => {
    clearState();
    if (router.pathname.startsWith('/users') && !router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
      router.push(ISUNFA_ROUTE.LOGIN);
    }
  };

  const handleSignInRoute = () => {
    if (isAgreeInfoCollectionRef.current && isAgreeTosNPrivacyPolicyRef.current) {
      router.push(ISUNFA_ROUTE.SELECT_COMPANY);
    }
  };

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

  const handleReturnUrl = () => {
    if (isAgreeInfoCollectionRef.current && isAgreeTosNPrivacyPolicyRef.current) {
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

  const signOut = async () => {
    await signOutAPI();
    await authSignOut({ redirect: false });
    handleNotSignedIn();
  };

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
   *     - 設置一個過期時間（例如 1 小時後），並將其存儲到 localStorage 中。
   * 11. React state 中的用戶和公司資料會通過 `UserContext` 提供給應用的其他組件使用。
   * 12. 檢查用戶是否已同意所有必要的條款：
   *     - 如果用戶尚未同意所有必要的條款（如資訊收集同意書和服務條款），系統會顯示相應的同意書頁面。
   *     - 用戶需要閱讀並同意這些條款。
   * 13. 當用戶同意條款時：
   *     - 調用 `handleUserAgree` 函數，該函數會發送 API 請求（`agreementAPI`）來更新用戶的同意狀態。
   *     - 如果 API 請求成功，更新本地 state 中的用戶同意狀態（`setIsAgreeInfoCollection` 和 `setIsAgreeTosNPrivacyPolicy`）。
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
  const getStatusInfo = useCallback(async () => {
    const isNeed = isProfileFetchNeeded();
    if (!isNeed) return;
    setIsAuthLoading(true);
    const {
      data: StatusInfo,
      success: getStatusInfoSuccess,
      code: getStatusInfoCode,
    } = await getStatusInfoAPI();
    setSelectedCompany(null);
    setSuccessSelectCompany(undefined);
    if (getStatusInfoSuccess) {
      if (StatusInfo) {
        if ('user' in StatusInfo && StatusInfo.user && Object.keys(StatusInfo.user).length > 0) {
          setUserAuth(StatusInfo.user);
          setUsername(StatusInfo.user.name);
          setSignedIn(true);
          setIsSignInError(false);
          localStorage.setItem('userId', StatusInfo.user.id.toString());
          localStorage.setItem('expired_at', (Date.now() + EXPIRATION_TIME).toString());
          if (StatusInfo.user.agreementList.includes(Hash.INFO_COLLECTION)) {
            setIsAgreeInfoCollection(true);
          } else {
            setIsAgreeInfoCollection(false);
          }
          if (StatusInfo.user.agreementList.includes(Hash.TOS_N_PP)) {
            setIsAgreeTosNPrivacyPolicy(true);
          } else {
            setIsAgreeTosNPrivacyPolicy(false);
          }
          if (
            'company' in StatusInfo &&
            StatusInfo.company &&
            Object.keys(StatusInfo.company).length > 0
          ) {
            setSelectedCompany(StatusInfo.company);
            setSuccessSelectCompany(true);
            handleReturnUrl();
          } else {
            setSuccessSelectCompany(undefined);
            setSelectedCompany(null);
            if (
              router.pathname.includes('users') &&
              !router.pathname.includes(ISUNFA_ROUTE.SELECT_COMPANY)
            ) {
              handleSignInRoute();
            }
          }
        } else {
          handleNotSignedIn();
        }
      }
    }
    if (getStatusInfoSuccess === false) {
      handleNotSignedIn();
      setIsSignInError(true);
      setErrorCode(getStatusInfoCode ?? '');
    }
    setIsAuthLoading(false);
  }, [router.pathname]);

  // Info: (20240903 - Shirley) 第一次登入，在用戶同意後，重新導向到選擇公司的頁面
  useEffect(() => {
    handleSignInRoute();
  }, [userAgreeResponseRef.current]);

  const handleUserAgree = async (hash: Hash) => {
    try {
      setIsAuthLoading(true);
      const response = await agreementAPI({
        params: { userId: userAuth?.id },
        body: { agreementHash: hash },
      });
      setUserAgreeResponse(response);
      setIsAuthLoading(false);
      if (hash === Hash.INFO_COLLECTION) {
        setIsAgreeInfoCollection(true);
      }
      if (hash === Hash.TOS_N_PP) {
        setIsAgreeTosNPrivacyPolicy(true);
      }
    } catch (error) {
      setUserAgreeResponse({
        success: false,
        data: null,
        code: '',
        error: error as Error,
      });
    }
  };

  const authenticateUser = async (selectProvider: Provider, props: ILoginPageProps) => {
    try {
      setIsAuthLoading(true);
      const response = await authSignIn(
        selectProvider,
        { redirect: false },
        // eslint-disable-next-line react/prop-types
        { invitation: props.invitation }
      );

      if (response?.error) {
        throw new Error(response.error);
      }
    } catch (error) {
      // TODO: (20240814-Tzuhan) [Beta] handle error
    }
  };

  const handleSelectCompanyResponse = async (response: {
    success: boolean;
    data: ICompany | null;
    code: string;
    error: Error | null;
  }) => {
    if (response.success && response.data !== null) {
      setSelectedCompany(response.data);
      setSuccessSelectCompany(true);
      handleReturnUrl();
    }
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
    eventManager.off(STATUS_MESSAGE.UNAUTHORIZED_ACCESS, handleUnauthorizedAccess);
    eventManager.on(STATUS_MESSAGE.UNAUTHORIZED_ACCESS, handleUnauthorizedAccess);

    return () => {
      eventManager.off(STATUS_MESSAGE.UNAUTHORIZED_ACCESS, handleUnauthorizedAccess);
    };
  }, [signOut]);

  // Info: (20240522 - Shirley) dependency array 的值改變，才會讓更新後的 value 傳到其他 components
  const value = useMemo(
    () => ({
      credential: credentialRef.current,
      signOut,
      userAuth: userAuthRef.current,
      username: usernameRef.current,
      signedIn: signedInRef.current,
      isAgreeInfoCollection: isAgreeInfoCollectionRef.current,
      isAgreeTosNPrivacyPolicy: isAgreeTosNPrivacyPolicyRef.current,
      isSignInError: isSignInErrorRef.current,
      selectedCompany: selectedCompanyRef.current,
      selectCompany,
      successSelectCompany: successSelectCompanyRef.current,
      errorCode: errorCodeRef.current,
      toggleIsSignInError,
      isAuthLoading: isAuthLoadingRef.current,
      returnUrl: returnUrlRef.current,
      checkIsRegistered,
      handleUserAgree,
      authenticateUser,
      userAgreeResponse: userAgreeResponseRef.current,
    }),
    [
      credentialRef.current,
      selectedCompanyRef.current,
      successSelectCompanyRef.current,
      errorCodeRef.current,
      isSignInErrorRef.current,
      isAuthLoadingRef.current,
      returnUrlRef.current,
      router.pathname,
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
