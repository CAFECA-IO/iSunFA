import React, { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import { useUserCtx } from '@/contexts/user_context';

interface CurrencyContextType {
  currency: string;
  refreshCurrency: () => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const { connectedAccountBook } = useUserCtx();
  const [currency, setCurrency] = useState<string>('');

  const { trigger: getAccountSetting } = APIHandler<IAccountingSetting>(
    APIName.ACCOUNTING_SETTING_GET
  );

  const fetchCurrency = useCallback(async () => {
    if (!connectedAccountBook?.id) return;
    const { data, success } = await getAccountSetting({
      params: { accountBookId: connectedAccountBook.id },
    });
    if (success && data) {
      setCurrency(data.currency);
    }
  }, [connectedAccountBook?.id]);

  useEffect(() => {
    fetchCurrency();
  }, [fetchCurrency]);

  const value = useMemo(
    () => ({
      currency,
      // Info: (20250606 - Anna) 對外提供 refreshCurrency 功能，實作實際由 fetchCurrency 函式完成
      refreshCurrency: fetchCurrency,
    }),
    [currency, fetchCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrencyCtx = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrencyCtx must be used within CurrencyProvider');
  return context;
};
