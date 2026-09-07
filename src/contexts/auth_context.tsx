"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";

import { onUnauthorized, request } from "@/lib/utils/request";
import { publicClient } from "@/lib/viem_public";
import { ABIS, CONTRACT_ADDRESSES } from "@/config/contracts";
import { formatUnits } from "viem";
import { MoneyUtil } from "@/lib/utils/money";

interface IAuthUser {
  address: string;
  name: string | null;
  role: string | null;
  plan?: string;
  /**
   * Info: (20260819 - Luphia) 這個人**擁有**的每個團隊的有效方案（`/auth/me` 提供）。
   *
   * 方案頁的「目前方案」標記需要的是「是否全部一致」而不是最高
   * （見 `lib/subscription/user_plan`）：那個標記會停用購買鈕，
   * 照最高標會讓同時擁有免費團隊與團隊版團隊的人再也買不了團隊版。
   */
  ownedPlans?: string[];
  credits?: string;
  pendingCredits?: string;
  isAdmin?: boolean;
  modules?: string[];
  identityAddress?: string | null;
  isVerified?: boolean;
  pubKeyX?: string;
  pubKeyY?: string;
  /**
   * Info: (20260810 - Luphia) PASSKEY 或 CUSTODIAL。
   * 託管帳號（第三方登入）沒有 passkey，需要簽章的流程必須改走伺服器端代簽。
   */
  custody?: string;
}

interface IAuthContextType {
  /**
   * Info: (20260814 - Luphia) 登入是否剛剛過期（收到 401）。
   * 有這個旗標，畫面才說得出「你被登出了」——否則過期只會表現成
   * 「資料突然變空、按鈕突然不能按」，使用者會以為是系統壞了。
   */
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
  user: IAuthUser | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => void;
  updateLocalCredits: (delta: string) => void;
}

const AuthContext = createContext<IAuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [sessionExpired, setSessionExpired] = useState(false);

  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem("dewt");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const authPromise = request<{ payload: IAuthUser }>("/api/v1/auth/me", {
        method: "GET",
      });

      /**
       * Info: (20260809 - Luphia) Parallel non-blocking checkin：
       * 登入贈點已取消（20260809 產品決策），不再處理 rewardAmount 與獎勵視窗；
       * 背景呼叫保留——後端仍以此記錄登入（稽核）並確保鏈上會員註冊。
       */
      request("/api/v1/auth/checkin", { method: "GET" }).catch((err) => {
        console.warn("Background checkin failed:", err);
      });

      const response = await authPromise;

      if (response && response.payload) {
        let userData = response.payload;
        try {
          if (userData.address) {
            // Info: (20260129 - Tzuhan) Fetch credits from blockchain
            const balance = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.CREDIT_POINT,
              abi: ABIS.CREDIT_POINT,
              functionName: "balanceOf",
              args: [userData.address as `0x${string}`],
              blockTag: "pending",
            });
            const credits = formatUnits(balance, 18);

            // Info: (20260418 - Luphia) Fetch verification status from DYNAMIC_KYC_MEMBERSHIP
            const isBlacklisted = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.DYNAMIC_KYC_MEMBERSHIP,
              abi: ABIS.DYNAMIC_KYC_MEMBERSHIP,
              functionName: "isBlacklisted",
              args: [userData.address as `0x${string}`],
            });

            // Info: (20260302 - Tzuhan) 將從區塊鏈取得的 credits 寫入 userData，同時也包含後端傳來的 pendingCredits
            userData = { ...userData, credits, isVerified: !isBlacklisted };
          }
        } catch (e) {
          console.warn(
            "Deprecate: (20260310 - Tzuhan) ",
            "Failed to fetch user balance:",
            e,
          );
        }

        setUser(userData);
      } else {
        setUser(null);
        localStorage.removeItem("dewt");
        // Info: (20260814 - Luphia) 原本就帶著 token 卻拿不到身分＝過期，不是「本來就沒登入」
        setSessionExpired(true);
      }
    } catch (error) {
      console.error(
        "Deprecate: (20260310 - Tzuhan) ",
        "Failed to fetch user:",
        error,
      );
      setUser(null);
      localStorage.removeItem("dewt");
      setSessionExpired(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  /**
   * Info: (20260814 - Luphia) 任何 API 收到 401 都在這裡收斂：清掉身分並標記過期。
   *
   * 不清身分的話，畫面會繼續以「已登入」的樣子運作（顯示餘額、開付款視窗），
   * 但每一支 API 都會失敗——那比直接說「請重新登入」難懂得多。
   */
  useEffect(() => {
    return onUnauthorized(() => {
      localStorage.removeItem("dewt");
      setUser(null);
      setSessionExpired(true);
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("dewt");
    setUser(null);
    window.location.reload();
  }, []);

  const updateLocalCredits = useCallback((delta: string) => {
    setUser((prev) => {
      if (!prev || prev.credits === undefined) return prev;
      return { ...prev, credits: MoneyUtil.add(prev.credits, delta) };
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshAuth,
      logout,
      sessionExpired,
      dismissSessionExpired,
      updateLocalCredits,
    }),
    [
      user,
      loading,
      refreshAuth,
      logout,
      updateLocalCredits,
      sessionExpired,
      dismissSessionExpired,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
