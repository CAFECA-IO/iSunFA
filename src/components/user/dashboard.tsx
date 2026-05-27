"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth_context";
import { useDashboardData } from "@/hooks/use_dashboard_data";
import { DashboardHeader } from "@/components/user/dashboard/dashboard_header";
import { KeyMetricsRow } from "@/components/user/dashboard/key_metrics_row";
import { GHGEmissionsCard } from "@/components/user/dashboard/ghg_emissions_card";
import { SystemMonitoringCard } from "@/components/user/dashboard/system_monitoring_card";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "@/i18n/i18n_context";
import { FileStack } from "lucide-react";

export default function Dashboard() {
  const { loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const params = useParams();
  const accountBookId = (params?.account_book_id as string) || "default";
  const { t } = useTranslation();
  const {
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
    loading: dataLoading,
    refresh,
    autoRefresh,
    setAutoRefresh,
    apiData,
  } = useDashboardData();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || dataLoading || !mounted || !currentData || !apiData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  const hasData = (() => {
    const hasRevenue = apiData.financial.revenueData.some(
      (d) => Number((d as { value: string | number }).value) > 0,
    );
    const hasExpenditure = apiData.financial.expenditureData.some(
      (d) => Number((d as { value: string | number }).value) > 0,
    );

    // Check if any gas type has data
    const hasGHG = Object.values(apiData.gas).some((gasData) =>
      gasData.ghgData.some(
        (d) => Number((d as { total: string | number }).total) > 0,
      ),
    );

    return hasRevenue || hasExpenditure || hasGHG;
  })();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
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
        <div className="flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white px-6 py-20 text-center shadow-sm">
          <FileStack className="mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-xl font-medium break-all text-gray-900 sm:break-normal">
            {t("dashboard.empty_state_title")}
          </h3>
          <p className="mb-6 w-full max-w-sm break-words text-gray-500">
            {t("dashboard.empty_state_desc")}
          </p>
          <Link
            href={`/user/account_book/${accountBookId}/journal`}
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-orange-500 px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:bg-orange-600"
          >
            {t("dashboard.empty_state_cta")}
          </Link>
        </div>
      ) : (
        <>
          {/* Info: (20260118 - Luphia) Row 1: Key Metrics */}
          <KeyMetricsRow currentData={currentData} />

          {/* Info: (20260118 - Luphia) Row 2: Greenhouse Gas Emissions & System Monitoring */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
