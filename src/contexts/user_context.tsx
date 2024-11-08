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
import { IRole } from '@/interfaces/role';
import { RoleName } from '@/constants/role';
import { IUserRole } from '@/interfaces/user_role';
import { CompanyTag } from '@/constants/company';

interface UserContextType {
  credential: string | null;
  signOut: () => void;
  userAuth: IUser | null;
  username: string | null;
  isSignIn: boolean;
  isAgreeTermsOfService: boolean;
  isAgreePrivacyPolicy: boolean;
  isSignInError: boolean;
  createRole: (roleName: RoleName) => Promise<IUserRole | null>;
  selectRole: (roleId: number) => Promise<IUserRole | null>;
  getUserRoleList: () => Promise<IUserRole[] | null>;
  selectedRole: string | null; // Info: (20241101 - Liz) 存 role name

  createCompany: ({
    name,
    taxId,
    tag,
  }: {
    name: string;
    taxId: string;
    tag: CompanyTag;
  }) => Promise<{ success: boolean; code: string }>;

  getCompanyList: () => Promise<ICompany[] | null>;
  selectedCompany: ICompany | null;
  selectCompany: (company: ICompany | null, isPublic?: boolean) => Promise<void>;
  successSelectCompany: boolean | undefined;
  errorCode: string | null;
  toggleIsSignInError: () => void;
  isAuthLoading: boolean;
  // returnUrl: string | null;
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
  isSignIn: false,
  isAgreeTermsOfService: false,
  isAgreePrivacyPolicy: false,
  isSignInError: false,
  createRole: async () => null,
  selectRole: async () => null,
  getUserRoleList: async () => null,
  selectedRole: null,
  createCompany: async () => ({ success: false, code: '' }),
  getCompanyList: async () => null,

  selectedCompany: null,
  selectCompany: async () => {},
  successSelectCompany: undefined,
  errorCode: null,
  toggleIsSignInError: () => {},
  isAuthLoading: false,
  // returnUrl: null,
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

  const [, setIsSignIn, isSignInRef] = useStateRef(false);
  const [, setCredential, credentialRef] = useStateRef<string | null>(null);
  const [userAuth, setUserAuth, userAuthRef] = useStateRef<IUser | null>(null);
  const [, setUsername, usernameRef] = useStateRef<string | null>(null);

  // Info: (20241028 - Liz) 使用者目前選擇的角色(拿取 getStateInfoAPI 回傳的 Role 資料)
  const [, setSelectedRole, selectedRoleRef] = useStateRef<string | null>(null);

  const [, setSelectedCompany, selectedCompanyRef] = useStateRef<ICompany | null>(null);
  const [, setSuccessSelectCompany, successSelectCompanyRef] = useStateRef<boolean | undefined>(
    undefined
  );
  const [, setIsSignInError, isSignInErrorRef] = useStateRef(false);
  const [, setErrorCode, errorCodeRef] = useStateRef<string | null>(null);
  const [, setIsAuthLoading, isAuthLoadingRef] = useStateRef(false);
  // const [returnUrl, setReturnUrl, returnUrlRef] = useStateRef<string | null>(null);
  const [, setIsAgreeTermsOfService, isAgreeTermsOfServiceRef] = useStateRef(false);
  const [, setIsAgreePrivacyPolicy, isAgreePrivacyPolicyRef] = useStateRef(false);
  const [, setUserAgreeResponse, userAgreeResponseRef] = useStateRef<{
    success: boolean;
    data: null;
    code: string;
    error: Error | null;
  } | null>(null);
  const isRouteChanging = useRef(false);

  const { trigger: createChallengeAPI } = APIHandler<string>(APIName.CREATE_CHALLENGE);
  const { trigger: selectCompanyAPI } = APIHandler<ICompany>(APIName.COMPANY_SELECT);
  const { trigger: agreementAPI } = APIHandler<null>(APIName.AGREE_TO_TERMS);
  const { trigger: getStatusInfoAPI } = APIHandler<{
    user: IUser;
    company: ICompany;
    role: IRole;
  }>(APIName.STATUS_INFO_GET);
  // Info: (20241104 - Liz) 取得使用者角色列表 API
  const { trigger: userRoleListAPI } = APIHandler<IUserRole[]>(APIName.USER_ROLE_LIST);
  // Info: (20241104 - Liz) 建立角色 API
  const { trigger: createRoleAPI } = APIHandler<IUserRole>(APIName.USER_CREATE_ROLE);
  // Info: (20241101 - Liz) 選擇角色 API
  const { trigger: selectRoleAPI } = APIHandler<IUserRole>(APIName.USER_SELECT_ROLE);
  // Info: (20241104 - Liz) 建立公司 API
  const { trigger: createCompanyAPI } = APIHandler<{ name: string; taxId: string }>(
    APIName.CREATE_COMPANY
  );
  // Info: (20241104 - Liz) 取得使用者公司列表 API
  const { trigger: companyListAPI } = APIHandler<ICompany[]>(APIName.COMPANY_LIST);

  const toggleIsSignInError = () => {
    setIsSignInError(!isSignInErrorRef.current);
  };

  const clearStates = () => {
    setUserAuth(null);
    setUsername(null);
    setCredential(null);
    setIsSignIn(false);
    setIsSignInError(false);
    setSelectedRole(null);
    setSelectedCompany(null);
    setSuccessSelectCompany(undefined);
    localStorage.removeItem('userId');
    localStorage.removeItem('expired_at');
    clearAllItems(); // Info: (20240822 - Shirley) 清空 IndexedDB 中的數據
  };

  // Info: (20240530 - Shirley) 在瀏覽器被重新整理後，如果沒有登入，就 redirect to login page
  const redirectToLoginPage = () => {
    // Deprecated: (20241001 - Liz)
    // eslint-disable-next-line no-console
    console.log('呼叫 redirectToLoginPage (尚未導向)');

    if (router.pathname.startsWith('/users') && !router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
      // Deprecated: (20241008 - Liz)
      // eslint-disable-next-line no-console
      console.log('呼叫 redirectToLoginPage 並且重新導向到登入頁面');

      router.push(ISUNFA_ROUTE.LOGIN);
    }
  };

  const goToSelectRolePage = () => {
    // Deprecated: (20241008 - Liz)
    // eslint-disable-next-line no-console
    console.log('呼叫 goToSelectRolePage');

    router.push(ISUNFA_ROUTE.SELECT_ROLE);
  };

  // ToDo: (20241008 - Liz) 如果沒有選擇公司，重新導向到可以選擇公司的儀表板
  const goToDashboard = () => {
    router.push(ISUNFA_ROUTE.DASHBOARD);
  };

  const goBackToOriginalPath = () => {
    const redirectPath = localStorage.getItem('redirectPath');
    localStorage.removeItem('redirectPath'); // Info: (20241008 - Liz) 移除 localStorage 中的 redirectPath

    // Deprecated: (20241008 - Liz)
    // eslint-disable-next-line no-console
    console.log('呼叫 goBackToOriginalPath, redirectPath:', redirectPath);

    if (redirectPath) {
      router.push(redirectPath);
    } else {
      router.push(ISUNFA_ROUTE.DASHBOARD);
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

  // const handleReturnUrl = () => {
  //   if (isAgreeTermsOfServiceRef.current && isAgreePrivacyPolicyRef.current) {
  //     if (returnUrl) {
  //       const urlString = decodeURIComponent(returnUrl);
  //       setReturnUrl(null);
  //       router.push(urlString);
  //     } else if (
  //       router.pathname.includes(ISUNFA_ROUTE.DASHBOARD) ||
  //       (selectedCompanyRef.current && router.pathname.includes(ISUNFA_ROUTE.LOGIN))
  //     ) {
  //       router.push(ISUNFA_ROUTE.DASHBOARD);
  //     }
  //   }
  // };

  const signOut = async () => {
    await authSignOut({ redirect: false }); // Info: (20241004 - Liz) 登出 NextAuth 清除前端 session
    clearStates(); // Info: (20241004 - Liz) 清除 context 中的狀態
    redirectToLoginPage(); // Info: (20241004 - Liz) 重新導向到登入頁面
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

  // ===============================================================================
  // Info: (20241001 - Liz) 此函數根據使用者的協議列表，更新使用者是否同意了服務條款和隱私政策。
  // 它會將結果存入狀態變數 setIsAgreeTermsOfService 和 setIsAgreePrivacyPolicy。
  const updateUserAgreements = (user: IUser) => {
    const hasAgreedToTerms = user.agreementList.includes(Hash.HASH_FOR_TERMS_OF_SERVICE);
    const hasAgreedToPrivacy = user.agreementList.includes(Hash.HASH_FOR_PRIVACY_POLICY);

    setIsAgreeTermsOfService(hasAgreedToTerms);
    setIsAgreePrivacyPolicy(hasAgreedToPrivacy);
  };

  // Info: (20241001 - Liz) 此函數處理公司資訊:
  // 如果公司資料存在且不為空，它會設定選定的公司 (setSelectedCompany)，並標記成功選擇公司。
  // 若公司資料不存在，會將公司資訊設為空，並標記為未選擇公司。
  const processCompanyInfo = (company: ICompany) => {
    if (company && Object.keys(company).length > 0) {
      // Deprecated: (20241008 - Liz)
      // eslint-disable-next-line no-console
      console.log('執行 processCompanyInfo 並且 company 存在:', company);

      setSelectedCompany(company);
      setSuccessSelectCompany(true);

      return true;
    } else {
      // Deprecated: (20241008 - Liz)
      // eslint-disable-next-line no-console
      console.log('執行 processCompanyInfo 並且 company 不存在:', company);

      setSuccessSelectCompany(undefined);
      setSelectedCompany(null);

      return false;
    }
  };

  // Info: (20241101 - Liz) 此函數處理「使用者的角色資訊」
  const processRoleInfo = (role: IRole) => {
    if (role && Object.keys(role).length > 0) {
      // Deprecated: (20241029 - Liz)
      // eslint-disable-next-line no-console
      console.log('執行 processRoleInfo 並且 role 存在:', role);

      setSelectedRole(role.name);

      return true;
    } else {
      // Deprecated: (20241029 - Liz)
      // eslint-disable-next-line no-console
      console.log('執行 processRoleInfo 並且 role 不存在:', role);

      setSelectedRole(null);

      return false;
    }
  };

  // Info: (20241001 - Liz) 此函數處理使用者資訊:
  // 如果使用者資料存在且有效，會設定使用者認證、名稱，並標記為已登入，
  // 它還會將使用者的 userId 和過期時間儲存在 localStorage 中，
  // 接著它會呼叫 updateUserAgreements 函數更新使用者的協議狀態，
  // 最後回傳 true。
  // 如果使用者資料不存在，會回傳 false。
  const processUserInfo = (user: IUser) => {
    if (user && Object.keys(user).length > 0) {
      setUserAuth(user);
      setUsername(user.name);
      setIsSignIn(true);
      setIsSignInError(false);

      localStorage.setItem('userId', user.id.toString());
      localStorage.setItem('expired_at', (Date.now() + EXPIRATION_TIME).toString());

      updateUserAgreements(user);

      // Deprecated: (20241004 - Liz)
      // eslint-disable-next-line no-console
      console.log('呼叫 processUserInfo 並且 user 存在:', user);

      return true;
    } else {
      // clearStates(); // Deprecated: (20241009 - Liz)
      // redirectToLoginPage(); // Deprecated: (20241009 - Liz)
      return false;
    }
  };

  // Info: (20241009 - Liz) 此函數是在處理 getStatusInfo 獲得的資料，包含使用者、公司、角色，並根據處理結果來決定下一步的操作:
  // 它會呼叫 processUserInfo, processCompanyInfo, 和 processRoleInfo 分別處理使用者、公司、角色資訊。
  // 依據處理結果，它會執行不同的自動導向邏輯。
  const handleProcessData = (statusInfo: { user: IUser; company: ICompany; role: IRole }) => {
    const isProcessedUser = processUserInfo(statusInfo.user);
    const isProcessedCompany = processCompanyInfo(statusInfo.company);
    const isProcessedRole = processRoleInfo(statusInfo.role);

    // Deprecated: (20241008 - Liz)
    // eslint-disable-next-line no-console
    console.log(
      'isProcessedUser: ',
      isProcessedUser,
      'isProcessedCompany: ',
      isProcessedCompany,
      'isProcessedRole',
      isProcessedRole
    );

    if (!isProcessedUser) {
      clearStates();
      redirectToLoginPage();
    } else if (!isProcessedRole) {
      goToSelectRolePage();
    } else if (!isProcessedCompany) {
      goToDashboard();
      // goToSelectRolePage();
    } else {
      goBackToOriginalPath();
    }
  };

  // Info: (20241001 - Liz) 此函數使用 useCallback 封裝，用來非同步取得使用者和公司狀態資訊。
  // 它首先檢查是否需要取得使用者資料 (isProfileFetchNeeded)，如果不需要，則直接結束。
  // 當資料獲取中，它會設定載入狀態 (setIsAuthLoading)
  // 當 API 回傳成功且有資料時，它會呼叫 handleProcessData 分別處理使用者和公司資訊。
  // 如果獲取資料失敗，它會執行未登入的處理邏輯: 清除狀態、導向登入頁面、設定登入錯誤狀態、設定錯誤代碼。
  // 最後，它會將載入狀態設為完成。
  const getStatusInfo = useCallback(async () => {
    if (!isProfileFetchNeeded()) return;

    setIsAuthLoading(true);

    // Info: (20241008 - Liz) 將當前路徑存入 localStorage，以便登入後可以重新導向回原本的路徑
    const currentPath = router.asPath;
    localStorage.setItem('redirectPath', currentPath);

    // Deprecated: (20241008 - Liz)
    // eslint-disable-next-line no-console
    console.log('儲存現在路由 currentPath:', currentPath);

    const {
      data: statusInfo,
      success: getStatusInfoSuccess,
      code: getStatusInfoCode,
    } = await getStatusInfoAPI();

    // Deprecated: (20241001 - Liz)
    // eslint-disable-next-line no-console
    console.log('getStatusInfo:', statusInfo, 'getStatusInfoSuccess:', getStatusInfoSuccess);

    if (getStatusInfoSuccess && statusInfo) {
      handleProcessData(statusInfo);
    } else {
      clearStates();
      redirectToLoginPage();
      setIsSignInError(true);
      setErrorCode(getStatusInfoCode ?? '');
    }

    setIsAuthLoading(false);
  }, [router.pathname]);
  // ===============================================================================

  const handleUserAgree = async (hash: Hash) => {
    try {
      setIsAuthLoading(true);
      const response = await agreementAPI({
        params: { userId: userAuth?.id },
        body: { agreementHash: hash },
      });
      setUserAgreeResponse(response);
      setIsAuthLoading(false);
      if (hash === Hash.HASH_FOR_TERMS_OF_SERVICE) {
        setIsAgreeTermsOfService(true);
      }
      if (hash === Hash.HASH_FOR_PRIVACY_POLICY) {
        setIsAgreePrivacyPolicy(true);
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
        // Info: (20240909 - Anna) TypeScript 本身已經有型別檢查系統。因此 ESLint 不需要針對 TypeScript 檔案強制使用 prop-types。因此這裡的ESLint註解不做移除。
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
      // handleReturnUrl();
      // Deprecated: (20241107 - Liz)
      // eslint-disable-next-line no-console
      console.log('handleSelectCompanyResponse 並且 response.success && response.data !== null');
    }
    if (response.success === false) {
      setSelectedCompany(null);
      setSuccessSelectCompany(false);
      setErrorCode(response.code ?? '');
    }
  };

  // ToDo: (20241107 - Liz) 獲得可以建立的所有角色，得到 roleId，建立、選擇角色都傳 roleId (in body) 給 API

  // Info: (20241029 - Liz) 建立角色的功能
  const createRole = async (roleName: RoleName) => {
    try {
      const { success, data: userRole } = await createRoleAPI({
        params: { userId: userAuth?.id },
        body: { roleName },
      });

      // Info: (20241029 - Liz) 檢查建立角色的成功狀態
      if (success && userRole) {
        return userRole;
      }

      // Info: (20241107 - Liz) 建立失敗回傳 null
      return null;
    } catch (error) {
      // Info: (20241107 - Liz) 例外發生視為建立失敗回傳 null
      // console.error('Error creating role:', error);
      return null;
    }
  };

  // Info: (20241101 - Liz) 選擇角色的功能
  const selectRole = async (roleId: number) => {
    setSelectedRole(null);

    try {
      const { success, data: userRole } = await selectRoleAPI({
        params: { userId: userAuth?.id, roleId },
      });

      if (success && userRole) {
        setSelectedRole(userRole.role.name);
        return userRole;
      }

      setSelectedRole(null);
      return null;
    } catch (error) {
      setSelectedRole(null);
      return null;
    }
  };

  // Info: (20241025 - Liz) 取得使用者擁有的所有角色
  const getUserRoleList = async () => {
    try {
      const { data: userRoleList, success } = await userRoleListAPI({
        params: { userId: userAuth?.id },
      });

      if (success && userRoleList) {
        return userRoleList;
      }

      return null;
    } catch (error) {
      // Info: (20241107 - Liz) Handle error if needed
      return null;
    }
  };

  // Info: (20241104 - Liz) 建立公司的功能
  const createCompany = async ({
    name,
    taxId,
    tag,
  }: {
    name: string;
    taxId: string;
    tag: CompanyTag;
  }) => {
    try {
      const { success, code } = await createCompanyAPI({
        body: { name, taxId, tag },
      });

      if (!success) {
        return { success: false, code };
      }

      return { success: true, code: '' };
    } catch (error) {
      // Handle error if needed
      return { success: false, code: '' };
    }
  };

  // Info: (20241104 - Liz) 取得使用者公司列表的功能
  const getCompanyList = async () => {
    try {
      const { data: companyList, success } = await companyListAPI({
        query: { userId: userAuth?.id },
      });

      if (success && companyList) {
        return companyList;
      }

      return null;
    } catch (error) {
      // Handle error if needed
      return null;
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
      // router.push(ISUNFA_ROUTE.DASHBOARD);
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
      // Deprecated: (20241107 - Liz)
      // eslint-disable-next-line no-console
      console.log('handleRouteChangeStart 並且 pathname 包含 ISUNFA_ROUTE.LOGIN 這個條件被啟動');
    }
  }, [throttledGetStatusInfo, router.pathname]);

  const handleRouteChangeComplete = useCallback(() => {
    isRouteChanging.current = false;
  }, []);

  useEffect(() => {
    // Deprecated: (20241004 - Liz)
    // eslint-disable-next-line no-console
    console.log(
      '觸發 useEffect (dependency: handleVisibilityChange, handleRouteChangeStart, handleRouteChangeComplete)'
    );

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
    // Deprecated: (20241004 - Liz)
    // eslint-disable-next-line no-console
    console.log('觸發 useEffect (監聽 UNAUTHORIZED_ACCESS)');

    const handleUnauthorizedAccess = () => {
      // Deprecated: (20241004 - Liz)
      // eslint-disable-next-line no-console
      console.log('觸發 useEffect 並且呼叫 signOut 函數');

      signOut();
    };

    // Info: (20240822-Tzuhan) 確保只有一個監聽器
    eventManager.off(STATUS_MESSAGE.UNAUTHORIZED_ACCESS, handleUnauthorizedAccess);
    eventManager.on(STATUS_MESSAGE.UNAUTHORIZED_ACCESS, handleUnauthorizedAccess);

    return () => {
      eventManager.off(STATUS_MESSAGE.UNAUTHORIZED_ACCESS, handleUnauthorizedAccess);
    };
  }, []);

  // Info: (20240522 - Shirley) dependency array 的值改變，才會讓更新後的 value 傳到其他 components
  const value = useMemo(
    () => ({
      credential: credentialRef.current,
      signOut,
      userAuth: userAuthRef.current,
      username: usernameRef.current,
      isSignIn: isSignInRef.current,
      isAgreeTermsOfService: isAgreeTermsOfServiceRef.current,
      isAgreePrivacyPolicy: isAgreePrivacyPolicyRef.current,
      isSignInError: isSignInErrorRef.current,
      createRole,
      selectRole,
      getUserRoleList,
      selectedRole: selectedRoleRef.current,
      createCompany,
      getCompanyList,

      selectedCompany: selectedCompanyRef.current,
      selectCompany,
      successSelectCompany: successSelectCompanyRef.current,
      errorCode: errorCodeRef.current,
      toggleIsSignInError,
      isAuthLoading: isAuthLoadingRef.current,
      // returnUrl: returnUrlRef.current,
      checkIsRegistered,
      handleUserAgree,
      authenticateUser,
      userAgreeResponse: userAgreeResponseRef.current,
    }),
    [
      credentialRef.current,
      selectedRoleRef.current,
      selectedCompanyRef.current,
      successSelectCompanyRef.current,
      errorCodeRef.current,
      isSignInErrorRef.current,
      isAuthLoadingRef.current,
      // returnUrlRef.current,
      router.pathname,
      userAuthRef.current,
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
 *    - 如果回傳的資料有 user 但沒有 company，透過 `redirectToSelectCompanyPage` 將用戶導向選擇公司的頁面，有 user 跟 company 則透過 `handleReturnUrl` 將用戶導向之前儀表板/嘗試訪問的頁面。
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
