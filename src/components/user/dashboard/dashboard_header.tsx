import { useTranslation } from "@/i18n/i18n_context";
import { Switch } from "@headlessui/react";
import { Activity, RefreshCw } from "lucide-react";
import { TimeUnit } from "@/hooks/use_dashboard_data";

interface IDashboardHeaderProps {
  timeUnit: TimeUnit;
  setTimeUnit: (unit: TimeUnit) => void;
  refresh: () => void;
  autoRefresh: boolean;
  setAutoRefresh: (auto: boolean) => void;
  loading: boolean;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number | "";
  setSelectedMonth: (month: number | "") => void;
  startYear: number;
  startMonth: number;
}

export const DashboardHeader = ({
  timeUnit,
  setTimeUnit,
  refresh,
  autoRefresh,
  setAutoRefresh,
  loading,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  startYear,
  startMonth,
}: IDashboardHeaderProps) => {
  const { t } = useTranslation();
  const timeUnits: TimeUnit[] = ["7d", "30d", "3m", "1y"];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const yearsLength = Math.max(1, currentYear - startYear + 1);
  const years = Array.from({ length: yearsLength }, (_, i) => currentYear - i);

  let months = Array.from({ length: 12 }, (_, i) => i + 1);
  if (selectedYear === currentYear) {
    months = months.filter((m) => m <= currentMonth);
  }
  if (selectedYear === startYear) {
    months = months.filter((m) => m >= startMonth);
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      {/* Info: (20260118 - Luphia) Mobile Top Row: Title + Refresh Controls */}
      <div className="flex w-full items-center justify-between sm:w-auto">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Activity className="h-5 w-5 shrink-0 text-orange-600" />
          <span className="truncate">{t("dashboard.title")}</span>
        </h2>

        {/* Info: (20260118 - Luphia) Mobile Refresh Controls */}
        <div className="flex items-center gap-3 sm:hidden">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              className={`${
                autoRefresh ? "bg-orange-600" : "bg-gray-200"
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none`}
            >
              <span
                className={`${
                  autoRefresh ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            <span className="text-sm font-medium whitespace-nowrap text-gray-600">
              {t("dashboard.auto_refresh")}
            </span>
          </div>
          <div className="mx-1 h-6 w-px bg-gray-300" />
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-full p-2 text-gray-500 transition-all hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            title={t("common.refresh")}
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Info: (20260118 - Luphia) Desktop Controls + Time Selector (Always visible, full width on mobile) */}
      <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
        {/* Info: (20260118 - Luphia) Desktop Refresh Controls */}
        <div className="hidden items-center gap-3 sm:flex">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              className={`${
                autoRefresh ? "bg-orange-600" : "bg-gray-200"
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none`}
            >
              <span
                className={`${
                  autoRefresh ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
            <span className="text-sm font-medium whitespace-nowrap text-gray-600">
              {t("dashboard.auto_refresh")}
            </span>
          </div>
          <div className="mx-1 h-6 w-px bg-gray-300" />
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-full p-2 text-gray-500 transition-all hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            title={t("common.refresh")}
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="mx-1 h-6 w-px bg-gray-300" />
        </div>

        {/* Info: (20260322 - Luphia) Custom Time Selector */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setTimeUnit("custom");
            }}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:flex-none ${timeUnit === "custom" ? "border-gray-900 bg-gray-900 text-white shadow-sm" : "border-gray-300 bg-white text-gray-700"}`}
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-white text-gray-900">
                {y} {t("esg_main.year")}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value ? Number(e.target.value) : "");
              setTimeUnit("custom");
            }}
            className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none sm:flex-none ${timeUnit === "custom" ? "border-gray-900 bg-gray-900 text-white shadow-sm" : "border-gray-300 bg-white text-gray-700"}`}
          >
            <option value="" className="bg-white text-gray-900">
              {t("esg_main.all_year")}
            </option>
            {months.map((m) => (
              <option key={m} value={m} className="bg-white text-gray-900">
                {m} {t("esg_main.month")}
              </option>
            ))}
          </select>
        </div>

        {/* Info: (20260118 - Luphia) Preset Time Selector */}
        <div className="no-scrollbar flex w-full flex-1 justify-between gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm sm:w-auto sm:flex-none sm:justify-start">
          {timeUnits.map((unit) => (
            <button
              key={unit}
              onClick={() => setTimeUnit(unit)}
              className={`flex-1 rounded-md px-3 py-1.5 text-center text-xs font-medium whitespace-nowrap transition-all duration-200 sm:flex-none ${timeUnit === unit ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}
            >
              {t(`dashboard.time_units.${unit}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
