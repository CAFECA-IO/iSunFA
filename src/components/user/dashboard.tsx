'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth_context';
import { useDashboardData } from '@/hooks/use_dashboard_data';
import { DashboardHeader } from '@/components/user/dashboard/dashboard_header';
import { KeyMetricsRow } from '@/components/user/dashboard/key_metrics_row';
import { GHGEmissionsCard } from '@/components/user/dashboard/ghg_emissions_card';
import { SystemMonitoringCard } from '@/components/user/dashboard/system_monitoring_card';

export default function Dashboard() {
  const { loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const { timeUnit, setTimeUnit, gasType, setGasType, currentData, loading: dataLoading, refresh, autoRefresh, setAutoRefresh } = useDashboardData();

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
      />

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
    </div>
  );
}
