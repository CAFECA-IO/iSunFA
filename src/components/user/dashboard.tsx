'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth_context';
import { useDashboardData } from '@/hooks/use_dashboard_data';
import { DashboardHeader } from '@/components/user/dashboard/dashboard_header';
import { KeyMetricsRow } from '@/components/user/dashboard/key_metrics_row';
import { GHGEmissionsCard } from '@/components/user/dashboard/ghg_emissions_card';
import { SystemMonitoringCard } from '@/components/user/dashboard/system_monitoring_card';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/i18n/i18n_context';
import { FileStack } from 'lucide-react';

export default function Dashboard() {
  const { loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const accountBookId = params?.account_book_id as string || 'default';
  const { t } = useTranslation();
  const {
    timeUnit, setTimeUnit,
    selectedYear, setSelectedYear,
    selectedMonth, setSelectedMonth,
    startYear, startMonth,
    gasType, setGasType,
    currentData, loading: dataLoading, refresh, autoRefresh, setAutoRefresh
  } = useDashboardData();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (loading || dataLoading || !mounted || !currentData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  const hasData = (() => {
    if (!currentData) return false;
    const hasRevenue = currentData.revenueData.some((d) => (d as { value: number }).value > 0);
    const hasExpenditure = currentData.expenditureData.some((d) => (d as { value: number }).value > 0);
    const hasGHG = currentData.ghgData.some((d) => (d as { total: number }).total > 0);
    return hasRevenue || hasExpenditure || hasGHG;
  })();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Info: (20260118 - Luphia) Header */}
      <DashboardHeader
        timeUnit={timeUnit}
        setTimeUnit={setTimeUnit}
        refresh={refresh}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        loading={dataLoading}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        startYear={startYear}
        startMonth={startMonth}
      />

      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
          <FileStack className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">{t('dashboard.empty_state_title')}</h3>
          <p className="text-gray-500 mb-6 max-w-sm text-center">
            {t('dashboard.empty_state_desc')}
          </p>
          <Link
            href={`/user/account_book/${accountBookId}/journal`}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition-colors shadow-sm"
          >
            {t('dashboard.empty_state_cta')}
          </Link>
        </div>
      ) : (
        <>
          {/* Info: (20260118 - Luphia) Row 1: Key Metrics */}
          <KeyMetricsRow currentData={currentData} />

          {/* Info: (20260118 - Luphia) Row 2: Greenhouse Gas Emissions & System Monitoring */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GHGEmissionsCard
              currentData={currentData}
              gasType={gasType}
              setGasType={setGasType}
            />
            <SystemMonitoringCard currentData={currentData} />
          </div>
        </>
      )}
    </div>
  );
}
