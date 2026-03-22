import { useTranslation } from '@/i18n/i18n_context';
import { Switch } from '@headlessui/react';
import { Activity, RefreshCw } from 'lucide-react';
import { TimeUnit } from '@/hooks/use_dashboard_data';

interface IDashboardHeaderProps {
  timeUnit: TimeUnit;
  setTimeUnit: (unit: TimeUnit) => void;
  refresh: () => void;
  autoRefresh: boolean;
  setAutoRefresh: (auto: boolean) => void;
  loading: boolean;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  selectedMonth: number | '';
  setSelectedMonth: (month: number | '') => void;
  startYear: number;
  startMonth: number;
}

export const DashboardHeader = ({ 
  timeUnit, setTimeUnit, refresh, autoRefresh, setAutoRefresh, loading,
  selectedYear, setSelectedYear, selectedMonth, setSelectedMonth, startYear, startMonth
}: IDashboardHeaderProps) => {
  const { t } = useTranslation();
  const timeUnits: TimeUnit[] = ['7d', '30d', '3m', '1y'];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const yearsLength = Math.max(1, currentYear - startYear + 1);
  const years = Array.from({ length: yearsLength }, (_, i) => currentYear - i);

  let months = Array.from({ length: 12 }, (_, i) => i + 1);
  if (selectedYear === currentYear) {
    months = months.filter(m => m <= currentMonth);
  }
  if (selectedYear === startYear) {
    months = months.filter(m => m >= startMonth);
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
      {/* Info: (20260118 - Luphia) Mobile Top Row: Title + Refresh Controls */}
      <div className="flex justify-between items-center w-full sm:w-auto">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-600" />
          {t('dashboard.title')}
        </h2>

        {/* Info: (20260118 - Luphia) Mobile Refresh Controls */}
        <div className="flex items-center gap-3 sm:hidden">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              className={`${autoRefresh ? 'bg-orange-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
            >
              <span className={`${autoRefresh ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </Switch>
            <span className="text-sm text-gray-600 font-medium whitespace-nowrap">{t('dashboard.auto_refresh')}</span>
          </div>
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('common.refresh') || 'Refresh'}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Info: (20260118 - Luphia) Desktop Controls + Time Selector (Always visible, full width on mobile) */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {/* Info: (20260118 - Luphia) Desktop Refresh Controls */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              className={`${autoRefresh ? 'bg-orange-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
            >
              <span className={`${autoRefresh ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </Switch>
            <span className="text-sm text-gray-600 font-medium whitespace-nowrap">{t('dashboard.auto_refresh')}</span>
          </div>
          <div className="h-6 w-px bg-gray-300 mx-1" />
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('common.refresh') || 'Refresh'}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="h-6 w-px bg-gray-300 mx-1" />
        </div>

        {/* Info: (20260322 - Luphia) Custom Time Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setTimeUnit('custom');
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors ${timeUnit === 'custom' ? 'bg-gray-900 border-gray-900 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-700'}`}
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-white text-gray-900">
                {y}  {t("esg_main.year")}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value ? Number(e.target.value) : "");
              setTimeUnit('custom');
            }}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-colors ${timeUnit === 'custom' ? 'bg-gray-900 border-gray-900 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-700'}`}
          >
             <option value="" className="bg-white text-gray-900">{t("esg_main.all_year")}</option>
            {months.map((m) => (
              <option key={m} value={m} className="bg-white text-gray-900">
                {m}  {t("esg_main.month")}
              </option>
            ))}
          </select>
        </div>

        {/* Info: (20260118 - Luphia) Preset Time Selector */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-lg shadow-sm overflow-x-auto max-w-full no-scrollbar flex-1 sm:flex-none justify-between sm:justify-start">
          {timeUnits.map((unit) => (
            <button
              key={unit}
              onClick={() => setTimeUnit(unit)}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap text-center ${timeUnit === unit ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              {t(`dashboard.time_units.${unit}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
