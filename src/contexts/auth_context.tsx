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

import { request } from "@/lib/utils/request";
import { publicClient } from "@/lib/viem_public";
import { ABIS, CONTRACT_ADDRESSES } from "@/config/contracts";
import { formatUnits } from "viem";
import { MoneyUtil } from "@/lib/utils/money";

interface IAuthUser {
  address: string;
  name: string | null;
  role: string | null;
  plan?: string;
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
      }
    } catch (error) {
      console.error(
        "Deprecate: (20260310 - Tzuhan) ",
        "Failed to fetch user:",
        error,
      );
      setUser(null);
      localStorage.removeItem("dewt");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

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
      updateLocalCredits,
    }),
    [user, loading, refreshAuth, logout, updateLocalCredits],
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
