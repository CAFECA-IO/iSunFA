import { useState, useMemo, useEffect } from 'react';
import { request } from '@/lib/utils/request';
import { useParams } from 'next/navigation';

export type TimeUnit = '7d' | '30d' | '3m' | '1y' | 'custom';
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
  const params = useParams();
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('30d');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState<number>(1);
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
        const accountBookId = params?.account_book_id as string || 'default';
        const query: Record<string, string | number> = { timeUnit };
        if (timeUnit === 'custom') {
          query.year = selectedYear;
          if (selectedMonth) query.month = selectedMonth;
        }

        const [response, infoRes] = await Promise.all([
          request<{ payload: IDashboardResponse }>('/api/v1/user/account_book/' + accountBookId + '/dashboard', { query }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          request<any>(`/api/v1/user/account_book/${accountBookId}`)
        ]);

        if (response && response.payload) {
          setApiData(response.payload);
        }
        if (infoRes && infoRes.payload && infoRes.payload.createdAt) {
          const createdAt = new Date(infoRes.payload.createdAt);
          setStartYear(createdAt.getFullYear());
          setStartMonth(createdAt.getMonth() + 1);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUnit, selectedYear, selectedMonth, refreshTrigger]);

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
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    startYear,
    startMonth,
    gasType,
    setGasType,
    currentData,
    loading,
    refresh,
    autoRefresh,
    setAutoRefresh
  };
};
