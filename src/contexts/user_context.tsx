import useStateRef from 'react-usestateref';
import eventManager from '@/lib/utils/event_manager';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import {
  WORK_TAG,
  IAccountBook,
  IAccountBookForUser,
  IResponseUpdateAccountBook,
} from '@/interfaces/account_book';
import { IUser } from '@/interfaces/user';
import { throttle } from '@/lib/utils/common';
import { Provider } from '@/constants/provider';
import { signIn as authSignIn } from 'next-auth/react';
import { ILoginPageProps } from '@/interfaces/page_props';
import { Hash } from '@/constants/hash';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { clearAllItems } from '@/lib/utils/indexed_db/ocr';
import { IRole } from '@/interfaces/role';
import { IUserRole } from '@/interfaces/user_role';
import { ITeam, TeamRole } from '@/interfaces/team';

interface UserContextType {
  credential: string | null;
  signOut: () => void;
  userAuth: IUser | null;
  username: string | null;
  isSignIn: boolean;
  isAgreeTermsOfService: boolean;
  isSignInError: boolean;
  createRole: (roleId: number) => Promise<IUserRole | null>;
  selectRole: (roleId: number) => Promise<IUserRole | null>;
  getUserRoleList: () => Promise<IUserRole[] | null>;
  getSystemRoleList: () => Promise<IRole[] | null>;
  selectedRole: string | null; // Info: (20241101 - Liz) 存 role name
  switchRole: () => void;

  createAccountBook: ({
    name,
    taxId,
    tag,
    teamId,
  }: {
    name: string;
    taxId: string;
    tag: WORK_TAG;
    teamId: number;
  }) => Promise<{ success: boolean; code: string; errorMsg: string }>;

  connectedAccountBook: IAccountBook | null;
  team: ITeam | null;
  teamRole: TeamRole | null;
  connectAccountBook: (companyId: number) => Promise<{ success: boolean }>;

  updateAccountBook: ({
    accountBookId,
    action,
    tag,
  }: {
    accountBookId: string;
    action: string;
    tag: WORK_TAG;
  }) => Promise<{ success: boolean }>;

  deleteAccountBook: (companyId: number) => Promise<IAccountBook | null>;
  deleteAccount: () => Promise<{
    success: boolean;
    data: IUser | null;
    code: string;
    error: Error | null;
  }>;
  cancelDeleteAccount: () => Promise<{
    success: boolean;
    data: IUser | null;
    code: string;
    error: Error | null;
  }>;

  errorCode: string | null;
  toggleIsSignInError: () => void;
  isAuthLoading: boolean;
  checkIsRegistered: () => Promise<{
    isRegistered: boolean;
    credentials: PublicKeyCredential | null;
  }>;

  handleUserAgree: (hash: Hash) => Promise<boolean>;
  authenticateUser: (selectProvider: Provider, props: ILoginPageProps) => Promise<void>;
  handleAppleSignIn: () => void;

  bindingResult: boolean | null;
  handleBindingResult: (bindingResult: boolean | null) => void;
}

export const UserContext = createContext<UserContextType>({
  credential: null,
  signOut: () => {},
  userAuth: null,
  username: null,
  isSignIn: false,
  isAgreeTermsOfService: false,
  isSignInError: false,
  createRole: async () => null,
  selectRole: async () => null,
  getUserRoleList: async () => null,
  getSystemRoleList: async () => null,
  selectedRole: null,
  switchRole: () => {},
  createAccountBook: async () => ({ success: false, code: '', errorMsg: '' }),

  connectedAccountBook: null,
  team: null,
  teamRole: null,
  connectAccountBook: async () => ({ success: false }),
  updateAccountBook: async () => ({ success: false }),
  deleteAccountBook: async () => null,
  deleteAccount: async () => Promise.resolve({ success: false, data: null, code: '', error: null }),
  cancelDeleteAccount: async () =>
    Promise.resolve({ success: false, data: null, code: '', error: null }),

  errorCode: null,
  toggleIsSignInError: () => {},
  isAuthLoading: false,
  checkIsRegistered: async () => {
    return { isRegistered: false, credentials: null };
  },

  handleUserAgree: async () => false,
  authenticateUser: async () => {},
  handleAppleSignIn: () => {},

  bindingResult: false,
  handleBindingResult: () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const EXPIRATION_TIME = 1000 * 60 * 60 * 1; // Info: (20240822) 1 hours

  const [, setIsSignIn, isSignInRef] = useStateRef(false);
  const [, setCredential, credentialRef] = useStateRef<string | null>(null);
  const [, setUserAuth, userAuthRef] = useStateRef<IUser | null>(null);
  const [, setUsername, usernameRef] = useStateRef<string | null>(null);

  const [, setSelectedRole, selectedRoleRef] = useStateRef<string | null>(null);
  const [, setConnectedAccountBook, connectedAccountBookRef] = useStateRef<IAccountBook | null>(
    null
  );
  const [, setTeam, teamRef] = useStateRef<ITeam | null>(null);
  const [, setIsSignInError, isSignInErrorRef] = useStateRef(false);
  const [, setErrorCode, errorCodeRef] = useStateRef<string | null>(null);
  const [, setIsAuthLoading, isAuthLoadingRef] = useStateRef(false);
  const [, setIsAgreeTermsOfService, isAgreeTermsOfServiceRef] = useStateRef(false);

  const [, setBindingResult, bindingResultRef] = useStateRef<boolean | null>(null);

  const isRouteChanging = useRef(false);

  const { trigger: signoutAPI } = APIHandler<string>(APIName.SIGN_OUT);
  const { trigger: createChallengeAPI } = APIHandler<string>(APIName.CREATE_CHALLENGE);
  const { trigger: agreementAPI } = APIHandler<null>(APIName.AGREE_TO_TERMS);
  const { trigger: getStatusInfoAPI } = APIHandler<{
    user: IUser;
    company: IAccountBook;
    role: IRole;
    team: ITeam;
  }>(APIName.STATUS_INFO_GET);
  // Info: (20241108 - Liz) 取得系統角色列表 API
  const { trigger: systemRoleListAPI } = APIHandler<IRole[]>(APIName.ROLE_LIST);
  // Info: (20241104 - Liz) 取得使用者角色列表 API
  const { trigger: userRoleListAPI } = APIHandler<IUserRole[]>(APIName.USER_ROLE_LIST);
  // Info: (20241104 - Liz) 建立角色 API
  const { trigger: createRoleAPI } = APIHandler<IUserRole>(APIName.USER_CREATE_ROLE);
  // Info: (20241101 - Liz) 選擇角色 API
  const { trigger: selectRoleAPI } = APIHandler<IUserRole>(APIName.USER_SELECT_ROLE);

  // Info: (20241104 - Liz) 建立帳本 API(原為公司) // ToDo: (20250321 - Liz) 等後端實作完成後要改串新的 API
  const { trigger: createAccountBookAPI } = APIHandler<IAccountBookForUser>(
    APIName.CREATE_USER_COMPANY
  );

  // Info: (20241111 - Liz) 連結帳本 API(原為選擇公司)
  const { trigger: connectAccountBookAPI } = APIHandler<IAccountBook>(
    APIName.CONNECT_ACCOUNT_BOOK_BY_ID
  );
  // Info: (20241113 - Liz) 更新帳本 API(原為公司)
  const { trigger: updateAccountBookAPI } = APIHandler<IResponseUpdateAccountBook>(
    APIName.UPDATE_ACCOUNT_BOOK
  );

  // Info: (20241115 - Liz) 刪除帳本 API(原為公司) // ToDo: (20250321 - Liz) 等後端實作完成後要改串新的 API
  const { trigger: deleteAccountBookAPI } = APIHandler<IAccountBook>(APIName.COMPANY_DELETE);

  const { trigger: deleteAccountAPI } = APIHandler<IUser>(APIName.USER_DELETE);
  const { trigger: cancelDeleteAccountAPI } = APIHandler<IUser>(APIName.USER_DELETION_UPDATE);

  // Info: (20250321 - Julian) 從第三方金流獲取綁定信用卡的結果
  const handleBindingResult = (bindingResult: boolean | null) => {
    setBindingResult(bindingResult);
  };

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
    setConnectedAccountBook(null);
    setTeam(null);
    setBindingResult(null);
    clearAllItems(); // Info: (20240822 - Shirley) 清空 IndexedDB 中的數據
  };

  const clearLocalStorage = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('expired_at');
    localStorage.removeItem('redirectPath');
  };

  // Info: (20250108 - Liz) 前往登入頁面
  const goToLoginPage = () => {
    // Deprecated: (20241001 - Liz)
    // eslint-disable-next-line no-console
    console.log('呼叫 goToLoginPage (尚未導向)');

    if (router.pathname.startsWith('/users') && !router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
      // Deprecated: (20241008 - Liz)
      // eslint-disable-next-line no-console
      console.log('呼叫 goToLoginPage 並且重新導向到登入頁面');

      router.push(ISUNFA_ROUTE.LOGIN);
    }
  };

  // Info: (20250108 - Liz) 前往選擇角色頁面
  const goToSelectRolePage = () => {
    // Deprecated: (20241008 - Liz)
    // eslint-disable-next-line no-console
    console.log('呼叫 goToSelectRolePage 重新導向到選擇角色頁面 (因為沒有選擇角色)');

    router.push(ISUNFA_ROUTE.SELECT_ROLE);
  };

  // Info: (20241111 - Liz) 前往儀表板
  const goToDashboard = () => {
    router.push(ISUNFA_ROUTE.DASHBOARD);

    // Deprecated: (20241111 - Liz)
    // eslint-disable-next-line no-console
    console.log('呼叫 goToDashboard 重新導向到儀表板 (因為沒有選擇公司)');
  };

  const goBackToOriginalPath = () => {
    const redirectPath = localStorage.getItem('redirectPath');

    // Deprecated: (20241008 - Liz)
    // eslint-disable-next-line no-console
    console.log('呼叫 goBackToOriginalPath, redirectPath:', redirectPath);

    if (redirectPath && redirectPath !== ISUNFA_ROUTE.LOGIN) {
      router.push(redirectPath);
    } else {
      router.push(ISUNFA_ROUTE.DASHBOARD);
    }
  };

  // Info: (20241209 - Liz) 切換角色的功能
  const switchRole = () => {
    setSelectedRole(null);
    setConnectedAccountBook(null);
    setTeam(null);
    goToSelectRolePage();
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

  const signOut = async () => {
    // Deprecated: (20241111 - Liz)
    // eslint-disable-next-line no-console
    console.log('call signOut 登出並且清除 user context 所有狀態 以及 localStorage');

    await signoutAPI(); // Info: (20241004 - Liz) 登出 NextAuth 清除前端 session
    clearStates(); // Info: (20241004 - Liz) 清除 context 中的狀態
    clearLocalStorage(); // Info: (20241004 - Liz) 清除 localStorage 中的資料
    goToLoginPage(); // Info: (20241004 - Liz) 重新導向到登入頁面
  };

  const isProfileFetchNeeded = () => {
    // Info: (20240822-Tzuhan) 如果 state 中沒有用戶資料，但 localStorage 中有記錄，則應該重新獲取 profile
    // Info: (20240822-Tzuhan) 如果 expiredAt 未過期，應該重新獲取 profile
    // Info: (20240822-Tzuhan) 如果 state 中有用戶資料，且 localStorage 中沒有記錄，則應該重新獲取 profile
    // Info: (20240822-Tzuhan) 如果 state 和 localStorage 中都沒有用戶資料，則應該重新獲取 profile
    // Info: (20240822-Tzuhan) 以上情況都不滿足，則不需要重新獲取 profile
    // Info: (20241203 - Liz) 基於以上的邏輯，將程式碼簡化，先判斷 session 是否過期，再判斷是否有使用者資料以及 localStorage 資料，最後回傳結果， true 表示需要重新獲取使用者資料， false 表示不需要。

    const userId = localStorage.getItem('userId');
    const expiredAt = localStorage.getItem('expired_at');
    const isUserAuthAvailable = !!userAuthRef.current;
    const hasLocalStorageData = userId && expiredAt;
    const isSessionExpired = expiredAt && Date.now() >= Number(expiredAt);

    if (isSessionExpired) {
      signOut();
      return false;
    }
    return !(isUserAuthAvailable && hasLocalStorageData);
  };

  // ===============================================================================

  // Info: (20241001 - Liz) 此函數處理公司資訊:
  // 如果公司資料存在且不為空，它會設定選定的公司 (setConnectedAccountBook)，最後回傳公司資訊。
  // 如果公司資料不存在，會將公司資訊設為 null，並回傳 null。
  const processAccountBookInfo = (company: IAccountBook) => {
    if (!company || Object.keys(company).length === 0) {
      setConnectedAccountBook(null);
      return null;
    }
    setConnectedAccountBook(company);
    return company;
  };

  // Info: (20250319 - Liz) 此函數處理團隊資訊: (團隊是指連結帳本所屬的團隊)
  const processTeamInfo = (teamData: ITeam) => {
    if (!teamData || Object.keys(teamData).length === 0) {
      setTeam(null);
      return;
    }
    setTeam(teamData);
  };

  // Info: (20241101 - Liz) 此函數處理角色資訊:
  const processRoleInfo = (role: IRole) => {
    if (!role || Object.keys(role).length === 0) {
      setSelectedRole(null);
      return null;
    }
    setSelectedRole(role.name);
    return role;
  };

  // Info: (20241001 - Liz) 此函數處理使用者資訊:
  // 如果使用者資料不存在，會回傳 null。
  // 如果使用者資料存在且有效，會設定使用者認證、名稱，並標記為已登入，
  // 並且將使用者的 userId 和過期時間儲存在 localStorage 中，最後回傳使用者資訊。
  const processUserInfo = (user: IUser) => {
    if (!user || Object.keys(user).length === 0) return null;

    setUserAuth(user);
    setUsername(user.name);
    setIsSignIn(true);
    setIsSignInError(false);
    localStorage.setItem('userId', user.id.toString());
    localStorage.setItem('expired_at', (Date.now() + EXPIRATION_TIME).toString());
    return user;
  };

  // Info: (20241009 - Liz) 此函數是在處理 getStatusInfo 獲得的資料，包含使用者、公司、角色，並根據處理結果來決定下一步的操作:
  // 它會呼叫 processUserInfo, processAccountBookInfo, 和 processRoleInfo 分別處理使用者、公司、角色資訊。
  // 依據處理結果，它會執行不同的自動導向邏輯。
  const handleProcessData = (statusInfo: {
    user: IUser;
    company: IAccountBook;
    role: IRole;
    team: ITeam;
  }) => {
    const processedUser = processUserInfo(statusInfo.user);
    const processedRole = processRoleInfo(statusInfo.role);
    const processedAccountBook = processAccountBookInfo(statusInfo.company);
    processTeamInfo(statusInfo.team);

    if (!processedUser) {
      clearStates();
      clearLocalStorage();
      goToLoginPage();
      return;
    }

    // Info: (20241117 - Liz) 檢查是否已經同意服務條款和隱私政策
    const hasAgreedToTermsOfService = processedUser.agreementList.includes(
      Hash.HASH_FOR_TERMS_OF_SERVICE
    );

    setIsAgreeTermsOfService(hasAgreedToTermsOfService);

    if (!hasAgreedToTermsOfService) return;
    if (!processedRole) {
      goToSelectRolePage();
      return;
    }
    if (!processedAccountBook) {
      goToDashboard();
      return;
    }
    goBackToOriginalPath();
  };

  // Info: (20241001 - Liz) 此函數使用 useCallback 封裝，用來非同步取得使用者和公司狀態資訊。
  // 它首先檢查是否需要取得使用者資料 (isProfileFetchNeeded)，如果不需要，則直接結束。
  // 當資料獲取中，它會設定載入狀態 (setIsAuthLoading)
  // 當 API 回傳成功且有資料時，它會呼叫 handleProcessData 分別處理使用者、公司、角色資訊。
  // 如果獲取資料失敗，它會執行未登入的處理邏輯: 清除狀態、導向登入頁面、設定登入錯誤狀態、設定錯誤代碼。
  // 最後，它會將載入狀態設為完成。
  const getStatusInfo = useCallback(async () => {
    if (!isProfileFetchNeeded()) {
      // Deprecated: (20241113 - Liz)
      // eslint-disable-next-line no-console
      console.log('isProfileFetchNeeded 為 false, 不需要重新獲取使用者資料');
      return;
    }

    setIsAuthLoading(true);

    try {
      // Info: (20241008 - Liz) 將當前路徑存入 localStorage，以便登入後可以重新導向回原本的路徑
      const currentPath = router.asPath;
      localStorage.setItem('redirectPath', currentPath);

      // Deprecated: (20241008 - Liz)
      // eslint-disable-next-line no-console
      console.log('執行 getStatusInfo() 並且儲存現在路由 currentPath:', currentPath);

      const {
        data: statusInfo,
        success: getStatusInfoSuccess,
        code: getStatusInfoCode,
      } = await getStatusInfoAPI();

      // Deprecated: (20241001 - Liz)
      // eslint-disable-next-line no-console
      console.log('getStatusInfo data:', statusInfo, 'getStatusInfoSuccess:', getStatusInfoSuccess);

      if (getStatusInfoSuccess && statusInfo) {
        handleProcessData(statusInfo);
      } else {
        clearStates();
        clearLocalStorage();
        goToLoginPage();
        setIsSignInError(true);
        setErrorCode(getStatusInfoCode ?? '');
      }
    } catch (error) {
      // Deprecated: (20250117 - Liz)
      // eslint-disable-next-line no-console
      console.error('getStatusInfo 發生錯誤:', error);
      clearStates();
      clearLocalStorage();
      goToLoginPage();
      setIsSignInError(true);
    } finally {
      setIsAuthLoading(false);
    }
  }, [router.pathname]);
  // ===============================================================================

  // Info: (20241119 - Liz) 簽署使用者同意條款和隱私政策的功能
  const handleUserAgree = async (hash: Hash) => {
    setIsAuthLoading(true);

    try {
      const response = await agreementAPI({
        params: { userId: userAuthRef.current?.id },
        body: { agreementHash: hash },
      });

      if (!response.success && response.error) {
        throw new Error(response.error.message);
      }

      if (hash === Hash.HASH_FOR_TERMS_OF_SERVICE) {
        setIsAgreeTermsOfService(true);
      }
      // if (hash === Hash.HASH_FOR_PRIVACY_POLICY) {
      //   setIsAgreePrivacyPolicy(true);
      // }

      return response.success;
    } catch (error) {
      // Deprecated: (20241116 - Liz)
      // eslint-disable-next-line no-console
      console.error('Error handling user agreement:', error);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAppleSignIn = () => {
    const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_APPLE_REDIRECT_URI!;

    const url = `https://appleid.apple.com/auth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=openid%20email%20name&response_mode=form_post`;

    window.location.href = url;
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
      // ToDo: (20240814-Tzuhan) [Beta] handle error
    }
  };

  // Info: (20241029 - Liz) 建立角色的功能
  const createRole = async (roleId: number) => {
    // Deprecated: (20241108 - Liz)
    // eslint-disable-next-line no-console
    console.log('call createRole, roleId:', roleId);

    try {
      const { success, data: userRole } = await createRoleAPI({
        params: { userId: userAuthRef.current?.id },
        body: { roleId },
      });

      // Info: (20241029 - Liz) 檢查建立角色的成功狀態
      if (success && userRole) {
        // Deprecated: (20241111 - Liz)
        // eslint-disable-next-line no-console
        console.log('打 USER_CREATE_ROLE 成功, userRole:', userRole);
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
    try {
      const { success, data: userRole } = await selectRoleAPI({
        params: { userId: userAuthRef.current?.id },
        body: { roleId },
      });

      if (success && userRole) {
        setSelectedRole(userRole.role.name);
        return userRole;
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  // Info: (20241108 - Liz) 取得系統角色列表
  const getSystemRoleList = async () => {
    try {
      const { data: systemRoleList, success } = await systemRoleListAPI({
        query: { type: 'User' },
      });

      if (success && systemRoleList) return systemRoleList;

      return null;
    } catch (error) {
      // Info: (20241107 - Liz) Handle error if needed
      return null;
    }
  };

  // Info: (20241025 - Liz) 取得使用者擁有的所有角色
  const getUserRoleList = async () => {
    try {
      const { data: userRoleList, success } = await userRoleListAPI({
        params: { userId: userAuthRef.current?.id },
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

  // Info: (20241104 - Liz) 建立帳本的功能(原為公司)
  const createAccountBook = async ({
    name,
    taxId,
    tag,
    teamId,
  }: {
    name: string;
    taxId: string;
    tag: WORK_TAG;
    teamId: number;
  }) => {
    try {
      const { success, code, error } = await createAccountBookAPI({
        params: { userId: userAuthRef.current?.id },
        body: { name, taxId, tag, teamId },
      });

      if (!success) {
        return { success: false, code, errorMsg: error?.message ?? '' };
      }

      return { success: true, code: '', errorMsg: '' };
    } catch (error) {
      return { success: false, code: '', errorMsg: 'unknown error' };
    }
  };

  // Info: (20241111 - Liz) 連結帳本的功能(原為選擇公司)
  const connectAccountBook = async (accountBookId: number) => {
    try {
      const { success, data: connectedAccountBook } = await connectAccountBookAPI({
        params: { accountBookId },
      });

      if (!success) return { success: false };
      setConnectedAccountBook(connectedAccountBook);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  };

  // Info: (20241113 - Liz) 更新帳本的功能(原為公司) - 變更工作標籤
  const updateAccountBook = async ({
    accountBookId,
    action,
    tag,
  }: {
    accountBookId: string;
    action: string;
    tag: WORK_TAG;
  }) => {
    try {
      const { success } = await updateAccountBookAPI({
        params: { accountBookId },
        body: { action, tag },
      });

      if (!success) return { success: false };
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  };

  // Info: (20241115 - Liz) 刪除帳本的功能(原為公司)
  const deleteAccountBook = async (companyId: number) => {
    try {
      const { success, data: company } = await deleteAccountBookAPI({
        params: { companyId },
      });

      if (success && company) {
        setConnectedAccountBook(null);
        return company;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const deleteAccount = async () => {
    const res = await deleteAccountAPI({
      params: { userId: userAuthRef.current?.id },
    });

    if (res.success && res.data) {
      setUserAuth(res.data);
    }
    return res;
  };

  const cancelDeleteAccount = async () => {
    const res = await cancelDeleteAccountAPI({
      params: { userId: userAuthRef.current?.id },
    });

    if (res.success && res.data) {
      setUserAuth(res.data);
    }
    return res;
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
    // Deprecated: (20250108 - Liz)
    // eslint-disable-next-line no-console
    console.log('觸發 useEffect (監聽 UNAUTHORIZED_ACCESS)');

    let isSigningOut = false;

    const handleUnauthorizedAccess = async () => {
      if (isSigningOut) {
        // Deprecated: (20250108 - Liz)
        // eslint-disable-next-line no-console
        console.warn('正在執行 signOut 所以跳過此次觸發');
        return;
      }
      isSigningOut = true;

      try {
        // Deprecated: (20250108 - Liz)
        // eslint-disable-next-line no-console
        console.log('觸發 useEffect 並且呼叫 signOut 函數');
        await signOut();
      } catch (error) {
        // Deprecated: (20250108 - Liz)
        // eslint-disable-next-line no-console
        console.error('Sign out failed:', error);

        isSigningOut = false; // Info: (20250108 - Liz) 失敗後重置狀態，允許再次嘗試
      }
    };

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
      isSignInError: isSignInErrorRef.current,
      createRole,
      selectRole,
      getUserRoleList,
      getSystemRoleList,
      selectedRole: selectedRoleRef.current,
      switchRole,
      createAccountBook,
      connectAccountBook,
      updateAccountBook,
      deleteAccountBook,
      deleteAccount,
      cancelDeleteAccount,
      connectedAccountBook: connectedAccountBookRef.current,
      team: teamRef.current,
      teamRole: teamRef.current?.role ?? null,
      errorCode: errorCodeRef.current,
      toggleIsSignInError,
      isAuthLoading: isAuthLoadingRef.current,
      checkIsRegistered,
      handleUserAgree,
      authenticateUser,
      handleAppleSignIn,

      bindingResult: bindingResultRef.current,
      handleBindingResult,
    }),
    [
      credentialRef.current,
      selectedRoleRef.current,
      teamRef.current,
      connectedAccountBookRef.current,
      errorCodeRef.current,
      isSignInErrorRef.current,
      isAuthLoadingRef.current,
      router.pathname,
      userAuthRef.current,
      bindingResultRef.current,
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
