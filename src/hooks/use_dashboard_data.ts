import { useState, useMemo, useEffect } from 'react';
import { request } from '@/lib/utils/request';

export type TimeUnit = '24h' | '7d' | '30d' | '3m' | '1y';
export type GasType = 'co2' | 'ch4' | 'n2o' | 'f_gases';

export interface IDashboardMetrics { value: string | number; trend?: number }
export interface IDashboardFinancial {
  fundsData: Record<string, unknown>[];
  revenueData: Record<string, unknown>[];
  expenditureData: Record<string, unknown>[];
  metrics: Record<string, IDashboardMetrics>;
}
export interface IDashboardGas {
  ghgData: Record<string, unknown>[];
  metrics: Record<string, IDashboardMetrics>;
}
export interface IDashboardResponse {
  financial: IDashboardFinancial;
  gas: Record<GasType, IDashboardGas>;
}

export const useDashboardData = () => {
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('24h');
  const [gasType, setGasType] = useState<GasType>('co2');
  const [apiData, setApiData] = useState<IDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  // Info: (20260118 - Luphia) Trigger for manual/auto refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    const fetchData = async () => {
      // Info: (20260118 - Luphia) Only show loading spinner on initial load or manual refresh if desired (optional UX choice)
      // Info: (20260118 - Luphia) Here we keep loading true to show activity
      if (!apiData) setLoading(true);

      try {
        // Info: (20260309 - Luphia) 根據目前路徑取得 account_book_id
        const accountBookId = window.location.pathname.split('/account_book/').pop()?.split('/')[0] || 'default';
        const response = await request<{ payload: IDashboardResponse }>('/api/v1/user/account_book/' + accountBookId + '/dashboard', {
          query: { timeUnit }
        });
        if (response && response.payload) {
          setApiData(response.payload);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUnit, refreshTrigger]);

  // Info: (20260118 - Luphia) Auto-refresh interval (10s)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        refresh();
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Info: (20260118 - Luphia) Combine financial data with selected gas type data
  const currentData = useMemo(() => {
    if (!apiData) return null;

    const financial = apiData.financial;
    const gas = apiData.gas[gasType];

    return {
      fundsData: financial.fundsData,
      revenueData: financial.revenueData,
      expenditureData: financial.expenditureData,
      ghgData: gas.ghgData,
      metrics: {
        ...financial.metrics,
        ...gas.metrics
      }
    };
  }, [apiData, gasType]);

  return {
    timeUnit,
    setTimeUnit,
    gasType,
    setGasType,
    currentData,
    loading,
    refresh,
    autoRefresh,
    setAutoRefresh
  };
};
