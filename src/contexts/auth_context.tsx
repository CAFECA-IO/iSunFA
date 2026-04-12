'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { request } from '@/lib/utils/request';
import { publicClient } from '@/lib/viem_public';
import { ABIS, CONTRACT_ADDRESSES } from '@/config/contracts';
import { formatUnits } from 'viem';
import { CheckinRewardModal } from '@/components/common/checkin_reward_modal';

interface IUser {
  address: string;
  name: string | null;
  role: string | null;
  plan?: string;
  credits?: number;
  pendingCredits?: number;
  isAdmin?: boolean;
  modules?: string[];
  identityAddress?: string | null;
  isVerified?: boolean;
  pubKeyX?: string;
  pubKeyY?: string;
}

interface IAuthContextType {
  user: IUser | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<IAuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [showRewardModal, setShowRewardModal] = useState<boolean>(false);

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem('dewt');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const authPromise = request<{ payload: IUser }>('/api/v1/auth/me', {
        method: 'GET',
      });

      // Info: (20260408 - Luphia) Parallel non-blocking checkin
      const checkinPromise = request<{ payload: { checkinSuccess: boolean, rewardAmount: number } }>('/api/v1/auth/checkin', {
        method: 'GET',
      }).catch((err) => {
        console.warn("Background checkin failed:", err);
        return null;
      });
      checkinPromise.then((res) => {
        if (res && res.payload && res.payload.rewardAmount > 0) {
          setRewardAmount(res.payload.rewardAmount);
          setShowRewardModal(true);
        }
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
              functionName: 'balanceOf',
              args: [userData.address as `0x${string}`]
            });
            const credits = Number(formatUnits(balance, 18));

            // Info: (20260129 - Tzuhan) Fetch verification status from KYC_REGISTRY
            const isFrozen = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.KYC_REGISTRY,
              abi: ABIS.KYC_REGISTRY,
              functionName: 'isFrozen',
              args: [userData.address as `0x${string}`]
            });

            // Info: (20260302 - Tzuhan) 將從區塊鏈取得的 credits 寫入 userData，同時也包含後端傳來的 pendingCredits
            userData = { ...userData, credits, isVerified: !isFrozen };
          }
        } catch (e) {
          console.warn("Deprecate: (20260310 - Tzuhan) ", 'Failed to fetch user balance:', e);
        }

        setUser(userData);
      } else {
        setUser(null);
        localStorage.removeItem('dewt');
      }
    } catch (error) {
      console.error("Deprecate: (20260310 - Tzuhan) ", 'Failed to fetch user:', error);
      setUser(null);
      localStorage.removeItem('dewt');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem('dewt');
    setUser(null);
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshAuth,
      logout,
    }),
    [user, loading, refreshAuth, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <CheckinRewardModal
        isOpen={showRewardModal}
        onClose={() => setShowRewardModal(false)}
        rewardAmount={rewardAmount}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
